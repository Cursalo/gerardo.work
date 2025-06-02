import { useRef, useEffect, useState, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3, Euler } from 'three';
import * as THREE from 'three';
import { useChat } from '../context/ChatContext';
import useMobileDetection from '../hooks/useMobileDetection';
import { useMobileControls } from '../context/MobileControlsContext';
import { useGamepad } from '../hooks/useGamepad';

interface FirstPersonCameraProps {
  position?: Vector3;
  height?: number;
  moveSpeed?: number;
  rotationSpeed?: number;
  acceleration?: number;
  deceleration?: number;
}

// Vectors for useFrame to avoid re-creation
const targetVelocityVec = new THREE.Vector3();
const zeroVec = new THREE.Vector3(0, 0, 0);
const scaledVelocityVec = new THREE.Vector3();
const forwardVec = new THREE.Vector3();
const rightVec = new THREE.Vector3();
const tempDirectionVec = new THREE.Vector3(); // For storing direction before normalization

/**
 * FirstPersonCamera component
 * 
 * Implements a camera that rotates with full-screen mouse movement and moves with keyboard controls.
 * Features:
 * - Full-screen mouse movement for direct camera rotation
 * - Camera always looks exactly where the centered crosshair points
 * - Smooth acceleration and deceleration for movement
 * - Mobile touch controls for touch devices
 */
const FirstPersonCamera = ({
  position = new Vector3(0, 0, 15),
  height = 1.7, // Average human eye level
  moveSpeed = 0.2,
  rotationSpeed = 0.002, // Rotation speed for mouse movement
  acceleration = 0.15,
  deceleration = 0.3
}: FirstPersonCameraProps) => {
  const { camera, gl } = useThree();
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Get chat context to determine if camera should be disabled
  const { showChat } = useChat();
  
  // Check if we're on a mobile device
  const { isMobile, isTouchDevice } = useMobileDetection();
  const { moveVector, lookVector } = useMobileControls();
  
  // Get gamepad state
  const { gamepad, isConnected: gamepadConnected } = useGamepad();
  
  // Current camera position and rotation
  const currentPosition = useRef(position.clone());
  const euler = useRef(new Euler(0, 0, 0, 'YXZ')); // YXZ order is important for FPS controls
  
  // Movement velocity for smooth acceleration and deceleration
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  
  // Touch look state
  const lookTouchId = useRef<number | null>(null); // Added to track the specific touch for looking
  const isLooking = useRef(false);
  const lastTouchX = useRef(0);
  const lastTouchY = useRef(0);
  
  // Pointer lock state
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  
  // Last time we tried to request pointer lock, to prevent spam
  const lastPointerLockRequestRef = useRef(0);
  
  // Handle window resize and ensure camera aspect ratio is correct
  useEffect(() => {
    const handleResize = () => {
      // Update camera aspect ratio to match window
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      }
    };
    
    // Call once to ensure initial alignment
    handleResize();
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [camera]);
  
  // Ensure initial camera setup is correct and aligned with crosshair
  useEffect(() => {
    // Ensure camera's lookAt is reset to forward direction
    camera.lookAt(0, height, -1);
    
    // Set the camera's up vector to ensure correct orientation
    camera.up.set(0, 1, 0);
    
    // Update projection matrix to apply changes
    camera.updateProjectionMatrix();
    
    // Set initial position
    currentPosition.current.y = height;
    camera.position.copy(currentPosition.current);
  }, [camera, height]);
  
  // Update pointer lock effect to respect chat visibility
  useEffect(() => {
    const canvas = gl.domElement;
    
    // Handle pointer lock change
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === canvas;
      setIsPointerLocked(isLocked);
      
      // Update cursor visibility based on pointer lock state
      if (isLocked) {
        document.body.style.cursor = 'none';
      } else if (!showChat) {
        // If chat is not open but we're not locked, show the green cursor
        document.body.style.cursor = 'url(/cursors/cursor-green.png), auto';
      }
    };
    
    // Request pointer lock on canvas click (only if chat is not open)
    // Note: This is now a backup to the automatic pointer lock in ChatContext
    const handleCanvasClick = () => {
      // Only allow pointer lock requests if chat is closed and not on mobile
      if (!document.pointerLockElement && canvas && !showChat && !isTouchDevice) {
        // Rate limit pointer lock requests to avoid issues
        const now = Date.now();
        if (now - lastPointerLockRequestRef.current > 200) {
          lastPointerLockRequestRef.current = now;
          try {
            canvas.requestPointerLock();
          } catch (err) {
            console.error('Failed to request pointer lock:', err);
          }
        }
      }
    };
    
    // Setup event listeners
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    canvas.addEventListener('click', handleCanvasClick);
    
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [gl, showChat, isTouchDevice]);
  
  // Reset keys when pointer lock changes or chat opens/closes
  useEffect(() => {
    // Reset key states when pointer lock is released or chat is opened
    if (!isPointerLocked || showChat) {
      moveForward.current = false;
      moveBackward.current = false;
      moveLeft.current = false;
      moveRight.current = false;
    }
  }, [isPointerLocked, showChat]);
  
  // Handle mouse movement for camera rotation (full-screen)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Only allow camera rotation when pointer is locked AND chat is closed
      if (isPointerLocked && !showChat) {
        // Get mouse movement delta
        const movementX = e.movementX || 0;
        const movementY = e.movementY || 0;
        
        // Apply mouse movement to camera rotation (with sensitivity)
        // This ensures the crosshair always points exactly where the camera is looking
        euler.current.y -= movementX * rotationSpeed;
        euler.current.x -= movementY * rotationSpeed;
        
        // Clamp vertical rotation to avoid over-rotation
        euler.current.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.current.x));
        
        // Apply rotation to camera
        camera.quaternion.setFromEuler(euler.current);
      }
    };
    
    // Only listen for mouse movement when pointer is locked
    if (isPointerLocked) {
      document.addEventListener('mousemove', handleMouseMove);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [camera, isPointerLocked, rotationSpeed, showChat]);
  
  // Keyboard handlers
  const onKeyDown = useCallback((event: KeyboardEvent) => {
    // Only handle keyboard when pointer is locked (active) AND chat is closed
    if (!isPointerLocked || showChat) return;
    
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        moveForward.current = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        moveBackward.current = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        moveLeft.current = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        moveRight.current = true;
        break;
      case 'Escape':
        // Allow escape to exit pointer lock
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
        break;
    }
  }, [isPointerLocked, showChat]);
  
  const onKeyUp = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        moveForward.current = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        moveBackward.current = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        moveLeft.current = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        moveRight.current = false;
        break;
    }
  }, []);
  
  // Initialize event listeners
  useEffect(() => {
    // Add event listeners for keyboard controls
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    // Store the canvas reference for later use
    canvasRef.current = gl.domElement;
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, [gl, onKeyDown, onKeyUp]);
  
  // Touch handlers for screen-based look rotation
  useEffect(() => {
    const canvas = gl.domElement;

    const handleTouchStart = (e: TouchEvent) => {
      // Only activate if not pointer locked and chat isn't visible
      if (!isPointerLocked && !showChat) {
        // If we are not already looking with another finger, start looking with this new touch.
        if (lookTouchId.current === null && e.changedTouches.length > 0) {
          const touch = e.changedTouches[0];
          // Prevent default scroll/zoom only if the touch is not on a joystick
          // We assume joysticks are not direct children of canvas or have specific class/id
          // A more robust check might involve checking event.target against joystick elements
          let targetElement = e.target as HTMLElement;
          let isJoystickTouch = false;
          // Crude check, assuming joysticks might have a role or specific structure
          // This might need refinement based on how react-joystick-component renders
          while (targetElement && targetElement !== canvas) {
            if (targetElement.getAttribute('role') === 'joystick' || targetElement.dataset.joystick === 'true') {
              isJoystickTouch = true;
              break;
            }
            targetElement = targetElement.parentElement as HTMLElement;
          }

          if (!isJoystickTouch) {
            lookTouchId.current = touch.identifier;
            isLooking.current = true;
            lastTouchX.current = touch.clientX;
            lastTouchY.current = touch.clientY;
            e.preventDefault(); // Prevent default scroll/zoom for look gestures
          }
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (lookTouchId.current !== null && isLooking.current && !showChat) {
        let currentTouch = null;
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === lookTouchId.current) {
            currentTouch = e.touches[i];
            break;
          }
        }

        if (currentTouch) {
          const currentX = currentTouch.clientX;
          const currentY = currentTouch.clientY;
          
          const deltaX = currentX - lastTouchX.current;
          const deltaY = currentY - lastTouchY.current;
          
          // Apply touch delta to camera rotation (similar to mouse look)
          const touchSensitivity = 0.004; // Adjust sensitivity for touch
          euler.current.y -= deltaX * touchSensitivity;
          euler.current.x -= deltaY * touchSensitivity; // Use standard pitch direction for touch
          
          // Clamp vertical rotation (using the same clamp as joystick)
          const maxPitch = 1.3; // Radians for ~75 degrees
          euler.current.x = Math.max(-maxPitch, Math.min(maxPitch, euler.current.x));
          
          // Apply rotation to camera
          camera.quaternion.setFromEuler(euler.current);
          
          // Update last touch position
          lastTouchX.current = currentX;
          lastTouchY.current = currentY;
          e.preventDefault(); // Prevent default for look gestures
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (lookTouchId.current !== null && e.changedTouches.length > 0) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === lookTouchId.current) {
            isLooking.current = false;
            lookTouchId.current = null;
            // e.preventDefault(); // Not usually needed for touchend as much for camera control
            break;
          }
        }
      }
    };

    // Add listeners only if it's a touch device
    if (isTouchDevice) {
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd);
      canvas.addEventListener('touchcancel', handleTouchEnd); // Handle cancellations too
    }

    // Cleanup
    return () => {
      if (isTouchDevice) {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('touchcancel', handleTouchEnd);
      }
    };
  }, [gl, camera, isPointerLocked, showChat, isTouchDevice]);
  
  // Update movement each frame
  useFrame((_, delta) => {
    // Skip updates when chat is open
    if (showChat) return;
    
    // Calculate movement direction vector based on keyboard/context/gamepad
    let moveDirX = 0;
    let moveDirZ = 0;
    // const gamepadStickThreshold = 0.01; // Relying on useGamepad.ts for clean zero values

    if (gamepadConnected && gamepad) {
      // Gamepad takes priority when connected
      moveDirX = gamepad.leftStick.x;
      moveDirZ = gamepad.leftStick.y;
      
      // Apply gamepad look controls (right stick)
      if (gamepad.rightStick.x !== 0 || gamepad.rightStick.y !== 0) {
        const lookSensitivity = 0.03; // Sensitivity for gamepad look

        euler.current.y -= gamepad.rightStick.x * lookSensitivity; // Horizontal look (Yaw)
        euler.current.x += gamepad.rightStick.y * lookSensitivity; // Vertical look (Pitch) - INVERTED: Stick Up = Look Down
        
        // Clamp vertical rotation (tighter range, approx +/- 75 degrees)
        const maxPitch = 1.3; // Radians for ~75 degrees
        euler.current.x = Math.max(-maxPitch, Math.min(maxPitch, euler.current.x));
        camera.quaternion.setFromEuler(euler.current);
      }
    } else if (isTouchDevice) {
        moveDirX = moveVector.x; // Use context value for X
        moveDirZ = moveVector.y; // Use context value for Y (NO negation)
    } else {
        moveDirZ = Number(moveForward.current) - Number(moveBackward.current);
        moveDirX = Number(moveRight.current) - Number(moveLeft.current);
    }

    tempDirectionVec.set(moveDirX, 0, moveDirZ);
    
    // Normalize the direction vector if needed
    if (tempDirectionVec.lengthSq() > 1) {
      tempDirectionVec.normalize();
    }
    
    // Apply look rotation from context for touch devices
    // if (isTouchDevice && (lookVector.x !== 0 || lookVector.y !== 0)) {
    //   const lookSensitivity = 0.03; // Sensitivity for joystick look
    //   euler.current.y -= lookVector.x * lookSensitivity; // Horizontal look (Yaw)
    //   euler.current.x += lookVector.y * lookSensitivity; // Vertical look (Pitch) - Inverted by changing -= to +=
    //   // Clamp vertical rotation (tighter range, approx +/- 75 degrees)
    //   const maxPitch = 1.3; // Radians for ~75 degrees
    //   euler.current.x = Math.max(-maxPitch, Math.min(maxPitch, euler.current.x));
    //   camera.quaternion.setFromEuler(euler.current);
    // }
    
    // Get camera's forward and right vectors for movement relative to camera direction
    forwardVec.set(0, 0, -1).applyQuaternion(camera.quaternion);
    forwardVec.y = 0; // Keep movement on ground plane (no flying up/down)
    forwardVec.normalize();
    
    rightVec.set(1, 0, 0).applyQuaternion(camera.quaternion);
    rightVec.y = 0; // Keep movement on ground plane
    rightVec.normalize();
    
    // Calculate target velocity
    targetVelocityVec.set(0, 0, 0); // Reset target velocity
    
    if (tempDirectionVec.z !== 0) {
      // Create a temporary vector for multiplication to avoid modifying forwardVec directly if it's used elsewhere before this
      const tempForward = forwardVec.clone();
      targetVelocityVec.add(tempForward.multiplyScalar(tempDirectionVec.z));
    }
    
    if (tempDirectionVec.x !== 0) {
      // Create a temporary vector for multiplication
      const tempRight = rightVec.clone();
      targetVelocityVec.add(tempRight.multiplyScalar(tempDirectionVec.x));
    }
    
    // Scale by movement speed with gamepad trigger modulation
    if (targetVelocityVec.length() > 0) {
      let finalMoveSpeed = moveSpeed;
      
      // Apply gamepad trigger speed modulation
      if (gamepadConnected && gamepad) {
        const leftTrigger = gamepad.triggers.left;
        const rightTrigger = gamepad.triggers.right;
        
        // Left trigger = slow down (0.3x speed)
        // Right trigger = speed up (2x speed)
        // No triggers = normal speed
        if (leftTrigger > 0.1) {
          finalMoveSpeed *= (0.3 + (1 - leftTrigger) * 0.7); // Gradual slowdown
        } else if (rightTrigger > 0.1) {
          finalMoveSpeed *= (1 + rightTrigger * 1.5); // Gradual speedup up to 2.5x
        }
      }
      
      targetVelocityVec.normalize().multiplyScalar(finalMoveSpeed);
    }
    
    // Apply acceleration/deceleration
    // Move current velocity toward target velocity for smooth movement changes
    if (targetVelocityVec.length() > 0) {
      // Accelerate when there's input
      velocity.current.lerp(targetVelocityVec, acceleration);
    } else {
      // Decelerate when no input
      velocity.current.lerp(zeroVec, deceleration);
    }
    
    // Apply very small movement threshold to avoid jittering
    if (velocity.current.length() < 0.001) {
      velocity.current.set(0, 0, 0);
    }
    
    // Scale velocity by delta time to ensure consistent speed regardless of frame rate
    scaledVelocityVec.copy(velocity.current).multiplyScalar(delta * 60);
    
    // Update position
    currentPosition.current.add(scaledVelocityVec);
    
    // Keep the camera at fixed height
    currentPosition.current.y = height;
    
    // Update camera position
    camera.position.copy(currentPosition.current);
  });
  
  // Handle "B" key press to return to main world
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'b') {
        // Check if we're in a project world by looking at the world ID pattern
        if (currentWorld && currentWorld.id.startsWith('project-world-')) {
          setCurrentWorldId('mainWorld');
          // Prevent any other keyboard handlers from activating
          e.preventDefault();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentWorld, setCurrentWorldId]);

  // Handle gamepad B button press to return to main world
  useEffect(() => {
    // Skip if gamepad isn't connected
    if (!gamepadConnected || !gamepad) return;
    
    // Check for B button press
    if (gamepad.buttons.B) {
      // Check if we're in a project world by looking at the world ID pattern
      if (currentWorld && currentWorld.id.startsWith('project-world-')) {
        setCurrentWorldId('mainWorld');
      }
    }
  }, [gamepadConnected, gamepad, currentWorld, setCurrentWorldId]);
  
  // Return null as this component only manages the camera state via hooks
  // The actual MobileControls UI is now rendered in Scene.tsx
  return null; // Or <></> if you prefer
};

export default FirstPersonCamera; 