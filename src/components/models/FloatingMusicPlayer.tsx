import React, { useState, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useAudio, Song } from '../../context/AudioContext';
import * as THREE from 'three';
import '../../components/FloatingMusicPlayer.css';
import useMobileDetection from '../../hooks/useMobileDetection';

interface FloatingMusicPlayerProps {
  position?: [number, number, number];
  scale?: number;
}

// Moved InteractiveButton outside FloatingMusicPlayer
const InteractiveButton = ({ 
  children, 
  onClick, 
  className, 
  id,
  position // This position is the base position of the FloatingMusicPlayer
}: { 
  children: React.ReactNode;
  onClick: () => void;
  className: string;
  id: string;
  position: [number, number, number]; // Ensure this is correctly typed and used
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { raycaster, camera, scene } = useThree(); // useThree can be called here
  
  useEffect(() => {
    if (buttonRef.current) {
      const buttonEl = buttonRef.current;
      // It's tricky to get precise world positions of HTML elements overlaid with Drei's Html.
      // The existing logic for mesh placement seems to be an attempt to align a 3D object with the HTML button.
      // For simplicity and robustness, if this button is purely for HTML interaction,
      // the 3D mesh part might be redundant if standard HTML event handling is sufficient.
      // However, the comment "Fixed interactive button class to work with green crosshair"
      // suggests a 3D interaction is intended.

      // Simplified approach: Create a small interactive mesh in front of the player,
      // relying on the HTML for visual rendering and the mesh for raycast detection.
      // The exact positioning would need careful calibration relative to the FloatingMusicPlayer's position.

      const geometry = new THREE.BoxGeometry(0.5, 0.2, 0.1); // Example dimensions, adjust as needed
      const material = new THREE.MeshBasicMaterial({ 
        transparent: true, 
        opacity: 0.0, // Keep it invisible
        visible: false // Ensure it's not accidentally visible
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // Position the mesh based on button ID - this needs a strategy.
      // For now, let's assume a fixed offset for simplicity; this will need refinement.
      let offsetX = 0;
      if (id === 'prev') offsetX = -0.7;
      else if (id === 'play-pause') offsetX = 0;
      else if (id === 'next') offsetX = 0.7;
      else if (id === 'playlist') offsetX = 1.4; // Further to the side

      mesh.position.set(
        position[0] + offsetX,
        position[1] -0.3, // Slightly below the center of the player
        position[2] + 0.1 // Slightly in front
      );
      
      mesh.userData = { 
        type: 'ui-button',
        id: `music-player-button-${id}`,
        action: 'click',
        onClick: () => { // Ensure onClick is correctly called
          console.log(`InteractiveButton ${id} 3D mesh clicked`);
          onClick();
        }
      };
      
      scene.add(mesh);
      
      return () => {
        scene.remove(mesh);
      };
    }
  }, [onClick, scene, position, id, camera, raycaster]); // Dependencies seem okay

  return (
    <button
      ref={buttonRef}
      className={className}
      onClick={(e) => {
        e.stopPropagation(); // Good for preventing event bubbling in HTML
        onClick();
      }}
      id={`html-music-player-button-${id}`} // Distinguish HTML id if needed
    >
      {children}
    </button>
  );
};

export function FloatingMusicPlayer({ 
  position = [0, 2.5, 0], 
  scale = 1 
}: FloatingMusicPlayerProps) {
  const {
    audioListener,
    isMusicPlayerOpen,
    toggleMusicPlayer,
    playlist,
    currentSong,
    setCurrentSong,
    isPlaying,
    setIsPlaying,
    playNextSong,
    playPrevSong,
    audioRef,
    hasUserInteracted // Same as above
  } = useAudio();
  const { isMobile, isTouchDevice } = useMobileDetection(); // This hook is present

  const groupRef = useRef<THREE.Group>(null);
  const htmlRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [imgErrors, setImgErrors] = useState<{[key: string]: boolean}>({});
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [validPlaylist, setValidPlaylist] = useState<Song[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { scene } = useThree(); // Already using useThree here
  
  useEffect(() => {
    if (groupRef.current) {
      const geometry = new THREE.BoxGeometry(3, 1.5, 0.5); // Main player body
      const material = new THREE.MeshBasicMaterial({ 
        transparent: true, 
        opacity: 0.01,
        visible: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, 0, 0); 
      mesh.userData = { 
        type: 'music-player',
        id: 'music-player-area',
        interactive: true,
        raycastable: true
      };
      groupRef.current.add(mesh);
      return () => {
        if (groupRef.current) {
          groupRef.current.remove(mesh);
        }
      };
    }
  }, [scene]); // Dependency on scene is fine
  
  useEffect(() => {
    if (playlist && playlist.length > 0) {
      console.log("Setting valid playlist:", playlist.length, "songs");
      setValidPlaylist(playlist);
      const voyageSong = playlist.find(song => song.title.toLowerCase().includes("voyage"));
      if (voyageSong && (!currentSong || currentSong.id !== voyageSong.id)) {
        console.log("Found Voyage song, setting as current");
        setCurrentSong(voyageSong);
        // Autoplay logic is handled by AudioContext based on user interaction
        // setIsPlaying(false); // Explicitly not setting isPlaying here
      } else if (!currentSong && playlist.length > 0) {
        console.log("No specific song found, setting first song");
        setCurrentSong(playlist[0]);
      }
    } else {
      setErrorMessage("No songs available");
    }
  }, [playlist, currentSong, setCurrentSong]); // Removed setIsPlaying dependency

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const floatY = Math.sin(clock.getElapsedTime() * 0.8) * 0.05;
      groupRef.current.position.y = position[1] + floatY;
      if (hover) {
        groupRef.current.scale.lerp(new THREE.Vector3(scale * 1.1, scale * 1.1, scale * 1.1), 0.1);
      } else {
        groupRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
      }
    }
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (!duration && audioRef.current.duration) {
        setDuration(audioRef.current.duration);
      }
    }
  });

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  const handlePlayClick = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSongSelect = (songId: string) => {
    console.log("Song selected:", songId);
    const songToPlay = validPlaylist.find((s: Song) => s.id === songId);
    if (songToPlay) {
      setCurrentSong(songToPlay);
      setIsPlaying(true); // Selecting a song should attempt to play it
    }
    setShowPlaylist(false);
  };

  const handleImgError = (songId: string) => {
    setImgErrors(prev => ({ ...prev, [songId]: true }));
  };

  const togglePlaylist = () => {
    console.log("Toggling playlist visibility");
    setShowPlaylist(!showPlaylist);
  };

  const getColorForSong = (songId: string) => {
    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e'];
    const hash = songId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <group 
      ref={groupRef}
      position={[position[0], position[1], position[2]]} // Use the destructured position
      scale={scale}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
      userData={{ type: 'music-player', interactive: true, raycastable: true }}
    >
      <Html
        ref={htmlRef}
        transform
        distanceFactor={10}
        position={[0, 0, 0]} // HTML is relative to the group
        className="html-container"
        style={{ width: '300px', height: 'auto', pointerEvents: 'auto' }}
        prepend
        zIndexRange={[100, 0]}
      >
        <div 
          className="floating-music-player"
          // onClick and onTouchStart were removed for the main div, which is good.
          // handleUserInteraction is called on button clicks now.
        >
          {(isMobile || isTouchDevice) && !hasUserInteracted && ( // hasUserInteracted might not be available
            <div className="floating-mobile-hint">
              Tap to enable music playback
            </div>
          )}
          
          <div className="floating-player-header">
            <div className="cover-container">
              {currentSong ? (
                imgErrors[currentSong.id] ? (
                  <div className="floating-album-art-placeholder" style={{ backgroundColor: getColorForSong(currentSong.id) }}>
                    {currentSong.title.charAt(0)}
                  </div>
                ) : (
                  <img src={currentSong.coverSrc} alt={currentSong.title} className="floating-album-art" onError={() => handleImgError(currentSong.id)} />
                )
              ) : (
                <div className="floating-album-art placeholder">No Song</div>
              )}
            </div>
            <div className="floating-song-info">
              <h3>{currentSong?.title || 'Select a Song'}</h3>
              <p>{currentSong?.artist || '-'}</p>
              <div className="floating-progress-container">
                <div className="floating-progress-bg"></div>
                <div className="floating-progress-bar" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}></div>
              </div>
              <div className="floating-time-display">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          <div className="floating-player-controls">
            <InteractiveButton className="floating-control-btn" onClick={playPrevSong} id="prev" position={position} >⏮</InteractiveButton>
            <InteractiveButton className="floating-play-pause-btn" onClick={handlePlayClick} id="play-pause" position={position} >{isPlaying ? '⏸' : '▶'}</InteractiveButton>
            <InteractiveButton className="floating-control-btn" onClick={playNextSong} id="next" position={position}>⏭</InteractiveButton>
            <InteractiveButton className="floating-playlist-btn" onClick={togglePlaylist} id="playlist" position={position}>≡</InteractiveButton>
          </div>

          {showPlaylist && (
            <div className="floating-playlist">
              {validPlaylist && validPlaylist.length > 0 ? (
                <ul>
                  {validPlaylist.map((song: Song, index) => (
                    <li key={song.id} onClick={() => handleSongSelect(song.id)} className={currentSong?.id === song.id ? 'active' : ''} data-song-id={song.id} id={`song-${index}`}>
                      {imgErrors[song.id] ? (
                        <div className="floating-playlist-cover-placeholder" style={{ backgroundColor: getColorForSong(song.id) }}>{song.title.charAt(0)}</div>
                      ) : (
                        <img src={song.coverSrc} alt={song.title} className="floating-playlist-cover-thumb" onError={() => handleImgError(song.id)} />
                      )}
                      <span>{song.title} - {song.artist}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No songs in playlist</p>
              )}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
} 