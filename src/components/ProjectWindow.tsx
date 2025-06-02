import React, { useState, useRef, useContext, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Mesh, Group, Vector3 } from 'three';
import { Project } from '../services/projectService';
import { VisibilityContext } from './Scene';
import R3FErrorBoundary from './R3FErrorBoundary';
import useMobileDetection from '../hooks/useMobileDetection';
import { createProjectSlug } from '../utils/fileUtils';

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
  const [clicked, setClicked] = useState(false);
  const [isOverlapping, setIsOverlapping] = useState(false);
  const [imageError, setImageError] = useState(false);
  const hasErrored = useRef(false);
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  
  // Get mobile detection
  const { isMobile } = useMobileDetection();
  
  // Get camera from three.js context
  const { camera } = useThree();
  
  // Get visibility tools from context
  const { registerPosition, unregisterPosition, checkOverlap } = useContext(VisibilityContext);

  // Navigation is now handled via URL changes

  // Generate a stable ID for this card
  const idRef = useRef<number>(project.id);
  
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
      // Mark this object as interactive for the raycaster
      meshRef.current.userData.interactive = true;
      // Attach click handler
      meshRef.current.userData.onClick = handleClick;
    }
  }, []);
  
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
      // Basic floating animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.2;
      
      // Keep fixed position in world space
      groupRef.current.position.x = position[0];
      groupRef.current.position.z = position[2];
      
      // Make the project window face the camera
      if (camera && !hovered) {
        const dirToCamera = new Vector3().subVectors(
          new Vector3(camera.position.x, groupRef.current.position.y, camera.position.z),
          groupRef.current.position
        ).normalize();
        
        // Calculate target rotation to face camera
        const targetRotationY = Math.atan2(dirToCamera.x, dirToCamera.z);
        
        // Smoothly rotate to face camera
        groupRef.current.rotation.y += (targetRotationY - groupRef.current.rotation.y) * 0.05;
      }
      
      // Rotate when hovered
      if (hovered) {
        const wobble = Math.sin(state.clock.elapsedTime * 3) * 0.05;
        groupRef.current.rotation.y += (wobble - groupRef.current.rotation.y * 0.1) * 0.1;
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

  // Handle mouse interactions
  const handleClick = useCallback((e: any) => {
    if (e) {
      e.stopPropagation();
    }
    
    setClicked(true);
    
    console.log("🚀 ProjectWindow clicked - navigating to project subworld");
    console.log("🚀 Project data:", { id: project.id, name: project.name });
    console.log("🚀 Current URL:", window.location.href);
    
    // UPDATED: Use project name slug with existing working route
    const projectSlug = createProjectSlug(project.name);
    console.log(`🚀 Navigating to project: ${project.name} (${projectSlug}) via URL`);
    const targetUrl = `/project/${projectSlug}`;
    console.log(`🚀 Target URL: ${targetUrl}`);
    
    // Add a small delay to ensure logging is visible
    setTimeout(() => {
      window.location.href = targetUrl;
    }, 100);
    
    // Reset after a brief delay
    setTimeout(() => setClicked(false), 300);
    
    return false;
  }, [project.name]);

  // 16:9 aspect ratio dimensions, lighter default size
  const width = 320;
  const height = width * 9 / 16; // 16:9 aspect ratio
  const frameWidth = width * 1.1;
  const frameHeight = height * 1.2;

  // Handle image loading errors
  const handleImageError = useCallback(() => {
    if (!hasErrored.current) {
      console.error(`Error loading image for project: ${project.name}`);
      hasErrored.current = true;
      setImageError(true);
    }
  }, [project.name]);

  // Use a lighter thumbnail if available
  const getThumbnailUrl = useCallback(() => {
    if (!project.thumbnail || imageError) {
      return 'https://placehold.co/320x180/cccccc/333333?text=No+Image';
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
    // CRITICAL FIX: Don't try to convert to .webp, just use the original thumbnail
    // The original logic was trying to load non-existent .webp files
    return project.thumbnail;
  }, [project.thumbnail, imageError]);

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

  return (
    <group 
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      onPointerOver={(e) => { e.stopPropagation(); updateHoverState(true); }}
      onPointerOut={(e) => { e.stopPropagation(); updateHoverState(false); }}
      onClick={handleClick}
      scale={getScale()}
    >
      {/* Card frame */}
      <mesh 
        ref={meshRef} 
        castShadow 
        receiveShadow
        userData={{ interactive: true, onClick: handleClick }}
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
              {!imageError ? (
                <img 
                  src={getThumbnailUrl()} 
                  alt={project.name}
                  style={{ 
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }} 
                  onError={handleImageError}
                  loading={"eager"}
                  crossOrigin="anonymous"
                />
              ) : (
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
              )}
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