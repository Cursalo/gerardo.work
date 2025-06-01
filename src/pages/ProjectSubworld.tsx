import React, { useEffect, useState, Suspense, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, Text, RoundedBox } from '@react-three/drei';
import { projectDataService, ProjectData } from '../services/projectDataService';
import { WorldObject } from '../data/worlds';
import * as THREE from 'three';
import FirstPersonCamera from '../components/FirstPersonCamera';
import { MobileControlsProvider } from '../context/MobileControlsContext';
import { InteractionProvider } from '../context/InteractionContext';
import MobileControls from '../components/MobileControls';
import useMobileDetection from '../hooks/useMobileDetection';
import useFirstPersonInteractions from '../hooks/useFirstPersonInteractions';
import BackButton from '../components/BackButton';

interface ProjectSubworldProps {}

// Define MediaCardProps at the top level
interface MediaCardProps {
  mediaObject: any;
}

type TextureQuality = 'placeholder' | 'loading_placeholder' | 'loaded_placeholder' | 'loading_full' | 'loaded_full' | 'error';

// Move utility functions outside component to prevent re-creation
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

// Smart aspect ratio defaults based on content type and filename
const getDefaultAspectRatio = (url: string, type: string): number => {
  const filename = url?.toLowerCase() || '';
  
  if (type === 'pdf') return 0.67; // Portrait for PDFs
  if (filename.includes('card') || filename.includes('poster')) return 0.67; // Portrait
  if (filename.includes('logo') || filename.includes('icon')) return 1.0; // Square
  if (filename.includes('banner') || filename.includes('header')) return 2.5; // Wide banner
  return 1.77; // Default to 16:9 if not specified, common for videos/images
};

// Simple URL normalization for production
const normalizeUrl = (url: string): string => {
  if (!url) return '';
  if (window.location.hostname === 'gerardo.work' && !url.startsWith('http')) {
    return `https://www.gerardo.work${url}`;
  }
  return url;
};

// Performance-optimized MediaCard with proper orientation and rounded corners
const MediaCard: React.FC<MediaCardProps> = ({ mediaObject }) => {
  const [hovered, setHovered] = useState(false);
  const [currentTexture, setCurrentTexture] = useState<THREE.Texture | null>(null);
  const [textureQuality, setTextureQuality] = useState<TextureQuality>('loading_placeholder');
  const [aspectRatio, setAspectRatio] = useState(1.77); // Default 16:9, will be updated when image loads
  const [isVisible, setIsVisible] = useState(true); // Start visible for gallery
  
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  // Memoize URLs and title
  const placeholderUrl = useMemo(() => mediaObject.thumbnail || mediaObject.url, [mediaObject.thumbnail, mediaObject.url]);
  const fullResUrl = useMemo(() => mediaObject.url, [mediaObject.url]);
  const displayTitle = useMemo(() => {
    return mediaObject.title || mediaObject.name || getFilenameFromUrl(mediaObject.url);
  }, [mediaObject.title, mediaObject.name, mediaObject.url]);

  // Performance: Check visibility and distance (more generous for gallery)
  useFrame(() => {
    if (!groupRef.current || !camera) return;
    
    const distance = camera.position.distanceTo(groupRef.current.position);
    const wasVisible = isVisible;
    const shouldBeVisible = distance < 100; // Increased range for gallery viewing
    
    if (shouldBeVisible !== wasVisible) {
      setIsVisible(shouldBeVisible);
    }
  });

  // Optimized texture loading - only when visible
  useEffect(() => {
    if (!isVisible) return;
    
    let isActive = true;
    const loader = new THREE.TextureLoader();

    const loadTexture = async (urlToLoad: string, isPlaceholder: boolean) => {
      if (!urlToLoad || !isActive) return;
      
      const actualUrlToLoad = normalizeUrl(urlToLoad);
      
      try {
        const loadedTex = await new Promise<THREE.Texture>((resolve, reject) => {
          loader.load(actualUrlToLoad, resolve, undefined, reject);
        });

        if (!isActive) {
          loadedTex.dispose();
          return;
        }

        // Configure texture for clean appearance
        loadedTex.minFilter = THREE.LinearFilter;
        loadedTex.magFilter = THREE.LinearFilter;
        loadedTex.generateMipmaps = false;
        loadedTex.flipY = false;
        loadedTex.wrapS = THREE.ClampToEdgeWrapping;
        loadedTex.wrapT = THREE.ClampToEdgeWrapping;

        // Update aspect ratio from actual image dimensions
        if (loadedTex.image && loadedTex.image.width && loadedTex.image.height) {
          const newAR = loadedTex.image.width / loadedTex.image.height;
          if (newAR && !isNaN(newAR) && isFinite(newAR) && newAR > 0.1 && newAR < 10) {
            setAspectRatio(newAR);
          }
        }

        setCurrentTexture(loadedTex);
        setTextureQuality(isPlaceholder ? 'loaded_placeholder' : 'loaded_full');

      } catch (err) {
        if (!isActive) return;
        setTextureQuality('error');
      }
    };

    // Progressive loading: placeholder first, then full res
    if (textureQuality === 'loading_placeholder') {
      loadTexture(placeholderUrl, true);
    } else if (textureQuality === 'loaded_placeholder' && fullResUrl !== placeholderUrl) {
      setTimeout(() => loadTexture(fullResUrl, false), 100); // Small delay for performance
    }
    
    return () => {
      isActive = false;
      if (currentTexture) {
        setTimeout(() => currentTexture.dispose(), 100);
      }
    };
  }, [isVisible, textureQuality, placeholderUrl, fullResUrl]);

  // Calculate dimensions based on aspect ratio
  const baseSize = 3.0;
  const cardWidth = baseSize * Math.min(aspectRatio, 2.5); // Cap max width
  const cardHeight = baseSize / Math.max(aspectRatio / 2.5, 1); // Cap max height
  const cardDepth = 0.05;

  // Smooth floating animation
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      const baseY = mediaObject.position[1] || 3;
      const floatOffset = Math.sin(time * 0.3 + (mediaObject.id?.length || 0) * 0.2) * 0.2;
      groupRef.current.position.y = baseY + floatOffset;
      
      // Smooth scale on hover
      const targetScale = hovered ? 1.1 : 1.0;
      const currentScale = groupRef.current.scale.x;
      const newScale = currentScale + (targetScale - currentScale) * 0.1;
      groupRef.current.scale.setScalar(newScale);
    }
  });

  const handleClick = () => {
    if (mediaObject.url) {
      window.open(mediaObject.url, '_blank');
    }
  };

  // Don't render if not visible (performance optimization)
  if (!isVisible) {
    return null;
  }

  return (
    <group 
      ref={groupRef}
      position={mediaObject.position || [0, 3, 0]}
      rotation={mediaObject.rotation || [0, 0, 0]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
    >
      {/* Rounded card with proper orientation */}
      <RoundedBox
        ref={meshRef}
        args={[cardWidth, cardHeight, cardDepth]}
        radius={0.05}
        smoothness={8}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          map={currentTexture}
          transparent={false}
          side={THREE.FrontSide}
          color={textureQuality === 'error' ? '#ff6b6b' : '#ffffff'}
          metalness={0.1}
          roughness={0.2}
          envMapIntensity={0.5}
        />
      </RoundedBox>

      {/* Clean title with better visibility */}
      <Text
        position={[0, -cardHeight/2 - 0.4, 0]}
        fontSize={0.2}
        color="#333333"
        anchorX="center"
        anchorY="top"
        maxWidth={cardWidth}
        font="/fonts/Inter-Regular.woff"
      >
        {displayTitle}
      </Text>

      {/* Subtle glow effect on hover */}
      {hovered && (
        <RoundedBox
          args={[cardWidth + 0.1, cardHeight + 0.1, cardDepth + 0.02]}
          radius={0.06}
          smoothness={8}
          position={[0, 0, -0.01]}
        >
          <meshBasicMaterial 
            color="#4facfe" 
            transparent 
            opacity={0.3}
            side={THREE.BackSide}
          />
        </RoundedBox>
      )}

      {/* Loading state */}
      {textureQuality === 'loading_placeholder' && (
        <Html position={[0, 0, cardDepth + 0.1]} center>
          <div style={{
            color: '#666',
            fontSize: '14px',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.9)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontFamily: 'system-ui'
          }}>
            Loading...
          </div>
        </Html>
      )}
    </group>
  );
};

// Scene content component for first-person integration
const SceneContent: React.FC<{ allMediaObjects: any[], projectData: ProjectData }> = ({ allMediaObjects, projectData }) => {
  // Register FP interaction hook
  useFirstPersonInteractions();
  
  // Create striped floor texture
  const floorTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Base white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 512);
    
    // Subtle gray stripes
    ctx.fillStyle = '#f8f8f8';
    for (let i = 0; i < 512; i += 32) {
      ctx.fillRect(i, 0, 16, 512);
      ctx.fillRect(0, i, 512, 16);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(50, 50);
    
    return texture;
  }, []);

  return (
    <>
      {/* Clean, bright lighting for gallery-like feel */}
      <ambientLight color="#ffffff" intensity={0.8} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={0.6}
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
      <Environment preset="studio" background />
      
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

      {/* Clean white floor with subtle stripes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial 
          map={floorTexture}
          color="#ffffff"
          roughness={0.8}
          metalness={0.0}
        />
      </mesh>

      {/* Project title - dark text for white background */}
      <Text
        position={[0, 4, -5]}
        fontSize={0.5}
        color="#333333"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Regular.woff"
      >
        {projectData.name}
      </Text>

      {/* Subtitle with media count - dark text */}
      <Text
        position={[0, 3.3, -5]}
        fontSize={0.2}
        color="#666666"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Regular.woff"
      >
        {allMediaObjects.length} media object{allMediaObjects.length !== 1 ? 's' : ''}
      </Text>

      {/* Render all media objects - progressive loading will handle performance */}
      {allMediaObjects.map((mediaObj, index) => (
        <MediaCard key={mediaObj.id || index} mediaObject={mediaObj} />
      ))}

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
};

const ProjectSubworld: React.FC<ProjectSubworldProps> = () => {
  const { projectId, projectName } = useParams<{ projectId?: string; projectName?: string }>();
  const navigate = useNavigate();
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get mobile detection
  const { isMobile, isTouchDevice } = useMobileDetection();

  useEffect(() => {
    const loadProject = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        let project: ProjectData | null = null;
        
        // Try to load by project name first (from /projects/:projectName route)
        if (projectName) {
          console.log(`ProjectSubworld: Loading project by name: ${projectName}`);
          project = await projectDataService.getProjectByName(projectName);
        }
        // Then try by project ID
        else if (projectId) {
          console.log(`ProjectSubworld: Loading project by ID: ${projectId}`);
          const id = parseInt(projectId, 10);
          if (!isNaN(id)) {
            project = await projectDataService.getProjectById(id);
          }
        }
        
        if (project) {
          console.log('ProjectSubworld: Loaded project data:', project);
          console.log('ProjectSubworld: Project mediaObjects:', project.mediaObjects);
          console.log('ProjectSubworld: Project assetGallery:', project.assetGallery);
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

  // Clean white gallery environment
  const backgroundColor = '#ffffff';

  // Combine mediaObjects and assetGallery into a single array
  const allMediaObjects = [];
  
  // Add mediaObjects (positioned media)
  if (projectData.mediaObjects && projectData.mediaObjects.length > 0) {
    allMediaObjects.push(...projectData.mediaObjects);
    console.log(`ProjectSubworld: Added ${projectData.mediaObjects.length} mediaObjects`);
  }
  
  // Add assetGallery items (auto-positioned)
  if (projectData.assetGallery && projectData.assetGallery.length > 0) {
    const galleryObjects = projectData.assetGallery.map((asset, index) => {
      // Create beautiful randomized positioning for a frutiger space aesthetic
      const totalAssets = projectData.assetGallery!.length;
      
      // Generate deterministic but varied positions based on asset index
      const seededRandom = (seed: number, min: number, max: number): number => {
        const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
        return min + (max - min) * (x - Math.floor(x));
      };
      
      // Create BEAUTIFUL floating gallery with proper spacing
      const clusterCount = Math.max(4, Math.ceil(totalAssets / 6)); // Create clusters of ~6 items each for better spacing
      const currentCluster = index % clusterCount;
      
      // Base cluster positions in a MUCH LARGER circle for proper gallery feel
      const clusterAngle = (currentCluster / clusterCount) * Math.PI * 2;
      const clusterRadius = 40 + (clusterCount * 8); // DRAMATICALLY increased radius for proper spacing
      const clusterX = Math.cos(clusterAngle) * clusterRadius;
      const clusterZ = Math.sin(clusterAngle) * clusterRadius;
      
      // Add GENEROUS organic randomization within each cluster
      const inClusterIndex = Math.floor(index / clusterCount);
      const randomX = seededRandom(index * 7 + 123, -20, 20); // MUCH larger random spread for breathing room
      const randomZ = seededRandom(index * 11 + 456, -20, 20);
      const randomY = seededRandom(index * 13 + 789, 2, 8); // Higher floating heights for dramatic effect
      
      // Create EXPANDED spiral-like distribution within clusters
      const spiralRadius = 8 + (inClusterIndex * 3); // MUCH larger spiral for proper spacing
      const spiralAngle = inClusterIndex * 2.3; // Golden ratio-ish angle for natural distribution
      const spiralX = Math.cos(spiralAngle) * spiralRadius;
      const spiralZ = Math.sin(spiralAngle) * spiralRadius;
      
      const position: [number, number, number] = [
        clusterX + spiralX + randomX * 0.5, // Combine cluster, spiral, and random
        randomY,
        clusterZ + spiralZ + randomZ * 0.5
      ];
      
      // Randomize rotation for more organic look (KEEP MINIMAL - NO TILTING)
      const randomRotationY = seededRandom(index * 17 + 234, -0.3, 0.3); // Reduced rotation range
      
      // Varied scales for visual interest
      const scaleVariation = seededRandom(index * 23 + 890, 0.8, 1.3);
      
      // Extract filename for title
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
        thumbnail: asset.url,
        position,
        rotation: [0, randomRotationY, 0] as [number, number, number], // Only Y rotation, no tilting
        scale: [4.0 * scaleVariation, 2.5 * scaleVariation, 0.1] as [number, number, number]
      };
    });
    
    allMediaObjects.push(...galleryObjects);
    console.log(`ProjectSubworld: Added ${galleryObjects.length} assetGallery items with organic positioning`);
  }

  console.log(`ProjectSubworld: Total media objects to render: ${allMediaObjects.length}`);

  return (
    <InteractionProvider>
      <MobileControlsProvider>
        <div style={{ width: '100vw', height: '100vh', backgroundColor }}>
          <Canvas 
            camera={{ position: [0, 1.7, 15], fov: 75 }}
            style={{ background: backgroundColor }}
            gl={{
              antialias: false, // Disable antialiasing to save memory
              alpha: false,
              powerPreference: "high-performance",
              failIfMajorPerformanceCaveat: false,
              preserveDrawingBuffer: false
            }}
            onCreated={(state) => {
              // Set white background
              state.scene.background = new THREE.Color('#ffffff');
              
              // WebGL context recovery
              const gl = state.gl.getContext();
              const handleContextLost = (event: any) => {
                event.preventDefault();
                console.warn('🚨 WebGL context lost - attempting recovery');
              };
              
              const handleContextRestored = () => {
                console.log('✅ WebGL context restored');
                // Force reload textures
                window.location.reload();
              };
              
              gl.canvas.addEventListener('webglcontextlost', handleContextLost);
              gl.canvas.addEventListener('webglcontextrestored', handleContextRestored);
            }}
          >
            <Suspense fallback={null}>
              <SceneContent allMediaObjects={allMediaObjects} projectData={projectData} />
            </Suspense>
          </Canvas>

          {/* UI Elements Rendered Separately - same as main world */}
          {isTouchDevice && <MobileControls />}
          <BackButton />
        </div>
      </MobileControlsProvider>
    </InteractionProvider>
  );
};

export default ProjectSubworld; 