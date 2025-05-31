import { useEffect, useState } from 'react';

/**
 * Hook to detect if the current device is mobile and provide device capabilities
 */
export const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  // Detect mobile devices based on screen size and user agent
  useEffect(() => {
    const detectDeviceType = () => {
      // Basic screen width check for mobile
      const isMobileWidth = window.innerWidth <= 768;
      
      // Additional check using user agent (not perfect but helpful)
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      
      // Combine checks
      setIsMobile(isMobileWidth || isMobileUA);
      
      // Detect iOS devices
      const isIOSDevice = /iphone|ipad|ipod/i.test(userAgent.toLowerCase()) || 
                         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIOS(isIOSDevice);
      
      // Check orientation
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    
    // Multiple checks for touch capability
    const detectTouchCapability = () => {
      const hasTouch = 
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0 ||
        (window as any).DocumentTouch && document instanceof (window as any).DocumentTouch;
        
      // Additional media query check
      const touchMediaQuery = window.matchMedia?.('(pointer: coarse)');
      const hasTouchMediaQuery = touchMediaQuery && touchMediaQuery.matches;
      
      setIsTouchDevice(hasTouch || hasTouchMediaQuery);
      
      // Force touch detection on known mobile user agents
      if (isMobile || isIOS) {
        setIsTouchDevice(true);
      }
    };
    
    // Run initial detection
    detectDeviceType();
    detectTouchCapability();
    
    // Set up event listeners for orientation and resize changes
    const handleResize = () => {
      detectDeviceType();
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isMobile, isIOS]); // Include dependencies
  
  return { 
    isMobile, 
    isTouchDevice, 
    isLandscape,
    isIOS
  };
};

export default useMobileDetection; 