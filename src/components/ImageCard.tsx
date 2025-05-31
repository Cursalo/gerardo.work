import React, { useState } from 'react';
import { Html } from '@react-three/drei';

interface ImageCardProps {
  title: string;
  imageUrl: string;
  description?: string;
  position: [number, number, number];
  rotation?: [number, number, number];
}

/**
 * ImageCard component for displaying images in 3D space
 * Enhanced for mobile compatibility and proper URL resolution
 */
export const ImageCard: React.FC<ImageCardProps> = ({
  title,
  imageUrl,
  description,
  position,
  rotation = [0, 0, 0]
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Enhanced URL resolution for mobile compatibility
  const getResolvedImageUrl = (url: string) => {
    if (!url) return '';
    
    // If it's already a full URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it's a relative URL from public directory, ensure it starts with /
    if (url.startsWith('/projects/') || url.startsWith('/assets/')) {
      return url;
    }
    
    // If it's just a path without leading /, add it
    if (!url.startsWith('/') && !url.includes('://')) {
      return `/${url}`;
    }
    
    return url;
  };

  const resolvedImageUrl = getResolvedImageUrl(imageUrl);

  const handleImageError = () => {
    console.warn(`Failed to load image: ${resolvedImageUrl}`);
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[2, 1.5]} />
        <meshStandardMaterial 
          color="#ffffff" 
          emissive="#ffffff" 
          emissiveIntensity={0.1}
        />
      </mesh>
      
      <Html
        transform
        distanceFactor={6}
        position={[0, 0, 0.01]}
        style={{
          width: '200px',
          height: '150px',
          borderRadius: '8px',
          overflow: 'hidden',
          pointerEvents: 'auto'
        }}
      >
        <div style={{ 
          width: '100%', 
          height: '100%', 
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          {/* Title */}
          <div style={{
            position: 'absolute',
            top: '-25px',
            left: '0',
            right: '0',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#333',
            textAlign: 'center',
            zIndex: 10
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
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed #ccc',
                color: '#666'
              }}
            >
              <div style={{ fontSize: '12px', textAlign: 'center', padding: '10px' }}>
                <div>🖼️ Image unavailable</div>
                <div style={{ fontSize: '10px', marginTop: '5px' }}>
                  {title}
                </div>
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
                borderRadius: '8px',
                backgroundColor: '#f0f0f0'
              }}
            />
          )}

          {/* Description overlay */}
          {description && !imageError && (
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              fontSize: '10px',
              color: '#fff',
              background: 'rgba(0,0,0,0.7)',
              padding: '5px',
              textAlign: 'center'
            }}>
              {description}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}; 