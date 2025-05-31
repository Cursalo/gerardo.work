import React, { createContext, useState, useContext, ReactNode } from 'react';
import * as THREE from 'three';

interface MobileControlsState {
  moveVector: THREE.Vector2; // Represents joystick X/Y for movement
  lookVector: THREE.Vector2; // Represents joystick X/Y for looking
  setMoveVector: (vector: THREE.Vector2) => void;
  setLookVector: (vector: THREE.Vector2) => void;
}

const MobileControlsContext = createContext<MobileControlsState | undefined>(undefined);

export const MobileControlsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [moveVector, setMoveVector] = useState(new THREE.Vector2(0, 0));
  const [lookVector, setLookVector] = useState(new THREE.Vector2(0, 0));

  const value = {
    moveVector,
    lookVector,
    setMoveVector,
    setLookVector,
  };

  return (
    <MobileControlsContext.Provider value={value}>
      {children}
    </MobileControlsContext.Provider>
  );
};

export const useMobileControls = (): MobileControlsState => {
  const context = useContext(MobileControlsContext);
  if (context === undefined) {
    throw new Error('useMobileControls must be used within a MobileControlsProvider');
  }
  return context;
}; 