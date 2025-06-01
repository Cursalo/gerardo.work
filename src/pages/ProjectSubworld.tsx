import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html, Text } from '@react-three/drei';
import { projectDataService, ProjectData } from '../services/projectDataService';
import { WorldObject } from '../data/worlds';
import * as THREE from 'three';

interface ProjectSubworldProps {}

// Enhanced MediaCard component that handles different media types
const MediaCard: React.FC<{ mediaObject: any; }> = ({ mediaObject }) => {
  const [hovered, setHovered] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Changed: Start with false, don't block rendering
  const [error, setError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1.5); // Changed: Better default aspect ratio
  const [dimensions, setDimensions] = useState({ width: 3.0, height: 2.0 }); // Changed: Larger default size
  const navigate = useNavigate();
  
  // Add refs for animation and geometry updates
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.BoxGeometry>(null);
  
  // Detect mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // WebP browser support detection
  const supportsWebP = (() => {
    try {
      return document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (err) {
      return false;
    }
  })();
  
  // Extract filename from URL to use as title
  const getFilenameFromUrl = (url: string): string => {
    if (!url) return 'Untitled';
    
    try {
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1];
      const nameWithoutExtension = filename.replace(/\.[^/.]+$/, '');
      const cleanName = nameWithoutExtension
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
      
      return cleanName;
    } catch (error) {
      console.warn('Error extracting filename from URL:', url, error);
      return 'Untitled';
    }
  };
  
  // Get the display title - use filename if no title is provided
  const displayTitle = mediaObject.title || mediaObject.name || getFilenameFromUrl(mediaObject.url);
  
  // Smart aspect ratio defaults based on content type and filename
  const getDefaultAspectRatio = (url: string, type: string): number => {
    const filename = url?.toLowerCase() || '';
    
    // Known portrait formats
    if (filename.includes('card') || filename.includes('poster') || type === 'pdf') {
      return 0.67; // Portrait
    }
    
    // Known square formats  
    if (filename.includes('logo') || filename.includes('icon')) {
      return 1.0; // Square
    }
    
    // Wide formats
    if (filename.includes('banner') || filename.includes('header')) {
      return 2.5; // Wide banner
    }
    
    // Default landscape
    return 1.5; // Slightly wider than 4:3
  };
  
  // Get fallback URL (WebP -> original format)
  const getFallbackUrl = (originalUrl: string): string => {
    if (!originalUrl) return '';
    
    // Normalize URL for production (handle www subdomain)
    let normalizedUrl = originalUrl;
    if (window.location.hostname === 'gerardo.work' && !normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://www.gerardo.work${normalizedUrl}`;
    } else if (!normalizedUrl.startsWith('http') && normalizedUrl.startsWith('/')) {
      // For local development, use relative URLs
      normalizedUrl = normalizedUrl;
    }
    
    // If it's already WebP and WebP isn't supported, try to find original
    if (normalizedUrl.includes('.webp') && !supportsWebP) {
      // Try common original formats
      const baseUrl = normalizedUrl.replace('.webp', '');
      const possibleExtensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
      
      // For now, try .jpg as most common fallback
      return baseUrl + '.jpg';
    }
    
    return normalizedUrl;
  };
  
  // Normalize URLs for production
  const normalizeUrl = (url: string): string => {
    if (!url) return '';
    
    // If we're on production and URL is relative, make it absolute with www
    if (window.location.hostname === 'gerardo.work' && !url.startsWith('http')) {
      return `https://www.gerardo.work${url}`;
    }
    
    return url;
  };
  
  // Initialize with smart defaults immediately
  useEffect(() => {
    const defaultAR = getDefaultAspectRatio(mediaObject.url, mediaObject.type);
    const baseWidth = isMobile ? 2.5 : 3.0;
    const baseHeight = baseWidth / defaultAR;
    
    setAspectRatio(defaultAR);
    setDimensions({ width: baseWidth, height: baseHeight });
    
    console.log(`Initialized ${displayTitle} with default AR: ${defaultAR.toFixed(2)}, size: ${baseWidth.toFixed(1)}x${baseHeight.toFixed(1)}`);
  }, []); // Only run once on mount
  
  // Progressive texture loading (non-blocking)
  useEffect(() => {
    const loadTextureProgressively = async () => {
      if (!mediaObject.url) return;
      
      setIsLoading(true);
      setError(false);
      
      try {
        let textureUrl = '';
        let shouldDetectAspectRatio = false;
        
        // Handle different media types with proper URLs and placeholders
        if (mediaObject.type === 'image') {
          textureUrl = normalizeUrl(mediaObject.url || mediaObject.thumbnail);
          shouldDetectAspectRatio = true;
        } else if (mediaObject.type === 'video') {
          textureUrl = normalizeUrl(mediaObject.thumbnail || mediaObject.url);
          shouldDetectAspectRatio = !!mediaObject.thumbnail;
        } else if (mediaObject.type === 'pdf') {
          if (mediaObject.thumbnail) {
            textureUrl = normalizeUrl(mediaObject.thumbnail);
            shouldDetectAspectRatio = true;
          } else {
            // Create PDF placeholder with correct aspect ratio
            textureUrl = 'data:image/svg+xml;base64,' + btoa(`
              <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="600" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
                <rect x="40" y="80" width="320" height="4" fill="#6c757d" rx="2"/>
                <rect x="40" y="100" width="280" height="4" fill="#6c757d" rx="2"/>
                <rect x="40" y="120" width="300" height="4" fill="#6c757d" rx="2"/>
                <rect x="40" y="160" width="250" height="4" fill="#6c757d" rx="2"/>
                <rect x="40" y="180" width="290" height="4" fill="#6c757d" rx="2"/>
                <circle cx="200" cy="300" r="40" fill="#dc3545" opacity="0.1"/>
                <text x="200" y="280" text-anchor="middle" font-family="Arial" font-size="16" fill="#dc3545" font-weight="bold">PDF</text>
                <text x="200" y="320" text-anchor="middle" font-family="Arial" font-size="12" fill="#6c757d">Document</text>
              </svg>
            `);
            setAspectRatio(400 / 600);
            // Update dimensions immediately for PDF
            const baseWidth = isMobile ? 2.5 : 3.0;
            setDimensions({ width: baseWidth * 0.67, height: baseWidth });
          }
        } else if (mediaObject.type === 'html') {
          if (mediaObject.thumbnail) {
            textureUrl = normalizeUrl(mediaObject.thumbnail);
            shouldDetectAspectRatio = true;
          } else {
            // Create HTML placeholder with web aspect ratio
            textureUrl = 'data:image/svg+xml;base64,' + btoa(`
              <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="300" fill="#212529" stroke="#495057" stroke-width="2"/>
                <rect x="10" y="10" width="380" height="30" fill="#343a40" rx="6"/>
                <circle cx="25" cy="25" r="5" fill="#dc3545"/>
                <circle cx="45" cy="25" r="5" fill="#ffc107"/>
                <circle cx="65" cy="25" r="5" fill="#28a745"/>
                <rect x="90" y="20" width="200" height="10" fill="#6c757d" rx="5"/>
                <rect x="20" y="60" width="360" height="8" fill="#495057" rx="4"/>
                <rect x="20" y="80" width="320" height="8" fill="#495057" rx="4"/>
                <rect x="20" y="100" width="280" height="8" fill="#495057" rx="4"/>
                <circle cx="200" cy="180" r="30" fill="#007bff" opacity="0.2"/>
                <text x="200" y="175" text-anchor="middle" font-family="Arial" font-size="14" fill="#007bff" font-weight="bold">HTML</text>
                <text x="200" y="190" text-anchor="middle" font-family="Arial" font-size="10" fill="#adb5bd">Web Page</text>
              </svg>
            `);
            setAspectRatio(400 / 300);
            // Update dimensions immediately for HTML
            const baseWidth = isMobile ? 2.5 : 3.0;
            setDimensions({ width: baseWidth, height: baseWidth * 0.75 });
          }
        } else {
          textureUrl = normalizeUrl(mediaObject.url || mediaObject.thumbnail);
          shouldDetectAspectRatio = !!textureUrl;
        }
        
        // Progressive aspect ratio detection (non-blocking)
        if (shouldDetectAspectRatio && textureUrl && !textureUrl.startsWith('data:')) {
          // Try multiple URLs with fallbacks
          const urlsToTry = [
            textureUrl,
            getFallbackUrl(textureUrl)
          ].filter(url => url && url !== textureUrl || url === textureUrl);
          
          let aspectRatioDetected = false;
          
          for (const url of urlsToTry) {
            try {
              await new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                const timeout = setTimeout(() => {
                  reject(new Error('Timeout'));
                }, 2000); // Shorter timeout
                
                img.onload = () => {
                  clearTimeout(timeout);
                  if (!aspectRatioDetected) {
                    const detectedAspectRatio = img.width / img.height;
                    setAspectRatio(detectedAspectRatio);
                    
                    // Update dimensions progressively
                    const baseWidth = isMobile ? 2.5 : 3.0;
                    const baseHeight = baseWidth / detectedAspectRatio;
                    const maxHeight = isMobile ? 4.0 : 5.0;
                    const finalHeight = Math.min(baseHeight, maxHeight);
                    const finalWidth = finalHeight * detectedAspectRatio;
                    
                    setDimensions({ width: finalWidth, height: finalHeight });
                    console.log(`✅ Enhanced ${displayTitle} with detected AR: ${detectedAspectRatio.toFixed(2)} (${img.width}x${img.height})`);
                    aspectRatioDetected = true;
                  }
                  resolve();
                };
                
                img.onerror = () => {
                  clearTimeout(timeout);
                  reject(new Error('Image load failed'));
                };
                
                img.src = url;
              });
              
              // If we got here, aspect ratio was detected successfully
              if (aspectRatioDetected) {
                textureUrl = url; // Use the working URL for texture loading
                break;
              }
            } catch (err) {
              console.warn(`⚠️ Failed to detect aspect ratio for ${displayTitle} with URL ${url}:`, err);
              continue; // Try next URL
            }
          }
        }
        
        // Load texture for display (independent of aspect ratio detection)
        if (textureUrl) {
          const urlsToTry = [
            textureUrl,
            getFallbackUrl(textureUrl)
          ].filter(url => url && url !== textureUrl || url === textureUrl);
          
          let textureLoaded = false;
          
          for (const url of urlsToTry) {
            try {
              const loader = new THREE.TextureLoader();
              
              const loadedTexture = await new Promise<THREE.Texture>((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                  reject(new Error(`Texture loading timeout for ${displayTitle}`));
                }, 5000); // Reasonable timeout
                
                loader.load(
                  url,
                  (texture) => {
                    clearTimeout(timeoutId);
                    resolve(texture);
                  },
                  undefined,
                  (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                  }
                );
              });
              
              // Optimize texture settings for performance
              loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
              loadedTexture.magFilter = THREE.LinearFilter;
              loadedTexture.generateMipmaps = true;
              
              if (isMobile) {
                loadedTexture.format = THREE.RGBFormat;
              }
              
              setTexture(loadedTexture);
              console.log(`✅ Loaded texture for ${displayTitle} using ${url}`);
              textureLoaded = true;
              break;
            } catch (err) {
              console.warn(`⚠️ Failed to load texture for ${displayTitle} with URL ${url}:`, err);
              continue; // Try next URL
            }
          }
          
          if (!textureLoaded) {
            console.error(`❌ All texture loading attempts failed for ${displayTitle}`);
            setError(true);
          }
        }
      } catch (err) {
        console.error(`❌ Error in progressive loading for ${displayTitle}:`, err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Start loading but don't block rendering
    loadTextureProgressively();
  }, [mediaObject.url, displayTitle, isMobile]);
  
  // Update dimensions when aspect ratio changes AND update the actual geometry
  useEffect(() => {
    const baseWidth = isMobile ? 2.5 : 3.0;
    const baseHeight = baseWidth / aspectRatio;
    const maxHeight = isMobile ? 4.0 : 5.0;
    const finalHeight = Math.min(baseHeight, maxHeight);
    const finalWidth = finalHeight * aspectRatio;
    
    const newDimensions = { width: finalWidth, height: finalHeight };
    setDimensions(newDimensions);
    
    // CRITICAL: Actually update the 3D geometry when dimensions change
    if (meshRef.current && meshRef.current.geometry) {
      // Dispose old geometry to prevent memory leaks
      meshRef.current.geometry.dispose();
      // Create new geometry with correct dimensions
      meshRef.current.geometry = new THREE.BoxGeometry(finalWidth, finalHeight, 0.05);
      console.log(`🔄 Updated 3D geometry for ${displayTitle}: ${finalWidth.toFixed(2)}x${finalHeight.toFixed(2)} (AR: ${aspectRatio.toFixed(2)})`);
    }
  }, [aspectRatio, isMobile, displayTitle]);

  // Animation with useFrame
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      
      // Gentle floating motion
      const baseY = mediaObject.position[1] || 2;
      const floatAmplitude = isMobile ? 0.15 : 0.2; // Slightly less on mobile
      const floatSpeed = 0.6 + (mediaObject.id?.length || 0) * 0.05;
      groupRef.current.position.y = baseY + Math.sin(time * floatSpeed) * floatAmplitude;
      
      // Keep original X and Z position
      groupRef.current.position.x = mediaObject.position[0] || 0;
      groupRef.current.position.z = mediaObject.position[2] || 0;
      
      // Keep cards straight - no rotation
      groupRef.current.rotation.x = 0;
      groupRef.current.rotation.y = mediaObject.rotation?.[1] || 0;
      groupRef.current.rotation.z = 0;
      
      // Enhanced hover effects
      if (hovered && meshRef.current) {
        const pulse = 1 + Math.sin(time * 4) * 0.05;
        groupRef.current.scale.setScalar(pulse * (isMobile ? 1.05 : 1.1));
      } else if (groupRef.current) {
        const currentScale = groupRef.current.scale.x;
        const targetScale = 1;
        groupRef.current.scale.setScalar(THREE.MathUtils.lerp(currentScale, targetScale, 0.1));
      }
    }
  });

  const handleClick = () => {
    console.log('MediaCard clicked:', mediaObject);
    
    // Handle different click actions based on media type
    if (mediaObject.type === 'video' && mediaObject.url) {
      window.open(mediaObject.url, '_blank');
    } else if (mediaObject.type === 'image' && mediaObject.url) {
      window.open(mediaObject.url, '_blank');
    } else if (mediaObject.type === 'html' && mediaObject.url) {
      window.open(mediaObject.url, '_blank');
    } else if (mediaObject.type === 'pdf' && mediaObject.url) {
      window.open(mediaObject.url, '_blank');
    } else if (mediaObject.url) {
      window.open(mediaObject.url, '_blank');
    }
  };

  // Apply custom scale if provided, otherwise use calculated dimensions
  const scale = mediaObject.scale || [1, 1, 0.1];
  const position = mediaObject.position || [0, 2, 0];
  const rotation = mediaObject.rotation || [0, 0, 0];

  return (
    <group 
      ref={groupRef}
      position={position} 
      rotation={[rotation[0], rotation[1], rotation[2]]}
      scale={scale}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Main card mesh with TRULY dynamic aspect ratio-based geometry */}
      <mesh ref={meshRef}>
        <boxGeometry ref={geometryRef} args={[dimensions.width, dimensions.height, 0.05]} />
        <meshStandardMaterial 
          map={texture} 
          color={error ? "#ff6b6b" : (isLoading ? "#e9ecef" : "#ffffff")}
          emissive={hovered ? "#333333" : "#000000"}
          emissiveIntensity={hovered ? 0.15 : 0}
          metalness={0.1}
          roughness={0.7}
          transparent={isLoading}
          opacity={isLoading ? 0.7 : 1.0}
        />
      </mesh>
      
      {/* Enhanced glow effect when hovered */}
      {hovered && (
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[dimensions.width * 1.1, dimensions.height * 1.1, 0.02]} />
          <meshBasicMaterial 
            color="#4CAF50" 
            transparent 
            opacity={0.4}
          />
        </mesh>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <mesh position={[dimensions.width * 0.35, -dimensions.height * 0.35, 0.03]}>
          <boxGeometry args={[0.08, 0.04, 0.01]} />
          <meshBasicMaterial color="#4CAF50" />
        </mesh>
      )}
      
      {/* Error indicator */}
      {error && (
        <mesh position={[dimensions.width * 0.35, dimensions.height * 0.35, 0.03]}>
          <boxGeometry args={[0.08, 0.04, 0.01]} />
          <meshBasicMaterial color="#dc3545" />
        </mesh>
      )}
      
      {/* Title text using filename - responsive sizing */}
      <Text
        position={[0, -dimensions.height * 0.65, 0.03]}
        fontSize={Math.min(0.08, dimensions.width * 0.035)}
        color={hovered ? "#ffffff" : "#495057"}
        anchorX="center"
        anchorY="middle"
        maxWidth={dimensions.width * 0.9}
      >
        {displayTitle}
      </Text>
      
      {/* Type indicator - responsive positioning */}
      <Text
        position={[dimensions.width * 0.38, dimensions.height * 0.38, 0.03]}
        fontSize={Math.min(0.045, dimensions.width * 0.02)}
        color={hovered ? "#28a745" : "#6c757d"}
        anchorX="center"
        anchorY="middle"
      >
        {mediaObject.type?.toUpperCase() || 'MEDIA'}
      </Text>
      
      {/* Aspect ratio debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <Text
          position={[-dimensions.width * 0.38, dimensions.height * 0.38, 0.03]}
          fontSize={0.03}
          color="#007bff"
          anchorX="center"
          anchorY="middle"
        >
          {aspectRatio.toFixed(2)}
        </Text>
      )}
      
      {/* Floating particles effect when hovered - scaled to card */}
      {hovered && (
        <>
          {Array.from({ length: isMobile ? 2 : 3 }, (_, i) => (
            <mesh key={i} position={[
              (Math.random() - 0.5) * dimensions.width * 0.8, 
              (Math.random() - 0.5) * dimensions.height * 0.8, 
              0.1 + Math.random() * 0.2
            ]}>
              <sphereGeometry args={[0.012, 6, 6]} />
              <meshBasicMaterial 
                color="#28a745" 
                transparent 
                opacity={0.6}
              />
            </mesh>
          ))}
        </>
      )}
      
      {/* Description on hover - positioned relative to card size */}
      {hovered && mediaObject.description && (
        <Html
          position={[0, dimensions.height * 0.8, 0.1]}
          style={{
            backgroundColor: 'rgba(33, 37, 41, 0.95)',
            padding: isMobile ? '8px' : '12px',
            borderRadius: '8px',
            color: 'white',
            width: isMobile ? '180px' : '240px',
            fontSize: isMobile ? '11px' : '13px',
            textAlign: 'center',
            pointerEvents: 'none',
            border: '1px solid #28a745',
            boxShadow: '0 4px 16px rgba(40, 167, 69, 0.3)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {mediaObject.description}
        </Html>
      )}
    </group>
  );
};

const ProjectSubworld: React.FC<ProjectSubworldProps> = () => {
  const { projectId, projectName } = useParams<{ projectId?: string; projectName?: string }>();
  const navigate = useNavigate();
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProject = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        let project: ProjectData | null = null;
        
        // Try to load by project name first (from /projects/:projectName route)
        if (projectName) {
          console.log(`ProjectSubworld: Loading project by name: ${projectName}`);
          project = await projectDataService.getProjectByName(projectName);
        }
        // Then try by project ID
        else if (projectId) {
          console.log(`ProjectSubworld: Loading project by ID: ${projectId}`);
          const id = parseInt(projectId, 10);
          if (!isNaN(id)) {
            project = await projectDataService.getProjectById(id);
          }
        }
        
        if (project) {
          console.log('ProjectSubworld: Loaded project data:', project);
          console.log('ProjectSubworld: Project mediaObjects:', project.mediaObjects);
          console.log('ProjectSubworld: Project assetGallery:', project.assetGallery);
          setProjectData(project);
        } else {
          setError('Project not found');
          console.error('ProjectSubworld: Project not found for ID/name:', projectId || projectName);
        }
      } catch (err) {
        setError('Failed to load project');
        console.error('ProjectSubworld: Error loading project:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [projectId, projectName]);

  if (isLoading) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#000000',
        color: '#ffffff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '20px',
            animation: 'spin 1s linear infinite'
          }}>⟳</div>
          <div>Loading {projectName || `project ${projectId}`}...</div>
        </div>
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#000000',
        color: '#ffffff'
      }}>
        <h2>{error || 'Project not found'}</h2>
        <p>Project: {projectName || projectId}</p>
        <button 
          onClick={() => navigate('/')}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Back to Portfolio
        </button>
      </div>
    );
  }

  // Apply world settings from project data
  const worldSettings = projectData.worldSettings || {};
  const backgroundColor = (worldSettings as any).backgroundColor || '#1a1a1a';
  const ambientIntensity = (worldSettings as any).ambientLightIntensity || 0.6;
  const directionalIntensity = (worldSettings as any).directionalLightIntensity || 1.0;

  // Combine mediaObjects and assetGallery into a single array
  const allMediaObjects = [];
  
  // Add mediaObjects (positioned media)
  if (projectData.mediaObjects && projectData.mediaObjects.length > 0) {
    allMediaObjects.push(...projectData.mediaObjects);
    console.log(`ProjectSubworld: Added ${projectData.mediaObjects.length} mediaObjects`);
  }
  
  // Add assetGallery items (auto-positioned)
  if (projectData.assetGallery && projectData.assetGallery.length > 0) {
    const galleryObjects = projectData.assetGallery.map((asset, index) => {
      // Create beautiful randomized positioning for a frutiger space aesthetic
      const totalAssets = projectData.assetGallery!.length;
      
      // Generate deterministic but varied positions based on asset index
      const seededRandom = (seed: number, min: number, max: number): number => {
        const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
        return min + (max - min) * (x - Math.floor(x));
      };
      
      // Create BEAUTIFUL floating gallery with proper spacing
      const clusterCount = Math.max(4, Math.ceil(totalAssets / 6)); // Create clusters of ~6 items each for better spacing
      const currentCluster = index % clusterCount;
      
      // Base cluster positions in a MUCH LARGER circle for proper gallery feel
      const clusterAngle = (currentCluster / clusterCount) * Math.PI * 2;
      const clusterRadius = 40 + (clusterCount * 8); // DRAMATICALLY increased radius for proper spacing
      const clusterX = Math.cos(clusterAngle) * clusterRadius;
      const clusterZ = Math.sin(clusterAngle) * clusterRadius;
      
      // Add GENEROUS organic randomization within each cluster
      const inClusterIndex = Math.floor(index / clusterCount);
      const randomX = seededRandom(index * 7 + 123, -20, 20); // MUCH larger random spread for breathing room
      const randomZ = seededRandom(index * 11 + 456, -20, 20);
      const randomY = seededRandom(index * 13 + 789, 2, 8); // Higher floating heights for dramatic effect
      
      // Create EXPANDED spiral-like distribution within clusters
      const spiralRadius = 8 + (inClusterIndex * 3); // MUCH larger spiral for proper spacing
      const spiralAngle = inClusterIndex * 2.3; // Golden ratio-ish angle for natural distribution
      const spiralX = Math.cos(spiralAngle) * spiralRadius;
      const spiralZ = Math.sin(spiralAngle) * spiralRadius;
      
      const position: [number, number, number] = [
        clusterX + spiralX + randomX * 0.5, // Combine cluster, spiral, and random
        randomY,
        clusterZ + spiralZ + randomZ * 0.5
      ];
      
      // Randomize rotation for more organic look (KEEP MINIMAL - NO TILTING)
      const randomRotationY = seededRandom(index * 17 + 234, -0.3, 0.3); // Reduced rotation range
      // REMOVE tilting rotations - keep cards straight
      
      // Varied scales for visual interest
      const scaleVariation = seededRandom(index * 23 + 890, 0.8, 1.3);
      
      // Extract filename for title
      const getAssetTitle = (url: string): string => {
        if (!url) return 'Untitled Asset';
        
        try {
          const urlParts = url.split('/');
          const filename = urlParts[urlParts.length - 1];
          const nameWithoutExtension = filename.replace(/\.[^/.]+$/, '');
          return nameWithoutExtension
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
        } catch (error) {
          return asset.name || 'Untitled Asset';
        }
      };
      
      return {
        id: `asset-${index}`,
        type: asset.type,
        title: getAssetTitle(asset.url),
        description: getAssetTitle(asset.url),
        url: asset.url,
        thumbnail: asset.url,
        position,
        rotation: [0, randomRotationY, 0] as [number, number, number], // Only Y rotation, no tilting
        scale: [5.0 * scaleVariation, 3.5 * scaleVariation, 0.1] as [number, number, number]
      };
    });
    
    allMediaObjects.push(...galleryObjects);
    console.log(`ProjectSubworld: Added ${galleryObjects.length} assetGallery items with organic positioning`);
  }

  console.log(`ProjectSubworld: Total media objects to render: ${allMediaObjects.length}`);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor }}>
      <Canvas 
        camera={{ position: [0, 15, 60], fov: 90 }}
        style={{ background: backgroundColor }}
      >
        <Suspense fallback={null}>
          {/* Lighting based on project settings */}
          <ambientLight 
            color={(worldSettings as any).ambientLightColor || '#ffffff'} 
            intensity={ambientIntensity} 
          />
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={directionalIntensity}
            color={(worldSettings as any).directionalLightColor || '#ffffff'}
            castShadow
          />

          {/* Environment */}
          <Environment preset="studio" />

          {/* Floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial 
              color={(worldSettings as any).floorColor || '#333333'} 
            />
          </mesh>

          {/* Project title */}
          <Text
            position={[0, 4, -5]}
            fontSize={0.5}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {projectData.name}
          </Text>

          {/* Subtitle with media count */}
          <Text
            position={[0, 3.3, -5]}
            fontSize={0.2}
            color="#cccccc"
            anchorX="center"
            anchorY="middle"
          >
            {allMediaObjects.length} media object{allMediaObjects.length !== 1 ? 's' : ''}
          </Text>

          {/* Back button */}
          <group position={[-8, 3, 0]} onClick={() => navigate('/')}>
            <mesh>
              <boxGeometry args={[1.5, 0.5, 0.1]} />
              <meshStandardMaterial color="#ff5555" />
            </mesh>
            <Text
              position={[0, 0, 0.06]}
              fontSize={0.15}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
            >
              ← Back
            </Text>
          </group>

          {/* Render all media objects as 3D cards */}
          {allMediaObjects.map((mediaObj, index) => (
            <MediaCard key={mediaObj.id || index} mediaObject={mediaObj} />
          ))}

          {/* Show message if no media objects */}
          {allMediaObjects.length === 0 && (
            <Text
              position={[0, 2, 0]}
              fontSize={0.3}
              color="#cccccc"
              anchorX="center"
              anchorY="middle"
            >
              No media objects found
            </Text>
          )}

          <OrbitControls 
            enableZoom 
            enablePan 
            enableRotate 
            minDistance={10}
            maxDistance={200}
            target={[0, 5, 0]}
          />

        </Suspense>
      </Canvas>
    </div>
  );
};

export default ProjectSubworld; 