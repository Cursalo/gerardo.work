import React, { useState } from 'react';
import { projectService } from '../services/projectService';

const ReloadButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleReload = async () => {
    try {
      setIsLoading(true);
      console.log('Force reloading all project data from disk...');
      
      // Clear localStorage cache
      localStorage.removeItem('portfolio_projects');
      localStorage.removeItem('portfolio_worlds');
      
      // Clear browser cache for project data
      if ('caches' in window) {
        try {
          const cacheNames = await window.caches.keys();
          for (const cacheName of cacheNames) {
            console.log(`Clearing cache: ${cacheName}`);
            await window.caches.delete(cacheName);
          }
          console.log('All caches cleared');
        } catch (cacheError) {
          console.error('Error clearing cache:', cacheError);
        }
      }
      
      // Force reload all project data from disk
      await projectService.forceReloadProjectsFromDisk();
      
      console.log('Project data reload complete!');
      
      // Force page reload to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error('Error reloading project data:', error);
      alert('Error reloading project data. Please try again or refresh the page manually.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <button
      onClick={handleReload}
      disabled={isLoading}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '8px 12px',
        backgroundColor: '#f44336',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: isLoading ? 'wait' : 'pointer',
        zIndex: 1000,
        fontSize: '14px',
        opacity: 0.8,
        transition: 'opacity 0.3s ease',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.opacity = '1';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.opacity = '0.8';
      }}
    >
      {isLoading ? 'Reloading...' : 'Reload Data'}
    </button>
  );
};

export default ReloadButton; 