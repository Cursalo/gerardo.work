// Script to update project references in the application code
// This will search for imports or references to project_definitions and update them

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory equivalent to __dirname in CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const srcDir = path.join(__dirname, 'src');
const servicesDir = path.join(srcDir, 'services');

// Files to check and update
const FILES_TO_CHECK = [
  path.join(servicesDir, 'projectService.ts'),
  path.join(srcDir, 'data', 'worlds.ts'),
  path.join(srcDir, 'context', 'ProjectContext.tsx')
];

// Function to update file content
function updateFileContent(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  try {
    console.log(`Updating references in: ${filePath}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Update imports from project_definitions
    content = content.replace(
      /import.*from\s+['"]\.\.\/data\/project_definitions\/project_\d+\.json['"]/g,
      match => {
        console.log(`Found import: ${match}`);
        return '// ' + match + ' - REPLACED: Now using public/projects/{ProjectName}/project.json';
      }
    );
    
    // Update dynamic imports
    content = content.replace(
      /import\(['"]\.\.\/data\/project_definitions\/project_(\d+)\.json['"]\)/g,
      (match, projectId) => {
        console.log(`Found dynamic import for project ${projectId}`);
        return `fetch(\`/projects/\${getProjectName(${projectId})}/project.json\`).then(r => r.json())`;
      }
    );
    
    // Add helper function to get project name if needed
    if (content !== originalContent && !content.includes('function getProjectName')) {
      content = content.replace(
        /export class ProjectService/,
        `// Helper function to map project ID to name
function getProjectName(id) {
  const projectMap = {
    1: "Avengers: Endgame",
    2: "Spider-Man: No Way Home",
    3: "The Batman",
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
    32: "Amazonia Apoteket"
  };
  return projectMap[id] || \`Project-\${id}\`;
}

export class ProjectService`
      );
    }
    
    // Update loadFromJsonFiles method
    content = content.replace(
      /private async loadFromJsonFiles\(\): Promise<void> {[\s\S]*?}/,
      `private async loadFromJsonFiles(): Promise<void> {
    console.log('ProjectService: Loading projects from public/projects directories');
    try {
      // Create an array to store loaded projects
      const loadedProjects: Project[] = [];

      // Loop through all project folders in public/projects
      for (let i = 1; i <= 32; i++) {
        try {
          const projectName = getProjectName(i);
          const projectUrl = \`/projects/\${projectName}/project.json\`;
          
          console.log(\`ProjectService: Attempting to load \${projectUrl}\`);
          
          // Fetch the project JSON
          const response = await fetch(projectUrl);
          if (!response.ok) {
            throw new Error(\`HTTP error \${response.status} for project \${i}\`);
          }
          
          const project = await response.json();

          // Ensure all required fields are present
          const validProject: Project = {
            ...project,
            id: i, // Ensure correct ID
            mediaObjects: Array.isArray(project.mediaObjects) ? project.mediaObjects : [],
            worldSettings: project.worldSettings || undefined
          };

          loadedProjects.push(validProject);
          console.log(\`ProjectService: Loaded project \${i} from \${projectUrl}\`);
        } catch (error) {
          console.warn(\`ProjectService: Could not load project \${i}:\`, error);
        }
      }

      if (loadedProjects.length > 0) {
        // Sort projects by ID for consistency
        this.projects = loadedProjects.sort((a, b) => a.id - b.id);
        console.log(\`ProjectService: Successfully loaded \${this.projects.length} projects from JSON files.\`);
        
        // Save to localStorage
        this.saveToStorage();
      } else {
        console.error('ProjectService: No projects could be loaded from JSON files.');
        this.projects = [];
      }
    } catch (error) {
      console.error('ProjectService: Error loading projects from JSON files:', error);
      this.projects = [];
    }
  }`
    );
    
    // Save the file if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
    } else {
      console.log(`No changes needed for: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
  }
}

// Main function
function main() {
  console.log('Starting to update project references...');
  
  // Process each file
  FILES_TO_CHECK.forEach(filePath => {
    updateFileContent(filePath);
  });
  
  console.log('Updates complete!');
}

// Run the script
main(); 