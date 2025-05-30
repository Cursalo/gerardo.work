import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
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
  const navigate = useNavigate();
  
  useEffect(() => {
    const loadTexture = async () => {
      try {
        let textureUrl = mediaObject.thumbnail || mediaObject.url;
        
        // Handle different media types
        if (mediaObject.type === 'video') {
          // For videos, try to use thumbnail or generate from video
          textureUrl = mediaObject.thumbnail || mediaObject.url;
        } else if (mediaObject.type === 'image') {
          textureUrl = mediaObject.url;
        } else if (mediaObject.type === 'html') {
          // For HTML cards, use custom thumbnail from project.json
          textureUrl = mediaObject.thumbnail || '/assets/html-placeholder.png';
        } else if (mediaObject.type === 'pdf') {
          textureUrl = mediaObject.thumbnail || '/assets/pdf-placeholder.png';
        }
        
        if (textureUrl) {
          const loader = new THREE.TextureLoader();
          const loadedTexture = await new Promise<THREE.Texture>((resolve, reject) => {
            loader.load(
              textureUrl,
              resolve,
              undefined,
              reject
            );
          });
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
  }, [mediaObject]);

  const handleClick = () => {
    console.log('MediaCard clicked:', mediaObject);
    
    // Handle different click actions based on media type
    if (mediaObject.type === 'video' && mediaObject.url) {
      // Open video in new tab or show video player
      window.open(mediaObject.url, '_blank');
    } else if (mediaObject.type === 'image' && mediaObject.url) {
      // Open image in new tab
      window.open(mediaObject.url, '_blank');
    } else if (mediaObject.type === 'html' && mediaObject.url) {
      // Navigate to HTML page
      window.open(mediaObject.url, '_blank');
    } else if (mediaObject.type === 'pdf' && mediaObject.url) {
      // Open PDF in new tab
      window.open(mediaObject.url, '_blank');
    } else if (mediaObject.url) {
      // Generic URL opening
      window.open(mediaObject.url, '_blank');
    }
  };

  // Calculate scale based on media object scale or use default
  const scale = mediaObject.scale || [2, 1.5, 0.1];
  const position = mediaObject.position || [0, 2, 0];
  const rotation = mediaObject.rotation || [0, 0, 0];

  return (
    <group 
      position={position} 
      rotation={rotation}
      scale={scale}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Main card mesh */}
      <mesh>
        <boxGeometry args={[1, 0.6, 0.05]} />
        <meshStandardMaterial 
          map={texture} 
          color={error ? "#ff6b6b" : (isLoading ? "#cccccc" : "#ffffff")}
          emissive={hovered ? "#444444" : "#000000"}
          emissiveIntensity={hovered ? 0.2 : 0}
        />
      </mesh>
      
      {/* Title text */}
      <Text
        position={[0, -0.4, 0.03]}
        fontSize={0.1}
        color="#333333"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.8}
      >
        {mediaObject.title || mediaObject.name || 'Untitled'}
      </Text>
      
      {/* Type indicator */}
      <Text
        position={[0.4, 0.25, 0.03]}
        fontSize={0.06}
        color="#666666"
        anchorX="center"
        anchorY="middle"
      >
        {mediaObject.type?.toUpperCase() || 'MEDIA'}
      </Text>
      
      {/* Hover effect border */}
      {hovered && (
        <mesh position={[0, 0, -0.001]}>
          <boxGeometry args={[1.05, 0.65, 0.01]} />
          <meshBasicMaterial color="#4CAF50" transparent opacity={0.3} />
        </mesh>
      )}
      
      {/* Description on hover */}
      {hovered && mediaObject.description && (
        <Html
          position={[0, 0.8, 0.1]}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '8px',
            borderRadius: '4px',
            color: 'white',
            width: '200px',
            fontSize: '12px',
            textAlign: 'center',
            pointerEvents: 'none',
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
      // Generate grid positions for asset gallery items
      const gridSize = Math.ceil(Math.sqrt(projectData.assetGallery!.length));
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      const spacing = 3;
      const offsetX = (gridSize - 1) * spacing / 2;
      const offsetZ = (gridSize - 1) * spacing / 2;
      
      const position: [number, number, number] = [
        col * spacing - offsetX + 5, // Offset to the right of main media
        2, 
        row * spacing - offsetZ
      ];
      
      return {
        id: `asset-${index}`,
        type: asset.type,
        title: asset.name,
        description: `Asset from ${projectData.name}`,
        url: asset.url,
        thumbnail: asset.url, // Use the asset URL as thumbnail for images
        position,
        rotation: [0, 0, 0] as [number, number, number],
        scale: [1.5, 1.5, 0.1] as [number, number, number]
      };
    });
    
    allMediaObjects.push(...galleryObjects);
    console.log(`ProjectSubworld: Added ${galleryObjects.length} assetGallery items`);
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