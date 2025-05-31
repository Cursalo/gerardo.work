export interface ProjectData {
  id: number;
  name: string;
  description: string;
  link: string;
  thumbnail: string;
  status: string;
  type: string;
  videoUrl?: string;
  customLink?: string;
  worldSettings?: {
    backgroundColor: string;
    floorColor: string;
    skyColor: string;
    floorTexture?: string;
    skyTexture?: string;
    ambientLightColor: string;
    ambientLightIntensity: number;
    directionalLightColor: string;
    directionalLightIntensity: number;
  };
  mediaObjects?: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    url?: string;
    thumbnail?: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  }>;
  assetGallery?: Array<{
    name: string;
    type: string;
    category: string;
    url: string;
  }>;
}

class ProjectDataService {
  private projectsList: ProjectData[] = [];
  private projectsCache: Map<string, ProjectData> = new Map();
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    // Prevent multiple concurrent initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.initialized) {
      return;
    }

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      // Clear any existing data first
      this.projectsCache.clear();
      this.projectsList = [];
      
      console.log('ProjectDataService: Starting initialization...');

      // Get list of project directories
      const projectNames = await this.getProjectDirectories();
      console.log(`ProjectDataService: Found ${projectNames.length} project directories`);

      // Track unique projects to prevent duplicates
      const usedIds = new Set<number>();
      const usedNames = new Set<string>();
      
      // Load each project's data
      for (const projectName of projectNames) {
        try {
          const projectData = await this.loadProjectData(projectName);
          if (projectData) {
            // Check for duplicate IDs
            if (usedIds.has(projectData.id)) {
              console.warn(`ProjectDataService: Skipping duplicate project ID ${projectData.id} for ${projectData.name}`);
              continue;
            }
            
            // Check for duplicate names
            if (usedNames.has(projectData.name)) {
              console.warn(`ProjectDataService: Skipping duplicate project name ${projectData.name}`);
              continue;
            }
            
            // Add to tracking sets
            usedIds.add(projectData.id);
            usedNames.add(projectData.name);
            
            // Add to our collections
            this.projectsList.push(projectData);
            this.projectsCache.set(projectName, projectData);
            
            // Also cache by name and customLink for faster lookup
            this.projectsCache.set(projectData.name, projectData);
            if (projectData.customLink) {
              this.projectsCache.set(projectData.customLink, projectData);
            }
          }
        } catch (error) {
          console.error(`ProjectDataService: Error loading project ${projectName}:`, error);
        }
      }

      // Final deduplication by ID
      const finalProjects = [];
      const finalIds = new Set<number>();
      
      for (const project of this.projectsList) {
        if (!finalIds.has(project.id)) {
          finalProjects.push(project);
          finalIds.add(project.id);
        } else {
          console.warn(`ProjectDataService: Removed duplicate project with ID ${project.id} during final cleanup`);
        }
      }
      
      this.projectsList = finalProjects;
      
      console.log(`ProjectDataService: Loaded ${this.projectsList.length} unique projects`);
      
      // Debug: Log all loaded projects with their names and customLinks
      console.log('ProjectDataService: Final project list:', this.projectsList.map(p => ({
        id: p.id,
        name: p.name,
        customLink: p.customLink
      })));
      
      this.initialized = true;
    } catch (error) {
      console.error('ProjectDataService: Initialization failed:', error);
      throw error;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async getProjectDirectories(): Promise<string[]> {
    // Attempt to get project directory names by making requests
    const projectNames: string[] = [];
    
    // Define the project names we expect to find
    const expectedProjects = [
      'AIClases.com', 'Amazonia Apoteket', 'Avatarmatic', 'Beta', 'Blue Voyage Travel',
      'BonsaiPrep', 'Burgavision', 'Burgertify', 'Cursalo', 'Develop Argentina',
      'Eat Easier', 'Eaxily', 'Eaxy.AI', 'Foodelopers', 'Foodiez Apparel',
      'Foodketing', 'Hybridge', 'Jaguar', 'Jerry\'s', 'LinkDialer', 'LinkMas',
      'Matrix Agencia', 'Menu Crafters', 'Monchee', 'PitchDeckGenie',
      'PlatePlatform', 'PostRaptor', 'Power Up Pizza', 'RAM', 'Talevista',
      'TaskArranger.com', 'Tokitaka', 'Wobistro'
    ];
    
    console.log(`ProjectDataService: Scanning for projects in expected list...`);
    
    for (const projectName of expectedProjects) {
      try {
        const response = await fetch(`/projects/${projectName}/project.json`);
        if (response.ok) {
          projectNames.push(projectName);
          console.log(`ProjectDataService: Found project directory: ${projectName}`);
        }
      } catch (error) {
        // Silently skip projects that don't exist
      }
    }
    
    console.log(`ProjectDataService: Found ${projectNames.length} project directories:`, projectNames);
    return projectNames;
  }

  private async loadProjectData(projectName: string): Promise<ProjectData | null> {
    try {
      const response = await fetch(`/projects/${projectName}/project.json`);
      if (!response.ok) {
        console.warn(`ProjectDataService: Failed to load project.json for ${projectName}:`, response.status);
        return null;
      }
      
      const data = await response.json();
      console.log(`ProjectDataService: Loaded data for ${projectName}:`, { 
        id: data.id, 
        name: data.name, 
        customLink: data.customLink 
      });
      
      // Store in cache by project name for quick lookup
      this.projectsCache.set(projectName, data);
      
      return data;
    } catch (error) {
      console.warn(`ProjectDataService: Error loading project data for ${projectName}:`, error);
      return null;
    }
  }

  async getAllProjects(): Promise<ProjectData[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return [...this.projectsList];
  }

  async getProjectByName(name: string): Promise<ProjectData | null> {
    await this.initialize();
    
    console.log(`ProjectDataService: Searching for project with name/customLink: "${name}"`);
    
    // Try cache first (includes name, customLink, and directory name)
    const cached = this.projectsCache.get(name);
    if (cached) {
      console.log(`ProjectDataService: Found project in cache:`, cached.name);
      return cached;
    }
    
    // Try case-insensitive search in projectsList
    const found = this.projectsList.find(project => {
      return (
        (project.name && project.name.toLowerCase() === name.toLowerCase()) ||
        (project.customLink && project.customLink.toLowerCase() === name.toLowerCase())
      );
    });
    
    if (found) {
      console.log(`ProjectDataService: Found project by case-insensitive search:`, found.name);
      return found;
    }
    
    console.log(`ProjectDataService: No project found for "${name}"`);
    console.log(`ProjectDataService: Available projects:`, this.projectsList.map(p => ({ 
      name: p.name, 
      customLink: p.customLink, 
      id: p.id 
    })));
    
    return null;
  }

  async getProjectById(id: number): Promise<ProjectData | null> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.projectsList.find(p => p.id === id) || null;
  }

  async getProjectByCustomLink(customLink: string): Promise<ProjectData | null> {
    await this.initialize();
    return this.projectsList.find(project => 
      project.customLink && project.customLink.toLowerCase() === customLink.toLowerCase()
    ) || null;
  }

  // Method to refresh a specific project's data
  async refreshProject(projectName: string): Promise<void> {
    const projectData = await this.loadProjectData(projectName);
    if (projectData) {
      this.projectsCache.set(projectName, projectData);
      
      // Update in the list
      const index = this.projectsList.findIndex(p => p.name === projectName);
      if (index >= 0) {
        this.projectsList[index] = projectData;
      } else {
        this.projectsList.push(projectData);
      }
    }
  }

  // Clear cache and force reload
  async forceReload(): Promise<void> {
    this.projectsCache.clear();
    this.projectsList = [];
    this.initialized = false;
    await this.initialize();
  }

  // CRITICAL FIX: Synchronize ProjectService with ProjectDataService
  // This ensures that ProjectService has all the projects that ProjectDataService loaded
  async synchronizeWithProjectService(): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      console.log(`ProjectDataService: Synchronizing ${this.projectsList.length} projects with ProjectService...`);

      // Convert ProjectData to Project format for ProjectService
      const projectsForService = this.projectsList.map((projectData: ProjectData) => ({
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
        })) || [],
        worldSettings: projectData.worldSettings,
        // Preserve assetGallery for project world creation
        ...(projectData.assetGallery && { assetGallery: projectData.assetGallery })
      }));

      // Save directly to localStorage to synchronize with ProjectService
      const STORAGE_KEY = 'portfolio_projects';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projectsForService));
      localStorage.setItem(`${STORAGE_KEY}_backup`, JSON.stringify(projectsForService));

      console.log(`ProjectDataService: Successfully synchronized ${projectsForService.length} projects to localStorage`);
      console.log('ProjectDataService: Synchronized project IDs:', projectsForService.map(p => p.id).sort((a, b) => a - b));

      // Force ProjectService to reload from the updated localStorage
      try {
        const { projectService } = await import('./projectService');
        await projectService.forceReloadProjects();
        console.log('ProjectDataService: ProjectService reloaded successfully');
      } catch (error) {
        console.error('ProjectDataService: Error reloading ProjectService:', error);
      }

    } catch (error) {
      console.error('ProjectDataService: Error synchronizing with ProjectService:', error);
      throw error;
    }
  }
}

export const projectDataService = new ProjectDataService(); 