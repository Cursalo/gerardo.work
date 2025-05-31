import React, { useState } from 'react';
import { useAudio, Song } from '../context/AudioContext';
import './MusicPlayer.css'; // Assuming styles are in MusicPlayer.css

export const MusicPlayer: React.FC = () => {
  const {
    isMusicPlayerOpen,
    toggleMusicPlayer,
    playlist,
    currentSong,
    setCurrentSong,
    isPlaying,
    setIsPlaying,
    playNextSong,
    playPrevSong,
  } = useAudio();

  // State to track image loading errors
  const [imgErrors, setImgErrors] = useState<{[key: string]: boolean}>({});

  if (!isMusicPlayerOpen) {
    return null;
  }

  const handlePlayPause = () => {
    if (currentSong) {
      setIsPlaying(!isPlaying);
    } else if (playlist.length > 0) {
      // If no current song, play the first song from the playlist
      setCurrentSong(playlist[0]);
      setIsPlaying(true);
    }
  };

  const handleSongSelect = (songId: string) => {
    const songToPlay = playlist.find((s: Song) => s.id === songId);
    if (songToPlay) {
      setCurrentSong(songToPlay);
      setIsPlaying(true);
    }
  };

  const handleImgError = (songId: string) => {
    setImgErrors(prev => ({
      ...prev,
      [songId]: true
    }));
  };

  // Function to get a color based on song id for consistent coloring
  const getColorForSong = (songId: string) => {
    const colors = [
      '#3498db', // Blue
      '#e74c3c', // Red
      '#2ecc71', // Green
      '#f39c12', // Orange
      '#9b59b6', // Purple
      '#1abc9c', // Teal
      '#34495e'  // Dark blue
    ];
    
    // Use a simple hash function to select a color
    const hash = songId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="music-player-overlay">
      <div className="music-player">
        <button className="close-player-btn" onClick={toggleMusicPlayer}>×</button>
        <div className="player-header">
          {currentSong ? (
            imgErrors[currentSong.id] ? (
              <div 
                className="album-art-placeholder" 
                style={{ 
                  backgroundColor: getColorForSong(currentSong.id),
                  width: '80px',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  color: 'white',
                  fontWeight: 'bold',
                  marginRight: '15px'
                }}
              >
                {currentSong.title.charAt(0)}
              </div>
            ) : (
              <img 
                src={currentSong.coverSrc} 
                alt={currentSong.title} 
                className="album-art" 
                onError={() => handleImgError(currentSong.id)}
              />
            )
          ) : (
            <div className="album-art placeholder">No Cover</div>
          )}
          <div className="song-info">
            <h3>{currentSong?.title || 'No Song Selected'}</h3>
            <p>{currentSong?.artist || '-'}</p>
          </div>
        </div>

        <div className="player-controls">
          <button onClick={playPrevSong} disabled={playlist.length <= 1}>◀◀</button>
          <button onClick={handlePlayPause} className="play-pause-btn">
            {isPlaying ? '❚❚' : '▶'}
          </button>
          <button onClick={playNextSong} disabled={playlist.length <= 1}>▶▶</button>
        </div>

        <div className="playlist">
          <h4>Playlist</h4>
          {playlist.length > 0 ? (
            <ul>
              {playlist.map((song: Song) => (
                <li 
                  key={song.id} 
                  onClick={() => handleSongSelect(song.id)} 
                  className={currentSong?.id === song.id ? 'active' : ''}
                >
                  {imgErrors[song.id] ? (
                    <div 
                      className="playlist-cover-placeholder" 
                      style={{ 
                        backgroundColor: getColorForSong(song.id),
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '3px',
                        color: 'white',
                        fontWeight: 'bold',
                        marginRight: '10px'
                      }}
                    >
                      {song.title.charAt(0)}
                    </div>
                  ) : (
                    <img 
                      src={song.coverSrc} 
                      alt={song.title} 
                      className="playlist-cover-thumb" 
                      onError={() => handleImgError(song.id)}
                    />
                  )}
                  <span>{song.title} - {song.artist}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No songs in playlist. Add songs to manifest.json.</p>
          )}
        </div>
      </div>
    </div>
  );
}; 