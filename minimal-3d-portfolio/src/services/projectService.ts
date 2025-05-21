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

  private loadProjects(): void {
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
              console.log('ProjectService: Backup recovery failed or no backup. No projects loaded.');
            }
          }
        } catch (parseError) {
          console.error('ProjectService: Error parsing projects from primary storage:', parseError, '. Attempting recovery from backup.');
          this.projects = []; // Start fresh before recovery
          if (!this.tryRecoverFromBackup()) { // Try backup
             console.log('ProjectService: Backup recovery failed or no backup. No projects loaded.');
          }
        }
      } else {
        console.log('ProjectService: No projects found in primary storage. Attempting recovery from backup.');
        if (!this.tryRecoverFromBackup()) {
          console.log('ProjectService: Backup recovery failed or no backup. Loading from static data as last resort.');
          // If backup also fails, then load static (should only happen on first ever run or total data loss)
          import('../data/projects').then(({ projects: staticProjects }) => {
            this.projects = staticProjects.map(p => ({ ...p, mediaObjects: Array.isArray(p.mediaObjects) ? p.mediaObjects : [] }));
            console.log(`ProjectService: Loaded ${this.projects.length} projects from static data.`);
            this.saveToStorage(); // Save static data to establish primary storage
          }).catch(error => {
            console.error('ProjectService: Error loading static projects:', error);
            this.projects = []; // Ensure projects is an empty array on failure
          });
        }
      }
    } catch (error) {
      console.error('ProjectService: General error during project loading:', error, '. Attempting recovery from backup.');
      this.projects = []; // Start fresh before recovery
      if (!this.tryRecoverFromBackup()) { // Try backup
          console.log('ProjectService: Backup recovery failed or no backup. No projects loaded.');
      }
    } finally {
      this.initialized = true;
      console.log('ProjectService: loadProjects sequence finished. Initialized state set to true.');
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
    // it implies first-time load or complete data loss, so try loading static.
    if (this.projects.length === 0 && localStorage.getItem(this.STORAGE_KEY) === null) {
      console.log('ProjectService: getProjects - No projects in memory and no primary storage key found. Attempting to load from static data as a one-time setup.');
      try {
        const { projects: staticProjects } = await import('../data/projects');
        this.projects = staticProjects.map(p => ({
            ...p,
            mediaObjects: Array.isArray(p.mediaObjects) ? p.mediaObjects : []
        }));
        console.log(`ProjectService: getProjects - Loaded ${this.projects.length} projects from static data.`);
        this.saveToStorage(); // Save static data to establish primary storage
      } catch (error) {
        console.error('ProjectService: getProjects - Error loading static projects:', error);
        this.projects = []; // Ensure projects is an empty array on failure
      }
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
        
        // Create fresh main world
        const updatedMainWorld = createMainWorld(updatedProjects);
        
        // Update the main world
        worldService.updateWorld(updatedMainWorld);
        console.log('ProjectService: Main world updated successfully');
      }
    } catch (error) {
      console.error('ProjectService: Error updating worlds after project save:', error);
    }
    
    return project;
  }

  async updateProject(id: number, project: Partial<Project>): Promise<Project> {
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) {
      console.error(`ProjectService: Cannot update project with ID ${id} - not found`);
      throw new Error('Project not found');
    }
    
    this.projects[index] = { ...this.projects[index], ...project };
    this.saveToStorage();
    console.log(`ProjectService: Updated project with ID ${id}:`, this.projects[index]);
    return this.projects[index];
  }

  async deleteProject(id: number): Promise<void> {
    console.log(`ProjectService: Deleting project with ID ${id}`);
    this.projects = this.projects.filter(p => p.id !== id);
    this.saveProjects();
    // Similar to saveProject, world deletions/updates should be handled by WorldContext
    // reacting to the change in project list.
    console.log(`ProjectService: Project ${id} deleted. World updates should be handled by WorldContext.`);
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
    console.log('ProjectService: Attempting to recover projects from backup.');
    try {
      const backupStored = localStorage.getItem(`${this.STORAGE_KEY}_backup`);
      if (backupStored) {
        const parsedBackup = JSON.parse(backupStored);
        if (Array.isArray(parsedBackup)) {
          this.projects = parsedBackup.map(p => ({
            ...p,
            mediaObjects: Array.isArray(p.mediaObjects) ? p.mediaObjects : [] // Ensure mediaObjects from backup
          }));
          console.log(`ProjectService: Successfully recovered ${this.projects.length} projects from backup. Saving them to primary storage.`);
          this.saveToStorage(); // Restore backup to primary storage
          return true;
        }
        console.error('ProjectService: Backup data is not a valid array.');
        return false;
      }
      console.log('ProjectService: No backup data found.');
      return false;
    } catch (error) {
      console.error('ProjectService: Error recovering projects from backup:', error);
      return false;
    }
  }

  public async forceReloadProjects(): Promise<void> {
    console.log('ProjectService: forceReloadProjects called. Reloading projects.');
    this.loadProjects(); // This will reset `initialized` and reload.
    // getProjects will internally wait for `initialized` to be true.
    await this.getProjects(); // Ensures reload is complete and projects are available.
    console.log('ProjectService: forceReloadProjects completed and projects are re-initialized.');
  }

  // CRITICAL FIX: Direct localStorage method that bypasses in-memory state
  // This can be used to get the raw data directly from localStorage
  public getProjectsDirectFromStorage(): Project[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          console.log(`ProjectService: Direct read from localStorage returned ${parsed.length} projects`);
          return parsed;
        }
      }
      return [];
    } catch (error) {
      console.error('ProjectService: Error directly reading from localStorage:', error);
      return [];
    }
  }
  
  // CRITICAL FIX: Direct save to localStorage that bypasses in-memory state
  public saveProjectsDirectToStorage(projects: Project[]): boolean {
    try {
      if (!Array.isArray(projects)) {
        console.error('ProjectService: Cannot directly save non-array to localStorage');
        return false;
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));
      console.log(`ProjectService: Directly saved ${projects.length} projects to localStorage`);
      return true;
    } catch (error) {
      console.error('ProjectService: Error directly saving to localStorage:', error);
      return false;
    }
  }
}

export const projectService = new ProjectService(); 