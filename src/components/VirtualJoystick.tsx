import { useState, useEffect, useRef } from 'react';
import useMobileDetection from '../hooks/useMobileDetection';

interface JoystickProps {
  position: 'left' | 'right';
  onMove: (x: number, y: number) => void;
  color?: string;
  size?: number;
}

const VirtualJoystick: React.FC<JoystickProps> = ({ 
  position, 
  onMove, 
  color = 'rgba(77, 255, 170, 0.8)',
  size = 100 
}) => {
  const { isMobile, isTouchDevice } = useMobileDetection();
  const [active, setActive] = useState(false);
  const [value, setValue] = useState({ x: 0, y: 0 });
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMobile || !isTouchDevice) return;
    
    const updateCenter = () => {
      if (joystickRef.current) {
        const rect = joystickRef.current.getBoundingClientRect();
        setCenter({ 
          x: rect.left + rect.width / 2, 
          y: rect.top + rect.height / 2 
        });
      }
    };
    
    updateCenter();
    window.addEventListener('resize', updateCenter);
    window.addEventListener('orientationchange', updateCenter);
    
    return () => {
      window.removeEventListener('resize', updateCenter);
      window.removeEventListener('orientationchange', updateCenter);
    };
  }, [isMobile, isTouchDevice]);

  const handleStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setActive(true);
    handleMove(e);
  };

  const handleMove = (e: React.TouchEvent) => {
    if (!active) return;
    
    const touch = Array.from(e.touches).find(t => {
      const touchX = t.clientX;
      const touchY = t.clientY;
      const joystickRect = joystickRef.current?.getBoundingClientRect();
      
      if (!joystickRect) return false;
      
      const inRange = Math.sqrt(
        Math.pow(touchX - center.x, 2) + 
        Math.pow(touchY - center.y, 2)
      ) < size * 1.5; // Slightly larger activation area
      
      return inRange;
    });
    
    if (!touch) return;
    
    // Calculate position relative to center
    const deltaX = touch.clientX - center.x;
    const deltaY = touch.clientY - center.y;
    
    // Calculate distance from center
    const distance = Math.min(size / 2, Math.sqrt(deltaX * deltaX + deltaY * deltaY));
    
    // Calculate angle
    const angle = Math.atan2(deltaY, deltaX);
    
    // Calculate normalized x, y values (-1 to 1)
    const normX = Math.cos(angle) * (distance / (size / 2));
    const normY = Math.sin(angle) * (distance / (size / 2));
    
    setValue({ x: normX, y: normY });
    onMove(normX, normY);
    
    // Update knob position visually
    if (knobRef.current) {
      const knobX = Math.cos(angle) * distance;
      const knobY = Math.sin(angle) * distance;
      knobRef.current.style.transform = `translate(${knobX}px, ${knobY}px)`;
    }
  };

  const handleEnd = () => {
    setActive(false);
    setValue({ x: 0, y: 0 });
    onMove(0, 0);
    
    // Reset knob position
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(0, 0)';
    }
  };

  if (!isMobile || !isTouchDevice) return null;

  return (
    <div
      ref={joystickRef}
      style={{
        position: 'fixed',
        bottom: '50px',
        [position === 'left' ? 'left' : 'right']: '50px',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: `${color.replace(')', ', 0.2)')}`,
        border: `2px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        touchAction: 'none',
      }}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
    >
      <div
        ref={knobRef}
        style={{
          width: `${size * 0.4}px`,
          height: `${size * 0.4}px`,
          borderRadius: '50%',
          backgroundColor: color,
          transition: active ? 'none' : 'transform 0.2s ease-out',
        }}
      />
    </div>
  );
};

export default VirtualJoystick; 