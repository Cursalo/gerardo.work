import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Grid, Environment as DreiEnvironment, useTexture, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { useWorld } from '../context/WorldContext';
import useMobileDetection from '../hooks/useMobileDetection';

const TRANSPARENT_PLACEHOLDER_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const Environment = () => {
  const { scene } = useThree();
  const { currentWorld } = useWorld();
  const { isMobile } = useMobileDetection();
  
  // Default settings in case the world doesn't specify them
  const worldBackgroundColor = currentWorld?.backgroundColor || '#000000'; // Use backgroundColor for scene background
  const floorColor = currentWorld?.floorColor || '#f0f0f0';
  const skyColor = currentWorld?.skyColor || '#87ceeb'; // Default skyColor to a light blue if not set
  const ambientLightColor = currentWorld?.ambientLightColor || '#ffffff';
  const ambientLightIntensity = currentWorld?.ambientLightIntensity || 0.6;
  const directionalLightColor = currentWorld?.directionalLightColor || '#ffffff';
  const directionalLightIntensity = currentWorld?.directionalLightIntensity || 1.2;
  
  // Set up the background environment based on world settings
  useEffect(() => {
    // Force white background and remove fog for a clean look
    scene.background = new THREE.Color('#ffffff');
    scene.fog = null; // Remove fog completely
  }, [scene]);

  // Load textures if provided
  const floorTextureUrl = currentWorld?.floorTexture;
  const skyTextureUrl = currentWorld?.skyTexture;
  
  // Use a transparent placeholder if URLs are not provided to avoid loading errors with useTexture
  const [loadedFloorTexture, loadedSkyTexture] = useTexture(
    [
      floorTextureUrl || TRANSPARENT_PLACEHOLDER_IMG,
      skyTextureUrl || TRANSPARENT_PLACEHOLDER_IMG
    ]
  );

  // Only use the loaded texture if the original URL was actually provided
  const finalFloorTexture = floorTextureUrl ? loadedFloorTexture : null;
  const finalSkyTexture = skyTextureUrl ? loadedSkyTexture : null;
  
  // Check if we're on a dark floor
  const isDarkFloor = isColorDark(floorColor);

  return (
    <>
      {/* Ambient light for overall scene illumination */}
      <ambientLight intensity={ambientLightIntensity} color={ambientLightColor} />
      
      {/* Primary directional light with mobile-optimized shadows */}
      <directionalLight 
        position={[15, 25, 15]} 
        intensity={directionalLightIntensity} 
        castShadow={!isMobile} // Disable shadows completely on mobile
        shadow-mapSize={isMobile ? [256, 256] : [1024, 1024]} // Reduce shadow map size on mobile
        shadow-bias={-0.0001}
        shadow-radius={isMobile ? 0.5 : 1.5} // Reduce shadow radius on mobile
        color={directionalLightColor}
      >
        <orthographicCamera attach="shadow-camera" args={[-30, 30, 30, -30, 0.1, 100]} />
      </directionalLight>
      
      {/* Secondary fill light - disable on mobile to improve performance */}
      {!isMobile && (
        <directionalLight
          position={[-10, 15, -10]}
          intensity={0.4 * directionalLightIntensity}
          color={directionalLightColor}
        />
      )}
      
      {/* Environment light for reflections with better quality */}
      {/* Removing HDRI environment as it may tint the scene */}
      {/* <DreiEnvironment files="/hdri/studio_small_03_1k.hdr" resolution={512} /> */}
      
      {/* Skydome - reduced geometry complexity on mobile */}
      <Sphere args={[100, isMobile ? 32 : 64, isMobile ? 16 : 32]} scale={[-1, 1, 1]} /* Radius, segments, segments; scale inverted for inside view */ >
        <meshBasicMaterial 
          color="#ffffff" 
          side={THREE.BackSide} 
          depthWrite={false}
          fog={false}
        />
      </Sphere>
      
      {/* Infinite grid for the ground - simplified for mobile to reduce weird lines */}
      <Grid
        position={[0, -0.01, 0]}
        infiniteGrid
        cellSize={isMobile ? 4 : 2} // Larger cells on mobile
        sectionSize={isMobile ? 10 : 5} // Larger sections on mobile
        cellThickness={isMobile ? 0.3 : 0.5} // Thinner lines on mobile
        sectionThickness={isMobile ? 0.6 : 1} // Thinner lines on mobile
        cellColor="#888888"
        sectionColor="#555555"
        fadeDistance={isMobile ? 15 : 25} // Shorter fade distance on mobile
        fadeStrength={isMobile ? 2 : 1.5} // Stronger fade on mobile
      />
      
      {/* Ground plane for shadows - simplified for mobile */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.02, 0]} 
        receiveShadow={!isMobile} // Disable shadow receiving on mobile
      >
        <planeGeometry args={[200, 200]} />
        {isMobile ? (
          // Simple material for mobile - no complex materials that cause weird lines
          <meshBasicMaterial 
            color="#f0f0f0" 
            transparent 
            opacity={0.3}
          />
        ) : (
          // Complex material for desktop
          finalFloorTexture ? (
            <meshStandardMaterial 
              map={finalFloorTexture} 
              transparent 
              opacity={0.9}
              roughness={0.8}
              metalness={0.2}
            />
          ) : (
            isDarkFloor ? (
              <meshStandardMaterial 
                color="#222222" 
                transparent 
                opacity={0.7}
                roughness={0.8}
                metalness={0.2}
              />
            ) : (
              <shadowMaterial transparent opacity={isDarkFloor ? 0.4 : 0.2} />
            )
          )
        )}
      </mesh>
    </>
  );
};

// Helper function to adjust color brightness
function adjustColorBrightness(color: string, percent: number) {
  const hex = color.replace('#', '');
  let r = parseInt(hex.substr(0, 2), 16);
  let g = parseInt(hex.substr(2, 2), 16);
  let b = parseInt(hex.substr(4, 2), 16);
  
  r = Math.max(0, Math.min(255, r + (r * percent / 100)));
  g = Math.max(0, Math.min(255, g + (g * percent / 100)));
  b = Math.max(0, Math.min(255, b + (b * percent / 100)));
  
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}

// Helper function to determine if a color is dark
function isColorDark(color: string): boolean {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate brightness - higher value means lighter color
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Consider dark if brightness is less than 128 (half of 255)
  return brightness < 128;
}

export default Environment; 