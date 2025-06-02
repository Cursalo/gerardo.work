import React from 'react';
import { useGamepad } from '../hooks/useGamepad';

const GamepadIndicator: React.FC = () => {
  const { gamepad, isConnected } = useGamepad();

  if (!isConnected) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'monospace',
      zIndex: 1000,
      border: '2px solid #00ff00',
      boxShadow: '0 4px 12px rgba(0, 255, 0, 0.3)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div style={{
          width: '8px',
          height: '8px',
          backgroundColor: '#00ff00',
          borderRadius: '50%',
          animation: 'pulse 2s infinite',
        }} />
        <span style={{ fontWeight: 'bold' }}>🎮 Controller Connected</span>
      </div>
      
      <div style={{ fontSize: '12px', opacity: 0.9 }}>
        <div>🕹️ Left Stick: Move</div>
        <div>🕹️ Right Stick: Look</div>
        <div>🅰️ A Button: Interact</div>
        <div>🅱️ B Button: Back/Exit</div>
        <div>🎯 LT/RT: Speed Control</div>
      </div>
      
      {/* Debug info (only show if sticks are being used) */}
      {(Math.abs(gamepad.leftStick.x) > 0.1 || Math.abs(gamepad.leftStick.y) > 0.1 || 
        Math.abs(gamepad.rightStick.x) > 0.1 || Math.abs(gamepad.rightStick.y) > 0.1) && (
        <div style={{ 
          fontSize: '10px', 
          marginTop: '8px', 
          padding: '4px', 
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px'
        }}>
          <div>L: {gamepad.leftStick.x.toFixed(2)}, {gamepad.leftStick.y.toFixed(2)}</div>
          <div>R: {gamepad.rightStick.x.toFixed(2)}, {gamepad.rightStick.y.toFixed(2)}</div>
        </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default GamepadIndicator; 