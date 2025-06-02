import React, { useEffect, useState, Suspense, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Text } from '@react-three/drei';
import { projectDataService, ProjectData } from '../services/projectDataService';
import * as THREE from 'three';
import FirstPersonCamera from '../components/FirstPersonCamera';
import { MobileControlsProvider } from '../context/MobileControlsContext';
import { InteractionProvider } from '../context/InteractionContext';
import MobileControls from '../components/MobileControls';
import useMobileDetection from '../hooks/useMobileDetection';
import useFirstPersonInteractions from '../hooks/useFirstPersonInteractions';
import BackButton from '../components/BackButton';
import Crosshair from '../components/Crosshair';
import InteractionButton from '../components/InteractionButton';

// Add pulse animation for the pointer lock indicator
const pulseKeyframes = `
@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.02); }
  100% { opacity: 1; transform: scale(1); }
}
`;

// Inject the CSS animation
if (typeof document !== 'undefined' && !document.querySelector('[data-pulse-animation]')) {
  const style = document.createElement('style');
  style.setAttribute('data-pulse-animation', 'true');
  style.textContent = pulseKeyframes;
  document.head.appendChild(style);
}

// Import the specialized card components
import { VideoCard } from '../components/VideoCard';
import { ImageCard } from '../components/ImageCard';
import { PDFCard } from '../components/PDFCard';
import { WebLinkCard } from '../components/WebLinkCard';
import { slugToProjectName } from '../utils/fileUtils';

interface ProjectSubworldProps {}

// Utility functions (moved outside component to prevent re-creation)
const getFilenameFromUrl = (url: string): string => {
  if (!url) return 'Untitled';
  
  try {
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const nameWithoutExtension = filename.replace(/\.[^/.]+$/, '');
    const cleanName = nameWithoutExtension
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
    
    return cleanName;
  } catch (error) {
    console.warn('Error extracting filename from URL:', url, error);
    return 'Untitled';
  }
};

const determineMediaType = (url: string, type?: string): string => {
  if (type) return type.toLowerCase();
  
  const urlLower = url?.toLowerCase() || '';
  
  // Video detection
  if (urlLower.includes('youtube') || urlLower.includes('youtu.be') || 
      urlLower.endsWith('.mp4') || urlLower.endsWith('.webm') || 
      urlLower.endsWith('.mov') || urlLower.endsWith('.avi')) {
    return 'video';
  }
  
  // PDF detection
  if (urlLower.endsWith('.pdf')) {
    return 'pdf';
  }
  
  // Web link detection
  if (urlLower.startsWith('http') && !urlLower.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    return 'html';
  }
  
  // Default to image
    return 'image';
};

// Optimized media card router component with custom memo comparison
const MediaCardRouter: React.FC<{ mediaObject: any; index: number }> = React.memo(({ mediaObject, index }) => {
  const mediaType = useMemo(() => determineMediaType(mediaObject.url, mediaObject.type), [mediaObject.url, mediaObject.type]);
  const title = useMemo(() => 
    mediaObject.title || mediaObject.name || getFilenameFromUrl(mediaObject.url), 
    [mediaObject.title, mediaObject.name, mediaObject.url]
  );
  
  // Create stable position and rotation with proper deep comparison
  const position = useMemo(() => {
    const pos = mediaObject.position || [0, 2.5, 0];
    return [pos[0], pos[1], pos[2]] as [number, number, number];
  }, [mediaObject.position?.[0], mediaObject.position?.[1], mediaObject.position?.[2]]);
  
  const rotation = useMemo(() => {
    const rot = mediaObject.rotation || [0, 0, 0];
    return [rot[0], rot[1], rot[2]] as [number, number, number];
  }, [mediaObject.rotation?.[0], mediaObject.rotation?.[1], mediaObject.rotation?.[2]]);

  // Handle click for navigation (if needed)
  const handleClick = useCallback(() => {
    if (mediaObject.url) {
      window.open(mediaObject.url, '_blank');
    }
  }, [mediaObject.url]);

  // Route to appropriate card component
  switch (mediaType) {
    case 'video':
      return (
        <VideoCard
          id={index}
          title={title}
          videoUrl={mediaObject.url}
          description={mediaObject.description}
          position={position as [number, number, number]}
          rotation={rotation as [number, number, number]}
        />
      );
      
    case 'pdf':
      return (
        <PDFCard
          title={title}
          description={mediaObject.description}
          pdfUrl={mediaObject.url}
          position={position as [number, number, number]}
          rotation={rotation as [number, number, number]}
          onClick={handleClick}
        />
      );
      
    case 'html':
      return (
        <WebLinkCard
          title={title}
          description={mediaObject.description}
          url={mediaObject.url}
          position={position as [number, number, number]}
          rotation={rotation as [number, number, number]}
          onClick={handleClick}
        />
      );
      
    case 'image':
    default:
      return (
        <ImageCard
          title={title}
          imageUrl={mediaObject.url}
          description={mediaObject.description}
          position={position as [number, number, number]}
          rotation={rotation as [number, number, number]}
          onClick={handleClick}
        />
      );
  }
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.index === nextProps.index &&
    prevProps.mediaObject.url === nextProps.mediaObject.url &&
    prevProps.mediaObject.title === nextProps.mediaObject.title &&
    prevProps.mediaObject.type === nextProps.mediaObject.type &&
    JSON.stringify(prevProps.mediaObject.position) === JSON.stringify(nextProps.mediaObject.position) &&
    JSON.stringify(prevProps.mediaObject.rotation) === JSON.stringify(nextProps.mediaObject.rotation)
  );
});

MediaCardRouter.displayName = 'MediaCardRouter';

// Scene content component for first-person integration
const SceneContent: React.FC<{ allMediaObjects: any[], projectData: ProjectData }> = React.memo(({ allMediaObjects, projectData }) => {
  // Removed console.log to improve performance

  // Enable first person interactions for walking and interaction (same as main world)
  useFirstPersonInteractions();

  // DEBUG: Log scene structure to understand raycasting issues
  const { scene } = useThree();
  useEffect(() => {
    const logSceneInteractives = () => {
      console.log('🎯 DEBUG: Scanning scene for interactive objects...');
      const interactiveObjects: any[] = [];
      
      scene.traverse((child) => {
        if (child.userData?.interactive === true) {
          interactiveObjects.push({
            name: child.name || 'unnamed',
            type: child.userData.type || child.userData.objectType,
            position: child.position,
            userData: child.userData
          });
        }
      });
      
      console.log(`🎯 DEBUG: Found ${interactiveObjects.length} interactive objects:`, interactiveObjects);
      console.log('🎯 DEBUG: Pointer lock status:', document.pointerLockElement ? 'LOCKED' : 'NOT LOCKED');
      console.log('🎯 DEBUG: Crosshair system ready - first click will align cursor and enable interactions');
      console.log('🎯 DEBUG: Crosshair should be visible at center. If not, check z-index conflicts.');
    };
    
    // Log after scene is likely populated
    const timer = setTimeout(logSceneInteractives, 2000);
    return () => clearTimeout(timer);
  }, [scene, allMediaObjects.length]);

  return (
    <>
      {/* Bright lighting for gallery-like feel */}
      <ambientLight color="#ffffff" intensity={1.0} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={0.4}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />

      {/* Clean white gallery environment */}
      <Environment preset="apartment" background={false} />
      
      {/* Force white background */}
      <color attach="background" args={['#ffffff']} />

      {/* First Person Camera - same as main world */}
      <FirstPersonCamera 
        position={new THREE.Vector3(0, 1.7, 15)}
        height={1.7} 
        moveSpeed={0.25}
        rotationSpeed={0.0015}
        acceleration={0.12}
        deceleration={0.2}
      />

      {/* Pure white floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshBasicMaterial 
          color="#ffffff"
          toneMapped={false}
        />
      </mesh>

      {/* Project title */}
      <Text
        position={[0, 4, -5]}
        fontSize={0.5}
        color="#333333"
        anchorX="center"
        anchorY="middle"
      >
        {projectData.name}
      </Text>

      {/* Subtitle with media count */}
      <Text
        position={[0, 3.3, -5]}
        fontSize={0.2}
        color="#666666"
        anchorX="center"
        anchorY="middle"
      >
        {allMediaObjects.length} media object{allMediaObjects.length !== 1 ? 's' : ''}
      </Text>

      {/* Render all media objects using specialized components */}
      {allMediaObjects.map((mediaObj, index) => {
        const uniqueKey = `${mediaObj.id || mediaObj.url || 'unknown'}-${index}`;
        // Removed console.log to improve performance
        return (
          <MediaCardRouter 
            key={uniqueKey} 
            mediaObject={mediaObj} 
            index={index}
          />
        );
      })}

      {/* Show message if no media objects */}
      {allMediaObjects.length === 0 && (
        <Text
          position={[0, 2, 0]}
          fontSize={0.3}
          color="#cccccc"
          anchorX="center"
          anchorY="middle"
        >
          No media objects found
        </Text>
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  // Only re-render if the actual media objects or project data changes
  return (
    prevProps.allMediaObjects.length === nextProps.allMediaObjects.length &&
    prevProps.projectData.name === nextProps.projectData.name &&
    prevProps.projectData.id === nextProps.projectData.id &&
    // Deep comparison of media objects URLs (most likely to change)
    prevProps.allMediaObjects.every((obj, index) => 
      obj.url === nextProps.allMediaObjects[index]?.url &&
      obj.title === nextProps.allMediaObjects[index]?.title
    )
  );
});

SceneContent.displayName = 'SceneContent';

const ProjectSubworld: React.FC<ProjectSubworldProps> = () => {
  const { projectId, projectName } = useParams<{ projectId?: string; projectName?: string }>();
  const navigate = useNavigate();
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  
  // Get mobile detection
  const { isTouchDevice } = useMobileDetection();

  // Track pointer lock state for unified cursor system
  useEffect(() => {
    const handlePointerLockChange = () => {
      const isLocked = !!document.pointerLockElement;
      setIsPointerLocked(isLocked);
      console.log('🎯 Pointer lock changed:', isLocked ? 'LOCKED' : 'UNLOCKED');
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    
    // Check initial state
    handlePointerLockChange();
    
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, []);

  // Auto-request pointer lock when subworld loads (after a short delay)
  useEffect(() => {
    if (!isTouchDevice && projectData && !isLoading) {
      const timer = setTimeout(() => {
        if (!document.pointerLockElement) {
          console.log('🎯 Auto-requesting pointer lock for subworld...');
          const canvas = document.querySelector('canvas');
          if (canvas) {
            canvas.requestPointerLock().catch(err => {
              console.log('🎯 Auto pointer lock request failed (user interaction needed):', err);
            });
          }
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isTouchDevice, projectData, isLoading]);

  useEffect(() => {
    const loadProject = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        let project: ProjectData | null = null;
        
        // UNIFIED APPROACH: Handle both ID and name in the projectId parameter
        if (projectId) {
          console.log(`ProjectSubworld: Loading project by ID/name: ${projectId}`);
          
          // First, try to parse as numeric ID
          const numericId = parseInt(projectId, 10);
          if (!isNaN(numericId)) {
            console.log(`ProjectSubworld: Trying as numeric ID: ${numericId}`);
            project = await projectDataService.getProjectById(numericId);
          }
          
          // If not found or not numeric, try as project name/slug
          if (!project) {
            console.log(`ProjectSubworld: Trying as project name/slug: ${projectId}`);
            
            // Get all projects for comprehensive search
            const allProjects = await projectDataService.getAllProjects();
            console.log(`ProjectSubworld: Searching through ${allProjects.length} projects for: ${projectId}`);
            
            // Try multiple search strategies
            const searchStrategies = [
              // 1. Exact name match (case sensitive)
              (p: any) => p.name === projectId,
              // 2. Exact name match (case insensitive)
              (p: any) => p.name.toLowerCase() === projectId.toLowerCase(),
              // 3. CustomLink match
              (p: any) => p.customLink && p.customLink.toLowerCase() === projectId.toLowerCase(),
              // 4. Slug generation match - convert project name to slug and compare
              (p: any) => {
                const projectSlug = p.name.toLowerCase().trim()
                  .replace(/[\s.]+/g, '-')
                  .replace(/['"]/g, '')
                  .replace(/[^a-z0-9-]/g, '')
                  .replace(/-+/g, '-')
                  .replace(/^-+|-+$/g, '');
                return projectSlug === projectId.toLowerCase();
              },
              // 5. Reverse slug conversion - convert input back to possible name
              (p: any) => {
                const convertedName = slugToProjectName(projectId);
                return p.name.toLowerCase() === convertedName.toLowerCase();
              },
              // 6. Alphanumeric only comparison
              (p: any) => p.name.toLowerCase().replace(/[^a-z0-9]/g, '') === projectId.toLowerCase().replace(/[^a-z0-9]/g, ''),
              // 7. Partial name match
              (p: any) => p.name.toLowerCase().includes(projectId.toLowerCase()) || projectId.toLowerCase().includes(p.name.toLowerCase())
            ];
            
            for (let i = 0; i < searchStrategies.length; i++) {
              const strategy = searchStrategies[i];
              const found = allProjects.find(strategy);
              if (found) {
                console.log(`ProjectSubworld: Found project using strategy ${i + 1}: "${found.name}" (ID: ${found.id})`);
                project = found;
                break;
              }
            }
            
            if (!project) {
              console.log(`ProjectSubworld: No project found for "${projectId}"`);
              console.log('ProjectSubworld: Available projects:', allProjects.slice(0, 10).map(p => ({ id: p.id, name: p.name })));
            }
          }
        }
        // Legacy: Handle projectName parameter from old routes
        else if (projectName) {
          console.log(`ProjectSubworld: Loading project by name parameter: ${projectName}`);
          project = await projectDataService.getProjectByName(projectName);
        }
        
        if (project) {
          console.log('ProjectSubworld: Loaded project data:', project);
          setProjectData(project);
        } else {
          setError('Project not found');
          console.error('ProjectSubworld: Project not found for ID/name:', projectId || projectName);
        }
      } catch (err) {
        setError('Failed to load project');
        console.error('ProjectSubworld: Error loading project:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [projectId, projectName]);

  // Memoize media objects processing to prevent unnecessary recalculations
  const allMediaObjects = useMemo(() => {
    if (!projectData) return [];
    
    const mediaObjects = [];
    const seenUrls = new Set<string>(); // Track URLs to prevent duplicates
    
    // Add mediaObjects (positioned media)
    if (projectData.mediaObjects && projectData.mediaObjects.length > 0) {
      const uniqueMediaObjects = projectData.mediaObjects.filter(obj => {
        if (!obj.url) return false; // Skip objects without URLs
        if (seenUrls.has(obj.url)) {
          console.log(`ProjectSubworld: Skipping duplicate mediaObject: ${obj.url}`);
          return false;
        }
        seenUrls.add(obj.url);
        return true;
      });
      mediaObjects.push(...uniqueMediaObjects);
      console.log(`ProjectSubworld: Added ${uniqueMediaObjects.length} unique mediaObjects`);
    }
    
    // Add assetGallery items (auto-positioned) - only if not already in mediaObjects
    if (projectData.assetGallery && projectData.assetGallery.length > 0) {
      const uniqueAssets = projectData.assetGallery.filter(asset => asset.url && !seenUrls.has(asset.url));
              const galleryObjects = uniqueAssets.map((asset, index) => {
          // Create beautiful randomized positioning for a gallery aesthetic
          const totalAssets = uniqueAssets.length;
        
        // Generate deterministic but varied positions based on asset index
        const seededRandom = (seed: number, min: number, max: number): number => {
          const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
          return min + (max - min) * (x - Math.floor(x));
        };
        
        // Create BEAUTIFUL floating gallery with proper spacing
        const clusterCount = Math.max(4, Math.ceil(totalAssets / 6));
        const currentCluster = index % clusterCount;
        
        // Base cluster positions in a MUCH LARGER circle for proper gallery feel
        const clusterAngle = (currentCluster / clusterCount) * Math.PI * 2;
        const clusterRadius = 40 + (clusterCount * 8);
        const clusterX = Math.cos(clusterAngle) * clusterRadius;
        const clusterZ = Math.sin(clusterAngle) * clusterRadius;
        
        // Add GENEROUS organic randomization within each cluster
        const inClusterIndex = Math.floor(index / clusterCount);
        const randomX = seededRandom(index * 7 + 123, -20, 20);
        const randomZ = seededRandom(index * 11 + 456, -20, 20);
        const randomY = seededRandom(index * 13 + 789, 2.2, 3.6);
        
        // Create EXPANDED spiral-like distribution within clusters
        const spiralRadius = 8 + (inClusterIndex * 3);
        const spiralAngle = inClusterIndex * 2.3;
        const spiralX = Math.cos(spiralAngle) * spiralRadius;
        const spiralZ = Math.sin(spiralAngle) * spiralRadius;
        
        const position: [number, number, number] = [
          clusterX + spiralX + randomX * 0.5,
          randomY,
          clusterZ + spiralZ + randomZ * 0.5
        ];
        
        // Randomize rotation for more organic look
        const randomRotationY = seededRandom(index * 17 + 234, -0.3, 0.3);
        
        return {
          id: `asset-${index}`,
          type: asset.type,
          title: getFilenameFromUrl(asset.url),
          description: asset.name || getFilenameFromUrl(asset.url),
          url: asset.url,
          thumbnail: asset.url,
          position,
          rotation: [0, randomRotationY, 0] as [number, number, number],
        };
      });
      
      mediaObjects.push(...galleryObjects);
      console.log(`ProjectSubworld: Added ${galleryObjects.length} unique assetGallery items (filtered from ${projectData.assetGallery.length} total)`);
    }

    console.log(`ProjectSubworld: Total media objects: ${mediaObjects.length}`);
    return mediaObjects;
  }, [projectData]);

  if (isLoading) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#000000',
        color: '#ffffff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '20px',
            animation: 'spin 1s linear infinite'
          }}>⟳</div>
          <div>Loading {projectName || `project ${projectId}`}...</div>
        </div>
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#000000',
        color: '#ffffff'
      }}>
        <h2>{error || 'Project not found'}</h2>
        <p>Project: {projectName || projectId}</p>
        <button 
          onClick={() => navigate('/')}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Back to Portfolio
        </button>
      </div>
    );
  }

  return (
    <InteractionProvider>
      <MobileControlsProvider>
        <div style={{ width: '100vw', height: '100vh', backgroundColor: '#ffffff' }}>
          <Canvas 
            camera={{ position: [0, 1.7, 15], fov: 75 }}
            style={{ background: '#ffffff' }}
            gl={{
              antialias: false,
              alpha: false,
              powerPreference: "high-performance",
              failIfMajorPerformanceCaveat: false,
              preserveDrawingBuffer: false,
              stencil: false,
              toneMapping: THREE.NoToneMapping
            }}
            onCreated={(state) => {
              // Force white background and disable tone mapping
              state.scene.background = new THREE.Color('#ffffff');
              state.gl.toneMapping = THREE.NoToneMapping;
              state.gl.toneMappingExposure = 1.0;
              
              // Ensure canvas can receive events for crosshair interaction
              state.gl.domElement.style.cursor = 'none';
              state.gl.domElement.tabIndex = 0; // Make canvas focusable for keyboard events
              
              // CRITICAL FIX: Force pointer lock request on first click to align cursor with crosshair
              const handleInitialClick = () => {
                if (!document.pointerLockElement && !isTouchDevice) {
                  state.gl.domElement.requestPointerLock();
                }
              };
              
              // CRITICAL FIX: Handle pointer lock state for proper cursor display (same as main world)
              const handlePointerLockChange = () => {
                const isLocked = document.pointerLockElement === state.gl.domElement;
                if (isLocked) {
                  // When locked, hide cursor completely
                  document.body.style.cursor = 'none';
                  state.gl.domElement.style.cursor = 'none';
                  console.log('🎯 Canvas pointer lock active - cursor hidden');
                } else {
                  // When not locked, show green cursor to indicate where to click  
                  document.body.style.cursor = 'url(/cursors/cursor-green.png), auto';
                  state.gl.domElement.style.cursor = 'url(/cursors/cursor-green.png), auto';
                  console.log('🎯 Canvas pointer lock inactive - green cursor shown');
                }
              };
              
              state.gl.domElement.addEventListener('click', handleInitialClick);
              document.addEventListener('pointerlockchange', handlePointerLockChange);
              
              // Set initial cursor state
              handlePointerLockChange();
              
              // Cleanup
              const canvas = state.gl.domElement;
              return () => {
                canvas.removeEventListener('click', handleInitialClick);
                document.removeEventListener('pointerlockchange', handlePointerLockChange);
              };
            }}
          >
            <Suspense fallback={null}>
              <SceneContent allMediaObjects={allMediaObjects} projectData={projectData} />
            </Suspense>
          </Canvas>

          {/* UI Elements - same as main world */}
          {isTouchDevice && <MobileControls />}
          <BackButton />
          <InteractionButton />
          
          {/* Pointer Lock Status Indicator - only show on desktop when not locked */}
          {!isTouchDevice && !isPointerLocked && (
            <div style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: '#333',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              zIndex: 9999,
              border: '2px solid rgba(77, 255, 170, 0.5)',
              animation: 'pulse 2s infinite',
            }}>
              🎯 Click anywhere to enable crosshair mode
            </div>
          )}
          
          {/* Interaction Cooldown Indicator - shows when interactions are temporarily blocked */}
          {!isTouchDevice && isPointerLocked && (
            <div 
              id="interaction-cooldown-indicator"
              style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                backgroundColor: 'rgba(255, 165, 0, 0.9)',
                color: '#fff',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                zIndex: 9999,
                border: '2px solid rgba(255, 140, 0, 0.7)',
                display: 'none', // Initially hidden, will be shown via JS when needed
                animation: 'pulse 2s infinite',
              }}
            >
              ⏱️ Move mouse to enable interactions
            </div>
          )}
          
          {/* Crosshair for consistent interaction - ALWAYS VISIBLE and PERFECTLY CENTERED */}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 10000,
            display: 'block'
          }}>
            <Crosshair isPointerLocked={isPointerLocked} />
          </div>
          
          {/* DEBUG: Visual center marker to verify crosshair alignment */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            width: '4px',
            height: '4px',
            backgroundColor: 'red',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 99999,
            pointerEvents: 'none',
            opacity: 0.3,
          }} />
          
          {/* DEBUG: Crosshair alignment indicators */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            width: '40px',
            height: '1px',
            backgroundColor: 'rgba(255, 0, 0, 0.3)',
            transform: 'translate(-50%, -50%)',
            zIndex: 99998,
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            width: '1px',
            height: '40px',
            backgroundColor: 'rgba(255, 0, 0, 0.3)',
            transform: 'translate(-50%, -50%)',
            zIndex: 99998,
            pointerEvents: 'none',
          }} />
        </div>
      </MobileControlsProvider>
    </InteractionProvider>
  );
};

export default ProjectSubworld; 