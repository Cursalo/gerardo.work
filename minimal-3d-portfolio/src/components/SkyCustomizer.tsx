import React, { useState, useEffect } from 'react';
// import { useSky } from '../context/SkyContext';
// import { skyParticlePresets } from './SkyParticles';
// import { SkyPresetType } from '../context/SkyContext';

// STUBS for missing modules
const useSky = () => ({
  currentSkyPreset: 'custom',
  setCurrentSkyPreset: () => {},
  setCustomConfig: () => {},
});
const skyParticlePresets = {};

// Styling
const styles = {
  container: {
    position: 'fixed' as const,
    right: '20px',
    top: '130px',
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(77, 255, 170, 0.3)',
    zIndex: 1000,
    fontFamily: 'Helvetica, Arial, sans-serif',
    maxWidth: '350px',
    maxHeight: '80vh',
    overflowY: 'auto' as const,
  },
  title: {
    margin: '0 0 15px 0',
    fontSize: '18px',
    color: '#333',
    textAlign: 'center' as const,
  },
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    marginBottom: '5px',
    fontWeight: 'bold' as const,
    color: '#333',
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '5px',
    border: '1px solid rgba(77, 255, 170, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '5px',
    border: '1px solid rgba(77, 255, 170, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    fontSize: '14px',
  },
  colorInput: {
    width: '100%',
    height: '40px',
    padding: '0',
    border: '1px solid rgba(77, 255, 170, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  rangeContainer: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '10px',
  },
  rangeInput: {
    flex: 1,
  },
  rangeValue: {
    width: '40px',
    textAlign: 'center' as const,
    fontSize: '14px',
  },
  buttonGroup: {
    display: 'flex' as const,
    gap: '10px',
    marginTop: '20px',
  },
  button: {
    flex: 1,
    padding: '10px',
    borderRadius: '5px',
    border: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
    transition: 'all 0.2s ease',
  },
  applyButton: {
    backgroundColor: 'rgba(77, 255, 170, 0.8)',
    color: '#000',
  },
  cancelButton: {
    backgroundColor: 'rgba(200, 200, 200, 0.8)',
    color: '#333',
  },
  resetButton: {
    backgroundColor: 'rgba(255, 100, 100, 0.8)',
    color: '#fff',
  },
};

interface SkyCustomizerProps {
  onClose: () => void;
}

// Type for customized particle settings
interface CustomSettings {
  particles: {
    number: { value: number },
    color: { value: string },
    shape: { type: string },
    opacity: { value: number },
    size: { value: number },
    move: {
      speed: number,
      direction: string
    }
  }
}

const SkyCustomizer: React.FC<SkyCustomizerProps> = ({ onClose }) => {
  // const { currentSkyPreset, setCurrentSkyPreset, setCustomConfig } = useSky();
  
  // State for customized settings
  const [customSettings, setCustomSettings] = useState<CustomSettings>({
    particles: {
      number: { value: 100 },
      color: { value: "#ffffff" },
      shape: { type: "circle" },
      opacity: { value: 0.7 },
      size: { value: 3 },
      move: {
        speed: 1,
        direction: "none"
      }
    }
  });

  // Initialize with current preset settings if available
  useEffect(() => {
    // if (currentSkyPreset && currentSkyPreset !== 'custom') {
    //   const presetConfig = skyParticlePresets[currentSkyPreset as keyof typeof skyParticlePresets];
    //   setCustomSettings({
    //     particles: {
    //       number: { value: presetConfig.particles.number.value },
    //       color: { value: presetConfig.particles.color.value },
    //       shape: { type: presetConfig.particles.shape.type },
    //       opacity: { value: presetConfig.particles.opacity.value },
    //       size: { value: presetConfig.particles.size.value },
    //       move: {
    //         speed: presetConfig.particles.move.speed,
    //         direction: presetConfig.particles.move.direction
    //       }
    //     }
    //   });
    // }
  }, []);

  // Handle input changes
  const handleChange = (path: string, value: any) => {
    const keys = path.split('.');
    setCustomSettings((prev: CustomSettings) => {
      const newSettings = { ...prev };
      let current: any = newSettings;
      
      // Navigate to the nested property
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      // Set the value
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  // Apply custom settings
  const applySettings = () => {
    // Create a full config object based on the custom settings
    const fullConfig = {
      particles: {
        number: { 
          value: customSettings.particles.number.value, 
          density: { enable: true, value_area: 800 } 
        },
        color: { value: customSettings.particles.color.value },
        shape: { type: customSettings.particles.shape.type },
        opacity: { 
          value: customSettings.particles.opacity.value, 
          random: true 
        },
        size: { 
          value: customSettings.particles.size.value, 
          random: true 
        },
        line_linked: { 
          enable: customSettings.particles.shape.type === "circle",
          distance: 150,
          color: customSettings.particles.color.value,
          opacity: 0.4,
          width: 1
        },
        move: {
          enable: true,
          speed: customSettings.particles.move.speed,
          direction: customSettings.particles.move.direction,
          random: true,
          straight: false,
          out_mode: "out"
        }
      },
      interactivity: { detect_on: "canvas", events: { resize: true } }
    };
    
    // Store custom config in localStorage
    localStorage.setItem('portfolio_custom_sky_config', JSON.stringify(fullConfig));
    
    // Set custom config in context
    // setCustomConfig(fullConfig);
    
    // Apply custom config by setting a special preset name
    // setCurrentSkyPreset('custom');
    
    // Close the customizer
    onClose();
  };

  // Reset to selected preset
  const resetToPreset = () => {
    // if (currentSkyPreset && currentSkyPreset !== 'custom') {
    //   const presetConfig = skyParticlePresets[currentSkyPreset as keyof typeof skyParticlePresets];
    //   setCustomSettings({
    //     particles: {
    //       number: { value: presetConfig.particles.number.value },
    //       color: { value: presetConfig.particles.color.value },
    //       shape: { type: presetConfig.particles.shape.type },
    //       opacity: { value: presetConfig.particles.opacity.value },
    //       size: { value: presetConfig.particles.size.value },
    //       move: {
    //         speed: presetConfig.particles.move.speed,
    //         direction: presetConfig.particles.move.direction
    //       }
    //     }
    //   });
    // }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Customize Sky Effect</h2>
      
      <div style={styles.formGroup}>
        <label style={styles.label}>Particle Color</label>
        <input 
          type="color" 
          style={styles.colorInput}
          value={customSettings.particles.color.value}
          onChange={(e) => handleChange('particles.color.value', e.target.value)}
        />
      </div>
      
      <div style={styles.formGroup}>
        <label style={styles.label}>Particle Shape</label>
        <select 
          style={styles.select}
          value={customSettings.particles.shape.type}
          onChange={(e) => handleChange('particles.shape.type', e.target.value)}
        >
          <option value="circle">Circle</option>
          <option value="edge">Square</option>
          <option value="triangle">Triangle</option>
          <option value="star">Star</option>
        </select>
      </div>
      
      <div style={styles.formGroup}>
        <label style={styles.label}>Number of Particles: {customSettings.particles.number.value}</label>
        <div style={styles.rangeContainer}>
          <input 
            type="range" 
            style={styles.rangeInput}
            min="10" 
            max="300"
            value={customSettings.particles.number.value}
            onChange={(e) => handleChange('particles.number.value', parseInt(e.target.value))}
          />
          <span style={styles.rangeValue}>{customSettings.particles.number.value}</span>
        </div>
      </div>
      
      <div style={styles.formGroup}>
        <label style={styles.label}>Particle Size: {customSettings.particles.size.value}</label>
        <div style={styles.rangeContainer}>
          <input 
            type="range" 
            style={styles.rangeInput}
            min="1" 
            max="20"
            value={customSettings.particles.size.value}
            onChange={(e) => handleChange('particles.size.value', parseInt(e.target.value))}
          />
          <span style={styles.rangeValue}>{customSettings.particles.size.value}</span>
        </div>
      </div>
      
      <div style={styles.formGroup}>
        <label style={styles.label}>Opacity: {customSettings.particles.opacity.value}</label>
        <div style={styles.rangeContainer}>
          <input 
            type="range" 
            style={styles.rangeInput}
            min="0.1" 
            max="1"
            step="0.1"
            value={customSettings.particles.opacity.value}
            onChange={(e) => handleChange('particles.opacity.value', parseFloat(e.target.value))}
          />
          <span style={styles.rangeValue}>{customSettings.particles.opacity.value}</span>
        </div>
      </div>
      
      <div style={styles.formGroup}>
        <label style={styles.label}>Speed: {customSettings.particles.move.speed}</label>
        <div style={styles.rangeContainer}>
          <input 
            type="range" 
            style={styles.rangeInput}
            min="0.1" 
            max="10"
            step="0.1"
            value={customSettings.particles.move.speed}
            onChange={(e) => handleChange('particles.move.speed', parseFloat(e.target.value))}
          />
          <span style={styles.rangeValue}>{customSettings.particles.move.speed}</span>
        </div>
      </div>
      
      <div style={styles.formGroup}>
        <label style={styles.label}>Direction</label>
        <select 
          style={styles.select}
          value={customSettings.particles.move.direction}
          onChange={(e) => handleChange('particles.move.direction', e.target.value)}
        >
          <option value="none">Random</option>
          <option value="top">Up</option>
          <option value="bottom">Down</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </div>
      
      <div style={styles.buttonGroup}>
        <button 
          style={{...styles.button, ...styles.cancelButton}}
          onClick={onClose}
        >
          Cancel
        </button>
        <button 
          style={{...styles.button, ...styles.resetButton}}
          onClick={resetToPreset}
        >
          Reset
        </button>
        <button 
          style={{...styles.button, ...styles.applyButton}}
          onClick={applySettings}
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default SkyCustomizer; 