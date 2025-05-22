import React, { useState, useRef, useContext, useEffect, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Mesh, Group, Vector3 } from 'three';
import { Project } from '../data/projects';
import { VisibilityContext } from './Scene';
import R3FErrorBoundary from './R3FErrorBoundary';
import useMobileDetection from '../hooks/useMobileDetection';

interface ProjectWindowProps {
  project: Project;
  position: [number, number, number];
}

/**
 * ProjectWindow component
 * 
 * Displays project information in 3D space with hover effects and interactions.
 * Optimized for crosshair interaction through the center of the screen.
 */
const ProjectWindow = React.memo(({ project, position }: ProjectWindowProps) => {
  const [hovered, setHovered] = useState(false);
  const [isOverlapping, setIsOverlapping] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [detailLevel, setDetailLevel] = useState<'high' | 'medium' | 'low'>('high');
  const hasErrored = useRef(false);
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  
  // Get mobile detection
  const { isMobile } = useMobileDetection();
  
  // Get camera from three.js context
  const { camera } = useThree();
  
  // Get visibility tools from context
  const { registerPosition, unregisterPosition, checkOverlap } = useContext(VisibilityContext);

  // Generate a stable ID for this card
  const idRef = useRef<number>(project.id);
  
  // Force updates for thumbnail retries
  const [, updateState] = useState({});
  const forceUpdate = useCallback(() => updateState({}), []);
  
  // Register position and check for overlaps
  useEffect(() => {
    const currentId = idRef.current;
    registerPosition(currentId, position);
    return () => {
      unregisterPosition(currentId);
    };
  }, [position, registerPosition, unregisterPosition]);

  // Set this object as interactive for raycasting and crosshair interaction
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.userData = {
        ...meshRef.current.userData,
        interactive: true,
        type: 'project',
        projectId: project.id,
        subWorldId: `project-world-${project.id}`,
      };
    }
  }, [project.id]);
  
  // Handle hover tracking internally
  const updateHoverState = (isHovered: boolean) => {
    setHovered(isHovered);
    
    // Apply scale effect on hover
    if (groupRef.current) {
      const targetScale = isHovered ? 1.15 : 1.0;
      groupRef.current.scale.set(targetScale, targetScale, targetScale);
    }
  };

  // Add a slight floating animation and make the card face the camera
  useFrame((state) => {
    if (groupRef.current) {
      // General floating and billboarding are now handled by BillboardManager at the WorldObject level.
      // ProjectWindow is typically positioned at [0,0,0] relative to its parent WorldObject.
      // The `position` prop for ProjectWindow defines this local offset.
      groupRef.current.position.set(position[0], position[1], position[2]);

      // Unique hover animation for ProjectWindow
      if (hovered) {
        const wobble = Math.sin(state.clock.elapsedTime * 3) * 0.05;
        groupRef.current.rotation.y += (wobble - groupRef.current.rotation.y * 0.1) * 0.1;
      } else {
        // When not hovered, ensure its local Y rotation is smoothly reset to 0.
        // BillboardManager handles the parent WorldObject's camera-facing rotation.
        groupRef.current.rotation.y += (0 - groupRef.current.rotation.y) * 0.05;
      }
      
      // Check if this card is overlapping with another and update state
      const currentPos: [number, number, number] = [
        groupRef.current.position.x,
        groupRef.current.position.y,
        groupRef.current.position.z
      ];
      const overlapping = checkOverlap(idRef.current, currentPos);
      if (overlapping !== isOverlapping) {
        setIsOverlapping(overlapping);
      }
    }
  });

  // 16:9 aspect ratio dimensions, lighter default size
  const width = 320;
  const height = width * 9 / 16; // 16:9 aspect ratio
  const frameWidth = width * 1.1;
  const frameHeight = height * 1.2;

  // Handle image loading errors
  const handleImageError = useCallback(() => {
    if (!hasErrored.current) {
      console.error(`Error loading image for project: ${project.name}, attempting fallback paths`);
      
      // Check if we've already flagged this thumbnail as problematic in session storage
      const errorKey = `thumbnail_error_${project.id}`;
      if (sessionStorage.getItem(errorKey)) {
        // Already tried and failed before, just use fallback immediately
        hasErrored.current = true;
        setImageError(true);
        return;
      }
      
      // Mark this thumbnail as problematic
      sessionStorage.setItem(errorKey, 'true');
      
      // Attempt to use an alternative path if the current path failed
      if (project.thumbnail && project.thumbnail.includes('/thumbnail/thumbnail.png')) {
        // Try the old path structure as fallback
        const oldPathThumbnail = project.thumbnail.replace('/thumbnail/thumbnail.png', '/assets/images/thumbnail.webp');
        console.log(`Trying fallback path: ${oldPathThumbnail}`);
        
        // Set the fallback image to try
        const img = new Image();
        img.onload = () => {
          // If the fallback loads, use it
          console.log(`Fallback image loaded successfully: ${oldPathThumbnail}`);
          setImageError(false);
          hasErrored.current = false;
          // Force a re-render with the new URL
          forceUpdate();
        };
        img.onerror = () => {
          // If fallback also fails, mark as error
          console.error(`Fallback image also failed: ${oldPathThumbnail}`);
          hasErrored.current = true;
          setImageError(true);
        };
        img.src = oldPathThumbnail;
        return;
      }
      
      hasErrored.current = true;
      setImageError(true);
    }
  }, [project.name, project.thumbnail, project.id, forceUpdate]);

  const [thumbnailAttempted, setThumbnailAttempted] = useState(false);
  
  // Use a lighter thumbnail if available
  const getThumbnailUrl = useCallback(() => {
    if (!project.thumbnail || imageError) {
      return `https://placehold.co/320x180/cccccc/333333?text=${encodeURIComponent(project.name)}`;
    }
    
    // Only log on first attempt to reduce console spam
    if (!thumbnailAttempted) {
      console.log(`Trying to load thumbnail: ${project.thumbnail} for project: ${project.name}`);
      setThumbnailAttempted(true);
    }
    
    // If the thumbnail is a local file, resolve as before
    if (project.thumbnail.startsWith('file://')) {
      try {
        const filename = project.thumbnail.replace('file://', '');
        const storedFilesStr = localStorage.getItem('portfolio_files');
        if (storedFilesStr) {
          const storedFiles = JSON.parse(storedFilesStr);
          const fileData = storedFiles[filename];
          if (fileData && fileData.dataUrl) {
            return fileData.dataUrl;
          }
        }
      } catch (error) {
        console.error('Error resolving thumbnail URL:', error);
      }
    }
    
    // Check if we've already loaded this thumbnail successfully in this session
    const cacheKey = `thumbnail_cache_${project.id}`;
    const cachedResult = sessionStorage.getItem(cacheKey);
    if (cachedResult === 'success') {
      // Return the URL without timestamp to use browser caching
      return project.thumbnail;
    }
    
    // Add a ONE-TIME timestamp to bust cache, but only on first load
    // This ensures we only try to load each thumbnail once per session
    if (project.thumbnail.includes('/thumbnail/')) {
      // Store success in session storage when image loads
      const img = new Image();
      img.onload = () => {
        sessionStorage.setItem(cacheKey, 'success');
      };
      img.src = project.thumbnail;
      
      // Use a static timestamp instead of Date.now() to allow caching
      // This timestamp will be the same for the entire session
      const staticTimestamp = sessionStorage.getItem('static_timestamp') || 
                              Date.now().toString();
      
      // Store the timestamp if it doesn't exist
      if (!sessionStorage.getItem('static_timestamp')) {
        sessionStorage.setItem('static_timestamp', staticTimestamp);
      }
      
      return `${project.thumbnail}?t=${staticTimestamp}`;
    }
    
    return project.thumbnail;
  }, [project.name, project.thumbnail, imageError, thumbnailAttempted]);

  // Limit scale/animation when close to camera for performance
  const getScale = useCallback(() => {
    if (hovered) return 1.1;
    if (!camera) return 1;
    const distance = new Vector3(position[0], position[1], position[2]).distanceTo(camera.position);
    if (distance < 8) {
      return 1.0 + ((8 - distance) / 16) * 0.1; // much less scaling
    } else if (distance < 20) {
      return 0.9 + ((20 - distance) / 24) * 0.1;
    } else {
      return Math.max(0.7, 0.9 - ((distance - 20) / 40) * 0.1);
    }
  }, [hovered, camera, position]);

  // Add memoization for project thumbnails to prevent unnecessary rerenders
  const memoizedThumbnail = useMemo(() => {
    // If we're in low detail level, don't even attempt to load the thumbnail
    if (detailLevel === 'low') {
      return null;
    }
    
    if (imageError) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: `hsl(${(project.id * 37) % 360}, 80%, 80%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: '#333333',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
            Image Not Available
          </div>
          <div>{project.name}</div>
        </div>
      );
    }
    
    return (
      <img 
        src={getThumbnailUrl()} 
        alt={project.name}
        style={{ 
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }} 
        onError={handleImageError}
        loading={"lazy"}
        crossOrigin="anonymous"
      />
    );
  }, [project.id, project.name, imageError, getThumbnailUrl, handleImageError, detailLevel]);

  return (
    <group 
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      onPointerOver={(e) => { e.stopPropagation(); updateHoverState(true); }}
      onPointerOut={(e) => { e.stopPropagation(); updateHoverState(false); }}
      scale={getScale()}
    >
      {/* Card frame */}
      <mesh 
        ref={meshRef} 
        castShadow 
        receiveShadow
      >
        <boxGeometry args={[frameWidth / 100, frameHeight / 100, 0.05]} />
        <meshStandardMaterial 
          color={hovered ? "#ffffff" : "#f0f0f0"} 
          metalness={0.7}
          roughness={0.2}
          emissive={hovered ? "#ffffff" : "#aaaaaa"}
          emissiveIntensity={hovered ? 0.5 : 0.2}
        />
      </mesh>
      
      {/* HTML content inside the 3D space, wrapped in Error Boundary */}
      <R3FErrorBoundary>
        <Html
          transform
          distanceFactor={8}
          position={[0, 0, 0.03]}
          style={{
            width: `${width}px`,
            height: `${height}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            pointerEvents: 'none',
          }}
        >
          {/* Clean floating title */}
          <div 
            style={{ 
              position: 'absolute',
              top: '-30px',
              left: '0',
              right: '0',
              fontSize: '16px', 
              fontWeight: '500',
              color: '#222222',
              textAlign: 'center',
              padding: '5px 0',
              width: '100%',
              zIndex: 10,
              fontFamily: 'Helvetica, Arial, sans-serif',
              letterSpacing: '0.5px',
              textShadow: hovered || isOverlapping
                ? '0 1px 3px rgba(255,255,255,0.7)' 
                : '0 1px 2px rgba(255,255,255,0.8), 0 1px 3px rgba(0,0,0,0.1)',
              transition: 'text-shadow 0.3s ease',
            }}
          >
            {project.name}
          </div>
          
          {project.status === 'in-progress' ? (
            <div 
              style={{ 
                width: `${width}px`,
                height: `${height}px`,
                background: 'linear-gradient(45deg, #f0f0f0, #cccccc)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                animation: 'glitch 1s infinite',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '16px',
                boxShadow: hovered ? '0 0 20px rgba(255,255,255,0.5)' : '0 5px 15px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                pointerEvents: 'auto'
              }}
            >
              <div style={{ 
                fontSize: '16px', 
                fontWeight: '500', 
                color: '#555',
                padding: '8px 15px',
                background: 'rgba(0,0,0,0.1)',
                borderRadius: '20px',
                textShadow: '0 1px 2px rgba(255,255,255,0.8)',
              }}>
                IN PROGRESS
              </div>
            </div>
          ) : (
            <div
              style={{ 
                width: `${width}px`,
                height: `${height}px`,
                backgroundColor: '#f0f0f0',
                borderRadius: '16px',
                boxShadow: hovered ? '0 0 20px rgba(255,255,255,0.5)' : '0 5px 15px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {memoizedThumbnail}
            </div>
          )}
          
          {/* Enhanced project info on hover */}
          <div 
            style={{ 
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              fontSize: '14px', 
              fontWeight: '500',
              color: '#ffffff',
              textAlign: 'center',
              padding: '8px 10px',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              opacity: hovered ? 1 : 0,
              transform: hovered ? 'translateY(0)' : 'translateY(100%)',
              transition: 'all 0.3s ease',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              width: '100%',
              borderBottomLeftRadius: '16px',
              borderBottomRightRadius: '16px'
            }}
          >
            {project.description}
          </div>
        </Html>
      </R3FErrorBoundary>
    </group>
  );
});

export default ProjectWindow; 