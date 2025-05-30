import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Scene from '../components/Scene';
import Crosshair from '../components/Crosshair';
import { getWorldServiceInstance } from '../data/worlds';
import { World } from '../data/worlds';
import ErrorBoundary from '../components/ErrorBoundary';
import MobileControls from '../components/MobileControls';
import R3FErrorBoundary from '../components/R3FErrorBoundary';

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    position: 'relative' as const,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#ffffff',
    zIndex: 1000,
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '5px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '50%',
    borderTopColor: '#ffffff',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '20px',
    fontSize: '18px',
    fontWeight: 'bold' as const,
  },
  errorContainer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#ffffff',
    zIndex: 1000,
    padding: '20px',
    textAlign: 'center' as const,
  },
  errorIcon: {
    fontSize: '48px',
    color: '#ff5555',
    marginBottom: '20px',
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: 'bold' as const,
    marginBottom: '10px',
  },
  errorMessage: {
    fontSize: '16px',
    marginBottom: '20px',
    maxWidth: '600px',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'background-color 0.2s',
  },
  backButton: {
    position: 'absolute' as const,
    top: '20px',
    left: '20px',
    zIndex: 100,
    padding: '10px 20px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  crosshairContainer: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none' as const,
    zIndex: 10000,
    display: 'block',
  },
};

// Add a keyframes style for the spinner
const spinnerKeyframes = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

const WorldViewer = () => {
  const { worldId } = useParams<{ worldId: string }>();
  const navigate = useNavigate();
  const [world, setWorld] = useState<World | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  useEffect(() => {
    // Add the keyframes to the document
    const styleElement = document.createElement('style');
    styleElement.innerHTML = spinnerKeyframes;
    document.head.appendChild(styleElement);

    // Cleanup
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  useEffect(() => {
    const loadWorld = async () => {
      if (!worldId) {
        setError('No world ID provided');
        setLoading(false);
        return;
      }

      try {
        // Get world service instance
        const worldService = getWorldServiceInstance();
        
        // Get the world data
        const worldData = worldService.getWorld(worldId);
        
        if (!worldData) {
          console.error(`World not found: ${worldId}`);
          setError(`World not found: ${worldId}`);
          setLoading(false);
          return;
        }
        
        console.log('Loaded world:', worldData);
        setWorld(worldData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading world:', error);
        setError(`Error loading world: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    loadWorld();
  }, [worldId]);

  // Add pointer lock detection
  useEffect(() => {
    const handlePointerLockChange = () => {
      setIsPointerLocked(!!document.pointerLockElement);
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, []);

  const handleBackClick = () => {
    navigate('/');
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    window.location.reload();
  };

  const handleGoToAdmin = () => {
    navigate('/admin');
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <div style={styles.loadingText}>Loading World...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2 style={styles.errorTitle}>Error Loading World</h2>
          <p style={styles.errorMessage}>{error}</p>
          <div>
            <button style={styles.button} onClick={handleRetry}>Retry</button>
            <button style={{...styles.button, marginLeft: '10px'}} onClick={handleBackClick}>Return Home</button>
            <button style={{...styles.button, marginLeft: '10px', backgroundColor: '#10b981'}} onClick={handleGoToAdmin}>Go to Admin</button>
          </div>
        </div>
      </div>
    );
  }

  if (!world) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2 style={styles.errorTitle}>World Not Found</h2>
          <p style={styles.errorMessage}>
            The world you're trying to view doesn't exist or hasn't been created yet.
          </p>
          <div>
            <button style={styles.button} onClick={handleBackClick}>Return Home</button>
            <button style={{...styles.button, marginLeft: '10px', backgroundColor: '#10b981'}} onClick={handleGoToAdmin}>Go to Admin</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div style={styles.container}>
        {!isPointerLocked && (
          <button style={styles.backButton} onClick={handleBackClick}>
            ← Back to Home
          </button>
        )}
        
        <R3FErrorBoundary fallback={<mesh><boxGeometry args={[1,1,0.1]}/><meshStandardMaterial color="purple"/></mesh>}>
          <Scene worldId={worldId!} />
        </R3FErrorBoundary>
        
        <div style={styles.crosshairContainer}>
          {!isPointerLocked && <Crosshair />}
        </div>
        
        {/* Temporarily disable MobileControls for testing */}
        {/* <MobileControls /> */}
      </div>
    </ErrorBoundary>
  );
};

export default WorldViewer; 