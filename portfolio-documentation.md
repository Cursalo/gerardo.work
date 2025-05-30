# 3D Portfolio Application Documentation

## Overview
This application is a 3D portfolio that allows users to showcase their projects in interactive 3D worlds. Each project has its own customized world with media content (images, videos, PDFs) that can be viewed and interacted with in 3D space.

## Key Components

### 1. World System
- **World**: A 3D environment with customizable properties (colors, lighting) and objects
- **WorldObject**: Items placed in worlds (media, buttons, project cards)
- **WorldService**: Manages world data, saving/loading from localStorage

### 2. Project System
- **Project**: Represents a portfolio project with details and associated world settings
- **ProjectService**: Manages project data, saving/loading from localStorage

### 3. Admin Interface
- **ModernAdminDashboard**: Main admin component for managing projects and worlds
- **ProjectEditor**: Component for editing project details
- **Media Management**: Tools for adding/editing media in project worlds

### 4. Viewing System
- **WorldViewer**: Component for viewing worlds
- **ProjectWorldViewer**: Component for viewing project-specific worlds
- **Scene**: Renders the 3D environment with objects
- **WorldObject**: Renders different types of objects in the 3D scene

## Data Structures

### Project
```typescript
interface Project {
  id: number;
  name: string;
  description: string;
  link: string;
  thumbnail: string;
  status: 'completed' | 'in-progress';
  type: 'standard' | 'video';
  videoUrl?: string;
  customLink?: string; // Custom URL path for direct access
  worldSettings?: {
    backgroundColor: string;
    floorColor: string;
    skyColor: string;
    ambientLightColor: string;
    ambientLightIntensity: number;
    directionalLightColor: string;
    directionalLightIntensity: number;
  };
}
```

### World
```typescript
interface World {
  id: string;
  name: string;
  description?: string;
  backgroundColor?: string;
  cameraPosition?: { x: number; y: number; z: number };
  cameraTarget?: { x: number; y: number; z: number };
  floorColor?: string;
  floorTexture?: string;  
  skyColor?: string;
  skyTexture?: string;
  ambientLightColor?: string;
  ambientLightIntensity?: number;
  directionalLightColor?: string;
  directionalLightIntensity?: number;
  objects: WorldObject[];
}
```

### WorldObject
```typescript
interface WorldObject {
  id: string;
  type: 'video' | 'image' | 'pdf' | 'project' | 'link' | 'button';
  title: string;
  description?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  url?: string;
  thumbnail?: string;
  projectId?: number;
  action?: 'navigate' | 'link';
  destination?: string;
  subWorldId?: string;
}
```

### Media
```typescript
interface MediaFormData {
  title: string;
  description: string;
  type: 'image' | 'video' | 'pdf';
  url: string;
  position: [number, number, number];
  file?: File;
}
```

## Key Functionality

### Project Management
1. Create new projects with customizable details and world settings
2. Edit existing projects (name, description, thumbnail, etc.)
3. Delete projects and their associated worlds

### Media Management
1. Add media (images, videos, PDFs) to project worlds
2. Position media in 3D space
3. Edit or remove existing media

### World Navigation
1. Navigate between the main world and project worlds
2. Use the B key to return to the main world from any project world
3. Use custom links to directly access specific project worlds

### World Customization
1. Customize world appearance (colors, lighting)
2. Arrange objects in 3D space
3. Create interactive elements (buttons, links)

## URL Structure
- `/`: Main application view
- `/admin`: Admin dashboard for managing projects and worlds
- `/world/:worldId`: View a specific world by ID
- `/project/:customLink`: View a project world using a custom link

## Implementation Notes
1. Projects and worlds are stored in localStorage
2. Media files can be uploaded or referenced by URL
3. The application uses Three.js for 3D rendering
4. React is used for the UI components
5. The application supports keyboard navigation (B key to return to main world)

## Common Issues and Solutions
1. **Cursor Visibility**: The cursor should be visible in the admin panel
2. **Media Editing**: Media items should be properly saved to worlds
3. **Project Details**: All project details should be properly saved
4. **World Navigation**: The B key should navigate back to the main world 