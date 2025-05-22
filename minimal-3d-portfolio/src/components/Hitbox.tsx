import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useInteraction } from '../context/InteractionContext';

interface HitboxProps {
  width?: number;
  height?: number;
  depth?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  visible?: boolean;
  userData?: any;
  children?: React.ReactNode;
}

/**
 * Hitbox component for collision detection
 * This provides a proper context wrapper that ensures hooks are used correctly
 */
const Hitbox: React.FC<HitboxProps> = ({
  width = 1,
  height = 1,
  depth = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  visible = false,
  userData = {},
  children
}) => {
  const hitboxRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  
  // Ensure context is properly accessed in a component
  const { hoveredObject } = useInteraction();
  
  // Create a memoized material to avoid re-renders
  const material = useMemo(() => (
    new THREE.MeshBasicMaterial({
      color: '#ff0000',
      wireframe: true,
      transparent: true,
      opacity: 0.5,
      visible: visible
    })
  ), [visible]);

  return (
    <group
      ref={hitboxRef}
      position={position as [number, number, number]} 
      rotation={rotation as [number, number, number]}
      scale={scale as [number, number, number]}
      userData={userData}
    >
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <primitive object={material} attach="material" />
      </mesh>
      {children}
    </group>
  );
};

export default Hitbox; 