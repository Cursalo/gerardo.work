// Script to convert project definition files to use local paths
// This script will read JSON files from src/data/project_definitions
// and create new versions in public/projects/{ProjectName}/project.json
// with updated paths that use local references instead of GitHub URLs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory equivalent to __dirname in CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const sourceDir = path.join(__dirname, 'src', 'data', 'project_definitions');
const projectsDir = path.join(__dirname, 'public', 'projects');

// Function to convert GitHub URLs to local paths
function convertUrlToLocalPath(url, projectName) {
  if (!url || typeof url !== 'string') return url;
  
  // Skip SVG data URLs or non-GitHub URLs
  if (url.startsWith('data:') || url.startsWith('https://img.youtube.com')) {
    return url;
  }
  
  // Handle GitHub URLs
  if (url.includes('github') && url.includes('/projects/')) {
    try {
      // Extract the path after the project name
      const projectNamePattern = new RegExp(`/projects/${projectName}/(.+)`, 'i');
      const match = url.match(projectNamePattern);
      
      if (match && match[1]) {
        // Create a local path
        return `/${match[0]}`;
      }
    } catch (error) {
      console.error(`Error converting URL: ${url}`, error);
    }
  }
  
  return url;
}

// Process a single project file
function processProjectFile(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const project = JSON.parse(fileContent);
    const projectName = project.name;
    
    console.log(`Processing project: ${projectName} (ID: ${project.id})`);
    
    // Deep clone the project to avoid reference issues
    const updatedProject = JSON.parse(JSON.stringify(project));
    
    // Update URLs in the project
    updatedProject.link = convertUrlToLocalPath(updatedProject.link, projectName);
    updatedProject.thumbnail = convertUrlToLocalPath(updatedProject.thumbnail, projectName);
    updatedProject.videoUrl = convertUrlToLocalPath(updatedProject.videoUrl, projectName);
    
    // Update world settings URLs
    if (updatedProject.worldSettings) {
      updatedProject.worldSettings.floorTexture = convertUrlToLocalPath(updatedProject.worldSettings.floorTexture, projectName);
      updatedProject.worldSettings.skyTexture = convertUrlToLocalPath(updatedProject.worldSettings.skyTexture, projectName);
    }
    
    // Update media objects
    if (Array.isArray(updatedProject.mediaObjects)) {
      updatedProject.mediaObjects.forEach(obj => {
        obj.url = convertUrlToLocalPath(obj.url, projectName);
        obj.thumbnail = convertUrlToLocalPath(obj.thumbnail, projectName);
      });
    }
    
    // Update asset gallery
    if (Array.isArray(updatedProject.assetGallery)) {
      updatedProject.assetGallery.forEach(asset => {
        asset.url = convertUrlToLocalPath(asset.url, projectName);
      });
    }
    
    // Create project directory if it doesn't exist
    const projectDir = path.join(projectsDir, projectName);
    if (!fs.existsSync(projectDir)) {
      console.log(`Project directory not found: ${projectDir}`);
      return;
    }
    
    // Write the updated project file
    const outputPath = path.join(projectDir, 'project.json');
    fs.writeFileSync(outputPath, JSON.stringify(updatedProject, null, 2), 'utf8');
    console.log(`Saved ${outputPath}`);
    
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

// Main function
function main() {
  console.log('Starting project path conversion...');
  
  // Get all project_*.json files
  const files = fs.readdirSync(sourceDir)
    .filter(file => file.startsWith('project_') && file.endsWith('.json'));
  
  console.log(`Found ${files.length} project files to process`);
  
  // Process each file
  files.forEach(file => {
    const filePath = path.join(sourceDir, file);
    processProjectFile(filePath);
  });
  
  console.log('Conversion complete!');
}

// Run the script
main(); 