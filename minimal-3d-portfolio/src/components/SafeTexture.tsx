import React, { useState, useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface SafeTextureProps {
  url: string;
  fallbackUrl?: string;
  onLoad?: (texture: THREE.Texture) => void;
  onError?: (error: Error) => void;
}

const SafeTexture: React.FC<SafeTextureProps> = ({ 
  url, 
  fallbackUrl = 'https://placehold.co/600x400/cccccc/333333?text=Image+Not+Available',
  onLoad,
  onError
}) => {
  const [textureUrl, setTextureUrl] = useState<string>(url);
  const [hasErrored, setHasErrored] = useState(false);
  
  // Handle data URLs from localStorage
  useEffect(() => {
    // If it's already a data URL, use it directly
    if (url.startsWith('data:')) {
      setTextureUrl(url);
      return;
    }
    
    // If it's a file:// URL, try to resolve it from localStorage
    if (url.startsWith('file://')) {
      try {
        const filename = url.replace('file://', '');
        const storedFilesStr = localStorage.getItem('portfolio_files');
        
        if (storedFilesStr) {
          const storedFiles = JSON.parse(storedFilesStr);
          const fileData = storedFiles[filename];
          
          if (fileData && fileData.dataUrl) {
            console.log(`Resolved file URL for ${filename}`);
            setTextureUrl(fileData.dataUrl);
            return;
          }
        }
        
        // If we couldn't resolve the file URL, use the fallback
        console.warn(`Could not resolve file URL: ${url}`);
        setTextureUrl(fallbackUrl);
      } catch (error) {
        console.error('Error resolving file URL:', error);
        setTextureUrl(fallbackUrl);
      }
    }
  }, [url, fallbackUrl]);
  
  // Load the texture with onLoad callback
  const texture = useTexture(textureUrl, (loadedTexture) => {
    console.log(`Texture loaded successfully: ${textureUrl}`);
    if (onLoad) onLoad(loadedTexture);
  });
  
  // Handle errors
  useEffect(() => {
    const handleError = () => {
      if (textureUrl !== fallbackUrl) {
        console.log(`Texture load failed, using fallback: ${fallbackUrl}`);
        setHasErrored(true);
        if (onError) onError(new Error(`Failed to load texture: ${textureUrl}`));
        setTextureUrl(fallbackUrl);
      }
    };
    
    // Add error event listener to the texture
    if (texture && texture.source) {
      const source = texture.source;
      if (source.data && source.data instanceof HTMLImageElement) {
        source.data.addEventListener('error', handleError);
        return () => {
          source.data.removeEventListener('error', handleError);
        };
      }
    }
  }, [texture, textureUrl, fallbackUrl, onError]);
  
  // Apply texture settings
  if (texture && !hasErrored) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
  }
  
  // This component doesn't render anything directly
  return null;
};

export default SafeTexture; 