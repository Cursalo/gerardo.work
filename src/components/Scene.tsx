import React, { Suspense, createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Vector3, Camera } from 'three';
import Environment from './Environment';
import FirstPersonCamera from './FirstPersonCamera';
import NPCCharacter from './NPCCharacter'; 
import useFirstPersonInteractions from '../hooks/useFirstPersonInteractions';
import { useWorld } from '../context/WorldContext';
import WorldObject from './WorldObject';
import LoadingScreen from './LoadingScreen';
import MobileControls from './MobileControls'; 
import useMobileDetection from '../hooks/useMobileDetection'; 
import { MobileControlsProvider } from '../context/MobileControlsContext'; 
import BackButton from './BackButton'; 
import { InteractionProvider } from '../context/InteractionContext'; 
import InteractionButton from './InteractionButton'; 
import DesktopBackHint from './DesktopBackHint';
import { SpeakerExperience } from './SpeakerExperience';
import PerformanceMonitor from './PerformanceMonitor';
import * as THREE from 'three';

// Maximum distance for full quality rendering
const MAX_RENDER_DISTANCE = 50;

// Performance configuration based on device capabilities
const getPerformanceConfig = (isMobile: boolean) => ({
  maxObjects: isMobile ? 20 : 66,
  shadowQuality: isMobile ? 'low' : 'medium',
  antialiasing: !isMobile,
  pixelRatio: isMobile ? Math.min(window.devicePixelRatio, 2) : Math.min(window.devicePixelRatio, 2),
  frameRate: isMobile ? 30 : 60
});

// Create a context to share visibility information for overlapping detection
export const VisibilityContext = createContext<{
  registerPosition: (id: number, position: [number, number, number]) => void;
  unregisterPosition: (id: number) => void;
  checkOverlap: (id: number, position: [number, number, number]) => boolean;
}>({
  registerPosition: () => {},
  unregisterPosition: () => {},
  checkOverlap: () => false
});

const Loading3D = () => {
  return (
    <Html center>
      <div style={{ color: 'white', fontSize: '20px' }}>Loading 3D Scene...</div>
    </Html>
  );
};

// PERFORMANCE: Optimized camera position tracking with adaptive throttling
const useThrottledCameraPosition = (camera: Camera, interval: number = 500) => {
  const [throttledPosition, setThrottledPosition] = useState(() => camera.position.clone());
  const lastUpdateTime = useRef(0);
  const frameCounter = useRef(0);

  useFrame(() => {
    frameCounter.current++;
    
    // Only check on every 10th frame for better performance
    if (frameCounter.current % 10 !== 0) return;
    
    const now = Date.now();
    if (now - lastUpdateTime.current > interval) {
      // Only update if camera has moved significantly (avoid micro-movements)
      const distance = throttledPosition.distanceTo(camera.position);
      if (distance > 1.0) { // Increased threshold for less frequent updates
        setThrottledPosition(camera.position.clone());
        lastUpdateTime.current = now;
      }
    }
  });

  return throttledPosition;
};

// PERFORMANCE: Optimized object filtering with distance-based culling and LOD
const useObjectFiltering = (objects: any[], camera: Camera, isMobile: boolean) => {
  const throttledCameraPosition = useThrottledCameraPosition(camera, 1000); // Further increased interval
  const config = getPerformanceConfig(isMobile);
  
  return useMemo(() => {
    if (!objects || objects.length === 0) return [];
    
    // Calculate distances and sort by priority
    const objectsWithDistance = objects.map(object => {
      let distance = 0;
      let priority = 0;
      
      if (object.position) {
        const objPos = new Vector3(
          object.position.x || 0,
          object.position.y || 0,
          object.position.z || 0
        );
        distance = throttledCameraPosition.distanceTo(objPos);
      }
      
      // Higher priority for project objects
      if (object.type === 'project') priority = 1000;
      else if (object.type === 'button') priority = 500;
      else priority = 100;
      
      return { object, distance, priority };
    });
    
    // Sort by priority first, then by distance
    objectsWithDistance.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.distance - b.distance;
    });
    
    // Take only the most important objects based on device capability
    const visibleObjects = objectsWithDistance
      .slice(0, config.maxObjects)
      .filter(({ distance, object }) => {
        // Always include project objects regardless of distance
        if (object.type === 'project') return true;
        
        // Filter by distance for other objects
        const maxDistance = isMobile ? MAX_RENDER_DISTANCE * 0.6 : MAX_RENDER_DISTANCE;
        return distance < maxDistance;
      })
      .map(({ object }) => object);
    
    return visibleObjects;
  }, [objects, throttledCameraPosition, isMobile, config.maxObjects]);
};

interface SceneContentProps {
  worldId?: string;
}

const SceneContent = React.memo(({ worldId }: SceneContentProps) => {
  // Get context/hooks
  const { currentWorld, isLoading, setCurrentWorldId } = useWorld();
  const { isMobile } = useMobileDetection();
  const { camera } = useThree();
  
  // Get filtered objects based on distance and performance
  const visibleObjects = useObjectFiltering(
    currentWorld?.objects || [],
    camera,
    isMobile
  );
  
  // Register FP interaction hook
  useFirstPersonInteractions();
  
  // Handle world ID changes
  useEffect(() => {
    if (worldId && worldId !== currentWorld?.id) {
      setCurrentWorldId(worldId);
    }
  }, [worldId, currentWorld?.id, setCurrentWorldId]);
  
  // Handler for sub-world navigation (move to project world)
  const handleNavigateToSubworld = useCallback((event: any) => {
    event.stopPropagation();
    if (event.object?.userData?.worldId) {
      const targetWorldId = event.object.userData.worldId;
      setCurrentWorldId(targetWorldId);
    }
  }, [setCurrentWorldId]);
  
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

  // Memoize camera position to prevent unnecessary Vector3 creation
  const cameraPosition = useMemo(() => {
    if (currentWorld?.cameraPosition) {
      return new Vector3(
        currentWorld.cameraPosition.x,
        currentWorld.cameraPosition.y,
        currentWorld.cameraPosition.z
      );
    }
    return new Vector3(0, 1.7, 15);
  }, [currentWorld?.cameraPosition]);
  
  if (isLoading || !currentWorld) {
    return <Loading3D />;
  }
  
  return (
    <>
      <Environment />
      
      {/* First Person Camera with memoized position */}
      <FirstPersonCamera 
        position={cameraPosition}
        height={1.7} 
        moveSpeed={0.25}
        rotationSpeed={0.0015}
        acceleration={0.12}
        deceleration={0.2}
      />
      
      {/* World Objects - only render optimized visible objects */}
      {visibleObjects.map(object => (
        <WorldObject 
          key={object.id}
          object={object}
        />
      ))}
      
      {/* Add TechnoClaw to the main world for now */}
      {currentWorld.id === 'mainWorld' && (
        <>
          <NPCCharacter 
            npcId="technoclaw" 
            name="TechnoClaw" 
            position={[0, 0, -4]} 
            debug={false} // Always false for production performance
          />
          <SpeakerExperience position={[5, 0, 0]} scale={0.5} rotation={[0, -Math.PI / 4, 0]} />
          
          {/* Optimized lighting for performance */}
          <pointLight 
            position={[0, 5, -4]} 
            intensity={0.5} 
            distance={10} 
            color="#ffffff" 
            castShadow={false} // Disabled for performance
          />
        </>
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return prevProps.worldId === nextProps.worldId;
});

// Main Scene component with performance optimizations
interface SceneProps {
  worldId?: string;
}

const Scene = ({ worldId }: SceneProps) => {
  // State for visibility checking (managed here)
  const [positions, setPositions] = useState<Map<number, [number, number, number]>>(new Map());
  
  // Get necessary contexts/hooks for passing down
  const { currentWorld, isLoading, setCurrentWorldId } = useWorld();
  const { isTouchDevice } = useMobileDetection();
  const config = getPerformanceConfig(isTouchDevice);

  // Memoize visibility context functions to prevent unnecessary re-renders
  const registerPosition = useCallback((id: number, position: [number, number, number]) => {
    setPositions(prev => {
      const newMap = new Map(prev);
      newMap.set(id, position);
      return newMap;
    });
  }, []);

  const unregisterPosition = useCallback((id: number) => {
    setPositions(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const checkOverlap = useCallback((id: number, position: [number, number, number]): boolean => {
    if (positions.size === 0) return false;
    const [x, y, z] = position;
    for (const [otherId, otherPos] of positions.entries()) {
      if (otherId === id) continue;
      const [ox, oy, oz] = otherPos;
      const dx = x - ox;
      const dy = y - oy;
      const dz = z - oz;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distance < 2) {
        return true;
      }
    }
    return false;
  }, [positions]);

  // Memoize the context value itself
  const visibilityContextValue = React.useMemo(() => ({ 
    registerPosition, 
    unregisterPosition,
    checkOverlap 
  }), [registerPosition, unregisterPosition, checkOverlap]);

  // Loading check
  if (isLoading || !currentWorld) {
    return <LoadingScreen />;
  }

  // Return providers wrapping the Canvas container and the UI buttons directly
  return (
    <InteractionProvider>
      <MobileControlsProvider>
        <>
          {/* Optimized Canvas Container */}
          <div 
            id="canvas-container"
            style={{
              position: 'fixed',
              width: '100%',
              height: '100%',
              margin: 0,
              padding: 0,
              overflow: 'hidden',
              top: 0,
              left: 0,
              zIndex: 0,
              backgroundColor: '#ffffff',
            }}
          >
            <VisibilityContext.Provider value={visibilityContextValue}>
              <Canvas
                shadows={config.shadowQuality !== 'low'}
                dpr={config.pixelRatio}
                performance={{
                  min: 0.5, // Minimum performance target
                  max: 1,   // Maximum performance target
                  debounce: 200 // Debounce performance adjustments
                }}
                gl={{
                  antialias: config.antialiasing,
                  alpha: false, // Disable transparency for better performance
                  powerPreference: 'high-performance',
                  preserveDrawingBuffer: false,
                  stencil: false,
                  depth: true
                }}
                camera={{
                  fov: 75,
                  near: 0.1,
                  far: 1000,
                  position: [0, 1.7, 15]
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  outline: 'none'
                }}
                onCreated={({ gl }) => {
                  // Performance optimizations
                  gl.setPixelRatio(config.pixelRatio);
                  gl.shadowMap.enabled = config.shadowQuality !== 'low';
                  if (gl.shadowMap.enabled) {
                    gl.shadowMap.type = THREE.PCFSoftShadowMap;
                  }
                }}
              >
                <Suspense fallback={<Loading3D />}>
                  <SceneContent key={currentWorld ? currentWorld.id : 'loading'} worldId={worldId} />
                  {/* <PerformanceMonitor enabled={process.env.NODE_ENV === 'development'} showStats={false} /> */}
                </Suspense>
              </Canvas>
            </VisibilityContext.Provider>
          </div>

          {/* UI Elements Rendered Separately */}
          {isTouchDevice && <MobileControls />}
          <BackButton />
          <DesktopBackHint />
          <InteractionButton />
        </>
      </MobileControlsProvider>
    </InteractionProvider>
  );
};

export default Scene; 