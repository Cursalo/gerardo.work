import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

interface PDFCardProps {
  title: string;
  description?: string;
  pdfUrl: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onClick?: () => void;
}

// Add CSS for loading spinner
const pdfSpinnerStyle = document.createElement('style');
pdfSpinnerStyle.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
if (!document.head.querySelector('[data-pdf-spinner]')) {
  pdfSpinnerStyle.setAttribute('data-pdf-spinner', 'true');
  document.head.appendChild(pdfSpinnerStyle);
}

/**
 * PDFCard component
 * 
 * Displays PDF content in 3D space with proper fallbacks and mobile compatibility.
 */
export const PDFCard: React.FC<PDFCardProps> = ({
  title,
  description,
  pdfUrl,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  onClick,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [resolvedPdfUrl, setResolvedPdfUrl] = useState<string>('');

  // Set initial position
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2]);
    }
  }, [position]);

  // Enhanced PDF URL resolution with proper encoding and fallbacks
  const resolvePdfUrl = (url: string): string => {
    if (!url) return '';
    
    // If it's already a full URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Handle file:// URLs from localStorage
    if (url.startsWith('file://')) {
      try {
        const filename = url.replace('file://', '');
        const storedFilesStr = localStorage.getItem('portfolio_files');
        
        if (storedFilesStr) {
          const storedFiles = JSON.parse(storedFilesStr);
          const fileData = storedFiles[filename];
          
          if (fileData && fileData.dataUrl) {
            console.log(`PDFCard: Resolved localStorage file URL for ${filename}`);
            return fileData.dataUrl;
          }
        }
      } catch (error) {
        console.error('PDFCard: Error resolving localStorage file URL:', error);
      }
      
      // Fallback: treat as relative path without file://
      const filename = url.replace('file://', '');
      url = filename;
    }
    
    // If it's a relative URL from public directory, encode spaces and special characters
    if (url.startsWith('/projects/') || url.startsWith('/assets/') || url.startsWith('/')) {
      return url.split('/').map(segment => segment ? encodeURIComponent(segment) : segment).join('/');
    }
    
    // If it's just a path without leading /, add it and encode
    if (!url.startsWith('/') && !url.includes('://')) {
      return `/${url}`.split('/').map(segment => segment ? encodeURIComponent(segment) : segment).join('/');
    }
    
    return url;
  };

  // Process PDF URL on mount and when pdfUrl changes
  useEffect(() => {
    const resolved = resolvePdfUrl(pdfUrl);
    setResolvedPdfUrl(resolved);
    setPdfLoadError(false);
    
    console.log(`PDFCard: Resolved URL for "${title}": ${resolved}`);
  }, [pdfUrl, title]);

  // Check if PDF can be embedded (basic heuristic)
  const canEmbedPdf = (url: string): boolean => {
    if (!url) return false;
    
    // Data URLs from localStorage should work
    if (url.startsWith('data:application/pdf')) return true;
    
    // Local files should work
    if (url.startsWith('/')) return true;
    
    // Known problematic domains
    const problematicDomains = ['drive.google.com', 'dropbox.com', 'onedrive.com'];
    const urlLower = url.toLowerCase();
    
    return !problematicDomains.some(domain => urlLower.includes(domain));
  };

  // Camera facing animation
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

  // Handle hover events
  const handlePointerEnter = () => {
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerLeave = () => {
    setHovered(false);
    document.body.style.cursor = 'default';
  };

  // Handle click event
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default action: Open PDF in a new tab
      window.open(resolvedPdfUrl, '_blank');
    }
  };

  // Handle iframe load error
  const handleIframeError = () => {
    console.warn(`PDFCard: Failed to load PDF in iframe: ${resolvedPdfUrl}`);
    setPdfLoadError(true);
  };

  return (
    <group 
      ref={groupRef}
      rotation={rotation}
      scale={scale}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      {/* PDF Thumbnail and Viewer */}
      <Html
        transform={false}
        distanceFactor={8}
        position={[0, 0, 0.06]}
        style={{
          width: '180px',
          height: '250px',
          pointerEvents: 'none',
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
          }}
        >
          {pdfLoadError || !canEmbedPdf(resolvedPdfUrl) ? (
            // Error state or non-embeddable PDF
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
                  <path d="M20 2H8C6.9 2 6 2.9 6 4V16C6 17.1 6.9 18 8 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="#FF5722"/>
                  <path d="M4 6H2V20C2 21.1 2.9 22 4 22H18V20H4V6Z" fill="#FF5722"/>
                  <path d="M12 11H16V12H12V11Z" fill="white"/>
                  <path d="M12 7H16V8H12V7Z" fill="white"/>
                  <path d="M12 9H16V10H12V9Z" fill="white"/>
                </svg>
              </div>
              PDF Document
              <div style={{ fontSize: '10px', marginTop: '5px', fontWeight: 'bold' }}>Click to open in new tab</div>
              {resolvedPdfUrl && (
                <div style={{ fontSize: '9px', marginTop: '8px', color: '#aaa', wordBreak: 'break-all' }}>
                  {resolvedPdfUrl.length > 50 ? `${resolvedPdfUrl.substring(0, 50)}...` : resolvedPdfUrl}
                </div>
              )}
            </div>
          ) : resolvedPdfUrl ? (
            // Try to embed PDF
            <iframe
              src={`${resolvedPdfUrl}#toolbar=0&navpanes=0&view=FitH`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                pointerEvents: 'none',
                backgroundColor: '#f5f5f5',
              }}
              title={title}
              onError={handleIframeError}
              onLoad={() => console.log(`PDFCard: Successfully loaded PDF iframe for ${title}`)}
            />
          ) : (
            // Loading state
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
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #eee',
                  borderTop: '2px solid #666',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto'
                }} />
              </div>
              Loading PDF...
            </div>
          )}
        </div>
      </Html>
      
      {/* Title Overlay */}
      <Html
        transform={false}
        distanceFactor={8}
        position={[0, -1.5, 0.05]}
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
          transform={false}
          distanceFactor={8}
          position={[0, 1.5, 0.06]}
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
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{title}</div>
            <div style={{ fontSize: '11px', lineHeight: 1.4 }}>{description}</div>
          </div>
        </Html>
      )}
    </group>
  );
};

export default PDFCard; 