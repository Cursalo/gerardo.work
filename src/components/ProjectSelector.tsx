import React, { useState, useEffect } from 'react';
import { projectDataService } from '../services/projectDataService';

interface ProjectSelectorProps {
  isVisible: boolean;
  onClose: () => void;
}

/**
 * ProjectSelector component for mobile navigation
 * Allows users to quickly navigate to any project world
 */
export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ isVisible, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');

  useEffect(() => {
    // Load available projects
    const loadProjects = async () => {
      try {
        const allProjects = await projectDataService.getAllProjects();
        setProjects(allProjects);
        if (allProjects.length > 0) {
          setSelectedProject(allProjects[0].id.toString());
        }
      } catch (error) {
        console.error('Failed to load projects for selector:', error);
      }
    };

    if (isVisible) {
      loadProjects();
    }
  }, [isVisible]);

  const navigateToProject = async () => {
    if (!selectedProject) return;

    setIsLoading(true);
    try {
      const project = projects.find(p => p.id.toString() === selectedProject);
      if (project) {
        console.log(`ProjectSelector: Navigating to project: ${project.name}`);
        
        // FIXED: Navigate to project URL instead of just setting internal state
        // Use the same URL pattern as other components
        const projectSlug = project.customLink || project.name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        
        const targetUrl = `/project/${projectSlug}`;
        console.log(`ProjectSelector: Navigating to URL: ${targetUrl}`);
        
        // Close the selector first
        onClose();
        
        // Navigate to the project URL
        window.location.href = targetUrl;
      }
    } catch (error) {
      console.error('ProjectSelector: Navigation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '60px',
        left: '10px',
        width: '280px',
        maxHeight: '70vh',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        color: '#333',
        borderRadius: '10px',
        padding: '15px',
        zIndex: 1003,
        fontSize: '14px',
        fontFamily: 'Helvetica, Arial, sans-serif',
        overflow: 'auto',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(77, 255, 170, 0.3)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          borderBottom: '1px solid rgba(77, 255, 170, 0.3)',
          paddingBottom: '8px'
        }}
      >
        <strong style={{ fontSize: '16px' }}>🚀 Project Navigator</strong>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#333',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      </div>

      {/* Project Selection */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Select Project:
        </label>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: 'white',
            color: '#333',
            border: '1px solid rgba(77, 255, 170, 0.5)',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        >
          {projects.map(project => (
            <option key={project.id} value={project.id.toString()}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* Project Info */}
      {selectedProject && (
        <div style={{ marginBottom: '16px' }}>
          {(() => {
            const project = projects.find(p => p.id.toString() === selectedProject);
            if (!project) return null;
            
            return (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'rgba(77, 255, 170, 0.1)',
                  borderRadius: '6px',
                  border: '1px solid rgba(77, 255, 170, 0.3)'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {project.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  {project.description}
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  Status: {project.status} • Type: {project.type}
                  {project.mediaObjects && (
                    <span> • Media: {project.mediaObjects.length} items</span>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Navigation Button */}
      <button
        onClick={navigateToProject}
        disabled={isLoading || !selectedProject}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: isLoading ? '#ccc' : 'rgba(77, 255, 170, 0.8)',
          color: isLoading ? '#666' : '#333',
          border: 'none',
          borderRadius: '8px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
          boxShadow: isLoading ? 'none' : '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        {isLoading ? 'Navigating...' : '🎯 Go to Project'}
      </button>

      {/* Info */}
      <div style={{ 
        marginTop: '12px', 
        fontSize: '11px', 
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic'
      }}>
        Navigate directly to any project world
      </div>
    </div>
  );
};

export default ProjectSelector; 