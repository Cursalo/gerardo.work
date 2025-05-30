import React, { createContext, useContext, useState, useRef, useEffect, ReactNode, MutableRefObject } from 'react';
import * as THREE from 'three';

// Define the AppContext type
interface AppContextType {
  raycaster: THREE.Raycaster;
  camera: THREE.PerspectiveCamera | null;
  registerObject: (id: string, ref: MutableRefObject<THREE.Group | null>) => void;
  unregisterObject: (id: string) => void;
  checkOverlap: (position: THREE.Vector3) => boolean;
}

// Create the context with a default value
const AppContext = createContext<AppContextType>({
  raycaster: new THREE.Raycaster(),
  camera: null,
  registerObject: () => {},
  unregisterObject: () => {},
  checkOverlap: () => false,
});

// Define the props for the AppProvider component
interface AppProviderProps {
  children: ReactNode;
}

// Define the object entry stored in the provider
interface ObjectEntry {
  ref: MutableRefObject<THREE.Group | null>;
  position: THREE.Vector3;
}

// Create the AppProvider component
export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const raycaster = useRef(new THREE.Raycaster());
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const objectRefs = useRef<Map<string, ObjectEntry>>(new Map());
  
  // Update camera reference when it becomes available
  const updateCamera = (newCamera: THREE.PerspectiveCamera) => {
    if (newCamera && !camera) {
      setCamera(newCamera);
    }
  };
  
  // Register an object with the context
  const registerObject = (id: string, ref: MutableRefObject<THREE.Group | null>) => {
    if (ref.current) {
      const position = new THREE.Vector3();
      ref.current.getWorldPosition(position);
      
      objectRefs.current.set(id, { 
        ref, 
        position 
      });
      
      console.log(`Registered object ${id}`);
    }
  };
  
  // Unregister an object from the context
  const unregisterObject = (id: string) => {
    if (objectRefs.current.has(id)) {
      objectRefs.current.delete(id);
      console.log(`Unregistered object ${id}`);
    }
  };
  
  // Check if a position overlaps with any registered object
  const checkOverlap = (position: THREE.Vector3): boolean => {
    const OVERLAP_THRESHOLD = 1.5; // Distance in units to consider an overlap
    
    for (const [id, entry] of objectRefs.current.entries()) {
      if (entry.ref.current) {
        const objectPosition = new THREE.Vector3();
        entry.ref.current.getWorldPosition(objectPosition);
        
        // Skip comparison with self (position is the same object)
        if (position.equals(objectPosition)) {
          continue;
        }
        
        // Check distance between objects
        const distance = position.distanceTo(objectPosition);
        if (distance < OVERLAP_THRESHOLD) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  // Context value
  const contextValue: AppContextType = {
    raycaster: raycaster.current,
    camera,
    registerObject,
    unregisterObject,
    checkOverlap,
  };
  
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Create the custom hook to use the context
export const useAppContext = () => {
  return useContext(AppContext);
}; 