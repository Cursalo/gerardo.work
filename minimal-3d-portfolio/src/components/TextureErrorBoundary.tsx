import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as THREE from 'three';

interface Props {
  children: ReactNode;
  fallbackTexture?: string;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  fallbackTexture: THREE.Texture | null;
}

class TextureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      fallbackTexture: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback texture
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('TextureErrorBoundary caught an error:', error, errorInfo);
    
    // Create a fallback texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#999999';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Texture Error', canvas.width/2, canvas.height/2);
      ctx.fillText(error.message.substring(0, 30), canvas.width/2, canvas.height/2 + 30);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    this.setState({ fallbackTexture: texture });
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.fallbackTexture) {
      // Return a fallback texture or component
      return (
        <meshBasicMaterial map={this.state.fallbackTexture} />
      );
    }

    return this.props.children;
  }
}

export default TextureErrorBoundary; 