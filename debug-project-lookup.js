// Debug script to test project lookup
import { projectDataService } from './src/services/projectDataService.js';

console.log('Testing project lookup...');

async function testProjectLookup() {
  try {
    // Get all projects first
    const allProjects = await projectDataService.getAllProjects();
    console.log(`\nFound ${allProjects.length} total projects:`);
    
    allProjects.slice(0, 10).forEach(project => {
      console.log(`- ID: ${project.id}, Name: "${project.name}"`);
    });
    
    // Test specific lookups
    console.log('\n=== Testing Lookups ===');
    
    // Test by ID
    const projectById = await projectDataService.getProjectById(1);
    console.log('\nProject ID 1:', projectById ? projectById.name : 'NOT FOUND');
    
    // Test by exact name
    const projectByName = await projectDataService.getProjectByName('Burgertify');
    console.log('Project by name "Burgertify":', projectByName ? 'FOUND' : 'NOT FOUND');
    
    // Test by lowercase
    const projectByLower = await projectDataService.getProjectByName('burgertify');
    console.log('Project by name "burgertify":', projectByLower ? 'FOUND' : 'NOT FOUND');
    
    // Test slug matching
    const burgertifySlug = 'Burgertify'.toLowerCase().trim()
      .replace(/[\s.]+/g, '-')
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    console.log('\nGenerated slug for "Burgertify":', burgertifySlug);
    
    // Find project by slug comparison
    const projectBySlug = allProjects.find(p => {
      const projectSlug = p.name.toLowerCase().trim()
        .replace(/[\s.]+/g, '-')
        .replace(/['"]/g, '')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      return projectSlug === 'burgertify';
    });
    
    console.log('Project by slug comparison:', projectBySlug ? `FOUND: "${projectBySlug.name}"` : 'NOT FOUND');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testProjectLookup(); 