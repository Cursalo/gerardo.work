# Minimal 3D Portfolio in White Infinite Space

A React and Three.js based 3D portfolio showcasing projects in a bright, infinite white environment. Navigate through the space as a third-person character and explore floating project windows.

## Features

- Bright, minimalist white infinite space environment
- Third-person character control with keyboard (WASD/Arrow keys)
- 40 floating project windows distributed in the space
- Interactive project windows that react to hover and clicks
- Visual differentiation for completed vs in-progress projects
- Fullscreen mode (press 'F')

## Technology Stack

- React (frontend framework)
- TypeScript (for type safety)
- Three.js (3D rendering)
- React Three Fiber (React renderer for Three.js)
- React Three Drei (useful helpers for React Three Fiber)
- Vite (for fast development and building)

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm (v6+)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/minimal-3d-portfolio.git
cd minimal-3d-portfolio
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## How to Use

- Use **W/S/A/D** or **Arrow Keys** to move the character
- Move your mouse to look around
- Hover over project windows to see details
- Click on a project window to open its link
- Press **F** to toggle fullscreen mode

## Building for Production

To create a production-ready build:

```bash
npm run build
```

The build files will be in the `dist` directory, ready to be deployed.

## Customizing

### Adding Your Own Projects

Edit the `src/data/projects.ts` file to add your own projects. Each project should include:

- `id`: Unique identifier
- `name`: Project name
- `description`: Short project description
- `link`: URL to the project
- `thumbnail`: Image URL for the project thumbnail
- `status`: 'completed' or 'in-progress'

### Modifying the Environment

The environment settings can be found in `src/components/Environment.tsx`. You can adjust:

- Background color
- Fog density
- Lighting intensity and position
- Grid appearance

### Character Appearance

The character model can be customized in `src/components/CharacterController.tsx`. You can replace the simple geometric shapes with your own 3D model.

## License

MIT
