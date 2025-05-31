import React, { useState, useEffect } from 'react';
import useMobileDetection from '../hooks/useMobileDetection';

interface CrosshairState {
  isHovering: boolean;
  isClicking: boolean;
}

interface CrosshairProps {
  isPointerLocked?: boolean;
}

/**
 * Crosshair Component
 * 
 * A single, unified crosshair that remains perfectly centered on the viewport.
 * Enhanced for better visibility and interaction feedback.
 */
const Crosshair: React.FC<CrosshairProps> = ({ isPointerLocked = false }) => {
  const { isMobile } = useMobileDetection();
  
  // State to track if crosshair is over an interactive object
  const [state, setState] = useState<CrosshairState>({
    isHovering: false,
    isClicking: false
  });

  // Listen for custom events from the interaction system
  useEffect(() => {
    // Handle hover state changes
    const handleHoverStart = () => setState(prev => ({ ...prev, isHovering: true }));
    const handleHoverEnd = () => setState(prev => ({ ...prev, isHovering: false }));
    // Handle click feedback
    const handleClick = () => {
      setState(prev => ({ ...prev, isClicking: true }));
      // Reset clicking state after animation
      setTimeout(() => {
        setState(prev => ({ ...prev, isClicking: false }));
      }, 300);
    };

    // Add event listeners for crosshair state updates
    document.addEventListener('crosshair:hover:start', handleHoverStart);
    document.addEventListener('crosshair:hover:end', handleHoverEnd);
    document.addEventListener('crosshair:click', handleClick);

    return () => {
      // Clean up event listeners
      document.removeEventListener('crosshair:hover:start', handleHoverStart);
      document.removeEventListener('crosshair:hover:end', handleHoverEnd);
      document.removeEventListener('crosshair:click', handleClick);
    };
  }, []);

  // Base styles - dynamic sizing based on device type
  const baseSize = isMobile ? 20 : 12; 
  const lineLength = isMobile ? 30 : 20;
  const lineThickness = isMobile ? 2 : 1;
  
  // Base crosshair styles - updated with custom color and enhanced visibility
  const baseStyles: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: `${baseSize}px`,
    height: `${baseSize}px`,
    backgroundColor: 'rgba(77, 255, 170, 0.9)', // Custom light green color
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    zIndex: 9999, // Increased z-index to ensure visibility
    transition: 'all 0.15s ease-out',
    boxShadow: '0 0 4px rgba(0, 0, 0, 0.5)', // Add shadow for better visibility
    display: 'block', // Always show crosshair
    opacity: 1, // Ensure full opacity
    mixBlendMode: 'normal' as const, // Prevent blend mode issues
  };

  // Additional styles when hovering over interactive elements
  const hoverStyles: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Change to white when hovering
    boxShadow: '0 0 8px rgba(77, 255, 170, 0.8)', // Glow effect when hovering
    width: `${baseSize * 1.2}px`,
    height: `${baseSize * 1.2}px`,
    transform: 'translate(-50%, -50%) scale(1.1)', // Slight scale effect
  };
  
  // Click animation styles
  const clickStyles: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 77, 0.9)', // Yellow flash on click
    boxShadow: '0 0 12px rgba(255, 255, 77, 0.8)', // Bright glow on click
    width: `${baseSize * 1.4}px`,
    height: `${baseSize * 1.4}px`,
    transform: 'translate(-50%, -50%) scale(1.3)', // Larger scale on click
  };

  // Combine styles based on state
  const styles = {
    ...baseStyles,
    ...(state.isHovering ? hoverStyles : {}),
    ...(state.isClicking ? clickStyles : {}),
  };

  // Add small cross lines for better visibility
  return (
    <>
      {/* Main centered dot */}
      <div 
        id="unified-crosshair"
        style={styles}
        aria-hidden="true"
        data-testid="central-crosshair"
      />
      
      {/* Cross lines for better precision and visibility */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: `${lineLength}px`,
        height: `${lineThickness}px`,
        backgroundColor: state.isHovering 
          ? 'rgba(255, 255, 255, 0.8)' 
          : 'rgba(77, 255, 170, 0.8)',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9998, // Just below the dot
        display: 'block',
        opacity: state.isClicking ? 0.9 : 0.8,
        transition: 'all 0.15s ease-out',
      }} />
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: `${lineThickness}px`,
        height: `${lineLength}px`,
        backgroundColor: state.isHovering 
          ? 'rgba(255, 255, 255, 0.8)' 
          : 'rgba(77, 255, 170, 0.8)',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9998, // Just below the dot
        display: 'block',
        opacity: state.isClicking ? 0.9 : 0.8,
        transition: 'all 0.15s ease-out',
      }} />
    </>
  );
};

export default Crosshair; 