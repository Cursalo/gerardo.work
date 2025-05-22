#!/bin/bash

# Correct path to the script relative to this shell script's location
SCRIPT_DIR=$(dirname "$0")
NODE_SCRIPT_PATH="$SCRIPT_DIR/scripts/add-custom-links.cjs"

# Make sure the script is executable
chmod +x "$NODE_SCRIPT_PATH"

# Run the script to add custom links to all project.json files
node "$NODE_SCRIPT_PATH"

# Output message
echo ""
echo "==========================="
echo "Custom links have been added to all project.json files."
echo "You can now deploy your application to Vercel."
echo "Direct project links will be available at:"
echo "https://your-portfolio.com/project/[customLink]"
echo "===========================" 