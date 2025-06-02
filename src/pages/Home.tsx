import { useState, useEffect } from 'react';
import Scene from '../components/Scene';
import Crosshair from '../components/Crosshair';
import DraggableChatUI from '../components/DraggableChatUI';
import { ChatProvider } from '../context/ChatContext';

// Define the style object with proper TypeScript types
const styles = {
  app: {
    position: 'relative' as const,
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    cursor: 'none', // Hide default cursor throughout the app
    margin: 0,
    padding: 0,
    backgroundColor: '#ffffff', // White background
  },
  instructions: {
    position: 'absolute' as const,
    top: '20px',
    left: '20px',
    background: 'rgba(255, 255, 255, 0.9)', // White background with transparency
    color: '#333', // Dark text for readability
    padding: '15px',
    borderRadius: '10px',
    zIndex: 100,
    maxWidth: '370px',
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: '14px',
    lineHeight: '1.4',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(77, 255, 170, 0.2)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
  },
  highlight: {
    color: '#007a4d', // Darker green for better contrast on white
    fontWeight: 'bold' as const,
  },
  sceneContainer: {
    width: '100%',
    height: '100%',
    margin: 0,
    padding: 0,
    backgroundColor: '#ffffff', // White background
  },
  startPrompt: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(255, 255, 255, 0.9)', // White background with transparency
    color: '#333', // Dark text
    padding: '20px',
    borderRadius: '10px',
    zIndex: 200,
    maxWidth: '400px',
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: '18px',
    textAlign: 'center' as const,
    pointerEvents: 'none' as const,
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(77, 255, 170, 0.2)',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  },
  crosshairContainer: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none' as const,
    zIndex: 10000, // Extremely high z-index to ensure visibility
    display: 'block',
  },
  toggleButton: {
    position: 'fixed' as const,
    zIndex: 1001,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // White background with transparency
    color: '#333', // Dark text
    border: '1px solid rgba(77, 255, 170, 0.5)',
    borderRadius: '20px',
    padding: '8px 16px',
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(4px)',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
  },
  toggleInstructions: {
    top: '20px',
    right: '20px',
  },
  mobileMenuButton: {
    position: 'fixed' as const,
    top: '10px',
    left: '10px',
    zIndex: 1002,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // White background with transparency
    color: '#333', // Dark text
    border: '1px solid rgba(77, 255, 170, 0.5)',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    cursor: 'pointer',
    backdropFilter: 'blur(4px)',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
  },
  // Add fade transition to instructions
  instructionsVisible: {
    opacity: 1,
    transition: 'opacity 1s ease-in-out',
  },
  instructionsFading: {
    opacity: 0,
    transition: 'opacity 1s ease-in-out',
  },
};

function Home() {
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [fadeInstructions, setFadeInstructions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUI, setShowUI] = useState(true);

  // Auto-fade instructions after 10 seconds
  useEffect(() => {
    if (showInstructions) {
      setFadeInstructions(false);
      
      const timer = setTimeout(() => {
        setFadeInstructions(true);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [showInstructions]);
  
  // Auto-hide instructions completely after fade completes
  useEffect(() => {
    if (fadeInstructions) {
      const hideTimer = setTimeout(() => {
        setShowInstructions(false);
      }, 1000);
      
      return () => clearTimeout(hideTimer);
    }
  }, [fadeInstructions]);
  
  // Check if device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  // Add keyboard handlers and pointer lock detection
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'f') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`)
          })
        } else {
          document.exitFullscreen()
        }
      }
      
      if (e.key === 'i' || e.key === 'I') {
        setFadeInstructions(false);
        setShowInstructions(prev => !prev);
      }
      
      if (e.key === 'u') {
        setShowUI(prev => !prev);
      }
    }
    
    const handlePointerLockChange = () => {
      setIsPointerLocked(!!document.pointerLockElement);
    }

    window.addEventListener('keydown', handleKeyPress);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    }
  }, [])

  const toggleInstructions = () => {
    setFadeInstructions(false);
    setShowInstructions(prev => !prev);
  };
  
  const toggleMobileMenu = () => {
    setShowMobileMenu(prev => !prev);
  };
  
  const toggleUI = () => {
    setShowUI(prev => !prev);
  };

  return (
    <ChatProvider>
      <div style={styles.app} className="app">
        {showUI && (
          <>
            {isMobile && (
              <div 
                style={styles.mobileMenuButton}
                onClick={toggleMobileMenu}
              >
                ≡
              </div>
            )}
            
            {!isMobile && (
              <button 
                style={{...styles.toggleButton, ...styles.toggleInstructions}}
                className="toggle-btn toggle-instructions"
                onClick={toggleInstructions}
              >
                {showInstructions ? 'Hide' : 'Show'} Instructions (Press 'I')
              </button>
            )}
            
            {(showInstructions || (isMobile && showMobileMenu)) && (
              <div 
                style={{
                  ...styles.instructions, 
                  ...(fadeInstructions ? styles.instructionsFading : styles.instructionsVisible)
                }} 
                className={`instructions ${fadeInstructions ? 'fade' : ''}`}
              >
                <h2>Camera Controls:</h2>
                <p style={styles.highlight}>
                  <b>Mouse</b>: Move mouse to look around
                </p>
                <p><b>W/Up Arrow</b>: Move forward</p>
                <p><b>S/Down Arrow</b>: Move backward</p>
                <p><b>A/Left Arrow</b>: Strafe left</p>
                <p><b>D/Right Arrow</b>: Strafe right</p>
                
                <h2>Crosshair Interaction:</h2>
                <p style={styles.highlight}>
                  The center dot shows precisely where you're aiming
                </p>
                <p>
                  The crosshair will highlight when pointing at cards
                </p>
                <p>
                  Click when the crosshair is over a card to interact with it
                </p>
                
                <h2>NPC Interaction:</h2>
                <p>
                  <b>Approach the NPC</b> in the center to chat with it
                </p>
                <p>
                  Press <b>C</b> key or click the <b>Talk to NPC</b> button when it appears
                </p>
                
                <h2>Other:</h2>
                <p><b>ESC</b>: Release mouse control</p>
                <p><b>F</b>: Toggle fullscreen</p>
                <p><b>I</b>: Toggle instructions</p>
                <p><b>U</b>: Toggle all UI elements</p>
                <p><b>C</b>: Toggle chat (when near NPC)</p>
                
                {isMobile && showMobileMenu && (
                  <button 
                    style={{
                      marginTop: '10px',
                      backgroundColor: 'rgba(77, 255, 170, 0.2)',
                      color: '#333',
                      border: '1px solid rgba(77, 255, 170, 0.5)',
                      borderRadius: '10px',
                      padding: '8px',
                      width: '100%'
                    }}
                    onClick={toggleMobileMenu}
                  >
                    Close Menu
                  </button>
                )}
              </div>
            )}
            
            {!isPointerLocked && (
              <div style={styles.startPrompt}>
                <p style={styles.highlight}><b>Click anywhere to start</b></p>
                <p>Use the central crosshair to aim at project cards</p>
                <p>Approach the NPC at the center to chat</p>
                <p>Press ESC anytime to release mouse control</p>
              </div>
            )}
            
            {/* Interaction Cooldown Indicator - shows when interactions are temporarily blocked */}
            {isPointerLocked && (
              <div 
                id="interaction-cooldown-indicator"
                style={{
                  position: 'fixed',
                  top: '20px',
                  right: '20px',
                  backgroundColor: 'rgba(255, 165, 0, 0.9)',
                  color: '#fff',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  zIndex: 9999,
                  border: '2px solid rgba(255, 140, 0, 0.7)',
                  display: 'none', // Initially hidden, will be shown via JS when needed
                  animation: 'pulse 2s infinite',
                }}
              >
                ⏱️ Move mouse to enable interactions
              </div>
            )}
            
            <DraggableChatUI />
          </>
        )}
        
        <div style={styles.crosshairContainer} id="crosshair-container">
          <Crosshair />
        </div>
        
        <button 
          className="toggle-ui-btn"
          onClick={toggleUI}
        >
          {showUI ? 'Hide UI' : 'Show UI'}
        </button>
        
        <div style={styles.sceneContainer} className="scene-container">
          <Scene />
        </div>
      </div>
    </ChatProvider>
  );
}

export default Home; 