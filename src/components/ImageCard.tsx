import React, { useState, useRef, useContext, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Mesh, Group, Vector3, Matrix4, Quaternion } from 'three';
import { VisibilityContext } from './Scene';
import * as THREE from 'three';

interface ImageCardProps {
  title: string;
  imageUrl: string;
  description?: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  isInSubWorld?: boolean;
}

/**
 * ImageCard component
 * 
 * Displays image content in 3D space with hover effects and rounded corners.
 */
export const ImageCard: React.FC<ImageCardProps> = ({
  title,
  imageUrl,
  description,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  isInSubWorld = false
}) => {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [hasError, setHasError] = useState(false);
  
  // Add floating animation state
  const floatOffset = useRef(Math.random() * Math.PI * 2); // Random starting phase
  const initialY = useRef(position[1]); // Store initial Y position

  const { camera } = useThree();
  const { registerPosition, checkOverlap } = useContext(VisibilityContext);
  const idRef = useRef<number>(Math.floor(Math.random() * 10000));

  useEffect(() => {
    if(groupRef.current) {
        registerPosition(idRef.current, [groupRef.current.position.x, groupRef.current.position.y, groupRef.current.position.z]);
    }
  }, [position, registerPosition, groupRef]);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.userData.interactive = true;
      meshRef.current.userData.onClick = handleClick;
    }

    // Set userData for BillboardManager to recognize this as a card
    if (groupRef.current) {
      groupRef.current.userData.objectType = 'image';
      groupRef.current.name = 'imageCard';
    }
  }, []);

  useEffect(() => {
    if (groupRef.current) {
      // Set initial position directly
      groupRef.current.position.set(position[0], position[1], position[2]);
    }
  }, [position]);

  // Add floating animation in useFrame
  useFrame((state) => {
    if (groupRef.current && !isInSubWorld) { // Only float if not in sub-world
      const time = state.clock.getElapsedTime();
      
      // Floating motion
      const floatY = Math.sin(time * 0.5 + floatOffset.current) * 0.2; // Gentle floating
      groupRef.current.position.y = initialY.current + floatY;
      
      // Subtle rotation
      const rotX = Math.sin(time * 0.3 + floatOffset.current) * 0.02;
      const rotZ = Math.cos(time * 0.4 + floatOffset.current) * 0.02;
      groupRef.current.rotation.x = rotX;
      groupRef.current.rotation.z = rotZ;
    }
  });

  const updateHoverState = (isHovered: boolean) => {
    // If in a sub-world, don't apply hover effects
    if (isInSubWorld) {
      setHovered(false);
      return;
    }
    
    setHovered(isHovered);
    if (groupRef.current) {
      const targetScale = isHovered ? 1.15 : 1.0;
      groupRef.current.scale.set(targetScale, targetScale, targetScale);
    }
  };

  const handleClick = () => {
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    }
  };

  useEffect(() => {
    let isMounted = true;
    setTexture(null);
    setHasError(false);

    const fallbackUrl = 'https://placehold.co/600x400/cccccc/000000?text=Not+Available';
    const canvasTextureWidth = 512;

    const createImageTexture = (url: string, isFallback: boolean) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      console.log(`ImageCard: Attempting to load image: ${url}`);

      img.onload = () => {
        if (!isMounted) return;
        console.log(`ImageCard: Image loaded: ${url}`);

        const canvas = document.createElement('canvas');
        const imgAspectRatio = img.width / img.height;
        
        // Enhanced handling for portrait/vertical images (9:16 aspect ratio)
        if (imgAspectRatio < 0.8) { // Portrait/vertical image (including 9:16)
          // For extreme portrait images, ensure full height is captured
          const canvasHeight = Math.max(canvasTextureWidth, canvasTextureWidth / imgAspectRatio * 1.2);
          canvas.height = canvasHeight;
          canvas.width = canvasHeight * imgAspectRatio;
        } else {
          canvas.width = canvasTextureWidth;
          canvas.height = canvasTextureWidth / imgAspectRatio;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('ImageCard: Could not get 2D context from canvas');
          if (isMounted) setHasError(true);
          return;
        }

        const cornerRadius = Math.min(25, canvas.width * 0.1, canvas.height * 0.1);

        ctx.beginPath();
        ctx.moveTo(cornerRadius, 0);
        ctx.lineTo(canvas.width - cornerRadius, 0);
        ctx.arcTo(canvas.width, 0, canvas.width, cornerRadius, cornerRadius);
        ctx.lineTo(canvas.width, canvas.height - cornerRadius);
        ctx.arcTo(canvas.width, canvas.height, canvas.width - cornerRadius, canvas.height, cornerRadius);
        ctx.lineTo(cornerRadius, canvas.height);
        ctx.arcTo(0, canvas.height, 0, canvas.height - cornerRadius, cornerRadius);
        ctx.lineTo(0, cornerRadius);
        ctx.arcTo(0, 0, cornerRadius, 0, cornerRadius);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const newCanvasTexture = new THREE.CanvasTexture(canvas);
        newCanvasTexture.colorSpace = THREE.SRGBColorSpace;
        newCanvasTexture.needsUpdate = true;

        if (isMounted) {
          setTexture(newCanvasTexture);
          setHasError(false);
        }
      };

      img.onerror = (err) => {
        if (!isMounted) return;
        console.error(`ImageCard: Error loading image ${url}:`, err);
        if (!isFallback) {
          console.log('ImageCard: Attempting to load fallback image.');
          createImageTexture(fallbackUrl, true);
        } else {
          console.error('ImageCard: Fallback image also failed to load.');
          setHasError(true);
        }
      };

      img.src = url;
    };

    let actualUrl = imageUrl;
    if (imageUrl && imageUrl.startsWith('file://')) {
      try {
        const filename = imageUrl.replace('file://', '');
        const storedFilesStr = localStorage.getItem('portfolio_files');
        if (storedFilesStr) {
          const storedFiles = JSON.parse(storedFilesStr);
          const fileData = storedFiles[filename];
          if (fileData && fileData.dataUrl) {
            actualUrl = fileData.dataUrl;
            console.log(`ImageCard: Resolved file:// to dataURL for ${filename}`);
          } else {
            console.warn(`ImageCard: file:// ${filename} not found in localStorage cache.`);
          }
        }
      } catch (error) {
        console.error('ImageCard: Error resolving file URL from localStorage:', error);
      }
    }

    if (actualUrl) {
      createImageTexture(actualUrl, false);
    } else if (imageUrl) {
      console.warn(`ImageCard: Could not resolve ${imageUrl}, trying fallback.`);
      createImageTexture(fallbackUrl, true);
    } else {
      console.warn('ImageCard: No imageUrl provided, loading fallback.');
      createImageTexture(fallbackUrl, true);
    }

    return () => {
      isMounted = false;
      if (texture) {
      }
    };
  }, [imageUrl]);

  const aspectRatio = texture && texture.image ? texture.image.width / texture.image.height : 16 / 9;
  const cardWidth = 3;
  const cardHeight = cardWidth / aspectRatio;
  
  // Calculate title position adjustment for portrait images
  const titlePositionY = aspectRatio < 0.8 ? -(cardHeight / 2 + 0.2) : -(cardHeight / 2 + 0.15);

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
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
      >
        <planeGeometry args={[cardWidth, cardHeight]} />
        {texture && !hasError ? (
          <meshBasicMaterial
            map={texture}
            color={"#ffffff"}
            side={THREE.DoubleSide}
            transparent={true}
          />
        ) : (
          <meshBasicMaterial
            color={hasError ? "#555555" : "#999999"}
            side={THREE.DoubleSide}
            transparent={true}
          />
        )}
      </mesh>
      
      <Html
        transform
        distanceFactor={8}
        position={[0, titlePositionY, 0.05]}
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
      
      {description && (
        <Html
          transform
          distanceFactor={8}
          position={[0, 0, 0.06]}
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