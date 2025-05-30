import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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

  // Function to force refresh worlds
  const refreshWorlds = () => {
    console.log('WorldProvider: Manually refreshing worlds');
    setRefreshTrigger(prev => prev + 1);
  };

  // Function to verify file storage
  const verifyFileStorage = async (): Promise<boolean> => {
    console.log('WorldProvider: Verifying file storage');
    
    try {
      // Check if portfolio_files exists in localStorage
      const storedFilesStr = localStorage.getItem('portfolio_files');
      if (!storedFilesStr) {
        console.log('WorldProvider: No portfolio_files found in localStorage');
        return false;
      }
      
      // Parse the stored files
      const storedFiles = JSON.parse(storedFilesStr);
      
      // Check if it's an object
      if (typeof storedFiles !== 'object' || storedFiles === null) {
        console.error('WorldProvider: Invalid portfolio_files format');
        return false;
      }
      
      // Verify some files exist
      const fileKeys = Object.keys(storedFiles);
      console.log(`WorldProvider: Found ${fileKeys.length} files in portfolio_files`);
      
      // Check if each file has a dataUrl
      let validFiles = 0;
      for (const key of fileKeys) {
        if (storedFiles[key] && storedFiles[key].dataUrl) {
          validFiles++;
        }
      }
      
      console.log(`WorldProvider: ${validFiles} of ${fileKeys.length} files have valid dataUrl properties`);
      
      // Check if any projects use file:// URLs
      const projects = await projectService.getProjects();
      let projectsWithFileUrls = 0;
      
      for (const project of projects) {
        if (project.thumbnail && project.thumbnail.startsWith('file://')) {
          projectsWithFileUrls++;
          
          // Verify the file exists in storage
          const filename = project.thumbnail.replace('file://', '');
          let fileFound = false;
          
          // Direct match
          if (storedFiles[filename] && storedFiles[filename].dataUrl) {
            fileFound = true;
          } else {
            // Try partial matching (looking for the filename in any key)
            const possibleMatch = fileKeys.find(key => 
              key.endsWith(filename) || filename.endsWith(key)
            );
            
            if (possibleMatch && storedFiles[possibleMatch].dataUrl) {
              fileFound = true;
              
              // Update the project to use the correct key
              console.log(`WorldProvider: Updating project ${project.id} to use correct file key: ${possibleMatch}`);
              project.thumbnail = `file://${possibleMatch}`;
              await projectService.saveProject(project);
            }
          }
          
          if (!fileFound) {
            console.error(`WorldProvider: File ${filename} not found for project ${project.id}`);
          }
        }
      }
      
      console.log(`WorldProvider: ${projectsWithFileUrls} projects use file:// URLs for thumbnails`);
      
      return validFiles > 0;
    } catch (error) {
      console.error('WorldProvider: Error verifying file storage:', error);
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
        // Load projects from project.json files instead of localStorage
        await projectDataService.initialize();
        const loadedProjects = await projectDataService.getAllProjects();
        
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
        
        // Create or update a fresh main world with the latest projects
        const newMainWorld = createMainWorld(validProjects);
        
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
          setCurrentWorld(worldToDisplay);
        } else {
          // Fallback to main world if specific world still not found
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
      }
    };

    setupWorlds();
  }, [currentWorldId, refreshTrigger, worldService, isTouchDevice]);

  const getCameraTarget = (): [number, number, number] => {
    if (currentWorld?.cameraTarget) {
      const target = currentWorld.cameraTarget;
      return [target.x, target.y, target.z];
    }
    return [0, 0, 0];
  };

  const setCurrentWorldId = (id: string) => {
    // Check if this is a project world
    if (id.startsWith('project-world-')) {
      const projectId = parseInt(id.replace('project-world-', ''), 10);
      
      // Ensure the project world exists
      ensureProjectWorldExists(projectId, id);
    }
    
    setCurrentWorldIdState(id);
  };
  
  // Utility function to ensure a project world exists
  const ensureProjectWorldExists = async (projectId: number, worldId: string) => {
    // Check if the world already exists
    const worldExists = worldService.getWorld(worldId);
    
    if (worldExists) {
      return;
    }
    
    // Get the project data
    try {
      // Use projectDataService to get full ProjectData with assetGallery
      const projectData = await projectDataService.getProjectById(projectId);
      
      if (projectData) {
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
        
        // Create the project world
        const projectWorld = createProjectWorld(project, isTouchDevice);
        
        // Save the world
        worldService.updateWorld(projectWorld);
        
        // Force a refresh to make sure the world is loaded properly
        refreshWorlds();
      } else {
        console.warn(`Could not find project with ID: ${projectId}`);
      }
    } catch (error) {
      console.error(`Error creating project world:`, error);
    }
  };

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