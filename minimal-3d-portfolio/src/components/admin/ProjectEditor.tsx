import { useState, useEffect } from 'react';
import { Project } from '../../services/projectService';
import '../../styles/admin.css';

interface ProjectEditorProps {
  project: Project | null;
  onSave: (project: Omit<Project, 'id'>) => void;
  onCancel: () => void;
}

export const ProjectEditor = ({ project, onSave, onCancel }: ProjectEditorProps) => {
  const [formData, setFormData] = useState<Omit<Project, 'id'>>({
    name: '',
    description: '',
    link: '',
    thumbnail: '',
    status: 'completed',
    type: 'standard',
    videoUrl: '',
    customLink: ''
  });

  useEffect(() => {
    if (project) {
      setFormData(project);
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="project-editor-overlay">
      <div className="project-editor">
        <h2>{project ? 'Edit Project' : 'Add New Project'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">Type</label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'standard' | 'video' })}
              required
            >
              <option value="standard">Standard</option>
              <option value="video">Video</option>
            </select>
          </div>

          {formData.type === 'video' && (
            <div className="form-group">
              <label htmlFor="videoUrl">Video URL (YouTube)</label>
              <input
                id="videoUrl"
                type="url"
                value={formData.videoUrl || ''}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                required={formData.type === 'video'}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="thumbnail">Thumbnail URL</label>
            <input
              id="thumbnail"
              type="url"
              value={formData.thumbnail}
              onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="link">Project Link</label>
            <input
              id="link"
              type="url"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="customLink">Custom World Link</label>
            <div className="input-with-prefix">
              <span className="input-prefix">/project/</span>
              <input
                id="customLink"
                type="text"
                value={formData.customLink || ''}
                onChange={(e) => setFormData({ ...formData, customLink: e.target.value })}
                placeholder="my-awesome-project"
              />
            </div>
            <small className="input-help">Create a custom URL for this project's world (optional)</small>
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'completed' | 'in-progress' })}
              required
            >
              <option value="completed">Completed</option>
              <option value="in-progress">In Progress</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">Save</button>
            <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}; 