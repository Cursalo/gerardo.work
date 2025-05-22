import { WorldObject } from '../data/worlds'; // Added import

// Define a cache version - increment this when project schema changes
const CACHE_VERSION = 2; // Added version 2 to include customLink

// Helper function to map project ID to name
function getProjectName(id: number): string {
  const projectMap: Record<number, string> = {
    1: "Burgertify",
    2: "Cursalo",
    3: "Foodketing",
    4: "Foodelopers",
    5: "Jaguar",
    6: "Matrix Agencia",
    7: "Wobistro",
    8: "Tokitaka",
    9: "EaxiAI",
    10: "Eaxily",
    11: "Talevista",
    12: "LinkMas",
    13: "LinkDialer",
    14: "AIClases.com",
    15: "BonsaiPrep",
    16: "Blue Voyage Travel",
    17: "Menu Crafters",
    18: "Monchee",
    19: "PitchDeckGenie",
    20: "PlatePlatform",
    21: "PostRaptor",
    22: "Power Up Pizza",
    23: "RAM",
    24: "Hybridge",
    25: "Burgavision",
    26: "Foodiez Apparel",
    27: "Avatarmatic",
    28: "Beta",
    29: "Amazonia Apoteket"
  };
  return projectMap[id] || `Project-${id}`;
}

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
  assetGallery?: Array<{
    url?: string;
    name?: string;
    type?: string;
    category?: string;
  }>; // Added to store project assets
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
  private readonly STORAGE_VERSION_KEY = 'portfolio_projects_version';
  private initialized = false;

  constructor() {
    this.loadProjects();
  }

  private async loadProjects(): Promise<void> {
    console.log('ProjectService: Attempting to load projects from primary storage.');
    this.initialized = false; // Reset initialized state for a fresh load sequence
    
    // Check cache version before loading
    const cacheVersion = localStorage.getItem(this.STORAGE_VERSION_KEY);
    if (cacheVersion !== CACHE_VERSION.toString()) {
      console.log(`ProjectService: Cache version mismatch. Stored: ${cacheVersion}, Current: ${CACHE_VERSION}. Clearing cache.`);
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(`${this.STORAGE_KEY}_backup`);
      localStorage.setItem(this.STORAGE_VERSION_KEY, CACHE_VERSION.toString());
    }
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        try {
          const parsedProjects = JSON.parse(stored);
          if (Array.isArray(parsedProjects)) {
            // Validate projects have necessary fields including customLink
            let projectsValid = true;
            let missingCustomLinks = false;
            
            for (const project of parsedProjects) {
              if (!project.id || !project.name || !project.description) {
                projectsValid = false;
                break;
              }
              
              // Check if customLink is missing
              if (!project.customLink) {
                missingCustomLinks = true;
                break;
              }
            }
            
            if (!projectsValid || missingCustomLinks) {
              console.log('ProjectService: Invalid project data or missing customLinks in localStorage. Clearing cache to reload from files.');
              localStorage.removeItem(this.STORAGE_KEY);
              localStorage.removeItem(`${this.STORAGE_KEY}_backup`);
              await this.loadFromJsonFiles();
              return;
            }
            
            this.projects = parsedProjects.map(p => { 
              let correctedThumbnail = p.thumbnail;
              let projectNameForPath = p.name; // Default to p.name

              // Attempt to get project name using getProjectName for consistency and if p.name might be unreliable
              if (p.id) {
                  const mappedName = getProjectName(p.id);
                  // Use mappedName if it's valid and not a generic placeholder
                  if (mappedName && !mappedName.startsWith('Project-')) { 
                      projectNameForPath = mappedName;
                  }
              }
              
              // Existing YouTube thumbnail issues correction
              if (typeof p.thumbnail === 'string') {
                // Fix truncated maxresdefault URLs
                if (p.thumbnail.includes('img.youtube.com/vi/') && 
                  p.thumbnail.endsWith('/maxresdefau')) {
                correctedThumbnail = p.thumbnail.replace('/maxresdefau', '/maxresdefault.jpg');
                console.log(`ProjectService: Corrected thumbnail URL for project ID ${p.id || 'N/A'}: from ${p.thumbnail} to ${correctedThumbnail}`);
              }
                
                // Fix .webp extensions (and default.web) for YouTube
                if (p.thumbnail.includes('img.youtube.com/vi/') && 
                    (p.thumbnail.includes('.webp') || p.thumbnail.includes('default.web'))) {
                  // Extract videoId from the URL
                  const videoIdMatch = p.thumbnail.match(/img\.youtube\.com\/vi\/([^/]+)/);
                  if (videoIdMatch && videoIdMatch[1]) {
                    correctedThumbnail = `https://img.youtube.com/vi/${videoIdMatch[1]}/mqdefault.jpg`; // Standardized to mqdefault.jpg
                    console.log(`ProjectService: Replaced YouTube webp/default.web thumbnail with jpg for project ID ${p.id || 'N/A'}: from ${p.thumbnail} to ${correctedThumbnail}`);
                  }
                }
              }

              // NEW LOGIC: Validate and correct local thumbnail paths from localStorage
              if (typeof correctedThumbnail === 'string' && 
                  !correctedThumbnail.startsWith('http') && // It's a local path
                  projectNameForPath) { // We have a project name to build the path
                
                // Check if it matches the expected pattern: /projects/ProjectName/thumbnail/thumbnail.(png|webp|jpg)
                // This regex is case-insensitive for the extension part.
                const standardPathRegex = new RegExp(`^/projects/${projectNameForPath}/thumbnail/thumbnail\.(png|webp|jpg)$`, 'i');
                
                if (!standardPathRegex.test(correctedThumbnail)) {
                  // If it's a local path but doesn't match the standard structure,
                  // (e.g., it might be an old /assets/images/ path or something else like the Burgertify case)
                  // force it to the standard /thumbnail/thumbnail.png path.
                  const newStandardPath = `/projects/${projectNameForPath}/thumbnail/thumbnail.png`;
                  console.warn(`ProjectService (localStorage load): Correcting potentially non-standard local thumbnail for project '${projectNameForPath}' (ID: ${p.id || 'N/A'}) from '${correctedThumbnail}' to '${newStandardPath}'. This indicates stale or inconsistent data in localStorage.`);
                  correctedThumbnail = newStandardPath;
                }
              }
              
              return {
                ...p,
                thumbnail: correctedThumbnail,
                mediaObjects: Array.isArray(p.mediaObjects) ? p.mediaObjects : [],
                worldSettings: p.worldSettings || undefined,
                // Ensure customLink is present, defaulting to a slugified name if strictly necessary
                // (though validation should catch most unlinked projects from old cache versions)
                customLink: p.customLink || (projectNameForPath ? projectNameForPath.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '') : `project-${p.id || 'unknown'}`)
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

  // Load projects from individual JSON files in the project directories
  private async loadFromJsonFiles(): Promise<void> {
    console.log('ProjectService: Loading projects from public/projects directories');
    try {
      // Create an array to store loaded projects
      const loadedProjects: Project[] = [];

      // Loop through all project folders in public/projects
      for (let i = 1; i <= 32; i++) {
        try {
          const projectName = getProjectName(i);
          // Add cache-busting parameter to prevent browser caching
          const cacheBuster = `?t=${Date.now()}`;
          const projectUrl = `/projects/${projectName}/project.json${cacheBuster}`;
          
          console.log(`ProjectService: Attempting to load ${projectUrl}`);
          
          // Fetch the project JSON with no-cache settings
          const response = await fetch(projectUrl, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error ${response.status} for project ${i}: ${projectName}`);
          }
          
          const project = await response.json();

          // --- Start of thumbnail processing ---
          let finalThumbnailPath: string;
          const projectThumbnailValue = project.thumbnail;

          if (projectThumbnailValue && typeof projectThumbnailValue === 'string' && projectThumbnailValue.trim() !== '') {
            if (projectThumbnailValue.startsWith('http') || projectThumbnailValue.startsWith('/projects/')) {
              // Absolute URL or already correctly pathed from root (e.g. from a previous version)
              // If it points to assets/images, we might want to redirect it to thumbnail/thumbnail.png
              if (projectThumbnailValue.includes('/assets/images/')) {
                finalThumbnailPath = `/projects/${projectName}/thumbnail/thumbnail.png`;
                 console.log(`ProjectService: Redirecting legacy thumbnail path for ${projectName} from ${projectThumbnailValue} to ${finalThumbnailPath}`);
              } else {
                finalThumbnailPath = projectThumbnailValue;
                console.log(`ProjectService: Using provided absolute/root-relative thumbnail for ${projectName}: ${finalThumbnailPath}`);
              }
            } else {
              // Relative path, assume it's a filename within the new 'thumbnail' folder
              finalThumbnailPath = `/projects/${projectName}/thumbnail/${projectThumbnailValue}`;
              console.log(`ProjectService: Using relative thumbnail for ${projectName} ('${projectThumbnailValue}'), resolved to: ${finalThumbnailPath}`);
            }
          } else {
            // Thumbnail is missing, empty, null, or not a string. Assign new default.
            finalThumbnailPath = `/projects/${projectName}/thumbnail/thumbnail.png`;
            console.log(`ProjectService: Thumbnail for ${projectName} is missing or invalid. Assigning default: ${finalThumbnailPath}`);
          }
          project.thumbnail = finalThumbnailPath; // Assign the processed thumbnail back
          // --- End of thumbnail processing ---
          
          if (project.videoUrl && !project.videoUrl.startsWith('/projects/') && !project.videoUrl.startsWith('http')) {
            project.videoUrl = `/projects/${projectName}/assets/videos/demo.mp4`; // Assuming demo.mp4 is a standard
          }
          
          // Process media objects to ensure correct URLs
          if (project.mediaObjects && Array.isArray(project.mediaObjects)) {
            project.mediaObjects = project.mediaObjects.map((obj: WorldObject) => {
              // Fix URL paths for obj.url if needed (likely points to assets/models, assets/images, etc.)
              if (obj.url && !obj.url.startsWith('/projects/') && !obj.url.startsWith('http')) {
                obj.url = `/projects/${projectName}/${obj.url}`; // General relative path correction
              }
              
              // Fix thumbnail paths for obj.thumbnail
              if (obj.thumbnail && typeof obj.thumbnail === 'string' && obj.thumbnail.trim() !== '') {
                if (obj.thumbnail.startsWith('http') || obj.thumbnail.startsWith('/projects/')) {
                  // Absolute or root-relative path, use as is or redirect legacy
                   if (obj.thumbnail.includes('/assets/images/')) {
                     obj.thumbnail = `/projects/${projectName}/thumbnail/thumbnail.png`; // Or a specific name if available
                   }
                  // else leave obj.thumbnail as is
                } else {
                  // Relative path, assume it's a filename within the 'thumbnail' folder for this project
                  obj.thumbnail = `/projects/${projectName}/thumbnail/${obj.thumbnail}`;
                }
              } else if (obj.type === 'image' || obj.type === 'video') { // Default for visual media if no thumbnail
                 obj.thumbnail = `/projects/${projectName}/thumbnail/thumbnail.png`; // Default placeholder
              }
              
              return obj;
            });
          }
          
          // Process asset gallery items for correct URLs
          if (project.assetGallery && Array.isArray(project.assetGallery)) {
            project.assetGallery = project.assetGallery.map((asset: {url?: string, name?: string, type?: string, category?: string}) => {
              if (asset.url && !asset.url.startsWith('/projects/') && !asset.url.startsWith('http')) {
                // This is a general asset URL, could be image, model, document.
                // It should be prefixed with the project path if relative.
                // Example: assets/images/gallery_image1.png -> /projects/MyProject/assets/images/gallery_image1.png
                asset.url = `/projects/${projectName}/${asset.url}`;
              }
              return asset;
            });
          }

          // Ensure all required fields are present
          const validProject: Project = {
            ...project,
            id: i, // Ensure correct ID
            name: project.name || getProjectName(i), // Ensure name exists
            description: project.description || "No description available.", // Ensure description exists
            link: project.link || "#", // Ensure link exists
            status: project.status || 'in-progress',
            type: project.type || 'standard',
            mediaObjects: Array.isArray(project.mediaObjects) ? project.mediaObjects : [],
            worldSettings: project.worldSettings || undefined
          };

          loadedProjects.push(validProject);
          console.log(`ProjectService: Loaded project ${projectName} (ID ${i}) from ${projectUrl}`);
        } catch (error) {
          console.warn(`ProjectService: Could not load project ${getProjectName(i)} (ID ${i}):`, error);
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

  // New method to force reload of project files directly from disk
  public async forceReloadProjectsFromDisk(): Promise<void> {
    console.log('ProjectService: Force reloading projects directly from disk');
    this.initialized = false;
    
    // Clear browser cache for project.json files
    if ('caches' in window) {
      try {
        const cacheNames = await window.caches.keys();
        for (const cacheName of cacheNames) {
          const cache = await window.caches.open(cacheName);
          const requests = await cache.keys();
          
          // Delete any project.json files from cache
          for (const request of requests) {
            if (request.url.includes('/projects/') && 
                (request.url.includes('project.json') || 
                 request.url.includes('/assets/') || // Broad match for assets
                 request.url.includes('/thumbnail/') || // Include new thumbnail folder
                 request.url.includes('.jpg') ||
                 request.url.includes('.png') || // Include PNG
                 request.url.includes('.webp') ||
                 request.url.includes('.mp4') ||
                 request.url.includes('.pdf'))) {
              console.log(`ProjectService: Removing from cache: ${request.url}`);
              await cache.delete(request);
            }
          }
        }
        console.log('ProjectService: Cleared project files from cache');
      } catch (cacheError) {
        console.error('ProjectService: Error clearing cache:', cacheError);
      }
    }
    
    // Clear localStorage cache of projects to force reload
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('ProjectService: Cleared projects from localStorage to force reload');
    
    // Force reload all project.json files from disk with cache busting
    console.log('ProjectService: Loading fresh project data from disk');
    await this.loadFromJsonFiles();
    
    // Update all project worlds
    try {
      // Dynamically import to avoid circular dependencies
      const { getWorldServiceInstance } = await import('../data/worlds');
      const worldService = getWorldServiceInstance();
      
      // Clear world storage to force full rebuild
      localStorage.removeItem('portfolio_worlds');
      console.log('ProjectService: Cleared world storage to force rebuild');
      
      // Force reload the main world with updated projects
      const { createMainWorld } = await import('../data/worlds');
      const updatedMainWorld = createMainWorld(this.projects);
      worldService.updateWorld(updatedMainWorld);
      
      // Update each project world
      const { createProjectWorld } = await import('../data/worlds');
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      for (const project of this.projects) {
        console.log(`ProjectService: Rebuilding world for project ${project.id}: ${project.name}`);
        const projectWorld = createProjectWorld(project, isTouchDevice);
        worldService.updateWorld(projectWorld);
      }
      
      // No need to save worlds as we're using memory-only approach now
      console.log('ProjectService: Updated all worlds with fresh project data from disk');
    } catch (worldError) {
      console.error('ProjectService: Error updating worlds after disk reload:', worldError);
    }
    
    // Set initialized to true
    this.initialized = true;
    console.log('ProjectService: Disk reload complete');
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
      console.log(`ProjectService: Found project with ID ${id}:`, project.name);
    } else {
      console.warn(`ProjectService: Project with ID ${id} not found`);
    }
    
    return project;
  }

  // Add a new method to get a project by its customLink
  async getProjectByCustomLink(customLink: string): Promise<Project | undefined> {
    console.log(`ProjectService: Looking for project with customLink: ${customLink}`);
    
    const projects = await this.getProjects();
    
    // Try direct match first
    let project = projects.find(p => p.customLink === customLink);
    
    // If not found, try case-insensitive match
    if (!project) {
      project = projects.find(p => 
        p.customLink && p.customLink.toLowerCase() === customLink.toLowerCase()
      );
    }
    
    // If still not found, try to match by slugified name
    if (!project) {
      const slugify = (text: string) => {
        return text
          .toString()
          .toLowerCase()
          .replace(/\s+/g, '-')       // Replace spaces with -
          .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
          .replace(/\-\-+/g, '-')     // Replace multiple - with single -
          .replace(/^-+/, '')         // Trim - from start of text
          .replace(/-+$/, '');        // Trim - from end of text
      };
      
      project = projects.find(p => slugify(p.name) === customLink);
    }
    
    if (project) {
      console.log(`ProjectService: Found project with customLink ${customLink}:`, project.name);
      
      // If the project doesn't have a customLink, add it now and save
      if (!project.customLink) {
        const slugify = (text: string) => {
          return text
            .toString()
            .toLowerCase()
            .replace(/\s+/g, '-')     // Replace spaces with -
            .replace(/[^\w\-]+/g, '') // Remove all non-word chars
            .replace(/\-\-+/g, '-')   // Replace multiple - with single -
            .replace(/^-+/, '')       // Trim - from start of text
            .replace(/-+$/, '');      // Trim - from end of text
        };
        
        project.customLink = slugify(project.name);
        console.log(`ProjectService: Added missing customLink ${project.customLink} to project ${project.id}`);
        
        // Save the updated project
        this.saveProject(project);
      }
    } else {
      console.warn(`ProjectService: Project with customLink ${customLink} not found`);
    }
    
    return project;
  }

  async saveProject(project: Project): Promise<Project> {
    console.log(`ProjectService: Saving project ${project.id}`, project.name);
    
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
        id: id || Date.now(), // Temporary ID if new, will be replaced by getNextId or existing
        name: formData.get('name') as string || '',
        description: formData.get('description') as string || '',
        link: formData.get('link') as string || '',
        thumbnail: formData.get('thumbnail') as string || '', // Will be processed by saveProject or loadFromJsonFiles
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
      
      if (id !== null && id !== undefined) { // Check if ID exists and is valid
        // Update existing project
        try {
          result = await this.updateProject(id, project);
          console.log(`ProjectService: Updated existing project ID ${id} successfully`);
        } catch (updateError) {
          console.error(`ProjectService: Error updating project ${id}:`, updateError);
          
          // CRITICAL FIX: Fallback to direct save if update fails
          console.log(`ProjectService: Attempting direct save as fallback for update`);
          const existingIndex = this.projects.findIndex(p => p.id === id);
          
          if (existingIndex !== -1) {
            this.projects[existingIndex] = { ...this.projects[existingIndex], ...project, id: id }; // Ensure ID is correct
          } else {
            // This case should ideally not happen if updateProject was called with a valid ID
            project.id = id; // Ensure ID is set
            this.projects.push(project);
          }
          
          this.saveToStorage();
          result = this.projects.find(p => p.id ===id) || project; // Get the updated project from array
        }
      } else {
        // Create new project
        project.id = this.getNextId(); // Assign a new ID
        try {
          result = await this.saveProject(project); // saveProject handles adding to this.projects and localStorage
          console.log(`ProjectService: Created new project with ID ${result.id} successfully`);
        } catch (saveError) {
          console.error('ProjectService: Error saving new project:', saveError);
          
          // CRITICAL FIX: Fallback to direct save
          console.log('ProjectService: Attempting direct save as fallback for new project');
          // project already has a new ID from getNextId()
          if (!this.projects.find(p=> p.id === project.id)) { // Avoid duplicates if saveProject partially succeeded
             this.projects.push(project);
          }
          this.saveToStorage();
          result = project;
        }
      }
      
      // CRITICAL FIX: Verify project was actually saved in memory and storage
      const finalSavedProject = this.projects.find(p => p.id === result.id);
      if (!finalSavedProject) {
        console.error(`ProjectService: Project ${result.id} not found in memory after save/update - forcing re-add`);
        if(this.projects.findIndex(p => p.id === result.id) === -1) this.projects.push(result); // Add if not present
        this.saveToStorage(); // Re-save
      }
      
      // Double-check localStorage save
      try {
        const storedProjectsRaw = localStorage.getItem(this.STORAGE_KEY);
        if (storedProjectsRaw) {
          const parsedStoredProjects = JSON.parse(storedProjectsRaw);
          if (Array.isArray(parsedStoredProjects)) {
            const storedProjectInstance = parsedStoredProjects.find(p => p.id === result.id);
            if (!storedProjectInstance) {
              console.error(`ProjectService: Project ${result.id} not found in localStorage - trying individual save`);
              // This individual save is a last resort, main save should work.
              // localStorage.setItem(`individual_project_${result.id}`, JSON.stringify(result)); 
            }
          }
        } else {
            console.error(`ProjectService: Main storage key ${this.STORAGE_KEY} not found after save attempt.`);
        }
      } catch (verifyError) {
        console.error('ProjectService: Error verifying project in localStorage:', verifyError);
      }
      
      return result;
    } catch (error) {
      console.error('ProjectService: Error handling form submission:', error);
      throw error; // Re-throw to be caught by caller
    }
  }

  // Initialize the service
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('ProjectService: Already initialized.');
      return;
    }
    console.log('ProjectService: Explicitly initializing...');
    await this.loadProjects(); // Call the refactored loadProjects and wait for it
    // No need for setInterval check, as loadProjects is awaited.
    // this.initialized is set to true at the end of loadProjects.
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
      console.log('ProjectService: No valid backup data found or backup is empty.');
      return false;
    } catch (error) {
      console.error('ProjectService: Error during backup recovery attempt:', error);
      return false;
    }
  }
  
  public async forceReloadProjects(): Promise<void> {
    console.log('ProjectService: Force reloading projects');
    this.initialized = false; // Mark as not initialized
    await this.loadProjects(); // loadProjects will set initialized to true at the end
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