import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Mesh, Group, Vector3 } from 'three';
import { useInteraction } from '../context/InteractionContext';

interface VideoCardProps {
  id: number;
  title: string;
  videoUrl: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  description?: string;
}

/**
 * VideoCard component
 * 
 * Displays video content in 3D space with hover effects and interactions.
 * Optimized for performance and reduced render loops.
 */
export const VideoCard: React.FC<VideoCardProps> = ({
  id,
  title,
  videoUrl,
  description,
  position,
  rotation = [0, 0, 0]
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const videoRef = useRef<HTMLIFrameElement>(null);
  const { hoveredObject } = useInteraction();
  
  // Get camera from three.js context
  const { camera } = useThree();
  
  // Add mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   ('ontouchstart' in window) || 
                   (navigator.maxTouchPoints > 0);
  
  // Set initial position
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2]);
    }
  }, [position]);
  
  // Calculate video dimensions using 16:9 aspect ratio for better video display
  const videoDimensions = useMemo(() => {
    const baseWidth = 3.2; // Increased for better visibility
    const aspectRatio = 16 / 9;
    return {
      width: baseWidth,
      height: baseWidth / aspectRatio,
      frameWidth: baseWidth * 1.05,
      frameHeight: (baseWidth / aspectRatio) * 1.05
    };
  }, []);

  // Enhanced URL resolution for mobile compatibility with proper encoding
  const resolvedVideoUrl = useMemo(() => {
    if (!videoUrl) return '';
    
    // If it's already a full URL, return as-is
    if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
      return videoUrl;
    }
    
    // If it's a relative URL from public directory, encode spaces and special characters
    if (videoUrl.startsWith('/projects/') || videoUrl.startsWith('/assets/') || videoUrl.startsWith('/')) {
      return videoUrl.split('/').map(segment => segment ? encodeURIComponent(segment) : segment).join('/');
    }
    
    // If it's just a path without leading /, add it and encode
    if (!videoUrl.startsWith('/') && !videoUrl.includes('://')) {
      return `/${videoUrl}`.split('/').map(segment => segment ? encodeURIComponent(segment) : segment).join('/');
    }
    
    return videoUrl;
  }, [videoUrl]);

  // Extract YouTube video ID from URL or handle other video types
  const videoEmbedUrl = useMemo(() => {
    const url = resolvedVideoUrl;
    
    // YouTube URL handling
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = '';
      
      // Handle youtube.com/watch?v= format
      if (url.includes('v=')) {
        videoId = url.split('v=')[1];
        // Remove any additional parameters
        const ampersandPosition = videoId.indexOf('&');
        if (ampersandPosition !== -1) {
          videoId = videoId.substring(0, ampersandPosition);
        }
      }
      // Handle youtu.be/ format
      else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1];
        // Remove any additional parameters
        const questionMarkPosition = videoId.indexOf('?');
        if (questionMarkPosition !== -1) {
          videoId = videoId.substring(0, questionMarkPosition);
        }
      }
      
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0`;
      }
    }
    
    // Direct video file or other video URL
    return url;
  }, [resolvedVideoUrl]);

  // Check if this card is currently hovered via the raycasting system
  const hovered = hoveredObject?.userData?.url === resolvedVideoUrl && hoveredObject?.userData?.type === 'video';

  // Set up 3D interaction data after resolvedVideoUrl is available
  useEffect(() => {
    if (groupRef.current) {
      // Set up 3D interaction data for the crosshair system (EXACTLY like WorldObject.tsx)
      const interactionData = {
        interactive: true,
        action: 'view_media',
        objectType: 'video',
        title: title,
        url: resolvedVideoUrl,
        type: 'video'
      };
      
      // CRITICAL FIX: Set userData on BOTH group and mesh for raycasting detection
      groupRef.current.userData = interactionData;
      
      // Also set on mesh when it's available
      if (meshRef.current) {
        meshRef.current.userData = interactionData;
      }
    }
  }, [title, resolvedVideoUrl]);

  // Handle click function (EXACTLY like WorldObject.tsx)
  const handleClick = useCallback((e?: any) => {
    if (e) {
      e.stopPropagation();
    }
    console.log('Video Card clicked!', resolvedVideoUrl);
    if (resolvedVideoUrl) {
      window.open(resolvedVideoUrl, '_blank');
    }
  }, [resolvedVideoUrl]);

  // Update userData with onClick function after handleClick is defined
  useEffect(() => {
    if (groupRef.current && groupRef.current.userData) {
      groupRef.current.userData.onClick = handleClick;
      if (meshRef.current) {
        meshRef.current.userData.onClick = handleClick;
      }
    }
  }, [handleClick]);

  // Check if URL is a direct video file
  const isDirectVideo = useMemo(() => {
    const url = resolvedVideoUrl;
    const videoExtensions = ['.mp4', '.webm', '.mov', '.ogg', '.avi', '.MP4', '.WEBM', '.MOV'];
    return videoExtensions.some(ext => url.toLowerCase().endsWith(ext.toLowerCase())) || 
           (url.startsWith('blob:') || url.startsWith('data:video/'));
  }, [resolvedVideoUrl]);

  // Handle video loading errors
  const handleVideoError = useCallback(() => {
    console.warn(`Failed to load video: ${resolvedVideoUrl}`);
    setVideoError(true);
    setVideoLoaded(false);
  }, [resolvedVideoUrl]);
  
  const handleVideoLoad = useCallback(() => {
    setVideoLoaded(true);
    setVideoError(false);
  }, []);

  // Handle hover events (no longer needed as hover is detected via raycasting)
  const handlePointerEnter = useCallback(() => {
    // Hover state is now managed by the raycasting system
  }, []);

  const handlePointerLeave = useCallback(() => {
    // Hover state is now managed by the raycasting system
  }, []);

  // Optimized floating animation
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      
      // FIXED: Keep cards in their assigned positions with only gentle floating
      const baseY = position[1];
      const floatOffset = Math.sin(time * 0.5 + position[0] * 0.2) * 0.1;
      
      // Lock to original position coordinates
      groupRef.current.position.set(
        position[0], 
        baseY + floatOffset, 
        position[2]
      );
      
      // Simple camera facing without affecting position
      if (camera) {
        const cardWorldPos = new Vector3(position[0], position[1], position[2]);
        const cameraPos = camera.position.clone();
        
        // Calculate direction for rotation only
        const direction = new Vector3().subVectors(cameraPos, cardWorldPos);
        direction.y = 0; // Only Y-axis rotation
        direction.normalize();
        
        // Calculate target Y rotation to face camera
        const targetRotationY = Math.atan2(direction.x, direction.z);
        
        // Smooth rotation interpolation
        const currentRotation = groupRef.current.rotation.y;
        const rotationDiff = targetRotationY - currentRotation;
        
        // Handle rotation wrapping (shortest path)
        let adjustedDiff = rotationDiff;
        if (adjustedDiff > Math.PI) adjustedDiff -= 2 * Math.PI;
        if (adjustedDiff < -Math.PI) adjustedDiff += 2 * Math.PI;
        
        // Apply smooth rotation
        const rotationSpeed = hovered ? 0.06 : 0.03;
        groupRef.current.rotation.y += adjustedDiff * rotationSpeed;
        
        // Add gentle wobble when hovered (rotation only)
        if (hovered) {
          const wobble = Math.sin(time * 2) * 0.005;
          groupRef.current.rotation.y += wobble;
        }
      }
      
      // Smooth scaling on hover
      const targetScale = hovered ? 1.05 : 1.0; 
      const currentScale = groupRef.current.scale.x;
      const newScale = currentScale + (targetScale - currentScale) * 0.1;
      groupRef.current.scale.setScalar(newScale);
    }
  });



  return (
    <group 
      ref={groupRef}
      rotation={rotation}
      onClick={handleClick}
    >
      {/* Invisible 3D mesh for raycasting detection - ENLARGED for better clicking */}
      <mesh
        ref={meshRef}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[videoDimensions.width * 1.5, videoDimensions.height * 1.5]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Video content */}
      <Html
        transform={false}
        distanceFactor={5}
        position={[0, 0, 0.1]}
        style={{
          width: `${videoDimensions.width * (isMobile ? 110 : 100)}px`,
          height: `${videoDimensions.height * (isMobile ? 110 : 100)}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          pointerEvents: 'none',
          borderRadius: '12px',
        }}
      >
        {/* Video container with rounded corners */}
        <div 
          className="video-card" 
          style={{ 
            width: '100%',
            height: '100%',
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#000',
            cursor: 'pointer',
            pointerEvents: 'none',
          }}
        >
          {/* Clean floating title */}
          <div 
            style={{ 
              position: 'absolute',
              top: '-35px',
              left: '0',
              right: '0',
              fontSize: '14px', 
              fontWeight: '600',
              color: '#333333',
              textAlign: 'center',
              padding: '6px 12px',
              width: '100%',
              zIndex: 10,
              fontFamily: 'Helvetica, Arial, sans-serif',
              letterSpacing: '0.3px',
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderRadius: '8px',
              transform: hovered ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.3s ease',
              maxWidth: '90%',
              margin: '0 auto',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </div>
          
          {videoError ? (
            // Error state - show thumbnail or fallback
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#1a1a1a',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed #444',
                color: '#ccc'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📹</div>
              <div style={{ fontSize: '14px', textAlign: 'center', padding: '10px', color: '#999' }}>
                Video unavailable
              </div>
              <div style={{ fontSize: '12px', marginTop: '5px', color: '#666' }}>
                Video file
              </div>
            </div>
          ) : isDirectVideo ? (
            <video
              src={resolvedVideoUrl}
              width={videoDimensions.width * 100}
              height={videoDimensions.height * 100}
              autoPlay
              muted
              loop
              playsInline
              onError={handleVideoError}
              onLoadedData={handleVideoLoad}
              crossOrigin="anonymous"
              style={{ 
                border: 'none',
                borderRadius: '12px',
                width: '100%',
                height: '100%',
                boxShadow: hovered ? '0 0 20px rgba(255,255,255,0.3)' : '0 5px 15px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                objectFit: 'cover',
                backgroundColor: '#000'
              }}
            />
          ) : (
            <iframe
              ref={videoRef}
              src={videoEmbedUrl}
              width={videoDimensions.width * 100}
              height={videoDimensions.height * 100}
              style={{ 
                border: 'none',
                borderRadius: '12px',
                width: '100%',
                height: '100%',
                boxShadow: hovered ? '0 0 20px rgba(255,255,255,0.3)' : '0 5px 15px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                overflow: 'hidden'
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={title}
            />
          )}
          
          {/* Enhanced project info on hover */}
          <div 
            style={{ 
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              fontSize: '12px', 
              fontWeight: '500',
              color: '#ffffff',
              textAlign: 'center',
              padding: '12px 16px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              opacity: hovered ? 1 : 0,
              transform: `translateY(${hovered ? '0' : '20px'})`,
              transition: 'opacity 0.3s ease, transform 0.3s ease',
              borderBottomLeftRadius: '12px',
              borderBottomRightRadius: '12px',
            }}
          >
            {description || "Click to watch video"}
          </div>

          {/* Play indicator */}
          {!videoError && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '48px',
                height: '48px',
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: hovered ? 1 : 0.7,
                transition: 'all 0.3s ease',
                fontSize: '20px',
                color: '#333',
              }}
            >
              ▶
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}; 