import { Project } from '../services/projectService';

export interface WorldObject {
  id: string;
  type: 'video' | 'image' | 'pdf' | 'project' | 'link' | 'button';
  title: string;
  description?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  url?: string;
  thumbnail?: string;
  projectId?: number;
  action?: 'navigate' | 'link';
  destination?: string;
  subWorldId?: string;
  interactionType?: string;
  status?: string;
  projectType?: 'standard' | 'video';
  link?: string;
  videoUrl?: string;
  customLink?: string;
}

export interface World {
  id: string;
  name: string;
  description?: string;
  backgroundColor?: string;
  cameraPosition?: { x: number; y: number; z: number };
  cameraTarget?: { x: number; y: number; z: number };
  floorColor?: string;
  floorTexture?: string;  
  skyColor?: string;
  skyTexture?: string;
  ambientLightColor?: string;
  ambientLightIntensity?: number;
  directionalLightColor?: string;
  directionalLightIntensity?: number;
  objects: WorldObject[];
}

// Function to generate positions for objects in the main world
const generatePositions = (count: number): [number, number, number][] => {
  const positions: [number, number, number][] = [];
  
  // Different types of formations
  // Formation 1: A large circular arrangement
  const circleCount = Math.floor(count * 0.6); // 60% in a circle
  const circleRadius = 25; // Radius for circular arrangement
  for (let i = 0; i < circleCount; i++) {
    const angle = (i / circleCount) * Math.PI * 2;
    const x = Math.cos(angle) * circleRadius;
    const z = Math.sin(angle) * circleRadius;
    // Raised height for proper shadow casting
    const y = 2.0 + Math.random() * 0.5; 
    positions.push([x, y, z]);
  }
  
  // Formation 2: A spiral going upward (but much lower)
  const spiralCount = Math.floor(count * 0.25); // 25% in a spiral
  const spiralRadius = 15; 
  const spiralHeight = 5; // Reduced height significantly
  for (let i = 0; i < spiralCount; i++) {
    const progress = i / spiralCount;
    const angle = progress * Math.PI * 6; // 3 full turns
    const radiusAtPoint = spiralRadius * (1 - progress * 0.5); // Spiral gets tighter
    const x = Math.cos(angle) * radiusAtPoint;
    const z = Math.sin(angle) * radiusAtPoint;
    // Higher minimum height for spiral projects
    const y = 2.5 + progress * spiralHeight;
    positions.push([x, y, z]);
  }
  
  // Formation 3: Random clusters (at lower heights)
  const remainingCount = count - positions.length;
  for (let i = 0; i < remainingCount; i++) {
    // Create small clusters in random locations (closer to center)
    const clusterCenterX = (Math.random() - 0.5) * 50;
    const clusterCenterZ = (Math.random() - 0.5) * 50;
    // Higher cluster heights
    const clusterCenterY = 2.2 + Math.random() * 1.5;
    
    // Position within cluster (tighter clusters)
    const offsetX = (Math.random() - 0.5) * 8;
    const offsetZ = (Math.random() - 0.5) * 8;
    // Lower vertical variation
    const offsetY = (Math.random() - 0.5) * 1;
    
    positions.push([
      clusterCenterX + offsetX, 
      clusterCenterY + offsetY, 
      clusterCenterZ + offsetZ
    ]);
  }
  
  // Add a few projects at a medium distance from the starting position
  // Avoiding the area directly in front of the camera
  const nearbyCount = 5;
  for (let i = 0; i < nearbyCount; i++) {
    const angle = (i / nearbyCount) * Math.PI * 2;
    const radius = 20 + Math.random() * 10; // Medium radius between 20-30 units
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    // Keep higher for proper shadow
    const y = 2.5 + Math.random() * 0.5;
    
    // Replace some of the existing positions with these medium distance ones
    if (positions.length > i) {
      positions[i] = [x, y, z];
    } else {
      positions.push([x, y, z]);
    }
  }
  
  return positions;
};

// Create the main world with projects as entry points to subworlds
export const createMainWorld = (projects: Project[]): World => {
  console.log('WorldProvider: createMainWorld received projects:', JSON.stringify(projects.map(p => ({id: p.id, name: p.name, thumbnail: p.thumbnail?.substring(0,50)}))));
  
  // CRITICAL FIX: Ensure consistent project ordering by sorting them by ID
  let projectsToUse: Project[] = [];
  
  if (projects && projects.length > 0) {
    // Sort the projects by ID for consistent ordering
    projectsToUse = [...projects].sort((a, b) => a.id - b.id);
    console.log('WorldProvider: Using sorted projects list');
  } else {
    // Use a consistent set of fallback projects if none provided
    console.warn('WorldProvider: No projects provided, using fallback projects');
    projectsToUse = [
      {
        id: 1,
        name: 'Demo Project 1',
        description: 'This is a sample project for the portfolio',
        thumbnail: 'https://picsum.photos/seed/project1/400/300',
        status: 'completed',
        link: '#',
        type: 'standard' as 'standard', // Explicitly type fallback
        videoUrl: undefined,
        customLink: undefined,
        worldSettings: undefined
      },
      {
        id: 2,
        name: 'Demo Project 2',
        description: 'Another sample project for the portfolio',
        thumbnail: 'https://picsum.photos/seed/project2/400/300',
        status: 'completed',
        link: '#',
        type: 'standard' as 'standard', // Explicitly type fallback
        videoUrl: undefined,
        customLink: undefined,
        worldSettings: undefined
      }
    ];
  }
  
  // CRITICAL FIX: Generate positions deterministically based on project IDs
  const positions = generateDeterministicPositions(projectsToUse);
  
  const projectObjects: WorldObject[] = projectsToUse.map((project, index) => {
    // CRITICAL FIX: Use project ID to get a consistent position regardless of the order
    // projects are passed in from different devices
    const projectPosition = positions.find(p => p.projectId === project.id);
    const position = projectPosition ? projectPosition.position : [0, 2, 0] as [number, number, number];
    
    return {
      id: `project-${project.id}`,
      type: 'project' as const,
      title: project.name,
      description: project.description,
      thumbnail: project.thumbnail,
      position: position as [number, number, number], // Explicitly cast to correct tuple type
      projectId: project.id,
      subWorldId: `project-world-${project.id}`,
      status: project.status,
      projectType: project.type as ('standard' | 'video'), // Explicit cast to satisfy linter
      link: project.link,
      videoUrl: project.videoUrl,
      customLink: project.customLink
    };
  });
  
  console.log('WorldProvider: createMainWorld created projectObjects:', JSON.stringify(projectObjects.map(p => ({id: p.id, title: p.title, thumbnail: p.thumbnail?.substring(0,50)}))));

  const mainWorld: World = {
    id: 'mainWorld',
    name: 'Portfolio Main World',
    description: 'Explore my portfolio projects in 3D space',
    backgroundColor: '#ffffff',
    floorColor: '#ffffff',
    skyColor: '#ffffff',
    ambientLightColor: '#ffffff',
    ambientLightIntensity: 0.8,
    directionalLightColor: '#ffffff',
    directionalLightIntensity: 1.2,
    cameraPosition: { x: 0, y: 5, z: 30 },
    objects: projectObjects
  };
  
  return mainWorld;
};

// NEW FUNCTION: Generate deterministic positions based on project IDs
// This ensures that each project always gets the same position regardless of order
interface PositionWithId {
  projectId: number;
  position: [number, number, number];
}

function generateDeterministicPositions(projects: Project[]): PositionWithId[] {
  const result: PositionWithId[] = [];
  
  // Use different formations but assign them deterministically
  // IMPROVED: Much better spacing between cards for better navigation
  const circleRadiusBase = 45; // Significantly increased from 30 for better spacing
  const spiralRadiusBase = 30; // Increased from 20 for better spacing
  const gridSpacing = 12;     // Increased from 8 for much better spacing
  const numGridColumns = 4;   // Reduced from 5 to spread cards out more

  // Assign each project to a formation and position based on ID
  projects.forEach(project => {
    const projectId = project.id;
    let position: [number, number, number];
    
    // Deterministic position assignment
    // We'll use a larger multiplier for projectId to spread out angles/indices more
    const projectIndexFactor = projectId * 2; // Use a factor to further differentiate

    if (projectId % 3 === 0) {
      // Circle formation
      const angle = (projectIndexFactor * 0.5) % (Math.PI * 2); // Spread out angles more
      const radiusVariation = (projectId % 5) * 4; // Increased variation (0, 4, 8, 12, 16)
      const currentRadius = circleRadiusBase + radiusVariation;
      const x = Math.cos(angle) * currentRadius;
      const z = Math.sin(angle) * currentRadius;
      const y = 2.0 + (projectIndexFactor * 0.15) % 1.5; // More Y variation, slightly higher base
      position = [x, y, z];
    } else if (projectId % 3 === 1) {
      // Spiral formation
      const progress = (projectIndexFactor * 0.07) % 1; 
      const angle = progress * Math.PI * 8; // More turns or faster angle change
      const radiusAtPoint = spiralRadiusBase * (1 - progress * 0.3) + (projectId % 4); // Spiral gets tighter, add variation
      const x = Math.cos(angle) * radiusAtPoint;
      const z = Math.sin(angle) * radiusAtPoint;
      const y = 2.5 + progress * 7 + (projectIndexFactor * 0.1) % 1.0; // Higher spiral, more Y variation
      position = [x, y, z];
    } else { // projectId % 3 === 2
      // Grid formation
      const gridIndex = Math.floor(projectIndexFactor / 3); // Get a somewhat unique index for grid
      const col = gridIndex % numGridColumns;
      const row = Math.floor(gridIndex / numGridColumns);
      
      const x = (col - Math.floor(numGridColumns / 2)) * gridSpacing + (projectId % 2 === 0 ? gridSpacing / 3 : -gridSpacing / 3); // Offset for staggering
      const z = -10 - (row * gridSpacing) + (projectId % 2 === 0 ? gridSpacing / 3 : -gridSpacing / 3); // Start grid further back, add staggering
      const y = 2.2 + (projectIndexFactor * 0.2) % 2.0; // Y variation for grid
      position = [x, y, z];
    }
    
    result.push({ projectId, position });
  });
  
  return result;
}

// Helper function to determine if an object is interactive based on its properties
// This function is an example, expand as needed for your specific object types and properties
const isObjectInteractive = (object: WorldObject): boolean => {
  return object.type === 'project' || 
         object.type === 'link' || 
         (object.type === 'button' && object.action === 'navigate') ||
         object.interactionType === 'clickable'; // Example, assuming some objects have this
};

export const createProjectWorld = (project: Project, isTouchDevice: boolean): World => {
  console.log(`Creating project world for project: ${project.name} (ID: ${project.id}), isTouchDevice:`, isTouchDevice);
  console.log('Project data summary:', {
    name: project.name,
    id: project.id,
    hasMediaObjects: !!(project.mediaObjects && project.mediaObjects.length > 0),
    mediaObjectsCount: project.mediaObjects?.length || 0,
    hasAssetGallery: !!((project as any).assetGallery && (project as any).assetGallery.length > 0),
    assetGalleryCount: (project as any).assetGallery?.length || 0,
    hasWorldSettings: !!(project.worldSettings)
  });

  const worldObjects: WorldObject[] = [];

  // Use persisted media objects if available
  if (project.mediaObjects && project.mediaObjects.length > 0) {
    console.log(`Adding ${project.mediaObjects.length} mediaObjects from project data for ${project.name}`);
    project.mediaObjects.forEach(obj => {
      console.log(`- Adding mediaObject: ${obj.id} (${obj.type}) - ${obj.title}`);
      worldObjects.push(obj);
    });
  }

  // Add assetGallery items if available (similar to ProjectSubworld component)
  if ((project as any).assetGallery && (project as any).assetGallery.length > 0) {
    const assetGallery = (project as any).assetGallery;
    console.log(`Adding ${assetGallery.length} assetGallery items to project world for ${project.name}`);
    
    const galleryObjects = assetGallery.map((asset: any, index: number) => {
      const totalAssets = assetGallery.length;
      const seededRandom = (seed: number, min: number, max: number): number => {
        const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
        return min + (max - min) * (x - Math.floor(x));
      };
      const clusterCount = Math.max(4, Math.ceil(totalAssets / 6));
      const currentCluster = index % clusterCount;
      const clusterAngle = (currentCluster / clusterCount) * Math.PI * 2;
      const clusterRadius = 40 + (clusterCount * 8);
      const clusterX = Math.cos(clusterAngle) * clusterRadius;
      const clusterZ = Math.sin(clusterAngle) * clusterRadius;
      const inClusterIndex = Math.floor(index / clusterCount);
      const randomX = seededRandom(index * 7 + 123, -20, 20);
      const randomZ = seededRandom(index * 11 + 456, -20, 20);
      const randomY = seededRandom(index * 13 + 789, 2, 8);
      const spiralRadius = 8 + (inClusterIndex * 3);
      const spiralAngle = inClusterIndex * 2.3;
      const spiralX = Math.cos(spiralAngle) * spiralRadius;
      const spiralZ = Math.sin(spiralAngle) * spiralRadius;
      const position: [number, number, number] = [
        clusterX + spiralX + randomX * 0.5,
        randomY,
        clusterZ + spiralZ + randomZ * 0.5
      ];
      const randomRotationY = seededRandom(index * 17 + 234, -0.3, 0.3);
      const scaleVariation = seededRandom(index * 23 + 890, 0.8, 1.3);
      const getAssetTitle = (url: string): string => {
        if (!url) return 'Untitled Asset';
        try {
          const urlParts = url.split('/');
          const filename = urlParts[urlParts.length - 1];
          const nameWithoutExtension = filename.replace(/\.[^/.]+$/, '');
          return nameWithoutExtension
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
        } catch (error) {
          return asset.name || 'Untitled Asset';
        }
      };
      return {
        id: `asset-${index}`,
        type: asset.type,
        title: getAssetTitle(asset.url),
        description: getAssetTitle(asset.url),
        url: asset.url,
        thumbnail: asset.thumbnail || asset.url,
        position,
        rotation: [0, randomRotationY, 0] as [number, number, number],
        scale: [5.0 * scaleVariation, 3.5 * scaleVariation, 0.1] as [number, number, number]
      };
    });
    worldObjects.push(...galleryObjects);
  }

  // If no media objects at all, generate mock data
  if (worldObjects.length === 0) {
    console.warn(`Project ${project.id} ("${project.name}") has no mediaObjects or assetGallery, generating deterministic mock data.`);
    const seed = project.id || 1; // Ensure seed is always a number
    const mediaCount = 3;
    const positions: [number, number, number][] = [];
    const radius = 8;
    for (let i = 0; i < mediaCount; i++) {
      const angle = ((i * 2 * Math.PI) / mediaCount) + (seed * 0.1);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      positions.push([x, 2, z]);
    }
    const mockImageIndex = seed % 5;
    const mockPdfIndex = seed % 2;
    const mockVideoIndex = seed % 3;

    // Ensure these arrays are defined here or imported if they were elsewhere
    const mockImages = [
      'https://picsum.photos/seed/img1/800/600', 'https://picsum.photos/seed/img2/800/600',
      'https://picsum.photos/seed/img3/800/600', 'https://picsum.photos/seed/img4/800/600',
      'https://picsum.photos/seed/img5/800/600'
    ];
    const mockPDFs = [
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      'https://www.africau.edu/images/default/sample.pdf'
    ];
    const mockVideos = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
      'https://www.youtube.com/watch?v=ZSt9tm3RoUU'
    ];

    const generatedMockObjects: WorldObject[] = [
      {
        id: `image-${project.id}-0`, type: 'image', title: `${project.name} - Image`,
        url: mockImages[mockImageIndex], position: positions[0], description: "Sample image for project visualization"
      },
      {
        id: `pdf-${project.id}-0`, type: 'pdf', title: `${project.name} - Documentation`,
        url: mockPDFs[mockPdfIndex], position: positions[1], description: "Sample documentation PDF"
      },
      {
        id: `video-${project.id}-0`, type: 'video', title: `${project.name} - Demo Video`,
        url: mockVideos[mockVideoIndex], position: positions[2], description: "Sample video demonstration"
      }
    ];
    worldObjects.push(...generatedMockObjects);

    // CRITICAL FIX (User Request): Comment out the asynchronous mock data saving to prevent cascading updates.
    // This implements Option A: Do NOT save generated mock data back to ProjectService / localStorage.
    /*
    // Attempt to persist the generated mock media objects to the project asynchronously
    // Ensure project and project.id are valid, and there's mock data
    if (project && typeof project.id === 'number' && generatedMockObjects.length > 0) {
      const currentProjectMediaStr = project.mediaObjects ? JSON.stringify(project.mediaObjects) : '[]';
      const newMockMediaStr = JSON.stringify(generatedMockObjects);

      // Only attempt to save if the new mock data is different from existing or if no mediaObjects exist
      if (currentProjectMediaStr !== newMockMediaStr) {
        console.log(`Project ${project.id} ("${project.name}"): Attempting to asynchronously save/update with generated mock mediaObjects.`);
        
        const projectToSaveWithMocks = {
          ...project, 
          mediaObjects: [...generatedMockObjects] 
        };

        import('../services/projectService')
          .then(({ projectService }) => {
            if (projectService && typeof projectService.saveProject === 'function') {
              projectService.saveProject(projectToSaveWithMocks)
                .then(() => {
                  console.log(`Project ${project.id} ("${project.name}"): Successfully saved/updated with generated mock mediaObjects.`);
                })
                .catch(err => {
                  console.error(`Project ${project.id} ("${project.name}"): Error saving project with mock mediaObjects:`, err);
                });
            } else {
              console.error(`Project ${project.id} ("${project.name}"): projectService or saveProject method not available for mock data persistence.`);
            }
          })
          .catch(err => {
            console.error(`Project ${project.id} ("${project.name}"): Failed to import projectService for mock data persistence:`, err);
          });
      } else {
        console.log(`Project ${project.id} ("${project.name}"): Mock data already matches existing mediaObjects or no new mock data to save; skipping save operation.`);
      }
    } else {
        console.warn(`Project ${project.id} ("${project.name}"): Conditions not met for saving mock media objects (project invalid, ID not a number, or no mock objects generated).`);
    }
    */
  }

  if (!isTouchDevice) {
    worldObjects.push({
      id: `back-to-main-${project.id}`,
      type: 'button',
      title: 'Back to Main World (Invisible Desktop Button)', 
      description: 'Return to the main portfolio overview',
      action: 'navigate',
      destination: 'mainWorld',
      position: [0, -100, 0], 
      scale: [0.001, 0.001, 0.001] 
    });
  }

  const projectWorld: World = {
    id: `project-world-${project.id}`,
    name: project.name || 'Project World',
    description: project.description || 'Details for this project',
    backgroundColor: project.worldSettings?.backgroundColor || '#111111',
    floorColor: project.worldSettings?.floorColor || '#222222',
    skyColor: project.worldSettings?.skyColor || '#000000',
    ambientLightColor: project.worldSettings?.ambientLightColor || '#aaaaaa',
    ambientLightIntensity: project.worldSettings?.ambientLightIntensity || 0.7,
    directionalLightColor: project.worldSettings?.directionalLightColor || '#ffffff',
    directionalLightIntensity: project.worldSettings?.directionalLightIntensity || 1.0,
    cameraPosition: { x: 0, y: 3, z: 15 }, 
    objects: worldObjects,
  };

  console.log(`Created project world ${projectWorld.id} for ${project.name} with ${projectWorld.objects.length} objects`);
  console.log('Project world objects summary:', projectWorld.objects.map(obj => ({
    id: obj.id,
    type: obj.type,
    title: obj.title?.substring(0, 50) 
  })));
  
  return projectWorld;
};

// Helper function (if not already existing or imported) for circular positions
const generateCircularPositions = (count: number, centerY: number, radius: number): [number, number, number][] => {
  const positions: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    positions.push([x, centerY, z]);
  }
  return positions;
};

// Static instance for singleton pattern
let worldServiceInstance: WorldService | null = null;

export const getWorldServiceInstance = (): WorldService => {
  if (!worldServiceInstance) {
    console.log("Creating new WorldService singleton instance");
    worldServiceInstance = new WorldService();
  }
  return worldServiceInstance;
};

export class WorldService {
  private worlds: Map<string, World> = new Map();
  private loaded: boolean = false;
  private STORAGE_KEY = 'portfolio_worlds';

  constructor() {
    console.log('WorldService constructor called');
    this.loadWorlds();
  }

  // Improved reloadWorlds with better error handling
  public reloadWorlds(): void {
    console.log('Reloading all worlds...');
    
    try {
      // Clear memory cache
      this.worlds.clear();
      
      // Reset loaded flag
      this.loaded = false;
      
      // Reload from storage
      this.loadWorlds();
      
      console.log(`Reloaded ${this.worlds.size} worlds successfully`);
    } catch (error) {
      console.error('Error reloading worlds:', error);
      
      // Attempt recovery by forcing a direct load from localStorage
      try {
        this.worlds.clear();
        this.loaded = false;
        
        const worldsStr = localStorage.getItem(this.STORAGE_KEY);
        if (worldsStr) {
          const worlds = JSON.parse(worldsStr);
          if (Array.isArray(worlds)) {
            worlds.forEach(world => {
              if (world && world.id) {
                const normalizedId = this.normalizeWorldId(world.id);
                this.worlds.set(normalizedId, {...world, id: normalizedId});
              }
            });
            console.log(`Recovery reload successful: loaded ${this.worlds.size} worlds`);
          }
        }
        
        this.loaded = true;
      } catch (recoveryError) {
        console.error('Recovery reload failed:', recoveryError);
        this.loaded = true; // Mark as loaded to prevent infinite loops
      }
    }
  }

  // Improved loadWorlds with better error handling
  private loadWorlds(): void {
    if (this.loaded) {
      console.log('Worlds already loaded, skipping load');
      return;
    }
    
    console.log('Loading worlds from localStorage...');
    
    try {
      // Clear existing worlds first
      this.worlds.clear();
      
      // Get worlds from localStorage
      const worldsStr = localStorage.getItem(this.STORAGE_KEY);
      
      if (worldsStr) {
        try {
          const worlds = JSON.parse(worldsStr);
          
          if (Array.isArray(worlds)) {
            // Add each world to the map
            worlds.forEach(world => {
              if (world && world.id) {
                // Normalize the ID
                const normalizedId = this.normalizeWorldId(world.id);
                
                // Create a deep copy to avoid reference issues
                const worldCopy = JSON.parse(JSON.stringify(world));
                
                // Ensure the ID is normalized
                worldCopy.id = normalizedId;
                
                // Add to map
                this.worlds.set(normalizedId, worldCopy);
              }
            });
            
            console.log(`Loaded ${worlds.length} worlds from localStorage`);
          } else {
            console.error('Invalid worlds data in localStorage - not an array');
          }
        } catch (parseError) {
          console.error('Error parsing worlds from localStorage:', parseError);
        }
      } else {
        console.log('No worlds found in localStorage');
      }
      
      // Mark as loaded
      this.loaded = true;
    } catch (error) {
      console.error('Error loading worlds from localStorage:', error);
      
      // Mark as loaded anyway to prevent infinite loops
      this.loaded = true;
    }
  }

  // Helper to normalize world IDs consistently
  public normalizeWorldId(worldId: string): string {
    if (!worldId) return '';
    
    // Already in the standard format: project-world-X
    if (worldId.startsWith('project-world-')) {
      return worldId;
    }
    
    // Convert from world_X format
    const worldMatch = worldId.match(/^world_(\d+)$/);
    if (worldMatch && worldMatch[1]) {
      const normalizedId = `project-world-${worldMatch[1]}`;
      console.log(`Normalized ${worldId} to ${normalizedId}`);
      return normalizedId;
    }
    
    // If no recognized pattern, return original
    return worldId;
  }

  // PERFORMANCE FIX: Modified updateWorld to batch localStorage writes
  public updateWorld(world: World): boolean {
    console.log(`Updating world: ${world.id}`);
    
    if (!world || !world.id) {
      console.error('Invalid world data provided to updateWorld');
      return false;
    }
    
    try {
      // Normalize the world ID
      const normalizedId = this.normalizeWorldId(world.id);
      
      // Ensure world object has the normalized ID
      world.id = normalizedId;
      
      // Create a deep copy of the world to avoid reference issues
      const worldCopy = JSON.parse(JSON.stringify(world));
      
      // Set in memory - DO NOT save to localStorage immediately
      this.worlds.set(normalizedId, worldCopy);
      
      console.log(`World ${normalizedId} updated in memory cache`);
      return true;
    } catch (error) {
      console.error(`Error updating world ${world.id}:`, error);
      return false;
    }
  }
  
  // Improved helper method to save a specific world to localStorage
  private saveWorldToLocalStorage(world: World): boolean {
    if (!world || !world.id) {
      console.error('Invalid world data provided to saveWorldToLocalStorage');
      return false;
    }

    try {
      // Normalize the world ID
      const normalizedId = this.normalizeWorldId(world.id);
      
      // Ensure world object has the normalized ID
      world.id = normalizedId;
      
      // Get current worlds array
      const worldsStr = localStorage.getItem(this.STORAGE_KEY);
      let worlds: World[] = [];
      
      if (worldsStr) {
        try {
          worlds = JSON.parse(worldsStr);
          
          if (!Array.isArray(worlds)) {
            console.error('Invalid worlds data in localStorage - not an array');
            worlds = [];
          }
        } catch (parseError) {
          console.error('Error parsing worlds from localStorage:', parseError);
          worlds = [];
        }
      }
      
      // Remove any existing world with same ID (normalized or not)
      const originalLength = worlds.length;
      worlds = worlds.filter(w => {
        if (!w || !w.id) return false; // Skip invalid entries
        return this.normalizeWorldId(w.id) !== normalizedId;
      });
      
      // Create a deep copy of the world to avoid reference issues
      const worldCopy = JSON.parse(JSON.stringify(world));
      
      // Add updated world
      worlds.push(worldCopy);
      
      // Save to localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(worlds));
      
      // Log appropriate message based on whether we replaced an existing world
      if (worlds.length > originalLength) {
        console.log(`World ${world.id} added to localStorage`);
      } else {
        console.log(`World ${world.id} updated in localStorage`);
      }
      
      return true;
    } catch (error) {
      console.error(`Error saving world to localStorage:`, error);
      
      // Attempt a more direct approach as fallback
      try {
        // Just save this single world directly
        const singleWorldArray = [JSON.parse(JSON.stringify(world))];
        localStorage.setItem(`single_world_${world.id}`, JSON.stringify(singleWorldArray));
        console.log(`World ${world.id} saved to fallback storage location`);
        return true;
      } catch (fallbackError) {
        console.error(`Fallback save also failed:`, fallbackError);
        return false;
      }
    }
  }
  
  // Improved getWorld method for consistent world retrieval
  public getWorld(worldId: string): World | null {
    if (!worldId) {
      console.error('Invalid world ID provided to getWorld');
      return null;
    }
    
    // Normalize the requested world ID
    const normalizedId = this.normalizeWorldId(worldId);
    console.log(`Looking up world with ID: ${worldId} (normalized: ${normalizedId})`);
    
    // Ensure worlds are loaded
    if (!this.loaded) {
      this.loadWorlds();
    }
    
    // First try with normalized ID
    if (this.worlds.has(normalizedId)) {
      console.log(`Found world with normalized ID: ${normalizedId}`);
      // Return a deep copy to prevent accidental mutations by the caller
      return JSON.parse(JSON.stringify(this.worlds.get(normalizedId)!));
    }
    
    // Then try with original ID as fallback (should be less common if normalization is robust)
    if (this.worlds.has(worldId)) {
      console.log(`Found world with original ID: ${worldId} - this might indicate an issue if it differs from normalizedId.`);
      // Return a deep copy
      return JSON.parse(JSON.stringify(this.worlds.get(worldId)!));
    }
    
    // If world not found, try to create a dynamic world for project
    if (normalizedId.startsWith('project-world-')) {
      // Extract project ID from normalized ID
      const projectIdStr = normalizedId.replace('project-world-', '');
      const projectId = parseInt(projectIdStr, 10);
      
      if (isNaN(projectId)) {
        console.error(`Invalid project ID extracted from worldId: ${projectIdStr}`);
        return null;
      }
      
      console.warn(`World ${normalizedId} not found in cache. Attempting to create a transient instance for project ID: ${projectId}.`);
      
      // Since we no longer have static project imports, we'll create a minimal placeholder
      // The caller (e.g., handleSaveProject) MUST update this world with fresh project data.
      console.warn(`Project data for ID ${projectId} not available. Creating minimal placeholder for ${normalizedId}.`);
      
      // Create a minimal fallback placeholder
      return {
        id: normalizedId,
        name: `Project ${projectId}`,
        description: 'Loading project data...',
        objects: [], 
        backgroundColor: '#000000', 
        floorColor: '#222222', 
        skyColor: '#111111',
        ambientLightColor: '#ffffff', 
        ambientLightIntensity: 0.5,
        directionalLightColor: '#ffffff', 
        directionalLightIntensity: 0.8,
      };
    }
    
    console.warn(`World not found after all checks: ${worldId} (normalized: ${normalizedId})`);
    return null;
  }
  
  // Verifies that a world exists and has proper data
  public verifyWorld(worldId: string): {exists: boolean; valid: boolean; world?: World} {
    if (!worldId) {
      return {exists: false, valid: false};
    }
    
    const normalizedId = this.normalizeWorldId(worldId);
    console.log(`Verifying world: ${worldId} (normalized: ${normalizedId})`);
    
    // Try to get the world
    const world = this.getWorld(worldId);
    
    if (!world) {
      console.warn(`Verification failed: World ${worldId} not found`);
      return {exists: false, valid: false};
    }
    
    // Check essential properties
    const hasEssentialProps = 
      world.id && 
      world.backgroundColor && 
      world.floorColor && 
      typeof world.ambientLightIntensity === 'number';
    
    if (!hasEssentialProps) {
      console.warn(`Verification failed: World ${worldId} is missing essential properties`);
      return {exists: true, valid: false, world};
    }
    
    console.log(`Verification passed: World ${worldId} exists and is valid`);
    return {exists: true, valid: true, world};
  }
  
  // Clear all worlds from memory and reload from storage
  public clearAllWorlds(): void {
    console.log('Clearing all worlds from memory...');
    
    try {
      // Clear memory cache
      this.worlds.clear();
      
      // Reset loaded flag
      this.loaded = false;
      
      // Reload from localStorage
      this.loadWorlds();
      
      console.log('Worlds cleared from memory and reloaded from storage');
    } catch (error) {
      console.error('Error clearing worlds:', error);
      
      // Attempt to recover
      try {
        // Just clear memory without reloading
        this.worlds.clear();
        this.loaded = false;
        console.log('Worlds cleared from memory (recovery mode)');
      } catch (recoveryError) {
        console.error('Failed to clear worlds even in recovery mode:', recoveryError);
      }
    }
  }

  // Improved getAllWorlds with better error handling
  public getAllWorlds(): World[] {
    try {
      // Force reload to ensure we have the latest data
      if (!this.loaded) {
        this.loadWorlds();
      }
      
      // Create deep copies to prevent accidental mutations
      const worlds = Array.from(this.worlds.values()).map(world => 
        JSON.parse(JSON.stringify(world))
      );
      
      console.log(`Retrieved ${worlds.length} worlds`);
      return worlds;
    } catch (error) {
      console.error('Error retrieving all worlds:', error);
      
      // Attempt direct localStorage retrieval as fallback
      try {
        const worldsStr = localStorage.getItem(this.STORAGE_KEY);
        if (worldsStr) {
          const parsedWorlds = JSON.parse(worldsStr);
          if (Array.isArray(parsedWorlds)) {
            console.log(`Fallback: Retrieved ${parsedWorlds.length} worlds directly from localStorage`);
            return parsedWorlds;
          }
        }
      } catch (fallbackError) {
        console.error('Fallback retrieval failed:', fallbackError);
      }
      
      // Return empty array as last resort
      return [];
    }
  }
  
  // Improved removeWorld with better error handling and validation
  public removeWorld(worldId: string): boolean {
    if (!worldId) {
      console.error('Invalid world ID provided to removeWorld');
      return false;
    }
    
    const normalizedId = this.normalizeWorldId(worldId);
    console.log(`Removing world: ${worldId} (normalized: ${normalizedId})`);
    
    try {
      // First remove from memory
      let result = this.worlds.delete(normalizedId);
      
      // If not found with normalized ID, try original
      if (!result && normalizedId !== worldId) {
        result = this.worlds.delete(worldId);
      }
      
      // If found and removed from memory, also remove from localStorage
      if (result) {
        try {
          const worldsStr = localStorage.getItem(this.STORAGE_KEY);
          
          if (worldsStr) {
            try {
              let worlds = JSON.parse(worldsStr);
              
              if (Array.isArray(worlds)) {
                // Store original length for comparison
                const originalLength = worlds.length;
                
                // Filter out the world with either normalized or original ID
                worlds = worlds.filter(w => {
                  if (!w || !w.id) return false; // Skip invalid entries
                  return this.normalizeWorldId(w.id) !== normalizedId && w.id !== worldId;
                });
                
                // Verify something was actually removed
                if (worlds.length === originalLength) {
                  console.warn(`World ${worldId} not found in localStorage during removal`);
                } else {
                  // Save back to localStorage
                  localStorage.setItem(this.STORAGE_KEY, JSON.stringify(worlds));
                  console.log(`World ${worldId} removed from localStorage (${originalLength - worlds.length} entries removed)`);
                }
              } else {
                console.error('Invalid worlds data in localStorage - not an array');
              }
            } catch (parseError) {
              console.error('Error parsing worlds during removal:', parseError);
            }
          } else {
            console.warn('No worlds found in localStorage during removal');
          }
        } catch (storageError) {
          console.error('Error updating localStorage during world removal:', storageError);
        }
      } else {
        console.warn(`World ${worldId} not found in memory during removal`);
      }
      
      return result;
    } catch (error) {
      console.error(`Error removing world ${worldId}:`, error);
      return false;
    }
  }
  
  // Improved saveAllWorlds with better error handling and validation
  public saveAllWorlds(): boolean {
    try {
      console.log('Saving all worlds to localStorage...');
      
      // Convert worlds Map to array with deep copies to avoid reference issues
      const worldsArray = Array.from(this.worlds.values()).map(world => 
        JSON.parse(JSON.stringify(world))
      );
      
      // Validate worlds before saving
      const validWorlds = worldsArray.filter(world => {
        if (!world || !world.id) {
          console.warn('Skipping invalid world during saveAllWorlds');
          return false;
        }
        return true;
      });
      
      if (validWorlds.length < worldsArray.length) {
        console.warn(`Filtered out ${worldsArray.length - validWorlds.length} invalid worlds before saving`);
      }
      
      // CRITICAL FIX: Ensure we're not losing existing data from localStorage
      try {
        const existingWorldsStr = localStorage.getItem(this.STORAGE_KEY);
        if (existingWorldsStr) {
          const existingWorlds = JSON.parse(existingWorldsStr);
          if (Array.isArray(existingWorlds) && existingWorlds.length > 0) {
            console.log(`Found ${existingWorlds.length} existing worlds in localStorage`);
            
            // Get list of IDs in our current memory cache
            const currentIds = new Set(validWorlds.map(w => this.normalizeWorldId(w.id)));
            
            // Find worlds in localStorage that aren't in memory cache
            const worldsOnlyInStorage = existingWorlds.filter(w => {
              if (!w || !w.id) return false;
              return !currentIds.has(this.normalizeWorldId(w.id));
            });
            
            if (worldsOnlyInStorage.length > 0) {
              console.log(`Found ${worldsOnlyInStorage.length} worlds only in localStorage - preserving them`);
              // Add these worlds to our valid worlds before saving
              validWorlds.push(...worldsOnlyInStorage);
            }
          }
        }
      } catch (mergeError) {
        console.error('Error merging with existing localStorage worlds:', mergeError);
      }
      
      // Normalize all world IDs in validWorlds before saving
      for (const world of validWorlds) {
        if (world && world.id) {
          world.id = this.normalizeWorldId(world.id);
        }
      }
      
      // CRITICAL FIX: Remove duplicate worlds by ID
      const worldMap = new Map();
      for (const world of validWorlds) {
        if (world && world.id) {
          worldMap.set(world.id, world);
        }
      }
      const dedupedWorlds = Array.from(worldMap.values());
      
      // Save to localStorage
      const worldsJson = JSON.stringify(dedupedWorlds);
      localStorage.setItem(this.STORAGE_KEY, worldsJson);
      
      // CRITICAL FIX: Verify the data was actually saved
      const savedWorldsStr = localStorage.getItem(this.STORAGE_KEY);
      if (!savedWorldsStr) {
        console.error('Failed to verify worlds in localStorage after save!');
        return false;
      }
      
      const savedWorldsSize = savedWorldsStr.length;
      console.log(`Successfully saved ${dedupedWorlds.length} worlds to localStorage (${savedWorldsSize} bytes)`);
      
      // CRITICAL FIX: Debug output of the first few worlds to verify structure
      try {
        const savedWorlds = JSON.parse(savedWorldsStr);
        if (Array.isArray(savedWorlds) && savedWorlds.length > 0) {
          console.log(`Sample saved world IDs:`, savedWorlds.slice(0, 3).map(w => w.id));
        }
      } catch (error) {
        console.error('Error parsing saved worlds for debug:', error);
      }
      
      return true;
    } catch (error) {
      console.error('Error saving all worlds to localStorage:', error);
      
      // Attempt to save worlds individually as fallback
      try {
        console.log('Attempting fallback: saving worlds individually...');
        let successCount = 0;
        const fallbackKey = 'portfolio_worlds_fallback';
        
        // Build an array of worlds for fallback storage
        const fallbackWorlds = [];
        
        for (const [id, world] of this.worlds.entries()) {
          try {
            if (world && world.id) {
              const worldCopy = JSON.parse(JSON.stringify(world));
              fallbackWorlds.push(worldCopy);
              successCount++;
            }
          } catch (individualError) {
            console.error(`Failed to copy world ${id} for fallback:`, individualError);
          }
        }
        
        // Save to fallback location
        if (fallbackWorlds.length > 0) {
          localStorage.setItem(fallbackKey, JSON.stringify(fallbackWorlds));
          console.log(`Fallback save: saved ${fallbackWorlds.length} worlds to ${fallbackKey}`);
          
          // Also try to save to the original key
          try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(fallbackWorlds));
            console.log(`Also saved fallback data to primary key ${this.STORAGE_KEY}`);
          } catch (primarySaveError) {
            console.error(`Error saving fallback data to primary key:`, primarySaveError);
          }
          
          return true;
        }
        
        return false;
      } catch (fallbackError) {
        console.error('Fallback save failed:', fallbackError);
        return false;
      }
    }
  }

  // Improved getWorldById with better error handling and validation
  public getWorldById(id: string): World | undefined {
    if (!id) {
      console.warn('getWorldById called with empty id');
      return undefined;
    }

    try {
      // Ensure worlds are loaded
      if (!this.loaded) {
        this.loadWorlds();
      }

      const normalizedId = this.normalizeWorldId(id);
      const world = this.worlds.get(normalizedId);
      
      if (!world) {
        console.warn(`World with id "${normalizedId}" not found`);
        return undefined;
      }
      
      // Return a deep copy to prevent accidental mutations
      return JSON.parse(JSON.stringify(world));
    } catch (error) {
      console.error(`Error retrieving world with id "${id}":`, error);
      return undefined;
    }
  }

  // PERFORMANCE FIX: Add batch world update method
  public updateWorldsBatch(worlds: World[]): boolean {
    console.log(`Batch updating ${worlds.length} worlds...`);
    
    let successCount = 0;
    
    for (const world of worlds) {
      if (this.updateWorld(world)) {
        successCount++;
      }
    }
    
    // Save all worlds once after batch update
    const saveSuccess = this.saveAllWorlds();
    
    console.log(`Batch update completed: ${successCount}/${worlds.length} worlds updated, localStorage save: ${saveSuccess ? 'success' : 'failed'}`);
    
    return successCount === worlds.length && saveSuccess;
  }
  
  // Add method to force localStorage save for a specific world
  public saveWorld(worldId: string): boolean {
    const world = this.worlds.get(this.normalizeWorldId(worldId));
    if (world) {
      return this.saveWorldToLocalStorage(world);
    }
    return false;
  }
} 