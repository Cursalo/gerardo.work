import React, { useState, useEffect } from 'react';
import useMobileDetection from '../hooks/useMobileDetection';

interface CrosshairState {
  isHovering: boolean;
  isClicking: boolean;
}

interface CrosshairProps {
  isPointerLocked?: boolean;
  showCrossLines?: boolean;
}

/**
 * Crosshair Component
 * 
 * A single, unified crosshair that remains perfectly centered on the viewport.
 * Enhanced for better visibility and interaction feedback with precise alignment.
 */
const Crosshair: React.FC<CrosshairProps> = ({ isPointerLocked = false, showCrossLines = false }) => {
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

  // Base styles - dynamic sizing based on device type with precise positioning
  const baseSize = isMobile ? 20 : 12; 
  
  // PRECISE CENTERING: Use viewport units and calc() for perfect alignment
  const baseStyles: React.CSSProperties = {
    position: 'fixed', // Use fixed instead of absolute for viewport alignment
    top: '50vh', // Use viewport height for precise centering
    left: '50vw', // Use viewport width for precise centering
    width: `${baseSize}px`,
    height: `${baseSize}px`,
    backgroundColor: 'rgba(77, 255, 170, 1.0)', // FULL OPACITY - NEVER FADE
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)', // Center the element on the exact point
    pointerEvents: 'none',
    zIndex: 99999, // MAXIMUM Z-INDEX to ensure visibility over everything
    transition: 'all 0.15s ease-out',
    boxShadow: '0 0 8px rgba(0, 0, 0, 0.8)', // Stronger shadow for better visibility
    display: 'block', // FORCE DISPLAY
    opacity: 1, // FORCE OPACITY
    visibility: 'visible', // FORCE VISIBILITY
    mixBlendMode: 'normal' as const,
    // Additional precision fixes
    margin: 0,
    padding: 0,
    border: 'none',
    outline: 'none',
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

  // Main crosshair dot - always visible and perfectly centered
  return (
    <div 
      id="unified-crosshair"
      style={styles}
      aria-hidden="true"
      data-testid="central-crosshair"
    />
  );
};

export default Crosshair; 