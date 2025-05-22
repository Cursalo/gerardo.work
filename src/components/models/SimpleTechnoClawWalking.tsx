import * as THREE from 'three'
import React, { useRef, useEffect, useState, forwardRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { AnimationClip } from 'three'
import useMobileDetection from '../../hooks/useMobileDetection'

// Export the action name type
export type TechnoClawActionName = string;

// Component props
interface TechnoClawProps {
  position?: [number, number, number];
  scale?: number | [number, number, number];
  onClick?: (event: THREE.Event) => void;
  debug?: boolean;
  visible?: boolean;
  activeAnimationName?: TechnoClawActionName;
  [key: string]: any; // Allow other props
}

// Define animation file mapping type
type AnimationFiles = {
  [key: string]: string;
};

// Map animation names to file paths
const ANIMATION_FILES: AnimationFiles = {
  'walking': '/models/technoclaw/Animation_Walking_withSkin.glb',
  'chat': '/models/technoclaw/Animation_Stand_and_Chat_withSkin.glb',
  'listening': '/models/technoclaw/Animation_Listening_Gesture_withSkin.glb',
  'idle': '/models/technoclaw/Animation_Idle_withSkin.glb',
  'alert': '/models/technoclaw/Animation_Alert_withSkin.glb',
  'running': '/models/technoclaw/Animation_Running_withSkin.glb'
};

// Animation name mapper for different variations
const ANIMATION_NAME_MAP: Record<string, string[]> = {
  'walking': ['walking', 'walk', 'take', 'walkinganimation'],
  'chat': ['chat', 'stand', 'standchat', 'talk', 'chatting'],
  'listening': ['listen', 'listening', 'gesture'],
  'idle': ['idle', 'stand', 'rest'],
  'alert': ['alert', 'attention'],
  'running': ['run', 'running', 'jog']
};

// Preload all models
Object.values(ANIMATION_FILES).forEach(path => {
  try {
    useGLTF.preload(path);
  } catch (e) {
    console.error(`[SimpleTechnoClaw] Error preloading ${path}:`, e);
  }
});

// Component
export const TechnoClawWalking = forwardRef<THREE.Group, TechnoClawProps>((props, ref) => {
  const {
    position = [0, 0, 0],
    scale = 1,
    onClick,
    debug = true,
    visible = true,
    activeAnimationName = 'walking',
    ...restProps
  } = props;

  const groupRef = useRef<THREE.Group>(null!);
  const actualRef = (ref as React.RefObject<THREE.Group>) || groupRef;
  const { isMobile } = useMobileDetection();
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentAnimation, setCurrentAnimation] = useState<string>(activeAnimationName);
  
  // Determine which file to load based on requested animation
  const modelPath = React.useMemo(() => {
    // First try exact match
    if (ANIMATION_FILES[activeAnimationName]) {
      return ANIMATION_FILES[activeAnimationName];
    }
    
    // Then try to find a match in our mapping
    for (const [key, variations] of Object.entries(ANIMATION_NAME_MAP)) {
      if (variations.includes(activeAnimationName.toLowerCase())) {
        const animKey = key as keyof typeof ANIMATION_FILES;
        if (ANIMATION_FILES[animKey]) {
          return ANIMATION_FILES[animKey];
        }
      }
    }
    
    // Default to walking
    console.log(`[SimpleTechnoClaw] No matching file for "${activeAnimationName}", using default walking`);
    return ANIMATION_FILES['walking'];
  }, [activeAnimationName]);
  
  // Check if file exists
  useEffect(() => {
    console.log('[SimpleTechnoClaw] Loading model from:', modelPath);
    fetch(modelPath, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          console.log('[SimpleTechnoClaw] File exists and is accessible');
          setModelLoaded(true);
        } else {
          console.error(`[SimpleTechnoClaw] File not found: ${response.status}`);
          setLoadError(`File not found: ${response.status}`);
        }
      })
      .catch(err => {
        console.error('[SimpleTechnoClaw] Network error:', err);
        setLoadError(`Network error: ${err}`);
      });
  }, [modelPath]);

  // Load model
  const { scene, animations } = useGLTF(modelPath);
  
  // Clone the scene to avoid conflicts
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);
  
  // Set up animations
  const { actions, mixer } = useAnimations(animations, actualRef);

  // Log available animations
  useEffect(() => {
    if (debug) {
      console.log('[SimpleTechnoClaw] Loaded model from:', modelPath);
      console.log('[SimpleTechnoClaw] Available animations:');
      animations.forEach((anim: AnimationClip, i: number) => {
        console.log(`  ${i+1}. "${anim.name}"`);
      });
      
      console.log('[SimpleTechnoClaw] Available actions:');
      console.log(Object.keys(actions));
    }
  }, [animations, actions, debug, modelPath]);

  // Play animation
  useEffect(() => {
    if (!mixer || !actions || Object.keys(actions).length === 0) {
      console.error('[SimpleTechnoClaw] No actions available!', { mixer, actions });
      return;
    }
    
    // Reset all animations
    Object.values(actions).forEach(action => {
      if (action) action.stop();
    });
    
    // Log animation change
    console.log(`[SimpleTechnoClaw] Trying to play animation: "${activeAnimationName}"`);
    
    // Try to find a matching animation
    let animationToPlay: any = null;
    
    // 1. Try direct match first
    if (actions[activeAnimationName]) {
      animationToPlay = actions[activeAnimationName];
      console.log(`[SimpleTechnoClaw] Playing exact match: "${activeAnimationName}"`);
    } 
    // 2. Try with any available action - simple approach that should work
    else if (Object.keys(actions).length > 0) {
      // Just play the first animation in the file
      const firstKey = Object.keys(actions)[0];
      animationToPlay = actions[firstKey];
      console.log(`[SimpleTechnoClaw] No exact match, playing first available: "${firstKey}"`);
    }
    
    // Play animation if found
    if (animationToPlay) {
      animationToPlay.reset().fadeIn(0.5).play();
      mixer.update(0); // Force immediate update
    } else {
      console.error('[SimpleTechnoClaw] No animations available to play!');
    }
  }, [actions, mixer, activeAnimationName]);
  
  // Update animation
  useFrame((_, delta) => {
    if (mixer) mixer.update(delta);
  });

  // If there was an error loading, show a placeholder
  if (loadError) {
    return (
      <group ref={actualRef} position={position} scale={scale} onClick={onClick} visible={visible} {...restProps}>
        <mesh>
          <boxGeometry args={[1, 2, 1]} />
          <meshStandardMaterial color="red" />
        </mesh>
      </group>
    );
  }

  // Render
  return (
    <group ref={actualRef} position={position} scale={scale} onClick={onClick} visible={visible} {...restProps}>
      <primitive object={clonedScene} />
    </group>
  );
});

export default TechnoClawWalking;