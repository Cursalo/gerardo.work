import { useState } from 'react';
import { World, WorldObject } from '../../data/worlds';
import '../../styles/admin.css';

interface WorldEditorProps {
  world: World;
  onClose: () => void;
}

export const WorldEditor = ({ world, onClose }: WorldEditorProps) => {
  const [name, setName] = useState(world.name);
  const [description, setDescription] = useState(world.description || '');
  const [backgroundColor, setBackgroundColor] = useState(world.backgroundColor || '#ffffff');
  const [cameraX, setCameraX] = useState(world.cameraPosition?.x || 0);
  const [cameraY, setCameraY] = useState(world.cameraPosition?.y || 2);
  const [cameraZ, setCameraZ] = useState(world.cameraPosition?.z || 5);
  const [objects, setObjects] = useState<WorldObject[]>(world.objects);
  const [selectedObjectIndex, setSelectedObjectIndex] = useState<number | null>(null);
  
  // Subworld customization options
  const [floorColor, setFloorColor] = useState(world.floorColor || '#cccccc');
  const [floorTexture, setFloorTexture] = useState(world.floorTexture || '');
  const [skyColor, setSkyColor] = useState(world.skyColor || '#87ceeb');
  const [skyTexture, setSkyTexture] = useState(world.skyTexture || '');
  const [ambientLightColor, setAmbientLightColor] = useState(world.ambientLightColor || '#ffffff');
  const [ambientLightIntensity, setAmbientLightIntensity] = useState(world.ambientLightIntensity || 0.5);
  const [directionalLightColor, setDirectionalLightColor] = useState(world.directionalLightColor || '#ffffff');
  const [directionalLightIntensity, setDirectionalLightIntensity] = useState(world.directionalLightIntensity || 0.8);
  
  // Media management
  const [newMediaTitle, setNewMediaTitle] = useState('');
  const [newMediaDescription, setNewMediaDescription] = useState('');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video' | 'pdf'>('image');
  const [newMediaURL, setNewMediaURL] = useState('');
  const [newMediaPositionX, setNewMediaPositionX] = useState(0);
  const [newMediaPositionY, setNewMediaPositionY] = useState(2);
  const [newMediaPositionZ, setNewMediaPositionZ] = useState(0);

  const handleSave = () => {
    // In a real implementation, this would update the world data
    const updatedWorld: World = {
      ...world,
      name,
      description,
      backgroundColor,
      cameraPosition: {
        x: cameraX,
        y: cameraY,
        z: cameraZ
      },
      // Add subworld customization
      floorColor,
      floorTexture,
      skyColor,
      skyTexture,
      ambientLightColor,
      ambientLightIntensity,
      directionalLightColor,
      directionalLightIntensity,
      objects
    };
    
    console.log('Updated world:', updatedWorld);
    alert('World saved successfully!');
    onClose();
  };

  const handleObjectSelect = (index: number) => {
    setSelectedObjectIndex(index);
  };

  const handleObjectUpdate = (field: keyof WorldObject, value: any) => {
    if (selectedObjectIndex === null) return;
    
    const updatedObjects = [...objects];
    updatedObjects[selectedObjectIndex] = {
      ...updatedObjects[selectedObjectIndex],
      [field]: value
    };
    
    setObjects(updatedObjects);
  };
  
  const handleDeleteObject = () => {
    if (selectedObjectIndex === null) return;
    
    if (window.confirm('Are you sure you want to delete this object?')) {
      const updatedObjects = [...objects];
      updatedObjects.splice(selectedObjectIndex, 1);
      setObjects(updatedObjects);
      setSelectedObjectIndex(null);
    }
  };
  
  const handleAddMedia = () => {
    if (!newMediaTitle || !newMediaURL) {
      alert('Title and URL are required for new media');
      return;
    }
    
    const newMedia: WorldObject = {
      id: `media-${Date.now()}`,
      type: newMediaType,
      title: newMediaTitle,
      description: newMediaDescription,
      url: newMediaURL,
      position: [newMediaPositionX, newMediaPositionY, newMediaPositionZ] as [number, number, number]
    };
    
    setObjects([...objects, newMedia]);
    
    // Reset form
    setNewMediaTitle('');
    setNewMediaDescription('');
    setNewMediaURL('');
    setNewMediaPositionX(0);
    setNewMediaPositionY(2);
    setNewMediaPositionZ(0);
    
    alert('Media added successfully!');
  };

  return (
    <div className="world-editor">
      <h2>Edit World: {world.id}</h2>
      
      <div className="editor-tabs">
        <button className="tab-button active">Basic Settings</button>
        <button className="tab-button">Environment</button>
        <button className="tab-button">Media</button>
      </div>
      
      <div className="tab-content">
        <div className="tab-pane active">
          <h3>Basic Information</h3>
          <div className="form-group">
            <label>Name:</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
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
            <label>Background Color:</label>
            <input 
              type="color" 
              value={backgroundColor} 
              onChange={(e) => setBackgroundColor(e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label>Camera Position:</label>
            <div className="position-inputs">
              <div>
                <label>X:</label>
                <input 
                  type="number" 
                  value={cameraX} 
                  onChange={(e) => setCameraX(parseFloat(e.target.value))} 
                />
              </div>
              <div>
                <label>Y:</label>
                <input 
                  type="number" 
                  value={cameraY} 
                  onChange={(e) => setCameraY(parseFloat(e.target.value))} 
                />
              </div>
              <div>
                <label>Z:</label>
                <input 
                  type="number" 
                  value={cameraZ} 
                  onChange={(e) => setCameraZ(parseFloat(e.target.value))} 
                />
              </div>
            </div>
          </div>
          
          <h3>Environment Customization</h3>
          <div className="form-group">
            <label>Floor Color:</label>
            <input 
              type="color" 
              value={floorColor} 
              onChange={(e) => setFloorColor(e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label>Floor Texture URL (optional):</label>
            <input 
              type="text" 
              value={floorTexture} 
              onChange={(e) => setFloorTexture(e.target.value)} 
              placeholder="URL to floor texture image"
            />
          </div>
          
          <div className="form-group">
            <label>Sky Color:</label>
            <input 
              type="color" 
              value={skyColor} 
              onChange={(e) => setSkyColor(e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label>Sky Texture URL (optional):</label>
            <input 
              type="text" 
              value={skyTexture} 
              onChange={(e) => setSkyTexture(e.target.value)} 
              placeholder="URL to skybox texture image"
            />
          </div>
          
          <div className="form-group">
            <label>Ambient Light Color:</label>
            <input 
              type="color" 
              value={ambientLightColor} 
              onChange={(e) => setAmbientLightColor(e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label>Ambient Light Intensity:</label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.1" 
              value={ambientLightIntensity} 
              onChange={(e) => setAmbientLightIntensity(parseFloat(e.target.value))} 
            />
            <span>{ambientLightIntensity}</span>
          </div>
          
          <div className="form-group">
            <label>Directional Light Color:</label>
            <input 
              type="color" 
              value={directionalLightColor} 
              onChange={(e) => setDirectionalLightColor(e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label>Directional Light Intensity:</label>
            <input 
              type="range" 
              min="0" 
              max="2" 
              step="0.1" 
              value={directionalLightIntensity} 
              onChange={(e) => setDirectionalLightIntensity(parseFloat(e.target.value))} 
            />
            <span>{directionalLightIntensity}</span>
          </div>
        </div>
      </div>
      
      <div className="objects-section">
        <div className="section-header">
          <h3>Media Objects ({objects.length})</h3>
          <button 
            className="add-media-button"
            onClick={() => document.getElementById('add-media-form')?.classList.toggle('active')}
          >
            Add New Media
          </button>
        </div>
        
        <div id="add-media-form" className="add-media-form">
          <h4>Add New Media</h4>
          <div className="form-group">
            <label>Title:</label>
            <input 
              type="text" 
              value={newMediaTitle} 
              onChange={(e) => setNewMediaTitle(e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label>Description:</label>
            <textarea 
              value={newMediaDescription} 
              onChange={(e) => setNewMediaDescription(e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label>Media Type:</label>
            <select 
              value={newMediaType}
              onChange={(e) => setNewMediaType(e.target.value as 'image' | 'video' | 'pdf')}
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
              value={newMediaURL} 
              onChange={(e) => setNewMediaURL(e.target.value)} 
              placeholder={
                newMediaType === 'image' ? 'URL to image file' : 
                newMediaType === 'video' ? 'YouTube URL' : 'URL to PDF file'
              }
            />
          </div>
          
          <div className="form-group">
            <label>Position:</label>
            <div className="position-inputs">
              <div>
                <label>X:</label>
                <input 
                  type="number" 
                  value={newMediaPositionX} 
                  onChange={(e) => setNewMediaPositionX(parseFloat(e.target.value))} 
                />
              </div>
              <div>
                <label>Y:</label>
                <input 
                  type="number" 
                  value={newMediaPositionY} 
                  onChange={(e) => setNewMediaPositionY(parseFloat(e.target.value))} 
                />
              </div>
              <div>
                <label>Z:</label>
                <input 
                  type="number" 
                  value={newMediaPositionZ} 
                  onChange={(e) => setNewMediaPositionZ(parseFloat(e.target.value))} 
                />
              </div>
            </div>
          </div>
          
          <div className="button-group">
            <button onClick={handleAddMedia}>Add Media</button>
            <button onClick={() => document.getElementById('add-media-form')?.classList.remove('active')}>Cancel</button>
          </div>
        </div>
        
        <div className="objects-container">
          <div className="objects-list">
            {objects.map((object, index) => (
              <div 
                key={object.id}
                className={`object-item ${selectedObjectIndex === index ? 'selected' : ''}`}
                onClick={() => handleObjectSelect(index)}
              >
                <div className="object-type-badge">{object.type}</div>
                <div className="object-title">{object.title}</div>
              </div>
            ))}
          </div>
          
          {selectedObjectIndex !== null && (
            <div className="object-editor">
              <h4>Edit Object: {objects[selectedObjectIndex].title}</h4>
              <div className="form-group">
                <label>Title:</label>
                <input 
                  type="text" 
                  value={objects[selectedObjectIndex].title} 
                  onChange={(e) => handleObjectUpdate('title', e.target.value)} 
                />
              </div>
              
              <div className="form-group">
                <label>Type:</label>
                <select 
                  value={objects[selectedObjectIndex].type}
                  onChange={(e) => handleObjectUpdate('type', e.target.value)}
                >
                  <option value="project">Project</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="pdf">PDF</option>
                  <option value="link">Link</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Description:</label>
                <textarea 
                  value={objects[selectedObjectIndex].description || ''} 
                  onChange={(e) => handleObjectUpdate('description', e.target.value)} 
                />
              </div>
              
              <div className="form-group">
                <label>URL:</label>
                <input 
                  type="text" 
                  value={objects[selectedObjectIndex].url || ''} 
                  onChange={(e) => handleObjectUpdate('url', e.target.value)} 
                />
              </div>
              
              <div className="form-group">
                <label>Position:</label>
                <div className="position-inputs">
                  <input 
                    type="number" 
                    value={objects[selectedObjectIndex].position?.[0] || 0} 
                    onChange={(e) => {
                      const position = objects[selectedObjectIndex].position || [0, 0, 0];
                      position[0] = parseFloat(e.target.value);
                      handleObjectUpdate('position', position);
                    }} 
                  />
                  <input 
                    type="number" 
                    value={objects[selectedObjectIndex].position?.[1] || 0} 
                    onChange={(e) => {
                      const position = objects[selectedObjectIndex].position || [0, 0, 0];
                      position[1] = parseFloat(e.target.value);
                      handleObjectUpdate('position', position);
                    }} 
                  />
                  <input 
                    type="number" 
                    value={objects[selectedObjectIndex].position?.[2] || 0} 
                    onChange={(e) => {
                      const position = objects[selectedObjectIndex].position || [0, 0, 0];
                      position[2] = parseFloat(e.target.value);
                      handleObjectUpdate('position', position);
                    }} 
                  />
                </div>
              </div>
              
              <div className="object-editor-actions">
                <button onClick={handleDeleteObject} className="delete-button">Delete Object</button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="button-group">
        <button onClick={handleSave}>Save World</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};

export default WorldEditor; 