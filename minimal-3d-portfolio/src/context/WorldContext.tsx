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
  checkForProjectFileUpdates: () => Promise<boolean>;
}

const WorldContext = createContext<WorldContextType | undefined>(undefined);

interface WorldProviderProps {
  children: ReactNode;
  initialWorldId?: string;
}

export const WorldProvider = ({
  children,
  initialWorldId = 'mainWorld',
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

  // Function to check for project.json file updates
  const checkForProjectFileUpdates = async (): Promise<boolean> => {
    console.log('WorldProvider: Checking for project file updates in public/projects folder');
    try {
      // First, force a reload of all project files from disk
      await projectService.forceReloadProjectsFromDisk();
      
      // Then reload the world service
      worldService.reloadWorlds();
      
      // Update the worlds state
      const updatedWorlds = worldService.getAllWorlds();
      setWorlds(updatedWorlds);
      
      // Update current world if needed
      const currentWorldNormalized = worldService.normalizeWorldId(currentWorldId);
      const updatedCurrentWorld = worldService.getWorld(currentWorldNormalized);
      
      if (updatedCurrentWorld) {
        setCurrentWorld(updatedCurrentWorld);
      }
      
      console.log('WorldProvider: Project files check complete, worlds refreshed');
      return true;
    } catch (error) {
      console.error('WorldProvider: Error checking for project file updates:', error);
      return false;
    }
  };

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
          const sortedLoaded = [...loadedProjects].sort((a, b) => a.id - b.id);
          const sortedDirect = [...directProjects].sort((a, b) => a.id - b.id);
          
          if (JSON.stringify(sortedLoaded) !== JSON.stringify(sortedDirect)) {
            console.warn('WorldProvider: Projects have inconsistent order');
            
            // Save sorted version to localStorage
            projectService.saveProjectsDirectToStorage(sortedLoaded);
            
            // Also update in-memory state
            for (let i = 0; i < sortedLoaded.length; i++) {
              await projectService.saveProject(sortedLoaded[i]);
            }
            
            console.log('WorldProvider: Projects re-sorted and saved back to storage');
          } else {
            console.log('WorldProvider: Project data is consistent between memory and localStorage');
          }
        }
        
        // Verify the world storage is working correctly
        const worldData = localStorage.getItem(STORAGE_KEY);
        if (!worldData) {
          console.log('WorldProvider: No world data found, need to initialize');
        } else {
          console.log(`WorldProvider: Found world data in localStorage: ${worldData.substring(0, 50)}...`);
        }

        // Reload the world service to ensure fresh data
        worldService.reloadWorlds();
        
        // Get all loaded worlds from the world service
        const loadedWorlds = worldService.getAllWorlds();
        console.log(`WorldProvider: World service has ${loadedWorlds.length} worlds`);
        
        // Check if main world exists in world service
        const mainWorld = worldService.getWorld('mainWorld');
        
        // If main world doesn't exist, create it with the loaded projects
        if (!mainWorld) {
          console.log('WorldProvider: Main world not found, creating it with loaded projects');
          
          // Get the latest projects
          const projects = await projectService.getProjects();
          
          // Create and add the main world - explicit typing for createMainWorld parameter
          const newMainWorld = createMainWorld(projects);
          
          // Add to world service
          if (worldService.updateWorld(newMainWorld)) {
            console.log('WorldProvider: Successfully created and added main world');
          } else {
            console.error('WorldProvider: Failed to add main world');
          }
        } else {
          console.log('WorldProvider: Main world found in world service');
          
          // Force refresh of main world with latest projects
          const projects = await projectService.getProjects();
          const updatedMainWorld = createMainWorld(projects);
          worldService.updateWorld(updatedMainWorld);
          console.log('WorldProvider: Updated main world with latest projects');
        }
        
        // Create any missing project worlds
        const projects = await projectService.getProjects();
        let projectWorldsCreated = 0;
        let projectWorldsUpdated = 0;
        
        for (const project of projects) {
          const projectWorldId = `project-world-${project.id}`;
          const existingWorld = worldService.getWorld(projectWorldId);
          
          if (!existingWorld) {
            // Create project world
            const newProjectWorld = createProjectWorld(project, isTouchDevice);
            
            // Add to world service
            if (worldService.updateWorld(newProjectWorld)) {
              projectWorldsCreated++;
            }
          } else {
            // Update existing project world with latest project data
            const updatedProjectWorld = createProjectWorld(project, isTouchDevice);
            if (worldService.updateWorld(updatedProjectWorld)) {
              projectWorldsUpdated++;
            }
          }
        }
        
        if (projectWorldsCreated > 0) {
          console.log(`WorldProvider: Created ${projectWorldsCreated} missing project worlds`);
        }
        
        if (projectWorldsUpdated > 0) {
          console.log(`WorldProvider: Updated ${projectWorldsUpdated} existing project worlds`);
        }
        
        // Get the updated list of worlds
        const allWorlds = worldService.getAllWorlds();
        
        // Set the worlds state
        setWorlds(allWorlds);
        
        // Make sure current world is set and valid
        const currentWorldNormalized = worldService.normalizeWorldId(currentWorldId);
        const currentWorldFromService = worldService.getWorld(currentWorldNormalized);
        
        if (currentWorldFromService) {
          console.log(`WorldProvider: Setting current world to ${currentWorldNormalized}`);
          setCurrentWorld(currentWorldFromService);
        } else if (allWorlds.length > 0) {
          // Fallback to first available world if current is invalid
          console.log(`WorldProvider: Current world ${currentWorldNormalized} not found, falling back to ${allWorlds[0].id}`);
          setCurrentWorld(allWorlds[0]);
          setCurrentWorldIdState(allWorlds[0].id);
        } else {
          // No worlds available
          console.error('WorldProvider: No worlds available');
          setCurrentWorld(null);
        }
      } catch (error) {
        console.error('WorldProvider: Error setting up worlds:', error);
      } finally {
        setIsLoading(false);
      }
    };

    setupWorlds();
  }, [currentWorldId, refreshTrigger, isTouchDevice]);

  const getCameraTarget = (): [number, number, number] => {
    if (currentWorld?.cameraTarget) {
      const { x, y, z } = currentWorld.cameraTarget;
      return [x, y, z];
    }
    return [0, 0, 0]; // Default target if not specified
  };

  const setCurrentWorldId = (id: string) => {
    console.log(`WorldProvider: Setting currentWorldId to ${id}`);
    
    // Clean up any previous world - could release resources
    
    // Normalize the ID to ensure it's valid
    const normalizedId = worldService.normalizeWorldId(id);
    
    // Set the new world ID
    setCurrentWorldIdState(normalizedId);
    
    // Store in URL if using direct link (without React Router)
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('world', normalizedId);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      console.error('WorldProvider: Error updating URL:', e);
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
    verifyFileStorage,
    checkForProjectFileUpdates
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