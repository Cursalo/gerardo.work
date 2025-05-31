import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Html, Text } from '@react-three/drei';
import { projectDataService, ProjectData } from '../services/projectDataService';
import { WorldObject } from '../data/worlds';
import * as THREE from 'three';

interface ProjectSubworldProps {}

// Enhanced MediaCard component that handles different media types
const MediaCard: React.FC<{ mediaObject: any; }> = ({ mediaObject }) => {
  const [hovered, setHovered] = useState(false);
  const [lowResTexture, setLowResTexture] = useState<THREE.Texture | null>(null);
  const [highResTexture, setHighResTexture] = useState<THREE.Texture | null>(null);
  const [isLoadingLowRes, setIsLoadingLowRes] = useState(true);
  const [isLoadingHighRes, setIsLoadingHighRes] = useState(false);
  const [error, setError] = useState(false);
  const [cameraDistance, setCameraDistance] = useState(Infinity);
  const navigate = useNavigate();
  
  // Add refs for animation and camera tracking
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Get camera for distance calculation
  const { camera } = useThree();
  
  useEffect(() => {
    const loadLowResTexture = async () => {
      try {
        let textureUrl = mediaObject.thumbnail || mediaObject.url;
        
        // Create low-resolution URL for faster loading
        let lowResUrl = textureUrl;
        if (mediaObject.type === 'image' && textureUrl) {
          // For images, try to create a smaller version URL or use thumbnail
          // If using a service like Cloudinary or similar, you could add size parameters
          // For now, we'll use thumbnail if available, otherwise the original
          lowResUrl = mediaObject.thumbnail || textureUrl;
        }
        
        if (lowResUrl) {
          const loader = new THREE.TextureLoader();
          const loadedTexture = await new Promise<THREE.Texture>((resolve, reject) => {
            loader.load(
              lowResUrl,
              resolve,
              undefined,
              reject
            );
          });
          
          // Set texture filtering for better quality at distance
          loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
          loadedTexture.magFilter = THREE.LinearFilter;
          loadedTexture.generateMipmaps = true;
          
          setLowResTexture(loadedTexture);
        }
      } catch (err) {
        console.error('Error loading low-res texture for media card:', err);
        setError(true);
      } finally {
        setIsLoadingLowRes(false);
      }
    };
    
    loadLowResTexture();
  }, [mediaObject]);

  // Load high-res texture when camera gets close
  useEffect(() => {
    const loadHighResTexture = async () => {
      if (cameraDistance > 8 || isLoadingHighRes || highResTexture) return;
      
      setIsLoadingHighRes(true);
      
      try {
        let highResUrl = mediaObject.url;
        
        if (highResUrl && highResUrl !== (mediaObject.thumbnail || mediaObject.url)) {
          const loader = new THREE.TextureLoader();
          const loadedTexture = await new Promise<THREE.Texture>((resolve, reject) => {
            loader.load(
              highResUrl,
              resolve,
              undefined,
              reject
            );
          });
          
          // Set texture filtering for high quality
          loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
          loadedTexture.magFilter = THREE.LinearFilter;
          loadedTexture.generateMipmaps = true;
          
          setHighResTexture(loadedTexture);
        }
      } catch (err) {
        console.error('Error loading high-res texture for media card:', err);
      } finally {
        setIsLoadingHighRes(false);
      }
    };
    
    loadHighResTexture();
  }, [cameraDistance, mediaObject, isLoadingHighRes, highResTexture]);

  // Animation and camera distance tracking with useFrame
  useFrame((state) => {
    if (groupRef.current && camera) {
      const time = state.clock.elapsedTime;
      
      // Calculate distance to camera
      const groupPos = groupRef.current.position;
      const distance = camera.position.distanceTo(groupPos);
      setCameraDistance(distance);
      
      // Gentle floating motion (KEEP THIS)
      const baseY = mediaObject.position[1] || 2;
      const floatAmplitude = 0.2;
      const floatSpeed = 0.6 + (mediaObject.id?.length || 0) * 0.05;
      groupRef.current.position.y = baseY + Math.sin(time * floatSpeed) * floatAmplitude;
      
      // Keep original X and Z position
      groupRef.current.position.x = mediaObject.position[0] || 0;
      groupRef.current.position.z = mediaObject.position[2] || 0;
      
      // REMOVE ROTATION - Keep cards straight
      groupRef.current.rotation.x = 0;
      groupRef.current.rotation.y = mediaObject.rotation?.[1] || 0; // Only use initial Y rotation if set
      groupRef.current.rotation.z = 0;
      
      // Enhanced hover effects (KEEP SCALE ONLY)
      if (hovered && meshRef.current) {
        // Subtle pulsing effect
        const pulse = 1 + Math.sin(time * 4) * 0.05;
        groupRef.current.scale.setScalar(pulse * 1.1);
      } else if (groupRef.current) {
        // Smooth scale transition back to normal
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

  // Choose texture based on distance and loading state
  const currentTexture = (cameraDistance < 8 && highResTexture) ? highResTexture : lowResTexture;
  
  // Calculate scale based on media object scale or use default
  const scale = mediaObject.scale || [2, 1.5, 0.1];
  const position = mediaObject.position || [0, 2, 0];
  const rotation = mediaObject.rotation || [0, 0, 0];

  return (
    <group 
      ref={groupRef}
      position={position} 
      rotation={[rotation[0], rotation[1], rotation[2]]} // Keep initial rotation only
      scale={scale}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Main card mesh */}
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 0.6, 0.05]} />
        <meshStandardMaterial 
          map={currentTexture} 
          color={error ? "#ff6b6b" : (isLoadingLowRes ? "#cccccc" : "#ffffff")}
          emissive={hovered ? "#222222" : "#000000"}
          emissiveIntensity={hovered ? 0.2 : 0}
          metalness={0.1}
          roughness={0.6}
        />
      </mesh>
      
      {/* Enhanced glow effect when hovered */}
      {hovered && (
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[1.1, 0.7, 0.02]} />
          <meshBasicMaterial 
            color="#4CAF50" 
            transparent 
            opacity={0.3}
          />
        </mesh>
      )}
      
      {/* Loading indicator for high-res texture */}
      {isLoadingHighRes && cameraDistance < 8 && (
        <mesh position={[0.4, -0.25, 0.03]}>
          <boxGeometry args={[0.1, 0.05, 0.01]} />
          <meshBasicMaterial color="#4CAF50" />
        </mesh>
      )}
      
      {/* Title text with enhanced styling */}
      <Text
        position={[0, -0.4, 0.03]}
        fontSize={0.08}
        color={hovered ? "#ffffff" : "#333333"}
        anchorX="center"
        anchorY="middle"
        maxWidth={0.8}
      >
        {mediaObject.title || mediaObject.name || 'Untitled'}
      </Text>
      
      {/* Type indicator with better styling */}
      <Text
        position={[0.4, 0.25, 0.03]}
        fontSize={0.05}
        color={hovered ? "#4CAF50" : "#666666"}
        anchorX="center"
        anchorY="middle"
      >
        {mediaObject.type?.toUpperCase() || 'MEDIA'}
      </Text>
      
      {/* Floating particles effect when hovered (SIMPLIFIED) */}
      {hovered && (
        <>
          {Array.from({ length: 3 }, (_, i) => (
            <mesh key={i} position={[
              (Math.random() - 0.5) * 1.5, 
              (Math.random() - 0.5) * 0.8, 
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
          position={[0, 0.8, 0.1]}
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
      
      return {
        id: `asset-${index}`,
        type: asset.type,
        title: asset.name,
        description: `Asset from ${projectData.name}`,
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