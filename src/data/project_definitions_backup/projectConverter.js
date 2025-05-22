// Script to convert projects array to individual JSON files
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { projects } from '../projects.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create directory if it doesn't exist
const outputDir = path.join(__dirname);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Convert each project to a JSON file
projects.forEach((project, index) => {
  const fileName = `project_${project.id}.json`;
  const filePath = path.join(outputDir, fileName);
  
  // Write JSON file
  fs.writeFileSync(filePath, JSON.stringify(project, null, 2));
  console.log(`Created ${fileName}`);
});

console.log(`Successfully created ${projects.length} project JSON files in ${outputDir}`); 