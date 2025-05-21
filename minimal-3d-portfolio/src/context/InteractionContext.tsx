import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import * as THREE from 'three';
import { useWorld } from './WorldContext'; // Import useWorld to navigate

// Extend userData to include necessary info for the button
export interface InteractionData {
  interactive?: boolean;
  onClick?: () => void; // Keep original onClick if needed elsewhere
  type?: string; // e.g., 'project', 'link', 'video', 'button'
  projectId?: number;
  url?: string;
  action?: string; // e.g., 'navigate'
  subWorldId?: string;
  destination?: string; // e.g., 'hub'
  title?: string; // For button text fallback
}

export type HoveredObject = (THREE.Object3D & { userData: InteractionData }) | null;

interface InteractionState {
  hoveredObject: HoveredObject;
  setHoveredObject: React.Dispatch<React.SetStateAction<HoveredObject>>;
  triggerInteraction: () => void; // Function to execute action
}

const InteractionContext = createContext<InteractionState | undefined>(undefined);

export const InteractionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hoveredObject, setHoveredObject] = useState<HoveredObject>(null);
  const { setCurrentWorldId } = useWorld(); // Get navigation function

  // Function to trigger the action based on the current hovered object
  const triggerInteraction = useCallback(() => {
    // --- Log entry point and current state --- 
    console.log(`[InteractionContext] triggerInteraction ENTERED. Current hoveredObject:`, 
      hoveredObject ? { name: hoveredObject.name, userData: hoveredObject.userData } : null
    );
    // --- End Log --- 

    if (!hoveredObject) {
      console.warn('[InteractionContext] triggerInteraction called with no hoveredObject.');
      return;
    }

    console.log('[InteractionContext] triggerInteraction called for:', hoveredObject.name, hoveredObject.userData);
    const data = hoveredObject.userData;

    // Logic moved from InteractionButton/useEffect
    if (data.projectId !== undefined) {
      const subWorldId = `project-world-${data.projectId}`;
      console.log(`[InteractionContext] Navigating to project ${data.projectId} -> ${subWorldId}`);
      setCurrentWorldId(subWorldId);
    } else if (data.type === 'button' && data.action === 'navigate') {
      const { destination, subWorldId } = data;
      if (destination === 'hub' || destination === 'mainWorld') {
        console.log("[InteractionContext] Navigating to mainWorld");
        setCurrentWorldId('mainWorld');
      } else if (subWorldId) {
        console.log(`[InteractionContext] Navigating to subWorld: ${subWorldId}`);
        setCurrentWorldId(subWorldId);
      }
    } else if (data.type === 'link' && data.subWorldId) {
      console.log(`[InteractionContext] Navigating to subWorld: ${data.subWorldId}`);
      setCurrentWorldId(data.subWorldId);
    } else if (data.type === 'link' && data.url) {
      console.log(`[InteractionContext] Opening URL ${data.url}`);
      // Handle special actions if defined along with URL
      if (data.action === 'externalLink' || data.url.includes('soundcloud.com')) {
        console.log(`[InteractionContext] Opening external link: ${data.url}`);
        window.open(data.url, '_blank', 'noopener,noreferrer');
        // Call the object's onClick handler if available (for additional functionality)
        if (typeof data.onClick === 'function') {
          data.onClick();
        }
      } else {
        // Standard URL opening
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
    } else if (data.type === 'video' || data.type === 'image' || data.type === 'pdf') {
      console.log(`[InteractionContext] Triggering view for ${data.type}`);
      // Here you might want to call a function to open a modal or similar
      // For now, just logging. If the original card click works, maybe it calls a function stored elsewhere?
      // Consider if the original data.onClick should be called if available:
      if (typeof data.onClick === 'function') {
         console.log('[InteractionContext] Calling onClick from userData');
         data.onClick();
      } else {
         console.warn('[InteractionContext] No specific action defined for media view besides logging/userData.onClick.');
      }
    } else {
      console.log("[InteractionContext] Generic interaction triggered");
      // Fallback: Check for and call original onClick? 
      if (typeof data.onClick === 'function') {
          console.log('[InteractionContext] Calling onClick from userData (fallback)');
          data.onClick();
      } else {
         console.warn('[InteractionContext] No specific action defined for fallback besides logging/userData.onClick.');
      }
    }
  }, [hoveredObject, setCurrentWorldId]);

  const value = {
    hoveredObject,
    setHoveredObject,
    triggerInteraction, // Provide the trigger function
  };

  return (
    <InteractionContext.Provider value={value}>
      {children}
    </InteractionContext.Provider>
  );
};

export const useInteraction = (): InteractionState => {
  const context = useContext(InteractionContext);
  if (context === undefined) {
    throw new Error('useInteraction must be used within an InteractionProvider');
  }
  return context;
}; 