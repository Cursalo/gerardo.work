import React, { useState, useEffect } from 'react';

interface StoredFile {
  dataUrl: string;
  [key: string]: any;
}

export const FileStorageDebugger: React.FC = () => {
  const [files, setFiles] = useState<Record<string, StoredFile>>({});
  const [projectFiles, setProjectFiles] = useState<string[]>([]);
  const [missingFiles, setMissingFiles] = useState<string[]>([]);

  useEffect(() => {
    // Load files from localStorage
    const storedFilesStr = localStorage.getItem('portfolio_files');
    let storedFiles: Record<string, StoredFile> = {};
    
    if (storedFilesStr) {
      try {
        storedFiles = JSON.parse(storedFilesStr);
        setFiles(storedFiles);
      } catch (e) {
        console.error('Error parsing portfolio_files:', e);
      }
    }

    // Check project thumbnails
    const projectsStr = localStorage.getItem('projects');
    if (projectsStr) {
      try {
        const projects = JSON.parse(projectsStr);
        const fileUrls: string[] = [];
        const missing: string[] = [];

        projects.forEach((project: any) => {
          if (project.thumbnail && project.thumbnail.startsWith('file://')) {
            const filename = project.thumbnail.replace('file://', '');
            fileUrls.push(filename);
            
            // Check if file exists in storage
            let found = false;
            
            // Direct match
            if (storedFiles[filename]) {
              found = true;
            } else {
              // Try partial matching
              const possibleMatch = Object.keys(storedFiles).find(key => 
                key.endsWith(filename) || filename.endsWith(key)
              );
              
              if (possibleMatch) {
                found = true;
              }
            }
            
            if (!found) {
              missing.push(filename);
            }
          }
        });
        
        setProjectFiles(fileUrls);
        setMissingFiles(missing);
      } catch (e) {
        console.error('Error parsing projects:', e);
      }
    }
  }, []);

  return (
    <div style={{
      padding: '20px',
      background: '#f5f5f5',
      borderRadius: '8px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>File Storage Debugger</h2>
      
      <div>
        <h3>Stored Files ({Object.keys(files).length})</h3>
        <ul style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #ddd', padding: '10px' }}>
          {Object.keys(files).map(key => (
            <li key={key}>
              {key} {files[key].dataUrl ? '✅' : '❌'}
            </li>
          ))}
        </ul>
      </div>
      
      <div>
        <h3>Project File References ({projectFiles.length})</h3>
        <ul style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #ddd', padding: '10px' }}>
          {projectFiles.map(file => (
            <li key={file}>
              {file}
            </li>
          ))}
        </ul>
      </div>
      
      <div>
        <h3>Missing Files ({missingFiles.length})</h3>
        {missingFiles.length > 0 ? (
          <ul style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #ddd', padding: '10px', background: '#ffecec' }}>
            {missingFiles.map(file => (
              <li key={file} style={{ color: 'red' }}>
                {file}
              </li>
            ))}
          </ul>
        ) : (
          <p>No missing files detected! 👍</p>
        )}
      </div>
      
      <button 
        onClick={() => {
          // Force a file storage verification by setting a flag
          localStorage.setItem('verify_file_storage', 'true');
          // Reload the page
          window.location.reload();
        }}
        style={{
          padding: '10px 15px',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        Verify & Fix File Storage
      </button>
    </div>
  );
};

export default FileStorageDebugger; 