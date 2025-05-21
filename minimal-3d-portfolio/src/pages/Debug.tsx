import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import FileStorageDebugger from '../components/admin/FileStorageDebugger';
import ThumbnailFixer from '../components/admin/ThumbnailFixer';

const Debug: React.FC = () => {
  const [activeTab, setActiveTab] = useState('thumbnail');

  const handleClearLocalStorage = () => {
    const confirmClear = window.confirm('This will ONLY clear temporary data like session info, but preserve your projects and files. Continue?');
    if (confirmClear) {
      // Keep only essential data
      const projectsData = localStorage.getItem('projects');
      const filesData = localStorage.getItem('portfolio_files');
      const worldsData = localStorage.getItem('worlds');
      
      // Clear all localStorage
      localStorage.clear();
      
      // Restore essential data
      if (projectsData) localStorage.setItem('projects', projectsData);
      if (filesData) localStorage.setItem('portfolio_files', filesData);
      if (worldsData) localStorage.setItem('worlds', worldsData);
      
      // Force reload
      window.location.reload();
    }
  };

  const handleFixAsyncMessageBug = () => {
    const confirmFix = window.confirm('This will apply a fix for the asynchronous message channel error. Continue?');
    if (confirmFix) {
      // Add an event listener handler to capture and properly handle navigate events
      const script = document.createElement('script');
      script.textContent = `
        // Fix for "message channel closed before response was received" error
        (function() {
          // Store existing handler if any
          const existingHandler = window.onmessage;
          
          // Replace with wrapper that ensures responses are always handled
          window.onmessage = function(event) {
            try {
              // Call existing handler if present
              if (existingHandler) existingHandler(event);
              
              // Ensure event is always "handled" even if there's an error
              if (event.data && event.data.type === 'navigate-to-subworld') {
                event.stopImmediatePropagation();
                return true; // Mark as handled
              }
            } catch (err) {
              console.error('Error in message handler:', err);
            }
          };
          
          // Also ensure the navigate-to-subworld event is properly handled
          window.addEventListener('navigate-to-subworld', function(event) {
            try {
              console.log('Navigation event handler attached');
            } catch (err) {
              console.error('Error in navigation event handler:', err);
            }
            return true; // Always mark as handled
          });
          
          console.log('Message channel error fix applied');
        })();
      `;
      document.head.appendChild(script);
      
      alert('Fix applied! Please reload the page if you still experience issues.');
    }
  };

  return (
    <div style={{
      padding: '40px',
      maxWidth: '1000px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif',
      color: '#333',
      backgroundColor: '#f9f9f9',
      minHeight: '100vh'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h1>Portfolio Debug Tools</h1>
        <Link 
          to="/" 
          style={{
            padding: '10px 15px',
            background: '#333',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          Return to Portfolio
        </Link>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <p>Use these tools to debug and fix issues with your portfolio.</p>
        
        <div style={{ 
          display: 'flex', 
          gap: '10px',
          marginBottom: '20px'
        }}>
          <button
            onClick={() => setActiveTab('thumbnail')}
            style={{
              padding: '10px 15px',
              background: activeTab === 'thumbnail' ? '#2196F3' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Thumbnail Fixer
          </button>
          
          <button
            onClick={() => setActiveTab('storage')}
            style={{
              padding: '10px 15px',
              background: activeTab === 'storage' ? '#2196F3' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            File Storage Debugger
          </button>
          
          <button
            onClick={() => setActiveTab('fixes')}
            style={{
              padding: '10px 15px',
              background: activeTab === 'fixes' ? '#2196F3' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Common Fixes
          </button>
        </div>
        
        {activeTab === 'thumbnail' && (
          <ThumbnailFixer />
        )}
        
        {activeTab === 'storage' && (
          <FileStorageDebugger />
        )}
        
        {activeTab === 'fixes' && (
          <div style={{
            padding: '20px',
            background: '#f5f5f5',
            borderRadius: '8px',
            border: '1px solid #ddd'
          }}>
            <h2>Common Fixes</h2>
            
            <div style={{
              marginBottom: '20px',
              padding: '15px',
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #eee'
            }}>
              <h3>Async Message Channel Error</h3>
              <p>Fixes the error: "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received"</p>
              <button
                onClick={handleFixAsyncMessageBug}
                style={{
                  padding: '10px 15px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Apply Fix
              </button>
            </div>
            
            <div style={{
              padding: '15px',
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #eee'
            }}>
              <h3>Clear Temporary Data</h3>
              <p>Clears temporary localStorage data while preserving your projects and files.</p>
              <button
                onClick={handleClearLocalStorage}
                style={{
                  padding: '10px 15px',
                  background: '#FF5722',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Clear Temporary Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Debug; 