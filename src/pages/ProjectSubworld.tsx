import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html, Text } from '@react-three/drei';
import { projectDataService, ProjectData } from '../services/projectDataService';
import { WorldObject } from '../data/worlds';
import * as THREE from 'three';

interface ProjectSubworldProps {}

// Enhanced MediaCard component that handles different media types
const MediaCard: React.FC<{ mediaObject: any; }> = ({ mediaObject }) => {
  const [hovered, setHovered] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const aspectRatio = 1.5; // Static aspect ratio for simplicity
  const navigate = useNavigate();
  
  // Add refs for animation and geometry updates
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.BoxGeometry>(null);
  const [isVisible, setIsVisible] = useState(false);
  
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
    
    // Known portrait formats
    if (filename.includes('card') || filename.includes('poster') || type === 'pdf') {
      return 0.67; // Portrait
    }
    
    // Known square formats  
    if (filename.includes('logo') || filename.includes('icon')) {
      return 1.0; // Square
    }
    
    // Wide formats
    if (filename.includes('banner') || filename.includes('header')) {
      return 2.5; // Wide banner
    }
    
    // Default landscape
    return 1.5; // Slightly wider than 4:3
  };
  
  // Get fallback URL (WebP -> original format)
  const getFallbackUrl = (originalUrl: string): string => {
    if (!originalUrl) return '';
    
    // Normalize URL for production (handle www subdomain)
    let normalizedUrl = originalUrl;
    if (window.location.hostname === 'gerardo.work' && !normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://www.gerardo.work${normalizedUrl}`;
    } else if (!normalizedUrl.startsWith('http') && normalizedUrl.startsWith('/')) {
      // For local development, use relative URLs
      normalizedUrl = normalizedUrl;
    }
    
    // If it's already WebP and WebP isn't supported, try to find original
    if (normalizedUrl.includes('.webp') && !supportsWebP) {
      // Try common original formats
      const baseUrl = normalizedUrl.replace('.webp', '');
      const possibleExtensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
      
      // For now, try .jpg as most common fallback
      return baseUrl + '.jpg';
    }
    
    return normalizedUrl;
  };
  
  // Simple URL normalization for production
  const normalizeUrl = (url: string): string => {
    if (!url) return '';
    
    // If we're on production and URL is relative, make it absolute with www
    if (window.location.hostname === 'gerardo.work' && !url.startsWith('http')) {
      return `https://www.gerardo.work${url}`;
    }
    
    return url;
  };
  
  // Removed complex initialization - using static values
  
  // Check visibility on mount and load important textures first
  useEffect(() => {
    const isImportantMedia = ['video', 'html'].includes(mediaObject.type) || !mediaObject.id?.startsWith('asset-');
    if (isImportantMedia) {
      setIsVisible(true); // Load important media immediately
    } else {
      // Gallery items load after a delay
      const visibilityTimer = setTimeout(() => setIsVisible(true), Math.random() * 3000 + 1000);
      return () => clearTimeout(visibilityTimer);
    }
  }, []);

  // SMART texture loading with memory management
  useEffect(() => {
    if (!mediaObject.url || !isVisible) return;
    
    setIsLoading(true);
    setError(false);
    
    // Add delay for gallery items to prevent WebGL context loss
    const isGalleryItem = mediaObject.id?.startsWith('asset-');
    const loadDelay = isGalleryItem ? Math.random() * 2000 : 0; // Random delay up to 2 seconds
    
    const loadTexture = () => {
      const loader = new THREE.TextureLoader();
      const textureUrl = normalizeUrl(mediaObject.url);
      
      loader.load(
        textureUrl,
        (loadedTexture) => {
          // Aggressive texture optimization for WebGL stability
          loadedTexture.minFilter = THREE.LinearFilter;
          loadedTexture.magFilter = THREE.LinearFilter;
          loadedTexture.generateMipmaps = false;
          loadedTexture.flipY = false;
          
          // Reduce texture size for gallery items to save memory
          if (isGalleryItem) {
            loadedTexture.format = THREE.RGBFormat; // Use less memory
          }
          
          setTexture(loadedTexture);
          setIsLoading(false);
          console.log(`✅ Loaded texture: ${displayTitle}`);
        },
        undefined,
        (error) => {
          console.warn(`⚠️ Failed to load texture: ${displayTitle}`, error);
          setError(true);
          setIsLoading(false);
        }
      );
    };
    
    // Delayed loading for gallery items
    const timeoutId = setTimeout(loadTexture, loadDelay);
    
    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      if (texture) {
        texture.dispose();
        console.log(`🗑️ Disposed texture: ${displayTitle}`);
      }
    };
  }, [mediaObject.url]);
  
  // Simple static dimensions - no dynamic updates
  const baseWidth = isMobile ? 2.5 : 3.0;
  const baseHeight = baseWidth / aspectRatio;
  const finalWidth = baseWidth;
  const finalHeight = baseHeight;

  // Simplified animation 
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      
      // Simple floating motion
      const baseY = mediaObject.position[1] || 2;
      groupRef.current.position.y = baseY + Math.sin(time * 0.5) * 0.1;
      
      // Simple hover scale
      if (hovered) {
        groupRef.current.scale.setScalar(1.05);
      } else {
        groupRef.current.scale.setScalar(1.0);
      }
    }
  });

  const handleClick = () => {
    console.log('MediaCard clicked:', mediaObject);
    
    // Handle different click actions based on media type
    if (mediaObject.type === 'video' && mediaObject.url) {
      window.open(mediaObject.url, '_blank');
    } else if (mediaObject.type === 'image' && mediaObject.url) {
      window.open(mediaObject.url, '_blank');
    } else if (mediaObject.type === 'html' && mediaObject.url) {
      window.open(mediaObject.url, '_blank');
    } else if (mediaObject.type === 'pdf' && mediaObject.url) {
      window.open(mediaObject.url, '_blank');
    } else if (mediaObject.url) {
      window.open(mediaObject.url, '_blank');
    }
  };

  // Apply custom scale if provided, otherwise use calculated dimensions
  const scale = mediaObject.scale || [1, 1, 0.1];
  const position = mediaObject.position || [0, 2, 0];
  const rotation = mediaObject.rotation || [0, 0, 0];

  return (
    <group 
      ref={groupRef}
      position={position} 
      rotation={[rotation[0], rotation[1], rotation[2]]}
      scale={scale}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Main card mesh with simple geometry */}
      <mesh ref={meshRef}>
        <boxGeometry args={[finalWidth, finalHeight, 0.05]} />
        <meshStandardMaterial 
          map={texture} 
          color={error ? "#ff6b6b" : "#ffffff"}
          emissive={hovered ? "#333333" : "#000000"}
          emissiveIntensity={hovered ? 0.15 : 0}
          metalness={0.1}
          roughness={0.7}
        />
      </mesh>
      
      {/* Enhanced glow effect when hovered */}
      {hovered && (
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[finalWidth * 1.1, finalHeight * 1.1, 0.02]} />
          <meshBasicMaterial 
            color="#4CAF50" 
            transparent 
            opacity={0.4}
          />
        </mesh>
      )}
      
      {/* Title text using filename */}
      <Text
        position={[0, -finalHeight * 0.65, 0.03]}
        fontSize={0.08}
        color={hovered ? "#ffffff" : "#495057"}
        anchorX="center"
        anchorY="middle"
        maxWidth={finalWidth * 0.9}
      >
        {displayTitle}
      </Text>
      
      {/* Type indicator */}
      <Text
        position={[finalWidth * 0.38, finalHeight * 0.38, 0.03]}
        fontSize={0.045}
        color={hovered ? "#28a745" : "#6c757d"}
        anchorX="center"
        anchorY="middle"
      >
        {mediaObject.type?.toUpperCase() || 'MEDIA'}
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

          {/* Render media objects as 3D cards - LIMIT for performance */}
          {allMediaObjects.slice(0, 30).map((mediaObj, index) => (
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