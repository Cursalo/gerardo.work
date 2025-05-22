import React from 'react';
import { projectService } from '../services/projectService';

interface CacheResetButtonProps {
  className?: string;
  buttonText?: string;
  style?: React.CSSProperties;
}

/**
 * A button component that resets the cache and forces a reload
 * Useful for development and troubleshooting
 */
const CacheResetButton: React.FC<CacheResetButtonProps> = ({ 
  className = '',
  buttonText = 'Reset Cache & Reload',
  style = {}
}) => {
  
  const handleResetCache = () => {
    // Clear localStorage
    localStorage.removeItem('portfolio_projects');
    localStorage.removeItem('portfolio_projects_backup');
    localStorage.removeItem('portfolio_projects_version');
    localStorage.removeItem('portfolio_worlds');
    
    // Force reload from disk via the projectService
    projectService.forceReloadProjectsFromDisk().then(() => {
      // After reload is complete, refresh the page
      window.location.reload();
    }).catch(error => {
      console.error('Error reloading projects:', error);
      // Refresh anyway
      window.location.reload();
    });
  };
  
  return (
    <button
      onClick={handleResetCache}
      className={className}
      style={{
        padding: '8px 12px',
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        ...style
      }}
    >
      {buttonText}
    </button>
  );
};

export default CacheResetButton; 