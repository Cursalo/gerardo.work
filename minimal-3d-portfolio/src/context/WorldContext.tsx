import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { World, WorldService, getWorldServiceInstance, createMainWorld, createProjectWorld } from '../data/worlds';
import { Project, projectService } from '../services/projectService';
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
  initialProjects?: Project[];
}

export const WorldProvider = ({
  children,
  initialWorldId = 'mainWorld',
  initialProjects = []
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
      console.log('WorldProvider: Setting up worlds', { refreshTrigger, currentWorldId });
      setIsLoading(true);
      
      try {
        // CRITICAL FIX: Force projectService to reload projects from localStorage first
        console.log('WorldProvider: Forcing projectService to reload projects.');
        await projectService.forceReloadProjects(); // Ensure freshest projects
        console.log('WorldProvider: projectService reload complete.');

        // CRITICAL FIX: Always reload projects and recreate/update mainWorld on refreshTrigger change
        console.log('WorldProvider: Reloading all projects and mainWorld due to refresh trigger or ID change.');
        
        // CRITICAL FIX: Verify project data is consistent
        const loadedProjects = await projectService.getProjects();
        
        // CRITICAL FIX: Also get direct from localStorage to verify consistency
        const directProjects = projectService.getProjectsDirectFromStorage();
        
        // Check if in-memory projects match localStorage
        if (JSON.stringify(loadedProjects) !== JSON.stringify(directProjects)) {
          console.warn('WorldProvider: In-memory projects don\'t match localStorage');
          
          // Determine which set to use - prefer the one with more projects
          const projectsToUse = directProjects.length >= loadedProjects.length ? 
            directProjects : loadedProjects;
          
          console.log(`WorldProvider: Using set with ${projectsToUse.length} projects`);
          
          // Sort for consistency
          const sortedProjects = [...projectsToUse].sort((a, b) => a.id - b.id);
          
          // Save directly to localStorage
          projectService.saveProjectsDirectToStorage(sortedProjects);
          
          // Also update in-memory state
          for (let i = 0; i < sortedProjects.length; i++) {
            await projectService.saveProject(sortedProjects[i]);
          }
          
          // Force reload
          await projectService.forceReloadProjects();
          
          console.log('WorldProvider: Projects synchronized between memory and localStorage');
        } else {
          // Verify by sorting and comparing - if inconsistent order, save back to localStorage
          const sortedProjects = [...loadedProjects].sort((a, b) => a.id - b.id);
          if (JSON.stringify(sortedProjects) !== JSON.stringify(loadedProjects)) {
            console.warn('WorldProvider: Project order is inconsistent, sorting and saving');
            
            // Replace with sorted version and save
            for (let i = 0; i < sortedProjects.length; i++) {
              await projectService.saveProject(sortedProjects[i]);
            }
            
            // Force reload again to ensure consistent data
            await projectService.forceReloadProjects();
          }
        }
        
        console.log('WorldProvider: Loaded projects from projectService:', loadedProjects);
        
        // Use loaded projects if available, otherwise fall back to initialProjects (should be rare now)
        const projectsToUse = loadedProjects.length > 0 ? loadedProjects : initialProjects;
        console.log('WorldProvider: Using projects for main world:', projectsToUse);
        
        // Create or update a fresh main world with the latest projects
        console.log('WorldProvider: Creating/Updating fresh main world with projects:', projectsToUse);
        const mainWorld = createMainWorld(projectsToUse); // This function should handle creating project cards correctly
        console.log('WorldProvider: Main world created/updated:', mainWorld);
        
        // Save the main world to the service (this updates it in memory and localStorage via worldService.updateWorld)
        worldService.updateWorld(mainWorld);
        console.log('WorldProvider: Main world saved to service');
        
        // CRITICAL FIX: ensure worlds are saved properly
        worldService.saveAllWorlds();
        console.log('WorldProvider: Forced save of all worlds');

        // Update the local worlds state to include the new mainWorld and any other existing worlds
        // This ensures that the list of worlds available in the context is up-to-date.
        const allCurrentWorldsFromService = worldService.getAllWorlds();
        setWorlds(allCurrentWorldsFromService);
        console.log('WorldProvider: All worlds from service set locally:', allCurrentWorldsFromService);

        // Determine the world to display
        let worldToDisplay = null;
        if (currentWorldId === 'mainWorld') {
          worldToDisplay = mainWorld; 
        } else {
          worldToDisplay = worldService.getWorld(currentWorldId);
          if (!worldToDisplay) {
            console.warn(`WorldProvider: Requested world ${currentWorldId} not found after refresh, attempting to create project world.`);
            if (currentWorldId.startsWith('project-world-')) {
              const projectIdMatch = currentWorldId.match(/project-world-(\d+)/);
              if (projectIdMatch && projectIdMatch[1]) {
                const projectId = parseInt(projectIdMatch[1], 10);
                const project = projectsToUse.find(p => p.id === projectId);
                if (project) {
                  console.log(`WorldProvider: Creating world for project ${projectId}:`, project);
                  // createProjectWorld is expected to be synchronous and return a World object
                  const projectWorldInstance = createProjectWorld(project, isTouchDevice);
                  worldService.updateWorld(projectWorldInstance); // Save to service
                  worldToDisplay = projectWorldInstance;
                  // Update the local worlds list again if a new world was created
                  setWorlds(worldService.getAllWorlds());
                  console.log(`WorldProvider: Project world ${currentWorldId} created and set.`);
                } else {
                  console.error(`WorldProvider: Project with ID ${projectId} not found for world ${currentWorldId}`);
                }
              } else {
                console.error(`WorldProvider: Could not parse project ID from ${currentWorldId}`);
              }
            }
          }
        }

        if (worldToDisplay) {
          setCurrentWorld(worldToDisplay);
          console.log(`WorldProvider: Current world set to:`, worldToDisplay.id, worldToDisplay.name);
        } else {
          // Fallback to main world if specific world still not found
          console.warn(`WorldProvider: World ${currentWorldId} still not resolved, falling back to mainWorld.`);
          setCurrentWorld(mainWorld);
          if (currentWorldId !== 'mainWorld') {
            setCurrentWorldIdState('mainWorld'); // Correct the ID state if we fell back
          }
          console.log(`WorldProvider: Fallback Current world set to:`, mainWorld.id, mainWorld.name);
        }
        
        // The following block is no longer needed as target_world_id is cleared upon read:
        // const targetWorldIdFromStorage = localStorage.getItem('target_world_id');
        // if (targetWorldIdFromStorage) {
        //   localStorage.removeItem('target_world_id');
        //   localStorage.removeItem('target_project_id');
        //   console.log('WorldProvider: Cleared target_world_id from localStorage.');
        // }

      } catch (error) {
        console.error('WorldProvider: Error in world setup:', error);
        setIsLoading(false); // Ensure loading is false on error
      } finally {
        setIsLoading(false);
        console.log('WorldProvider: Setup complete, isLoading set to false');
      }
    };

    setupWorlds();
  }, [currentWorldId, refreshTrigger, worldService, initialProjects, isTouchDevice]); // Added worldService and initialProjects to dependency array for robustness

  const getCameraTarget = (): [number, number, number] => {
    if (currentWorld?.cameraTarget) {
      const target = currentWorld.cameraTarget;
      return [target.x, target.y, target.z];
    }
    return [0, 0, 0];
  };

  const setCurrentWorldId = (id: string) => {
    console.log(`Setting current world ID to: ${id}`);
    
    // Check if this is a project world
    if (id.startsWith('project-world-')) {
      const projectId = parseInt(id.replace('project-world-', ''), 10);
      console.log(`Navigating to project world for project ID: ${projectId}`);
      
      // Ensure the project world exists
      ensureProjectWorldExists(projectId, id);
    }
    
    setCurrentWorldIdState(id);
  };
  
  // Utility function to ensure a project world exists
  const ensureProjectWorldExists = async (projectId: number, worldId: string) => {
    console.log(`Ensuring project world exists for project ID: ${projectId}, world ID: ${worldId}`);
    
    // Check if the world already exists
    const worldExists = worldService.getWorld(worldId);
    
    if (worldExists) {
      console.log(`Project world ${worldId} already exists`);
      return;
    }
    
    console.log(`Project world ${worldId} does not exist, creating it`);
    
    // Get the project data
    try {
      // First try to get it from the projectService
      const project = await projectService.getProjectById(projectId);
      
      if (project) {
        console.log(`Creating project world for project:`, project);
        
        // Create the project world
        const projectWorld = createProjectWorld(project, isTouchDevice);
        
        // Save the world
        worldService.updateWorld(projectWorld);
        console.log(`Created and saved project world: ${projectWorld.id}`);
        
        // Force a refresh to make sure the world is loaded properly
        refreshWorlds();
      } else {
        console.error(`Could not find project with ID: ${projectId}`);
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