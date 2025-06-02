/**
 * File utilities for handling different file types and MIME type issues
 * Especially useful for GitHub Pages deployments
 */

export interface FileTypeInfo {
  type: 'pdf' | 'image' | 'video' | 'audio' | 'document' | 'unknown';
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
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) {
    return {
      type: 'image',
      mimeType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
      extension,
      needsSpecialHandling: false
    };
  }
  
  // Video files
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'ogg'].includes(extension)) {
    return {
      type: 'video',
      mimeType: `video/${extension}`,
      extension,
      needsSpecialHandling: true // May need special handling for large files
    };
  }
  
  // Audio files
  if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(extension)) {
    return {
      type: 'audio',
      mimeType: `audio/${extension}`,
      extension,
      needsSpecialHandling: false
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
 * Open file with appropriate viewer based on type
 */
export function openFileWithViewer(url: string, title: string = 'file'): void {
  const fileInfo = detectFileType(url);
  const cleanUrl = normalizeUrl(url);
  const fullUrl = cleanUrl.startsWith('http') ? cleanUrl : window.location.origin + cleanUrl;
  
  switch (fileInfo.type) {
    case 'pdf':
      // Use PDF.js viewer for reliable PDF rendering
      const pdfViewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(fullUrl)}`;
      const pdfWindow = window.open(pdfViewerUrl, '_blank');
      
      // Fallback to direct URL if PDF.js fails
      if (!pdfWindow) {
        console.log('PDF.js viewer blocked, trying direct URL...');
        window.open(cleanUrl, '_blank');
      }
      break;
      
    case 'image':
      // Images usually work fine with direct opening
      const imgWindow = window.open(cleanUrl, '_blank');
      if (!imgWindow) {
        // Fallback to download
        downloadFile(cleanUrl, title + '.' + fileInfo.extension);
      }
      break;
      
    case 'video':
      // Videos may need special handling
      const videoWindow = window.open(cleanUrl, '_blank');
      if (!videoWindow) {
        downloadFile(cleanUrl, title + '.' + fileInfo.extension);
      }
      break;
      
    default:
      // For other file types, try direct opening with download fallback
      const defaultWindow = window.open(cleanUrl, '_blank');
      if (!defaultWindow) {
        downloadFile(cleanUrl, title + '.' + fileInfo.extension);
      }
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
 * Check if URL is external
 */
export function isExternalUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.origin !== window.location.origin;
  } catch {
    return false;
  }
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