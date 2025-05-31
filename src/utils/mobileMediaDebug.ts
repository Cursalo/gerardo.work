/**
 * Mobile Media Debug Utility
 * Comprehensive debugging and verification system for media loading across devices
 */

interface MediaTestResult {
  url: string;
  status: 'success' | 'error' | 'loading';
  error?: string;
  loadTime?: number;
  isAccessible: boolean;
}

export class MobileMediaDebugger {
  private static instance: MobileMediaDebugger;
  private testResults: Map<string, MediaTestResult> = new Map();

  static getInstance(): MobileMediaDebugger {
    if (!MobileMediaDebugger.instance) {
      MobileMediaDebugger.instance = new MobileMediaDebugger();
    }
    return MobileMediaDebugger.instance;
  }

  /**
   * Test if a media URL is accessible from the current device
   */
  async testMediaUrl(url: string): Promise<MediaTestResult> {
    const startTime = Date.now();
    const result: MediaTestResult = {
      url,
      status: 'loading',
      isAccessible: false
    };

    try {
      // First, try a simple fetch to see if the resource exists
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'cors',
        cache: 'no-cache'
      });

      if (response.ok) {
        result.status = 'success';
        result.isAccessible = true;
        result.loadTime = Date.now() - startTime;
      } else {
        result.status = 'error';
        result.error = `HTTP ${response.status}: ${response.statusText}`;
        result.isAccessible = false;
      }
    } catch (error) {
      result.status = 'error';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.isAccessible = false;
    }

    this.testResults.set(url, result);
    return result;
  }

  /**
   * Test video loading specifically
   */
  async testVideoUrl(url: string): Promise<MediaTestResult> {
    const startTime = Date.now();
    const result: MediaTestResult = {
      url,
      status: 'loading',
      isAccessible: false
    };

    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onLoad);
        video.removeEventListener('error', onError);
        video.remove();
      };

      const onLoad = () => {
        result.status = 'success';
        result.isAccessible = true;
        result.loadTime = Date.now() - startTime;
        this.testResults.set(url, result);
        cleanup();
        resolve(result);
      };

      const onError = (error: any) => {
        result.status = 'error';
        result.error = `Video load error: ${error.type}`;
        result.isAccessible = false;
        this.testResults.set(url, result);
        cleanup();
        resolve(result);
      };

      video.addEventListener('loadedmetadata', onLoad);
      video.addEventListener('error', onError);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (result.status === 'loading') {
          result.status = 'error';
          result.error = 'Timeout after 10 seconds';
          result.isAccessible = false;
          this.testResults.set(url, result);
          cleanup();
          resolve(result);
        }
      }, 10000);

      video.src = url;
    });
  }

  /**
   * Test image loading specifically
   */
  async testImageUrl(url: string): Promise<MediaTestResult> {
    const startTime = Date.now();
    const result: MediaTestResult = {
      url,
      status: 'loading',
      isAccessible: false
    };

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const cleanup = () => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
      };

      const onLoad = () => {
        result.status = 'success';
        result.isAccessible = true;
        result.loadTime = Date.now() - startTime;
        this.testResults.set(url, result);
        cleanup();
        resolve(result);
      };

      const onError = (error: any) => {
        result.status = 'error';
        result.error = `Image load error: ${error.type}`;
        result.isAccessible = false;
        this.testResults.set(url, result);
        cleanup();
        resolve(result);
      };

      img.addEventListener('load', onLoad);
      img.addEventListener('error', onError);

      // Timeout after 5 seconds
      setTimeout(() => {
        if (result.status === 'loading') {
          result.status = 'error';
          result.error = 'Timeout after 5 seconds';
          result.isAccessible = false;
          this.testResults.set(url, result);
          cleanup();
          resolve(result);
        }
      }, 5000);

      img.src = url;
    });
  }

  /**
   * Test all media URLs from a project
   */
  async testProjectMedia(projectData: any): Promise<MediaTestResult[]> {
    const results: MediaTestResult[] = [];
    const urls: string[] = [];

    // Collect all media URLs from the project
    if (projectData.videoUrl) {
      urls.push(projectData.videoUrl);
    }

    if (projectData.thumbnail) {
      urls.push(projectData.thumbnail);
    }

    if (projectData.mediaObjects) {
      projectData.mediaObjects.forEach((media: any) => {
        if (media.url) {
          urls.push(media.url);
        }
        if (media.thumbnail) {
          urls.push(media.thumbnail);
        }
      });
    }

    if (projectData.assetGallery) {
      projectData.assetGallery.forEach((asset: any) => {
        if (asset.url) {
          urls.push(asset.url);
        }
      });
    }

    // Test each URL
    for (const url of urls) {
      try {
        let result: MediaTestResult;
        
        if (this.isVideoUrl(url)) {
          result = await this.testVideoUrl(url);
        } else if (this.isImageUrl(url)) {
          result = await this.testImageUrl(url);
        } else {
          result = await this.testMediaUrl(url);
        }
        
        results.push(result);
      } catch (error) {
        results.push({
          url,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          isAccessible: false
        });
      }
    }

    return results;
  }

  /**
   * Generate a comprehensive media report
   */
  generateMediaReport(): string {
    const deviceInfo = this.getDeviceInfo();
    const results = Array.from(this.testResults.values());
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    let report = `🔍 MOBILE MEDIA DEBUG REPORT\n`;
    report += `=====================================\n\n`;
    report += `📱 Device Information:\n`;
    report += `   User Agent: ${deviceInfo.userAgent}\n`;
    report += `   Is Mobile: ${deviceInfo.isMobile}\n`;
    report += `   Screen: ${deviceInfo.screenWidth}x${deviceInfo.screenHeight}\n`;
    report += `   Viewport: ${deviceInfo.viewportWidth}x${deviceInfo.viewportHeight}\n`;
    report += `   Connection: ${deviceInfo.connection}\n\n`;

    report += `📊 Test Results Summary:\n`;
    report += `   Total URLs tested: ${results.length}\n`;
    report += `   ✅ Successful: ${successCount}\n`;
    report += `   ❌ Failed: ${errorCount}\n`;
    report += `   Success Rate: ${results.length > 0 ? Math.round((successCount / results.length) * 100) : 0}%\n\n`;

    if (errorCount > 0) {
      report += `❌ Failed URLs:\n`;
      results.filter(r => r.status === 'error').forEach(result => {
        report += `   • ${result.url}\n`;
        report += `     Error: ${result.error}\n`;
      });
      report += `\n`;
    }

    if (successCount > 0) {
      report += `✅ Successful URLs:\n`;
      results.filter(r => r.status === 'success').forEach(result => {
        report += `   • ${result.url} (${result.loadTime}ms)\n`;
      });
    }

    return report;
  }

  /**
   * Get device and browser information
   */
  private getDeviceInfo() {
    const nav = navigator as any;
    return {
      userAgent: navigator.userAgent,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      connection: nav.connection ? `${nav.connection.effectiveType} (${nav.connection.downlink}Mbps)` : 'Unknown'
    };
  }

  /**
   * Check if URL is a video file
   */
  private isVideoUrl(url: string): boolean {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.ogg', '.avi'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext.toLowerCase()));
  }

  /**
   * Check if URL is an image file
   */
  private isImageUrl(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    return imageExtensions.some(ext => url.toLowerCase().includes(ext.toLowerCase()));
  }

  /**
   * Clear all test results
   */
  clearResults(): void {
    this.testResults.clear();
  }

  /**
   * Get all test results
   */
  getAllResults(): MediaTestResult[] {
    return Array.from(this.testResults.values());
  }
}

export default MobileMediaDebugger; 