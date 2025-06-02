import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useInteraction } from '../context/InteractionContext';

// Add CSS for loading spinner outside of React component
const spinnerStyle = document.createElement('style');
spinnerStyle.textContent = `
  .spinning-loader {
    animation: imagecard-spin 1s linear infinite;
  }
  @keyframes imagecard-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
if (!document.head.querySelector('[data-imagecard-styles]')) {
  spinnerStyle.setAttribute('data-imagecard-styles', 'true');
  document.head.appendChild(spinnerStyle);
}

interface ImageCardProps {
  title: string;
  imageUrl: string;
  description?: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  onClick?: () => void;
}

/**
 * ImageCard component for displaying images in 3D space
 * Enhanced for proper aspect ratio handling and mobile compatibility
 */
export const ImageCard: React.FC<ImageCardProps> = ({
  title,
  imageUrl,
  description,
  position,
  rotation = [0, 0, 0],
  onClick
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { hoveredObject } = useInteraction();

  // Add mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   ('ontouchstart' in window) || 
                   (navigator.maxTouchPoints > 0);

  // Enhanced URL resolution for mobile compatibility with proper encoding
  const resolvedImageUrl = useMemo(() => {
    if (!imageUrl) return '';
    
    // If it's already a full URL, return as-is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // If it's a relative URL from public directory, encode spaces and special characters
    if (imageUrl.startsWith('/projects/') || imageUrl.startsWith('/assets/') || imageUrl.startsWith('/')) {
      return imageUrl.split('/').map(segment => segment ? encodeURIComponent(segment) : segment).join('/');
    }
    
    // If it's just a path without leading /, add it and encode
    if (!imageUrl.startsWith('/') && !imageUrl.includes('://')) {
      return `/${imageUrl}`.split('/').map(segment => segment ? encodeURIComponent(segment) : segment).join('/');
    }
    
    return imageUrl;
  }, [imageUrl]);

  // Check if this card is currently hovered via the raycasting system
  const hovered = hoveredObject?.userData?.url === resolvedImageUrl && hoveredObject?.userData?.type === 'image';

  // Set up 3D interaction data after resolvedImageUrl is available
  useEffect(() => {
    if (groupRef.current) {
      // Set initial position
      groupRef.current.position.set(position[0], position[1], position[2]);
      
      // Set up 3D interaction data for the crosshair system (EXACTLY like WorldObject.tsx)
      const interactionData = {
        interactive: true,
        action: 'view_media',
        objectType: 'image',
        title: title,
        url: resolvedImageUrl,
        type: 'image'
      };
      
      // CRITICAL FIX: Set userData on BOTH group and mesh for raycasting detection
      groupRef.current.userData = interactionData;
      
      // Also set on mesh when it's available
      if (meshRef.current) {
        meshRef.current.userData = interactionData;
      }
    }
  }, [position, title, resolvedImageUrl]);

  // Handle click function (EXACTLY like WorldObject.tsx)
  const handleClick = useCallback((e?: any) => {
    if (e) {
      e.stopPropagation();
    }
    console.log('Image Card clicked!', resolvedImageUrl);
    
    // Use external onClick if provided, otherwise default behavior
    if (onClick) {
      onClick();
    } else if (resolvedImageUrl) {
      window.open(resolvedImageUrl, '_blank');
    }
  }, [resolvedImageUrl, onClick]);

  // Update userData with onClick function after handleClick is defined
  useEffect(() => {
    if (groupRef.current && groupRef.current.userData) {
      groupRef.current.userData.onClick = handleClick;
      if (meshRef.current) {
        meshRef.current.userData.onClick = handleClick;
      }
    }
  }, [handleClick]);

  // Calculate proper card dimensions based on image aspect ratio
  const cardDimensions = useMemo(() => {
    let aspectRatio = 1.0; // Default square
    
    if (imageDimensions.width > 0 && imageDimensions.height > 0) {
      aspectRatio = imageDimensions.width / imageDimensions.height;
    } else {
      // Smart defaults based on filename patterns
      const filename = imageUrl?.toLowerCase() || '';
      if (filename.includes('mural') || filename.includes('lamp') || filename.includes('portrait') || filename.includes('tall')) {
        aspectRatio = 0.75; // Portrait
      } else if (filename.includes('banner') || filename.includes('header') || filename.includes('wide')) {
        aspectRatio = 2.0; // Landscape
      }
    }
    
    // Calculate card size with reasonable constraints
    const maxSize = 4.0;
    const minSize = 2.0;
    
    let width, height;
    
    if (aspectRatio > 1) {
      // Landscape image
      width = Math.min(maxSize, Math.max(minSize, aspectRatio * 2.5));
      height = width / aspectRatio;
    } else {
      // Portrait or square image
      height = Math.min(maxSize, Math.max(minSize, 2.5 / aspectRatio));
      width = height * aspectRatio;
    }
    
    // Ensure minimum dimensions
    width = Math.max(width, minSize);
    height = Math.max(height, minSize);
    
    console.log(`📏 ImageCard "${title}" dimensions: ${width.toFixed(2)}x${height.toFixed(2)} (AR: ${aspectRatio.toFixed(2)})`);
    
    return { width, height, aspectRatio };
  }, [imageDimensions, imageUrl, title]);
  
  // Ensure mesh has the same userData as group when dimensions change (mesh gets recreated)
  useEffect(() => {
    if (meshRef.current && groupRef.current?.userData) {
      meshRef.current.userData = groupRef.current.userData;
    }
  }, [cardDimensions]);

  const handleImageError = () => {
    console.warn(`Failed to load image: ${resolvedImageUrl}`);
    setImageError(true);
    setImageLoaded(false);
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    
    console.log(`✅ Image loaded: ${title} - ${width}x${height} (AR: ${(width/height).toFixed(2)})`);
    
    setImageDimensions({ width, height });
    setImageLoaded(true);
    setImageError(false);
  };

  // Floating animation and camera facing
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      
      // FIXED: Keep cards in their assigned positions with only gentle floating
      const baseY = position[1];
      const floatOffset = Math.sin(time * 0.6 + position[0] * 0.3) * 0.15;
      
      // Lock to original position coordinates
      groupRef.current.position.set(
        position[0], 
        baseY + floatOffset, 
        position[2]
      );
      
      // Simple camera facing without affecting position
      const camera = state.camera;
      const cardWorldPos = new THREE.Vector3(position[0], position[1], position[2]);
      const cameraPos = camera.position.clone();
      
      // Calculate direction for rotation only
      const direction = new THREE.Vector3().subVectors(cameraPos, cardWorldPos);
      direction.y = 0; // Only Y-axis rotation
      direction.normalize();
      
      // Calculate target Y rotation to face camera
      const targetRotationY = Math.atan2(direction.x, direction.z);
      
      // Smooth rotation interpolation
      const currentRotation = groupRef.current.rotation.y;
      const rotationDiff = targetRotationY - currentRotation;
      
      // Handle rotation wrapping (shortest path)
      let adjustedDiff = rotationDiff;
      if (adjustedDiff > Math.PI) adjustedDiff -= 2 * Math.PI;
      if (adjustedDiff < -Math.PI) adjustedDiff += 2 * Math.PI;
      
      // Apply smooth rotation
      const rotationSpeed = hovered ? 0.08 : 0.04;
      groupRef.current.rotation.y += adjustedDiff * rotationSpeed;
      
      // Add gentle wobble when hovered (rotation only)
      if (hovered) {
        const wobble = Math.sin(time * 2) * 0.01;
        groupRef.current.rotation.y += wobble;
      }
    }
  });

  return (
    <group 
      ref={groupRef}
      rotation={rotation}
      onClick={handleClick}
    >
      {/* Invisible 3D mesh for raycasting detection - ENLARGED for better clicking */}
      <mesh
        ref={meshRef}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[cardDimensions.width * 1.5, cardDimensions.height * 1.5]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Image content */}
      <Html
        transform={false}
        distanceFactor={5}
        position={[0, 0, 0.1]}
        style={{
          width: `${cardDimensions.width * (isMobile ? 100 : 90)}px`,
          height: `${cardDimensions.height * (isMobile ? 100 : 90)}px`,
          borderRadius: '12px',
          overflow: 'hidden',
          pointerEvents: 'none',
          transform: hovered ? 'scale(1.05)' : 'scale(1)',
          transition: 'transform 0.3s ease',
        }}
      >
        <div style={{ 
          width: '100%', 
          height: '100%', 
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          pointerEvents: 'none',
        }}
        >
          {/* Title above image */}
          <div style={{
            position: 'absolute',
            top: '-35px',
            left: '0',
            right: '0',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#333',
            textAlign: 'center',
            zIndex: 10,
            padding: '4px 8px',
            backgroundColor: 'rgba(255,255,255,0.9)',
            borderRadius: '6px',
            maxWidth: '90%',
            margin: '0 auto',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {title}
          </div>

          {imageError ? (
            // Error state
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#f0f0f0',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed #ccc',
                color: '#666'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🖼️</div>
              <div style={{ fontSize: '12px', textAlign: 'center', padding: '0 10px' }}>
                Image unavailable
              </div>
            </div>
          ) : (
            <img
              src={resolvedImageUrl}
              alt={title}
              onError={handleImageError}
              onLoad={handleImageLoad}
              crossOrigin="anonymous"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '12px',
                backgroundColor: '#f0f0f0',
                opacity: imageLoaded ? 1 : 0.8,
                transition: 'opacity 0.3s ease',
              }}
            />
          )}

          {/* Description overlay */}
          {description && !imageError && imageLoaded && (
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              fontSize: '11px',
              color: '#fff',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              padding: '20px 8px 8px',
              textAlign: 'center',
              borderBottomLeftRadius: '12px',
              borderBottomRightRadius: '12px',
              opacity: hovered ? 1 : 0.7,
              transition: 'opacity 0.3s ease',
            }}>
              {description}
            </div>
          )}

          {/* Loading indicator */}
          {!imageLoaded && !imageError && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#999',
              fontSize: '12px',
              textAlign: 'center',
            }}>
              <div 
                className="spinning-loader"
                style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #eee',
                  borderTop: '2px solid #666',
                  borderRadius: '50%',
                  margin: '0 auto 8px'
                }} 
              />
              Loading...
            </div>
          )}
        </div>
      </Html>



    </group>
  );
}; 