import React, { useEffect, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Group } from 'three';

// Define animation states
export type AnimationState = 'idle' | 'walking' | 'running' | 'jumping' | 'attack';

// Define available biped models
export type BipedType = 'biped2' | 'biped3';

interface BipedModelProps {
  position?: [number, number, number];
  rotation?: number;
  scale?: number;
  animationState: AnimationState;
  modelType: BipedType;
}

// Configuration for animation and model paths
const MODEL_CONFIG: Record<BipedType, {
  modelPath: string;
  animations: Record<AnimationState, string>;
  scale: number;
  position: [number, number, number];
}> = {
  biped2: {
    modelPath: '/models/biped 2/Animation_Walking_withSkin.glb',
    animations: {
      idle: 'Armature|mixamo.com|Layer0',
      walking: 'Armature|mixamo.com|Layer0',
      running: 'Armature|mixamo.com|Layer0',
      jumping: 'Armature|mixamo.com|Layer0',
      attack: 'Armature|mixamo.com|Layer0'
    },
    scale: 1.5,
    position: [0, -0.8, 0]
  },
  biped3: {
    modelPath: '/models/biped 3/Animation_Walking_withSkin.glb',
    animations: {
      idle: 'Armature|mixamo.com|Layer0',
      walking: 'Armature|mixamo.com|Layer0',
      running: 'Armature|mixamo.com|Layer0',
      jumping: 'Armature|mixamo.com|Layer0',
      attack: 'Armature|mixamo.com|Layer0'
    },
    scale: 1.5,
    position: [0, -0.8, 0]
  }
};

export function BipedModel({ 
  position = [0, 0, 0], 
  rotation = 0, 
  scale = 1,
  animationState = 'idle',
  modelType = 'biped3'
}: BipedModelProps) {
  const group = useRef<Group>(null);
  const config = MODEL_CONFIG[modelType];
  
  // Calculate final position including model-specific offset
  const finalPosition: [number, number, number] = [
    position[0] + config.position[0],
    position[1] + config.position[1],
    position[2] + config.position[2]
  ];
  
  // Load model with animations
  const { scene, animations } = useGLTF(config.modelPath);
  const { actions, names } = useAnimations(animations, group);
  
  // Log available animations for debugging
  useEffect(() => {
    console.log(`[${modelType}] Available animations:`, names);
    console.log(`[${modelType}] Current animation state:`, animationState);
  }, [modelType, names, animationState]);
  
  // Handle animation changes
  useEffect(() => {
    // Stop all animations first
    Object.values(actions).forEach(action => action?.stop());
    
    // Find the appropriate animation for the current state
    const animationName = names[0]; // Use the first animation since our models have one animation
    
    if (animationName && actions[animationName]) {
      const action = actions[animationName];
      
      // Configure animation based on state
      switch (animationState) {
        case 'idle':
          action.setEffectiveTimeScale(0.6); // Slower for idle
          break;
        case 'walking':
          action.setEffectiveTimeScale(1.0); // Normal speed for walking
          break;
        case 'running':
          action.setEffectiveTimeScale(1.5); // Faster for running
          break;
        case 'jumping':
          action.setEffectiveTimeScale(1.2); // Slightly faster for jumping
          break;
        case 'attack':
          action.setEffectiveTimeScale(1.3); // Slightly faster for attack
          break;
      }
      
      // Play the animation with crossfade
      action.reset().fadeIn(0.2).play();
      
      console.log(`Playing animation: ${animationName} for state: ${animationState}`);
    }
  }, [animationState, actions, names]);
  
  return (
    <group 
      ref={group} 
      position={finalPosition} 
      rotation={[0, rotation, 0]}
      scale={[config.scale * scale, config.scale * scale, config.scale * scale]}
    >
      <primitive object={scene} />
    </group>
  );
}

// Preload all models
Object.entries(MODEL_CONFIG).forEach(([_, config]) => {
  useGLTF.preload(config.modelPath);
});

export default BipedModel; 