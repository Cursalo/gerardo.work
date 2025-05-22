import React from 'react';
import { Link } from 'react-router-dom';
import { Project } from '../services/projectService';

interface ProjectLinkProps {
  project: Project;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * ProjectLink component
 * 
 * Creates a link to a project world using the project's customLink property.
 * Falls back to project ID if customLink is not available.
 */
const ProjectLink: React.FC<ProjectLinkProps> = ({ project, children, className, style }) => {
  // Generate the link path
  const linkPath = project.customLink 
    ? `/project/${project.customLink}` 
    : `/world/project-world-${project.id}`;
  
  return (
    <Link 
      to={linkPath} 
      className={className}
      style={style}
    >
      {children || project.name}
    </Link>
  );
};

export default ProjectLink; 