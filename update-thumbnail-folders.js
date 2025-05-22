// Script to create thumbnail folders and update project.json files
// to use the new thumbnail path structure

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const projectsDir = path.join(__dirname, 'public', 'projects');

// Main function
async function main() {
  console.log('Starting thumbnail folder creation and project.json updates...');
  
  // Check if projects directory exists
  if (!fs.existsSync(projectsDir)) {
    console.error(`Projects directory not found: ${projectsDir}`);
    return;
  }
  
  // Get all project folders
  const projectFolders = fs.readdirSync(projectsDir);
  console.log(`Found ${projectFolders.length} project folders`);
  
  // Process each project folder
  for (const folderName of projectFolders) {
    // Skip hidden files/folders
    if (folderName.startsWith('.')) continue;
    
    const projectDir = path.join(projectsDir, folderName);
    if (!fs.statSync(projectDir).isDirectory()) continue;
    
    try {
      console.log(`\nProcessing project folder: ${folderName}`);
      
      // 1. Create thumbnail folder if it doesn't exist
      const thumbnailDir = path.join(projectDir, 'thumbnail');
      if (!fs.existsSync(thumbnailDir)) {
        console.log(`Creating thumbnail directory for ${folderName}`);
        fs.mkdirSync(thumbnailDir, { recursive: true });
      } else {
        console.log(`Thumbnail directory already exists for ${folderName}`);
      }
      
      // 2. Update project.json file
      const jsonPath = path.join(projectDir, 'project.json');
      if (fs.existsSync(jsonPath)) {
        try {
          const projectJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          
          // Check current thumbnail path
          const oldThumbnailPath = projectJson.thumbnail || '';
          console.log(`Current thumbnail path: ${oldThumbnailPath}`);
          
          // Update to new path structure
          const newThumbnailPath = `/projects/${folderName}/thumbnail/thumbnail.png`;
          projectJson.thumbnail = newThumbnailPath;
          console.log(`Updated thumbnail path to: ${newThumbnailPath}`);
          
          // Check if there are mediaObjects to update
          if (projectJson.mediaObjects && Array.isArray(projectJson.mediaObjects)) {
            for (const obj of projectJson.mediaObjects) {
              if (obj.thumbnail && 
                  (obj.thumbnail.includes('/assets/images/') || 
                   !obj.thumbnail.includes('/thumbnail/'))) {
                // Update the mediaObject thumbnail path
                obj.thumbnail = `/projects/${folderName}/thumbnail/thumbnail.png`;
                console.log(`Updated mediaObject thumbnail: ${obj.id || 'unknown'}`);
              }
            }
          }
          
          // Save updated JSON
          fs.writeFileSync(jsonPath, JSON.stringify(projectJson, null, 2), 'utf8');
          console.log(`Updated ${jsonPath}`);
          
          // 3. Check if we need to copy an existing thumbnail
          try {
            // First, check if thumbnail.png already exists in the new location
            const newThumbnailFile = path.join(thumbnailDir, 'thumbnail.png');
            if (!fs.existsSync(newThumbnailFile)) {
              // Construct possible paths for the old thumbnail
              const possibleOldPaths = [
                path.join(projectDir, 'assets', 'images', 'thumbnail.png'),
                path.join(projectDir, 'assets', 'images', 'thumbnail.jpg'),
                path.join(projectDir, 'assets', 'images', 'thumbnail.webp'),
                path.join(projectDir, 'assets', 'images', 'logo.png'),
                path.join(projectDir, 'assets', 'images', `${folderName}.png`),
                path.join(projectDir, 'assets', 'images', `${folderName} Logo.png`)
              ];
              
              let sourceThumbnail = null;
              for (const testPath of possibleOldPaths) {
                if (fs.existsSync(testPath)) {
                  sourceThumbnail = testPath;
                  break;
                }
              }
              
              // If we found a source thumbnail, attempt to copy it
              if (sourceThumbnail) {
                console.log(`Found existing thumbnail at ${sourceThumbnail}, copying to new location`);
                fs.copyFileSync(sourceThumbnail, newThumbnailFile);
                console.log(`Copied thumbnail to ${newThumbnailFile}`);
              } else {
                console.log(`No existing thumbnail found to copy. Please manually add thumbnail.png to ${thumbnailDir}`);
              }
            } else {
              console.log(`Thumbnail already exists at ${newThumbnailFile}`);
            }
          } catch (copyError) {
            console.error(`Error copying thumbnail for ${folderName}:`, copyError);
          }
        } catch (jsonError) {
          console.error(`Error updating project.json for ${folderName}:`, jsonError);
        }
      } else {
        console.log(`No project.json found for ${folderName}`);
      }
    } catch (error) {
      console.error(`Error processing project folder ${folderName}:`, error);
    }
  }
  
  console.log('\nUpdate complete! Review results and make any necessary manual adjustments.');
}

// Run the script
main().catch(error => {
  console.error('Error executing script:', error);
}); 