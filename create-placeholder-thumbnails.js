// Script to create placeholder PNG thumbnails for projects
// This will create a simple text-based thumbnail for projects that don't have one

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Try to import canvas, but handle environments where it's not available
let createCanvas;
try {
  const { createCanvas: importedCreateCanvas } = await import('canvas');
  createCanvas = importedCreateCanvas;
} catch (error) {
  console.warn('Canvas module not available. Thumbnail generation will be skipped.');
  createCanvas = null;
}

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const projectsDir = path.join(__dirname, 'public', 'projects');

// Function to create a placeholder thumbnail
function createPlaceholderThumbnail(projectName, outputPath) {
  // Skip if canvas is not available
  if (!createCanvas) {
    console.log(`Cannot create placeholder for ${projectName}: canvas module not available`);
    return false;
  }

  // Create a 800x600 canvas (standard thumbnail size)
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fill background with a gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#4a6fa5');
  gradient.addColorStop(1, '#23395d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Draw text with project name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Handle long project names
  let displayName = projectName;
  if (projectName.length > 15) {
    const words = projectName.split(' ');
    if (words.length > 1) {
      // Try to split into multiple lines
      const midpoint = Math.floor(words.length / 2);
      const firstLine = words.slice(0, midpoint).join(' ');
      const secondLine = words.slice(midpoint).join(' ');
      
      ctx.fillText(firstLine, width / 2, height / 2 - 30);
      ctx.fillText(secondLine, width / 2, height / 2 + 30);
    } else {
      // Just display the long name
      ctx.fillText(displayName, width / 2, height / 2);
    }
  } else {
    // Display normal name
    ctx.fillText(displayName, width / 2, height / 2);
  }

  // Draw a border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Save the canvas as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  
  console.log(`Created placeholder thumbnail for ${projectName} at ${outputPath}`);
  return true;
}

// Main function
async function main() {
  console.log('Starting placeholder thumbnail creation...');
  
  // Skip if canvas is not available
  if (!createCanvas) {
    console.log('Canvas module not available. Cannot generate thumbnails.');
    return;
  }
  
  // Check if projects directory exists
  if (!fs.existsSync(projectsDir)) {
    console.error(`Projects directory not found: ${projectsDir}`);
    return;
  }
  
  // Get all project folders
  const projectFolders = fs.readdirSync(projectsDir);
  console.log(`Found ${projectFolders.length} project folders`);
  
  let thumbnailsCreated = 0;
  
  // Process each project folder
  for (const folderName of projectFolders) {
    // Skip hidden files/folders
    if (folderName.startsWith('.')) continue;
    
    const projectDir = path.join(projectsDir, folderName);
    if (!fs.statSync(projectDir).isDirectory()) continue;
    
    try {
      // Check if thumbnail folder exists
      const thumbnailDir = path.join(projectDir, 'thumbnail');
      if (!fs.existsSync(thumbnailDir)) {
        console.log(`Thumbnail directory does not exist for ${folderName}, creating it...`);
        fs.mkdirSync(thumbnailDir, { recursive: true });
      }
      
      // Check if thumbnail.png already exists
      const thumbnailPath = path.join(thumbnailDir, 'thumbnail.png');
      if (!fs.existsSync(thumbnailPath)) {
        console.log(`No thumbnail.png found for ${folderName}, creating placeholder...`);
        if (createPlaceholderThumbnail(folderName, thumbnailPath)) {
          thumbnailsCreated++;
        }
      } else {
        console.log(`Thumbnail already exists for ${folderName}, skipping.`);
      }
    } catch (error) {
      console.error(`Error processing project folder ${folderName}:`, error);
    }
  }
  
  console.log(`\nPlaceholder thumbnail creation complete! Created ${thumbnailsCreated} thumbnails.`);
}

// Run the script
main().catch(error => {
  console.error('Error executing script:', error);
}); 