import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html, Text } from '@react-three/drei';
import { projectDataService, ProjectData } from '../services/projectDataService';
import { WorldObject } from '../data/worlds';
import * as THREE from 'three';

interface ProjectSubworldProps {}

// Define MediaCardProps at the top level
interface MediaCardProps {
  mediaObject: any;
}

type TextureQuality = 'placeholder' | 'loading_placeholder' | 'loaded_placeholder' | 'loading_full' | 'loaded_full' | 'error';

// Enhanced MediaCard component that handles different media types
const MediaCard: React.FC<MediaCardProps> = ({ mediaObject }) => {
  const [hovered, setHovered] = useState(false);
  const [currentTexture, setCurrentTexture] = useState<THREE.Texture | null>(null);
  const [textureQuality, setTextureQuality] = useState<TextureQuality>('loading_placeholder');
  const [aspectRatio, setAspectRatio] = useState(1.5); // Initial default, will update
  const navigate = useNavigate();
  
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [isVisibleForFullLoad, setIsVisibleForFullLoad] = useState(false);

  const placeholderUrl = mediaObject.thumbnail || mediaObject.url; // Prioritize thumbnail if available
  const fullResUrl = mediaObject.url;

  // Detect mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // WebP browser support detection
  const supportsWebP = (() => {
    try {
      return document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (err) {
      return false;
    }
  })();

  // Extract filename from URL to use as title
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

  // Get the display title - use filename if no title is provided
  const displayTitle = mediaObject.title || mediaObject.name || getFilenameFromUrl(mediaObject.url);

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

  // Initialize aspect ratio based on media type/url
  useEffect(() => {
    setAspectRatio(getDefaultAspectRatio(mediaObject.url || mediaObject.thumbnail, mediaObject.type));
  }, [mediaObject.url, mediaObject.thumbnail, mediaObject.type]);
  
  // Determine when to trigger full resolution load
  useEffect(() => {
    const isImportantMedia = ['video', 'html'].includes(mediaObject.type) || !mediaObject.id?.startsWith('asset-');
    if (isImportantMedia) {
      setIsVisibleForFullLoad(true);
    } else {
      const visibilityTimer = setTimeout(() => setIsVisibleForFullLoad(true), Math.random() * 2000 + 500); // Shorter delay
      return () => clearTimeout(visibilityTimer);
    }
  }, [mediaObject.type, mediaObject.id]);

  // Progressive Texture Loading (Placeholder -> Full Resolution)
  useEffect(() => {
    let isActive = true;
    const loader = new THREE.TextureLoader();

    // Determine if media is critical for initial load (used for texture format optimization)
    const isImportantMedia = ['video', 'html'].includes(mediaObject.type) || !mediaObject.id?.startsWith('asset-');

    const loadAndSetTexture = (urlToLoad: string, targetQuality: TextureQuality, successQuality: TextureQuality, isPlaceholder: boolean) => {
      if (!urlToLoad) {
        if (isActive) setTextureQuality('error');
        return;
      }
      if (isActive) setTextureQuality(targetQuality);

      const actualUrlToLoad = normalizeUrl(urlToLoad);
      
      console.log(`🔄 (${displayTitle}) Loading ${isPlaceholder ? 'Placeholder' : 'FullRes'}: ${actualUrlToLoad}`);

      loader.load(
        actualUrlToLoad,
        (loadedTex) => {
          if (!isActive) {
            loadedTex.dispose();
            return;
          }
          loadedTex.minFilter = THREE.LinearFilter;
          loadedTex.magFilter = THREE.LinearFilter;
          loadedTex.generateMipmaps = false;
          loadedTex.flipY = false; // Usually true for image textures, ensure consistency

          // For placeholders or if WebGL performance is a concern, reduce format
          if (isPlaceholder || (mediaObject.id?.startsWith('asset-') && !isImportantMedia)) {
             loadedTex.format = THREE.RGBFormat; // Saves memory
          }
          
          // Update aspect ratio based on loaded texture (if it's an image and not a placeholder from thumbnail)
          if (mediaObject.type === 'image' && !isPlaceholder && loadedTex.image) {
            const newAR = loadedTex.image.width / loadedTex.image.height;
            if (newAR && !isNaN(newAR) && isFinite(newAR)) {
              setAspectRatio(newAR);
              console.log(`📐 (${displayTitle}) Aspect ratio updated to: ${newAR.toFixed(2)}`);
            }
          }

          setCurrentTexture(loadedTex);
          setTextureQuality(successQuality);
          console.log(`✅ (${displayTitle}) Loaded ${isPlaceholder ? 'Placeholder' : 'FullRes'}`);
        },
        undefined, // onProgress callback
        (err) => {
          if (!isActive) return;
          console.warn(`⚠️ (${displayTitle}) Failed to load ${isPlaceholder ? 'Placeholder' : 'FullRes'} from ${actualUrlToLoad}:`, err);
          setTextureQuality('error');
        }
      );
    };

    // Stage 1: Load Placeholder
    if (textureQuality === 'loading_placeholder') {
      loadAndSetTexture(placeholderUrl, 'loading_placeholder', 'loaded_placeholder', true);
    }

    // Stage 2: Load Full Resolution (if ready and different from placeholder)
    if (textureQuality === 'loaded_placeholder' && isVisibleForFullLoad && fullResUrl && fullResUrl !== placeholderUrl) {
      loadAndSetTexture(fullResUrl, 'loading_full', 'loaded_full', false);
    } else if (textureQuality === 'loaded_placeholder' && isVisibleForFullLoad && (!fullResUrl || fullResUrl === placeholderUrl)) {
      // If placeholder is the only/best URL, consider it loaded_full
      if (isActive) setTextureQuality('loaded_full');
    }
    
    return () => {
      isActive = false;
      if (currentTexture) {
        currentTexture.dispose();
        console.log(`🗑️ (${displayTitle}) Disposed texture on unmount/change.`);
      }
    };
  }, [mediaObject.url, mediaObject.thumbnail, displayTitle, textureQuality, isVisibleForFullLoad, placeholderUrl, fullResUrl, mediaObject.type, mediaObject.id]);
  
  // Base dimensions, will be scaled by aspectRatio
  const baseDimension = isMobile ? 2.0 : 2.5; // Smaller base for mobile
  const finalHeight = baseDimension;
  const finalWidth = baseDimension * aspectRatio;

  // Simplified animation 
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      const baseY = mediaObject.position[1] || 2;
      groupRef.current.position.y = baseY + Math.sin(time * 0.5 + (mediaObject.id?.length || 0) * 0.1) * 0.1; // Add slight variation
      
      if (hovered) {
        groupRef.current.scale.setScalar(1.05);
      } else {
        groupRef.current.scale.setScalar(1.0);
      }
    }
  });

  const handleClick = () => {
    console.log('MediaCard clicked:', mediaObject, `Current URL: ${normalizeUrl(mediaObject.url)}`);
    const targetUrl = normalizeUrl(mediaObject.url);
    if (targetUrl) {
      window.open(targetUrl, '_blank');
    }
  };

  // Apply custom scale if provided, otherwise use calculated dimensions for the card itself
  const objectScale = mediaObject.scale || [1, 1, 1]; // This scale is for the group

  const showLoadingIndicator = textureQuality === 'loading_placeholder' || textureQuality === 'loading_full';
  const showErrorIndicator = textureQuality === 'error';

  return (
    <group 
      ref={groupRef}
      position={mediaObject.position || [0, 2, 0]} 
      rotation={mediaObject.rotation || [0, 0, 0]}
      scale={objectScale} // Use the scale from project.json for the group
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh ref={meshRef}>
        <boxGeometry args={[finalWidth, finalHeight, 0.05]} />
        <meshStandardMaterial 
          map={currentTexture} 
          color={textureQuality === 'error' ? "#ff6b6b" : (showLoadingIndicator ? "#555555" : "#ffffff")}
          emissive={hovered ? "#444444" : "#000000"} // Slightly brighter emissive
          emissiveIntensity={hovered ? 0.2 : 0}
          metalness={0.2} // A bit more metallic
          roughness={0.6} // A bit less rough
          transparent={showLoadingIndicator}
          opacity={showLoadingIndicator ? 0.7 : 1.0}
        />
      </mesh>
      
      {hovered && (
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[finalWidth * 1.05, finalHeight * 1.05, 0.02]} />
          <meshBasicMaterial color="#66bb6a" transparent opacity={0.3} />
        </mesh>
      )}
      
      <Text
        position={[0, -finalHeight * 0.6, 0.03]} // Adjusted Y position
        fontSize={Math.min(finalWidth, finalHeight) * 0.08} // Responsive font size
        color={hovered ? "#f0f0f0" : "#cccccc"}
        anchorX="center"
        anchorY="middle"
        maxWidth={finalWidth * 0.9}
        outlineWidth={0.002}
        outlineColor="#222222"
      >
        {displayTitle}
      </Text>
      
      {/* Type/Status indicator */}
      <Text
        position={[finalWidth * 0.45, finalHeight * 0.45, 0.03]} // Corner
        fontSize={Math.min(finalWidth, finalHeight) * 0.04} // Smaller responsive font
        color={showErrorIndicator ? "#ff8a80" : (showLoadingIndicator ? "#ffeb3b" : "#a0a0a0")}
        anchorX="right"
        anchorY="top"
      >
        {showErrorIndicator ? "ERROR" : (showLoadingIndicator ? "LOADING..." : mediaObject.type?.toUpperCase() || 'MEDIA')}
      </Text>
    </group>
  );
};

const ProjectSubworld: React.FC<ProjectSubworldProps> = () => {
  const { projectId, projectName } = useParams<{ projectId?: string; projectName?: string }>();
  const navigate = useNavigate();
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Detect mobile device for responsive rendering
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

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

  // Ensure THREE is available for gl settings if not already
  useEffect(() => {
    if (typeof THREE === 'undefined') {
      console.error("THREE is not defined globally for ProjectSubworld gl settings!");
    }
  }, []);

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

  // Apply world settings from project data
  const worldSettings = projectData.worldSettings || {};
  const backgroundColor = (worldSettings as any).backgroundColor || '#1a1a1a';
  const ambientIntensity = (worldSettings as any).ambientLightIntensity || 0.6;
  const directionalIntensity = (worldSettings as any).directionalLightIntensity || 1.0;

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
      // REMOVE tilting rotations - keep cards straight
      
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
    <div style={{ width: '100vw', height: '100vh', backgroundColor }}>
      <Canvas 
        camera={{ position: [0, 15, 60], fov: 90 }}
        style={{ background: backgroundColor }}
        gl={{
          antialias: false, // Disable antialiasing to save memory
          alpha: false,
          powerPreference: "high-performance",
          failIfMajorPerformanceCaveat: false,
          preserveDrawingBuffer: false
        }}
        onCreated={(state) => {
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
          {/* Lighting based on project settings */}
          <ambientLight 
            color={(worldSettings as any).ambientLightColor || '#ffffff'} 
            intensity={ambientIntensity} 
          />
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={directionalIntensity}
            color={(worldSettings as any).directionalLightColor || '#ffffff'}
            castShadow
          />

          {/* Environment */}
          <Environment preset="studio" />

          {/* Floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial 
              color={(worldSettings as any).floorColor || '#333333'} 
            />
          </mesh>

          {/* Project title */}
          <Text
            position={[0, 4, -5]}
            fontSize={0.5}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {projectData.name}
          </Text>

          {/* Subtitle with media count */}
          <Text
            position={[0, 3.3, -5]}
            fontSize={0.2}
            color="#cccccc"
            anchorX="center"
            anchorY="middle"
          >
            {allMediaObjects.length} media object{allMediaObjects.length !== 1 ? 's' : ''}
          </Text>

          {/* Back button */}
          <group position={[-8, 3, 0]} onClick={() => navigate('/')}>
            <mesh>
              <boxGeometry args={[1.5, 0.5, 0.1]} />
              <meshStandardMaterial color="#ff5555" />
            </mesh>
            <Text
              position={[0, 0, 0.06]}
              fontSize={0.15}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
            >
              ← Back
            </Text>
          </group>

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

          <OrbitControls 
            enableZoom 
            enablePan 
            enableRotate 
            minDistance={10}
            maxDistance={200}
            target={[0, 5, 0]}
          />

        </Suspense>
      </Canvas>
    </div>
  );
};

export default ProjectSubworld; 