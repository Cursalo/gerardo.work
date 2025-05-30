import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PositionalAudio } from '@react-three/drei';
import * as THREE from 'three';
import { SpeakerModel } from './models/SpeakerModel';
import { useAudio } from '../context/AudioContext';
import { useInteraction } from '../context/InteractionContext';
import useMobileDetection from '../hooks/useMobileDetection';

interface SpeakerExperienceProps {
  position?: [number, number, number];
  scale?: number | [number, number, number];
  rotation?: [number, number, number];
  proximityAudioSrc?: string; // Optional: specify a different track for proximity
}

// Audio distance settings
const MIN_PROXIMITY_DISTANCE = 5; // Kept for reference or other uses, not for new volume logic directly
const MAX_PROXIMITY_DISTANCE = 15; 
const MAX_VOLUME = 0.7;
const FRONT_DISTANCE = 1.5; // New: Distance for full volume

// Interaction distance settings - separate for mobile and desktop
const DESKTOP_INTERACTION_DISTANCE = 4;
const MOBILE_INTERACTION_DISTANCE = 7; // Larger for easier touch interaction
const RAYCAST_INTERVAL = 200; // Milliseconds between raycast checks

// Define working audio sources we're certain about (WAV files are more reliable than MP3s)
const FALLBACK_AUDIO_SOURCES = [
  '/assets/music/Begin Again.wav',
  '/assets/music/I Hate Restaurants.wav',
  '/assets/music/Fine Dining Is Overrated.wav'
];

// Define the SoundCloud URL for integration
const SOUNDCLOUD_URL = 'https://soundcloud.com/platejams';

export function SpeakerExperience({ 
  position = [0, 0, -5], 
  scale = 1, 
  rotation = [0, 0, 0],
  proximityAudioSrc
}: SpeakerExperienceProps) {
  const { camera, raycaster, mouse, scene } = useThree();
  const { audioListener, toggleMusicPlayer, playlist, hasUserInteracted: contextHasUserInteracted } = useAudio();
  const { setHoveredObject } = useInteraction();
  const { isMobile, isTouchDevice } = useMobileDetection();
  
  const speakerRef = useRef<THREE.Group | null>(null);
  const audioRef = useRef<THREE.PositionalAudio | null>(null);
  const [isProximityAudioPlaying, setIsProximityAudioPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  // Get appropriate interaction distance based on device
  const interactionDistance = isMobile || isTouchDevice 
    ? MOBILE_INTERACTION_DISTANCE 
    : DESKTOP_INTERACTION_DISTANCE;

  // Get a safe audio source to use
  const getWorkingAudioSource = useCallback(() => {
    // If provided directly, try that first
    if (proximityAudioSrc) return proximityAudioSrc;
    
    // Next try the first song from the playlist
    if (playlist && playlist.length > 0) {
      return playlist[0].audioSrc;
    }
    
    // Finally, use one of our fallback WAV files
    return FALLBACK_AUDIO_SOURCES[currentAudioIndex];
  }, [proximityAudioSrc, playlist, currentAudioIndex]);

  const actualAudioSrc = getWorkingAudioSource();

  // Setup speaker as interactive object with appropriate userData
  useEffect(() => {
    if (speakerRef.current) {
      // Add userData to make it interactive for the interaction system
      speakerRef.current.userData = {
        interactive: true,
        type: 'link',
        url: SOUNDCLOUD_URL,
        title: 'Listen on SoundCloud',
        name: 'Speaker',
        action: 'externalLink',
        onClick: handleSpeakerClick
      };

      // Make all meshes in the group interactive for more reliable hit detection
      speakerRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          // Enhanced userData for each child mesh
          child.userData = { 
            ...speakerRef.current?.userData,
            interactive: true,
            parentId: 'speaker',
            isSpeakerPart: true, // Use this flag to identify speaker parts in raycasting
          };
          // Make sure the mesh can be raycasted
          child.raycast = (child as THREE.Mesh).raycast; // Ensure raycast method is present
        }
      });

      console.log("Speaker set up as interactive object with enhanced hitbox");
    }
  }, [speakerRef.current]);

  // Attach audioListener to camera and manage AudioContext resume
  useEffect(() => {
    if (audioListener && camera) {
      if (!camera.children.includes(audioListener)) {
        console.log("Adding audio listener to camera");
        camera.add(audioListener);
      }

      // Attempt to resume audio context if user has interacted
      if (contextHasUserInteracted && audioListener.context.state === 'suspended') {
        console.log("User has interacted, attempting to resume audio context for positional audio.");
        audioListener.context.resume().catch(e => console.error("Error resuming audio context:", e));
      }
      
      return () => {
        if (camera && audioListener && audioListener.parent === camera) {
          console.log("Removing audio listener from camera");
          camera.remove(audioListener);
        }
      };
    }
  }, [camera, audioListener, contextHasUserInteracted]);

  // Enhanced proximity and raycast detection for more accurate hitbox
  useEffect(() => {
    if (!speakerRef.current || !camera || !scene) return;

    // Function to update hover state based on precise raycast
    const updateHoverState = () => {
      if (!speakerRef.current) return;
      
      // Get distance to speaker center
      const distance = camera.position.distanceTo(
        new THREE.Vector3(
          speakerRef.current.position.x + position[0],
          speakerRef.current.position.y + position[1],
          speakerRef.current.position.z + position[2]
        )
      );
      
      // Only check for raycasting if within interaction distance
      if (distance <= interactionDistance * 1.5) {
        // For desktop: use the mouse position for raycasting
        if (!isTouchDevice) {
          raycaster.setFromCamera(mouse, camera);
          const intersects = raycaster.intersectObjects(scene.children, true);
          
          // Check if any of the intersected objects are part of the speaker
          const speakerIntersection = intersects.find(intersection => 
            intersection.object.userData?.isSpeakerPart === true ||
            intersection.object.parent?.userData?.isSpeakerPart === true
          );
          
          if (speakerIntersection && !isHovering) {
            setIsHovering(true);
            setHoveredObject(speakerRef.current);
          } else if (!speakerIntersection && isHovering) {
            setIsHovering(false);
            setHoveredObject(null);
          }
        } 
        // For mobile: use camera direction and proximity for interaction
        else {
          // If within direct interaction range
          if (distance <= interactionDistance) {
            // Create direction vector from camera to speaker
            const cameraDirection = new THREE.Vector3();
            camera.getWorldDirection(cameraDirection);
            
            // Get vector to speaker
            const speakerDirection = new THREE.Vector3()
              .subVectors(
                new THREE.Vector3().addVectors(
                  speakerRef.current.position,
                  new THREE.Vector3(...position)
                ),
                camera.position
              ).normalize();
            
            // Calculate angle between camera direction and direction to speaker
            const angle = cameraDirection.angleTo(speakerDirection);
            
            // If camera is looking roughly towards the speaker (within ~30 degrees)
            if (angle < 0.5) {
              if (!isHovering) {
                setIsHovering(true);
                setHoveredObject(speakerRef.current);
              }
            } else if (isHovering) {
              setIsHovering(false);
              setHoveredObject(null);
            }
          } else if (isHovering) {
            setIsHovering(false);
            setHoveredObject(null);
          }
        }
      } else if (isHovering) {
        setIsHovering(false);
        setHoveredObject(null);
      }
    };
    
    // Run the hover check at regular intervals
    const checkInterval = setInterval(updateHoverState, RAYCAST_INTERVAL);
    
    // Also run it immediately
    updateHoverState();
    
    return () => {
      clearInterval(checkInterval);
      // Clean up hover state when unmounting
      if (isHovering) {
        setHoveredObject(null);
      }
    };
  }, [camera, scene, raycaster, mouse, isHovering, speakerRef.current, position, interactionDistance, isTouchDevice, setHoveredObject]);

  // Handle audio errors
  const handleAudioError = useCallback(() => {
    console.error(`Error loading audio: ${actualAudioSrc}`);
    setAudioError(true);
    
    // Try the next fallback audio
    const nextIndex = (currentAudioIndex + 1) % FALLBACK_AUDIO_SOURCES.length;
    setCurrentAudioIndex(nextIndex);
    
    // Reset the error state after choosing a new audio source
    setTimeout(() => setAudioError(false), 500);
  }, [actualAudioSrc, currentAudioIndex]);

  // Manage audio playback based on distance
  useFrame(() => {
    if (!speakerRef.current || !audioRef.current || !audioListener || audioError) return;

    // Ensure audio context is running if user has interacted
    if (contextHasUserInteracted && audioListener.context.state === 'suspended') {
      audioListener.context.resume().catch(e => console.error("Error resuming audio context in useFrame:", e));
    }
    
    // Only proceed with playback logic if context is running
    if (audioListener.context.state !== 'running') {
      if (isProximityAudioPlaying) {
        audioRef.current.setVolume(0);
        if (audioRef.current.isPlaying) {
            audioRef.current.pause();
        }
        setIsProximityAudioPlaying(false);
      }
      return;
    }

    try {
      const distance = camera.position.distanceTo(
        new THREE.Vector3(
          speakerRef.current.position.x + position[0],
          speakerRef.current.position.y + position[1],
          speakerRef.current.position.z + position[2]
        )
      );

      let volume = 0;

      if (distance < MAX_PROXIMITY_DISTANCE && distance > 0) {
        if (distance <= FRONT_DISTANCE) {
          volume = MAX_VOLUME;
        } else {
          // Volume increases as distance decreases from MAX_PROXIMITY_DISTANCE to FRONT_DISTANCE
          volume = MAX_VOLUME * (1 - (distance - FRONT_DISTANCE) / (MAX_PROXIMITY_DISTANCE - FRONT_DISTANCE));
        }
        volume = Math.max(0, Math.min(MAX_VOLUME, volume)); // Clamp volume

        if (volume > 0.01) { // Threshold to start/keep playing
          if (!isProximityAudioPlaying) {
            try {
              // Rely on PositionalAudio's loop and internal handling once context is active.
              // Play will be attempted if not already playing and buffer is loaded.
              if (!audioRef.current.isPlaying) {
                audioRef.current.play(); 
                console.log("Attempting to play proximity audio.");
              }
              // If it starts playing (or is already playing), set state.
              // The check for isPlaying might be true shortly after play() if successful.
              if(audioRef.current.isPlaying){
                setIsProximityAudioPlaying(true);
              }
            } catch (error) {
              console.error("Error playing proximity audio:", error);
              handleAudioError();
            }
          }
          audioRef.current.setVolume(volume);
        } else { // volume is too low or zero
          if (isProximityAudioPlaying) {
            audioRef.current.setVolume(0);
            if (audioRef.current.isPlaying) {
              audioRef.current.pause(); // Pause instead of stop to allow resume
            }
            setIsProximityAudioPlaying(false);
            console.log("Proximity audio paused (volume too low).");
          }
        }
      } else { // Out of MAX_PROXIMITY_DISTANCE range
        if (isProximityAudioPlaying) {
          audioRef.current.setVolume(0);
          if (audioRef.current.isPlaying) {
            audioRef.current.pause(); // Pause
          }
          setIsProximityAudioPlaying(false);
          console.log("Proximity audio paused (out of range).");
        }
      }
    } catch (error) {
      console.error("Error in audio frame handler:", error);
      handleAudioError();
    }
  });
  
  // Handle speaker click to open SoundCloud
  const handleSpeakerClick = useCallback(() => {
    console.log("Speaker clicked - opening SoundCloud");
    
    // Open SoundCloud profile in a new tab
    window.open(SOUNDCLOUD_URL, '_blank');
    
    // Remove music player toggle to prevent popup
    // toggleMusicPlayer(); 
  }, []);

  if (!audioListener) {
    console.warn("AudioListener not available from context yet.");
    return null;
  }

  return (
    <group position={position} scale={scale} rotation={rotation}>
      <SpeakerModel 
        modelRef={speakerRef} 
        onClick={handleSpeakerClick} 
        // Add hover state for visual feedback
        onPointerOver={() => {
          if (!isTouchDevice) {
            setIsHovering(true);
            setHoveredObject(speakerRef.current);
          }
        }}
        onPointerOut={() => {
          if (!isTouchDevice) {
            setIsHovering(false);
            setHoveredObject(null);
          }
        }}
      />
      {!audioError && actualAudioSrc && (
        <PositionalAudio 
            ref={audioRef} 
            url={actualAudioSrc} 
            distance={1} // RefDistance for rolloff - adjust as needed, smaller makes it attenuate faster
            loop
        />
      )}
    </group>
  );
} 