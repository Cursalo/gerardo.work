import React, { useEffect, useRef } from 'react';
import { useSky } from '../context/SkyContext';

// Define preset particle configurations
export const skyParticlePresets = {
  stars: {
    particles: {
      number: { value: 100 },
      color: { value: "#ffffff" },
      shape: { type: "circle" },
      opacity: { value: 0.7 },
      size: { value: 3 },
      move: {
        speed: 0.5,
        direction: "none"
      }
    }
  },
  snow: {
    particles: {
      number: { value: 50 },
      color: { value: "#ffffff" },
      shape: { type: "circle" },
      opacity: { value: 0.8 },
      size: { value: 5 },
      move: {
        speed: 2,
        direction: "bottom"
      }
    }
  },
  rain: {
    particles: {
      number: { value: 80 },
      color: { value: "#7de2fc" },
      shape: { type: "circle" },
      opacity: { value: 0.5 },
      size: { value: 2 },
      move: {
        speed: 8,
        direction: "bottom"
      }
    }
  },
  fireflies: {
    particles: {
      number: { value: 40 },
      color: { value: "#ffcc00" },
      shape: { type: "circle" },
      opacity: { value: 0.9 },
      size: { value: 4 },
      move: {
        speed: 1.5,
        direction: "none"
      }
    }
  },
  abstract: {
    particles: {
      number: { value: 60 },
      color: { value: "#ff5bb0" },
      shape: { type: "polygon" },
      opacity: { value: 0.6 },
      size: { value: 6 },
      move: {
        speed: 1,
        direction: "none"
      }
    }
  }
};

interface SkyParticlesProps {
  className?: string;
}

declare global {
  interface Window {
    particlesJS: any;
  }
}

const SkyParticles: React.FC<SkyParticlesProps> = ({ className }) => {
  const particlesContainerId = 'particles-js';
  const { currentSkyPreset, customConfig } = useSky();
  const particlesInitialized = useRef(false);

  // Initialize and update particles
  useEffect(() => {
    // Check if particles.js script is loaded
    if (typeof window.particlesJS === 'undefined') {
      console.error('particles.js not loaded yet');
      return;
    }

    let config: any;

    // Determine which configuration to use
    if (currentSkyPreset === 'custom' && customConfig) {
      config = customConfig;
    } else if (currentSkyPreset && currentSkyPreset !== 'custom') {
      const presetConfig = skyParticlePresets[currentSkyPreset as keyof typeof skyParticlePresets];
      config = {
        particles: {
          number: { 
            value: presetConfig.particles.number.value, 
            density: { enable: true, value_area: 800 } 
          },
          color: { value: presetConfig.particles.color.value },
          shape: { type: presetConfig.particles.shape.type },
          opacity: { 
            value: presetConfig.particles.opacity.value, 
            random: true 
          },
          size: { 
            value: presetConfig.particles.size.value, 
            random: true 
          },
          line_linked: { 
            enable: presetConfig.particles.shape.type === "circle",
            distance: 150,
            color: presetConfig.particles.color.value,
            opacity: 0.4,
            width: 1
          },
          move: {
            enable: true,
            speed: presetConfig.particles.move.speed,
            direction: presetConfig.particles.move.direction,
            random: true,
            straight: false,
            out_mode: "out"
          }
        },
        interactivity: { detect_on: "canvas", events: { resize: true } }
      };
    } else {
      // Default config if no preset selected
      config = skyParticlePresets.stars;
    }

    // Apply particles configuration
    if (particlesInitialized.current) {
      window.particlesJS(particlesContainerId, config);
    } else {
      // Initialize particles
      window.particlesJS(particlesContainerId, config);
      particlesInitialized.current = true;
    }

    // Cleanup function
    return () => {
      // No direct cleanup method in particles.js
    };
  }, [currentSkyPreset, customConfig]);

  return (
    <div 
      id={particlesContainerId} 
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none'
      }}
    />
  );
};

export default SkyParticles; 