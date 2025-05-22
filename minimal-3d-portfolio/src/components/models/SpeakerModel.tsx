import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';

interface SpeakerModelProps {
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (event: ThreeEvent<PointerEvent>) => void;
  modelRef?: React.RefObject<THREE.Group | null>;
  [key: string]: any; // Allow other props like position, scale, etc.
}

export function SpeakerModel({ 
  onClick, 
  onPointerOver,
  onPointerOut, 
  modelRef, 
  ...props 
}: SpeakerModelProps) {
  const group = useRef<THREE.Group>(null);
  const { scene, nodes, materials } = useGLTF('/models/speaker/speaker.glb');

  // If an external ref is provided, assign it.
  useEffect(() => {
    if (modelRef && group.current) {
      (modelRef as React.MutableRefObject<THREE.Group | null>).current = group.current;
    }
  }, [modelRef, group]);

  // Improved event handlers for better interaction
  const handleSpeakerClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (onClick) {
      onClick(event);
    }
  };

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (onPointerOver) {
      onPointerOver(event);
    }
  };

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (onPointerOut) {
      onPointerOut(event);
    }
  };

  // Enhanced scene setup for better interaction
  useEffect(() => {
    if (!scene) return;
    
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        // Add shadow support
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Ensure each mesh has proper interaction flags
        child.userData.interactive = true;
        child.userData.isSpeakerPart = true;
      }
    });
  }, [scene]);

  // Use a <group> to apply props like position, rotation, scale to the whole model
  // and to attach event handlers.
  return (
    <group 
      ref={group} 
      {...props} 
      onClick={handleSpeakerClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      dispose={null}
    >
      <primitive object={scene} />
    </group>
  );
}

// Preload the model for faster loading
useGLTF.preload('/models/speaker/speaker.glb'); 