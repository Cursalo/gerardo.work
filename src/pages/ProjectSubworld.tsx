import React, { useEffect, useState, Suspense, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, Text, RoundedBox } from '@react-three/drei';
import { projectDataService, ProjectData } from '../services/projectDataService';
import { WorldObject } from '../data/worlds';
import * as THREE from 'three';
import FirstPersonCamera from '../components/FirstPersonCamera';
import { MobileControlsProvider } from '../context/MobileControlsContext';
import { InteractionProvider } from '../context/InteractionContext';
import MobileControls from '../components/MobileControls';
import useMobileDetection from '../hooks/useMobileDetection';
import useFirstPersonInteractions from '../hooks/useFirstPersonInteractions';
import BackButton from '../components/BackButton';
import Crosshair from '../components/Crosshair';

interface ProjectSubworldProps {}

// Define MediaCardProps at the top level
interface MediaCardProps {
  mediaObject: any;
}

type TextureQuality = 'placeholder' | 'loading_placeholder' | 'loaded_placeholder' | 'loading_full' | 'loaded_full' | 'error';

// Move utility functions outside component to prevent re-creation
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

// Smart aspect ratio defaults based on content type and filename
const getDefaultAspectRatio = (url: string, type: string): number => {
  const filename = url?.toLowerCase() || '';
  
  if (type === 'pdf') return 0.67; // Portrait for PDFs
  if (filename.includes('card') || filename.includes('poster')) return 0.67; // Portrait
  if (filename.includes('logo') || filename.includes('icon')) return 1.0; // Square
  if (filename.includes('banner') || filename.includes('header')) return 2.5; // Wide banner
  return 1.77; // Default to 16:9 if not specified, common for videos/images
};

// Simple URL normalization for production
const normalizeUrl = (url: string): string => {
  if (!url) return '';
  if (window.location.hostname === 'gerardo.work' && !url.startsWith('http')) {
    return `https://www.gerardo.work${url}`;
  }
  return url;
};

// Performance-optimized MediaCard with proper orientation and rounded corners
const MediaCard: React.FC<MediaCardProps> = ({ mediaObject }) => {
  console.log('MediaCard rendering:', mediaObject?.id || 'no-id', mediaObject?.title || mediaObject?.name, 'type:', mediaObject?.type);
  const [hovered, setHovered] = useState(false);
  const [currentTexture, setCurrentTexture] = useState<THREE.Texture | null>(null);
  const [textureQuality, setTextureQuality] = useState<TextureQuality>('loading_placeholder');
  const [aspectRatio, setAspectRatio] = useState(1.77); // Default 16:9
  const [isVisible, setIsVisible] = useState(true);
  
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  // Determine media type from URL and object data
  const mediaType = useMemo(() => {
    if (mediaObject.type) return mediaObject.type;
    const url = mediaObject.url?.toLowerCase() || '';
    if (url.includes('youtube') || url.includes('youtu.be') || url.endsWith('.mp4') || url.endsWith('.webm')) return 'video';
    if (url.endsWith('.pdf')) return 'pdf';
    return 'image';
  }, [mediaObject.type, mediaObject.url]);

  // Memoize URLs and title
  const placeholderUrl = useMemo(() => mediaObject.thumbnail || mediaObject.url, [mediaObject.thumbnail, mediaObject.url]);
  const fullResUrl = useMemo(() => mediaObject.url, [mediaObject.url]);
  const displayTitle = useMemo(() => {
    return mediaObject.title || mediaObject.name || getFilenameFromUrl(mediaObject.url);
  }, [mediaObject.title, mediaObject.name, mediaObject.url]);

  // Set default aspect ratio based on media type and URL
  useEffect(() => {
    const defaultAR = getDefaultAspectRatio(mediaObject.url || '', mediaType);
    setAspectRatio(defaultAR);
  }, [mediaObject.url, mediaType]);

  // Enhanced texture loading with better quality and video thumbnail support
  useEffect(() => {
    let isActive = true;
    const loader = new THREE.TextureLoader();

    const createYouTubeThumbnail = (url: string): string => {
      try {
        let videoId = '';
        if (url.includes('youtube.com/watch?v=')) {
          videoId = url.split('v=')[1].split('&')[0];
        } else if (url.includes('youtu.be/')) {
          videoId = url.split('youtu.be/')[1].split('?')[0];
        }
        if (videoId) {
          return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
      } catch (err) {
        console.warn('Error creating YouTube thumbnail:', err);
      }
      return '';
    };

    const createVideoTexture = async (videoUrl: string) => {
      try {
        const video = document.createElement('video');
        video.src = normalizeUrl(videoUrl);
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.autoplay = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.controls = false;
        
        return new Promise<THREE.VideoTexture>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Video loading timeout'));
          }, 10000); // 10 second timeout
          
          video.addEventListener('loadedmetadata', () => {
            clearTimeout(timeoutId);
            try {
              const videoTexture = new THREE.VideoTexture(video);
              videoTexture.minFilter = THREE.LinearFilter;
              videoTexture.magFilter = THREE.LinearFilter;
              videoTexture.generateMipmaps = false;
              videoTexture.flipY = true;
              videoTexture.wrapS = THREE.ClampToEdgeWrapping;
              videoTexture.wrapT = THREE.ClampToEdgeWrapping;
              videoTexture.needsUpdate = true;
              
              // Store video element for later playback control
              (videoTexture as any).videoElement = video;
              
              // Start playing immediately
              video.play().catch(err => {
                console.warn('Video autoplay failed:', err);
                // Create a play button overlay if autoplay fails
              });
              
              resolve(videoTexture);
            } catch (err) {
              clearTimeout(timeoutId);
              reject(err);
            }
          });
          
          video.addEventListener('error', (e) => {
            clearTimeout(timeoutId);
            reject(new Error(`Video failed to load: ${e.message || 'Unknown error'}`));
          });
          
          video.addEventListener('canplaythrough', () => {
            // Ensure video starts playing when ready
            video.play().catch(console.warn);
          });
          
          video.load();
        });
      } catch (err) {
        throw new Error(`Failed to create video texture: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    const loadImageTexture = async (urlToLoad: string, isPlaceholder: boolean) => {
      if (!urlToLoad || !isActive) return;
      
      let actualUrlToLoad = normalizeUrl(urlToLoad);
      
      // For YouTube videos, try to get thumbnail
      if (mediaType === 'video' && (urlToLoad.includes('youtube') || urlToLoad.includes('youtu.be'))) {
        const thumbnailUrl = createYouTubeThumbnail(urlToLoad);
        if (thumbnailUrl) {
          actualUrlToLoad = thumbnailUrl;
        }
      }
      
      try {
        let loadedTex: THREE.Texture;
        
        // Handle different media types
        if (mediaType === 'video' && !urlToLoad.includes('youtube') && !urlToLoad.includes('youtu.be')) {
          // Try to create actual video texture for local videos
          try {
            loadedTex = await createVideoTexture(actualUrlToLoad);
          } catch (videoErr) {
            console.warn('Video texture failed, falling back to placeholder:', videoErr);
            throw videoErr; // Fall back to placeholder
          }
        } else {
          // Standard image loading
          loadedTex = await new Promise<THREE.Texture>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
              const texture = new THREE.Texture(img);
              texture.needsUpdate = true;
              resolve(texture);
            };
            
            img.onerror = () => {
              // Fallback: try loading with THREE.TextureLoader
              loader.load(actualUrlToLoad, resolve, undefined, reject);
            };
            
            img.src = actualUrlToLoad;
          });
        }

        if (!isActive) {
          loadedTex.dispose();
          return;
        }

        // Configure texture for high quality
        loadedTex.minFilter = THREE.LinearFilter;
        loadedTex.magFilter = THREE.LinearFilter;
        loadedTex.generateMipmaps = false;
        loadedTex.flipY = true; // Fix for correct image orientation
        loadedTex.wrapS = THREE.ClampToEdgeWrapping;
        loadedTex.wrapT = THREE.ClampToEdgeWrapping;
        loadedTex.format = THREE.RGBAFormat;
        loadedTex.needsUpdate = true;

        // Update aspect ratio from actual image dimensions
        if (loadedTex.image && loadedTex.image.width && loadedTex.image.height) {
          const newAR = loadedTex.image.width / loadedTex.image.height;
          if (newAR && !isNaN(newAR) && isFinite(newAR) && newAR > 0.1 && newAR < 10) {
            setAspectRatio(newAR);
          }
        }

        setCurrentTexture(loadedTex);
        setTextureQuality(isPlaceholder ? 'loaded_placeholder' : 'loaded_full');

      } catch (err) {
        console.error('Error loading texture for', urlToLoad, ':', err);
        if (!isActive) return;
        
        // Create error placeholder
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;
        
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, 512, 512);
        
        ctx.fillStyle = '#6c757d';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❌', 256, 200);
        
        ctx.font = '24px Arial';
        ctx.fillText('Failed to load', 256, 280);
        ctx.fillText(mediaType.toUpperCase(), 256, 320);
        
        const errorTexture = new THREE.CanvasTexture(canvas);
        errorTexture.needsUpdate = true;
        setCurrentTexture(errorTexture);
        setTextureQuality('error');
      }
    };

    const createPlaceholderTexture = (type: string, title: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d')!;
      
      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
      if (type === 'pdf') {
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#f8f9fa');
      } else if (type === 'video') {
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(1, '#333333');
      } else if (type === 'html') {
        gradient.addColorStop(0, '#4285f4');
        gradient.addColorStop(1, '#34a853');
      } else {
        gradient.addColorStop(0, '#6c757d');
        gradient.addColorStop(1, '#495057');
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1024, 1024);
      
      // Add content based on type
      if (type === 'pdf') {
        // Create a document-like appearance
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(150, 100, 724, 824);
        
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 2;
        ctx.strokeRect(150, 100, 724, 824);
        
        // Add lines to simulate text
        ctx.fillStyle = '#495057';
        for (let i = 0; i < 15; i++) {
          const y = 200 + i * 40;
          const width = Math.random() * 400 + 200;
          ctx.fillRect(200, y, width, 8);
        }
        
        // Add PDF icon
        ctx.fillStyle = '#dc3545';
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📄', 512, 650);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 60px Arial';
        ctx.fillText('PDF', 512, 720);
        
      } else if (type === 'video') {
        // Create a video player-like appearance
        ctx.fillStyle = '#000000';
        ctx.fillRect(100, 200, 824, 464);
        
        // Add play button
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(450, 350);
        ctx.lineTo(450, 550);
        ctx.lineTo(600, 450);
        ctx.closePath();
        ctx.fill();
        
        // Add video controls bar
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(100, 620, 824, 60);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('▶', 512, 750);
        
      } else if (type === 'html') {
        // Create a webpage-like appearance
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(100, 150, 824, 724);
        
        // Add browser bar
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(100, 150, 824, 60);
        
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 2;
        ctx.strokeRect(100, 150, 824, 724);
        
        // Add content blocks
        ctx.fillStyle = '#007bff';
        ctx.fillRect(150, 250, 724, 100);
        
        ctx.fillStyle = '#6c757d';
        for (let i = 0; i < 8; i++) {
          const y = 380 + i * 40;
          const width = Math.random() * 400 + 200;
          ctx.fillRect(150, y, width, 20);
        }
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌐', 512, 750);
        
      } else {
        // Default image placeholder
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 200px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🖼', 512, 400);
        
        ctx.font = 'bold 80px Arial';
        ctx.fillText('IMAGE', 512, 550);
      }
      
      // Add title at bottom
      if (title && title !== 'Untitled') {
        ctx.fillStyle = type === 'video' ? '#ffffff' : '#495057';
        ctx.font = 'bold 50px Arial';
        ctx.textAlign = 'center';
        
        // Wrap text if too long
        const maxWidth = 800;
        let words = title.split(' ');
        let line = '';
        let y = 850;
        
        for (let n = 0; n < words.length; n++) {
          let testLine = line + words[n] + ' ';
          let metrics = ctx.measureText(testLine);
          let testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, 512, y);
            line = words[n] + ' ';
            y += 60;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 512, y);
      }
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.flipY = true; // Keep consistent with other textures
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      return texture;
    };

    // Simplified handling - start with placeholder immediately for better UX
    if (mediaType === 'image') {
      // For images, try to load directly first
      if (placeholderUrl) {
        setTextureQuality('loading_placeholder');
        loadImageTexture(placeholderUrl, true);
      } else {
        // Create fallback texture if no URL
        const fallbackTex = createPlaceholderTexture(mediaType, displayTitle);
        setCurrentTexture(fallbackTex);
        setTextureQuality('loaded_full');
      }
    } else {
      // For non-images (video, pdf), create placeholder immediately
      const placeholderTex = createPlaceholderTexture(mediaType, displayTitle);
      setCurrentTexture(placeholderTex);
      setTextureQuality('loaded_full');
      
      // For videos, also try to load actual video texture
      if (mediaType === 'video' && placeholderUrl) {
        // Small delay to prevent overwhelming the browser
        setTimeout(() => {
          if (placeholderUrl.includes('youtube') || placeholderUrl.includes('youtu.be')) {
            loadImageTexture(placeholderUrl, false);
          } else {
            // Try to create actual video texture for local videos
            loadImageTexture(placeholderUrl, false);
          }
        }, 100);
      }
    }
    
    return () => {
      isActive = false;
      if (currentTexture) {
        setTimeout(() => currentTexture.dispose(), 100);
      }
    };
  }, [mediaType, placeholderUrl, displayTitle]); // Simplified dependencies

  // Calculate dimensions based on aspect ratio with better proportions
  const maxSize = 5.5; // Increased from 4
  const minSize = 2.5; // Increased from 2
  let cardWidth = Math.min(maxSize, Math.max(minSize, aspectRatio * 4)); // Increased multiplier
  let cardHeight = Math.min(maxSize, Math.max(minSize, 4 / aspectRatio)); // Increased multiplier
  
  // Scale for better gallery feel - less reduction
  cardWidth *= 0.95; // Increased from 0.8
  cardHeight *= 0.95; // Increased from 0.8

  // Simple hover animation only
  useFrame(() => {
    if (groupRef.current) {
      // Simple scale on hover
      const targetScale = hovered ? 1.1 : 1.0;
      const currentScale = groupRef.current.scale.x;
      const newScale = currentScale + (targetScale - currentScale) * 0.1;
      groupRef.current.scale.setScalar(newScale);
    }
  });

  const handleClick = () => {
    if (mediaType === 'video' && currentTexture && (currentTexture as any).videoElement) {
      // Handle video playback
      const video = (currentTexture as any).videoElement;
      if (video.paused) {
        video.play().catch(console.error);
      } else {
        video.pause();
      }
    } else if (mediaType === 'pdf' || mediaType === 'html') {
      // Open in new tab for PDFs and HTML
      if (placeholderUrl) {
        window.open(normalizeUrl(placeholderUrl), '_blank');
      }
    } else if (mediaType === 'image') {
      // Open image in new tab
      if (placeholderUrl) {
        window.open(normalizeUrl(placeholderUrl), '_blank');
      }
    }
  };

  // Early return if no texture or invalid data
  if (!currentTexture || !isVisible) {
    console.log('MediaCard early return:', mediaObject?.id, 'texture:', !!currentTexture, 'visible:', isVisible);
    return null;
  }

  return (
    <group ref={groupRef} position={mediaObject.position || [0, 2, 0]} rotation={mediaObject.rotation || [0, 0, 0]} visible={isVisible}>
      {/* Simple flat card mesh - no weird 3D effects */}
      <mesh 
        ref={meshRef}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
        castShadow
        receiveShadow
      >
        {/* Simple plane geometry - completely flat */}
        <planeGeometry args={[cardWidth, cardHeight]} />
        <meshBasicMaterial 
          map={currentTexture}
          side={THREE.FrontSide}
          transparent={false}
          toneMapped={false}
        />
      </mesh>

      {/* Simple title below the card */}
      <Text
        position={[0, -cardHeight/2 - 0.3, 0]}
        fontSize={0.2}
        color="#333333"
        anchorX="center"
        anchorY="top"
        maxWidth={cardWidth * 1.2}
      >
        {displayTitle}
      </Text>

      {/* Video play indicator if needed */}
      {mediaType === 'video' && currentTexture && (currentTexture as any).videoElement && (
        <mesh position={[0, 0, 0.01]}>
          <circleGeometry args={[0.3, 16]} />
          <meshBasicMaterial 
            color="rgba(0,0,0,0.6)" 
            transparent 
            opacity={hovered ? 0.8 : 0.5}
          />
        </mesh>
      )}
      
      {mediaType === 'video' && currentTexture && (currentTexture as any).videoElement && (
        <mesh position={[0.05, 0, 0.02]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.08, 0.12, 3]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
    </group>
  );
};

// Scene content component for first-person integration
const SceneContent: React.FC<{ allMediaObjects: any[], projectData: ProjectData }> = ({ allMediaObjects, projectData }) => {
  console.log('SceneContent: Rendering', allMediaObjects.length, 'media objects');

  // Enable first person interactions for walking and interaction (same as main world)
  useFirstPersonInteractions();

  // Create floor texture with subtle stripes
  const floorTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Clean white base
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 512);
    
    // Subtle gray stripes
    ctx.fillStyle = '#f8f8f8';
    for (let i = 0; i < 512; i += 32) {
      ctx.fillRect(i, 0, 16, 512);
      ctx.fillRect(0, i, 512, 16);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(50, 50);
    
    return texture;
  }, []);

  return (
    <>
      {/* Clean, bright lighting for gallery-like feel */}
      <ambientLight color="#ffffff" intensity={0.8} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={0.6}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />

      {/* Clean white gallery environment */}
      <Environment preset="apartment" background={false} />
      
      {/* Force white background */}
      <color attach="background" args={['#ffffff']} />

      {/* First Person Camera - same as main world */}
      <FirstPersonCamera 
        position={new THREE.Vector3(0, 1.7, 15)}
        height={1.7} 
        moveSpeed={0.25}
        rotationSpeed={0.0015}
        acceleration={0.12}
        deceleration={0.2}
      />

      {/* Clean white floor with subtle stripes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial 
          map={floorTexture}
          color="#ffffff"
          roughness={0.8}
          metalness={0.0}
        />
      </mesh>

      {/* Project title - dark text for white background */}
      <Text
        position={[0, 4, -5]}
        fontSize={0.5}
        color="#333333"
        anchorX="center"
        anchorY="middle"
      >
        {projectData.name}
      </Text>

      {/* Subtitle with media count - dark text */}
      <Text
        position={[0, 3.3, -5]}
        fontSize={0.2}
        color="#666666"
        anchorX="center"
        anchorY="middle"
      >
        {allMediaObjects.length} media object{allMediaObjects.length !== 1 ? 's' : ''}
      </Text>

      {/* Render all media objects */}
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
    </>
  );
};

const ProjectSubworld: React.FC<ProjectSubworldProps> = () => {
  const { projectId, projectName } = useParams<{ projectId?: string; projectName?: string }>();
  const navigate = useNavigate();
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get mobile detection
  const { isMobile, isTouchDevice } = useMobileDetection();

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

  // Clean white gallery environment
  const backgroundColor = '#ffffff';

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
      const randomY = seededRandom(index * 13 + 789, 1, 3); // Lowered heights - was 2, 8
      
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
        scale: [4.0 * scaleVariation, 2.5 * scaleVariation, 0.1] as [number, number, number]
      };
    });
    
    allMediaObjects.push(...galleryObjects);
    console.log(`ProjectSubworld: Added ${galleryObjects.length} assetGallery items with organic positioning`);
  }

  console.log(`ProjectSubworld: Total media objects to render: ${allMediaObjects.length}`);

  return (
    <InteractionProvider>
      <MobileControlsProvider>
        <div style={{ width: '100vw', height: '100vh', backgroundColor }}>
          <Canvas 
            camera={{ position: [0, 1.7, 15], fov: 75 }}
            style={{ background: backgroundColor }}
            gl={{
              antialias: false,
              alpha: false,
              powerPreference: "high-performance",
              failIfMajorPerformanceCaveat: false,
              preserveDrawingBuffer: false,
              stencil: false
            }}
            onCreated={(state) => {
              // Set white background
              state.scene.background = new THREE.Color('#ffffff');
              
              // Improved WebGL context recovery
              const gl = state.gl.getContext();
              
              const handleContextLost = (event: Event) => {
                event.preventDefault();
                console.warn('🚨 WebGL context lost - attempting recovery');
                // Clear any textures to free memory
                state.scene.traverse((child) => {
                  if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
                    if ('map' in child.material && child.material.map instanceof THREE.Texture) {
                      child.material.map.dispose();
                    }
                  }
                });
              };
              
              const handleContextRestored = () => {
                console.log('✅ WebGL context restored');
                // Force reload textures after a delay
                setTimeout(() => {
                  window.location.reload();
                }, 100);
              };
              
              if (gl.canvas) {
                gl.canvas.addEventListener('webglcontextlost', handleContextLost);
                gl.canvas.addEventListener('webglcontextrestored', handleContextRestored);
              }
            }}
          >
            <Suspense fallback={null}>
              <SceneContent allMediaObjects={allMediaObjects} projectData={projectData} />
            </Suspense>
          </Canvas>

          {/* UI Elements Rendered Separately - same as main world */}
          {isTouchDevice && <MobileControls />}
          <BackButton />
          
          {/* Crosshair for consistent interaction like main world */}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 10000,
            display: 'block'
          }}>
            <Crosshair />
          </div>
        </div>
      </MobileControlsProvider>
    </InteractionProvider>
  );
};

export default ProjectSubworld; 