import { useEffect, useState } from 'react';

const ADMIN_COMBO = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const COMBO_TIMEOUT = 2000; // 2 seconds to complete the combo

export const useKeyCombo = () => {
  const [keys, setKeys] = useState<string[]>([]);
  const [comboActivated, setComboActivated] = useState(false);
  const [lastKeyTime, setLastKeyTime] = useState(Date.now());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const currentTime = Date.now();
      
      // Reset if too much time has passed
      if (currentTime - lastKeyTime > COMBO_TIMEOUT) {
        setKeys([]);
      }
      
      setLastKeyTime(currentTime);
      
      const newKeys = [...keys, event.key];
      setKeys(newKeys);

      // Check if the combo is complete
      const isComboComplete = ADMIN_COMBO.every((key, index) => 
        newKeys[newKeys.length - ADMIN_COMBO.length + index] === key
      );

      if (isComboComplete) {
        setComboActivated(true);
        setKeys([]); // Reset keys after successful combo
      }

      // Keep only the last N keys where N is the length of the combo
      if (newKeys.length > ADMIN_COMBO.length) {
        setKeys(newKeys.slice(-ADMIN_COMBO.length));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keys, lastKeyTime]);

  return comboActivated;
}; 