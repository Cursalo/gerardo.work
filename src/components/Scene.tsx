import React, { Suspense, createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
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
import ReloadButton from './ReloadButton';
import BillboardManager from './BillboardManager';

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

// Loading 3D state while in 3D world
const Loading3D = () => {
  return (
    <mesh position={[0, 1, 0]}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial color="#4dffaa" wireframe />
    </mesh>
  );
};

interface SceneContentProps {
  worldId?: string;
}

const SceneContent = ({ worldId }: SceneContentProps) => {
  // Get context/hooks
  const { currentWorld, isLoading, setCurrentWorldId } = useWorld();
  const { isMobile } = useMobileDetection();
  const { camera } = useThree();
  
  // Get filtered objects based on distance - now memoized with better dependencies
  const visibleObjects = useMemo(() => {
    if (!currentWorld?.objects || currentWorld.objects.length === 0) return [];
    
    // Return all objects directly
    return currentWorld.objects;
  }, [currentWorld?.objects]); // Simplified dependencies, camera.position and isMobile no longer needed here
  
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
      console.log(`Navigating to world: ${targetWorldId}`);
      setCurrentWorldId(targetWorldId);
    }
  }, [setCurrentWorldId]);
  
  // Handle "B" key press to return to main world
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'b') {
        // Check if we're in a project world by looking at the world ID pattern
        if (currentWorld && currentWorld.id.startsWith('project-world-')) {
          // Reduce logging - only log in development
          if (process.env.NODE_ENV === 'development') {
            console.log("B key pressed - returning to main world");
          }
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
  
  if (isLoading || !currentWorld) {
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log("SceneContent returning Loading3D");
    }
    return <Loading3D />;
  }
  
  // Only log in development mode and reduce frequency
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) { // Log only ~10% of renders
    console.log("SceneContent rendering world:", currentWorld.id, "with visible objects:", visibleObjects.length, "of", currentWorld.objects.length);
  }
  
  return (
    <>
      <Environment />
      
      {/* Add the global BillboardManager */}
      <BillboardManager />
      
      {/* First Person Camera with position from world data if available */}
      <FirstPersonCamera 
        position={
          currentWorld.cameraPosition 
            ? new Vector3(
                currentWorld.cameraPosition.x,
                currentWorld.cameraPosition.y,
                currentWorld.cameraPosition.z
              )
            : new Vector3(0, 1.7, 15) // Default if not provided
        }
        height={1.7} 
        moveSpeed={0.25}
        rotationSpeed={0.0015}
        acceleration={0.12}
        deceleration={0.2}
      />
      
      {/* World Objects - only render those that are visible based on distance */}
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
            debug={process.env.NODE_ENV === 'development'}
          />
          <SpeakerExperience position={[5, 0, 0]} scale={0.5} rotation={[0, -Math.PI / 4, 0]} />
          
          {/* Fallback safety measure - add an additional invisible light to ensure TechnoClaw is illuminated */}
          <pointLight 
            position={[0, 5, -4]} 
            intensity={0.5} 
            distance={10} 
            color="#ffffff" 
            castShadow={false} 
          />
        </>
      )}
    </>
  );
};

// Main Scene component - now much simpler
interface SceneProps {
  worldId?: string;
}

const Scene = ({ worldId }: SceneProps) => {
  // State for visibility checking (managed here)
  const [positions, setPositions] = useState<Map<number, [number, number, number]>>(new Map());
  
  // Track WebGL context state
  const [contextLost, setContextLost] = useState<boolean>(false);
  
  // Get necessary contexts/hooks for passing down
  const { currentWorld, isLoading, setCurrentWorldId } = useWorld();
  const { isTouchDevice } = useMobileDetection();

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
  }, [positions]); // Dependency on positions map

  // Handle WebGL context loss/restoration
  const handleContextLost = useCallback((event: Event) => {
    console.warn('WebGL context lost', event);
    event.preventDefault(); // Prevent default handling
    setContextLost(true);
  }, []);

  const handleContextRestored = useCallback((event: Event) => {
    console.log('WebGL context restored', event);
    setContextLost(false);
  }, []);

  // Set up event listeners for WebGL context events
  useEffect(() => {
    const canvasContainer = document.getElementById('canvas-container');
    const canvas = canvasContainer?.querySelector('canvas');
    
    if (canvas) {
      // Add listeners for context loss/restoration
      canvas.addEventListener('webglcontextlost', handleContextLost);
      canvas.addEventListener('webglcontextrestored', handleContextRestored);
      
      // Clean up listeners when component unmounts
      return () => {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      };
    }
  }, [handleContextLost, handleContextRestored]);

  // Memoize the context value itself - MUST be before early return
  const visibilityContextValue = React.useMemo(() => ({ 
    registerPosition, 
    unregisterPosition,
    checkOverlap 
  }), [registerPosition, unregisterPosition, checkOverlap]);

  // Loading check moved here
  if (isLoading || !currentWorld) {
    console.log("Scene returning LoadingScreen");
    return <LoadingScreen />; // Now safe to return early
  }

  // Show context lost message if applicable
  if (contextLost) {
    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a2e',
          color: '#ffffff',
          zIndex: 1000
        }}
      >
        <h2>WebGL Context Lost</h2>
        <p>The 3D rendering context was lost. This may be due to hardware issues or browser limitations.</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            margin: '20px',
            backgroundColor: '#4dffaa',
            color: '#000000',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }

  // Return providers wrapping the Canvas container and the UI buttons directly
  return (
    <InteractionProvider>
      <MobileControlsProvider>
        <>
          {/* Canvas Container */}
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
              zIndex: 0, // Ensure canvas container is behind buttons
              backgroundColor: '#ffffff',
            }}
          >
            <VisibilityContext.Provider value={visibilityContextValue}>
              <Canvas
                shadows
                dpr={[1, 2]}
                performance={{ min: 0.5 }}
                eventPrefix="client"
                camera={{
                  fov: 70,
                  near: 0.1,
                  far: 1000,
                  position: [0, 1.7, 15],
                  up: [0, 1, 0]
                }}
                gl={{
                  antialias: true,
                  alpha: false,
                  stencil: false,
                  // Add context attributes for better context loss handling
                  powerPreference: 'high-performance',
                  failIfMajorPerformanceCaveat: false,
                  preserveDrawingBuffer: true
                }}
                raycaster={{
                  far: 100
                }}
                style={{
                  touchAction: 'none', // Correct way to apply touchAction
                  outline: 'none',
                  cursor: 'none',
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  backgroundColor: '#ffffff',
                }}
                onCreated={({ gl }) => {
                  // Set additional parameters on the WebGL renderer
                  gl.setClearColor('#ffffff', 1);
                  // Log that the WebGL context was created successfully
                  console.log('WebGL context created successfully');
                }}
              >
                <color attach="background" args={['#ffffff']} />
                <Suspense fallback={<Loading3D />}>
                  <SceneContent key={currentWorld ? currentWorld.id : 'loading'} worldId={worldId} />
                </Suspense>
              </Canvas>
            </VisibilityContext.Provider>
          </div>

          {/* UI Elements Rendered Separately */}
          {isTouchDevice && <MobileControls />}
          <BackButton />
          <DesktopBackHint />
          <InteractionButton />
          <ReloadButton />
        </>
      </MobileControlsProvider>
    </InteractionProvider>
  );
};

export default Scene; 