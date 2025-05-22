import { Project } from '../services/projectService';
import { projectService } from '../services/projectService';

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
    cameraPosition: { x: 0, y: 2.5, z: 12 },
    cameraTarget: { x: 0, y: 2, z: -4 },
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
  
  // NPC is at position [0, 0, -4]
  // Use smaller radii to keep cards closer to NPC
  const circleRadiusBase = 12; // Reduced from 30
  const spiralRadiusBase = 8;  // Reduced from 20
  const gridSpacing = 6;       // Reduced spacing for grid formation
  const numGridColumns = 4;    // Number of columns for grid

  // Assign each project to a formation and position based on ID
  projects.forEach(project => {
    const projectId = project.id;
    let position: [number, number, number];
    
    // Deterministic position assignment
    const projectIndexFactor = projectId * 1.5; // Smaller factor to keep cards closer

    if (projectId % 3 === 0) {
      // Circle formation around NPC
      const angle = (projectIndexFactor * 0.5) % (Math.PI * 2);
      const radiusVariation = (projectId % 3) * 1.5; // Smaller variation (0, 1.5, 3)
      const currentRadius = circleRadiusBase + radiusVariation;
      const x = Math.cos(angle) * currentRadius;
      // NPC is at z = -4, so center circle there
      const z = -4 + Math.sin(angle) * currentRadius;
      const y = 1.5 + (projectIndexFactor * 0.1) % 1.0; // Lower height, less variation
      position = [x, y, z];
    } else if (projectId % 3 === 1) {
      // Spiral formation starting near NPC
      const progress = (projectIndexFactor * 0.07) % 1; 
      const angle = progress * Math.PI * 6; // Fewer turns
      const radiusAtPoint = spiralRadiusBase * (1 - progress * 0.3) + (projectId % 3); 
      const x = Math.cos(angle) * radiusAtPoint;
      // Center at NPC's z position
      const z = -4 + Math.sin(angle) * radiusAtPoint;
      const y = 2.0 + progress * 3; // Lower maximum height
      position = [x, y, z];
    } else {
      // Grid formation in front of NPC
      const gridIndex = projectIndexFactor % (numGridColumns * numGridColumns);
      const gridRow = Math.floor(gridIndex / numGridColumns);
      const gridCol = gridIndex % numGridColumns;
      
      const xOffset = (gridCol - Math.floor(numGridColumns / 2)) * gridSpacing;
      const zOffset = (gridRow - Math.floor(numGridColumns / 2)) * gridSpacing;
      
      // Add some pseudo-random height variation but still deterministic
      const yVariation = ((projectId * 17) % 10) * 0.15; // Smaller height variation
      
      // Center grid near NPC
      const x = xOffset;
      const y = 1.5 + yVariation;
      const z = -4 + zOffset - 8; // Start grid in front of NPC
      
      position = [x, y, z];
    }
    
    result.push({
      projectId: projectId,
      position: position
    });
  });
  
  return result;
}

const isObjectInteractive = (object: WorldObject): boolean => {
  return object.type === 'project' || object.type === 'link' || 
         object.type === 'button' || (object.type === 'image' && !!object.url);
};

// Helper function to generate positions for gallery items
function generateGalleryPositions(count: number): [number, number, number][] {
  const positions: [number, number, number][] = [];
  
  // GALLERY SIZES & SPACING
  // Increase the gallery area to 100 units square (was 80)
  const gallerySize = 100;
  // Increase minimum spacing between objects to 18 units (was 12)
  const minSpacing = 18;
  
  // Track all positions for spacing check
  const placedPositions: {x: number, z: number}[] = [];
  
  // Distance calculation helper
  const distance = (x1: number, z1: number, x2: number, z2: number): number => {
    const dx = x1 - x2;
    const dz = z1 - z2;
    return Math.sqrt(dx * dx + dz * dz);
  };
  
  // Check if a position is too close to existing positions
  const isTooClose = (x: number, z: number): boolean => {
    for (const pos of placedPositions) {
      if (distance(x, z, pos.x, pos.z) < minSpacing) {
        return true;
      }
    }
    return false;
  };
  
  // Generate position in a specific quadrant
  const generateQuadrantPosition = (quadrant: number): [number, number, number] => {
    // Define quadrant bounds
    const halfSize = gallerySize / 2;
    let minX, maxX, minZ, maxZ;
    
    // Quadrants: 0=NE, 1=SE, 2=SW, 3=NW
    switch (quadrant) {
      case 0: // Northeast
        minX = 0;
        maxX = halfSize;
        minZ = -halfSize;
        maxZ = 0;
        break;
      case 1: // Southeast
        minX = 0;
        maxX = halfSize;
        minZ = 0;
        maxZ = halfSize;
        break;
      case 2: // Southwest
        minX = -halfSize;
        maxX = 0;
        minZ = 0;
        maxZ = halfSize;
        break;
      case 3: // Northwest
        minX = -halfSize;
        maxX = 0;
        minZ = -halfSize;
        maxZ = 0;
        break;
      default:
        // Default to full area
        minX = -halfSize;
        maxX = halfSize;
        minZ = -halfSize;
        maxZ = halfSize;
    }
    
    // Try to find a valid position (with spacing)
    let x, z;
    let attempts = 0;
    const maxAttempts = 50;
    
    do {
      // Generate random position within quadrant
      x = minX + Math.random() * (maxX - minX);
      z = minZ + Math.random() * (maxZ - minZ);
      attempts++;
      
      // If we've tried too many times, increase the search area slightly
      if (attempts > maxAttempts) {
        minX -= 5;
        maxX += 5;
        minZ -= 5;
        maxZ += 5;
        attempts = 0;
      }
    } while (isTooClose(x, z) && attempts < maxAttempts * 2);
    
    // Add to placed positions
    placedPositions.push({x, z});
    
    // Random height between 1.5 and 3.5
    const y = 1.5 + Math.random() * 2;
    
    return [x, y, z];
  };
  
  // Place the first position near the entrance for easy access
  positions.push([0, 1.5, -(gallerySize/2) + 15]);
  
  // Distribute remaining assets evenly across quadrants
  if (count > 1) {
    // Calculate how many assets per quadrant
    const assetsPerQuadrant = Math.ceil((count - 1) / 4);
    
    // For each quadrant
    for (let quadrant = 0; quadrant < 4; quadrant++) {
      // Calculate how many assets to place in this quadrant
      const assetsInQuadrant = Math.min(
        assetsPerQuadrant,
        count - 1 - (quadrant * assetsPerQuadrant)
      );
      
      if (assetsInQuadrant <= 0) break;
      
      // Place assets in this quadrant
      for (let i = 0; i < assetsInQuadrant; i++) {
        positions.push(generateQuadrantPosition(quadrant));
      }
    }
  }
  
  return positions;
}

// Helper function to determine media count for a project
const determineMediaCount = (project: Project): number => {
  let count = 5; // Default minimum count
  
  // Count asset gallery items if available
  if (project.assetGallery && Array.isArray(project.assetGallery)) {
    count = Math.max(count, project.assetGallery.length);
  }
  
  // Count media objects if available
  if (project.mediaObjects && Array.isArray(project.mediaObjects)) {
    count += project.mediaObjects.length;
  }
  
  return count;
};

// Add code to create project worlds
export const createProjectWorld = (project: Project, isTouchDevice: boolean): World => {
  console.log(`WorldProvider: Creating project world for project ID ${project.id}: ${project.name}`);

  // Determine the number of assets to generate based on project content
  const mediaCount = determineMediaCount(project);
  
  // Generate asset positions
  const assetPositions = generateGalleryPositions(mediaCount);
  
  // Use world settings from project if available, or default settings
  const settings = project.worldSettings || {
    backgroundColor: '#1a1a2e',
    floorColor: '#030c25',
    skyColor: '#16213e',
    ambientLightColor: '#ffffff',
    ambientLightIntensity: 0.8,
    directionalLightColor: '#ffffff',
    directionalLightIntensity: 1.2
  };
  
  // Create a world with objects specific to this project
  let worldObjects: WorldObject[] = [];
  
  // Optional: Include a link or button back to the main world
  worldObjects.push({
    id: 'back-to-main',
    type: 'button',
    title: 'Back to Main World',
    position: [-5, 1, 0],
    action: 'navigate',
    destination: 'mainWorld'
  });
  
  // Add the primary project display
  worldObjects.push({
    id: `content-${project.id}`,
    type: project.type === 'video' ? 'video' : 'image',
    title: project.name,
    description: project.description,
    url: project.type === 'video' ? project.videoUrl : project.link,
    thumbnail: project.thumbnail,
    position: [0, 2, -10], // Center position
    scale: [2, 2, 2] // Larger scale for the main content
  });
  
  // Add project-specific media objects if specified
  if (project.mediaObjects && project.mediaObjects.length > 0) {
    // Add all media objects defined for this project
    worldObjects = [...worldObjects, ...project.mediaObjects];
  } else {
    // Create some basic surrounding elements if no custom media objects are defined
    
    // Info panel to the left
    worldObjects.push({
      id: `info-${project.id}`,
      type: 'image',
      title: 'Project Info',
      description: `${project.description}\n\nStatus: ${project.status}`,
      position: [-5, 2, -8],
      rotation: [0, Math.PI / 6, 0], // Angle slightly towards center
    });
    
    // Link to project website/GitHub
    worldObjects.push({
      id: `link-${project.id}`,
      type: 'link',
      title: 'Visit Project',
      description: 'Click to open project link',
      url: project.link,
      position: [5, 2, -8],
      rotation: [0, -Math.PI / 6, 0], // Angle slightly towards center
    });
  }
  
  // Add asset gallery items as displayable objects
  if (project.assetGallery && Array.isArray(project.assetGallery) && project.assetGallery.length > 0) {
    console.log(`WorldProvider: Adding ${project.assetGallery.length} asset gallery items to world`);
    
    // Generate positions for all assets together
    const galleryPositions = generateGalleryPositions(project.assetGallery.length);
    
    // Add all assets together, mixed throughout the space
    project.assetGallery.forEach((asset, index) => {
      const position = galleryPositions[index] || [0, 1, -15 - (index % 5)];
      
      // Determine the asset type
      let assetType: 'image' | 'video' | 'pdf' = 'image';
      let scale: [number, number, number] = [1.0, 1.0, 0.1]; // Default scale, ImageCard will handle aspect ratio.
      let thumbnail = asset.url;
      
      if (asset.type === 'video' || 
          (asset.url && (asset.url.endsWith('.mp4') || asset.url.endsWith('.MP4') || 
                        asset.url.endsWith('.webm') || asset.url.endsWith('.mov')))) {
        assetType = 'video';
        scale = [1.2, 0.675, 0.1]; // 16:9 aspect ratio for videos (Videos use their own card type)
        
        // Generate thumbnail from video URL if it exists
        if (asset.url) {
          thumbnail = asset.url.replace('.mp4', '.jpg')
                              .replace('.MP4', '.jpg')
                              .replace('.webm', '.jpg')
                              .replace('.mov', '.jpg');
        }
      } else if (asset.type === 'document' || 
                (asset.url && (asset.url.endsWith('.pdf') || asset.url.endsWith('.PDF')))) {
        assetType = 'pdf';
        scale = [0.8, 1.15, 0.1]; // Portrait document ratio (PDFs use their own card type)
      } else {
        // This is an image. The ImageCard.tsx component will now primarily handle its aspect ratio.
        // The scale here [1.0, 1.0, 0.1] will be a uniform size multiplier.
        // No need for specific landscape/portrait/square scaling here anymore.
        assetType = 'image'; 
      }
      
      // Get clean name without file extension for display
      let cleanName = asset.name || `Asset ${index + 1}`;
      
      // Remove file extension from name
      if (cleanName.includes('.')) {
        cleanName = cleanName.substring(0, cleanName.lastIndexOf('.'));
      }
      
      // Make rotation straight (no tilting) with no rotation on Y axis
      // The rendering system will make them camera-facing
      const rotation: [number, number, number] = [0, 0, 0];
      
      worldObjects.push({
        id: `gallery-item-${index}`,
        type: assetType,
        title: cleanName, // Use clean name without extension
        description: `${cleanName} - ${asset.category || 'Asset'}`, // Also use clean name in description
        url: asset.url,
        thumbnail: thumbnail,
        position: position,
        rotation: rotation, // Straight, no rotation
        scale: scale
      });
    });
  }
  
  // Define multiple possible spawn positions and randomly select one
  const spawnPositions = [
    // Positions further away and more to the sides
    { x: -25, y: isTouchDevice ? 4 : 2.5, z: 30 },  // Far left, back
    { x: 25, y: isTouchDevice ? 4 : 2.5, z: 30 },   // Far right, back
    { x: 0, y: isTouchDevice ? 4 : 2.5, z: 40 },    // Very far back, center
    { x: -30, y: isTouchDevice ? 4 : 2.5, z: 10 },  // Far left, more to the front side
    { x: 30, y: isTouchDevice ? 4 : 2.5, z: 10 },   // Far right, more to the front side
    { x: -20, y: isTouchDevice ? 4 : 2.5, z: -5 },  // Left side, near the typical "front" of the content
    { x: 20, y: isTouchDevice ? 4 : 2.5, z: -5 },   // Right side, near the typical "front"
    { x: 0, y: isTouchDevice ? 4 : 2.5, z: -15 },   // Directly in front of where content usually is, but further back
    { x: -15, y: isTouchDevice ? 4 : 2.5, z: 35 },  // Mid-far left, back
    { x: 15, y: isTouchDevice ? 4 : 2.5, z: 35 },   // Mid-far right, back
  ];
  
  // Select a random spawn position
  const randomIndex = Math.floor(Math.random() * spawnPositions.length);
  const cameraPosition = spawnPositions[randomIndex];
  
  // Set camera target to look at main content area, slightly lowered to aim at center of mass of content
  const cameraTarget = { x: 0, y: 1.5, z: -5 }; // Always look toward center, but a bit lower
  
  const projectWorld: World = {
    id: `project-world-${project.id}`,
    name: `${project.name} World`,
    description: `A custom world for ${project.name}`,
    backgroundColor: settings.backgroundColor,
    floorColor: settings.floorColor,
    skyColor: settings.skyColor,
    floorTexture: settings.floorTexture,
    skyTexture: settings.skyTexture,
    ambientLightColor: settings.ambientLightColor,
    ambientLightIntensity: settings.ambientLightIntensity,
    directionalLightColor: settings.directionalLightColor,
    directionalLightIntensity: settings.directionalLightIntensity,
    cameraPosition: cameraPosition,
    cameraTarget: cameraTarget,
    objects: worldObjects
  };
  
  return projectWorld;
};

// Generate circular positions for multiple objects around a center point
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

// Singleton pattern for WorldService
let worldServiceInstance: WorldService | null = null;

export const getWorldServiceInstance = (): WorldService => {
  if (!worldServiceInstance) {
    worldServiceInstance = new WorldService();
  }
  return worldServiceInstance;
};

export class WorldService {
  private worlds: Map<string, World> = new Map();
  private loaded: boolean = false;
  private loading: boolean = false;
  
  constructor() {
    this.loadWorlds();
  }
  
  public reloadWorlds(): void {
    console.log('WorldService: Reloading worlds');
    this.loaded = false;
    this.loadWorlds();
  }
  
  private async loadWorlds(): Promise<void> {
    // Prevent multiple simultaneous loading
    if (this.loading) {
      console.log('WorldService: Already loading worlds, skipping duplicate call');
      return;
    }
    
    this.loading = true;
    console.log('WorldService: Loading worlds');
    
    try {
      // Always initialize default worlds to ensure consistency across devices
      await this.initializeDefaultWorlds();
      
      // Log all loaded world IDs for debugging
      const worldIds = Array.from(this.worlds.keys());
      console.log('WorldService: Loaded worlds:', worldIds);
      
      this.loaded = true;
    } catch (error) {
      console.error('WorldService: Error loading worlds:', error);
    } finally {
      this.loading = false;
    }
  }
  
  // Initialize with default worlds
  private async initializeDefaultWorlds(): Promise<void> {
    console.log('WorldService: Initializing default worlds');
    this.worlds.clear();
    
    try {
      // Get projects from projectService
      const projects = await projectService.getProjects();
      console.log(`WorldService: Loaded ${projects.length} projects from projectService`);
      
      // Create main world
      const mainWorld = createMainWorld(projects);
      this.worlds.set(mainWorld.id, mainWorld);
      
      // Create a project world for each project
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      for (const project of projects) {
        const projectWorld = createProjectWorld(project, isTouchDevice);
        const worldId = projectWorld.id;
        
        // Log each world creation
        console.log(`WorldService: Created project world: ${worldId} for project ${project.id}`);
        
        // Store world in the map
        this.worlds.set(worldId, projectWorld);
      }
      
      console.log(`WorldService: Created ${this.worlds.size} default worlds`);
    } catch (error) {
      console.error('WorldService: Error initializing default worlds:', error);
    }
  }
  
  // Add missing methods
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
      console.log(`WorldService: Normalized ${worldId} to ${normalizedId}`);
      return normalizedId;
    }
    
    // If no recognized pattern, return original
    return worldId;
  }

  public updateWorld(world: World): boolean {
    if (!world || !world.id) {
      console.error('WorldService: Invalid world data provided to updateWorld');
      return false;
    }
    
    try {
      // Set the world in memory
      this.worlds.set(world.id, { ...world });
      return true;
    } catch (error) {
      console.error(`WorldService: Error updating world ${world.id}:`, error);
      return false;
    }
  }

  public getWorld(worldId: string): World | null {
    if (!worldId) {
      console.error('WorldService: Invalid world ID provided to getWorld');
      return null;
    }
    
    // Ensure worlds are loaded
    if (!this.loaded) {
      console.log(`WorldService: Worlds not loaded yet, loading now before getting ${worldId}`);
      // Force synchronous loading for immediate access
      this.loadWorlds();
    }
    
    // Normalize the world ID to handle different formats
    const normalizedId = this.normalizeWorldId(worldId);
    
    // Get the world
    const world = this.worlds.get(normalizedId);
    
    if (world) {
      return { ...world };
    }
    
    // If world not found, log and return null
    console.error(`WorldService: World not found: ${worldId} (normalized: ${normalizedId})`);
    console.log(`WorldService: Available worlds: ${Array.from(this.worlds.keys()).join(', ')}`);
    return null;
  }

  public getAllWorlds(): World[] {
    if (!this.loaded) {
      this.loadWorlds();
    }
    
    return Array.from(this.worlds.values()).map(world => ({ ...world }));
  }
} 