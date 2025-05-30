import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useChat } from '../context/ChatContext';
import { TechnoClawWalking, TechnoClawActionName } from './models/TechnoClawWalking';
import useMobileDetection from '../hooks/useMobileDetection';
import { Text, Html } from '@react-three/drei';  // Import drei components

interface NPCCharacterProps {
  position?: [number, number, number];
  npcId: string;
  name?: string;
  chatAnimationName?: TechnoClawActionName;
  walkingAnimationName?: TechnoClawActionName;
  listeningAnimationName?: TechnoClawActionName;
  debug?: boolean;
}

// Distance thresholds for NPC optimization
const DISTANCE_THRESHOLDS = {
  INACTIVE: 150,  // Increased to ensure character remains active
  SLOW_UPDATE: 70, // Distance at which NPC updates less frequently
  ACTIVE: 40      // Distance at which NPC is fully active
};

// Animation names need to match exactly what's in the animation files
const ANIMATION_NAMES: Record<string, TechnoClawActionName> = {
  WALKING: 'walking',
  CHATTING: 'chat',
  LISTENING: 'listening'
};

// Default positions that are guaranteed to be visible
const DEFAULT_POSITIONS = {
  DESKTOP: [0, -0.8, -5] as [number, number, number], // Lower Y position to -0.8 to place on ground
  MOBILE: [0, -0.8, -3] as [number, number, number] // Lower Y position for mobile too
};

const NPCCharacter: React.FC<NPCCharacterProps> = React.memo(({ 
  position: initialPositionTuple = DEFAULT_POSITIONS.DESKTOP, 
  npcId,
  name = 'NPC',
  chatAnimationName = ANIMATION_NAMES.CHATTING,
  walkingAnimationName = ANIMATION_NAMES.WALKING,
  listeningAnimationName = ANIMATION_NAMES.LISTENING,
  debug = true // Set debug to true to help with troubleshooting
}) => {
  const groupRef = useRef<THREE.Group>(null!);
  const { camera } = useThree();
  const { isMobile } = useMobileDetection();
  
  // SIMPLIFIED POSITION SYSTEM - direct object position
  // We'll use a THREE.Vector3 directly as mutable object to ensure position changes propagate
  const objectPosition = useRef(new THREE.Vector3(
    initialPositionTuple[0], 
    initialPositionTuple[1], 
    initialPositionTuple[2]
  ));
  
  // For time and animation state
  const [isWalking, setIsWalking] = useState(true);
  const timeRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  
  // Chat context
  const { isNearNPC, setIsNearNPC, showChat, openChat, messages } = useChat();
  
  // State for interactions
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [messagesCount, setMessagesCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  // Add state for text indicator animation
  const [indicatorOffset, setIndicatorOffset] = useState(0);
  
  // Chat messaging effect
  useEffect(() => {
    // Check if messages count changed
    if (messages.length !== messagesCount) {
      setMessagesCount(messages.length);
      
      // If we have messages, check who's talking
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        const isUser = lastMessage.role === 'user';
        console.log(`[TechnoClaw] Setting talking state: ${isUser ? 'User is talking' : 'NPC is talking'}`);
        setIsUserTalking(isUser);
        
        // Force model update when user starts talking
        if (isUser) {
          // This will ensure the listening animation gets properly triggered
          console.log('[TechnoClaw] User started talking - forcing LISTENING animation');
          // No need to add code here, just logging to help debug
        }
      }
    }
  }, [messages, messagesCount]);

  // Ensure animations are properly tracked when chat state changes
  useEffect(() => {
    // Log animation state transitions for debugging
    console.log(`[TechnoClaw] Animation state changed - showChat: ${showChat}, isUserTalking: ${isUserTalking}`);
    
    if (showChat && isUserTalking) {
      console.log('[TechnoClaw] *** CRITICAL: Forcing LISTENING animation state ***');
    }
  }, [showChat, isUserTalking]);

  // Handle hover states
  const handlePointerOver = useCallback(() => {
    setIsHovered(true);
    document.body.style.cursor = 'pointer';
  }, []);
  
  const handlePointerOut = useCallback(() => {
    setIsHovered(false);
    document.body.style.cursor = 'auto';
  }, []);

  // IMPROVED MOVEMENT SYSTEM - Smoother with less stuttering
  useFrame((_, delta) => {
    // Skip movement if in chat
    if (showChat) {
      if (isWalking) setIsWalking(false);
      return;
    }
    
    // Make sure we're in walking state
    if (!isWalking) setIsWalking(true);
    
    // Update our time reference with proper delta for smoother motion
    timeRef.current += delta;
    
    // More predictable figure-8 pattern for walking - will always be visible
    const timeElapsed = (Date.now() - startTimeRef.current) / 1000;
    const baseX = 0; // Center X position
    const baseZ = -4; // Base Z position (in front of camera)
    const xRadius = 4; // X movement radius
    const zRadius = 2; // Z movement radius (smaller for more visibility)
    const speed = 0.2; // Consistent speed
    
    // Calculate figure-8 pattern based on lemniscate formula
    const angle = timeElapsed * speed;
    const sinAngle = Math.sin(angle);
    const cosAngle = Math.cos(angle);
    const denominator = 1 + sinAngle * sinAngle;
    
    // New position using figure-8 pattern
    const newX = baseX + (xRadius * sinAngle * cosAngle / denominator);
    const newZ = baseZ + (zRadius * sinAngle / denominator);
    
    // Set character direction to face movement with smoother rotation
    if (groupRef.current) {
      // Calculate the direction of movement
      const prevPos = new THREE.Vector3().copy(groupRef.current.position);
      const newPos = new THREE.Vector3(newX, -0.8, newZ);
      const direction = new THREE.Vector3().subVectors(newPos, prevPos).normalize();
      
      // Only change rotation if actually moving
      if (direction.length() > 0.001) {
        // Get angle from direction vector (already pointing where we want to go)
        const targetAngle = Math.atan2(direction.x, direction.z);
        
        // Apply smooth rotation
        const currentRotation = groupRef.current.rotation.y;
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          currentRotation,
          targetAngle,
          Math.min(1, 0.03 * delta * 60) // Very smooth turning
        );
      }
      
      // Move position smoothly
      const currentPos = groupRef.current.position;
      currentPos.x = THREE.MathUtils.lerp(currentPos.x, newX, Math.min(1, 0.04 * delta * 60));
      currentPos.y = -0.8; // Fixed ground position
      currentPos.z = THREE.MathUtils.lerp(currentPos.z, newZ, Math.min(1, 0.04 * delta * 60));
      
      // Update stored position
      objectPosition.current.set(currentPos.x, -0.8, currentPos.z);
    }
  });

  // Handle NPC click - Enhanced for better detection
  const handleNPCClick = useCallback((event: any) => {
    event.stopPropagation();
    console.log("[TechnoClaw] Character clicked, opening chat");
    openChat();
    
    // Force set state to ensure UI updates
    setIsNearNPC(true);
    
    // Ensure cursor shows pointer during interaction
    document.body.style.cursor = 'pointer';
  }, [openChat, setIsNearNPC]);

  // Update isNearNPC based on distance to ensure the UI shows up
  useFrame(() => {
    if (groupRef.current && camera) {
      const distance = groupRef.current.position.distanceTo(camera.position);
      // Consider player close when within 10 units for better interaction zone
      const isClose = distance < 10;
      
      // Update isNearNPC state if changed
      if (isClose !== isNearNPC) {
        setIsNearNPC(isClose);
        
        // Log when player approaches or leaves NPC range
        console.log(`[TechnoClaw] Player is ${isClose ? 'near' : 'far from'} NPC! Distance: ${distance.toFixed(2)}`);
      }
    }
  });

  // Determine current animation with improved state detection
  const currentAnimationName = useMemo(() => {
    let animation;
    
    // During chat, switch between chatting and listening
    if (showChat) {
      if (isUserTalking) {
        animation = listeningAnimationName;
        console.log('[TechnoClaw] Animation set to: LISTENING (user is talking)');
      } else {
        animation = chatAnimationName;
        console.log('[TechnoClaw] Animation set to: CHATTING (NPC is talking)');
      }
    } else {
      // When not in chat, always use walking animation
      animation = walkingAnimationName;
      
      // Only log occasionally to avoid console spam
      if (Math.random() < 0.01) {
        console.log('[TechnoClaw] Animation set to: WALKING (not in chat)');
      }
    }
    
    return animation;
  }, [showChat, isUserTalking, chatAnimationName, walkingAnimationName, listeningAnimationName]);

  // This key forces the component to re-mount when switching to listening
  // This is a drastic but effective way to ensure animations reload properly
  const componentKey = useMemo(() => {
    // Generate a new key specifically when switching to listening animation
    if (currentAnimationName === listeningAnimationName) {
      return `technoclaw-listening-${Date.now()}`;
    }
    return 'technoclaw-default';
  }, [currentAnimationName, listeningAnimationName]);

  // Visual feedback for interaction
  const characterScale = useMemo(() => {
    // Fixed scale value that works well with model
    const baseScale = 0.015; // Reduced from 0.025 to 0.015 (1.5% of original)
    return isHovered ? baseScale * 1.05 : baseScale;
  }, [isHovered]);

  // Animate the text indicator - now unused but keeping for potential future use
  useFrame((_, delta) => {
    // Skip additional animation if in chat
    if (showChat) return;
    
    // Animate the indicator with subtle floating effect
    setIndicatorOffset(prev => {
      // Simple sine wave animation
      return Math.sin(Date.now() * 0.003) * 0.1;
    });
  });

  // Enhanced to make click detection more reliable
  return (
    <>
      <TechnoClawWalking 
        key={componentKey}
        ref={groupRef} 
        position={[0, 0, 0]} 
        onClick={handleNPCClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        activeAnimationName={currentAnimationName}
        debug={debug}
        scale={characterScale}
        visible={true}
        // Add these properties to enhance click detection
        raycast={raycaster => {
          // Increase the raycaster threshold for better click detection
          const originalThreshold = raycaster.params.Points.threshold;
          raycaster.params.Points.threshold = 0.5;
          return true;
        }}
        // Critical: Add userData to identify this as an NPC for interaction system
        userData={{
          type: 'npc',
          name: 'Technoclaw',
          id: npcId,
          interactive: true,
          action: 'chat',
          title: 'Talk to Technoclaw (C)'
        }}
      />
      
      {/* Removed the floating chat indicator as requested */}
    </>
  );
});

export default NPCCharacter;
