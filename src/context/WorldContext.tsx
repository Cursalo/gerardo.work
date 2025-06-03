import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { World, WorldService, getWorldServiceInstance, createMainWorld, createProjectWorld } from '../data/worlds';
import { Project, projectService } from '../services/projectService';
import { projectDataService, ProjectData } from '../services/projectDataService';
import useMobileDetection from '../hooks/useMobileDetection';

// Define consistent storage key
const STORAGE_KEY = 'portfolio_worlds';
// CRITICAL FIX: Add a data version tracking key
const DATA_VERSION_KEY = 'portfolio_data_version';

export interface WorldContextType {
  worlds: World[];
  currentWorld: World | null;
  currentWorldId: string;
  setCurrentWorldId: (id: string) => void;
  worldService: WorldService;
  getCameraTarget: () => [number, number, number];
  isLoading: boolean;
  refreshWorlds: () => void;
  verifyFileStorage: () => Promise<boolean>;
}

const WorldContext = createContext<WorldContextType | undefined>(undefined);

interface WorldProviderProps {
  children: ReactNode;
  initialWorldId?: string;
}

export const WorldProvider = ({
  children,
  initialWorldId = 'mainWorld'
}: WorldProviderProps) => {
  const { isTouchDevice } = useMobileDetection();
  
  // CRITICAL FIX: Detect and handle URL parameter for force reset
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const forceReset = urlParams.get('force_reset');
    
    if (forceReset === 'true') {
      console.log('CRITICAL: Force reset parameter detected, clearing all localStorage data');
      
      // Back up the admin password if it exists
      const adminPassword = localStorage.getItem('admin_password');
      
      // Clear all localStorage data
      localStorage.clear();
      
      // Restore admin password if it existed
      if (adminPassword) {
        localStorage.setItem('admin_password', adminPassword);
      }
      
      // Reload the page without the parameter
      const newUrl = window.location.pathname;
      window.location.href = newUrl;
    }
  }, []);
  
  // CRITICAL FIX: Add a version check for data synchronization
  useEffect(() => {
    // Get stored version
    const storedVersion = localStorage.getItem(DATA_VERSION_KEY);
    
    // Generate a unique device identifier
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('device_id', deviceId);
    }
    
    // Every time a device loads, increment the data version
    // This will help detect when multiple devices are accessing the same project
    const newVersion = storedVersion ? parseInt(storedVersion) + 1 : 1;
    localStorage.setItem(DATA_VERSION_KEY, newVersion.toString());
    
    console.log(`WorldProvider: Device ${deviceId} updated data version to ${newVersion}`);
    
    // Add timestamp to detect stale data
    localStorage.setItem('last_access', Date.now().toString());
  }, []);

  // Check if there's a target world ID in localStorage and consume it
  let effectiveInitialWorldId = initialWorldId;
  const targetWorldIdFromStorageOnInit = localStorage.getItem('target_world_id'); // Renamed variable for clarity

  if (targetWorldIdFromStorageOnInit) {
    console.log(`WorldProvider: Found target_world_id in localStorage: ${targetWorldIdFromStorageOnInit}. Using it for initial load.`);
    effectiveInitialWorldId = targetWorldIdFromStorageOnInit;
    // Consume and clear it immediately
    localStorage.removeItem('target_world_id');
    localStorage.removeItem('target_project_id'); // Also clear related project ID
    console.log('WorldProvider: Consumed and cleared target_world_id from localStorage upon initialization.');
  }
  
  const [currentWorldId, setCurrentWorldIdState] = useState<string>(effectiveInitialWorldId);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [currentWorld, setCurrentWorld] = useState<World | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Use useRef to keep a stable reference to worldService and avoid re-renders
  const worldServiceRef = useRef(getWorldServiceInstance());
  const worldService = worldServiceRef.current;

  // Ref to track if force reload has happened this session to prevent double regeneration
  const hasForcedReloadThisSessionRef = useRef(false);

  // Function to force refresh worlds
  const refreshWorlds = () => {
    console.log('WorldProvider: Manually refreshing worlds');
    setRefreshTrigger(prev => prev + 1);
  };

  // Function to verify file storage
  const verifyFileStorage = async (): Promise<boolean> => {
    console.log('WorldProvider: Verifying content of \'portfolio_files\' in localStorage.');
    
    try {
      const storedFilesStr = localStorage.getItem('portfolio_files');
      if (!storedFilesStr) {
        console.info('WorldProvider: \'portfolio_files\' not found in localStorage. This may be normal if no local files have been uploaded (e.g., via an admin interface).');
        return false;
      }
      
      let storedFiles;
      try {
        storedFiles = JSON.parse(storedFilesStr);
      } catch (parseError) {
        console.error('WorldProvider: Error parsing \'portfolio_files\' from localStorage. Content is not valid JSON:', parseError);
        return false;
      }
      
      if (typeof storedFiles !== 'object' || storedFiles === null) {
        console.error('WorldProvider: Invalid \'portfolio_files\' format in localStorage. Expected an object, but found:', typeof storedFiles);
        return false;
      }
      
      const fileKeys = Object.keys(storedFiles);
      if (fileKeys.length === 0) {
        console.info('WorldProvider: \'portfolio_files\' found in localStorage, but it contains no file entries.');
        return false;
      }
      console.log(`WorldProvider: Found ${fileKeys.length} file entries in \'portfolio_files\'.`);
      
      let validFilesWithDataUrl = 0;
      for (const key of fileKeys) {
        if (storedFiles[key] && typeof storedFiles[key].dataUrl === 'string' && storedFiles[key].dataUrl.startsWith('data:')) {
          validFilesWithDataUrl++;
        } else {
          console.warn(`WorldProvider: Entry \'${key}\' in \'portfolio_files\' is missing a valid dataUrl property.`);
        }
      }
      
      if (validFilesWithDataUrl === 0) {
        console.warn(`WorldProvider: \'portfolio_files\' has ${fileKeys.length} entries, but none contain a valid dataUrl. Verification fails.`);
        return false;
      }
      
      console.log(`WorldProvider: \'portfolio_files\' contains ${validFilesWithDataUrl} valid entries with dataUrls. Verification successful.`);
      return true;
    } catch (error) {
      console.error('WorldProvider: An unexpected error occurred during file storage verification:', error);
      return false;
    }
  };

  // CRITICAL FIX: Add a useEffect to verify file storage on mount
  useEffect(() => {
    verifyFileStorage().then(result => {
      console.log(`WorldProvider: File storage verification ${result ? 'succeeded' : 'failed'}`);
    });
  }, []);

  // Single useEffect to handle initialization and world changes
  useEffect(() => {
    const setupWorlds = async () => {
      setIsLoading(true);
      
      try {
        console.log('WorldProvider: Starting setupWorlds...');
        
        // PERFORMANCE FIX: Only force reload if data is actually stale or first load of the session
        const lastSetupTime = localStorage.getItem('last_world_setup_time');
        const currentTime = Date.now();
        const timeSinceLastSetup = lastSetupTime ? currentTime - parseInt(lastSetupTime) : Infinity;
        
        // Determine if a force reload is needed
        let performForceReload = false;
        if (!hasForcedReloadThisSessionRef.current) {
          if (!lastSetupTime || timeSinceLastSetup > 30000) {
            performForceReload = true;
          }
        }
        
        if (performForceReload) {
          console.log('WorldProvider: Force reloading data (stale or first load this session)');
          await projectDataService.forceReload();
          localStorage.setItem('last_world_setup_time', currentTime.toString());
          hasForcedReloadThisSessionRef.current = true; // Mark that force reload has happened this session
        } else {
          console.log('WorldProvider: Skipping force reload (data is fresh or already reloaded this session)');
        }
        
        // Load projects from project.json files (will use cache if not force reloaded and initialized)
        await projectDataService.initialize();
        
        // CRITICAL FIX: Synchronize ProjectService with ProjectDataService
        // This ensures both services have the same project data
        console.log('WorldProvider: Synchronizing ProjectService with ProjectDataService...');
        await projectDataService.synchronizeWithProjectService();
        console.log('WorldProvider: Synchronization completed');

        // PERFORMANCE FIX: Only regenerate project worlds if data was actually reloaded (performForceReload was true)
        if (performForceReload) {
          console.log('WorldProvider: Regenerating project worlds with fresh data...');
          try {
            // Get all projects from ProjectDataService (which has the full data)
            const allProjectsData = await projectDataService.getAllProjects();
            
            for (const projectData of allProjectsData) {
              const projectWorldId = `project-world-${projectData.id}`;
              
              // Check if world already exists and has the same number of objects
              const existingWorld = worldService.getWorld(projectWorldId);
              const expectedObjectCount = (projectData.mediaObjects?.length || 0) + (projectData.assetGallery?.length || 0);
              
              if (existingWorld && existingWorld.objects.length === expectedObjectCount) {
                console.log(`WorldProvider: Skipping regeneration of ${projectWorldId} (already up to date)`);
                continue;
              }
              
              // Convert ProjectData to Project format with assetGallery preserved
              const project: Project = {
                id: projectData.id,
                name: projectData.name,
                description: projectData.description,
                link: projectData.link,
                thumbnail: projectData.thumbnail,
                status: projectData.status as 'completed' | 'in-progress',
                type: projectData.type as 'standard' | 'video',
                videoUrl: projectData.videoUrl,
                customLink: projectData.customLink,
                mediaObjects: projectData.mediaObjects?.map(mediaObj => ({
                  ...mediaObj,
                  type: mediaObj.type as 'video' | 'image' | 'pdf' | 'project' | 'link' | 'button'
                })),
                worldSettings: projectData.worldSettings,
                // Preserve assetGallery for project world creation
                ...(projectData.assetGallery && { assetGallery: projectData.assetGallery })
              };
              
              // Recreate the project world with full data
              console.log(`WorldProvider: Regenerating project world ${projectWorldId} for ${project.name}`);
              const regeneratedWorld = createProjectWorld(project, isTouchDevice);
              
              // Update the world in the service
              worldService.updateWorld(regeneratedWorld);
              
              console.log(`WorldProvider: Project world ${projectWorldId} regenerated with ${regeneratedWorld.objects.length} objects`);
            }
            
            console.log(`WorldProvider: Successfully processed ${allProjectsData.length} project worlds`);
          } catch (error) {
            console.error('WorldProvider: Error regenerating project worlds:', error);
          }
        } else {
          console.log('WorldProvider: Skipping project world regeneration (using cached data or already done this session)');
        }
        
        const loadedProjects = await projectDataService.getAllProjects();
        
        console.log('WorldProvider: ProjectDataService loaded projects:', loadedProjects.length);
        console.log('WorldProvider: First few projects:', loadedProjects.slice(0, 3).map(p => ({ id: p.id, name: p.name })));
        
        // CRITICAL FIX: Deduplicate projects by ID to prevent React key errors
        const uniqueProjectsMap = new Map();
        loadedProjects.forEach((projectData: ProjectData) => {
          if (projectData && projectData.id) {
            // Only keep the first occurrence of each ID
            if (!uniqueProjectsMap.has(projectData.id)) {
              uniqueProjectsMap.set(projectData.id, projectData);
            } else {
              console.warn(`WorldProvider: Skipping duplicate project with ID ${projectData.id}: ${projectData.name}`);
            }
          }
        });
        
        const deduplicatedProjects = Array.from(uniqueProjectsMap.values());
        console.log(`WorldProvider: Deduplicated ${loadedProjects.length} projects down to ${deduplicatedProjects.length} unique projects`);
        
        // Additional safety check: verify no duplicate IDs remain
        const finalIds = deduplicatedProjects.map(p => p.id);
        const uniqueIds = [...new Set(finalIds)];
        if (finalIds.length !== uniqueIds.length) {
          console.error('WorldProvider: CRITICAL ERROR - Duplicates still exist after deduplication!');
          console.error('Final IDs:', finalIds);
          console.error('Unique IDs:', uniqueIds);
        } else {
          console.log('WorldProvider: ✅ Deduplication successful - all project IDs are unique');
        }
        
        // Convert ProjectData to Project format for compatibility
        const projectsToUse: Project[] = deduplicatedProjects
          .filter((projectData: ProjectData) => projectData && projectData.id) // Filter out invalid projects
          .map((projectData: ProjectData) => ({
            id: projectData.id,
            name: projectData.name,
            description: projectData.description,
            link: projectData.link,
            thumbnail: projectData.thumbnail,
            status: projectData.status as 'completed' | 'in-progress',
            type: projectData.type as 'standard' | 'video',
            videoUrl: projectData.videoUrl,
            customLink: projectData.customLink,
            mediaObjects: projectData.mediaObjects?.map(mediaObj => ({
              ...mediaObj,
              type: mediaObj.type as 'video' | 'image' | 'pdf' | 'project' | 'link' | 'button'
            })),
            worldSettings: projectData.worldSettings,
            // Preserve assetGallery for project world creation
            ...(projectData.assetGallery && { assetGallery: projectData.assetGallery })
          }));
        
        // Remove the arbitrary ID filter - use all valid projects
        const validProjects = projectsToUse;
        
        console.log(`WorldProvider: Using ${validProjects.length} valid projects after deduplication`);
        console.log('WorldProvider: Valid projects IDs:', validProjects.map(p => p.id).sort((a, b) => a - b));
        
        // Create or update a fresh main world with the latest projects
        const newMainWorld = createMainWorld(validProjects);
        
        console.log('WorldProvider: Created main world with objects:', newMainWorld.objects.length);
        console.log('WorldProvider: Main world objects preview:', newMainWorld.objects.slice(0, 3).map(obj => ({ id: obj.id, type: obj.type, title: obj.title })));
        
        // Save the main world to the service
        worldService.updateWorld(newMainWorld);
        
        // Determine which world to display
        let worldToDisplay = null;
        if (currentWorldId === 'mainWorld') {
          worldToDisplay = newMainWorld; 
        } else {
          worldToDisplay = worldService.getWorld(currentWorldId);
          if (!worldToDisplay) {
            worldToDisplay = newMainWorld;
            if (currentWorldId !== 'mainWorld') {
              setCurrentWorldIdState('mainWorld');
            }
          }
        }

        if (worldToDisplay) {
          console.log('WorldProvider: Setting current world to:', worldToDisplay.id, 'with', worldToDisplay.objects.length, 'objects');
          setCurrentWorld(worldToDisplay);
        } else {
          // Fallback to main world if specific world still not found
          console.log('WorldProvider: Fallback - setting current world to main world');
          setCurrentWorld(newMainWorld);
          if (currentWorldId !== 'mainWorld') {
            setCurrentWorldIdState('mainWorld');
          }
        }

        // Update the local worlds state
        const allCurrentWorldsFromService = worldService.getAllWorlds();
        setWorlds(allCurrentWorldsFromService);
        
      } catch (error) {
        console.error('WorldProvider: Error setting up worlds:', error);
        
        // Create a minimal fallback main world
        const fallbackMainWorld = createMainWorld([]);
        setCurrentWorld(fallbackMainWorld);
        setWorlds([fallbackMainWorld]);
      } finally {
        setIsLoading(false);
        console.log('WorldProvider: setupWorlds completed');
      }
    };

    setupWorlds();
  }, [currentWorldId, refreshTrigger, worldService, isTouchDevice]);

  // Utility function to ensure a project world exists
  const ensureProjectWorldExists = useCallback(async (projectIdNum: number): Promise<World | null> => {
    const projectWorldId = `project-world-${projectIdNum}`;
    let projectWorld = worldService.getWorld(projectWorldId);

    if (!projectWorld) {
      console.log(`WorldProvider: Project world ${projectWorldId} not in cache. Attempting to create.`);
      const projectData = await projectDataService.getProjectById(projectIdNum);
      if (projectData) {
        // CRITICAL FIX: Map ProjectData to Project before calling createProjectWorld
        const projectToCreateWorldWith: Project = {
          id: projectData.id,
          name: projectData.name,
          description: projectData.description,
          link: projectData.link,
          thumbnail: projectData.thumbnail,
          status: projectData.status as 'completed' | 'in-progress', // Explicit cast
          type: projectData.type as 'standard' | 'video', // Explicit cast
          videoUrl: projectData.videoUrl,
          customLink: projectData.customLink,
          mediaObjects: projectData.mediaObjects?.map(mediaObj => ({
            ...mediaObj,
            type: mediaObj.type as 'video' | 'image' | 'pdf' | 'project' | 'link' | 'button' // Explicit cast
          })),
          worldSettings: projectData.worldSettings,
          // Preserve assetGallery for project world creation
          ...(projectData.assetGallery && { assetGallery: projectData.assetGallery })
        };

        projectWorld = createProjectWorld(projectToCreateWorldWith, isTouchDevice);
        worldService.updateWorld(projectWorld); 
        setWorlds(worldService.getAllWorlds()); 
        console.log(`WorldProvider: Dynamically created and cached ${projectWorldId} in ensureProjectWorldExists.`);
        return projectWorld;
      } else {
        console.error(`WorldProvider: Failed to get project data for ID ${projectIdNum} in ensureProjectWorldExists.`);
        return null;
      }
    }
    return projectWorld;
  }, [worldService, isTouchDevice]);

  const getCameraTarget = useCallback((): [number, number, number] => {
    if (currentWorld?.cameraTarget) {
      const target = currentWorld.cameraTarget;
      return [target.x, target.y, target.z];
    }
    return [0, 0, 0];
  }, [currentWorld?.cameraTarget]);

  const setCurrentWorldId = useCallback(async (id: string) => {
    console.log(`WorldProvider: setCurrentWorldId called with ID: ${id}`);
    if (currentWorldId === id && currentWorld && currentWorld.id === id) {
        console.log(`WorldProvider: Target world ${id} is already current. Skipping.`);
        return;
    }
    setIsLoading(true); 
    
    let targetWorld: World | null = null;

    if (id.startsWith('project-world-')) {
      const projectIdStr = id.replace('project-world-', '');
      const projectIdNum = parseInt(projectIdStr, 10);
      if (!isNaN(projectIdNum)) {
        targetWorld = await ensureProjectWorldExists(projectIdNum);
        if (!targetWorld) {
          console.error(`WorldProvider: Could not ensure project world ${id} exists. Falling back to mainWorld.`);
          // Do not call setCurrentWorldIdState('mainWorld') here to avoid loop with setupWorlds effect.
          // Instead, let setupWorlds handle fallback if currentWorldId state is already 'mainWorld'
          // or set currentWorld directly.
          const main = worldService.getWorld('mainWorld');
          if (main) setCurrentWorld(main);
          if (currentWorldId !== 'mainWorld') setCurrentWorldIdState('mainWorld'); // Only change if not already mainWorld
          setIsLoading(false);
          return;
        }
      } else {
        console.error(`WorldProvider: Invalid project ID in setCurrentWorldId: ${id}. Falling back.`);
        const main = worldService.getWorld('mainWorld');
        if (main) setCurrentWorld(main);
        if (currentWorldId !== 'mainWorld') setCurrentWorldIdState('mainWorld');
        setIsLoading(false);
        return;
      }
    } else if (id === 'mainWorld') {
      targetWorld = worldService.getWorld('mainWorld');
      if (!targetWorld) {
          console.error("WorldProvider: mainWorld not found in worldService. This might happen if setupWorlds hasn't completed its first run.");
          // Potentially, setupWorlds will run due to currentWorldId change and create it.
          // If currentWorldId is already 'mainWorld', this indicates a deeper issue.
      }
    } else {
        console.warn(`WorldProvider: Unknown world ID format in setCurrentWorldId: ${id}. Falling back to mainWorld if possible.`);
        const main = worldService.getWorld('mainWorld');
        if (main) setCurrentWorld(main);
        if (currentWorldId !== 'mainWorld') setCurrentWorldIdState('mainWorld');
        setIsLoading(false);
        return;
    }

    if (targetWorld) {
      setCurrentWorld(targetWorld);
      setCurrentWorldIdState(id); 
      console.log(`WorldProvider: Switched currentWorld to ${targetWorld.name} (ID: ${id})`);
    } else if (id === 'mainWorld') {
        // This implies mainWorld was not found even though id is 'mainWorld'
        // setupWorlds should handle creating it. If it consistently fails, there's an issue in setupWorlds.
        console.warn("WorldProvider: mainWorld requested but not found by worldService. Relying on setupWorlds to create it.");
        setCurrentWorldIdState('mainWorld'); // Ensure ID state is mainWorld for setupWorlds logic
    } else {
        // Fallback for other unhandled cases where targetWorld is null
        console.warn(`WorldProvider: Target world for ${id} was null after processing. Falling back to mainWorld if available.`);
        const main = worldService.getWorld('mainWorld');
        if (main) setCurrentWorld(main);
        if (currentWorldId !== 'mainWorld') setCurrentWorldIdState('mainWorld');
    }
    setIsLoading(false);
  }, [worldService, ensureProjectWorldExists, isTouchDevice, currentWorldId, currentWorld]); // Added currentWorldId and currentWorld as deps

  const value = {
    worlds,
    currentWorld,
    currentWorldId,
    setCurrentWorldId,
    worldService,
    getCameraTarget,
    isLoading,
    refreshWorlds,
    verifyFileStorage
  };

  return (
    <WorldContext.Provider value={value}>
      {children}
    </WorldContext.Provider>
  );
};

export const useWorld = () => {
  const context = useContext(WorldContext);
  if (context === undefined) {
    throw new Error('useWorld must be used within a WorldProvider');
  }
  return context;
};

export default WorldContext; 