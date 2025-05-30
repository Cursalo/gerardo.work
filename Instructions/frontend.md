# Frontend Architecture: Minimal 3D Portfolio (v2)

This document describes the proposed frontend architecture for the new version of the Minimal 3D Portfolio, built with React, TypeScript, and Vite, and using React Three Fiber for 3D rendering.

## 1. Core Technologies

*   **React (v18+):** For building the user interface with components.
*   **TypeScript:** For static typing, improving code quality and maintainability.
*   **Vite:** For fast development server and optimized builds.
*   **React Three Fiber (R3F) & Drei:** For declarative 3D scene creation and helpers within React.
*   **Zustand (or React Context):** For global state management (e.g., current world, loaded projects, UI state).
*   **React Router DOM:** For client-side routing (e.g., `/`, `/project/:projectId`, `/admin`).
*   **Styling:** Tailwind CSS (or Styled Components / CSS Modules) for UI styling.
*   **HTTP Client:** `fetch` API or `axios` for communication with the Supabase backend.

## 2. Directory Structure (Proposed)

```
minimal-3d-portfolio-v2/
├── public/
│   ├── fonts/
│   ├── hdri/
│   └── ... (static assets not processed by Vite)
├── src/
│   ├── assets/ # Images, icons directly imported into components
│   ├── components/
│   │   ├── common/ # Reusable UI components (Button, Modal, Loader)
│   │   ├── layout/ # Main layout components (Header, Footer, Sidebar)
│   │   ├── portfolio/ # Components specific to the public portfolio view
│   │   │   ├── scenes/ # Main and project-specific 3D scenes
│   │   │   ├── ui/     # UI elements for portfolio (ProjectCard, Navigation)
│   │   │   └── models/ # React components wrapping 3D models
│   │   ├── admin/    # Components for the admin panel
│   │   │   ├── forms/  # Forms for creating/editing projects, media
│   │   │   ├── views/  # Different sections of the admin panel
│   │   │   └── auth/   # Login, logout components
│   │   └── three/    # General purpose R3F components (CustomCamera, Lights)
│   ├── config/       # App configuration (e.g., Supabase client setup)
│   ├── contexts/     # React contexts (if not using Zustand for everything)
│   ├── hooks/        # Custom React hooks (e.g., useAuth, useProjects)
│   ├── services/     # Backend API interactions (projectService, worldService, authService)
│   ├── store/        # Zustand store setup and slices
│   ├── styles/       # Global styles, theme configuration
│   ├── types/        # TypeScript type definitions (Project, World, MediaObject)
│   ├── utils/        # Utility functions
│   ├── App.tsx       # Main application component with routing
│   └── main.tsx      # Entry point of the application
├── .eslintrc.cjs
├── .prettierrc.json
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## 3. State Management

*   **Zustand (Recommended):** For its simplicity and effectiveness.
    *   Create stores for `authStore` (user session, loading state), `projectStore` (list of projects, selected project), `worldStore` (current 3D world/scene data, interaction states).
*   **React Context API:** Can be used for simpler global state or theming if Zustand feels like overkill for certain parts.
*   **Local Component State:** Use `useState` and `useReducer` for UI-specific state within components.

## 4. Data Flow

1.  **Portfolio View:**
    *   `App.tsx` initializes routes.
    *   Portfolio pages/components fetch data (projects, worlds) via `services` (e.g., `projectService.getPublicProjects()`).
    *   Services call the Supabase backend.
    *   Fetched data is stored in Zustand stores.
    *   R3F components consume data from stores to render 3D scenes and UI elements.
    *   User interactions in 3D scenes might update local or global UI state.
2.  **Admin Panel:**
    *   Admin routes are protected. `useAuth` hook checks authentication status from `authStore`.
    *   Admin components use `services` to fetch and submit data to Supabase (e.g., `projectService.createProject(data)`).
    *   Forms manage local state for data input.
    *   On successful submission, relevant Zustand stores are updated to reflect changes, or data is re-fetched.

## 5. Component Design Philosophy

*   **Atomic Design Principles (Consideration):** Break down UI into atoms, molecules, organisms, templates, and pages where appropriate.
*   **Presentational vs. Container Components:** Separate concerns where presentational components focus on UI and container components handle logic and data fetching (often achieved via custom hooks).
*   **Reusable Components:** Identify and build common UI elements (`Button`, `Input`, `Card`, `Modal`) in `src/components/common/`.
*   **Props and Typing:** Clearly define component props using TypeScript interfaces.

## 6. 3D Scene Management (React Three Fiber)

*   **Scene Components:** Each distinct 3D view (main hub, individual project "worlds") will be a React component.
*   **Model Components:** Create wrapper components for GLB/glTF models loaded via Drei's `useGLTF`. These components can handle model-specific logic, animations, and interactions.
*   **Drei Helpers:** Utilize Drei extensively for common tasks (cameras, controls, loaders, shaders, post-processing effects).
*   **Performance:**
    *   `React.lazy` and `Suspense` for code-splitting and loading 3D scenes/models.
    *   Instancing for repeated geometries.
    *   Texture optimization (compression, appropriate resolutions).
    *   Careful management of draw calls.
    *   Use `<Stats />` from Drei during development to monitor performance.

## 7. Routing

*   `react-router-dom` for managing navigation.
*   Example routes:
    *   `/`: Public portfolio main hub.
    *   `/project/:projectId`: Individual project view.
    *   `/admin`: Admin login page or dashboard (if logged in).
    *   `/admin/projects`: Manage projects.
    *   `/admin/projects/new`: Create new project.
    *   `/admin/projects/edit/:projectId`: Edit project.

## 8. Styling

*   **Tailwind CSS (Example):** Apply utility classes directly in JSX. Configure `tailwind.config.js` for custom theme, colors, fonts.
*   **Global Styles:** For base styling, font imports, CSS resets in `src/styles/global.css`.

## 9. Error Handling & Loading States

*   Implement clear loading indicators (skeletons, spinners) when fetching data or loading assets.
*   Display user-friendly error messages for API errors or other issues.
*   Use error boundaries in React to catch rendering errors in component subtrees.

## 10. Build & Deployment

*   Vite handles the build process, optimizing for production.
*   Deploy the static frontend build to services like Vercel, Netlify, or GitHub Pages. 