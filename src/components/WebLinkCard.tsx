import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useAppContext } from '../hooks/useAppContext';

// Add CSS for loading spinner outside of React component
const weblinkSpinnerStyle = document.createElement('style');
weblinkSpinnerStyle.textContent = `
  .weblink-spinner {
    animation: weblink-spin 1s linear infinite;
  }
  @keyframes weblink-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
if (!document.head.querySelector('[data-weblink-styles]')) {
  weblinkSpinnerStyle.setAttribute('data-weblink-styles', 'true');
  document.head.appendChild(weblinkSpinnerStyle);
}

interface WebLinkCardProps {
  title: string;
  description?: string;
  url: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onClick?: () => void;
}

export const WebLinkCard: React.FC<WebLinkCardProps> = ({
  title,
  description,
  url,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  onClick,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [isOverlapping, setIsOverlapping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const { registerObject, unregisterObject, checkOverlap } = useAppContext();

  // Handle hover state
  const updateHoverState = (state: boolean) => {
    setHovered(state);
  };

  // Register this component's position and check for overlaps
  useEffect(() => {
    if (groupRef.current) {
      const id = `weblink-${title}-${position.join(',')}`;
      registerObject(id, groupRef);
      
      return () => {
        unregisterObject(id);
      };
    }
  }, [title, position, registerObject, unregisterObject]);

  // Check for overlapping with other objects and handle camera facing
  useFrame((state) => {
    if (groupRef.current) {
      const worldPosition = new THREE.Vector3();
      groupRef.current.getWorldPosition(worldPosition);
      
      const isOverlappingNow = checkOverlap(worldPosition);
      if (isOverlappingNow !== isOverlapping) {
        setIsOverlapping(isOverlappingNow);
      }
      
      // Face the camera smoothly
      const camera = state.camera;
      const cardPosition = new THREE.Vector3(position[0], position[1], position[2]);
      const cameraPosition = camera.position.clone();
      
      // Calculate direction from card to camera
      const direction = new THREE.Vector3().subVectors(cameraPosition, cardPosition);
      direction.y = 0; // Only rotate on Y axis
      direction.normalize();
      
      // Calculate target rotation to face camera
      const targetRotationY = Math.atan2(direction.x, direction.z);
      
      // Smooth interpolation to target rotation
      if (hovered) {
        // Add gentle wobble when hovered
        const time = state.clock.elapsedTime;
        const wobble = Math.sin(time * 2) * 0.02;
        groupRef.current.rotation.y += (targetRotationY + wobble - groupRef.current.rotation.y) * 0.1;
      } else {
        // Smoothly face camera
        groupRef.current.rotation.y += (targetRotationY - groupRef.current.rotation.y) * 0.05;
      }
    }
  });

  // Handle click event
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default action: Open URL in a new tab
      window.open(url, '_blank');
    }
  };

  // Handle iframe load events
  const handleIframeLoad = () => {
    console.log(`WebLinkCard: Iframe loaded for ${url}`);
    setIsLoading(false);
    setLoadError(false);
  };

  const handleIframeError = () => {
    console.error(`WebLinkCard: Error loading iframe for ${url}`);
    setIsLoading(false);
    setLoadError(true);
  };

  // Get domain name from URL for display
  const getDomainFromUrl = (urlString: string): string => {
    try {
      const url = new URL(urlString);
      return url.hostname.replace('www.', '');
    } catch (e) {
      return urlString;
    }
  };

  const domain = getDomainFromUrl(url);

  return (
    <group 
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      rotation={rotation}
      scale={scale}
      onPointerOver={() => updateHoverState(true)}
      onPointerOut={() => updateHoverState(false)}
      onClick={handleClick}
    >
      {/* Web Page Preview */}
      <Html
        transform
        distanceFactor={8}
        position={[0, 0, 0.06]}
        occlude={false}
        style={{
          width: '220px',
          height: '150px',
          pointerEvents: 'none',
          // Mobile WebGL fixes
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          WebkitTransform: 'translate3d(0, 0, 0)',
          WebkitPerspective: '1000px',
          WebkitTransformStyle: 'preserve-3d',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {isLoading && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#f8f8f8',
                zIndex: 10,
              }}
            >
              <div
                className="weblink-spinner"
                style={{
                  width: '30px',
                  height: '30px',
                  border: '3px solid #eee',
                  borderTop: '3px solid #3498db',
                  borderRadius: '50%',
                  marginBottom: '10px',
                }}
              />
              <div style={{ fontSize: '12px', color: '#666' }}>Loading...</div>
            </div>
          )}
          
          {loadError ? (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: '#888',
                fontSize: '12px',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              <div style={{ marginBottom: '10px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="#FF5722"/>
                  <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" fill="#FF5722"/>
                  <path d="M12 8V7" stroke="#FF5722" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 17V16" stroke="#FF5722" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              Unable to load preview
              <div style={{ fontSize: '10px', marginTop: '5px' }}>Click to open website</div>
            </div>
          ) : (
            <iframe
              src={url}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                pointerEvents: 'none',
                opacity: isLoading ? 0 : 1,
                transition: 'opacity 0.3s ease',
              }}
              title={title}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-same-origin"
            />
          )}
          
          {/* URL Bar Overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '24px',
              backgroundColor: 'rgba(245,245,245,0.9)',
              borderBottom: '1px solid #ddd',
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px',
              fontSize: '10px',
              color: '#333',
              fontFamily: 'Arial, sans-serif',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                maxWidth: '80%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {domain}
            </div>
          </div>
        </div>
      </Html>
      
      {/* Title Overlay */}
      <Html
        transform
        distanceFactor={8}
        position={[0, -1.0, 0.05]}
        style={{
          width: '180px',
          maxWidth: '90%',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: '#ffffff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(2px)',
            opacity: hovered ? 1 : 0.8,
            transform: `scale(${hovered ? 1.1 : 1})`,
            transition: 'all 0.2s ease'
          }}
        >
          {title}
        </div>
      </Html>
      
      {/* Description Popup on Hover */}
      {description && (
        <Html
          transform
          distanceFactor={8}
          position={[0, 1.0, 0.06]}
          style={{
            width: '180px',
            maxWidth: '90%',
            pointerEvents: 'none',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: '#ffffff',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'Arial, sans-serif',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{title}</div>
            <div style={{ fontSize: '11px', lineHeight: 1.4 }}>{description}</div>
          </div>
        </Html>
      )}
      
      {/* Click Indicator */}
      <Html
        transform
        distanceFactor={8}
        position={[0, 0, 0.07]}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          pointerEvents: 'none',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: '#ffffff',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '11px',
            fontFamily: 'Arial, sans-serif',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(2px)',
          }}
        >
          Click to open
        </div>
      </Html>
    </group>
  );
}; 