import React from 'react';
import { useWorld } from '../context/WorldContext';
import useMobileDetection from '../hooks/useMobileDetection';

const desktopHintStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '8px 15px',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  color: '#ffffff',
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: '500',
  zIndex: 1000,
  pointerEvents: 'none', // Non-interactive
  backdropFilter: 'blur(3px)',
  WebkitBackdropFilter: 'blur(3px)',
};

const DesktopBackHint: React.FC = () => {
  const { currentWorld } = useWorld();
  const { isTouchDevice } = useMobileDetection();

  // Only show on desktop, when in a subworld (not mainWorld)
  if (isTouchDevice || !currentWorld || currentWorld.id === 'mainWorld') {
    return null;
  }

  return (
    <div style={desktopHintStyle}>
      Press <kbd style={{ backgroundColor: '#555', padding: '2px 5px', borderRadius: '3px', border: '1px solid #777'}}>B</kbd> to go back
    </div>
  );
};

export default DesktopBackHint; 