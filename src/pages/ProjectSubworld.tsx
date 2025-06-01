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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1.67); // Default 16:9 aspect ratio
  const [dimensions, setDimensions] = useState({ width: 2.0, height: 1.2 });
  const navigate = useNavigate();
  
  // Add refs for animation
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Detect mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
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
  
  // Update dimensions when aspect ratio changes
  useEffect(() => {
    const baseWidth = isMobile ? 1.8 : 2.2; // Slightly smaller on mobile
    const baseHeight = baseWidth / aspectRatio;
    const maxHeight = isMobile ? 2.5 : 3.0; // Lower max height on mobile
    const finalHeight = Math.min(baseHeight, maxHeight);
    const finalWidth = finalHeight * aspectRatio;
    
    setDimensions({ width: finalWidth, height: finalHeight });
    console.log(`Updated dimensions for ${displayTitle}: ${finalWidth.toFixed(2)}x${finalHeight.toFixed(2)} (AR: ${aspectRatio.toFixed(2)})`);
  }, [aspectRatio, displayTitle, isMobile]);
  
  useEffect(() => {
    const loadTextureWithAspectRatio = async () => {
      setIsLoading(true);
      setError(false);
      
      try {
        let textureUrl = '';
        let shouldDetectAspectRatio = false;
        
        // Handle different media types with proper URLs and placeholders
        if (mediaObject.type === 'image') {
          textureUrl = mediaObject.url || mediaObject.thumbnail;
          shouldDetectAspectRatio = true;
        } else if (mediaObject.type === 'video') {
          textureUrl = mediaObject.thumbnail || mediaObject.url;
          shouldDetectAspectRatio = !!mediaObject.thumbnail;
        } else if (mediaObject.type === 'pdf') {
          if (mediaObject.thumbnail) {
            textureUrl = mediaObject.thumbnail;
            shouldDetectAspectRatio = true;
          } else {
            // Create PDF placeholder with correct aspect ratio
            textureUrl = 'data:image/svg+xml;base64,' + btoa(`
              <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="600" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
                <rect x="40" y="80" width="320" height="4" fill="#6c757d" rx="2"/>
                <rect x="40" y="100" width="280" height="4" fill="#6c757d" rx="2"/>
                <rect x="40" y="120" width="300" height="4" fill="#6c757d" rx="2"/>
                <rect x="40" y="160" width="250" height="4" fill="#6c757d" rx="2"/>
                <rect x="40" y="180" width="290" height="4" fill="#6c757d" rx="2"/>
                <circle cx="200" cy="300" r="40" fill="#dc3545" opacity="0.1"/>
                <text x="200" y="280" text-anchor="middle" font-family="Arial" font-size="16" fill="#dc3545" font-weight="bold">PDF</text>
                <text x="200" y="320" text-anchor="middle" font-family="Arial" font-size="12" fill="#6c757d">Document</text>
              </svg>
            `);
            setAspectRatio(400 / 600);
          }
        } else if (mediaObject.type === 'html') {
          if (mediaObject.thumbnail) {
            textureUrl = mediaObject.thumbnail;
            shouldDetectAspectRatio = true;
          } else {
            // Create HTML placeholder with web aspect ratio
            textureUrl = 'data:image/svg+xml;base64,' + btoa(`
              <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="300" fill="#212529" stroke="#495057" stroke-width="2"/>
                <rect x="10" y="10" width="380" height="30" fill="#343a40" rx="6"/>
                <circle cx="25" cy="25" r="5" fill="#dc3545"/>
                <circle cx="45" cy="25" r="5" fill="#ffc107"/>
                <circle cx="65" cy="25" r="5" fill="#28a745"/>
                <rect x="90" y="20" width="200" height="10" fill="#6c757d" rx="5"/>
                <rect x="20" y="60" width="360" height="8" fill="#495057" rx="4"/>
                <rect x="20" y="80" width="320" height="8" fill="#495057" rx="4"/>
                <rect x="20" y="100" width="280" height="8" fill="#495057" rx="4"/>
                <circle cx="200" cy="180" r="30" fill="#007bff" opacity="0.2"/>
                <text x="200" y="175" text-anchor="middle" font-family="Arial" font-size="14" fill="#007bff" font-weight="bold">HTML</text>
                <text x="200" y="190" text-anchor="middle" font-family="Arial" font-size="10" fill="#adb5bd">Web Page</text>
              </svg>
            `);
            setAspectRatio(400 / 300);
          }
        } else {
          textureUrl = mediaObject.url || mediaObject.thumbnail;
          shouldDetectAspectRatio = !!textureUrl;
        }
        
        // STEP 1: Detect aspect ratio first if needed
        if (shouldDetectAspectRatio && textureUrl && !textureUrl.startsWith('data:')) {
          try {
            await new Promise<void>((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              
              img.onload = () => {
                const detectedAspectRatio = img.width / img.height;
                setAspectRatio(detectedAspectRatio);
                console.log(`✅ Detected aspect ratio for ${displayTitle}: ${detectedAspectRatio.toFixed(2)} (${img.width}x${img.height})`);
                resolve();
              };
              
              img.onerror = (err) => {
                console.warn(`⚠️ Failed to detect aspect ratio for ${displayTitle}:`, err);
                setAspectRatio(1.67); // Fallback to 16:9
                resolve(); // Don't reject, continue with fallback
              };
              
              // Add timeout for mobile performance
              setTimeout(() => {
                console.warn(`⏱️ Aspect ratio detection timeout for ${displayTitle}`);
                setAspectRatio(1.67);
                resolve();
              }, isMobile ? 3000 : 5000);
              
              img.src = textureUrl;
            });
          } catch (err) {
            console.warn(`Error in aspect ratio detection for ${displayTitle}:`, err);
            setAspectRatio(1.67);
          }
        }
        
        // STEP 2: Load texture for display
        if (textureUrl) {
          const loader = new THREE.TextureLoader();
          
          // Add mobile optimization - reduce quality for mobile devices
          const optimizedUrl = textureUrl;
          
          const loadedTexture = await new Promise<THREE.Texture>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error(`Texture loading timeout for ${displayTitle}`));
            }, isMobile ? 10000 : 15000);
            
            loader.load(
              optimizedUrl,
              (texture) => {
                clearTimeout(timeoutId);
                resolve(texture);
              },
              undefined,
              (error) => {
                clearTimeout(timeoutId);
                reject(error);
              }
            );
          });
          
          // Optimize texture settings for performance
          loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
          loadedTexture.magFilter = THREE.LinearFilter;
          loadedTexture.generateMipmaps = true;
          
          // Mobile optimization: reduce texture size
          if (isMobile) {
            loadedTexture.format = THREE.RGBFormat;
          }
          
          setTexture(loadedTexture);
          console.log(`✅ Loaded texture for ${displayTitle}`);
        }
      } catch (err) {
        console.error(`❌ Error loading texture for ${displayTitle}:`, err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTextureWithAspectRatio();
  }, [mediaObject, displayTitle, isMobile]);

  // Animation with useFrame
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      
      // Gentle floating motion
      const baseY = mediaObject.position[1] || 2;
      const floatAmplitude = isMobile ? 0.15 : 0.2; // Slightly less on mobile
      const floatSpeed = 0.6 + (mediaObject.id?.length || 0) * 0.05;
      groupRef.current.position.y = baseY + Math.sin(time * floatSpeed) * floatAmplitude;
      
      // Keep original X and Z position
      groupRef.current.position.x = mediaObject.position[0] || 0;
      groupRef.current.position.z = mediaObject.position[2] || 0;
      
      // Keep cards straight - no rotation
      groupRef.current.rotation.x = 0;
      groupRef.current.rotation.y = mediaObject.rotation?.[1] || 0;
      groupRef.current.rotation.z = 0;
      
      // Enhanced hover effects
      if (hovered && meshRef.current) {
        const pulse = 1 + Math.sin(time * 4) * 0.05;
        groupRef.current.scale.setScalar(pulse * (isMobile ? 1.05 : 1.1));
      } else if (groupRef.current) {
        const currentScale = groupRef.current.scale.x;
        const targetScale = 1;
        groupRef.current.scale.setScalar(THREE.MathUtils.lerp(currentScale, targetScale, 0.1));
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
      {/* Main card mesh with dynamic aspect ratio-based geometry */}
      <mesh ref={meshRef}>
        <boxGeometry args={[dimensions.width, dimensions.height, 0.05]} />
        <meshStandardMaterial 
          map={texture} 
          color={error ? "#ff6b6b" : (isLoading ? "#e9ecef" : "#ffffff")}
          emissive={hovered ? "#333333" : "#000000"}
          emissiveIntensity={hovered ? 0.15 : 0}
          metalness={0.1}
          roughness={0.7}
          transparent={isLoading}
          opacity={isLoading ? 0.7 : 1.0}
        />
      </mesh>
      
      {/* Enhanced glow effect when hovered */}
      {hovered && (
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[dimensions.width * 1.1, dimensions.height * 1.1, 0.02]} />
          <meshBasicMaterial 
            color="#4CAF50" 
            transparent 
            opacity={0.4}
          />
        </mesh>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <mesh position={[dimensions.width * 0.35, -dimensions.height * 0.35, 0.03]}>
          <boxGeometry args={[0.08, 0.04, 0.01]} />
          <meshBasicMaterial color="#4CAF50" />
        </mesh>
      )}
      
      {/* Error indicator */}
      {error && (
        <mesh position={[dimensions.width * 0.35, dimensions.height * 0.35, 0.03]}>
          <boxGeometry args={[0.08, 0.04, 0.01]} />
          <meshBasicMaterial color="#dc3545" />
        </mesh>
      )}
      
      {/* Title text using filename - responsive sizing */}
      <Text
        position={[0, -dimensions.height * 0.65, 0.03]}
        fontSize={Math.min(0.08, dimensions.width * 0.035)}
        color={hovered ? "#ffffff" : "#495057"}
        anchorX="center"
        anchorY="middle"
        maxWidth={dimensions.width * 0.9}
      >
        {displayTitle}
      </Text>
      
      {/* Type indicator - responsive positioning */}
      <Text
        position={[dimensions.width * 0.38, dimensions.height * 0.38, 0.03]}
        fontSize={Math.min(0.045, dimensions.width * 0.02)}
        color={hovered ? "#28a745" : "#6c757d"}
        anchorX="center"
        anchorY="middle"
      >
        {mediaObject.type?.toUpperCase() || 'MEDIA'}
      </Text>
      
      {/* Aspect ratio debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <Text
          position={[-dimensions.width * 0.38, dimensions.height * 0.38, 0.03]}
          fontSize={0.03}
          color="#007bff"
          anchorX="center"
          anchorY="middle"
        >
          {aspectRatio.toFixed(2)}
        </Text>
      )}
      
      {/* Floating particles effect when hovered - scaled to card */}
      {hovered && (
        <>
          {Array.from({ length: isMobile ? 2 : 3 }, (_, i) => (
            <mesh key={i} position={[
              (Math.random() - 0.5) * dimensions.width * 0.8, 
              (Math.random() - 0.5) * dimensions.height * 0.8, 
              0.1 + Math.random() * 0.2
            ]}>
              <sphereGeometry args={[0.012, 6, 6]} />
              <meshBasicMaterial 
                color="#28a745" 
                transparent 
                opacity={0.6}
              />
            </mesh>
          ))}
        </>
      )}
      
      {/* Description on hover - positioned relative to card size */}
      {hovered && mediaObject.description && (
        <Html
          position={[0, dimensions.height * 0.8, 0.1]}
          style={{
            backgroundColor: 'rgba(33, 37, 41, 0.95)',
            padding: isMobile ? '8px' : '12px',
            borderRadius: '8px',
            color: 'white',
            width: isMobile ? '180px' : '240px',
            fontSize: isMobile ? '11px' : '13px',
            textAlign: 'center',
            pointerEvents: 'none',
            border: '1px solid #28a745',
            boxShadow: '0 4px 16px rgba(40, 167, 69, 0.3)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {mediaObject.description}
        </Html>
      )}
    </group>
  );
};

const ProjectSubworld: React.FC<ProjectSubworldProps> = () => {
  const { projectId, projectName } = useParams<{ projectId?: string; projectName?: string }>();
  const navigate = useNavigate();
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      
      // Create clusters and organic spacing
      const clusterCount = Math.max(3, Math.ceil(totalAssets / 8)); // Create clusters of ~8 items each
      const currentCluster = index % clusterCount;
      
      // Base cluster positions in a rough circle
      const clusterAngle = (currentCluster / clusterCount) * Math.PI * 2;
      const clusterRadius = 15 + (clusterCount * 2); // Scale radius with number of clusters
      const clusterX = Math.cos(clusterAngle) * clusterRadius;
      const clusterZ = Math.sin(clusterAngle) * clusterRadius;
      
      // Add organic randomization within each cluster
      const inClusterIndex = Math.floor(index / clusterCount);
      const randomX = seededRandom(index * 7 + 123, -8, 8); // Random spread within cluster
      const randomZ = seededRandom(index * 11 + 456, -8, 8);
      const randomY = seededRandom(index * 13 + 789, 1.5, 4.5); // Varied heights for floating effect
      
      // Create spiral-like distribution within clusters for more organic feel
      const spiralRadius = 2 + (inClusterIndex * 0.8);
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
        description: `${getAssetTitle(asset.url)} from ${projectData.name}`,
        url: asset.url,
        thumbnail: asset.url,
        position,
        rotation: [0, randomRotationY, 0] as [number, number, number], // Only Y rotation, no tilting
        scale: [1.2 * scaleVariation, 0.9 * scaleVariation, 0.1] as [number, number, number]
      };
    });
    
    allMediaObjects.push(...galleryObjects);
    console.log(`ProjectSubworld: Added ${galleryObjects.length} assetGallery items with organic positioning`);
  }

  console.log(`ProjectSubworld: Total media objects to render: ${allMediaObjects.length}`);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor }}>
      <Canvas 
        camera={{ position: [0, 5, 15], fov: 60 }}
        style={{ background: backgroundColor }}
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

          {/* Render all media objects as 3D cards */}
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
            minDistance={5}
            maxDistance={50}
            target={[0, 2, 0]}
          />

        </Suspense>
      </Canvas>
    </div>
  );
};

export default ProjectSubworld; 