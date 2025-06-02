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
const smoothInput = (current: number, target: number, smoothing: number = 0.8): number => {
  return current + (target - current) * smoothing;
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
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[0]; // Use first connected gamepad

    if (!gamepad) {
      setGamepadState(prev => ({ ...prev, connected: false }));
      return;
    }

    // Process gamepad input directly

    // Process analog sticks with deadzone and smoothing
    const rawLeftX = gamepad.axes[0] || 0;
    const rawLeftY = gamepad.axes[1] || 0;
    const rawRightX = gamepad.axes[2] || 0;
    const rawRightY = gamepad.axes[3] || 0;

    // Apply deadzone
    const leftX = applyDeadzone(rawLeftX);
    const leftY = applyDeadzone(-rawLeftY); // Invert Y for standard FPS controls
    const rightX = applyDeadzone(rawRightX);
    const rightY = applyDeadzone(-rawRightY); // Invert Y for standard FPS controls

    // Apply smoothing
    smoothedLeftStick.current.x = smoothInput(smoothedLeftStick.current.x, leftX);
    smoothedLeftStick.current.y = smoothInput(smoothedLeftStick.current.y, leftY);
    smoothedRightStick.current.x = smoothInput(smoothedRightStick.current.x, rightX);
    smoothedRightStick.current.y = smoothInput(smoothedRightStick.current.y, rightY);

    // Aggressive drift elimination: clamp tiny smoothed values to zero
    const driftThreshold = 0.005;
    if (Math.abs(smoothedLeftStick.current.x) < driftThreshold) smoothedLeftStick.current.x = 0;
    if (Math.abs(smoothedLeftStick.current.y) < driftThreshold) smoothedLeftStick.current.y = 0;
    if (Math.abs(smoothedRightStick.current.x) < driftThreshold) smoothedRightStick.current.x = 0;
    if (Math.abs(smoothedRightStick.current.y) < driftThreshold) smoothedRightStick.current.y = 0;

    // Process triggers (they might be buttons or axes depending on browser)
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
        A: gamepad.buttons[BUTTON_MAP.A]?.pressed || false,
        B: gamepad.buttons[BUTTON_MAP.B]?.pressed || false,
        X: gamepad.buttons[BUTTON_MAP.X]?.pressed || false,
        Y: gamepad.buttons[BUTTON_MAP.Y]?.pressed || false,
        LB: gamepad.buttons[BUTTON_MAP.LB]?.pressed || false,
        RB: gamepad.buttons[BUTTON_MAP.RB]?.pressed || false,
        LT: leftTrigger,
        RT: rightTrigger,
        back: gamepad.buttons[BUTTON_MAP.back]?.pressed || false,
        start: gamepad.buttons[BUTTON_MAP.start]?.pressed || false,
        leftStickButton: gamepad.buttons[BUTTON_MAP.leftStickButton]?.pressed || false,
        rightStickButton: gamepad.buttons[BUTTON_MAP.rightStickButton]?.pressed || false,
        dpadUp: gamepad.buttons[BUTTON_MAP.dpadUp]?.pressed || false,
        dpadDown: gamepad.buttons[BUTTON_MAP.dpadDown]?.pressed || false,
        dpadLeft: gamepad.buttons[BUTTON_MAP.dpadLeft]?.pressed || false,
        dpadRight: gamepad.buttons[BUTTON_MAP.dpadRight]?.pressed || false,
      },
      triggers: {
        left: leftTrigger,
        right: rightTrigger,
      },
    };

    setGamepadState(newState);
  }, []);

  // Polling loop for gamepad state
  const pollGamepad = useCallback(() => {
    updateGamepadState();
    animationFrameRef.current = requestAnimationFrame(pollGamepad);
  }, [updateGamepadState]);

  // Setup gamepad event listeners and polling
  useEffect(() => {
    const handleGamepadConnected = (e: GamepadEvent) => {
      console.log('🎮 Gamepad connected:', e.gamepad.id);
      setGamepadState(prev => ({ ...prev, connected: true }));
    };

    const handleGamepadDisconnected = (e: GamepadEvent) => {
      console.log('🎮 Gamepad disconnected:', e.gamepad.id);
      setGamepadState(prev => ({ ...prev, connected: false }));
    };

    // Add event listeners
    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    // Start polling
    animationFrameRef.current = requestAnimationFrame(pollGamepad);

    // Check for already connected gamepads
    const gamepads = navigator.getGamepads();
    if (gamepads[0]) {
      setGamepadState(prev => ({ ...prev, connected: true }));
    }

    return () => {
      // Cleanup
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [pollGamepad]);

  return {
    gamepad: gamepadState,
    isConnected: gamepadState.connected,
  };
};

export default useGamepad; 