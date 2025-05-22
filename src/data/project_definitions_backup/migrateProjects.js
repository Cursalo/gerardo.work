import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const sourcePath = path.resolve(__dirname, '../../../../Archivos Portafolio');
const projectsPath = path.resolve(__dirname, '../../../projects');
const projectDefinitionsPath = path.resolve(__dirname, '.');
const githubRawBaseUrl = 'https://raw.githubusercontent.com/Cursalo/gerardo.work/main/minimal-3d-portfolio/projects';

// File type categorization
const fileTypes = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.heic', '.heif'],
  videos: ['.mp4', '.mov', '.avi', '.webm', '.mkv'],
  documents: ['.pdf', '.doc', '.docx', '.txt', '.md'],
  models: ['.obj', '.fbx', '.gltf', '.glb', '.3ds', '.stl'],
  // Any other files go to the root assets folder
};

// Function to categorize a file based on extension
function categorizeFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  for (const [category, extensions] of Object.entries(fileTypes)) {
    if (extensions.includes(ext)) {
      return category;
    }
  }
  
  // Default category if no match
  return 'preview'; // Assuming anything else might be preview-related
}

// Function to create a basic index.html if it doesn't exist
function createIndexHtml(projectName, projectPath) {
  const indexPath = path.join(projectPath, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName} - Project Details</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: #333;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        section {
            margin-bottom: 30px;
        }
        h2 {
            margin-top: 0;
        }
        .description {
            margin-bottom: 20px;
        }
        .asset-gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
        }
        .asset-item {
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            padding: 10px;
            border-radius: 4px;
        }
        .asset-item img, .asset-item video {
            max-width: 100%;
            display: block;
            margin-bottom: 10px;
        }
        .asset-item a {
            display: block;
            text-decoration: none;
            color: #0066cc;
        }
    </style>
</head>
<body>
    <h1>${projectName}</h1>
    
    <section class="description">
        <h2>My Involvement</h2>
        <p>[Describe your role, contributions, and involvement in the ${projectName} project here.]</p>
    </section>
    
    <section>
        <h2>Project Assets</h2>
        <div class="asset-gallery" id="assetGallery">
            <!-- Asset items will be populated via JavaScript -->
        </div>
    </section>
    
    <script>
        // This script can be enhanced to dynamically load and display assets
        document.addEventListener('DOMContentLoaded', () => {
            // Example: You could fetch and display assets here
            console.log('Page loaded - ready to display ${projectName} assets');
        });
    </script>
</body>
</html>`;
    
    fs.writeFileSync(indexPath, htmlContent);
    console.log(`Created index.html for ${projectName}`);
  }
}

// Function to create the folder structure for a project
function createProjectStructure(projectName) {
  const projectPath = path.join(projectsPath, projectName);
  
  // Create main project directory if it doesn't exist
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }
  
  // Create assets directory and subdirectories
  const assetsPath = path.join(projectPath, 'assets');
  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
  }
  
  // Create subdirectories for different asset types
  ['images', 'videos', 'documents', 'models', 'preview'].forEach(dir => {
    const dirPath = path.join(assetsPath, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  
  // Create index.html
  createIndexHtml(projectName, projectPath);
  
  return projectPath;
}

// Function to copy a file and categorize it into the appropriate subfolder
function copyAndCategorizeFile(srcFile, projectName) {
  const sourceFilePath = path.join(sourcePath, projectName, srcFile);
  
  // Skip .DS_Store files
  if (path.basename(srcFile) === '.DS_Store') {
    return null;
  }
  
  // Determine the category based on file extension
  const category = categorizeFile(srcFile);
  
  // Target path within the assets directory
  const projectPath = path.join(projectsPath, projectName);
  const targetDir = path.join(projectPath, 'assets', category);
  const targetPath = path.join(targetDir, path.basename(srcFile));
  
  // Copy the file
  try {
    fs.copyFileSync(sourceFilePath, targetPath);
    console.log(`Copied ${srcFile} to ${targetPath}`);
    
    // Return info about the copied file for asset gallery
    const fileType = category === 'images' ? 'image' : 
                     category === 'videos' ? 'video' : 
                     category === 'documents' ? 'document' :
                     category === 'models' ? 'model' : 'other';
    
    // GitHub raw URL for the file
    const githubPath = `${githubRawBaseUrl}/${encodeURIComponent(projectName)}/assets/${category}/${encodeURIComponent(path.basename(srcFile))}`;
    
    return {
      name: path.basename(srcFile),
      type: fileType,
      category: category,
      url: githubPath
    };
  } catch (err) {
    console.error(`Error copying ${srcFile}: ${err.message}`);
    return null;
  }
}

// Function to find the JSON file that contains a specific project name
function findProjectJson(projectName) {
  const jsonFiles = fs.readdirSync(projectDefinitionsPath)
    .filter(file => file.endsWith('.json') && !file.includes('projects.json') && !file.includes('migrateProjects.json'));
  
  for (const jsonFile of jsonFiles) {
    const jsonPath = path.join(projectDefinitionsPath, jsonFile);
    try {
      const content = fs.readFileSync(jsonPath, 'utf8');
      const json = JSON.parse(content);
      
      if (json.name === projectName) {
        return { 
          path: jsonPath, 
          content: json 
        };
      }
    } catch (err) {
      console.error(`Error reading ${jsonFile}: ${err.message}`);
    }
  }
  
  return null;
}

// Function to update a project's JSON with the new assets and settings
function updateProjectJson(projectInfo, assets) {
  if (!projectInfo) return;
  
  const json = projectInfo.content;
  
  // Update base fields
  json.link = `${githubRawBaseUrl}/${encodeURIComponent(json.name)}/index.html`;
  
  // Try to find a suitable thumbnail (prefer logos, then any image)
  const logoImage = assets.find(asset => 
    asset.type === 'image' && 
    (asset.name.toLowerCase().includes('logo') || asset.name.toLowerCase().includes('thumbnail'))
  );
  
  const anyImage = assets.find(asset => asset.type === 'image');
  
  if (logoImage) {
    json.thumbnail = logoImage.url;
  } else if (anyImage) {
    json.thumbnail = anyImage.url;
  }
  
  // Try to find a suitable video
  const anyVideo = assets.find(asset => asset.type === 'video');
  if (anyVideo) {
    json.videoUrl = anyVideo.url;
  }
  
  // Update world settings
  if (json.worldSettings) {
    json.worldSettings.floorColor = "#ffffff";
    json.worldSettings.floorTexture = "";
    json.worldSettings.skyTexture = "";
  }
  
  // Update media objects if they exist
  if (json.mediaObjects && json.mediaObjects.length > 0) {
    // Update video player if it exists
    const videoPlayer = json.mediaObjects.find(obj => obj.type === 'video');
    if (videoPlayer && anyVideo) {
      videoPlayer.url = anyVideo.url;
      
      // Try to find a thumbnail for the video
      const videoThumbnail = assets.find(asset => 
        asset.type === 'image' && 
        asset.name.toLowerCase().includes('thumb')
      ) || anyImage;
      
      if (videoThumbnail) {
        videoPlayer.thumbnail = videoThumbnail.url;
      }
    }
    
    // Update info panel if it exists
    const infoPanel = json.mediaObjects.find(obj => obj.id && obj.id.includes('info-panel'));
    if (infoPanel && anyImage) {
      infoPanel.thumbnail = anyImage.url;
    }
  }
  
  // Add or update asset gallery
  json.assetGallery = assets;
  
  // Write the updated JSON back to file
  try {
    fs.writeFileSync(projectInfo.path, JSON.stringify(json, null, 2));
    console.log(`Updated JSON for ${json.name}`);
  } catch (err) {
    console.error(`Error writing JSON for ${json.name}: ${err.message}`);
  }
}

// Function to clean up project directory to avoid duplication
function cleanupProjectDirectory(projectName) {
  const projectPath = path.join(projectsPath, projectName);
  
  // Get all files in the project root directory (excluding index.html and directories)
  try {
    const files = fs.readdirSync(projectPath);
    for (const file of files) {
      const filePath = path.join(projectPath, file);
      // Skip directories and index.html
      if (fs.statSync(filePath).isDirectory() || file === 'index.html') {
        continue;
      }
      
      // Remove all other files
      fs.unlinkSync(filePath);
      console.log(`Removed duplicate file ${filePath}`);
    }
  } catch (err) {
    console.error(`Error cleaning up project directory ${projectName}: ${err.message}`);
  }
}

// Main function to process all projects
async function processAllProjects() {
  console.log(`Source Path: ${sourcePath}`);
  console.log(`Projects Path: ${projectsPath}`);
  console.log(`Project Definitions Path: ${projectDefinitionsPath}`);
  
  // Get list of project directories from source
  const projectDirs = fs.readdirSync(sourcePath)
    .filter(dir => {
      const dirPath = path.join(sourcePath, dir);
      return fs.statSync(dirPath).isDirectory() && dir !== '.DS_Store';
    });
  
  console.log(`Found ${projectDirs.length} projects to process`);
  
  // Process each project
  for (const projectName of projectDirs) {
    console.log(`\nProcessing project: ${projectName}`);
    
    // Create project structure
    const projectPath = createProjectStructure(projectName);
    
    // Get list of files in the source project directory
    let sourceFiles = [];
    try {
      sourceFiles = fs.readdirSync(path.join(sourcePath, projectName))
        .filter(file => file !== '.DS_Store');
    } catch (err) {
      console.error(`Error reading source directory for ${projectName}: ${err.message}`);
      continue;
    }
    
    // Skip if no files to process
    if (sourceFiles.length === 0) {
      console.log(`No files to process for ${projectName}`);
      continue;
    }
    
    // Copy and categorize each file
    const processedAssets = [];
    for (const file of sourceFiles) {
      const assetInfo = copyAndCategorizeFile(file, projectName);
      if (assetInfo) {
        processedAssets.push(assetInfo);
      }
    }
    
    // Clean up the project directory to avoid duplication
    cleanupProjectDirectory(projectName);
    
    // Find and update the project's JSON file
    const projectJson = findProjectJson(projectName);
    if (projectJson) {
      updateProjectJson(projectJson, processedAssets);
    } else {
      console.log(`No matching JSON found for ${projectName}`);
    }
  }
  
  console.log('\nMigration completed!');
}

// Execute the migration
processAllProjects(); 