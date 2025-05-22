# Direct Project Links in 3D Portfolio

This document explains how to use and set up direct links to project worlds in the 3D portfolio.

## Overview

The 3D portfolio supports direct links to specific project worlds. This allows sharing direct URLs to individual projects, like:

- `https://your-portfolio.com/project/burgertify`
- `https://your-portfolio.com/project/eaxiai`

## How It Works

1. Each project has a `customLink` property in its `project.json` file (e.g., "burgertify", "eaxiai")
2. The application routes `/project/:customLink` to the correct project world
3. The `vercel.json` configuration ensures deep links work correctly with hosting

## Setting Up Project Links

### 1. Adding the `customLink` Property

Each project needs a `customLink` property in its `project.json` file:

```json
{
  "id": 1,
  "name": "Project Name",
  ...
  "customLink": "project-name",
  ...
}
```

To automatically add this property to all projects, run:

```bash
node scripts/add-custom-links.js
```

This script will:
- Go through all project directories in `public/projects/`
- Add a `customLink` property based on the project name if it doesn't exist
- Preserve existing `customLink` values

### 2. Using Links in Your Code

To create links to project worlds in your React components:

```jsx
import ProjectLink from '../components/ProjectLink';

// Later in your component:
<ProjectLink project={projectObject}>
  View Project
</ProjectLink>
```

The `ProjectLink` component automatically generates the correct URL based on the `customLink` property, or falls back to using the project ID if necessary.

### 3. Testing Direct Links

You can test direct links by navigating to:
- `http://localhost:3000/project/burgertify` (local development)
- `https://your-portfolio.com/project/burgertify` (production)

## Troubleshooting

If direct links don't work:

1. Verify the `customLink` property exists in the project's `project.json` file
2. Check that the `vercel.json` file is in the root directory and contains the correct rewrite rules
3. Make sure your Vercel project is deployed with the latest changes
4. Clear browser cache to ensure you're seeing the latest deployed version

## Vercel Configuration

The `vercel.json` file in the project root includes these rewrite rules:

```json
{
  "rewrites": [
    { "source": "/project/:customLink", "destination": "/index.html" },
    { "source": "/:customLink", "destination": "/index.html" }
  ]
}
```

This ensures that direct URLs to project worlds are properly handled by the React application. 