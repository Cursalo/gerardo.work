import React, { useState, useEffect } from 'react';

interface Project {
  id: number;
  name: string;
  thumbnail: string;
  [key: string]: any;
}

interface StoredFile {
  dataUrl: string;
  [key: string]: any;
}

export const ThumbnailFixer: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [files, setFiles] = useState<Record<string, StoredFile>>({});
  const [issues, setIssues] = useState<Array<{
    projectId: number;
    projectName: string;
    issue: string;
    fixAction?: () => void;
  }>>([]);
  const [isFixing, setIsFixing] = useState(false);
  const [fixedCount, setFixedCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Load projects
    const projectsStr = localStorage.getItem('projects');
    if (projectsStr) {
      try {
        const loadedProjects = JSON.parse(projectsStr);
        setProjects(loadedProjects);
      } catch (e) {
        console.error('Error parsing projects:', e);
      }
    }

    // Load files
    const filesStr = localStorage.getItem('portfolio_files');
    if (filesStr) {
      try {
        const loadedFiles = JSON.parse(filesStr);
        setFiles(loadedFiles);
      } catch (e) {
        console.error('Error parsing portfolio_files:', e);
      }
    }
  };

  useEffect(() => {
    if (projects.length > 0 && Object.keys(files).length > 0) {
      detectIssues();
    }
  }, [projects, files]);

  const detectIssues = () => {
    const projectIssues: Array<{
      projectId: number;
      projectName: string;
      issue: string;
      fixAction?: () => void;
    }> = [];

    projects.forEach(project => {
      // Check for missing thumbnails
      if (!project.thumbnail) {
        projectIssues.push({
          projectId: project.id,
          projectName: project.name,
          issue: 'No thumbnail URL set',
          fixAction: () => generateFallbackThumbnail(project.id)
        });
        return;
      }

      // Check file:// URLs
      if (project.thumbnail.startsWith('file://')) {
        const filename = project.thumbnail.replace('file://', '');
        
        // Check if file exists in storage
        if (!files[filename]) {
          // Try to find a partial match
          const possibleMatch = Object.keys(files).find(key => 
            key.endsWith(filename) || filename.endsWith(key)
          );
          
          if (possibleMatch) {
            projectIssues.push({
              projectId: project.id,
              projectName: project.name,
              issue: `File reference mismatch: ${filename} could be matched to ${possibleMatch}`,
              fixAction: () => updateThumbnailPath(project.id, `file://${possibleMatch}`)
            });
          } else {
            projectIssues.push({
              projectId: project.id,
              projectName: project.name,
              issue: `Missing file: ${filename} not found in storage`,
              fixAction: () => generateFallbackThumbnail(project.id)
            });
          }
        } else if (!files[filename].dataUrl) {
          projectIssues.push({
            projectId: project.id,
            projectName: project.name,
            issue: `File entry exists but has no dataUrl: ${filename}`,
            fixAction: () => generateFallbackThumbnail(project.id)
          });
        }
      }
      
      // Check picsum.photos URLs
      else if (project.thumbnail.includes('picsum.photos')) {
        projectIssues.push({
          projectId: project.id,
          projectName: project.name,
          issue: 'Using potentially unreliable picsum.photos URL',
          fixAction: () => generateFallbackThumbnail(project.id)
        });
      }

      // Check for broken YouTube URLs
      else if (
        (project.thumbnail.includes('youtube.com') || project.thumbnail.includes('youtu.be')) && 
        !project.thumbnail.includes('img.youtube.com/vi/')
      ) {
        projectIssues.push({
          projectId: project.id,
          projectName: project.name,
          issue: 'Using YouTube page URL instead of direct thumbnail URL',
          fixAction: () => fixYouTubeThumbnail(project.id)
        });
      }
    });

    setIssues(projectIssues);
  };

  const updateThumbnailPath = (projectId: number, newPath: string) => {
    const updatedProjects = projects.map(project => {
      if (project.id === projectId) {
        return { ...project, thumbnail: newPath };
      }
      return project;
    });
    
    saveProjects(updatedProjects);
  };

  const generateFallbackThumbnail = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    // Generate a colorful SVG as fallback
    const hue = (projectId * 37) % 360;
    const svgDataUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='hsl(${hue}, 80%25, 80%25)' /%3E%3Ctext x='160' y='90' font-family='Arial' font-size='16' text-anchor='middle' alignment-baseline='middle' fill='%23333'%3E${encodeURIComponent(project.name)}%3C/text%3E%3C/svg%3E`;
    
    updateThumbnailPath(projectId, svgDataUrl);
  };

  const fixYouTubeThumbnail = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.thumbnail) return;
    
    try {
      // Extract video ID from various YouTube URL formats
      let videoId = '';
      
      if (project.thumbnail.includes('v=')) {
        videoId = project.thumbnail.split('v=')[1];
        const ampersandPosition = videoId.indexOf('&');
        if (ampersandPosition !== -1) {
          videoId = videoId.substring(0, ampersandPosition);
        }
      } else if (project.thumbnail.includes('youtu.be/')) {
        videoId = project.thumbnail.split('youtu.be/')[1];
      } else if (project.thumbnail.includes('embed/')) {
        videoId = project.thumbnail.split('embed/')[1];
      }
      
      if (videoId) {
        // Use reliable thumbnail format
        updateThumbnailPath(projectId, `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
      } else {
        // Couldn't parse video ID, use fallback
        generateFallbackThumbnail(projectId);
      }
    } catch (error) {
      console.error('Error fixing YouTube thumbnail:', error);
      generateFallbackThumbnail(projectId);
    }
  };

  const saveProjects = (updatedProjects: Project[]) => {
    setProjects(updatedProjects);
    localStorage.setItem('projects', JSON.stringify(updatedProjects));
  };

  const fixAllIssues = async () => {
    setIsFixing(true);
    setFixedCount(0);
    
    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      if (issue.fixAction) {
        issue.fixAction();
        setFixedCount(prev => prev + 1);
        
        // Small delay to avoid overwhelming localStorage with rapid updates
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Reload data to update issues list
    loadData();
    setIsFixing(false);
  };

  return (
    <div style={{
      padding: '20px',
      background: '#f5f5f5',
      borderRadius: '8px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>Thumbnail Fixer</h2>
      
      <div>
        <h3>Detected Issues ({issues.length})</h3>
        
        {issues.length > 0 ? (
          <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #ddd', padding: '10px' }}>
            {issues.map((issue, index) => (
              <div key={index} style={{ 
                marginBottom: '10px', 
                padding: '10px', 
                background: 'white', 
                borderRadius: '4px',
                border: '1px solid #eee'
              }}>
                <div><strong>Project:</strong> {issue.projectName} (ID: {issue.projectId})</div>
                <div><strong>Issue:</strong> {issue.issue}</div>
                <button 
                  onClick={() => issue.fixAction && issue.fixAction()}
                  disabled={isFixing}
                  style={{
                    padding: '5px 10px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginTop: '5px'
                  }}
                >
                  Fix This Issue
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>No thumbnail issues detected! 👍</p>
        )}
      </div>
      
      {issues.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={fixAllIssues}
            disabled={isFixing}
            style={{
              padding: '10px 15px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {isFixing ? `Fixing Issues (${fixedCount}/${issues.length})...` : 'Fix All Issues'}
          </button>
          
          <p>
            <small>This will generate reliable fallbacks for all problematic thumbnails.</small>
          </p>
        </div>
      )}
      
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 15px',
            background: '#607D8B',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reload Page
        </button>
      </div>
    </div>
  );
};

export default ThumbnailFixer; 