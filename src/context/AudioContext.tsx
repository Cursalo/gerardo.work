import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import * as THREE from 'three';

export interface Song {
  id: string;
  title: string;
  artist: string;
  audioSrc: string;
  coverSrc: string;
}

// Cleaned AudioContextType: handleUserInteraction and hasUserInteracted are internal
interface AudioContextType {
  audioListener: THREE.AudioListener | null;
  isMusicPlayerOpen: boolean;
  toggleMusicPlayer: () => void;
  playlist: Song[];
  currentSong: Song | null;
  setCurrentSong: (song: Song | null) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  playNextSong: () => void;
  playPrevSong: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  hasUserInteracted: boolean; // Expose this
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [audioListener] = useState(() => new THREE.AudioListener());
  const [isMusicPlayerOpen, setIsMusicPlayerOpen] = useState(false);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [failedSongs, setFailedSongs] = useState<Set<string>>(new Set());
  const [hasUserInteracted, setHasUserInteracted] = useState(false); // Internal state

  useEffect(() => {
    fetch('/assets/music/manifest.json')
      .then(res => res.json())
      .then((data: Song[]) => {
        const validSongs = data.filter(song => !failedSongs.has(song.id));
        setPlaylist(validSongs);
        const voyageSong = validSongs.find(song => song.id === "voyage");
        if (voyageSong && !currentSong) {
          setCurrentSong(voyageSong);
        }
      })
      .catch(error => console.error("Failed to load playlist manifest:", error));
  }, [failedSongs, currentSong]);

  useEffect(() => {
    if (!hasUserInteracted) {
      const handleActualInteraction = () => {
        setHasUserInteracted(true);
        // Now that user has interacted, if Voyage is the current song and not playing, play it.
        if (currentSong && currentSong.id === "voyage" && !isPlaying && audioRef.current) {
            // Ensure src is set before playing, especially if it wasn't set due to no-autoplay
            if (audioRef.current.src !== currentSong.audioSrc) {
                audioRef.current.src = currentSong.audioSrc;
            }
            audioRef.current.play().then(() => {
                console.log("User interacted, now playing Voyage song");
                setIsPlaying(true);
            }).catch(e => console.error("Error auto-playing Voyage after interaction:", e));
        }
      };
      const events = ['click', 'touchstart', 'keydown', 'scroll'];
      events.forEach(event => document.addEventListener(event, handleActualInteraction, { once: true }));
      return () => {
        events.forEach(event => document.removeEventListener(event, handleActualInteraction));
      };
    }
  }, [currentSong, isPlaying, hasUserInteracted]); // Dependencies for the interaction effect

  const toggleMusicPlayer = () => setIsMusicPlayerOpen(prev => !prev);

  const playSongInternal = (song: Song) => {
    if (audioRef.current) {
      audioRef.current.src = song.audioSrc;
      audioRef.current.play().catch(e => {
        console.error("Error playing audio:", e);
        setFailedSongs(prev => new Set([...prev, song.id]));
        tryPlayNextAvailableSong(song.id);
      });
    }
  };

  const handleSetCurrentSong = (song: Song | null) => {
    setCurrentSong(song);
    if (song) {
      // Only attempt to play if user has interacted OR if it's not Voyage (other songs play on selection)
      if (hasUserInteracted || song.id !== "voyage") {
        setIsPlaying(true); // This will trigger the playback useEffect
      } else {
        setIsPlaying(false); // For Voyage, wait for interaction effect if not yet interacted
      }
    } else {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    }
  };
  
  const tryPlayNextAvailableSong = (currentFailedSongId: string) => {
    if (playlist.length <= 1) return;
    const currentIndex = playlist.findIndex(s => s.id === currentFailedSongId);
    let nextIndex = (currentIndex + 1) % playlist.length;
    let attempts = 0;
    while (attempts < playlist.length) {
      const nextSongToTry = playlist[nextIndex];
      if (!failedSongs.has(nextSongToTry.id)) {
        setCurrentSong(nextSongToTry); // Set it as current
        setIsPlaying(true); // Attempt to play
        return;
      }
      nextIndex = (nextIndex + 1) % playlist.length;
      attempts++;
    }
    setIsPlaying(false); // All other songs failed
  };

  const playNextSong = () => {
    if (!currentSong || playlist.length === 0) return;
    const currentIndex = playlist.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % playlist.length;
    handleSetCurrentSong(playlist[nextIndex]);
  };

  const playPrevSong = () => {
    if (!currentSong || playlist.length === 0) return;
    const currentIndex = playlist.findIndex(s => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    handleSetCurrentSong(playlist[prevIndex]);
  };
  
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && currentSong) {
        // Play only if user has interacted, or if the song is not Voyage (which has special interaction handling for its first play)
        if (hasUserInteracted || (currentSong && currentSong.id !== 'voyage') || (currentSong && currentSong.id === 'voyage' && audioRef.current.played.length > 0) ) {
            if (audioRef.current.src !== currentSong.audioSrc) {
                audioRef.current.src = currentSong.audioSrc;
            }
            // Check if ready to play, then play
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error("Error in main playback useEffect:", error);
                    setFailedSongs(prev => new Set([...prev, currentSong.id]));
                    setIsPlaying(false); // Stop trying to play this song if it errors here
                    // Optionally, try next song: tryPlayNextAvailableSong(currentSong.id);
                });
            }
        } else if (currentSong && currentSong.id === 'voyage' && !hasUserInteracted) {
            // For Voyage, if not interacted, ensure it's paused and src is set for later play by interaction handler
            audioRef.current.pause();
            if (audioRef.current.src !== currentSong.audioSrc) {
                 audioRef.current.src = currentSong.audioSrc;
            }
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSong, playlist, hasUserInteracted]); // Added hasUserInteracted

  return (
    <AudioContext.Provider value={{
      audioListener,
      isMusicPlayerOpen,
      toggleMusicPlayer,
      playlist,
      currentSong,
      setCurrentSong: handleSetCurrentSong, // Use the refined handler
      isPlaying,
      setIsPlaying,
      playNextSong,
      playPrevSong,
      audioRef,
      hasUserInteracted // Provide this in context
      // handleUserInteraction and hasUserInteracted are not exposed
    }}>
      {children}
      <audio ref={audioRef} onEnded={playNextSong} />
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}; 