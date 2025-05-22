const fs = require('fs');
const path = require('path');

// Path to projects directory
const projectsDir = path.join(__dirname, '../public/projects');

// Function to slugify a name (convert to URL-friendly format)
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')       // Replace spaces with -
    .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
    .replace(/\-\-+/g, '-')     // Replace multiple - with single -
    .replace(/^-+/, '')         // Trim - from start of text
    .replace(/-+$/, '');        // Trim - from end of text
}

// Process each project directory
async function processProjects() {
  try {
    // Get all project directories
    const dirs = fs.readdirSync(projectsDir);
    
    console.log(`Found ${dirs.length} project directories`);
    
    for (const dir of dirs) {
      const projectDir = path.join(projectsDir, dir);
      
      // Check if it's a directory
      if (fs.statSync(projectDir).isDirectory()) {
        const projectJsonPath = path.join(projectDir, 'project.json');
        
        // Check if project.json exists
        if (fs.existsSync(projectJsonPath)) {
          console.log(`Processing: ${dir}`);
          
          // Read the project.json file
          const projectJson = fs.readFileSync(projectJsonPath, 'utf8');
          
          try {
            // Parse the JSON
            const project = JSON.parse(projectJson);
            
            // Check if customLink property already exists
            if (!project.customLink) {
              // Create a custom link based on the project name
              project.customLink = slugify(project.name);
              
              // Write the updated JSON back to the file
              fs.writeFileSync(
                projectJsonPath, 
                JSON.stringify(project, null, 2),
                'utf8'
              );
              
              console.log(`Added customLink: ${project.customLink} to ${dir}`);
            } else {
              console.log(`${dir} already has customLink: ${project.customLink}`);
            }
          } catch (parseError) {
            console.error(`Error parsing JSON for ${dir}:`, parseError);
          }
        } else {
          console.log(`No project.json found in ${dir}`);
        }
      }
    }
    
    console.log('Finished processing all projects');
  } catch (error) {
    console.error('Error processing projects:', error);
  }
}

// Run the script
processProjects(); 