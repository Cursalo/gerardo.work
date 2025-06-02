import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useAppContext } from '../hooks/useAppContext';
import { useInteraction } from '../context/InteractionContext';
import useMobileDetection from '../hooks/useMobileDetection';
import { openFileWithViewer } from '../utils/fileUtils';

// Import PDF.js with proper worker configuration
declare global {
  interface Window {
    pdfjsLib: any;
    pdfjsWorker: any;
  }
}

// Add CSS for beautiful animations
const pdfStyles = document.createElement('style');
pdfStyles.textContent = `
  .pdf-card {
    animation: pdfSlideIn 0.6s ease-out;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .pdf-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 25px 50px rgba(0,0,0,0.2);
  }
  @keyframes pdfSlideIn {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  .pdf-shimmer {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .pdf-spinner {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .pdf-progress {
    animation: progress 2s ease-in-out infinite;
  }
  @keyframes progress {
    0%, 100% { transform: scaleX(0.3); }
    50% { transform: scaleX(0.7); }
  }
  .pdf-pages-flip {
    animation: pageFlip 3s ease-in-out infinite;
  }
  @keyframes pageFlip {
    0%, 100% { transform: rotateY(0deg); }
    25% { transform: rotateY(-5deg); }
    75% { transform: rotateY(5deg); }
  }
`;
if (!document.head.querySelector('[data-pdf-modern-styles]')) {
  pdfStyles.setAttribute('data-pdf-modern-styles', 'true');
  document.head.appendChild(pdfStyles);
}

// Dynamically load PDF.js
const loadPDFJS = async () => {
  if (window.pdfjsLib) return window.pdfjsLib;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      if (window.pdfjsLib) {
        // Configure worker
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('PDF.js failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js script'));
    document.head.appendChild(script);
  });
};

interface PDFCardProps {
  title: string;
  description?: string;
  pdfUrl: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onClick?: () => void;
  isMobile?: boolean;
}

export const PDFCard: React.FC<PDFCardProps> = ({
  title,
  description,
  pdfUrl,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  onClick,
  isMobile = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isOverlapping, setIsOverlapping] = useState(false);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [pdfInfo, setPdfInfo] = useState<{
    numPages?: number;
    thumbnail?: string;
    fileSize?: string;
    title?: string;
  }>({});
  const [loadProgress, setLoadProgress] = useState(0);
  const { registerObject, unregisterObject, checkOverlap } = useAppContext();
  const { hoveredObject } = useInteraction();
  const { isMobile: detectedMobile } = useMobileDetection();

  // Check if this card is currently hovered via the raycasting system
  const hovered = hoveredObject?.userData?.url === pdfUrl && hoveredObject?.userData?.type === 'pdf';

  // Set initial position and register for 3D interactions
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2]);
      
      // Set up 3D interaction data for the crosshair system (EXACTLY like WorldObject.tsx)
      const interactionData = {
        interactive: true,
        action: 'open_url',
        objectType: 'pdf',
        title: title,
        url: pdfUrl,
        type: 'pdf'
      };
      
      // CRITICAL FIX: Set userData on BOTH group and mesh for raycasting detection
      groupRef.current.userData = interactionData;
      
      // Also set on mesh when it's available
      if (meshRef.current) {
        meshRef.current.userData = interactionData;
      }
    }
  }, [position, title, pdfUrl]);

  // Handle click function using the new file utility
  const handleClick = useCallback((e?: any) => {
    if (e) {
      e.stopPropagation();
    }
    console.log('PDF Card clicked!', pdfUrl);
    
    if (pdfUrl) {
      // Use the new file utility for proper handling
      openFileWithViewer(pdfUrl, title);
    }
    
    if (onClick) {
      onClick();
    }
  }, [pdfUrl, onClick, title]);

  // Update userData with onClick function after handleClick is defined
  useEffect(() => {
    if (groupRef.current && groupRef.current.userData) {
      groupRef.current.userData.onClick = handleClick;
      if (meshRef.current) {
        meshRef.current.userData.onClick = handleClick;
      }
    }
  }, [handleClick]);

  // Load and process PDF
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoadState('loading');
        setLoadProgress(0);

        const pdfjsLib = await loadPDFJS();
        
        // Create loading task with progress tracking
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        });

        // Track loading progress
        loadingTask.onProgress = (progress: any) => {
          if (progress.total > 0) {
            setLoadProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        };

        const pdf = await loadingTask.promise;
        
        // Get PDF info
        const numPages = pdf.numPages;
        const metadata = await pdf.getMetadata();
        
        // Generate thumbnail from first page
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);

        // Estimate file size
        const fileSize = await fetch(pdfUrl, { method: 'HEAD' })
          .then(response => {
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
              const bytes = parseInt(contentLength);
              if (bytes < 1024) return `${bytes} B`;
              if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
              return `${Math.round(bytes / 1048576)} MB`;
            }
            return 'Unknown size';
          })
          .catch(() => 'Unknown size');

        setPdfInfo({
          numPages,
          thumbnail: thumbnailDataUrl,
          fileSize,
          title: metadata?.info?.Title || title,
        });

        setLoadState('loaded');
      } catch (error) {
        console.error('Error loading PDF:', error);
        setLoadState('error');
      }
    };

    if (pdfUrl) {
      loadPDF();
    }
  }, [pdfUrl, title]);

  // Register this component's position and check for overlaps
  useEffect(() => {
    if (groupRef.current) {
      const id = `pdf-${title}-${position.join(',')}`;
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
      const floatOffset = Math.sin(time * 0.4 + position[0] * 0.2) * 0.1;
      
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
        const wobble = Math.sin(time * 2.5) * 0.012;
        groupRef.current.rotation.y += wobble;
      }
    }
  });

  // Get file name from URL
  const getFileNameFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.split('/').pop() || 'document.pdf';
      return fileName.replace(/\.[^/.]+$/, ''); // Remove extension
    } catch (e) {
      return 'Document';
    }
  };

  const fileName = getFileNameFromUrl(pdfUrl);

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
        <planeGeometry args={[(detectedMobile ? 3.4 : 3.2) * 1.2, (detectedMobile ? 2.6 : 2.4) * 1.2]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Modern Beautiful PDF Card */}
      <Html
        transform={false}
        distanceFactor={5}
        position={[0, 0, 0.1]}
        style={{
          width: detectedMobile ? '340px' : '320px',
          height: detectedMobile ? '260px' : '240px',
          pointerEvents: detectedMobile ? 'auto' : 'none', // Enable touch on mobile
          transform: hovered ? 'scale(1.05)' : 'scale(1)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          className="pdf-card"
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)',
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
            cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            pointerEvents: detectedMobile ? 'auto' : 'none', // Enable touch on mobile
          }}
          onClick={detectedMobile ? handleClick : undefined} // Direct click handler for mobile
          onTouchStart={detectedMobile ? (e) => e.stopPropagation() : undefined} // Prevent event bubbling
        >
          {/* Background Pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/svg%3E")`,
              opacity: 0.8,
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
            {/* Header with PDF Icon and Info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px',
                gap: '12px',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.2)',
                  pointerEvents: 'none',
                }}
              >
                {loadState === 'loading' ? (
                  <div
                    className="pdf-spinner"
                    style={{
                      width: '20px',
                      height: '20px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid #ffffff',
                      borderRadius: '50%',
                    }}
                  />
                ) : loadState === 'error' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                    <line x1="12" y1="12" x2="12" y2="18"/>
                  </svg>
                ) : (
                  <div className={hovered ? 'pdf-pages-flip' : ''}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                  </div>
                )}
              </div>
              
              <div style={{ flex: 1, minWidth: 0, pointerEvents: 'none' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'rgba(255,255,255,0.8)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '2px',
                    pointerEvents: 'none',
                  }}
                >
                  PDF Document
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.6)',
                    fontFamily: 'monospace',
                    pointerEvents: 'none',
                  }}
                >
                  {loadState === 'loading' 
                    ? `Loading... ${loadProgress}%`
                    : loadState === 'error' 
                    ? 'Failed to load'
                    : `${pdfInfo.numPages || 0} pages • ${pdfInfo.fileSize || ''}`
                  }
                </div>
              </div>
            </div>

            {/* PDF Preview Area */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              {loadState === 'loading' ? (
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '80px',
                      height: '100px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px dashed rgba(255,255,255,0.3)',
                    }}
                  >
                    <div
                      className="pdf-progress"
                      style={{
                        width: '40px',
                        height: '4px',
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        borderRadius: '2px',
                        transformOrigin: 'left',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                    Generating preview...
                  </div>
                </div>
              ) : loadState === 'error' ? (
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '80px',
                      height: '100px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <path d="M12 15V12"/>
                      <path d="M12 18h.01"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                    Preview unavailable
                  </div>
                </div>
              ) : pdfInfo.thumbnail ? (
                <div
                  style={{
                    width: '110px',
                    height: '130px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    transform: hovered ? 'rotateY(-5deg) rotateX(5deg)' : 'rotateY(0deg) rotateX(0deg)',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <img
                    src={pdfInfo.thumbnail}
                    alt="PDF Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: '80px',
                    height: '100px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Title and Description */}
            <div style={{ marginBottom: '28px', paddingBottom: '8px' }}>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  margin: '0',
                  lineHeight: '1.3',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {pdfInfo.title || title}
              </h3>
            </div>

            {/* Footer with Call to Action */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>PDF Document</span>
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
        </div>
      </Html>
    </group>
  );
};

export default PDFCard; 