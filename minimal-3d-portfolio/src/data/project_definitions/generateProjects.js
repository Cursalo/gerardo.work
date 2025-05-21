// Script to generate project JSON files directly
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample YouTube videos
const sampleVideos = [
  'https://www.youtube.com/watch?v=TcMBFSGVi1c', // Avengers: Endgame Trailer
  'https://www.youtube.com/watch?v=JfVOs4VSpmA', // Spider-Man: No Way Home Trailer
  'https://www.youtube.com/watch?v=8g18jFHCLXk', // Dune Official Trailer
  'https://www.youtube.com/watch?v=sj9J2ecsSpo', // The Batman Trailer
  'https://www.youtube.com/watch?v=giXco2jaZ_4', // Top Gun: Maverick Official Trailer
  'https://www.youtube.com/watch?v=odM92ap8_c0', // Black Panther: Wakanda Forever
  'https://www.youtube.com/watch?v=X0tOpBuYasI', // Inception Official Trailer
  'https://www.youtube.com/watch?v=5PSNL1qE6VY'  // Avatar: The Way of Water Trailer
];

const videoTitles = [
  'Avengers: Endgame',
  'Spider-Man: No Way Home',
  'Dune',
  'The Batman',
  'Top Gun: Maverick',
  'Black Panther: Wakanda Forever',
  'Inception',
  'Avatar: The Way of Water'
];

// Generate projects
const projects = [
  // Video projects
  ...sampleVideos.map((videoUrl, i) => {
    const projectId = i + 1;
    const hue = ((projectId * 47) % 360); // Different hue calculation
    const saturation = 60 + (projectId % 5) * 8; 
    const lightness = 50 + (projectId % 6) * 5;
    
    return {
      id: projectId,
      name: videoTitles[i],
      description: `Official trailer showcase for ${videoTitles[i]}.`,
      link: videoUrl,
      thumbnail: `https://img.youtube.com/vi/${videoUrl.split('v=')[1]}/mqdefault.jpg`,
      status: 'completed',
      type: 'video',
      videoUrl,
      worldSettings: {
        backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness - 10}%)`,
        floorColor: `hsl(${hue}, ${saturation - 10}%, ${lightness - 20}%)`,
        skyColor: `hsl(${hue + 60 % 360}, ${saturation}%, ${lightness + 10}%)`,
        floorTexture: `https://picsum.photos/seed/floor${projectId}/1024/1024`, // Placeholder
        skyTexture: `https://picsum.photos/seed/sky${projectId}/2048/1024`,     // Placeholder
        ambientLightColor: '#ffffff',
        ambientLightIntensity: 0.7 + (projectId % 4) * 0.1,
        directionalLightColor: `hsl(${hue - 30 % 360}, 100%, 80%)`,
        directionalLightIntensity: 0.8 + (projectId % 3) * 0.2,
      },
      mediaObjects: [
        {
          id: `video-player-${projectId}`,
          type: 'video',
          title: videoTitles[i],
          description: 'Main video content.',
          url: videoUrl,
          thumbnail: `https://img.youtube.com/vi/${videoUrl.split('v=')[1]}/hqdefault.jpg`,
          position: [0, 2.5, -8],
          rotation: [0, 0, 0],
          scale: [4, 2.25, 1], // 16:9 aspect ratio scaled up
        },
        {
          id: `info-panel-${projectId}`,
          type: 'image', // Could be a 'text' type if supported
          title: 'About This Video',
          description: `This is the official trailer for ${videoTitles[i]}. Enjoy the showcase!`,
          // Placeholder image for info panel
          thumbnail: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='hsl(${hue}, ${saturation-20}%, ${lightness-5}%)' /%3E%3Ctext x='200' y='150' font-family='Arial' font-size='20' fill='white' text-anchor='middle' dominant-baseline='middle'%3EInfo for ${videoTitles[i]}%3C/text%3E%3C/svg%3E`,
          position: [-4, 2, -7],
          rotation: [0, Math.PI / 8, 0],
          scale: [2, 1.5, 0.1],
        },
      ],
    };
  }),
  // Standard projects - using SVG data URLs which are guaranteed to work
  ...Array.from({ length: 22 }, (_, i) => {
    const projectId = i + sampleVideos.length + 1;
    // Generate a unique color for each project based on its index
    const hue = ((projectId * 37) % 360); // Spread colors across the spectrum
    const saturation = 70 + (projectId % 3) * 10; // Vary saturation slightly
    const lightness = 55 + (projectId % 4) * 5; // Vary lightness slightly
    
    return {
      id: projectId,
      name: `Project ${projectId}`,
      description: `This is a description for Project ${projectId}. This is a sample project in the 3D portfolio, showcasing a unique environment and interactive elements.`,
      link: `https://example.com/project-${projectId}`,
      thumbnail: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='hsl(${hue}, ${saturation}%25, ${lightness}%25)' /%3E%3Ctext x='150' y='100' font-family='Arial' font-size='24' fill='white' text-anchor='middle' dominant-baseline='middle'%3EProject ${projectId}%3C/text%3E%3C/svg%3E`,
      status: (projectId % 5 === 0 ? 'in-progress' : 'completed'),
      type: 'standard',
      worldSettings: {
        backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness - 15}%)`,
        floorColor: `hsl(${hue + 20 % 360}, ${saturation - 5}%, ${lightness - 25}%)`,
        skyColor: `hsl(${hue - 40 % 360}, ${saturation + 10}%, ${lightness + 15}%)`,
        floorTexture: `https://picsum.photos/seed/sfloor${projectId}/1024/1024`, // Placeholder
        skyTexture: `https://picsum.photos/seed/ssky${projectId}/2048/1024`,     // Placeholder
        ambientLightColor: '#ddddff',
        ambientLightIntensity: 0.6 + (projectId % 5) * 0.08,
        directionalLightColor: `hsl(${hue + 90 % 360}, 80%, 75%)`,
        directionalLightIntensity: 0.9 + (projectId % 4) * 0.15,
      },
      mediaObjects: [
        {
          id: `main-showcase-${projectId}`,
          type: 'image',
          title: `Showcase for Project ${projectId}`,
          description: 'Primary visual element for this project.',
          thumbnail: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='hsl(${hue}, ${saturation+10}%, ${lightness+5}%)' /%3E%3Ctext x='300' y='200' font-family='Arial' font-size='30' fill='white' text-anchor='middle' dominant-baseline='middle'%3EProject ${projectId} Main Showcase%3C/text%3E%3C/svg%3E`,
          url: `https://example.com/project-${projectId}/details`,
          position: [0, 2.5, -9],
          rotation: [0, 0, 0],
          scale: [3, 2, 0.1],
        },
        {
          id: `related-link-${projectId}`,
          type: 'link',
          title: 'More Info',
          description: 'Find more information about this project here.',
          url: `https://example.com/project-${projectId}/more-info`,
          position: [3.5, 1.5, -7],
          rotation: [0, -Math.PI / 6, 0],
          scale: [1.5, 1, 0.1],
        },
        {
          id: `decorative-element-${projectId}`,
          type: 'image', // Could be a 3D model if supported and assets available
          title: 'Decorative Sphere',
          thumbnail: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='hsl(${hue+120 % 360}, ${saturation}%, ${lightness+20}%)' /%3E%3C/svg%3E`,
          position: [-3.5, 1.8, -6.5],
          rotation: [Math.PI / 4, Math.PI / 4, 0], // Random rotation
          scale: [1, 1, 1],
        },
      ],
    };
  })
];

// Create each project JSON file
projects.forEach((project) => {
  const fileName = `project_${project.id}.json`;
  const filePath = path.join(__dirname, fileName);
  
  // Write JSON file
  fs.writeFileSync(filePath, JSON.stringify(project, null, 2));
  console.log(`Created ${fileName}`);
});

console.log(`Successfully created ${projects.length} project JSON files`); 