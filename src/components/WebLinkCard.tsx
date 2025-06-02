import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useAppContext } from '../hooks/useAppContext';
import { useInteraction } from '../context/InteractionContext';
import useMobileDetection from '../hooks/useMobileDetection';
import { openFileWithViewer, isExternalUrl, detectFileType } from '../utils/fileUtils';

// Add CSS for beautiful animations
const weblinkStyles = document.createElement('style');
weblinkStyles.textContent = `
  .weblink-card {
    animation: weblinkSlideIn 0.6s ease-out;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .weblink-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 40px rgba(0,0,0,0.15);
  }
  @keyframes weblinkSlideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .weblink-shimmer {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .weblink-spinner {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .weblink-icon-bounce {
    animation: iconBounce 2s infinite;
  }
  @keyframes iconBounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-5px); }
    60% { transform: translateY(-3px); }
  }
  @keyframes pulse {
    0% { transform: translate(-50%, -50%) scale(1); }
    50% { transform: translate(-50%, -50%) scale(1.1); }
    100% { transform: translate(-50%, -50%) scale(1); }
  }
`;
if (!document.head.querySelector('[data-weblink-modern-styles]')) {
  weblinkStyles.setAttribute('data-weblink-modern-styles', 'true');
  document.head.appendChild(weblinkStyles);
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
  const [isOverlapping, setIsOverlapping] = useState(false);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [siteInfo, setSiteInfo] = useState<{
    favicon?: string;
    title?: string;
    description?: string;
    image?: string;
  }>({});
  const { registerObject, unregisterObject, checkOverlap } = useAppContext();
  const { hoveredObject } = useInteraction();
  const isMobile = useMobileDetection();

  // Check if this card is currently hovered via the raycasting system
  const hovered = hoveredObject?.userData?.url === url;

  // Set initial position and register for 3D interactions
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2]);
      
      // Set up 3D interaction data for the crosshair system (EXACTLY like WorldObject.tsx)
      // Detect file type to set proper interaction type
      const fileInfo = detectFileType(url);
      const isExternal = isExternalUrl(url);
      
      const interactionData = {
        interactive: true,
        action: isExternal ? 'open_url' : 'view_media',
        objectType: isExternal ? 'link' : fileInfo.type,
        title: title,
        url: url,
        type: isExternal ? 'link' : fileInfo.type // Set type based on file detection
      };
      
      // CRITICAL FIX: Set userData on BOTH group and mesh for raycasting detection
      groupRef.current.userData = interactionData;
      
      // Also set on mesh when it's available
      if (meshRef.current) {
        meshRef.current.userData = interactionData;
      }
    }
  }, [position, title, url]);

  // Handle click function with smart file/URL detection
  const handleClick = useCallback((e?: any) => {
    if (e) {
      e.stopPropagation();
    }
    console.log('WebLink Card clicked!', url);
    
    if (url) {
      // Detect if this is an external URL or a local file
      if (isExternalUrl(url) || url.startsWith('http://') || url.startsWith('https://')) {
        // External URL - open directly
        window.open(url, '_blank');
      } else {
        // Local file - use file viewer utility
        const fileInfo = detectFileType(url);
        console.log('Detected file type:', fileInfo.type, 'for URL:', url);
        openFileWithViewer(url, title);
      }
    }
    
    if (onClick) {
      onClick();
    }
  }, [url, onClick, title]);

  // Update userData with onClick function after handleClick is defined
  useEffect(() => {
    if (groupRef.current && groupRef.current.userData) {
      groupRef.current.userData.onClick = handleClick;
      if (meshRef.current) {
        meshRef.current.userData.onClick = handleClick;
      }
    }
  }, [handleClick]);

  // Extract domain and get site info
  useEffect(() => {
    const extractSiteInfo = async () => {
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '');
        const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        
        // Simulate loading time for better UX
        setTimeout(() => {
          setSiteInfo({
            favicon,
            title: title || domain,
            description: description || `Visit ${domain}`,
          });
          setLoadState('loaded');
        }, 800 + Math.random() * 1200);
      } catch (error) {
        console.error('Error extracting site info:', error);
        setLoadState('error');
      }
    };

    extractSiteInfo();
  }, [url, title, description]);

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
      const time = state.clock.elapsedTime;
      
      // FIXED: Keep cards in their assigned positions with only gentle floating
      const baseY = position[1];
      const floatOffset = Math.sin(time * 0.6 + position[0] * 0.3) * 0.12;
      
      // Lock to original position coordinates
      groupRef.current.position.set(
        position[0], 
        baseY + floatOffset, 
        position[2]
      );
      
      // Check for overlaps using the fixed world position
      const worldPosition = new THREE.Vector3(position[0], position[1], position[2]);
      const isOverlappingNow = checkOverlap(worldPosition);
      if (isOverlappingNow !== isOverlapping) {
        setIsOverlapping(isOverlappingNow);
      }
      
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
      const rotationSpeed = hovered ? 0.1 : 0.05;
      groupRef.current.rotation.y += adjustedDiff * rotationSpeed;
      
      // Add gentle wobble when hovered (rotation only)
      if (hovered) {
        const wobble = Math.sin(time * 3) * 0.015;
        groupRef.current.rotation.y += wobble;
      }
    }
  });

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
      rotation={rotation}
      scale={scale}
      onClick={handleClick}
    >
      {/* Invisible 3D mesh for raycasting detection - ENLARGED for better clicking */}
      <mesh
        ref={meshRef}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[(isMobile ? 3.0 : 2.8) * 1.2, (isMobile ? 2.2 : 2.0) * 1.2]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Modern Beautiful Web Link Card */}
      <Html
        transform={false}
        distanceFactor={5}
        position={[0, 0, 0.1]}
        style={{
          width: isMobile ? '300px' : '280px',
          height: isMobile ? '220px' : '200px',
          pointerEvents: isMobile ? 'auto' : 'none', // Enable touch on mobile
          transform: hovered ? 'scale(1.05)' : 'scale(1)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          className="weblink-card"
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #374151 0%, #4b5563 50%, #6b7280 100%)',
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
            cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            pointerEvents: isMobile ? 'auto' : 'none', // Enable touch on mobile
          }}
          onClick={isMobile ? handleClick : undefined} // Direct click handler for mobile
          onTouchStart={isMobile ? (e) => e.stopPropagation() : undefined} // Prevent event bubbling
        >
          {/* Background Pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              opacity: 0.6,
              pointerEvents: 'none',
            }}
          />

          {/* Content Container */}
          <div
            style={{
              position: 'relative',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              color: '#ffffff',
              pointerEvents: 'none', // Keep none for inner content to avoid event conflicts
            }}
          >
            {/* Header with Favicon and Domain */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                {loadState === 'loading' ? (
                  <div
                    className="weblink-spinner"
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid #ffffff',
                      borderRadius: '50%',
                    }}
                  />
                ) : loadState === 'loaded' && siteInfo.favicon ? (
                  <img
                    src={siteInfo.favicon}
                    alt={domain}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                )}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'rgba(255,255,255,0.7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '2px',
                  }}
                >
                  Project Showcase
                </div>
                <div
                  style={{
                    fontSize: '9px',
                    color: 'rgba(255,255,255,0.5)',
                    fontFamily: 'monospace',
                  }}
                >
                  {loadState === 'loading' ? 'Loading...' : 'Details'}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {loadState === 'loading' ? (
                <div>
                  <div
                    className="weblink-shimmer"
                    style={{
                      height: '20px',
                      borderRadius: '4px',
                      marginBottom: '12px',
                    }}
                  />
                  <div
                    className="weblink-shimmer"
                    style={{
                      height: '14px',
                      borderRadius: '4px',
                      width: '80%',
                      marginBottom: '8px',
                    }}
                  />
                  <div
                    className="weblink-shimmer"
                    style={{
                      height: '14px',
                      borderRadius: '4px',
                      width: '60%',
                    }}
                  />
                </div>
              ) : (
                <>
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      margin: '0 0 12px 0',
                      lineHeight: '1.3',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {siteInfo.title || title}
                  </h3>
                  
                  {(siteInfo.description || description) && (
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.7)',
                        margin: 0,
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {siteInfo.description || description}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Footer with Call to Action */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Click to visit</span>
                <svg 
                  className={hovered ? 'weblink-icon-bounce' : ''}
                  width="14" 
                  height="14" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <path d="M7 17L17 7"/>
                  <path d="M7 7h10v10"/>
                </svg>
              </div>
              
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: loadState === 'loaded' ? '#10B981' : loadState === 'loading' ? '#F59E0B' : '#EF4444',
                  boxShadow: `0 0 8px ${loadState === 'loaded' ? '#10B981' : loadState === 'loading' ? '#F59E0B' : '#EF4444'}`,
                }}
              />
            </div>
          </div>

          {/* Hover Overlay */}
          {hovered && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                borderRadius: '16px',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Mobile Interaction Button */}
          {isMobile && hovered && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '60px',
                height: '60px',
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                color: '#374151',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                animation: 'pulse 2s infinite',
                pointerEvents: 'none',
              }}
            >
              🔗
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}; 