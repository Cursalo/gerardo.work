import { useState, useEffect } from 'react'
import './App.css'
import Scene from './components/Scene'
import Crosshair from './components/Crosshair'
import DraggableChatUI from './components/DraggableChatUI'
import { ChatProvider, useChat } from './context/ChatContext'
import ErrorBoundary from './components/ErrorBoundary'
import useMobileDetection from './hooks/useMobileDetection'
import { AudioProvider } from './context/AudioContext'
import { MusicPlayer } from './components/MusicPlayer'

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
    left: '50%',
    transform: 'translateX(-50%)' as const,
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
    textAlign: 'center' as const,
  },
  mobileInstructions: {
    position: 'absolute' as const,
    top: '70px',
    left: '40%',
    transform: 'translateX(-50%)' as const,
    background: 'rgba(255, 255, 255, 0.9)',
    color: '#333',
    padding: '12px',
    borderRadius: '10px',
    zIndex: 100,
    width: '90%',
    maxWidth: '400px',
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: '12px',
    lineHeight: '1.3',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(77, 255, 170, 0.2)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    textAlign: 'center' as const,
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
  mobileStartPrompt: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(255, 255, 255, 0.9)',
    color: '#333',
    padding: '15px',
    borderRadius: '10px',
    zIndex: 200,
    width: '85%',
    maxWidth: '320px',
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: '16px',
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
  mobileToggleButton: {
    position: 'fixed' as const,
    zIndex: 1001,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: '#333',
    border: '1px solid rgba(77, 255, 170, 0.5)',
    borderRadius: '20px',
    padding: '6px 12px',
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(4px)',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
  },
  toggleInstructions: {
    top: '20px',
    right: '20px',
  },
  mobileToggleInstructions: {
    top: '10px',
    right: '10px',
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
  uiToggleButton: {
    position: 'fixed' as const,
    top: '20px',
    right: '20px',
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
    title: 'Toggle UI visibility',
  },
  mobileUiToggleButton: {
    position: 'fixed' as const,
    top: '10px',
    right: '10px',
    zIndex: 1001,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: '#333',
    border: '1px solid rgba(77, 255, 170, 0.5)',
    borderRadius: '20px',
    padding: '6px 12px',
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(4px)',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
  },
  mobileMenu: {
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
  mobileMenuPanel: {
    position: 'fixed' as const,
    top: '60px',
    left: '10px',
    zIndex: 1002,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    color: '#333',
    borderRadius: '10px',
    padding: '15px',
    width: '200px', // Slightly wider for new button
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(77, 255, 170, 0.3)',
  },
  mobileMenuOption: {
    display: 'block',
    padding: '10px 12px', // Increased padding for better touch
    borderRadius: '8px',
    backgroundColor: 'rgba(77, 255, 170, 0.1)',
    color: '#333',
    textAlign: 'center' as const,
    textDecoration: 'none',
    fontWeight: 'bold' as const,
    transition: 'all 0.2s ease',
    border: '1px solid rgba(77, 255, 170, 0.3)',
    fontSize: '14px', // Standardized font size
  },
  mobileMenuOptionDisabled: {
    // Styles for a disabled menu option, if needed later
    backgroundColor: 'rgba(200, 200, 200, 0.1)',
    color: '#aaa',
    cursor: 'not-allowed',
  },
}

const AppContent = () => {
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [fadeInstructions, setFadeInstructions] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [showResetInfo, setShowResetInfo] = useState(false);
  
  const { isMobile, isTouchDevice } = useMobileDetection();
  const { openChat, showChat: isChatOpen, isNearNPC } = useChat();

  // FIXED: Clear any stored navigation targets on initial app load
  // This prevents random project navigation on startup
  useEffect(() => {
    // Only clear if the URL doesn't explicitly request to keep the navigation
    if (!window.location.search.includes('store_navigation=true')) {
      localStorage.removeItem('target_world_id');
      localStorage.removeItem('target_project_id');
      console.log('App startup: Cleared any stored navigation targets');
    }
  }, []);

  useEffect(() => {
    if (showInstructions) {
      setFadeInstructions(false);
      const timer = setTimeout(() => setFadeInstructions(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [showInstructions]);
  
  useEffect(() => {
    if (fadeInstructions) {
      const hideTimer = setTimeout(() => setShowInstructions(false), 1000);
      return () => clearTimeout(hideTimer);
    }
  }, [fadeInstructions]);
  
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'f') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(err => console.error(`Error attempting to enable fullscreen: ${err.message}`));
        else document.exitFullscreen();
      }
      if (e.key === 'i' || e.key === 'I') {
        setFadeInstructions(false);
        setShowInstructions(prev => !prev);
      }
      if (e.key === 'u') setShowUI(prev => !prev);
    };
    const handlePointerLockChange = () => setIsPointerLocked(!!document.pointerLockElement);

    window.addEventListener('keydown', handleKeyPress);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, []);

  useEffect(() => {
    // Show reset info after a few seconds if not dismissed before
    const timer = setTimeout(() => {
      // Check if this is the first time visiting
      const hasVisitedBefore = localStorage.getItem('has_visited_before');
      if (!hasVisitedBefore) {
        setShowResetInfo(true);
        localStorage.setItem('has_visited_before', 'true');
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

  const toggleInstructions = () => {
    setFadeInstructions(false);
    setShowInstructions(prev => !prev);
    setShowMobileMenu(false); // Close menu when instructions toggled
  };
  
  const toggleMobileMenu = () => setShowMobileMenu(prev => !prev);
  
  const toggleUI = () => {
    setShowUI(prev => !prev);
    setShowMobileMenu(false); // Close menu when UI toggled
  };

  const forceResetAllData = () => {
    if (confirm('This will reset ALL data and refresh the page. Any unsaved changes will be lost. Continue?')) {
      // Back up the admin password if it exists
      const adminPassword = localStorage.getItem('admin_password');
      
      // Clear all localStorage data
      localStorage.clear();
      
      // Restore admin password if it existed
      if (adminPassword) {
        localStorage.setItem('admin_password', adminPassword);
      }
      
      // Reload the page
      window.location.reload();
    }
  };

  const handleOpenChatFromMenu = () => {
    openChat();
    setShowMobileMenu(false);
  };

  const renderInstructions = () => {
    if (!showInstructions) return null;
    const instructionsStyle = {
      ...(!isMobile ? styles.instructions : styles.mobileInstructions),
      ...(fadeInstructions ? styles.instructionsFading : styles.instructionsVisible)
    };
    return (
      <div style={instructionsStyle}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: isMobile ? '14px' : '16px' }}>Welcome to my 3D Portfolio!</h3>
        {isMobile ? (
          <div style={{ textAlign: 'center' }}>
            <p><span style={styles.highlight}>Left side:</span> Touch and drag to move</p>
            <p><span style={styles.highlight}>Right side:</span> Touch and drag to look</p>
            <p><span style={styles.highlight}>Tap objects</span> to interact</p>
            <p>Use menu <span style={styles.highlight}>⋮</span> for options</p>
          </div>
        ) : (
          <div>
            <p><span style={styles.highlight}>Move:</span> WASD/Arrows</p>
            <p><span style={styles.highlight}>Look:</span> Mouse (click to lock)</p>
            <p><span style={styles.highlight}>Interact:</span> Click objects</p>
            <p><span style={styles.highlight}>Instructions:</span> 'I' key</p>
            <p><span style={styles.highlight}>Toggle UI:</span> 'U' key</p>
            <p><span style={styles.highlight}>Fullscreen:</span> 'F' key</p>
          </div>
        )}
      </div>
    );
  };
  
  const renderMobileMenu = () => {
    if (!isMobile || !showMobileMenu) return null;
    return (
      <div style={styles.mobileMenuPanel}>
        <button onClick={toggleInstructions} style={styles.mobileMenuOption}>
          {showInstructions ? 'Hide Instructions' : 'Show Instructions'}
        </button>
        {isNearNPC && (
          <button 
            onClick={handleOpenChatFromMenu}
            style={isChatOpen ? {...styles.mobileMenuOption, ...styles.mobileMenuOptionDisabled} : styles.mobileMenuOption}
            disabled={isChatOpen}
          >
            {isChatOpen ? 'Chat Active' : 'Chat with Technoclaw'}
          </button>
        )}
        <button onClick={toggleUI} style={styles.mobileMenuOption}>
          {showUI ? 'Hide UI' : 'Show UI'}
        </button>
        <button 
          onClick={() => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(err => console.error(`Error fullscreen: ${err.message}`));
            else document.exitFullscreen();
            setShowMobileMenu(false);
          }}
          style={styles.mobileMenuOption}
        >
          Toggle Fullscreen
        </button>
      </div>
    );
  };
  
  return (
    <div style={styles.app} className="app">
      {showUI && (
        <>
          {isMobile && (
            <button onClick={toggleMobileMenu} style={styles.mobileMenuButton} aria-label="Menu">⋮</button>
          )}
          {renderMobileMenu()}
          {!isMobile && (
            <button onClick={toggleInstructions} style={{...styles.toggleButton, ...styles.toggleInstructions}} className="toggle-instructions">
              {showInstructions ? 'Hide Instructions' : 'Show Instructions'}
            </button>
          )}
          {renderInstructions()}
          <div style={styles.crosshairContainer} id="crosshair-container"><Crosshair /></div>
        </>
      )}
      <div style={styles.sceneContainer} id="scene-container"><Scene /></div>
      <DraggableChatUI />
      {showResetInfo && showUI && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: '#4dffa9',
          padding: '15px',
          borderRadius: '8px',
          maxWidth: '300px',
          zIndex: 1000,
          fontSize: '14px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
          border: '1px solid #4dffa9'
        }}>
          <div style={{ marginBottom: '10px' }}>
            If you're seeing different worlds on mobile vs desktop, try adding <b>?force_reset=true</b> to the URL and reload.
          </div>
          <button 
            onClick={() => setShowResetInfo(false)}
            style={{
              backgroundColor: '#4dffa9',
              color: 'black',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ChatProvider>
        <AudioProvider>
          <AppContent />
          <MusicPlayer />
        </AudioProvider>
      </ChatProvider>
    </ErrorBoundary>
  );
}

export default App;
