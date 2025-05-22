#!/bin/bash

# Make sure the script is executable
chmod +x scripts/add-custom-links.js

# Run the script to add custom links to all project.json files
node scripts/add-custom-links.js

# Output message
echo ""
echo "==========================="
echo "Custom links have been added to all project.json files."
echo "You can now deploy your application to Vercel."
echo "Direct project links will be available at:"
echo "https://your-portfolio.com/project/[customLink]"
echo "===========================" 