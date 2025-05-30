import { WorldObject } from './worlds'; // Added import for WorldObject

export interface Project {
  id: number;
  name: string;
  description: string;
  link: string;
  thumbnail: string;
  status: 'completed' | 'in-progress';
  type: 'standard' | 'video';
  videoUrl?: string;
  customLink?: string;
  mediaObjects?: WorldObject[]; // Added mediaObjects to match projectService.ts
  worldSettings?: {
    backgroundColor: string;
    floorColor: string;
    skyColor: string;
    floorTexture?: string;
    skyTexture?: string;
    ambientLightColor: string;
    ambientLightIntensity: number;
    directionalLightColor: string;
    directionalLightIntensity: number;
  };
}

// Sample YouTube videos (high-quality, short showcase videos)
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

export const projects: Project[] = [
  // Video projects
  ...sampleVideos.map((videoUrl, i): Project => ({
    id: i + 1,
    name: videoTitles[i],
    description: `Official trailer showcase.`,
    link: videoUrl,
    thumbnail: `https://img.youtube.com/vi/${videoUrl.split('v=')[1]}/mqdefault.jpg`,
    status: 'completed',
    type: 'video',
    videoUrl
  })),
  // Standard projects - using SVG data URLs which are guaranteed to work
  ...Array.from({ length: 22 }, (_, i) => {
    // Generate a unique color for each project based on its index
    const hue = ((i * 37) % 360); // Spread colors across the spectrum
    const saturation = 70 + (i % 3) * 10; // Vary saturation slightly
    const lightness = 55 + (i % 4) * 5; // Vary lightness slightly
    
    return {
      id: i + sampleVideos.length + 1,
      name: `Project ${i + sampleVideos.length + 1}`,
      description: `This is a description for Project ${i + sampleVideos.length + 1}. This is a sample project in the 3D portfolio.`,
      link: `https://example.com/project-${i + sampleVideos.length + 1}`,
      thumbnail: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='hsl(${hue}, ${saturation}%25, ${lightness}%25)' /%3E%3Ctext x='150' y='100' font-family='Arial' font-size='24' fill='white' text-anchor='middle' dominant-baseline='middle'%3EProject ${i + sampleVideos.length + 1}%3C/text%3E%3C/svg%3E`,
      status: (i % 5 === 0 ? 'in-progress' : 'completed') as 'completed' | 'in-progress',
      type: 'standard' as 'standard' | 'video'
    };
  })
]; 