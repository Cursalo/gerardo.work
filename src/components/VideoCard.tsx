import { useState, useRef, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Mesh, Group, Vector3 } from 'three';

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
  const [hovered, setHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const videoRef = useRef<HTMLIFrameElement>(null);
  
  // Get camera from three.js context
  const { camera } = useThree();
  
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

  // Handle hover events
  const handlePointerEnter = useCallback(() => {
    setHovered(true);
    document.body.style.cursor = 'pointer';
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = 'default';
  }, []);

  // Handle click for video playback
  const handleClick = useCallback(() => {
    if (resolvedVideoUrl) {
      window.open(resolvedVideoUrl, '_blank');
    }
  }, [resolvedVideoUrl]);

  // Optimized floating animation
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      const baseY = position[1];
      
      // Gentle floating animation
      const floatOffset = Math.sin(time * 0.5 + position[0] * 0.2) * 0.1;
      groupRef.current.position.y = baseY + floatOffset;
      
      // Keep fixed position in world space
      groupRef.current.position.x = position[0];
      groupRef.current.position.z = position[2];
      
      // Face the camera smoothly
      if (camera) {
        const cardPosition = new Vector3(position[0], position[1], position[2]);
        const cameraPosition = camera.position.clone();
        
        // Calculate direction from card to camera
        const direction = new Vector3().subVectors(cameraPosition, cardPosition);
        direction.y = 0; // Only rotate on Y axis
        direction.normalize();
        
        // Calculate target rotation to face camera
        const targetRotationY = Math.atan2(direction.x, direction.z);
        
        // Smooth interpolation with different speeds for hover state
        if (hovered) {
          // Add slight wobble when hovered
          const wobble = Math.sin(time * 2) * 0.01;
          groupRef.current.rotation.y += (targetRotationY + wobble - groupRef.current.rotation.y) * 0.08;
        } else {
          // Smoothly face camera
          groupRef.current.rotation.y += (targetRotationY - groupRef.current.rotation.y) * 0.04;
        }
      }
      
      // Smooth scaling on hover
      const targetScale = hovered ? 1.05 : 1.0; // Reduced scale effect
      const currentScale = groupRef.current.scale.x;
      const newScale = currentScale + (targetScale - currentScale) * 0.1;
      groupRef.current.scale.setScalar(newScale);
    }
  });



  return (
    <group 
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      rotation={rotation}

      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      {/* Card frame - temporarily disabled to debug duplicates */}
      {/* <mesh 
        ref={meshRef} 
        castShadow 
        receiveShadow
      >
        <boxGeometry args={[videoDimensions.frameWidth, videoDimensions.frameHeight, 0.05]} />
        <meshStandardMaterial 
          color={hovered ? "#ffffff" : "#f0f0f0"} 
          metalness={0.1}
          roughness={0.4}
          emissive={hovered ? "#ffffff" : "#e0e0e0"}
          emissiveIntensity={hovered ? 0.3 : 0.1}
        />
      </mesh> */}
      
      {/* Video content */}
      <Html
        transform
        distanceFactor={8}
        position={[0, 0, 0.03]}
        style={{
          width: `${videoDimensions.width * 100}px`,
          height: `${videoDimensions.height * 100}px`,
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
            pointerEvents: 'none',
            backgroundColor: '#000',
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
              backdropFilter: 'blur(4px)',
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
                Click to open original
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
                pointerEvents: 'none',
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
                pointerEvents: 'none',
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
              backdropFilter: 'blur(4px)',
              opacity: hovered ? 1 : 0,
              transform: `translateY(${hovered ? '0' : '20px'})`,
              transition: 'opacity 0.3s ease, transform 0.3s ease',
              pointerEvents: 'none',
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
                backdropFilter: 'blur(4px)',
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