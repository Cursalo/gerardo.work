import { WorldObject } from '../data/worlds'; // Added import

export interface Project {
  id: number;
  name: string;
  description: string;
  link: string;
  thumbnail: string;
  status: 'completed' | 'in-progress';
  type: 'standard' | 'video';
  videoUrl?: string;
  customLink?: string; // Custom URL path for direct access to this project's world
  mediaObjects?: WorldObject[]; // Added to store project-specific media/objects
  worldSettings?: {
    backgroundColor: string;
    floorColor: string;
    skyColor: string;
    floorTexture?: string; // Added for floor texture URL
    skyTexture?: string;   // Added for sky texture URL
    ambientLightColor: string;
    ambientLightIntensity: number;
    directionalLightColor: string;
    directionalLightIntensity: number;
  };
}

class ProjectService {
  private projects: Project[] = [];
  private readonly STORAGE_KEY = 'portfolio_projects';
  private initialized = false;

  constructor() {
    this.loadProjects();
  }

  private async loadProjects(): Promise<void> {
    console.log('ProjectService: Attempting to load projects from primary storage.');
    this.initialized = false; // Reset initialized state for a fresh load sequence
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        try {
          const parsedProjects = JSON.parse(stored);
          if (Array.isArray(parsedProjects)) {
            this.projects = parsedProjects.map(p => { // Ensure all known fields are at least present
              let correctedThumbnail = p.thumbnail;
              if (typeof p.thumbnail === 'string' && 
                  p.thumbnail.includes('img.youtube.com/vi/') && 
                  p.thumbnail.endsWith('/maxresdefau')) {
                correctedThumbnail = p.thumbnail.replace('/maxresdefau', '/maxresdefault.jpg');
                console.log(`ProjectService: Corrected thumbnail URL for project ID ${p.id || 'N/A'}: from ${p.thumbnail} to ${correctedThumbnail}`);
              }
              return {
                ...p,
                thumbnail: correctedThumbnail, // Use the corrected thumbnail
                mediaObjects: Array.isArray(p.mediaObjects) ? p.mediaObjects : [], // Ensure mediaObjects is always an array
                worldSettings: p.worldSettings || undefined // Ensure worldSettings is present or undefined
              };
            });
            console.log(`ProjectService: Successfully loaded and parsed ${this.projects.length} projects from primary storage.`);
            this.saveToStorage(); // Save corrected projects back to storage to persist the fix
          } else {
            console.error('ProjectService: Primary storage data is not a valid array. Attempting recovery from backup.');
            this.projects = []; // Start fresh before recovery
            if (!this.tryRecoverFromBackup()) { // Try backup
              console.log('ProjectService: Backup recovery failed or no backup. Loading from JSON files.');
              await this.loadFromJsonFiles(); // Load from JSON files instead of static data
            }
          }
        } catch (parseError) {
          console.error('ProjectService: Error parsing projects from primary storage:', parseError, '. Attempting recovery from backup.');
          this.projects = []; // Start fresh before recovery
          if (!this.tryRecoverFromBackup()) { // Try backup
             console.log('ProjectService: Backup recovery failed or no backup. Loading from JSON files.');
             await this.loadFromJsonFiles(); // Load from JSON files instead of static data
          }
        }
      } else {
        console.log('ProjectService: No projects found in primary storage. Loading from JSON files.');
        await this.loadFromJsonFiles(); // Load from JSON files instead of static data
      }
    } catch (error) {
      console.error('ProjectService: General error during project loading:', error, '. Attempting recovery from backup.');
      this.projects = []; // Start fresh before recovery
      if (!this.tryRecoverFromBackup()) { // Try backup
          console.log('ProjectService: Backup recovery failed or no backup. Loading from JSON files.');
          await this.loadFromJsonFiles(); // Load from JSON files instead of static data
      }
    } finally {
      this.initialized = true;
      console.log('ProjectService: loadProjects sequence finished. Initialized state set to true.');
    }
  }

  // Load projects from individual JSON files in the project_definitions directory
  private async loadFromJsonFiles(): Promise<void> {
    console.log('ProjectService: Loading projects from JSON files.');
    try {
      // Create an array to store loaded projects
      const loadedProjects: Project[] = [];

      // Loop from 1 to 30 to load all project files
      for (let i = 1; i <= 30; i++) {
        try {
          // Dynamic import the JSON file
          const projectModule = await import(`../data/project_definitions/project_${i}.json`);
          const project = projectModule.default || projectModule;

          // Ensure all required fields are present
          const validProject: Project = {
            ...project,
            mediaObjects: Array.isArray(project.mediaObjects) ? project.mediaObjects : [],
            worldSettings: project.worldSettings || undefined
          };

          loadedProjects.push(validProject);
          console.log(`ProjectService: Loaded project ${i} from JSON file.`);
        } catch (error) {
          console.warn(`ProjectService: Could not load project_${i}.json:`, error);
        }
      }

      if (loadedProjects.length > 0) {
        // Sort projects by ID for consistency
        this.projects = loadedProjects.sort((a, b) => a.id - b.id);
        console.log(`ProjectService: Successfully loaded ${this.projects.length} projects from JSON files.`);
        
        // Save to localStorage
        this.saveToStorage();
      } else {
        console.error('ProjectService: No projects could be loaded from JSON files.');
        this.projects = [];
      }
    } catch (error) {
      console.error('ProjectService: Error loading projects from JSON files:', error);
      this.projects = [];
    }
  }

  private saveToStorage(): void {
    try {
      // Ensure mediaObjects is always an array for all projects before saving
      const projectsToSave = this.projects.map(p => ({
        ...p,
        id: p.id || this.getNextId(), // Ensure ID exists
        mediaObjects: Array.isArray(p.mediaObjects) ? p.mediaObjects : [],
        worldSettings: p.worldSettings || undefined
      }));

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projectsToSave));
      console.log(`ProjectService: Saved ${projectsToSave.length} projects to localStorage (main key).`);

      // Create backup copy
      localStorage.setItem(`${this.STORAGE_KEY}_backup`, JSON.stringify(projectsToSave));
      console.log(`ProjectService: Created backup for ${projectsToSave.length} projects.`);

    } catch (error) {
      console.error('ProjectService: Error saving projects to localStorage (main key and backup):', error);
      // Fallback saving strategy of saving individual projects is removed to simplify.
      // If primary save fails, it indicates a more significant issue that should be addressed.
      // Consider alternative error handling or notification if direct save fails.
    }
  }

  // Alias for saveToStorage - added for clarity in code flow
  private saveProjects(): void {
    this.saveToStorage();
  }

  // Get the next available project ID
  private getNextId(): number {
    const maxId = Math.max(0, ...this.projects.map(p => p.id || 0));
    return maxId + 1;
  }

  async getProjects(): Promise<Project[]> {
    // If not initialized yet, wait for initialization
    if (!this.initialized) {
      console.log('ProjectService: getProjects - Waiting for initialization...');
      await new Promise<void>((resolve) => { // Changed to Promise<void>
        const checkInterval = setInterval(() => {
          if (this.initialized) {
            clearInterval(checkInterval);
            console.log('ProjectService: getProjects - Initialization complete.');
            resolve();
          }
        }, 50); // Check more frequently
      });
    }
    
    // If projects array is empty AND primary storage key doesn't exist,
    // it implies first-time load or complete data loss, so try loading from JSON
    if (this.projects.length === 0 && localStorage.getItem(this.STORAGE_KEY) === null) {
      console.log('ProjectService: getProjects - No projects in memory and no primary storage key found. Loading from JSON files.');
      await this.loadFromJsonFiles();
    }
    
    console.log(`ProjectService: getProjects - Returning ${this.projects.length} projects from memory.`);
    return [...this.projects]; // Return a copy to prevent direct mutation
  }

  async getProjectById(id: number): Promise<Project | undefined> {
    const projects = await this.getProjects();
    const project = projects.find(p => p.id === id);
    
    if (project) {
      console.log(`ProjectService: Found project with ID ${id}:`, project);
    } else {
      console.warn(`ProjectService: Project with ID ${id} not found`);
    }
    
    return project;
  }

  async saveProject(project: Project): Promise<Project> {
    console.log(`ProjectService: Saving project ${project.id}`, project);
    
    // If it's a new project, assign an ID
    if (!project.id) {
      project.id = this.getNextId();
    }
    
    // Find the index of the project in our array
    const index = this.projects.findIndex(p => p.id === project.id);
    
    // Replace or add the project
    if (index !== -1) {
      // Update existing project
      this.projects[index] = { ...project };
    } else {
      // Add new project
      this.projects.push({ ...project });
    }
    
    // Sort projects by ID to maintain consistent ordering
    this.projects.sort((a, b) => a.id - b.id);
    
    // Save projects to localStorage
    console.log('ProjectService: Saving projects to localStorage');
    this.saveProjects();
    
    // CRITICAL FIX: Force world service to update any project worlds for this project
    try {
      // Dynamic import to avoid circular dependencies
      const { getWorldServiceInstance } = await import('../data/worlds');
      const worldService = getWorldServiceInstance();
      
      // Check if there's a project world for this project
      const projectWorldId = `project-world-${project.id}`;
      const existingWorld = worldService.getWorld(projectWorldId);
      
      if (existingWorld) {
        console.log(`ProjectService: Updating project world ${projectWorldId} after project save`);
        
        // Import createProjectWorld dynamically
        const { createProjectWorld } = await import('../data/worlds');
        
        // Determine if it's a touch device for world creation
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // Create a fresh project world with the updated project data
        const updatedWorld = createProjectWorld(project, isTouchDevice);
        
        // Update the world in the world service
        worldService.updateWorld(updatedWorld);
        console.log(`ProjectService: Project world ${projectWorldId} updated successfully`);
      } else {
        console.log(`ProjectService: No existing world ${projectWorldId} to update`);
      }
      
      // Trigger a refresh of the main world to update any project cards
      console.log('ProjectService: Triggering main world refresh');
      const mainWorld = worldService.getWorld('mainWorld');
      if (mainWorld) {
        // Get updated project list
        const updatedProjects = [...this.projects];
      
        // Import createMainWorld dynamically
        const { createMainWorld } = await import('../data/worlds');
      
        // Create a fresh main world with all current projects
        const updatedMainWorld = createMainWorld(updatedProjects);
      
        // Update the main world in the world service
        worldService.updateWorld(updatedMainWorld);
        console.log('ProjectService: Main world updated successfully');
      } else {
        console.log('ProjectService: No main world to update');
      }
    } catch (error) {
      console.error('ProjectService: Error updating related worlds after project save:', error);
    }
    
    return project;
  }

  async updateProject(id: number, project: Partial<Project>): Promise<Project> {
    const existingProject = await this.getProjectById(id);
    
    if (!existingProject) {
      throw new Error(`Project with ID ${id} not found`);
    }
    
    const updatedProject = { ...existingProject, ...project };
    return this.saveProject(updatedProject);
  }

  async deleteProject(id: number): Promise<void> {
    const index = this.projects.findIndex(p => p.id === id);
    
    if (index !== -1) {
      this.projects.splice(index, 1);
      this.saveProjects();
      console.log(`ProjectService: Deleted project with ID ${id}`);
    } else {
      console.warn(`ProjectService: Attempted to delete non-existent project with ID ${id}`);
    }
  }

  // Handle form submission for both GET and POST methods
  async handleFormSubmission(formData: FormData, method: 'POST' = 'POST'): Promise<Project> {
    try {
      await this.initialize();
      
      // CRITICAL FIX: Ensure current projects are loaded first
      await this.getProjects();
      
      const formId = formData.get('id');
      const id = formId ? parseInt(formId as string) : null;
      
      console.log('ProjectService: Processing form submission', id ? `for project ID ${id}` : 'for new project');
      
      // Extract project data from form
      const project: Project = {
        id: id || Date.now(),
        name: formData.get('name') as string || '',
        description: formData.get('description') as string || '',
        link: formData.get('link') as string || '',
        thumbnail: formData.get('thumbnail') as string || '',
        status: (formData.get('status') as 'completed' | 'in-progress') || 'in-progress',
        type: (formData.get('type') as 'standard' | 'video') || 'standard',
      };
      
      console.log('ProjectService: Form data parsed', {
        id: project.id,
        name: project.name,
        description: project.description?.substring(0, 20) + '...',
        link: project.link,
        thumbnail: project.thumbnail?.substring(0, 20) + '...',
        status: project.status,
        type: project.type
      });
      
      // Optional video URL
      if (formData.get('videoUrl')) {
        project.videoUrl = formData.get('videoUrl') as string;
      }
      
      // Optional custom link
      if (formData.get('customLink')) {
        project.customLink = formData.get('customLink') as string;
      }
      
      // Parse world settings if available
      let worldSettings = null;
      const worldSettingsStr = formData.get('worldSettings') as string;
      if (worldSettingsStr) {
        try {
          worldSettings = JSON.parse(worldSettingsStr);
          project.worldSettings = worldSettings;
          console.log('ProjectService: Parsed world settings successfully');
        } catch (error) {
          console.error('ProjectService: Error parsing world settings:', error);
          // CRITICAL FIX: Attempt to recover world settings
          try {
            // Try with more aggressive error handling
            const cleanedStr = worldSettingsStr.replace(/[\n\r\t]/g, '');
            worldSettings = JSON.parse(cleanedStr);
            if (worldSettings) {
              project.worldSettings = worldSettings;
              console.log('ProjectService: Recovered world settings after cleanup');
            }
          } catch (recoveryError) {
            console.error('ProjectService: Could not recover world settings:', recoveryError);
          }
        }
      }
      
      // Validate required fields
      if (!project.name) {
        throw new Error('Project name is required');
      }
      
      let result: Project;
      
      if (id) {
        // Update existing project
        try {
          result = await this.updateProject(id, project);
          console.log(`ProjectService: Updated existing project ID ${id} successfully`);
        } catch (updateError) {
          console.error(`ProjectService: Error updating project ${id}:`, updateError);
          
          // CRITICAL FIX: Fallback to direct save if update fails
          console.log(`ProjectService: Attempting direct save as fallback`);
          const existingIndex = this.projects.findIndex(p => p.id === id);
          
          if (existingIndex !== -1) {
            this.projects[existingIndex] = { ...this.projects[existingIndex], ...project };
          } else {
            this.projects.push(project);
          }
          
          this.saveToStorage();
          result = project;
        }
      } else {
        // Create new project
        try {
          result = await this.saveProject(project);
          console.log(`ProjectService: Created new project with ID ${result.id} successfully`);
        } catch (saveError) {
          console.error('ProjectService: Error saving new project:', saveError);
          
          // CRITICAL FIX: Fallback to direct save
          console.log('ProjectService: Attempting direct save as fallback');
          const maxId = Math.max(0, ...this.projects.map(p => p.id));
          const newProject = { ...project, id: project.id || maxId + 1 };
          this.projects.push(newProject);
          this.saveToStorage();
          result = newProject;
        }
      }
      
      // CRITICAL FIX: Verify project was actually saved in memory and storage
      const savedProject = this.projects.find(p => p.id === result.id);
      if (!savedProject) {
        console.error(`ProjectService: Project ${result.id} not found in memory after save - forcing re-add`);
        this.projects.push(result);
        this.saveToStorage();
      }
      
      // Double-check localStorage save
      try {
        const storedProjects = localStorage.getItem(this.STORAGE_KEY);
        if (storedProjects) {
          const parsedProjects = JSON.parse(storedProjects);
          if (Array.isArray(parsedProjects)) {
            const storedProject = parsedProjects.find(p => p.id === result.id);
            if (!storedProject) {
              console.error(`ProjectService: Project ${result.id} not found in localStorage - forcing save`);
              localStorage.setItem(`individual_project_${result.id}`, JSON.stringify(result));
            }
          }
        }
      } catch (verifyError) {
        console.error('ProjectService: Error verifying project in localStorage:', verifyError);
      }
      
      return result;
    } catch (error) {
      console.error('ProjectService: Error handling form submission:', error);
      throw error;
    }
  }

  // Initialize the service
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('ProjectService: Already initialized.');
      return;
    }
    console.log('ProjectService: Explicitly initializing...');
    this.loadProjects(); // Call the refactored loadProjects
    // Wait for initialization to complete
    await new Promise<void>(resolve => { // Changed to Promise<void>
        const checkInterval = setInterval(() => {
            if (this.initialized) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 50);
    });
    console.log('ProjectService: Initialization complete via initialize() method.');
  }

  private tryRecoverFromBackup(): boolean {
    try {
      console.log('ProjectService: Attempting to recover from backup storage.');
      const backupData = localStorage.getItem(`${this.STORAGE_KEY}_backup`);
      
      if (backupData) {
        try {
          const parsedBackup = JSON.parse(backupData);
          if (Array.isArray(parsedBackup) && parsedBackup.length > 0) {
            this.projects = parsedBackup.map(p => ({
              ...p,
              mediaObjects: Array.isArray(p.mediaObjects) ? p.mediaObjects : [],
              worldSettings: p.worldSettings || undefined
            }));
            console.log(`ProjectService: Successfully recovered ${this.projects.length} projects from backup.`);
            this.saveToStorage(); // Restore primary storage from backup
            return true;
          }
        } catch (parseError) {
          console.error('ProjectService: Error parsing backup data:', parseError);
        }
      }
      return false;
    } catch (error) {
      console.error('ProjectService: Error during backup recovery attempt:', error);
      return false;
    }
  }
  
  public async forceReloadProjects(): Promise<void> {
    console.log('ProjectService: Force reloading projects');
    this.initialized = false;
    await this.loadProjects();
  }

  public getProjectsDirectFromStorage(): Project[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map(p => ({
            ...p,
            mediaObjects: Array.isArray(p.mediaObjects) ? p.mediaObjects : [],
            worldSettings: p.worldSettings || undefined
          }));
        }
      }
      return [];
    } catch (error) {
      console.error('ProjectService: Error getting projects direct from storage:', error);
      return [];
    }
  }
  
  public saveProjectsDirectToStorage(projects: Project[]): boolean {
    try {
      // Process projects to ensure all required fields
      const processedProjects = projects.map(p => ({
        ...p,
        id: p.id || this.getNextId(),
        mediaObjects: Array.isArray(p.mediaObjects) ? p.mediaObjects : [],
        worldSettings: p.worldSettings || undefined
      }));

      // Save to primary storage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(processedProjects));
      
      // Also update backup
      localStorage.setItem(`${this.STORAGE_KEY}_backup`, JSON.stringify(processedProjects));
      
      console.log(`ProjectService: Directly saved ${processedProjects.length} projects to storage`);
      return true;
    } catch (error) {
      console.error('ProjectService: Error saving projects directly to storage:', error);
      return false;
    }
  }
}

// Create and export the singleton instance
export const projectService = new ProjectService(); 