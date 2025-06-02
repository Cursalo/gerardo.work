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

// Reasonable interaction distances for better user experience
const MOBILE_INTERACTION_DISTANCE = 50; // Reasonable range for mobile touch interaction
const DESKTOP_INTERACTION_DISTANCE = 100; // Reasonable range for desktop clicks

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

  // Flag to track touch interaction state with improved state tracking
  const touchState = useRef({
    isTouching: false,
    lastTouchedObject: null as HoveredObject | null,
    touchStartTime: 0,
    processedTouch: false,  // Track if we've already processed this touch
    objectsScanned: false   // Track if we've performed an initial scene scan
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
  
  // Initial scene scan to detect objects for mobile
  useEffect(() => {
    if (isTouchDevice && !touchState.current.objectsScanned) {
      // Perform an initial scan to make objects visible even without interaction
      const performInitialScan = () => {
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const maxDistance = isTouchDevice ? MOBILE_INTERACTION_DISTANCE : DESKTOP_INTERACTION_DISTANCE;
        const intersects = raycaster.intersectObjects(scene.children, true)
          .filter(intersect => 
            intersect.object.userData && 
            intersect.object.userData.interactive === true &&
            intersect.distance < maxDistance
          );
          
        if (intersects.length > 0) {
          const interactiveObject = intersects[0].object as HoveredObject;
          setHoveredObject(interactiveObject);
          document.dispatchEvent(HOVER_START_EVENT);
          touchState.current.lastTouchedObject = interactiveObject;
        }
        
        touchState.current.objectsScanned = true;
      };
      
      // Delay scan to ensure scene is ready
      const timer = setTimeout(performInitialScan, 1000);
      return () => clearTimeout(timer);
    }
  }, [camera, isTouchDevice, raycaster, scene.children, setHoveredObject]);
  
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
      
      // CRITICAL FIX: Reset interaction state when pointer lock is lost
      if (!isLocked) {
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
      console.log('🎯 WINDOW FOCUS - Checking and resetting interaction state');
      // When user returns from external tab, reset interaction state
      setTimeout(() => {
        if (!document.pointerLockElement) {
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
    
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('keydown', handleEscapeKey);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('keydown', handleEscapeKey);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [gl.domElement, isTouchDevice, setHoveredObject, setClickedObject]);
  
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

      // CRITICAL FIX: Allow first click to work and request pointer lock simultaneously
      // This creates a seamless experience where the first click both establishes pointer lock 
      // AND triggers the interaction if crosshair is over an object
      if (!document.pointerLockElement) {
        console.log('[FPInteractions Desktop] Requesting pointer lock for cursor alignment...');
        // Try to request pointer lock on click
        try {
          gl.domElement.requestPointerLock();
        } catch (err) {
          console.warn('Failed to request pointer lock:', err);
        }
        
        // CRITICAL: Don't return here - allow the interaction to proceed
        // This way the first click both requests pointer lock AND triggers interaction
        console.log('[FPInteractions Desktop] Allowing interaction while requesting pointer lock...');
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
  }, [isTouchDevice, gl, showChat, hoveredObject, openChat, triggerInteraction, setClickedObject, isPointerLocked]);

  // Update hover state using precise raycasting from exact center (0,0)
  useFrame(() => {
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
    
    // DEBUG: Log raycasting info periodically using a simpler approach
    const now = Date.now();
    if (!(window as any).lastRaycastLog || now - (window as any).lastRaycastLog > 2000) {
      console.log(`🎯 RAYCAST DEBUG: Found ${interactiveIntersects.length} interactive objects. Max distance: ${maxDistance}. Device: ${isTouchDevice ? 'MOBILE' : 'DESKTOP'}`);
      if (interactiveIntersects.length > 0) {
        interactiveIntersects.forEach((intersect, i) => {
          console.log(`  ${i}: "${intersect.object.userData.title}" at distance ${intersect.distance.toFixed(1)} (${intersect.distance < maxDistance ? 'WITHIN' : 'TOO FAR'})`);
        });
      }
      (window as any).lastRaycastLog = now;
    }
    
    const intersects = interactiveIntersects.filter(intersect => intersect.distance < maxDistance);

    let interactiveObject = intersects.length > 0 ? intersects[0].object as HoveredObject : null;

    if (isTouchDevice) {
      if (touchState.current.isTouching) {
        if (interactiveObject && !touchState.current.processedTouch) {
          touchState.current.lastTouchedObject = interactiveObject;
          if (hoveredObject !== interactiveObject) {
            if (hoveredObject) document.dispatchEvent(HOVER_END_EVENT);
            document.dispatchEvent(HOVER_START_EVENT);
            setHoveredObject(interactiveObject);
          }
          touchState.current.processedTouch = true; 
        }
      } else {
        // Not touching: rely on continuous raycasting for hover updates
        if (interactiveObject) {
          if (hoveredObject !== interactiveObject) {
            if (hoveredObject) document.dispatchEvent(HOVER_END_EVENT);
            document.dispatchEvent(HOVER_START_EVENT);
            setHoveredObject(interactiveObject);
            touchState.current.lastTouchedObject = interactiveObject; // Keep track even if not actively touching
          }
        } else if (hoveredObject && !touchState.current.lastTouchedObject) {
          // Only clear hover if we're not pointing at anything AND we don't have a recently touched object
          // This helps maintain visibility of objects on mobile when moving around
          document.dispatchEvent(HOVER_END_EVENT);
          setHoveredObject(null);
        }
      }
    } else {
      // Desktop interaction logic
      if (interactiveObject) {
        if (hoveredObject !== interactiveObject) {
          if (hoveredObject) document.dispatchEvent(HOVER_END_EVENT);
          document.dispatchEvent(HOVER_START_EVENT);
          setHoveredObject(interactiveObject);
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