import React, { useState, useEffect, useCallback } from 'react';
import { Joystick } from 'react-joystick-component';
// import { IJoystickUpdateEvent } from 'react-joystick-component'; // Removed this import
// import { useThree, useFrame } from '@react-three/fiber'; // REMOVE R3F hooks
import * as THREE from 'three';
import { useMobileControls } from '../context/MobileControlsContext'; // Import the context hook

interface MobileControlsProps {
  // Remove props, they are no longer needed as logic is moved
}

const MobileControls: React.FC<MobileControlsProps> = () => {
  // const { camera } = useThree(); // REMOVE useThree
  const { setMoveVector } = useMobileControls(); // Use context setters
  const [isMobile, setIsMobile] = useState(false);

  // REMOVE state for joystick values - will use context directly
  // const [moveDirection, setMoveDirection] = useState<{ x: number; y: number } | null>(null);
  // const [lookDirection, setLookDirection] = useState<{ x: number; y: number } | null>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsMobile(checkMobile());
    // Optional: Add resize listener if needed
  }, []);

  const handleMove = useCallback((event: any) => {
    if (event.x !== null && event.y !== null && event.type === 'move') {
      // Update context directly
      setMoveVector(new THREE.Vector2(event.x, event.y));
    } else {
      // Reset context on stop
      setMoveVector(new THREE.Vector2(0, 0));
    }
  }, [setMoveVector]);

  // const handleLook = useCallback((event: any) => {
  //    if (event.x !== null && event.y !== null && event.type === 'move') {
  //     // Update context directly
  //     setLookVector(new THREE.Vector2(event.x, event.y));
  //   } else {
  //     // Reset context on stop
  //     setLookVector(new THREE.Vector2(0, 0));
  //   }
  // }, [setLookVector]);

  // REMOVE stop handlers - integrated into move/look handlers
  // const handleMoveStop = () => { ... };
  // const handleLookStop = () => { ... };

  // REMOVE useFrame - logic moved to FirstPersonCamera
  // useFrame((state, delta) => { ... });

  // Render joysticks only on mobile
  if (!isMobile) {
    return null;
  }

  return (
    <>
      {/* Movement Joystick (Bottom Left) */}
      <div style={{ 
        position: 'fixed', 
        bottom: '30px', 
        left: '30px', 
        zIndex: 1000,
        pointerEvents: 'none' // Allow touch events to pass through the container
      }}>
        <div style={{ pointerEvents: 'auto' }}> {/* This div will capture events for the joystick only */}
          <Joystick
            size={100}
            baseColor="rgba(128, 128, 128, 0.5)"
            stickColor="rgba(80, 80, 80, 0.8)"
            move={handleMove}
            stop={handleMove} // Use handleMove for stop as well to reset vector
            throttle={10} // Optional: adjust update frequency
          />
        </div>
      </div>

      {/* Look Joystick (Bottom Right) */}
      {/*
      <div style={{ 
        position: 'fixed', 
        bottom: '30px', 
        right: '30px', 
        zIndex: 1000,
        pointerEvents: 'none' // Allow touch events to pass through the container
      }}>
        <div style={{ pointerEvents: 'auto' }}> {}
          <Joystick
            size={100}
            baseColor="rgba(128, 128, 128, 0.5)"
            stickColor="rgba(80, 80, 80, 0.8)"
            move={handleLook}
            stop={handleLook} // Use handleLook for stop as well to reset vector
            throttle={10} // Optional: adjust update frequency
          />
        </div>
      </div>
      */}
    </>
  );
};

export default MobileControls; 