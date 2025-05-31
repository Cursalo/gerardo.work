import React, { useState, useEffect } from 'react';
import { MobileMediaDebugger } from '../utils/mobileMediaDebug';
import { projectDataService } from '../services/projectDataService';

interface MediaDebugPanelProps {
  enabled: boolean;
}

/**
 * Development-only component for debugging mobile media loading
 * Only shown when NODE_ENV === 'development' and enabled prop is true
 */
export const MediaDebugPanel: React.FC<MediaDebugPanelProps> = ({ enabled }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);

  // Only render in development mode and when enabled
  if (process.env.NODE_ENV !== 'development' || !enabled) {
    return null;
  }

  useEffect(() => {
    // Load available projects for testing
    const loadProjects = async () => {
      try {
        const allProjects = await projectDataService.getAllProjects();
        setProjects(allProjects);
        if (allProjects.length > 0) {
          setSelectedProject(allProjects[0].id.toString());
        }
      } catch (error) {
        console.error('Failed to load projects for debugging:', error);
      }
    };

    loadProjects();
  }, []);

  const runMediaTest = async () => {
    if (!selectedProject) return;

    setIsLoading(true);
    const mediaDebugger = MobileMediaDebugger.getInstance();
    mediaDebugger.clearResults();

    try {
      const project = projects.find(p => p.id.toString() === selectedProject);
      if (project) {
        const results = await mediaDebugger.testProjectMedia(project);
        setTestResults(results);
        
        // Also log the report to console
        const report = mediaDebugger.generateMediaReport();
        console.log(report);
      }
    } catch (error) {
      console.error('Media test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testSingleUrl = async () => {
    const url = prompt('Enter a media URL to test:');
    if (!url) return;

    setIsLoading(true);
    const mediaDebugger = MobileMediaDebugger.getInstance();

    try {
      let result;
      if (url.includes('.mp4') || url.includes('.webm') || url.includes('.mov')) {
        result = await mediaDebugger.testVideoUrl(url);
      } else if (url.includes('.jpg') || url.includes('.png') || url.includes('.jpeg')) {
        result = await mediaDebugger.testImageUrl(url);
      } else {
        result = await mediaDebugger.testMediaUrl(url);
      }

      setTestResults([result]);
      console.log('Single URL test result:', result);
    } catch (error) {
      console.error('Single URL test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    MobileMediaDebugger.getInstance().clearResults();
  };

  if (!isVisible) {
    return (
      <div
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 10000,
          backgroundColor: '#007acc',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontFamily: 'monospace',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}
        onClick={() => setIsVisible(true)}
      >
        📱 Media Debug
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        width: '350px',
        maxHeight: '80vh',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        borderRadius: '8px',
        padding: '16px',
        zIndex: 10000,
        fontSize: '12px',
        fontFamily: 'monospace',
        overflow: 'auto',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          borderBottom: '1px solid #333',
          paddingBottom: '8px'
        }}
      >
        <strong>📱 Mobile Media Debugger</strong>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ×
        </button>
      </div>

      {/* Project Selection */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px' }}>
          Test Project:
        </label>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          style={{
            width: '100%',
            padding: '4px',
            backgroundColor: '#333',
            color: 'white',
            border: '1px solid #555',
            borderRadius: '4px'
          }}
        >
          {projects.map(project => (
            <option key={project.id} value={project.id.toString()}>
              {project.name} (ID: {project.id})
            </option>
          ))}
        </select>
      </div>

      {/* Control Buttons */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={runMediaTest}
          disabled={isLoading || !selectedProject}
          style={{
            padding: '6px 12px',
            backgroundColor: isLoading ? '#555' : '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '11px'
          }}
        >
          {isLoading ? 'Testing...' : 'Test Project Media'}
        </button>
        
        <button
          onClick={testSingleUrl}
          disabled={isLoading}
          style={{
            padding: '6px 12px',
            backgroundColor: isLoading ? '#555' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '11px'
          }}
        >
          Test Single URL
        </button>
        
        <button
          onClick={clearResults}
          style={{
            padding: '6px 12px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          Clear
        </button>
      </div>

      {/* Device Info */}
      <div style={{ marginBottom: '16px', fontSize: '10px', color: '#ccc' }}>
        <div>📱 Mobile: {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Yes' : 'No'}</div>
        <div>🖥️ Screen: {screen.width}×{screen.height}</div>
        <div>🪟 Viewport: {window.innerWidth}×{window.innerHeight}</div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div>
          <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
            Test Results ({testResults.length} URLs):
          </div>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {testResults.map((result, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '8px',
                  padding: '8px',
                  backgroundColor: result.status === 'success' ? '#1a4d1a' : '#4d1a1a',
                  borderRadius: '4px',
                  fontSize: '10px'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                  {result.status === 'success' ? '✅' : '❌'} 
                  {result.url.split('/').pop()}
                </div>
                
                <div style={{ opacity: 0.8, wordBreak: 'break-all' }}>
                  {result.url}
                </div>
                
                {result.status === 'success' ? (
                  <div style={{ color: '#90EE90', marginTop: '2px' }}>
                    Loaded in {result.loadTime}ms
                  </div>
                ) : (
                  <div style={{ color: '#FFB6C1', marginTop: '2px' }}>
                    Error: {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: '8px', fontSize: '10px', color: '#ccc' }}>
            Success Rate: {Math.round((testResults.filter(r => r.status === 'success').length / testResults.length) * 100)}%
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaDebugPanel; 