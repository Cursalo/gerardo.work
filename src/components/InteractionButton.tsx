import React, { useCallback, useEffect, useState } from 'react';
import { useInteraction } from '../context/InteractionContext';
import { useChat } from '../context/ChatContext';
import useMobileDetection from '../hooks/useMobileDetection';

const buttonStyle: React.CSSProperties = {
  position: 'fixed',
  top: '55%', // Position below center, adjust as needed
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 999998, // MAXIMUM z-index to always stay above 3D content
  padding: '12px 20px',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  color: '#ffffff',
  border: '2px solid rgba(255, 255, 255, 0.7)',
  borderRadius: '24px',
  fontSize: '15px',
  fontWeight: '600',
  cursor: 'pointer',
  backdropFilter: 'blur(5px)',
  WebkitBackdropFilter: 'blur(5px)',
  boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
  transition: 'opacity 0.05s ease-out, transform 0.05s ease-out', // Ultra-fast transition for immediate response
  whiteSpace: 'nowrap',
  opacity: 0, // Hidden by default, fade in
  pointerEvents: 'none', // Non-interactive by default
  WebkitTapHighlightColor: 'transparent', // Remove iOS tap highlight
  touchAction: 'manipulation', // Optimize for touch
  userSelect: 'none', // Prevent text selection
  outline: 'none' // Remove outline
};

const mobileButtonStyle: React.CSSProperties = {
  padding: '14px 24px',
  fontSize: '16px',
  top: '65%', // Position lower on mobile for better visibility
  zIndex: 999999, // MAXIMUM z-index to always stay above 3D content
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  border: '2px solid rgba(77, 255, 170, 0.8)',
  boxShadow: '0 0 12px rgba(77, 255, 170, 0.4)',
};

const desktopCueStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  color: '#ffffff',
  padding: '6px 12px',
  borderRadius: '8px',
  fontSize: '14px',
  zIndex: 1001,
  opacity: 0,
  transition: 'opacity 0.3s ease',
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
};

const activeStyle: React.CSSProperties = {
  opacity: 1,
  pointerEvents: 'auto',
  // Force the button to always be on top of everything
  position: 'fixed',
  zIndex: 999999,
  isolation: 'isolate', // Create new stacking context
};

const InteractionButton: React.FC = () => {
  const { hoveredObject, triggerInteraction } = useInteraction();
  const { openChat, isNearNPC } = useChat();
  const { isTouchDevice, isMobile } = useMobileDetection();
  const [showDesktopCue, setShowDesktopCue] = useState(false);

  // Determine visibility based on hover state and device type
  const isVisible = isTouchDevice && hoveredObject !== null;
  
  // Apply device-specific styles
  const baseStyle = isMobile ? { ...buttonStyle, ...mobileButtonStyle } : buttonStyle;
  const currentStyle = isVisible ? { ...baseStyle, ...activeStyle } : baseStyle;

  // Set button text - always "Interact" for media cards, specific text for NPCs/special objects
  let buttonText = "Interact";
  
  if (hoveredObject?.userData) {
    const userData = hoveredObject.userData;
    
    if (userData.type === 'npc') {
      buttonText = "Chat with Technoclaw";
    } else if (userData.type === 'link' && userData.url && userData.url.includes('soundcloud.com')) {
      buttonText = "Listen on SoundCloud";
    } else {
      // For all media cards and other objects, just show "Interact"
      buttonText = "Interact";
    }
  }

  // Handle desktop visual cue for hover state
  useEffect(() => {
    if (!isTouchDevice && hoveredObject !== null) {
      setShowDesktopCue(true);
    } else {
      setShowDesktopCue(false);
    }
  }, [hoveredObject, isTouchDevice]);

  // Handler for pointer down: visual feedback
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Prevent default actions like text selection which might interfere
    e.preventDefault(); 
    const button = e.currentTarget as HTMLButtonElement;
    button.style.transform = 'translateX(-50%) scale(0.95)';
  }, []);

  // Handler for pointer up: trigger interaction and reset feedback
  const handlePointerUp = useCallback(() => {
    const button = document.getElementById('interaction-button') as HTMLButtonElement;
    if (button) {
        button.style.transform = 'translateX(-50%) scale(1)';
    }
    
    // Priority 1: If the hovered object is specifically an NPC
    if (hoveredObject?.userData?.type === 'npc') {
      // Only open chat if player is close enough to the NPC
      if (isNearNPC) {
        openChat();
      } else {
        // Show notification that player is too far
        if (typeof window !== 'undefined') {
          const notification = document.createElement('div');
          notification.textContent = `Get closer to talk to Technoclaw`;
          notification.style.position = 'fixed';
          notification.style.bottom = '20px';
          notification.style.left = '50%';
          notification.style.transform = 'translateX(-50%)';
          notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
          notification.style.color = 'white';
          notification.style.padding = '10px 20px';
          notification.style.borderRadius = '4px';
          notification.style.zIndex = '1000';
          document.body.appendChild(notification);
          
          setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s ease-in-out';
            setTimeout(() => {
              document.body.removeChild(notification);
            }, 500);
          }, 2000);
        }
      }
      return; // Explicitly stop further processing for NPC chat
    }
    
    // Priority 2: Handle other interactive objects (that are not NPCs)
    if (hoveredObject && hoveredObject.userData?.interactive) {
      const { userData } = hoveredObject; // userData of a non-NPC object
      
      if (userData.action === 'chat') {
        openChat();
      } else {
        triggerInteraction();
      }
      return; // Stop further processing if a non-NPC interactive object was handled
    }
  }, [hoveredObject, triggerInteraction, openChat, isNearNPC]);

  // Handler for pointer leave/cancel: only reset feedback
  const handlePointerLeaveOrCancel = useCallback((e: React.PointerEvent) => {
    const button = e.currentTarget as HTMLButtonElement;
    button.style.transform = 'translateX(-50%) scale(1)';
  }, []);

  // Prevent default touch behavior like double-tap zoom if it interferes
  const preventDefaultTouch = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
  }, []);

  return (
    <>
      <button
        id="interaction-button"
        role="button"
        aria-label={buttonText}
        style={currentStyle}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeaveOrCancel}
        onPointerCancel={handlePointerLeaveOrCancel}
        onTouchStart={preventDefaultTouch} 
      >
        {buttonText}
      </button>
    </>
  );
};

export default InteractionButton;