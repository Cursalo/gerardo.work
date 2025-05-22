import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Text } from '@react-three/drei';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class R3FErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("R3F Error Boundary Caught:", error, errorInfo);
    // You can also log the error to an error reporting service here
  }

  public render() {
    if (this.state.hasError) {
      console.warn("R3FErrorBoundary rendering fallback due to error:", this.state.error);
      if (this.props.fallback) {
        return this.props.fallback;
      }
      // Default fallback if none provided
      return (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1, 1, 0.1]} />
          <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.6} />
          <Text
            position={[0, 0, 0.06]}
            fontSize={0.1}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            Error
          </Text>
        </mesh>
      );
    }

    return this.props.children;
  }
}

export default R3FErrorBoundary; 