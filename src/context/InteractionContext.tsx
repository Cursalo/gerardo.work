import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import * as THREE from 'three';
import { useWorld } from './WorldContext'; // Import useWorld to navigate
import { openFileWithViewer, isExternalUrl, createProjectSlug } from '../utils/fileUtils'; // Import file utilities
import { projectDataService } from '../services/projectDataService'; // Import project data service

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

    try {
      console.log('[InteractionContext] triggerInteraction called for:', hoveredObject.name, hoveredObject.userData);
      const data = hoveredObject.userData;

      // Logic moved from InteractionButton/useEffect
      if (data.projectId !== undefined) {
        console.log(`[InteractionContext] Navigating to project ${data.projectId} via URL`);
        
        // UPDATED: Look up project name and use slug with existing working route
        projectDataService.getProjectById(data.projectId).then(project => {
          if (project) {
            const projectSlug = createProjectSlug(project.name);
            console.log(`[InteractionContext] Found project: ${project.name} (${projectSlug})`);
            window.location.href = `/project/${projectSlug}`;
          } else {
            console.warn(`[InteractionContext] Project ${data.projectId} not found, falling back to ID-based URL`);
            window.location.href = `/project/${data.projectId}`;
          }
        }).catch(error => {
          console.error(`[InteractionContext] Error looking up project ${data.projectId}:`, error);
          window.location.href = `/project/${data.projectId}`;
        });
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
        
        // CRITICAL FIX: Use file utilities for proper MIME type handling
        if (isExternalUrl(data.url) || data.action === 'externalLink' || data.url.includes('soundcloud.com')) {
          console.log(`[InteractionContext] Opening external link: ${data.url}`);
          window.open(data.url, '_blank', 'noopener,noreferrer');
          // Call the object's onClick handler if available (for additional functionality)
          if (typeof data.onClick === 'function') {
            data.onClick();
          }
        } else {
          // Local file - use file utilities for proper MIME type handling
          console.log(`[InteractionContext] Opening local file with proper viewer: ${data.url}`);
          openFileWithViewer(data.url, data.title || 'File');
        }
      } else if (data.objectType === 'video' || data.objectType === 'image' || data.objectType === 'pdf' || data.objectType === 'html' || 
                data.type === 'video' || data.type === 'image' || data.type === 'pdf' || data.type === 'html') {
        // Support both objectType and type properties for media objects
        const mediaType = data.objectType || data.type;
        console.log(`[InteractionContext] Triggering view for ${mediaType}`);
        
        // CRITICAL FIX: Handle images differently to prevent binary data issues
        if ((mediaType === 'image') && data.url) {
          console.log(`[InteractionContext] Opening image directly: ${data.url}`);
          window.open(data.url, '_blank', 'noopener,noreferrer');
        } else if (data.url) {
          console.log(`[InteractionContext] Opening ${mediaType} with proper viewer: ${data.url}`);
          openFileWithViewer(data.url, data.title || `${mediaType} file`);
        } else if (typeof data.onClick === 'function') {
          console.log('[InteractionContext] Calling onClick from userData (fallback)');
          data.onClick();
        } else {
          console.warn('[InteractionContext] No URL or onClick handler available for media view.');
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
    } catch (error) {
      console.error('[InteractionContext] Error in triggerInteraction:', error);
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