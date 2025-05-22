import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useAppContext } from '../hooks/useAppContext';

interface PDFCardProps {
  title: string;
  description?: string;
  pdfUrl: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onClick?: () => void;
}

/**
 * PDFCard component
 * 
 * Displays PDF content in 3D space with hover effects and rounded corners.
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
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [isOverlapping, setIsOverlapping] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const { raycaster, camera, registerObject, unregisterObject, checkOverlap } = useAppContext();

  // Add camera from useThree
  const { camera: threeCamera } = useThree();

  // Handle hover state
  const updateHoverState = (state: boolean) => {
    setHovered(state);
  };

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

  // Update useFrame with billboard behavior
  useFrame((state) => {
    if (groupRef.current && threeCamera) {
      // Keep the card at its intended position with slight floating animation
      groupRef.current.position.x = position[0];
      groupRef.current.position.z = position[2];
      
      // Only apply gentle floating animation to Y position
      const floatHeight = Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.2;
      groupRef.current.position.y = position[1] + floatHeight;
      
      // Enable matrixAutoUpdate for standard Three.js rotation handling
      groupRef.current.matrixAutoUpdate = true;
    }
  });

  // Handle click event
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default action: Open PDF in a new tab
      window.open(pdfUrl, '_blank');
    }
  };

  // Process PDF URL for potential localStorage files
  useEffect(() => {
    let urlToUse = pdfUrl;
    
    // Handle localStorage file URLs
    if (urlToUse.startsWith('file://')) {
      try {
        const filename = urlToUse.replace('file://', '');
        const storedFilesStr = localStorage.getItem('portfolio_files');
        
        if (storedFilesStr) {
          const storedFiles = JSON.parse(storedFilesStr);
          const fileData = storedFiles[filename];
          
          if (fileData && fileData.dataUrl) {
            console.log(`PDFCard: Resolved file URL for ${filename}`);
            urlToUse = fileData.dataUrl;
          }
        }
      } catch (error) {
        console.error('PDFCard: Error resolving file URL:', error);
      }
    }
    
    // Verify PDF is accessible
    setPdfReady(!!urlToUse);
  }, [pdfUrl]);

  // Find and modify the useEffect that sets up meshRef
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.userData.interactive = true;
      meshRef.current.userData.onClick = handleClick;
    }
    
    // Set userData for BillboardManager to recognize this as a card
    if (groupRef.current) {
      groupRef.current.userData.objectType = 'pdf';
      groupRef.current.name = 'pdfCard';
    }
  }, []);

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
      {/* PDF Card Base */}
      <mesh 
        ref={meshRef} 
        castShadow 
        receiveShadow
      >
        <boxGeometry args={[2, 2.8, 0.05]} />
        <meshStandardMaterial 
          color={hovered ? "#ffffff" : "#f0f0f0"}
          emissive={hovered ? "#ffffff" : "#cccccc"}
          emissiveIntensity={hovered ? 0.5 : 0.1}
          metalness={0.2}
          roughness={0.3}
        />
      </mesh>
      
      {/* PDF Thumbnail and Viewer */}
      <Html
        transform
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
          {pdfReady ? (
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                pointerEvents: 'none',
              }}
              title={title}
            />
          ) : (
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
              PDF Viewer
              <div style={{ fontSize: '10px', marginTop: '5px' }}>Click to open PDF</div>
            </div>
          )}
        </div>
      </Html>
      
      {/* Title Overlay */}
      <Html
        transform
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
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: '#ffffff',
            padding: '3px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(2px)',
            opacity: 0.8,
            transform: `scale(${hovered ? 1.1 : 1})`,
            transition: 'all 0.2s ease'
          }}
        >
          {title.replace(/\.[^/.]+$/, "")}
        </div>
      </Html>
      
      {/* Description Popup on Hover */}
      {description && (
        <Html
          transform
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
              backdropFilter: 'blur(4px)',
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