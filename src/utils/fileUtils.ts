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
      // Fetch the image as raw data and serve with correct MIME type
      fetchAndViewImage(fullUrl, title || 'Image');
      break;
      
    case 'video':
      // Fetch the video as raw data and serve with correct MIME type
      fetchAndViewVideo(fullUrl, title || 'Video', fileInfo.mimeType);
      break;
      
    case 'html':
      // Fetch HTML content and display it properly
      fetchAndViewHtml(fullUrl, title || 'HTML Document');
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
 * Fetch image content and display with correct MIME type
 */
async function fetchAndViewImage(url: string, title: string): Promise<void> {
  try {
    console.log('🖼️ Fetching image content:', url);
    
    // Show loading indicator
    const loadingWindow = window.open('', '_blank');
    if (loadingWindow) {
      loadingWindow.document.write(`
        <html>
          <head><title>Loading ${title}...</title></head>
          <body style="background: #000; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial;">
            <div style="text-align: center;">
              <div style="border: 3px solid #4CAF50; border-radius: 50%; border-top: 3px solid transparent; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
              <p>Loading ${title}...</p>
            </div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
          </body>
        </html>
      `);
    }
    
    // Fetch the image content
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    
    const blob = await response.blob();
    const fileInfo = detectFileType(url);
    
    // Create blob with correct MIME type
    const correctBlob = new Blob([blob], { type: fileInfo.mimeType });
    const blobUrl = URL.createObjectURL(correctBlob);
    
    // Create image viewer with corrected blob URL
    const imageViewerHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
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
          .controls {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            padding: 10px;
            border-radius: 5px;
          }
          .download-btn {
            color: #4CAF50;
            text-decoration: none;
            padding: 5px 10px;
            border: 1px solid #4CAF50;
            border-radius: 3px;
            font-size: 12px;
          }
          .download-btn:hover {
            background: #4CAF50;
            color: white;
          }
        </style>
      </head>
      <body>
        <div class="controls">
          <a href="${url}" class="download-btn" download="${title}">Download Original</a>
        </div>
        <img src="${blobUrl}" alt="${title}" />
        <script>
          // Cleanup blob URL when page unloads
          window.addEventListener('beforeunload', () => {
            URL.revokeObjectURL('${blobUrl}');
          });
        </script>
      </body>
      </html>
    `;
    
    if (loadingWindow) {
      loadingWindow.document.open();
      loadingWindow.document.write(imageViewerHtml);
      loadingWindow.document.close();
    }
    
  } catch (error) {
    console.error('Error fetching image:', error);
    
    // Fallback to simple viewer with download option
    const fallbackHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Error - ${title}</title></head>
      <body style="background: #000; color: white; text-align: center; padding: 50px; font-family: Arial;">
        <h2>Unable to load image</h2>
        <p>The image couldn't be loaded due to server issues.</p>
        <a href="${url}" style="color: #4CAF50; text-decoration: none; padding: 10px 20px; border: 1px solid #4CAF50; border-radius: 5px;" download="${title}">Download Image</a>
      </body>
      </html>
    `;
    
    const errorWindow = window.open('', '_blank');
    if (errorWindow) {
      errorWindow.document.write(fallbackHtml);
    }
  }
}

/**
 * Fetch video content and display with correct MIME type
 */
async function fetchAndViewVideo(url: string, title: string, mimeType: string): Promise<void> {
  try {
    console.log('🎥 Fetching video content:', url);
    
    // Show loading indicator
    const loadingWindow = window.open('', '_blank');
    if (loadingWindow) {
      loadingWindow.document.write(`
        <html>
          <head><title>Loading ${title}...</title></head>
          <body style="background: #000; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial;">
            <div style="text-align: center;">
              <div style="border: 3px solid #4CAF50; border-radius: 50%; border-top: 3px solid transparent; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
              <p>Loading ${title}...</p>
            </div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
          </body>
        </html>
      `);
    }
    
    // Fetch the video content
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    
    const blob = await response.blob();
    
    // Create blob with correct MIME type
    const correctBlob = new Blob([blob], { type: mimeType });
    const blobUrl = URL.createObjectURL(correctBlob);
    
    // Create video player with corrected blob URL
    const videoViewerHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
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
          .controls {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            padding: 10px;
            border-radius: 5px;
          }
          .download-btn {
            color: #4CAF50;
            text-decoration: none;
            padding: 5px 10px;
            border: 1px solid #4CAF50;
            border-radius: 3px;
            font-size: 12px;
          }
          .download-btn:hover {
            background: #4CAF50;
            color: white;
          }
        </style>
      </head>
      <body>
        <div class="controls">
          <a href="${url}" class="download-btn" download="${title}">Download Original</a>
        </div>
        <video controls preload="metadata">
          <source src="${blobUrl}" type="${mimeType}">
          Your browser does not support the video tag.
        </video>
        <script>
          // Cleanup blob URL when page unloads
          window.addEventListener('beforeunload', () => {
            URL.revokeObjectURL('${blobUrl}');
          });
        </script>
      </body>
      </html>
    `;
    
    if (loadingWindow) {
      loadingWindow.document.open();
      loadingWindow.document.write(videoViewerHtml);
      loadingWindow.document.close();
    }
    
  } catch (error) {
    console.error('Error fetching video:', error);
    
    // Fallback to download option
    const fallbackHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Error - ${title}</title></head>
      <body style="background: #000; color: white; text-align: center; padding: 50px; font-family: Arial;">
        <h2>Unable to load video</h2>
        <p>The video couldn't be loaded due to server issues.</p>
        <a href="${url}" style="color: #4CAF50; text-decoration: none; padding: 10px 20px; border: 1px solid #4CAF50; border-radius: 5px;" download="${title}">Download Video</a>
      </body>
      </html>
    `;
    
    const errorWindow = window.open('', '_blank');
    if (errorWindow) {
      errorWindow.document.write(fallbackHtml);
    }
  }
}

/**
 * Fetch HTML content and display it properly
 */
async function fetchAndViewHtml(url: string, title: string): Promise<void> {
  try {
    console.log('📄 Fetching HTML content:', url);
    
    // Show loading indicator
    const loadingWindow = window.open('', '_blank');
    if (loadingWindow) {
      loadingWindow.document.write(`
        <html>
          <head><title>Loading ${title}...</title></head>
          <body style="background: #f5f5f5; color: #333; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial;">
            <div style="text-align: center;">
              <div style="border: 3px solid #4CAF50; border-radius: 50%; border-top: 3px solid transparent; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
              <p>Loading ${title}...</p>
            </div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
          </body>
        </html>
      `);
    }
    
    // Fetch the HTML content
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    
    const htmlContent = await response.text();
    
    if (loadingWindow) {
      loadingWindow.document.open();
      loadingWindow.document.write(htmlContent);
      loadingWindow.document.close();
    }
    
  } catch (error) {
    console.error('Error fetching HTML:', error);
    
    // Fallback to iframe with download option
    const fallbackHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
          .header { background: #333; color: white; padding: 10px; text-align: center; }
          iframe { width: 100%; height: calc(100vh - 50px); border: none; }
          .download-btn { color: #4CAF50; text-decoration: none; margin-left: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          ${title}
          <a href="${url}" class="download-btn" download="${title}">Download Source</a>
        </div>
        <iframe src="${url}"></iframe>
      </body>
      </html>
    `;
    
    const errorWindow = window.open('', '_blank');
    if (errorWindow) {
      errorWindow.document.write(fallbackHtml);
    }
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