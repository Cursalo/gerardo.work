import React from 'react';
import { useWorld } from '../context/WorldContext';
import useMobileDetection from '../hooks/useMobileDetection';

const buttonStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '100px', // Above the joystick controls
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1010, // Same as interaction button
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
  transition: 'all 0.15s ease',
  WebkitTapHighlightColor: 'transparent', // Remove tap highlight on iOS
  touchAction: 'manipulation', // Optimize for touch
  userSelect: 'none', // Prevent text selection
  outline: 'none' // Remove outline
};

const BackButton: React.FC = () => {
  const { currentWorld, setCurrentWorldId } = useWorld();
  const { isTouchDevice } = useMobileDetection();

  // Don't render if not on touch device, or if loading, or if already in main world
  if (!isTouchDevice || !currentWorld || currentWorld.id === 'mainWorld') {
    return null;
  }

  // Navigate back to main world
  const navigateToMainWorld = () => {
    console.log("BackButton: Navigating back to mainWorld");
    setCurrentWorldId('mainWorld');
  };

  // Handle all interaction events
  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`[BackButton] Executing action via ${e.type}`);
    
    // Execute the navigation
    navigateToMainWorld();
    
    // Provide visual feedback
    const button = e.currentTarget as HTMLButtonElement;
    button.style.transform = 'translateX(-50%) scale(0.95)';
    
    // Reset visual feedback after brief delay
    setTimeout(() => {
      if (button) button.style.transform = 'translateX(-50%) scale(1)';
    }, 150);
  };

  return (
    <button 
      id="back-button"
      role="button"
      aria-label="Back to Hub"
      style={buttonStyle}
      // Handle mouse events 
      onClick={handleInteraction}
      // Handle touch events - use all possible handlers for maximum compatibility
      onTouchStart={(e) => e.currentTarget.style.transform = 'translateX(-50%) scale(0.95)'}
      onTouchEnd={handleInteraction}
      // Clean up visual state
      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(-50%) scale(1)'}
      onTouchCancel={(e) => e.currentTarget.style.transform = 'translateX(-50%) scale(1)'}
    >
      ← Back to Hub
    </button>
  );
};

export default BackButton; 