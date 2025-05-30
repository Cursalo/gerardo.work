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

// Maximum distance for full quality rendering
const MAX_RENDER_DISTANCE = 50;

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

// Determine which objects to render based on camera position and performance requirements
const useObjectFiltering = (objects: any[], cameraPosition: Vector3, isMobile: boolean) => {
  return useMemo(() => {
    if (!objects || objects.length === 0) return [];
    
    // For desktop, we can render more objects at a greater distance
    const maxRenderDistance = isMobile ? MAX_RENDER_DISTANCE * 0.7 : MAX_RENDER_DISTANCE;
    
    // Filter out objects that are too far away
    return objects.filter(object => {
      // Always include project objects regardless of distance
      if (object.type === 'project') {
        return true;
      }
      
      if (!object.position) return true; // Always render objects without position data
      
      const objPos = new Vector3(
        object.position.x || 0,
        object.position.y || 0,
        object.position.z || 0
      );
      
      const distance = cameraPosition.distanceTo(objPos);
      return distance < maxRenderDistance;
    });
  }, [objects, cameraPosition, isMobile]);
};

interface SceneContentProps {
  worldId?: string;
}

const SceneContent = ({ worldId }: SceneContentProps) => {
  // Get context/hooks
  const { currentWorld, isLoading, setCurrentWorldId } = useWorld();
  const { isMobile } = useMobileDetection();
  const { camera } = useThree();
  
  // Get filtered objects based on distance
  const visibleObjects = useObjectFiltering(
    currentWorld?.objects || [],
    camera.position as Vector3,
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
  const handleNavigateToSubworld = (event: any) => {
    event.stopPropagation();
    if (event.object?.userData?.worldId) {
      const targetWorldId = event.object.userData.worldId;
      console.log(`Navigating to world: ${targetWorldId}`);
      setCurrentWorldId(targetWorldId);
    }
  };
  
  // Handle "B" key press to return to main world
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'b') {
        // Check if we're in a project world by looking at the world ID pattern
        if (currentWorld && currentWorld.id.startsWith('project-world-')) {
          console.log("B key pressed - returning to main world");
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
    console.log("SceneContent returning Loading3D");
    return <Loading3D />;
  }
  
  console.log("SceneContent rendering world:", currentWorld.id, "with visible objects:", visibleObjects.length, "of", currentWorld.objects.length);
  
  return (
    <>
      <Environment />
      
      {/* First Person Camera with position from world data if available */}
      <FirstPersonCamera 
        position={
          currentWorld.cameraPosition 
            ? new Vector3(
                currentWorld.cameraPosition.x,
                currentWorld.cameraPosition.y,
                currentWorld.cameraPosition.z
              )
            : new Vector3(0, 1.7, 15)
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
                  powerPreference: 'high-performance',
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
        </>
      </MobileControlsProvider>
    </InteractionProvider>
  );
};

export default Scene; 