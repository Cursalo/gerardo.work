import { useEffect, useRef, useState, useCallback } from 'react';

export interface GamepadState {
  connected: boolean;
  leftStick: { x: number; y: number };
  rightStick: { x: number; y: number };
  buttons: {
    A: boolean;
    B: boolean;
    X: boolean;
    Y: boolean;
    LB: boolean;
    RB: boolean;
    LT: number; // Trigger values 0-1
    RT: number;
    back: boolean;
    start: boolean;
    leftStickButton: boolean;
    rightStickButton: boolean;
    dpadUp: boolean;
    dpadDown: boolean;
    dpadLeft: boolean;
    dpadRight: boolean;
  };
  triggers: {
    left: number;
    right: number;
  };
}

const DEADZONE = 0.30; // Aggressively increased deadzone for analog sticks
const TRIGGER_DEADZONE = 0.1; // Deadzone for triggers

// Xbox controller button mapping
const BUTTON_MAP = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  back: 8,
  start: 9,
  leftStickButton: 10,
  rightStickButton: 11,
  dpadUp: 12,
  dpadDown: 13,
  dpadLeft: 14,
  dpadRight: 15
};

// Apply deadzone to analog stick values
const applyDeadzone = (value: number, deadzone: number = DEADZONE): number => {
  if (Math.abs(value) < deadzone) return 0;
  
  // Scale the value to account for deadzone
  const sign = Math.sign(value);
  const scaledValue = (Math.abs(value) - deadzone) / (1 - deadzone);
  return sign * Math.min(scaledValue, 1);
};

// Smooth analog stick input with easing
const smoothInput = (currentX: number, currentY: number, targetX: number, targetY: number, smoothing: number = 0.8): { x: number; y: number } => {
  // Apply smoothing to both X and Y values
  const x = currentX + (targetX - currentX) * (1 - smoothing);
  const y = currentY + (targetY - currentY) * (1 - smoothing);
  
  // Aggressive drift elimination
  const driftThreshold = 0.005;
  return {
    x: Math.abs(x) < driftThreshold ? 0 : x,
    y: Math.abs(y) < driftThreshold ? 0 : y
  };
};

// Helper function to safely check button press state
const getButtonPressed = (gamepad: Gamepad, buttonIndex: number): boolean => {
  if (!gamepad || !gamepad.buttons || buttonIndex >= gamepad.buttons.length) {
    return false;
  }
  
  const button = gamepad.buttons[buttonIndex];
  if (!button) return false;
  
  // Different browsers implement buttons differently
  if (typeof button === 'object') {
    // Lower threshold (0.3) for button detection to improve reliability
    return button.pressed || button.value > 0.3;
  }
  
  // For number value implementations
  return button === 1.0 || (typeof button === 'number' && button > 0.3);
};

export const useGamepad = () => {
  const [gamepadState, setGamepadState] = useState<GamepadState>({
    connected: false,
    leftStick: { x: 0, y: 0 },
    rightStick: { x: 0, y: 0 },
    buttons: {
      A: false,
      B: false,
      X: false,
      Y: false,
      LB: false,
      RB: false,
      LT: 0,
      RT: 0,
      back: false,
      start: false,
      leftStickButton: false,
      rightStickButton: false,
      dpadUp: false,
      dpadDown: false,
      dpadLeft: false,
      dpadRight: false,
    },
    triggers: {
      left: 0,
      right: 0,
    },
  });

  const animationFrameRef = useRef<number | null>(null);
  const smoothedLeftStick = useRef({ x: 0, y: 0 });
  const smoothedRightStick = useRef({ x: 0, y: 0 });

  // Update gamepad state
  const updateGamepadState = useCallback(() => {
    // Check if gamepad API is available
    if (!navigator.getGamepads) {
      return;
    }

    // Get all connected gamepads
    const gamepads = navigator.getGamepads();
    
    // Find first connected gamepad
    let activeGamepad: Gamepad | null = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        activeGamepad = gamepads[i];
        break;
      }
    }

    // If no gamepad found, set disconnected state
    if (!activeGamepad) {
      if (gamepadState.connected) {
        setGamepadState({
          ...gamepadState,
          connected: false
        });
      }
      return;
    }

    const gamepad = activeGamepad;
    
    // Handle left stick input
    const rawLeftX = gamepad.axes[0];
    const rawLeftY = gamepad.axes[1];
    const leftX = applyDeadzone(rawLeftX);
    const leftY = applyDeadzone(rawLeftY);
    
    // Handle right stick input
    const rawRightX = gamepad.axes[2] || 0;
    const rawRightY = gamepad.axes[3] || 0;
    const rightX = applyDeadzone(rawRightX);
    const rightY = applyDeadzone(rawRightY);
    
    // Smooth stick input to reduce jitter
    smoothedLeftStick.current = smoothInput(
      smoothedLeftStick.current.x,
      smoothedLeftStick.current.y,
      leftX,
      leftY
    );
    
    smoothedRightStick.current = smoothInput(
      smoothedRightStick.current.x,
      smoothedRightStick.current.y,
      rightX,
      rightY
    );
    
    // Get trigger values
    let leftTrigger = 0;
    let rightTrigger = 0;
    
    // Try to get trigger values from axes first (more accurate)
    if (gamepad.axes.length > 4) {
      leftTrigger = Math.max(0, (gamepad.axes[4] + 1) / 2); // Convert from -1,1 to 0,1
      rightTrigger = Math.max(0, (gamepad.axes[5] + 1) / 2);
    } else {
      // Fallback to button values
      leftTrigger = gamepad.buttons[BUTTON_MAP.LT]?.value || 0;
      rightTrigger = gamepad.buttons[BUTTON_MAP.RT]?.value || 0;
    }
    
    // Apply trigger deadzone
    leftTrigger = leftTrigger > TRIGGER_DEADZONE ? leftTrigger : 0;
    rightTrigger = rightTrigger > TRIGGER_DEADZONE ? rightTrigger : 0;
    
    // Enhanced button detection with debug logging for A button
    const aButtonPressed = getButtonPressed(gamepad, BUTTON_MAP.A);
    if (aButtonPressed) {
      // Only log when it changes to avoid console spam
      if (!gamepadState.buttons.A) {
        console.log('🎮 Gamepad: A button detected', {
          raw: gamepad.buttons[BUTTON_MAP.A],
          processed: aButtonPressed,
          index: BUTTON_MAP.A
        });
      }
    }
    
    const newState: GamepadState = {
      connected: true,
      leftStick: {
        x: smoothedLeftStick.current.x,
        y: smoothedLeftStick.current.y,
      },
      rightStick: {
        x: smoothedRightStick.current.x,
        y: smoothedRightStick.current.y,
      },
      buttons: {
        A: aButtonPressed,
        B: getButtonPressed(gamepad, BUTTON_MAP.B),
        X: getButtonPressed(gamepad, BUTTON_MAP.X),
        Y: getButtonPressed(gamepad, BUTTON_MAP.Y),
        LB: getButtonPressed(gamepad, BUTTON_MAP.LB),
        RB: getButtonPressed(gamepad, BUTTON_MAP.RB),
        LT: leftTrigger,
        RT: rightTrigger,
        back: getButtonPressed(gamepad, BUTTON_MAP.back),
        start: getButtonPressed(gamepad, BUTTON_MAP.start),
        leftStickButton: getButtonPressed(gamepad, BUTTON_MAP.leftStickButton),
        rightStickButton: getButtonPressed(gamepad, BUTTON_MAP.rightStickButton),
        dpadUp: getButtonPressed(gamepad, BUTTON_MAP.dpadUp),
        dpadDown: getButtonPressed(gamepad, BUTTON_MAP.dpadDown),
        dpadLeft: getButtonPressed(gamepad, BUTTON_MAP.dpadLeft),
        dpadRight: getButtonPressed(gamepad, BUTTON_MAP.dpadRight),
      },
      triggers: {
        left: leftTrigger,
        right: rightTrigger,
      },
    };
    
    setGamepadState(newState);
  }, [gamepadState]);

  // Polling loop for gamepad state
  const pollGamepad = useCallback(() => {
    updateGamepadState();
    animationFrameRef.current = requestAnimationFrame(pollGamepad);
  }, [updateGamepadState]);

  // Setup gamepad event listeners and polling
  useEffect(() => {
    console.log('🎮 useGamepad effect running');
    const handleGamepadConnected = (e: GamepadEvent) => {
      console.log('🎮 Gamepad connected event:', e.gamepad.id);
      setGamepadState(prev => ({ ...prev, connected: true }));
    };

    const handleGamepadDisconnected = (e: GamepadEvent) => {
      console.log('🎮 Gamepad disconnected event:', e.gamepad.id);
      setGamepadState(prev => ({ ...prev, connected: false }));
    };

    // Add event listeners
    console.log('🎮 Adding gamepad event listeners');
    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    // Start polling
    console.log('🎮 Starting gamepad polling loop');
    animationFrameRef.current = requestAnimationFrame(pollGamepad);

    // Check for already connected gamepads
    const gamepads = navigator.getGamepads();
    if (gamepads[0]) {
      console.log('🎮 Gamepad already connected on startup:', gamepads[0].id);
      setGamepadState(prev => ({ ...prev, connected: true }));
    } else {
      console.log('🎮 No gamepads connected on startup.');
    }

    return () => {
      // Cleanup
      console.log('🎮 useGamepad effect cleanup');
      console.log('🎮 Removing gamepad event listeners');
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
      
      if (animationFrameRef.current) {
        console.log('🎮 Cancelling animation frame loop');
        cancelAnimationFrame(animationFrameRef.current);
      }
      console.log('🎮 useGamepad effect cleanup complete');
    };
  }, [pollGamepad]);

  return {
    gamepad: gamepadState,
    isConnected: gamepadState.connected,
  };
};

export default useGamepad; 