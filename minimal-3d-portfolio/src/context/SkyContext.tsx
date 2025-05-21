import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the preset types
export type SkyPresetType = 'stars' | 'snow' | 'rain' | 'fireflies' | 'abstract' | 'custom';

// Define the context type
interface SkyContextType {
  currentSkyPreset: SkyPresetType;
  setCurrentSkyPreset: (preset: SkyPresetType) => void;
  customConfig: any;
  setCustomConfig: (config: any) => void;
}

// Create the context with default values
const SkyContext = createContext<SkyContextType>({
  currentSkyPreset: 'stars',
  setCurrentSkyPreset: () => {},
  customConfig: null,
  setCustomConfig: () => {},
});

// Custom hook to use the context
export const useSky = () => useContext(SkyContext);

// Provider component
export const SkyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentSkyPreset, setCurrentSkyPreset] = useState<SkyPresetType>('stars');
  const [customConfig, setCustomConfig] = useState<any>(null);

  return (
    <SkyContext.Provider
      value={{
        currentSkyPreset,
        setCurrentSkyPreset,
        customConfig,
        setCustomConfig,
      }}
    >
      {children}
    </SkyContext.Provider>
  );
};

export default SkyContext; 