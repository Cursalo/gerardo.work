import { useState, useEffect } from 'react';
import { Project, projectService } from '../../services/projectService';
import { ProjectEditor } from './ProjectEditor';
import { useWorld } from '../../context/WorldContext';
import WorldEditor from './WorldEditor';
import MediaUploader from './MediaUploader';
import { World } from '../../data/worlds';
import '../../styles/admin.css';

export const AdminDashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('projects'); // 'projects', 'worlds', or 'media'
  const { worldService } = useWorld();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [selectedWorld, setSelectedWorld] = useState<World | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  useEffect(() => {
    loadProjects();
    
    // Load worlds if worldService is available
    if (worldService) {
      setWorlds(worldService.getAllWorlds());
    }
  }, [worldService]);

  const loadProjects = async () => {
    const loadedProjects = await projectService.getProjects();
    setProjects(loadedProjects);
  };

  const handleSave = async (project: Omit<Project, 'id'>) => {
    try {
      if (selectedProject) {
        await projectService.updateProject(selectedProject.id, project);
      } else {
        // Create a new project with a temporary ID that will be replaced by the service
        const newProject: Project = {
          ...project,
          id: Date.now() // Temporary ID
        };
        await projectService.saveProject(newProject);
      }
      await loadProjects();
      setIsEditing(false);
      setSelectedProject(null);
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Failed to save project');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await projectService.deleteProject(id);
        await loadProjects();
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete project');
      }
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="tab-navigation">
          <button 
            className={activeTab === 'projects' ? 'active' : ''} 
            onClick={() => setActiveTab('projects')}
          >
            Projects
          </button>
          <button 
            className={activeTab === 'worlds' ? 'active' : ''} 
            onClick={() => setActiveTab('worlds')}
          >
            Worlds
          </button>
          <button 
            className={activeTab === 'media' ? 'active' : ''} 
            onClick={() => setActiveTab('media')}
          >
            Media Upload
          </button>
        </div>
      </header>
      
      {activeTab === 'projects' && (
        <div className="projects-section">
          <div className="projects-list">
            <h2>Projects</h2>
            <button 
              className="add-button"
              onClick={() => {
                setSelectedProject(null);
                setIsEditing(true);
              }}
            >
              Add New Project
            </button>
            <ul>
              {projects.map(project => (
                <li key={project.id}>
                  <span>{project.name}</span>
                  <div className="project-actions">
                    <button 
                      onClick={() => {
                        setSelectedProject(project);
                        setIsEditing(true);
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-button"
                      onClick={() => handleDelete(project.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          {isEditing && (
            <div className="project-editor-container">
              <ProjectEditor 
                project={selectedProject}
                onSave={handleSave}
                onCancel={() => {
                  setIsEditing(false);
                  setSelectedProject(null);
                }}
              />
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'worlds' && (
        <div className="worlds-section">
          <div className="worlds-list">
            <h2>Worlds</h2>
            <ul>
              {worlds.map(world => (
                <li 
                  key={world.id}
                  className={selectedWorld?.id === world.id ? 'selected' : ''}
                  onClick={() => setSelectedWorld(world)}
                >
                  {world.name}
                </li>
              ))}
            </ul>
          </div>
          
          {selectedWorld && (
            <WorldEditor 
              world={selectedWorld}
              onClose={() => setSelectedWorld(null)}
            />
          )}
        </div>
      )}
      
      {activeTab === 'media' && (
        <div className="media-section">
          <div className="worlds-list">
            <h2>Select World for Media Upload</h2>
            <ul>
              {worlds
                .filter(world => world.id !== 'mainWorld') // Only show subworlds
                .map(world => (
                <li 
                  key={world.id}
                  className={isUploadingMedia && selectedWorld?.id === world.id ? 'selected' : ''}
                  onClick={() => {
                    setSelectedWorld(world);
                    setIsUploadingMedia(true);
                  }}
                >
                  {world.name}
                </li>
              ))}
            </ul>
          </div>
          
          {isUploadingMedia && selectedWorld && (
            <div className="media-uploader-container">
              <MediaUploader 
                worldId={selectedWorld.id}
                onClose={() => {
                  setIsUploadingMedia(false);
                  setSelectedWorld(null);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 