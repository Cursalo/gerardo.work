import React from 'react';
import { useWorld } from '../../context/WorldContext';
import { projectService } from '../../services/projectService';
import { getWorldServiceInstance, createProjectWorld } from '../../data/worlds';
import useMobileDetection from '../../hooks/useMobileDetection';

interface ViewWorldButtonProps {
  projectId: number;
  className?: string;
}

const ViewWorldButton: React.FC<ViewWorldButtonProps> = ({ projectId, className }) => {
  const { setCurrentWorldId, refreshWorlds, worldService } = useWorld();
  const { isTouchDevice } = useMobileDetection();

  const handleViewWorld = async () => {
    try {
      // Get the project data
      const project = await projectService.getProjectById(projectId);
      if (!project) {
        console.error(`Project with ID ${projectId} not found`);
        return;
      }

      // Define the world ID
      const worldId = `project-world-${projectId}`;
      console.log(`ViewWorldButton: Setting target world ID to ${worldId}`);
      
      // Force clear the world service cache to ensure fresh data
      worldService.clearAllWorlds();
      
      // Check if the world exists, if not create it
      let world = worldService.getWorld(worldId);
      if (!world) {
        console.log(`World ${worldId} does not exist, creating it`);
        world = createProjectWorld(project, isTouchDevice);
        worldService.updateWorld(world);
        console.log(`Created world: ${worldId}`);
      } else {
        console.log(`World ${worldId} already exists`);
      }
      
      // Store the target world ID in localStorage so it persists across page loads
      localStorage.setItem('target_world_id', worldId);
      
      // Also store the project ID to help with world creation if needed
      localStorage.setItem('target_project_id', projectId.toString());
      
      // Set the current world ID in the context
      setCurrentWorldId(worldId);
      
      // Refresh worlds to ensure they're up to date
      await refreshWorlds();
      
      // Add a longer delay to ensure the world is loaded before navigating
      setTimeout(() => {
        // Navigate to the custom link if available, otherwise go to the world directly
        if (project.customLink) {
          console.log(`Navigating to custom link: /project/${project.customLink}`);
          window.location.href = `/project/${project.customLink}`;
        } else {
          console.log(`Navigating to world: /world/${worldId}`);
          window.location.href = `/world/${worldId}`;
        }
      }, 500); // Increased delay to ensure world is loaded
    } catch (error) {
      console.error('Error viewing world:', error);
    }
  };

  return (
    <button 
      className={className || 'view-world-btn'}
      onClick={handleViewWorld}
    >
      View World
    </button>
  );
};

export default ViewWorldButton; 