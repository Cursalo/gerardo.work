import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Text, Html, Instance, Instances } from '@react-three/drei';
import { WorldObject as WorldObjectType } from '../data/worlds';
import { Project } from '../services/projectService';
import { projectDataService } from '../services/projectDataService';
import { useWorld } from '../context/WorldContext';
import ProjectWindow from './ProjectWindow';
import { VideoCard } from './VideoCard';
import { ImageCard } from './ImageCard';
import { PDFCard } from './PDFCard';
import * as THREE from 'three';
import ErrorBoundary from './ErrorBoundary';
import { WebLinkCard } from './WebLinkCard';
import { projectService } from '../services/projectService';
import useMobileDetection from '../hooks/useMobileDetection';

interface WorldObjectProps {
  object: WorldObjectType;
}

// Interface for stored file data
interface StoredFile {
  dataUrl: string;
  type: string;
  name: string;
  size: number;
  timestamp: number;
}

// Performance optimization - distance thresholds
const DETAIL_LEVELS = {
  HIGH: 10,    // Full detail below this distance
  MEDIUM: 25,  // Medium detail below this distance
  LOW: 50      // Low detail below this distance
};

// Helper function to resolve file URLs - Enhanced for mobile compatibility
const resolveFileUrl = (url: string): string => {
  if (!url) return url;
  
  // If it's already a proper HTTP(S) URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's a relative URL starting with /, it's a public asset - encode spaces and return
  if (url.startsWith('/')) {
    // URL encode spaces and other special characters in the path, but preserve empty segments
    return url.split('/').map(segment => segment ? encodeURIComponent(segment) : segment).join('/');
  }
  
  // Handle file:// URLs from localStorage for backward compatibility
  if (url.startsWith('file://')) {
    const filename = url.replace('file://', '');
    try {
      const storedFilesStr = localStorage.getItem('portfolio_files');
      if (!storedFilesStr) {
        console.warn(`LocalStorage file not found for: ${filename}`);
        return url;
      }
      const storedFiles = JSON.parse(storedFilesStr) as Record<string, { dataUrl: string }>;
      const fileData = storedFiles[filename];
      if (!fileData) {
        console.warn(`File data not found in localStorage for: ${filename}`);
        return url;
      }
      return fileData.dataUrl;
    } catch (error) {
      console.error('Error resolving file URL:', error);
      return url;
    }
  }
  
  // If it's a relative path without /, prepend with / and encode
  if (!url.startsWith('./') && !url.includes('://')) {
    const encodedUrl = `/${url}`.split('/').map(segment => segment ? encodeURIComponent(segment) : segment).join('/');
    return encodedUrl;
  }
  
  return url;
};

// Shared materials to reduce memory usage
const sharedMaterials = {
  default: new THREE.MeshStandardMaterial({
    color: "#ffffff",
    emissive: "#ffffff",
    emissiveIntensity: 0.2,
  }),
  hovered: new THREE.MeshStandardMaterial({
    color: "#4dffa9",
    emissive: "#4dffa9",
    emissiveIntensity: 0.5,
  }),
  button: new THREE.MeshStandardMaterial({
    color: "#3b82f6",
    emissive: "#3b82f6",
    emissiveIntensity: 0.2,
    roughness: 0.3,
    metalness: 0.2,
  }),
  loading: new THREE.MeshStandardMaterial({
    color: "#cccccc",
    emissive: "#cccccc",
    emissiveIntensity: 0.2,
    roughness: 0.5,
    metalness: 0.1,
  }),
  error: new THREE.MeshStandardMaterial({
    color: "#ff0000",
    emissive: "#ff0000",
    emissiveIntensity: 0.2,
  }),
};

const WorldObject = React.memo(({ object }: WorldObjectProps) => {
  const { setCurrentWorldId } = useWorld();
  const [hovered, setHovered] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const { camera } = useThree();
  const objectRef = useRef<THREE.Group | null>(null);
  const { isMobile } = useMobileDetection();
  
  // CRITICAL FIX: Disable frequent logging completely to stop console spam
  // if (process.env.NODE_ENV === 'development' && Math.random() < 0.001) {
  //   console.log(`Rendering WorldObject:`, object.type, object.id);
  // }
  
  const position = object.position || [0, 0, 0];
  const rotation = object.rotation || [0, 0, 0];
  const scale = object.scale || [1, 1, 1];
  
  // PERFORMANCE: Optimize LOD calculation with throttled position updates
  const detailLevel = useMemo(() => {
    if (!camera) return 'low';
    
    const objectPosition = new THREE.Vector3(...position);
    const distance = camera.position.distanceTo(objectPosition);
    
    // Adjust thresholds based on device
    const highThreshold = isMobile ? DETAIL_LEVELS.HIGH * 0.7 : DETAIL_LEVELS.HIGH;
    const mediumThreshold = isMobile ? DETAIL_LEVELS.MEDIUM * 0.7 : DETAIL_LEVELS.MEDIUM;
    
    if (distance < highThreshold) {
      return 'high';
    } else if (distance < mediumThreshold) {
      return 'medium';
    } else {
      return 'low';
    }
  }, [
    Math.round(camera.position.x * 10) / 10, // Round to 1 decimal place to reduce updates
    Math.round(camera.position.y * 10) / 10, 
    Math.round(camera.position.z * 10) / 10, 
    position[0], position[1], position[2], // Use array elements instead of objects
    isMobile
  ]);

  // Load project details if this is a project object
  useEffect(() => {
    // Early returns to prevent unnecessary processing
    if (object.type !== 'project' || object.projectId === undefined) return;
    if (isLoadingProject) return; // Prevent multiple concurrent loads
    if (projectDetail && projectDetail.id === object.projectId) return; // Already loaded
    
    const projectId = object.projectId; // Type guard - we know it's defined at this point
    
    const loadProjectData = async () => {
      setIsLoadingProject(true);
      
      try {
        // First try localStorage for immediate response
        const projectsFromStorage = localStorage.getItem('portfolio_projects');
        if (projectsFromStorage) {
          try {
            const parsedProjects = JSON.parse(projectsFromStorage);
            if (Array.isArray(parsedProjects)) {
              const foundProject = parsedProjects.find(p => p.id === projectId);
              if (foundProject) {
                setProjectDetail(foundProject);
                setIsLoadingProject(false);
                return;
              }
            }
          } catch (error) {
            console.error('Error parsing projects from localStorage:', error);
          }
        }
        
        // Try projectService
        const project = await projectService.getProjectById(projectId);
        if (project) {
          setProjectDetail(project);
        } else {
          // Fallback to projectDataService
          const allProjects = await projectDataService.getAllProjects();
          const staticProject = allProjects.find((p: any) => p.id === projectId);
          if (staticProject) {
            // Convert ProjectData to Project format
            const convertedProject: Project = {
              id: staticProject.id,
              name: staticProject.name,
              description: staticProject.description,
              link: staticProject.link,
              thumbnail: staticProject.thumbnail,
              status: staticProject.status as 'completed' | 'in-progress',
              type: staticProject.type as 'standard' | 'video',
              videoUrl: staticProject.videoUrl,
              customLink: staticProject.customLink,
              worldSettings: staticProject.worldSettings,
              mediaObjects: staticProject.mediaObjects?.map(mediaObj => ({
                ...mediaObj,
                type: mediaObj.type as 'video' | 'image' | 'pdf' | 'project' | 'link' | 'button'
              }))
            };
            setProjectDetail(convertedProject);
          } else {
            console.warn(`Project with ID ${projectId} not found in any source`);
          }
        }
      } catch (error) {
        console.error(`Error loading project ${projectId}:`, error);
      } finally {
        setIsLoadingProject(false);
      }
    };
    
    loadProjectData();
  }, [object.type, object.projectId]); // REMOVED projectDetail and detailLevel from dependencies
  
  // useEffect to resolve fileUrl for non-project types if still needed
  useEffect(() => {
    // Skip for low detail level
    if (detailLevel === 'low') return;
    
    if (object.url && object.url.startsWith('file://') && object.type !== 'project') {
      const resolved = resolveFileUrl(object.url);
      setFileUrl(resolved);
    }
  }, [object.url, object.type, detailLevel]);
  
  const handleClick = (e?: any) => {
    if (e) {
      e.stopPropagation();
    }
    if (object.type === 'button' && object.action === 'navigate') {
      if (object.destination === 'hub' || object.destination === 'mainWorld') {
        setCurrentWorldId('mainWorld');
        if(e) e.preventDefault();
        return;
      } else if (object.subWorldId) {
        setCurrentWorldId(object.subWorldId);
        if(e) e.preventDefault();
        return;
      }
    }
    if (object.type === 'link') {
      if (object.subWorldId) {
        setCurrentWorldId(object.subWorldId);
        if(e) e.preventDefault();
        return;
      } else if (object.url) {
        window.open(object.url, '_blank');
        if(e) e.preventDefault();
      }
    }
  };

  useEffect(() => {
    if (objectRef.current) {
      const isInteractive = 
        object.projectId !== undefined || 
        (object.type === 'button' && object.action === 'navigate') || 
        (object.type === 'link') ||
        (object.type === 'video') ||
        (object.type === 'image') ||
        (object.type === 'pdf');

      let actionType: string | undefined;
      if (object.type === 'project') {
        actionType = 'navigate_project';
      } else if ((object.type === 'button' && object.action === 'navigate') || (object.type === 'link' && object.subWorldId)) {
        actionType = 'navigate';
      } else if (object.type === 'link' && object.url) {
        actionType = 'open_url';
      } else if (object.type === 'video' || object.type === 'image' || object.type === 'pdf') {
        actionType = 'view_media';
      }

      objectRef.current.userData = {
        interactive: isInteractive,
        action: actionType,
        name: object.title || object.type || `Object ${object.id}`,
        objectType: object.type,
        title: object.title,
        projectId: object.projectId,
        url: object.url,
        subWorldId: object.subWorldId,
        destination: object.destination,
        interactionType: object.interactionType
      };
    }
  }, [object]);
  
  // Render different content based on object type and detail level
  const renderContent = () => {
    // Project types: Always attempt to render ProjectWindow or its loading state
    if (object.type === 'project') {
      if (!projectDetail) {
        return (
          <group>
            <mesh castShadow={!isMobile} receiveShadow={!isMobile}>
              <boxGeometry args={[2, 1.5, 0.1]} /> {/* Consistent size */}
              <primitive object={sharedMaterials.loading} attach="material" />
            </mesh>
            <Text
              position={[0, 0, 0.06]}
              fontSize={0.15}
              color="#333333"
              anchorX="center"
              anchorY="middle"
            >
              Loading Project...
            </Text>
          </group>
        );
      }
      
      return (
        <ErrorBoundary>
          <ProjectWindow 
            project={projectDetail}
            position={[0,0,0]} // Positioned within the WorldObject group
          />
        </ErrorBoundary>
      );
    }
    
    // For non-project types, apply low detail placeholder if applicable
    if (detailLevel === 'low') {
      return (
        <mesh castShadow={!isMobile} receiveShadow={!isMobile}>
          <boxGeometry args={[1.5, 1, 0.1]} />
          <primitive object={object.type === 'button' ? sharedMaterials.button : sharedMaterials.default} attach="material" />
        </mesh>
      );
    }
    
    // For video types (medium/high detail)
    if (object.type === 'video' && object.url) {
      const url = (object.url.startsWith('file://') ? fileUrl : object.url) || object.url;
      return (
        <VideoCard
          id={object.projectId || 0}
          title={object.title}
          videoUrl={url}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          description={object.description}
        />
      );
    }
    
    // For image types
    if (object.type === 'image' && object.url) {
      const url = (object.url.startsWith('file://') ? fileUrl : object.url) || object.url;
      return (
        <ImageCard
          title={object.title}
          imageUrl={url}
          description={object.description}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
        />
      );
    }
    
    // For PDF types
    if (object.type === 'pdf' && object.url) {
      const url = (object.url.startsWith('file://') ? fileUrl : object.url) || object.url;
      return (
        <PDFCard
          title={object.title}
          pdfUrl={url}
          description={object.description}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
        />
      );
    }

    // For WebLinkCard (if it exists and is used, or other custom types)
    if (object.type === 'link' && object.url && !object.subWorldId) {
        return (
            <WebLinkCard 
                title={object.title}
                url={object.url}
                description={object.description}
                position={[0,0,0]}
            />
        );
    }
    
    // For button types
    if (object.type === 'button' && object.action === 'navigate') {
      return (
        <group>
          <mesh castShadow={!isMobile} receiveShadow={!isMobile}>
            <boxGeometry args={[2, 0.6, 0.1]} />
            <primitive object={hovered ? sharedMaterials.hovered : sharedMaterials.button} attach="material" />
          </mesh>
          {detailLevel === 'high' && (
            <Text
              position={[0, 0, 0.06]}
              fontSize={0.2}
              color="#ffffff"
              fontWeight="bold"
              anchorX="center"
              anchorY="middle"
            >
              {object.title}
            </Text>
          )}
        </group>
      );
    }
    
    // Default: simple link object (if not handled by WebLinkCard and has subWorldId)
    if (object.type === 'link') { // Catches links that navigate to subWorlds (medium/high detail)
      return (
        <group>
          <mesh castShadow={!isMobile} receiveShadow={!isMobile}>
            <boxGeometry args={[1.5, 0.8, 0.1]} />
            <primitive object={hovered ? sharedMaterials.hovered : sharedMaterials.default} attach="material" />
          </mesh>
          {detailLevel === 'high' && (
            <Text
              position={[0, 0, 0.06]}
              fontSize={0.15}
              color="#000000"
              anchorX="center"
              anchorY="middle"
            >
              {object.title}
            </Text>
          )}
        </group>
      );
    }
    
    // Fallback for unknown types
    return (
      <group>
        <mesh castShadow={!isMobile} receiveShadow={!isMobile}>
          <boxGeometry args={[1, 1, 0.1]} />
          <primitive object={hovered ? sharedMaterials.hovered : sharedMaterials.error} attach="material" />
        </mesh>
        {detailLevel === 'high' && (
          <Text
            position={[0, 0, 0.06]}
            fontSize={0.1}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {object.title || "Unknown Type"}
          </Text>
        )}
      </group>
    );
  };
  
  // Single return statement wrapping all possible content
  return (
    <group
      ref={objectRef}
      position={position as [number, number, number]}
      rotation={rotation as [number, number, number]}
      scale={scale as [number, number, number]}
      onClick={handleClick}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      {renderContent()}
      {/* Show description on hover only at high detail level */}
      {hovered && object.description && detailLevel === 'high' && (
        <Html
          position={[0, 0.75, 0.2]} // Adjusted y and z for better visibility
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '8px',
            borderRadius: '4px',
            color: 'white',
            width: '180px',
            fontSize: '12px',
            textAlign: 'center',
            pointerEvents: 'none',
            transform: 'translate(-50%, -110%)' // Center above and behind slightly
          }}
        >
          {object.description}
        </Html>
      )}
    </group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if the object actually changed
  return (
    prevProps.object.id === nextProps.object.id &&
    prevProps.object.type === nextProps.object.type &&
    prevProps.object.projectId === nextProps.object.projectId &&
    JSON.stringify(prevProps.object.position) === JSON.stringify(nextProps.object.position) &&
    JSON.stringify(prevProps.object.rotation) === JSON.stringify(nextProps.object.rotation) &&
    JSON.stringify(prevProps.object.scale) === JSON.stringify(nextProps.object.scale)
  );
});

export default WorldObject;