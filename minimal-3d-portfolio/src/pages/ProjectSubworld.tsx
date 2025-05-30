import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import { projects } from '../data/projects';
import * as THREE from 'three';

interface ProjectSubworldProps {}

const ProjectSubworld: React.FC<ProjectSubworldProps> = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<typeof projects[0] | undefined>(undefined);
  const [projectHTML, setProjectHTML] = useState<string | null>(null);
  const [mediaItems, setMediaItems] = useState<string[]>([]); // To store paths to media

  useEffect(() => {
    // Find the project based on the projectId from the URL
    const foundProject = projects.find(p => p.id === parseInt(projectId || '', 10));
    if (foundProject) {
      setProject(foundProject);
      // Load HTML and media if projectPath exists
      if (foundProject.projectPath) {
        // Load the index.html file content
        fetch(`${foundProject.projectPath}index.html`)
          .then(response => {
            if (!response.ok) throw new Error('Failed to load HTML');
            return response.text();
          })
          .then(html => setProjectHTML(html))
          .catch(error => {
            console.error('Error loading project HTML:', error);
            setProjectHTML('<p>Failed to load project details.</p>'); // Display error message
          });
          
        // In a real scenario, you would need a way to list files in the media folder.
        // Browsers cannot list local files directly. You would need a backend endpoint
        // or a pre-generated manifest file in the project folder (e.g., media.json)
        // listing the media files.
        
        // For this example, we'll just add a placeholder for how you might list media.
        // Assuming a media.json file exists in the projectPath:
        fetch(`${foundProject.projectPath}media/media.json`)
          .then(response => {
             if (!response.ok) throw new Error('Failed to load media manifest');
             return response.json();
          })
          .then((mediaManifest: { files: string[] }) => {
             // Prepend the projectPath to make URLs relative to the public folder
             const mediaUrls = mediaManifest.files.map(file => `${foundProject.projectPath}media/${file}`);
             setMediaItems(mediaUrls);
          })
          .catch(error => {
             console.warn('No media manifest found or error loading media:', error);
             setMediaItems([]); // No media or failed to load
          });

      } else {
        // If no projectPath, maybe display a message or redirect
        setProjectHTML('<p>No detailed subworld available for this project.</p>');
        setMediaItems([]);
      }
    } else {
      // Project not found, redirect or show an error
      navigate('/'); // Redirect to home or a 404 page
    }
  }, [projectId, navigate]);

  if (!project) {
    return <div>Loading or Project Not Found...</div>; // Loading state or fallback
  }

  return (
    <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
      <Suspense fallback={null}> {/* Add Suspense for async loading */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Environment preset="sunset" /> {/* Example environment */}

        {/* Render Project HTML */}
        {projectHTML && (
          <Html position={[-4, 2, 0]} transform rotation={[0, 0, 0]} scale={[0.02, 0.02, 0.02]}> {/* Adjust position and scale as needed */}
            <div style={{ background: 'white', padding: '10px', borderRadius: '5px' }}>
              {/* Dangerously set inner HTML from the fetched content. 
                  Be cautious with this if the HTML source is not trusted. */}
              <div dangerouslySetInnerHTML={{ __html: projectHTML }} />
            </div>
          </Html>
        )}

        {/* Render Media Items as Cards */}
        {mediaItems.map((mediaUrl, index) => (
          <mesh key={mediaUrl} position={[-4 + index * 2, -2, 0]}> {/* Example positioning */}
            {/* You would load texture/video based on file extension */}
            <boxGeometry args={[1, 1, 0.1]} />
            <meshStandardMaterial color="gray" /> {/* Placeholder material */}
            {/* Logic to load and apply texture/video based on mediaUrl */}
          </mesh>
        ))}

        <OrbitControls enableZoom enablePan enableRotate />

      </Suspense>
    </Canvas>
  );
};

export default ProjectSubworld; 