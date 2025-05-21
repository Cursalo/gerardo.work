// Script to create project.json files in each project folder
// This script will create a project.json file in each project directory
// with proper local URLs instead of GitHub URLs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory equivalent to __dirname in CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const projectsDir = path.join(__dirname, 'public', 'projects');

// Map project IDs to folder names
const PROJECT_MAPPING = {
  4: "Burgertify",
  5: "Cursalo",
  6: "Foodketing",
  7: "Foodelopers",
  8: "Jaguar",
  9: "Matrix Agencia",
  10: "Wobistro",
  11: "Tokitaka",
  12: "EaxiAI",
  13: "Eaxily",
  14: "Talevista",
  15: "LinkMas",
  16: "LinkDialer",
  17: "AIClases.com",
  18: "BonsaiPrep",
  19: "Blue Voyage Travel",
  20: "Menu Crafters",
  21: "Monchee",
  22: "PitchDeckGenie",
  23: "PlatePlatform",
  24: "PostRaptor",
  25: "Power Up Pizza",
  26: "RAM",
  27: "Hybridge",
  28: "Burgavision",
  29: "Foodiez Apparel",
  30: "Avatarmatic",
  31: "Beta",
  32: "Amazonia Apoteket",
  // Add more mappings as needed
};

// Function to create a basic project JSON structure
function createProjectJson(id, folderName) {
  return {
    id: id,
    name: folderName,
    description: `Project details for ${folderName}.`,
    link: `/projects/${folderName}/index.html`,
    thumbnail: `/projects/${folderName}/assets/images/thumbnail.jpg`,
    status: "completed",
    type: "standard",
    videoUrl: `/projects/${folderName}/assets/videos/demo.mp4`,
    worldSettings: {
      backgroundColor: "hsl(188, 92%, 60%)",
      floorColor: "#ffffff",
      skyColor: "hsl(248, 92%, 80%)",
      floorTexture: "",
      skyTexture: "",
      ambientLightColor: "#ffffff",
      ambientLightIntensity: 0.7,
      directionalLightColor: "hsl(158, 100%, 80%)",
      directionalLightIntensity: 1
    },
    mediaObjects: [
      {
        id: `video-player-${id}`,
        type: "video",
        title: `${folderName} Main Video`,
        description: `Main video content for ${folderName}.`,
        url: `/projects/${folderName}/assets/videos/demo.mp4`,
        thumbnail: `/projects/${folderName}/assets/images/thumbnail.jpg`,
        position: [0, 2.5, -8],
        rotation: [0, 0, 0],
        scale: [4, 2.25, 1]
      },
      {
        id: `info-panel-${id}`,
        type: "image",
        title: `About ${folderName}`,
        description: `Information and assets for the ${folderName} project.`,
        thumbnail: `/projects/${folderName}/assets/images/thumbnail.jpg`,
        position: [-4, 2, -7],
        rotation: [0, 0.39269908169872414, 0],
        scale: [2, 1.5, 0.1]
      }
    ],
    assetGallery: []
  };
}

// Function to check for existing assets and add them to the gallery
function populateAssetGallery(projectJson, folderName) {
  const projectDir = path.join(projectsDir, folderName);
  const assetsDir = path.join(projectDir, 'assets');
  
  if (!fs.existsSync(assetsDir)) {
    console.log(`No assets directory found for ${folderName}`);
    return projectJson;
  }
  
  const assetTypes = ['images', 'videos', 'documents', 'preview'];
  const assetGallery = [];
  
  assetTypes.forEach(type => {
    const typeDir = path.join(assetsDir, type);
    if (fs.existsSync(typeDir)) {
      try {
        const files = fs.readdirSync(typeDir);
        files.forEach(file => {
          // Skip hidden files
          if (file.startsWith('.')) return;
          
          let assetType = 'other';
          let category = type;
          
          // Determine asset type
          if (type === 'images') assetType = 'image';
          else if (type === 'videos') assetType = 'video';
          else if (type === 'documents') assetType = 'document';
          
          // Add to gallery
          assetGallery.push({
            name: file,
            type: assetType,
            category: category,
            url: `/projects/${folderName}/assets/${type}/${file}`
          });
          
          // If this is a good thumbnail candidate, use it
          if (type === 'images' && (file.includes('thumbnail') || file.includes('logo') || file.includes('main'))) {
            projectJson.thumbnail = `/projects/${folderName}/assets/${type}/${file}`;
          }
          
          // If this is a good video candidate, use it
          if (type === 'videos' && (file.includes('demo') || file.includes('main') || file.includes('intro'))) {
            projectJson.videoUrl = `/projects/${folderName}/assets/${type}/${file}`;
            
            // Also update the video in mediaObjects
            const videoObj = projectJson.mediaObjects.find(obj => obj.type === 'video');
            if (videoObj) {
              videoObj.url = `/projects/${folderName}/assets/${type}/${file}`;
            }
          }
        });
      } catch (error) {
        console.error(`Error reading ${type} directory for ${folderName}:`, error);
      }
    }
  });
  
  projectJson.assetGallery = assetGallery;
  return projectJson;
}

// Main function
function main() {
  console.log('Starting project.json creation...');
  
  // Check if projects directory exists
  if (!fs.existsSync(projectsDir)) {
    console.error(`Projects directory not found: ${projectsDir}`);
    return;
  }
  
  // Get all project folders
  const projectFolders = fs.readdirSync(projectsDir);
  console.log(`Found ${projectFolders.length} project folders`);
  
  // Create project.json for each folder
  projectFolders.forEach(folderName => {
    // Skip hidden files/folders
    if (folderName.startsWith('.')) return;
    
    const projectDir = path.join(projectsDir, folderName);
    if (!fs.statSync(projectDir).isDirectory()) return;
    
    try {
      console.log(`Processing project folder: ${folderName}`);
      
      // Find project ID from mapping
      let projectId = null;
      for (const [id, name] of Object.entries(PROJECT_MAPPING)) {
        if (name === folderName) {
          projectId = parseInt(id);
          break;
        }
      }
      
      // If no ID found, assign a new one
      if (!projectId) {
        projectId = Object.keys(PROJECT_MAPPING).length + 1;
        console.log(`No ID mapping found for ${folderName}, assigning ID: ${projectId}`);
      }
      
      // Create base project JSON
      let projectJson = createProjectJson(projectId, folderName);
      
      // Populate with actual assets
      projectJson = populateAssetGallery(projectJson, folderName);
      
      // Write the project.json file
      const outputPath = path.join(projectDir, 'project.json');
      fs.writeFileSync(outputPath, JSON.stringify(projectJson, null, 2), 'utf8');
      console.log(`Saved ${outputPath}`);
      
    } catch (error) {
      console.error(`Error processing project folder ${folderName}:`, error);
    }
  });
  
  console.log('Project.json creation complete!');
}

// Run the script
main(); 