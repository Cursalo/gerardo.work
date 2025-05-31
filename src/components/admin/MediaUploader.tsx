import { useState } from 'react';
import { WorldObject } from '../../data/worlds';
import { useWorld } from '../../context/WorldContext';
import '../../styles/admin.css';

interface MediaUploaderProps {
  worldId: string;
  onClose: () => void;
}

const MediaUploader = ({ worldId, onClose }: MediaUploaderProps) => {
  const { worldService } = useWorld();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'pdf'>('image');
  const [url, setUrl] = useState('');
  const [position, setPosition] = useState<[number, number, number]>([0, 2, 0]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !url) {
      setError('Title and URL are required');
      return;
    }

    try {
      // Get the current world
      const currentWorld = worldService?.getWorld(worldId);
      
      if (!currentWorld) {
        setError('World not found!');
        return;
      }

      // Create the new media object
      const newMedia: WorldObject = {
        id: `media-${Date.now()}`,
        type: mediaType,
        title,
        description,
        url,
        position
      };

      // This is a simplified demonstration - in a real implementation 
      // you would have persistent storage where the worlds are saved
      // For now, we'll simulate adding the media to the world in memory
      
      // Add the new media to the world's objects
      // Note: This is a simplified approach for demo purposes
      // In a real app, you'd update this in a database
      console.log('Adding new media to world:', worldId, newMedia);
      
      // Find any placeholder objects to replace
      const placeholderIndex = currentWorld.objects.findIndex(
        obj => obj.title === 'Upload Media Here'
      );
      
      if (placeholderIndex !== -1) {
        // Replace a placeholder with the new media
        const updatedObjects = [...currentWorld.objects];
        updatedObjects[placeholderIndex] = newMedia;
        
        // Simulate updating the world
        console.log('Updated world objects:', updatedObjects);
        
        // In a real implementation, you would update the world service and persist changes
        setSuccess('Media added successfully! (Replacing a placeholder)');
      } else {
        // Add as a new object
        const updatedObjects = [...currentWorld.objects, newMedia];
        
        // Simulate updating the world
        console.log('Updated world objects:', updatedObjects);
        
        // In a real implementation, you would update the world service and persist changes
        setSuccess('Media added successfully! (Added as new object)');
      }
      
      // Reset form
      setTitle('');
      setDescription('');
      setUrl('');
      setError('');
    } catch (error) {
      console.error('Error adding media:', error);
      setError('Failed to add media. Please try again.');
    }
  };

  return (
    <div className="media-uploader">
      <h2>Upload Media to {worldId}</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title:</label>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Description:</label>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>Media Type:</label>
          <select 
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value as 'image' | 'video' | 'pdf')}
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>URL:</label>
          <input 
            type="text" 
            value={url} 
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <small>For images: direct image URL, for videos: YouTube URL, for PDFs: direct PDF URL</small>
        </div>
        
        <div className="form-group">
          <label>Position:</label>
          <div className="position-inputs">
            <div>
              <label>X:</label>
              <input 
                type="number" 
                value={position[0]} 
                onChange={(e) => setPosition([parseFloat(e.target.value), position[1], position[2]])} 
              />
            </div>
            <div>
              <label>Y:</label>
              <input 
                type="number" 
                value={position[1]} 
                onChange={(e) => setPosition([position[0], parseFloat(e.target.value), position[2]])} 
              />
            </div>
            <div>
              <label>Z:</label>
              <input 
                type="number" 
                value={position[2]} 
                onChange={(e) => setPosition([position[0], position[1], parseFloat(e.target.value)])} 
              />
            </div>
          </div>
        </div>
        
        <div className="button-group">
          <button type="submit">Upload Media</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default MediaUploader; 