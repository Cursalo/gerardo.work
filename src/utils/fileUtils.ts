/**
 * File utilities for handling different file types and MIME type issues
 * Especially useful for GitHub Pages deployments
 */

export interface FileTypeInfo {
  type: 'pdf' | 'image' | 'video' | 'audio' | 'document' | 'html' | 'unknown';
  mimeType: string;
  extension: string;
  needsSpecialHandling: boolean;
}

/**
 * Detect file type from URL or filename
 */
export function detectFileType(url: string): FileTypeInfo {
  const cleanUrl = url.toLowerCase();
  const extension = cleanUrl.split('.').pop() || '';
  
  // PDF files
  if (extension === 'pdf') {
    return {
      type: 'pdf',
      mimeType: 'application/pdf',
      extension: 'pdf',
      needsSpecialHandling: true // GitHub Pages often serves with wrong MIME type
    };
  }
  
  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(extension)) {
    return {
      type: 'image',
      mimeType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
      extension,
      needsSpecialHandling: true // GitHub Pages MIME type issues
    };
  }
  
  // Video files
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'ogg'].includes(extension)) {
    return {
      type: 'video',
      mimeType: `video/${extension}`,
      extension,
      needsSpecialHandling: true // GitHub Pages MIME type issues
    };
  }
  
  // Audio files
  if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(extension)) {
    return {
      type: 'audio',
      mimeType: `audio/${extension}`,
      extension,
      needsSpecialHandling: true
    };
  }
  
  // HTML files
  if (['html', 'htm'].includes(extension)) {
    return {
      type: 'html',
      mimeType: 'text/html',
      extension,
      needsSpecialHandling: true // GitHub Pages MIME type issues
    };
  }
  
  // Document files
  if (['doc', 'docx', 'txt', 'rtf'].includes(extension)) {
    return {
      type: 'document',
      mimeType: 'application/octet-stream',
      extension,
      needsSpecialHandling: true
    };
  }
  
  return {
    type: 'unknown',
    mimeType: 'application/octet-stream',
    extension,
    needsSpecialHandling: true
  };
}

/**
 * Clean and normalize URL for GitHub Pages
 */
export function normalizeUrl(url: string): string {
  if (!url) return url;
  
  // If it's already a full URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Ensure it starts with /
  return url.startsWith('/') ? url : `/${url}`;
}

/**
 * Open file with appropriate viewer based on file type and GitHub Pages compatibility
 */
export function openFileWithViewer(url: string, title?: string): void {
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  const fileInfo = detectFileType(url);
  const fullUrl = window.location.origin + cleanUrl;
  
  console.log(`🔗 Opening ${fileInfo.type} file:`, cleanUrl, 'detected as:', fileInfo);
  
  switch (fileInfo.type) {
    case 'pdf':
      // Use PDF.js viewer for reliable PDF rendering
      const pdfViewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(fullUrl)}`;
      const pdfWindow = window.open(pdfViewerUrl, '_blank');
      
      // Fallback after 3 seconds if PDF.js fails
      setTimeout(() => {
        if (pdfWindow && pdfWindow.closed) {
          console.log('PDF.js viewer failed, trying direct URL...');
          window.open(fullUrl, '_blank');
        }
      }, 3000);
      break;
      
    case 'image':
      // Create an image viewer HTML page to force proper display
      const imageViewerHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title || 'Image Viewer'}</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              background: #000; 
              display: flex; 
              justify-content: center; 
              align-items: center;
              min-height: 100vh;
              font-family: Arial, sans-serif;
            }
            img { 
              max-width: 100%; 
              max-height: 100vh; 
              object-fit: contain;
              box-shadow: 0 4px 20px rgba(255,255,255,0.1);
            }
            .error {
              color: white;
              text-align: center;
            }
            .download-link {
              color: #4CAF50;
              text-decoration: none;
              margin-top: 20px;
              display: inline-block;
            }
          </style>
        </head>
        <body>
          <div>
            <img src="${fullUrl}" alt="${title || 'Image'}" onerror="this.style.display='none'; document.querySelector('.error').style.display='block';" />
            <div class="error" style="display: none;">
              <h2>Unable to display image</h2>
              <p>This might be due to server MIME type issues.</p>
              <a href="${fullUrl}" class="download-link" target="_blank">Download Image</a>
            </div>
          </div>
        </body>
        </html>
      `;
      
      const imageBlob = new Blob([imageViewerHtml], { type: 'text/html' });
      const imageViewerUrl = URL.createObjectURL(imageBlob);
      window.open(imageViewerUrl, '_blank');
      break;
      
    case 'video':
      // Create a video player HTML page to force proper playback
      const videoViewerHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title || 'Video Player'}</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              background: #000; 
              display: flex; 
              justify-content: center; 
              align-items: center;
              min-height: 100vh;
              font-family: Arial, sans-serif;
            }
            video { 
              max-width: 100%; 
              max-height: 100vh; 
              box-shadow: 0 4px 20px rgba(255,255,255,0.1);
            }
            .error {
              color: white;
              text-align: center;
            }
            .download-link {
              color: #4CAF50;
              text-decoration: none;
              margin-top: 20px;
              display: inline-block;
            }
          </style>
        </head>
        <body>
          <div>
            <video controls preload="metadata" onerror="this.style.display='none'; document.querySelector('.error').style.display='block';">
              <source src="${fullUrl}" type="video/${fileInfo.extension}">
              <source src="${fullUrl}" type="video/mp4">
              <source src="${fullUrl}">
              Your browser does not support the video tag.
            </video>
            <div class="error" style="display: none;">
              <h2>Unable to play video</h2>
              <p>This might be due to server MIME type issues or unsupported format.</p>
              <a href="${fullUrl}" class="download-link" target="_blank">Download Video</a>
            </div>
          </div>
        </body>
        </html>
      `;
      
      const videoBlob = new Blob([videoViewerHtml], { type: 'text/html' });
      const videoViewerUrl = URL.createObjectURL(videoBlob);
      window.open(videoViewerUrl, '_blank');
      break;
      
    case 'html':
      // Create an iframe viewer for HTML files to avoid MIME type issues
      const htmlViewerHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title || 'HTML Viewer'}</title>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              font-family: Arial, sans-serif;
            }
            iframe { 
              width: 100vw; 
              height: 100vh; 
              border: none;
            }
            .error {
              padding: 20px;
              text-align: center;
              color: #666;
            }
            .download-link {
              color: #4CAF50;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <iframe src="${fullUrl}" onload="console.log('HTML loaded successfully')" onerror="this.style.display='none'; document.querySelector('.error').style.display='block';"></iframe>
          <div class="error" style="display: none;">
            <h2>Unable to display HTML</h2>
            <p>This might be due to server MIME type issues.</p>
            <a href="${fullUrl}" class="download-link" target="_blank">View Source</a>
          </div>
        </body>
        </html>
      `;
      
      const htmlBlob = new Blob([htmlViewerHtml], { type: 'text/html' });
      const htmlViewerUrl = URL.createObjectURL(htmlBlob);
      window.open(htmlViewerUrl, '_blank');
      break;
      
    default:
      // For unknown types, try direct opening with fallback to download
      const unknownWindow = window.open(fullUrl, '_blank');
      
      // Fallback: offer download if direct opening shows raw content
      setTimeout(() => {
        if (unknownWindow && !unknownWindow.closed) {
          console.log('Unknown file type opened, user may need to download if content displays incorrectly');
        }
      }, 1000);
      break;
  }
}

/**
 * Force download a file
 */
export function downloadFile(url: string, filename: string): void {
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = filename;
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

/**
 * Check if URL is external (starts with http/https or contains domain)
 */
export function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || 
         url.startsWith('https://') || 
         url.includes('youtube.com') || 
         url.includes('youtu.be') ||
         url.includes('vimeo.com') ||
         url.includes('soundcloud.com');
}

/**
 * Get file size from URL (if possible)
 */
export async function getFileSize(url: string): Promise<string> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    
    if (contentLength) {
      const bytes = parseInt(contentLength);
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
      return `${Math.round(bytes / 1048576)} MB`;
    }
    
    return 'Unknown size';
  } catch {
    return 'Unknown size';
  }
} 