import { useThree, useFrame } from '@react-three/fiber';
import { useCallback, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useChat } from '../context/ChatContext';
import { useInteraction, type HoveredObject } from '../context/InteractionContext';
import type { InteractionData } from '../context/InteractionContext';
import useMobileDetection from './useMobileDetection';

// Custom events for crosshair feedback
const HOVER_START_EVENT = new Event('crosshair:hover:start');
const HOVER_END_EVENT = new Event('crosshair:hover:end');
const CLICK_EVENT = new Event('crosshair:click');

// More precise interaction distances for better user experience
const MOBILE_INTERACTION_DISTANCE = 25; // More precise range for mobile touch interaction
const DESKTOP_INTERACTION_DISTANCE = 40; // More precise range for desktop clicks

// INTERACTION COOLDOWN SYSTEM - Prevents immediate re-interaction when returning from external tabs
const INTERACTION_COOLDOWN_MS = 8000; // 8 second cooldown after clicking any media card - much longer to prevent loops
const TAB_RETURN_COOLDOWN_MS = 3000; // 3 second cooldown when returning from external tab
const POINTER_LOCK_GRACE_MS = 1000; // 1 second grace period after pointer lock to prevent immediate interaction

// Movement-based cooldown reset
const MOVEMENT_RESET_THRESHOLD = 2; // Pixels of movement required to reset cooldown
const MOVEMENT_RESET_TIME_MS = 2000; // Time window to accumulate movement

// --- DEBUG --- Add a counter for setHoveredObject calls
let setHoveredObjectCallCount = 0;
// --- END DEBUG ---

/**
 * Custom hook for first-person interactions
 * 
 * Uses precise raycasting from the exact camera center (0,0) to detect and interact with objects.
 * Emits custom events to update the crosshair when hovering over interactive objects.
 */
function useFirstPersonInteractions() {
  const { camera, scene, raycaster, gl } = useThree();
  const { hoveredObject, setHoveredObject: originalSetHoveredObject, triggerInteraction } = useInteraction();
  const [clickedObject, setClickedObject] = useState<HoveredObject | null>(null);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const { isTouchDevice, isIOS } = useMobileDetection();
  
  const { showChat, openChat } = useChat();
  
  // Store the original materials for objects to restore when no longer hovered
  const originalMaterials = useRef<Map<THREE.Object3D, THREE.Material | THREE.Material[]>>(new Map());
  
  // Debug ray for alignment verification (set to true to visualize)
  const showDebugRay = false;
  const rayHelper = useRef<THREE.ArrowHelper | null>(null);

  // INTERACTION COOLDOWN STATE - Prevents immediate re-interaction
  const interactionCooldown = useRef({
    isInCooldown: false,
    lastClickTime: 0,
    lastTabReturnTime: 0,
    lastPointerLockTime: 0,
    cooldownTimer: null as NodeJS.Timeout | null,
    // Movement tracking for cooldown reset
    lastMousePosition: { x: 0, y: 0 },
    movementAccumulator: 0,
    movementStartTime: 0,
    // Window state tracking
    hasReturnedFromExternalWindow: false,
    isUserMoving: false
  });

  // Flag to track touch interaction state with improved state tracking
  const touchState = useRef({
    isTouching: false,
    lastTouchedObject: null as HoveredObject | null,
    touchStartTime: 0,
    processedTouch: false  // Track if we've already processed this touch
  });
  
  // Auto-reset mechanism for stuck states
  const lastInteractionTime = useRef(Date.now());
  const stuckStateTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // --- DEBUG --- Wrapper for setHoveredObject to log calls
  const setHoveredObject = useCallback((obj: HoveredObject | null) => {
    setHoveredObjectCallCount++;
    console.log(`[FPInteractions DEBUG #${setHoveredObjectCallCount}] setHoveredObject called with:`, obj ? { name: obj.name, userData: obj.userData } : null);
    originalSetHoveredObject(obj);
  }, [originalSetHoveredObject]);
  // --- END DEBUG ---

  // INTERACTION COOLDOWN HELPERS
  const startInteractionCooldown = useCallback((reason: string) => {
    console.log(`🕒 COOLDOWN: Starting interaction cooldown - ${reason}`);
    interactionCooldown.current.isInCooldown = true;
    interactionCooldown.current.lastClickTime = Date.now();
    interactionCooldown.current.hasReturnedFromExternalWindow = false; // Reset flag
    
    // Clear any existing timer
    if (interactionCooldown.current.cooldownTimer) {
      clearTimeout(interactionCooldown.current.cooldownTimer);
    }
    
    // Set cooldown timer
    interactionCooldown.current.cooldownTimer = setTimeout(() => {
      console.log(`✅ COOLDOWN: Interaction cooldown ended`);
      interactionCooldown.current.isInCooldown = false;
      interactionCooldown.current.cooldownTimer = null;
    }, INTERACTION_COOLDOWN_MS);
  }, []);

  const startTabReturnCooldown = useCallback(() => {
    console.log(`🕒 TAB RETURN: Starting tab return cooldown`);
    interactionCooldown.current.lastTabReturnTime = Date.now();
    interactionCooldown.current.hasReturnedFromExternalWindow = true;
    
    // Temporarily disable interactions when returning from tab
    const tempDisable = setTimeout(() => {
      console.log(`✅ TAB RETURN: Tab return cooldown ended`);
      // Only reset the flag if user hasn't moved significantly
      if (!interactionCooldown.current.isUserMoving) {
        interactionCooldown.current.hasReturnedFromExternalWindow = false;
      }
    }, TAB_RETURN_COOLDOWN_MS);
  }, []);

  const startPointerLockGrace = useCallback(() => {
    console.log(`🕒 POINTER LOCK: Starting grace period`);
    interactionCooldown.current.lastPointerLockTime = Date.now();
  }, []);

  // Enhanced cooldown check with multiple conditions
  const isInCooldown = useCallback(() => {
    const now = Date.now();
    const timeSinceClick = now - interactionCooldown.current.lastClickTime;
    const timeSinceTabReturn = now - interactionCooldown.current.lastTabReturnTime;
    const timeSincePointerLock = now - interactionCooldown.current.lastPointerLockTime;
    
    const inCooldown = interactionCooldown.current.isInCooldown || 
           timeSinceClick < INTERACTION_COOLDOWN_MS ||
           timeSinceTabReturn < TAB_RETURN_COOLDOWN_MS ||
           timeSincePointerLock < POINTER_LOCK_GRACE_MS ||
           interactionCooldown.current.hasReturnedFromExternalWindow;
    
    // Update UI indicator
    const indicator = document.getElementById('interaction-cooldown-indicator');
    if (indicator) {
      if (inCooldown && document.pointerLockElement) {
        indicator.style.display = 'block';
        // Update message based on reason
        let message = '⏱️ Move mouse to enable interactions';
        if (timeSincePointerLock < POINTER_LOCK_GRACE_MS) {
          message = '🎯 Crosshair mode enabled - move mouse to start interacting';
        } else if (interactionCooldown.current.hasReturnedFromExternalWindow) {
          message = '👍 Welcome back! Move mouse to enable interactions';
        } else if (timeSinceTabReturn < TAB_RETURN_COOLDOWN_MS) {
          message = '🔄 Returned from external tab - move mouse to continue';
        }
        indicator.textContent = message;
      } else {
        indicator.style.display = 'none';
      }
    }
    
    return inCooldown;
  }, []);

  // Movement tracking for cooldown reset
  const trackMovement = useCallback((mouseX: number, mouseY: number) => {
    const now = Date.now();
    const deltaX = mouseX - interactionCooldown.current.lastMousePosition.x;
    const deltaY = mouseY - interactionCooldown.current.lastMousePosition.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Reset movement tracking if too much time has passed
    if (now - interactionCooldown.current.movementStartTime > MOVEMENT_RESET_TIME_MS) {
      interactionCooldown.current.movementAccumulator = 0;
      interactionCooldown.current.movementStartTime = now;
    }
    
    // Accumulate movement
    interactionCooldown.current.movementAccumulator += distance;
    interactionCooldown.current.lastMousePosition = { x: mouseX, y: mouseY };
    
    // Check if enough movement has been accumulated
    if (interactionCooldown.current.movementAccumulator > MOVEMENT_RESET_THRESHOLD) {
      if (interactionCooldown.current.hasReturnedFromExternalWindow) {
        console.log(`👍 MOVEMENT RESET: User moved enough (${interactionCooldown.current.movementAccumulator.toFixed(2)}px), resetting external window flag`);
        interactionCooldown.current.hasReturnedFromExternalWindow = false;
      }
      interactionCooldown.current.isUserMoving = true;
      
      // Reset movement tracking
      interactionCooldown.current.movementAccumulator = 0;
      interactionCooldown.current.movementStartTime = now;
    }
    
    // Reset moving flag after a period of no movement
    const timeSinceLastMovement = now - interactionCooldown.current.movementStartTime;
    if (timeSinceLastMovement > 1000) { // 1 second of no movement
      interactionCooldown.current.isUserMoving = false;
    }
  }, []);
  
  // Remove initial scan to prevent lingering hover states on mobile
  
  // Initialize debug ray helper if enabled
  useEffect(() => {
    if (showDebugRay && !rayHelper.current) {
      // Create a helper arrow showing raycasting direction
      const dir = new THREE.Vector3(0, 0, -1);
      const origin = new THREE.Vector3(0, 0, 0);
      const length = 10;
      const hex = 0xff0000;
      
      const arrow = new THREE.ArrowHelper(dir, origin, length, hex);
      scene.add(arrow);
      rayHelper.current = arrow;
    }
    
    return () => {
      if (rayHelper.current) {
        scene.remove(rayHelper.current);
        rayHelper.current = null;
      }
    };
  }, [scene, showDebugRay]);
  
  // Track pointer lock state and handle cleanup
  useEffect(() => {
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === gl.domElement;
      setIsPointerLocked(isLocked);
      
      if (isLocked) {
        // Start grace period when pointer lock is acquired
        startPointerLockGrace();
        console.log('🎯 POINTER LOCK ACQUIRED - Starting grace period to prevent immediate interactions');
      } else {
        // CRITICAL FIX: Reset interaction state when pointer lock is lost
        console.log('🎯 POINTER LOCK LOST - Resetting interaction state');
        setHoveredObject(null);
        setClickedObject(null);
        document.dispatchEvent(HOVER_END_EVENT);
        if (isTouchDevice) {
          touchState.current.isTouching = false;
          touchState.current.lastTouchedObject = null;
          touchState.current.processedTouch = false;
        }
      }
    };
    
    // ESCAPE KEY HANDLER - Reset everything
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('🎯 ESCAPE PRESSED - Force resetting all interaction states');
        // Exit pointer lock
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
        // Reset all states
        setHoveredObject(null);
        setClickedObject(null);
        document.dispatchEvent(HOVER_END_EVENT);
        if (isTouchDevice) {
          touchState.current.isTouching = false;
          touchState.current.lastTouchedObject = null;
          touchState.current.processedTouch = false;
        }
      }
    };
    
    // WINDOW FOCUS HANDLER - Reset when returning from external tab
    const handleWindowFocus = () => {
      console.log('🎯 WINDOW FOCUS - User returned from external tab');
      
      // Start tab return cooldown to prevent immediate re-interaction
      startTabReturnCooldown();
      
      // Reset interaction state when returning from external tab
      setTimeout(() => {
        if (!document.pointerLockElement) {
          console.log('🎯 WINDOW FOCUS - Resetting interaction state after tab return');
          setHoveredObject(null);
          setClickedObject(null);
          document.dispatchEvent(HOVER_END_EVENT);
          if (isTouchDevice) {
            touchState.current.isTouching = false;
            touchState.current.lastTouchedObject = null;
            touchState.current.processedTouch = false;
          }
        }
      }, 100);
    };

    const handleWindowBlur = () => {
      console.log('🎯 WINDOW BLUR - User left tab, preparing for reset on return');
    };
    
    // MOUSE MOVEMENT TRACKING for cooldown reset
    const handleMouseMove = (e: MouseEvent) => {
      if (!isTouchDevice && document.pointerLockElement) {
        // Track movement during pointer lock for cooldown reset
        trackMovement(e.movementX || 0, e.movementY || 0);
      }
    };
    
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
      
      // Cleanup cooldown timer
      if (interactionCooldown.current.cooldownTimer) {
        clearTimeout(interactionCooldown.current.cooldownTimer);
        interactionCooldown.current.cooldownTimer = null;
      }
    };
  }, [gl.domElement, isTouchDevice, setHoveredObject, setClickedObject, startTabReturnCooldown, startPointerLockGrace, trackMovement]);
  
  // Direct DOM event handlers for touch interactions
  useEffect(() => {
    if (!isTouchDevice) return;
    
    const forceRaycast = () => {
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      // console.log('[FPInteractions DEBUG] forceRaycast called'); // DEBUG
      
      const maxDistance = isTouchDevice ? MOBILE_INTERACTION_DISTANCE : DESKTOP_INTERACTION_DISTANCE;
      const intersects = raycaster.intersectObjects(scene.children, true)
        .filter(intersect => 
          intersect.object.userData && 
          intersect.object.userData.interactive === true &&
          intersect.distance < maxDistance // Apply appropriate distance check
        );
      
      const interactiveObject = intersects.length > 0 
        ? intersects[0].object as HoveredObject 
        : null;
      
      if (interactiveObject) {
        // console.log("[FPInteractions DEBUG] forceRaycast: Found interactive object:", interactiveObject.name, interactiveObject.userData); // DEBUG
        if (hoveredObject !== interactiveObject) {
          if (hoveredObject) document.dispatchEvent(HOVER_END_EVENT);
          document.dispatchEvent(HOVER_START_EVENT);
          setHoveredObject(interactiveObject);
        }
      } else if (hoveredObject) {
        // If forceRaycast finds nothing, and something was hovered, clear it.
        // console.log("[FPInteractions DEBUG] forceRaycast: No object, clearing hover"); // DEBUG
        document.dispatchEvent(HOVER_END_EVENT);
        setHoveredObject(null);
        touchState.current.lastTouchedObject = null;
      }
    };
    
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault(); 
      // console.log('[FPInteractions DEBUG] handleTouchStart entered'); // DEBUG
      touchState.current.isTouching = true;
      touchState.current.touchStartTime = Date.now();
      touchState.current.processedTouch = false; 

      // UNITY FIX: Perform precise raycast for touch interaction using exact center
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const maxDistance = isTouchDevice ? MOBILE_INTERACTION_DISTANCE : DESKTOP_INTERACTION_DISTANCE;
      const touchIntersects = raycaster.intersectObjects(scene.children, true)
        .filter(intersect =>
          intersect.object.userData &&
          intersect.object.userData.interactive === true &&
          intersect.distance < maxDistance
        );
      
      const touchTarget = touchIntersects.length > 0 ? touchIntersects[0].object as HoveredObject : null;

      if (touchTarget && !showChat) {
        console.log(`🎯 TOUCH DEBUG: Touch target found: ${touchTarget.userData?.title}`);
        setHoveredObject(touchTarget);
        document.dispatchEvent(HOVER_START_EVENT);
        document.dispatchEvent(CLICK_EVENT); 
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault(); 
      // console.log('[FPInteractions DEBUG] handleTouchEnd entered'); // DEBUG
      touchState.current.isTouching = false;

      // Perform a quick raycast check on touch end to see if still looking at a valid object
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const maxDistance = isTouchDevice ? MOBILE_INTERACTION_DISTANCE : DESKTOP_INTERACTION_DISTANCE;
      const intersects = raycaster.intersectObjects(scene.children, true)
        .filter(intersect =>
          intersect.object.userData &&
          intersect.object.userData.interactive === true &&
          intersect.distance < maxDistance // Consistent distance check
        );
      const objectAtTouchEnd = intersects.length > 0 ? intersects[0].object as HoveredObject : null;

      // On mobile, don't immediately clear the object after touch end
      // This helps maintain the visibility of objects the user has touched
      if (objectAtTouchEnd) {
        // An object is still targeted within distance
        if (hoveredObject !== objectAtTouchEnd) {
          if (hoveredObject) document.dispatchEvent(HOVER_END_EVENT);
          document.dispatchEvent(HOVER_START_EVENT);
          setHoveredObject(objectAtTouchEnd);
        }
        touchState.current.lastTouchedObject = objectAtTouchEnd; // Update last touched
      }
      // The processedTouch flag is managed by useFrame when an interaction occurs
    };

    gl.domElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    gl.domElement.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    return () => {
      gl.domElement.removeEventListener('touchstart', handleTouchStart);
      gl.domElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [camera, gl, hoveredObject, isTouchDevice, raycaster, scene.children, setHoveredObject, showChat]);
  
  // Desktop click handler
  useEffect(() => {
    if (isTouchDevice) return; // Only for desktop

    const handleClick = (event: MouseEvent) => {
      // Optional: Ensure click is on the canvas itself, not on UI elements on top
      // if (event.target !== gl.domElement) return;

      if (showChat) {
        // console.log('[FPInteractions Desktop] Click ignored, chat is open.');
        return;
      }

      // CRITICAL FIX: Check cooldown FIRST before any other interaction logic
      if (isInCooldown()) {
        const now = Date.now();
        const reasons = [];
        if (interactionCooldown.current.isInCooldown) reasons.push('interaction cooldown active');
        if (now - interactionCooldown.current.lastClickTime < INTERACTION_COOLDOWN_MS) reasons.push('recent click');
        if (now - interactionCooldown.current.lastTabReturnTime < TAB_RETURN_COOLDOWN_MS) reasons.push('returned from external tab');
        if (now - interactionCooldown.current.lastPointerLockTime < POINTER_LOCK_GRACE_MS) reasons.push('pointer lock grace period');
        if (interactionCooldown.current.hasReturnedFromExternalWindow) reasons.push('awaiting user movement');
        
        console.log(`🚫 CLICK BLOCKED: ${reasons.join(', ')}. Move mouse to enable interactions.`);
        return;
      }

      // Handle pointer lock request for initial setup
      if (!document.pointerLockElement) {
        console.log('[FPInteractions Desktop] Requesting pointer lock for cursor alignment...');
        // Try to request pointer lock on click
        try {
          gl.domElement.requestPointerLock();
        } catch (err) {
          console.warn('Failed to request pointer lock:', err);
        }
        
        // CRITICAL: Start grace period and DON'T allow interaction on first click
        // This prevents immediate interaction while pointer lock is being established
        startPointerLockGrace();
        console.log('[FPInteractions Desktop] First click - requesting pointer lock only, no interaction');
        return;
      }

      // UNITY FIX: Perform a NEW raycast at the EXACT moment of click to ensure perfect alignment
      // This guarantees the click uses the same coordinates as the crosshair
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const maxDistance = isTouchDevice ? MOBILE_INTERACTION_DISTANCE : DESKTOP_INTERACTION_DISTANCE;
      const clickIntersects = raycaster.intersectObjects(scene.children, true)
        .filter(intersect =>
          intersect.object.userData &&
          intersect.object.userData.interactive === true &&
          intersect.distance < maxDistance
        );
      
      const clickTarget = clickIntersects.length > 0 ? clickIntersects[0].object as HoveredObject : null;
      
      console.log(`🎯 CLICK DEBUG: Found ${clickIntersects.length} interactive objects at click. Using target:`, clickTarget?.userData?.title || 'NONE');

      if (clickTarget && clickTarget.userData?.interactive) {
        // Special case: chat action
        if (clickTarget.userData.action === 'chat') {
          console.log('[FPInteractions Desktop] Clicked NPC for chat');
          openChat();
          document.dispatchEvent(CLICK_EVENT);
          setClickedObject(clickTarget);
          return;
        }
        
        console.log('[FPInteractions Desktop] Click on clickTarget:', clickTarget.name, clickTarget.userData);
        document.dispatchEvent(CLICK_EVENT); // For crosshair feedback

        if (clickTarget.userData.action === 'chat') {
          console.log(`[FPInteractions Desktop] Opening chat with NPC: ${clickTarget.userData.npcName || clickTarget.userData.npcId || clickTarget.userData.name || clickTarget.name}`);
          openChat();
        } else {
          console.log(`[FPInteractions Desktop] Triggering general interaction for: ${clickTarget.name}`);
          
          // Detect if this is a media card interaction that will open external content
          const isMediaCard = clickTarget.userData.objectType === 'image' || 
                              clickTarget.userData.objectType === 'pdf' || 
                              clickTarget.userData.objectType === 'video' ||
                              clickTarget.userData.type === 'link';
          
          if (isMediaCard) {
            startInteractionCooldown(`Clicked ${clickTarget.userData.objectType || 'media'} card`);
          }
          
          triggerInteraction(); // This uses the hoveredObject from InteractionContext
        }
        setClickedObject(clickTarget); // For potential feedback if needed elsewhere
      } else {
        // console.log('[FPInteractions Desktop] Click with no interactive hoveredObject.');
      }
    };

    gl.domElement.addEventListener('click', handleClick);
    return () => {
      gl.domElement.removeEventListener('click', handleClick);
    };
  }, [isTouchDevice, gl, showChat, hoveredObject, openChat, triggerInteraction, setClickedObject, isPointerLocked, isInCooldown, startInteractionCooldown, startPointerLockGrace]);

  // Update hover state using precise raycasting from exact center (0,0)
  useFrame((state) => {
    // PERFORMANCE FIX: Throttle raycasting to reduce CPU usage
    // Only perform raycasting every 3rd frame (20fps instead of 60fps)
    const frameCount = Math.floor(state.clock.elapsedTime * 60); // Approximate frame count
    if (frameCount % 3 !== 0) {
      return;
    }
    
    // Skip interaction checks when chat is open
    if (showChat) {
      // If we had a previously hovered object, unhover it
      if (hoveredObject) {
        // console.log('[FPInteractions DEBUG] Chat open, unhovering:', hoveredObject.name); // DEBUG
        document.dispatchEvent(HOVER_END_EVENT);
        setHoveredObject(null);
        if (isTouchDevice) touchState.current.lastTouchedObject = null;
      }
      return;
    }
    
    // AUTO-RESET: Check for stuck states and reset after 10 seconds of no interaction changes
    const currentTime = Date.now();
    if (hoveredObject && (currentTime - lastInteractionTime.current) > 10000) {
      console.log('🎯 AUTO-RESET: Detected stuck interaction state, resetting...');
      setHoveredObject(null);
      setClickedObject(null);
      document.dispatchEvent(HOVER_END_EVENT);
      if (isTouchDevice) {
        touchState.current.isTouching = false;
        touchState.current.lastTouchedObject = null;
        touchState.current.processedTouch = false;
      }
      lastInteractionTime.current = currentTime;
    }
    
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    if (rayHelper.current) {
      rayHelper.current.setDirection(raycaster.ray.direction);
      rayHelper.current.position.copy(raycaster.ray.origin);
    }

    const maxDistance = isTouchDevice ? MOBILE_INTERACTION_DISTANCE : DESKTOP_INTERACTION_DISTANCE;
    const allIntersects = raycaster.intersectObjects(scene.children, true);
    const interactiveIntersects = allIntersects.filter(intersect =>
      intersect.object.userData &&
      intersect.object.userData.interactive === true
    );
    
    // DEBUG: Log raycasting info periodically (only in development and less frequently)
    if (process.env.NODE_ENV === 'development') {
      const now = Date.now();
      if (!(window as any).lastRaycastLog || now - (window as any).lastRaycastLog > 5000) {
        console.log(`🎯 RAYCAST DEBUG: Found ${interactiveIntersects.length} interactive objects. Max distance: ${maxDistance}. Device: ${isTouchDevice ? 'MOBILE' : 'DESKTOP'}`);
        if (interactiveIntersects.length > 0) {
          interactiveIntersects.forEach((intersect, i) => {
            console.log(`  ${i}: "${intersect.object.userData.title}" at distance ${intersect.distance.toFixed(1)} (${intersect.distance < maxDistance ? 'WITHIN' : 'TOO FAR'})`);
          });
        }
        (window as any).lastRaycastLog = now;
      }
    }
    
    const intersects = interactiveIntersects.filter(intersect => intersect.distance < maxDistance);

    let interactiveObject = intersects.length > 0 ? intersects[0].object as HoveredObject : null;

    if (isTouchDevice) {
      if (touchState.current.isTouching) {
        if (interactiveObject && !touchState.current.processedTouch) {
          // Check cooldown for mobile media cards too
          const isMediaCard = interactiveObject.userData.objectType === 'image' || 
                              interactiveObject.userData.objectType === 'pdf' || 
                              interactiveObject.userData.objectType === 'video' ||
                              interactiveObject.userData.type === 'link';
          
          if (!(isMediaCard && isInCooldown())) {
            touchState.current.lastTouchedObject = interactiveObject;
            if (hoveredObject !== interactiveObject) {
              if (hoveredObject) document.dispatchEvent(HOVER_END_EVENT);
              document.dispatchEvent(HOVER_START_EVENT);
              setHoveredObject(interactiveObject);
            }
          }
          touchState.current.processedTouch = true; 
        }
      } else {
        // Not touching: immediate hover update based on what's at crosshair center
        if (interactiveObject) {
          // Check cooldown for mobile media cards
          const isMediaCard = interactiveObject.userData.objectType === 'image' || 
                              interactiveObject.userData.objectType === 'pdf' || 
                              interactiveObject.userData.objectType === 'video' ||
                              interactiveObject.userData.type === 'link';
          
          const shouldBlockHover = isMediaCard && isInCooldown();
          
          if (!shouldBlockHover) {
            if (hoveredObject !== interactiveObject) {
              if (hoveredObject) document.dispatchEvent(HOVER_END_EVENT);
              document.dispatchEvent(HOVER_START_EVENT);
              setHoveredObject(interactiveObject);
            }
          } else if (hoveredObject) {
            // Clear hover during cooldown
            document.dispatchEvent(HOVER_END_EVENT);
            setHoveredObject(null);
          }
        } else if (hoveredObject) {
          // Immediately clear hover when nothing is at center - makes button disappear instantly
          document.dispatchEvent(HOVER_END_EVENT);
          setHoveredObject(null);
        }
      }
    } else {
      // Desktop interaction logic with cooldown respect
      if (interactiveObject) {
        // Check if we're in cooldown period - if so, don't show hover for media cards
        const isMediaCard = interactiveObject.userData.objectType === 'image' || 
                            interactiveObject.userData.objectType === 'pdf' || 
                            interactiveObject.userData.objectType === 'video' ||
                            interactiveObject.userData.type === 'link';
        
        const shouldBlockHover = isMediaCard && isInCooldown();
        
        if (shouldBlockHover) {
          // Clear hover during cooldown to prevent accidental re-interaction
          if (hoveredObject) {
            document.dispatchEvent(HOVER_END_EVENT);
            setHoveredObject(null);
          }
        } else {
          // Normal hover behavior when not in cooldown
          if (hoveredObject !== interactiveObject) {
            if (hoveredObject) document.dispatchEvent(HOVER_END_EVENT);
            document.dispatchEvent(HOVER_START_EVENT);
            setHoveredObject(interactiveObject);
          }
        }
      } else if (hoveredObject) {
        document.dispatchEvent(HOVER_END_EVENT);
        setHoveredObject(null);
      }
    }
  });
  
  return {
    hoveredObject,
    clickedObject,
    isPointerLocked
  };
}

export default useFirstPersonInteractions; 