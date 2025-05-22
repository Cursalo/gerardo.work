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

// Increase the interaction distance to make project cards more visible on mobile
const MOBILE_INTERACTION_DISTANCE = 30; // Increased from 15 to be more forgiving

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
        const intersects = raycaster.intersectObjects(scene.children, true)
          .filter(intersect => 
            intersect.object.userData && 
            intersect.object.userData.interactive === true &&
            intersect.distance < MOBILE_INTERACTION_DISTANCE
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
  
  // Track pointer lock state
  useEffect(() => {
    const handlePointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement === gl.domElement);
    };
    
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [gl.domElement]);
  
  // Direct DOM event handlers for touch interactions
  useEffect(() => {
    if (!isTouchDevice) return;
    
    const forceRaycast = () => {
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      // console.log('[FPInteractions DEBUG] forceRaycast called'); // DEBUG
      
      const intersects = raycaster.intersectObjects(scene.children, true)
        .filter(intersect => 
          intersect.object.userData && 
          intersect.object.userData.interactive === true &&
          intersect.distance < MOBILE_INTERACTION_DISTANCE // Apply distance check here too
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

      forceRaycast(); 

      if (hoveredObject && !showChat) {
        // console.log('[FPInteractions DEBUG] handleTouchStart: hoveredObject exists, dispatching CLICK_EVENT', hoveredObject.name); // DEBUG
        document.dispatchEvent(CLICK_EVENT); 
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault(); 
      // console.log('[FPInteractions DEBUG] handleTouchEnd entered'); // DEBUG
      touchState.current.isTouching = false;

      // Perform a quick raycast check on touch end to see if still looking at a valid object
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const intersects = raycaster.intersectObjects(scene.children, true)
        .filter(intersect =>
          intersect.object.userData &&
          intersect.object.userData.interactive === true &&
          intersect.distance < MOBILE_INTERACTION_DISTANCE // Consistent distance check
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

      // Check pointer lock for FPS mode, but allow interaction even if not locked for general desktop use
      // if (!isPointerLocked && document.pointerLockElement !== gl.domElement) {
      //   console.log('[FPInteractions Desktop] Click ignored, pointer not locked and not on canvas focus (if strict).');
      //   return;
      // }

      if (hoveredObject && hoveredObject.userData?.interactive) {
        // Special case: chat action
        if (hoveredObject.userData.action === 'chat') {
          console.log('[FPInteractions Desktop] Clicked NPC for chat');
          openChat();
          document.dispatchEvent(CLICK_EVENT);
          setClickedObject(hoveredObject);
          return;
        }
        console.log('[FPInteractions Desktop] Click on hoveredObject:', hoveredObject.name, hoveredObject.userData);
        document.dispatchEvent(CLICK_EVENT); // For crosshair feedback

        if (hoveredObject.userData.action === 'chat') {
          console.log(`[FPInteractions Desktop] Opening chat with NPC: ${hoveredObject.userData.npcName || hoveredObject.userData.npcId || hoveredObject.userData.name || hoveredObject.name}`);
          openChat();
        } else {
          console.log(`[FPInteractions Desktop] Triggering general interaction for: ${hoveredObject.name}`);
          triggerInteraction(); // This uses the hoveredObject from InteractionContext
        }
        setClickedObject(hoveredObject); // For potential feedback if needed elsewhere
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
    
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    if (rayHelper.current) {
      rayHelper.current.setDirection(raycaster.ray.direction);
      rayHelper.current.position.copy(raycaster.ray.origin);
    }

    const intersects = raycaster.intersectObjects(scene.children, true)
      .filter(intersect =>
        intersect.object.userData &&
        intersect.object.userData.interactive === true &&
        (!isTouchDevice || intersect.distance < MOBILE_INTERACTION_DISTANCE)
      );

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