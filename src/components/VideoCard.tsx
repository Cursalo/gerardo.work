import { useState, useRef, useContext, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Mesh, Group, Vector3, Matrix4, Quaternion } from 'three';
import { VisibilityContext } from './Scene';
import { useWorld } from '../context/WorldContext';
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
 * Optimized for crosshair interaction through the center of the screen.
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
  const [isOverlapping, setIsOverlapping] = useState(false);
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const videoRef = useRef<HTMLIFrameElement>(null);
  
  // Get camera from three.js context
  const { camera } = useThree();
  
  // Get visibility tools from context
  const { registerPosition, checkOverlap } = useContext(VisibilityContext);

  // Get the setter from context
  const { setCurrentWorldId } = useWorld();
  const { hoveredObject } = useInteraction();

  // Generate a stable ID for this card for interaction context
  const cardInstanceId = useRef(`videocard-${id}-${Math.random().toString(36).substring(7)}`).current;
  
  // Old idRef for visibility context, can be kept or merged if logic allows
  const visibilityIdRef = useRef<number>(Math.floor(Math.random() * 10000)); 

  // Register position and check for overlaps
  useEffect(() => {
    registerPosition(visibilityIdRef.current, position);
  }, [position, registerPosition]);
  
  // Set this object as interactive for raycasting and crosshair interaction
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.userData.interactive = true;
      meshRef.current.userData.onClick = handleClick;
    }
    
    // Set userData for BillboardManager to recognize this as a card
    if (groupRef.current) {
      groupRef.current.userData.objectType = 'video';
      groupRef.current.name = 'videoCard';
    }
  }, []);
  
  // Update hover state based on InteractionContext
  useEffect(() => {
    const isHoveredByCrosshair = hoveredObject?.userData?.id === cardInstanceId;
    if (hovered !== isHoveredByCrosshair) { // Only update if state changes
        updateHoverState(isHoveredByCrosshair);
    }
  }, [hoveredObject, cardInstanceId, hovered]); // Added hovered to dependencies to avoid stale closure in updateHoverState if it relied on it

  // Handle hover tracking internally
  const updateHoverState = (isHovered: boolean) => {
    setHovered(isHovered);
    
    // Apply scale effect on hover
    if (groupRef.current) {
      const targetScale = isHovered ? 1.15 : 1.0;
      groupRef.current.scale.set(targetScale, targetScale, targetScale);
    }
  };
  
  // Calculate video dimensions using 4:3 aspect ratio
  const width = 200;
  const height = width * (3/4); // 4:3 aspect ratio

  // Extract YouTube video ID from URL or handle other video types
  const getVideoEmbedUrl = (url: string) => {
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
    
    // Direct video file or other video URL - can be played directly
    return url;
  };

  // Check if URL is a direct video file
  const isDirectVideo = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.ogg', '.avi'];
    return videoExtensions.some(ext => url.toLowerCase().endsWith(ext)) || 
           (url.startsWith('blob:') || url.startsWith('data:video/'));
  };

  // Handle click interaction - REMOVED - Parent WorldObject handles clicks
  const handleClick = () => {
    // Construct the project world ID
    const projectWorldId = `project-world-${id}`;
    console.log(`VideoCard clicked: Navigating to ${projectWorldId}`);
    // Set the current world ID in the context to trigger navigation
    setCurrentWorldId(projectWorldId);
    // We might remove the isPlaying toggle if navigation is the primary action
    setIsPlaying(!isPlaying);
  };

  const getScale = () => {
    if (hovered) return 1.2;
    if (!camera) return 1;
    
    const distance = new Vector3(position[0], position[1], position[2])
      .distanceTo(camera.position);
    
    if (distance < 8) {
      return 1.1 + ((8 - distance) / 8) * 0.1;
    } else if (distance < 20) {
      return 0.9 + ((20 - distance) / 12) * 0.2;
    } else {
      return Math.max(0.7, 0.9 - ((distance - 20) / 40) * 0.2);
    }
  };

  // Calculate frame dimensions
  const frameWidth = width * 1.1;
  const frameHeight = height * 1.2;

  // Add useEffect to set initial position
  useEffect(() => {
    if (groupRef.current) {
      // Set initial position directly
      groupRef.current.position.set(position[0], position[1], position[2]);
    }
  }, [position]);

  return (
    <group 
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      rotation={rotation}
      scale={getScale()}
    >
      {/* Card frame */}
      <mesh 
        ref={meshRef} 
        castShadow 
        receiveShadow
      >
        <boxGeometry args={[frameWidth / 100, frameHeight / 100, 0.05]} />
        <meshStandardMaterial 
          color={hovered ? "#ffffff" : "#f0f0f0"} 
          metalness={0.7}
          roughness={0.2}
          emissive={hovered ? "#ffffff" : "#aaaaaa"}
          emissiveIntensity={hovered ? 0.5 : 0.2}
        />
      </mesh>
      
      {/* Video content */}
      <Html
        transform
        distanceFactor={8}
        position={[0, 0, 0.03]}
        style={{
          width: `${width}px`,
          height: `${height}px`,
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
          }}
        >
          {/* Clean floating title */}
          <div 
            style={{ 
              position: 'absolute',
              top: '-30px',
              left: '0',
              right: '0',
              fontSize: '12px', 
              fontWeight: '500',
              color: '#ffffff',
              textAlign: 'center',
              padding: '3px 6px',
              width: '100%',
              zIndex: 10,
              fontFamily: 'Helvetica, Arial, sans-serif',
              letterSpacing: '0.5px',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              backgroundColor: 'rgba(0,0,0,0.4)',
              opacity: 0.8,
              transform: hovered ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.2s ease'
            }}
          >
            {title.replace(/\.[^/.]+$/, "")}
          </div>
          
          {isDirectVideo(videoUrl) ? (
            <video
              src={videoUrl}
              width={width}
              height={height}
              autoPlay
              muted
              loop
              playsInline
              style={{ 
                border: 'none',
                borderRadius: '12px',
                width: `${width}px`,
                height: `${height}px`,
                boxShadow: hovered ? '0 0 20px rgba(255,255,255,0.5)' : '0 5px 15px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                pointerEvents: 'auto',
                objectFit: 'cover'
              }}
            />
          ) : (
            <iframe
              ref={videoRef}
              src={getVideoEmbedUrl(videoUrl)}
              width={width}
              height={height}
              style={{ 
                border: 'none',
                borderRadius: '12px',
                width: `${width}px`,
                height: `${height}px`,
                boxShadow: hovered ? '0 0 20px rgba(255,255,255,0.5)' : '0 5px 15px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                pointerEvents: 'auto',
                overflow: 'hidden'
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
          
          {/* Enhanced project info on hover */}
          <div 
            style={{ 
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              fontSize: '14px', 
              fontWeight: '500',
              color: '#ffffff',
              textAlign: 'center',
              padding: '8px 10px',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              opacity: hovered ? 1 : 0,
              transform: `translateY(${hovered ? '0' : '20px'})`,
              transition: 'opacity 0.3s ease, transform 0.3s ease',
              pointerEvents: 'none',
            }}
          >
            {description || "Click to play/pause"}
          </div>
        </div>
      </Html>
    </group>
  );
}; 