// Simple test script to debug project loading
const testProjectLoading = async () => {
  console.log('Testing project loading...');
  
  // Test individual project.json files
  const testProjects = ['Burgertify', 'Avatarmatic', 'Develop Argentina'];
  
  for (const projectName of testProjects) {
    try {
      const response = await fetch(`/projects/${projectName}/project.json`);
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${projectName}:`, { id: data.id, name: data.name });
      } else {
        console.log(`❌ ${projectName}: Failed to load (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${projectName}: Error`, error.message);
    }
  }
  
  // Test all expected projects
  const expectedProjects = [
    'AIClases.com', 'Amazonia Apoteket', 'Avatarmatic', 'Beta', 'Blue Voyage Travel',
    'BonsaiPrep', 'Burgavision', 'Burgertify', 'Cursalo', 'Develop Argentina',
    'Eat Easier', 'Eaxily', 'Eaxy.AI', 'Foodelopers', 'Foodiez Apparel',
    'Foodketing', 'Hybridge', 'Jaguar', 'Jerry\'s', 'LinkDialer', 'LinkMas',
    'Menu Crafters', 'Monchee', 'PitchDeckGenie',
    'PlatePlatform', 'PostRaptor', 'Power Up Pizza', 'RAM',
    'TaskArranger.com', 'Tokitaka', 'Wobistro'
  ];
  
  let foundCount = 0;
  for (const projectName of expectedProjects) {
    try {
      const response = await fetch(`/projects/${projectName}/project.json`);
      if (response.ok) {
        foundCount++;
      }
    } catch (error) {
      // Skip
    }
  }
  
  console.log(`Found ${foundCount} out of ${expectedProjects.length} expected projects`);
};

// Run the test
testProjectLoading(); 