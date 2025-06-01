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
  const navigate = useNavigate();
  
  // Add refs for animation
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Extract filename from URL to use as title
  const getFilenameFromUrl = (url: string): string => {
    if (!url) return 'Untitled';
    
    try {
      // Get the last part of the URL (filename)
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1];
      
      // Remove the file extension
      const nameWithoutExtension = filename.replace(/\.[^/.]+$/, '');
      
      // Clean up the name: replace underscores and hyphens with spaces, capitalize words
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
  
  useEffect(() => {
    const loadTexture = async () => {
      try {
        let textureUrl = '';
        let needsAspectRatioDetection = false;
        
        // Handle different media types with proper URLs and placeholders
        if (mediaObject.type === 'image') {
          textureUrl = mediaObject.url || mediaObject.thumbnail;
          needsAspectRatioDetection = true;
        } else if (mediaObject.type === 'video') {
          // For videos, use thumbnail if available, otherwise a video placeholder
          textureUrl = mediaObject.thumbnail || '/assets/video-placeholder.png';
          if (mediaObject.thumbnail) {
            needsAspectRatioDetection = true;
          }
        } else if (mediaObject.type === 'pdf') {
          // For PDFs, use a PDF placeholder or thumbnail
          textureUrl = mediaObject.thumbnail || '/assets/pdf-placeholder.png';
          if (!mediaObject.thumbnail) {
            // Create a simple PDF placeholder
            textureUrl = 'data:image/svg+xml;base64,' + btoa(`
              <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="600" fill="#f0f0f0" stroke="#ccc" stroke-width="2"/>
                <text x="200" y="280" text-anchor="middle" font-family="Arial" font-size="24" fill="#666">PDF</text>
                <text x="200" y="320" text-anchor="middle" font-family="Arial" font-size="16" fill="#999">Document</text>
              </svg>
            `);
            setAspectRatio(400 / 600); // PDF aspect ratio
          } else {
            needsAspectRatioDetection = true;
          }
        } else if (mediaObject.type === 'html') {
          // For HTML, use thumbnail or create a web placeholder
          textureUrl = mediaObject.thumbnail || '/assets/html-placeholder.png';
          if (!mediaObject.thumbnail) {
            // Create a simple HTML placeholder
            textureUrl = 'data:image/svg+xml;base64,' + btoa(`
              <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="300" fill="#1e1e1e" stroke="#333" stroke-width="2"/>
                <rect x="10" y="10" width="380" height="30" fill="#333" rx="5"/>
                <circle cx="25" cy="25" r="5" fill="#ff5f56"/>
                <circle cx="45" cy="25" r="5" fill="#ffbd2e"/>
                <circle cx="65" cy="25" r="5" fill="#27ca3f"/>
                <text x="200" y="180" text-anchor="middle" font-family="Arial" font-size="18" fill="#fff">HTML</text>
                <text x="200" y="200" text-anchor="middle" font-family="Arial" font-size="14" fill="#ccc">Web Page</text>
              </svg>
            `);
            setAspectRatio(400 / 300); // Web page aspect ratio
          } else {
            needsAspectRatioDetection = true;
          }
        } else {
          // Generic media type
          textureUrl = mediaObject.url || mediaObject.thumbnail || '/assets/media-placeholder.png';
          needsAspectRatioDetection = !!textureUrl;
        }
        
        if (textureUrl) {
          const loader = new THREE.TextureLoader();
          
          // If we need to detect aspect ratio from an actual image
          if (needsAspectRatioDetection && !textureUrl.startsWith('data:')) {
            // Load image to detect dimensions
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
              const detectedAspectRatio = img.width / img.height;
              setAspectRatio(detectedAspectRatio);
              console.log(`Detected aspect ratio for ${displayTitle}: ${detectedAspectRatio} (${img.width}x${img.height})`);
            };
            
            img.onerror = () => {
              console.warn(`Failed to load image for aspect ratio detection: ${textureUrl}`);
              setAspectRatio(1.67); // Fallback to 16:9
            };
            
            img.src = textureUrl;
          }
          
          // Load the texture
          const loadedTexture = await new Promise<THREE.Texture>((resolve, reject) => {
            loader.load(
              textureUrl,
              resolve,
              undefined,
              reject
            );
          });
          
          // Set texture filtering for good quality
          loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
          loadedTexture.magFilter = THREE.LinearFilter;
          loadedTexture.generateMipmaps = true;
          
          setTexture(loadedTexture);
        }
      } catch (err) {
        console.error('Error loading texture for media card:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTexture();
  }, [mediaObject, displayTitle]);

  // Animation with useFrame
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      
      // Gentle floating motion
      const baseY = mediaObject.position[1] || 2;
      const floatAmplitude = 0.2;
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
        groupRef.current.scale.setScalar(pulse * 1.1);
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

  // Calculate geometry based on aspect ratio
  const baseWidth = 2.0;
  const baseHeight = baseWidth / aspectRatio;
  const maxHeight = 3.0; // Limit maximum height
  const finalHeight = Math.min(baseHeight, maxHeight);
  const finalWidth = finalHeight * aspectRatio;
  
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
      {/* Main card mesh with aspect ratio-based geometry */}
      <mesh ref={meshRef}>
        <boxGeometry args={[finalWidth, finalHeight, 0.05]} />
        <meshStandardMaterial 
          map={texture} 
          color={error ? "#ff6b6b" : (isLoading ? "#cccccc" : "#ffffff")}
          emissive={hovered ? "#222222" : "#000000"}
          emissiveIntensity={hovered ? 0.2 : 0}
          metalness={0.1}
          roughness={0.6}
        />
      </mesh>
      
      {/* Enhanced glow effect when hovered */}
      {hovered && (
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[finalWidth * 1.1, finalHeight * 1.1, 0.02]} />
          <meshBasicMaterial 
            color="#4CAF50" 
            transparent 
            opacity={0.3}
          />
        </mesh>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <mesh position={[finalWidth * 0.4, -finalHeight * 0.35, 0.03]}>
          <boxGeometry args={[0.1, 0.05, 0.01]} />
          <meshBasicMaterial color="#4CAF50" />
        </mesh>
      )}
      
      {/* Title text using filename */}
      <Text
        position={[0, -finalHeight * 0.6, 0.03]}
        fontSize={Math.min(0.08, finalWidth * 0.04)}
        color={hovered ? "#ffffff" : "#333333"}
        anchorX="center"
        anchorY="middle"
        maxWidth={finalWidth * 0.8}
      >
        {displayTitle}
      </Text>
      
      {/* Type indicator */}
      <Text
        position={[finalWidth * 0.35, finalHeight * 0.35, 0.03]}
        fontSize={Math.min(0.05, finalWidth * 0.025)}
        color={hovered ? "#4CAF50" : "#666666"}
        anchorX="center"
        anchorY="middle"
      >
        {mediaObject.type?.toUpperCase() || 'MEDIA'}
      </Text>
      
      {/* Floating particles effect when hovered */}
      {hovered && (
        <>
          {Array.from({ length: 3 }, (_, i) => (
            <mesh key={i} position={[
              (Math.random() - 0.5) * finalWidth, 
              (Math.random() - 0.5) * finalHeight, 
              0.1 + Math.random() * 0.2
            ]}>
              <sphereGeometry args={[0.015, 6, 6]} />
              <meshBasicMaterial 
                color="#4CAF50" 
                transparent 
                opacity={0.5}
              />
            </mesh>
          ))}
        </>
      )}
      
      {/* Description on hover */}
      {hovered && mediaObject.description && (
        <Html
          position={[0, finalHeight * 0.8, 0.1]}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            padding: '12px',
            borderRadius: '8px',
            color: 'white',
            width: '220px',
            fontSize: '13px',
            textAlign: 'center',
            pointerEvents: 'none',
            border: '1px solid #4CAF50',
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
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