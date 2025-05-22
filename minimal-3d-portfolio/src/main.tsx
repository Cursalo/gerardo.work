import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import App from './App.tsx'
// import Admin from './pages/Admin.tsx' // Removed Admin import
import NotFound from './pages/NotFound.tsx'
import WorldViewer from './pages/WorldViewer.tsx'
import ProjectWorldViewer from './pages/ProjectWorldViewer.tsx'
import Debug from './pages/Debug.tsx'
import './index.css'
import { WorldProvider } from './context/WorldContext.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx';

// Define routes
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorBoundary><NotFound /></ErrorBoundary>,
  },
  // {
  //   path: "/admin",
  //   element: <Admin />,
  //   errorElement: <ErrorBoundary><NotFound /></ErrorBoundary>,
  // }, // Removed Admin route
  {
    path: "/debug",
    element: <Debug />,
    errorElement: <ErrorBoundary><NotFound /></ErrorBoundary>,
  },
  {
    path: "/world/:worldId",
    element: <WorldViewer />,
    errorElement: <ErrorBoundary><NotFound /></ErrorBoundary>,
  },
  {
    path: "/project/:customLink",
    element: <ProjectWorldViewer />,
    errorElement: <ErrorBoundary><NotFound /></ErrorBoundary>,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

// Clear problematic cached data to ensure YouTube thumbnail fixes take effect
const clearProblematicCache = () => {
  try {
    // Get the projects to check for problematic data
    const projectsStr = localStorage.getItem('portfolio_projects');
    if (projectsStr) {
      const projects = JSON.parse(projectsStr);
      
      // Check if any project has a webp thumbnail
      const hasWebpThumbnails = projects.some(
        (p: any) => p.thumbnail && 
        typeof p.thumbnail === 'string' && 
        (p.thumbnail.includes('.webp') || 
         p.thumbnail.endsWith('default.web') || 
         p.thumbnail.endsWith('maxresdefau'))
      );
      
      if (hasWebpThumbnails) {
        console.log('Found problematic YouTube thumbnail URLs. Clearing project cache to apply fixes...');
        localStorage.removeItem('portfolio_projects');
        localStorage.removeItem('portfolio_projects_backup');
        localStorage.setItem('verify_file_storage', 'true');
      }
    }
  } catch (error) {
    console.error('Error checking for problematic cache:', error);
  }
};

// Run the fix
clearProblematicCache();

// Wrap the entire app with WorldProvider to ensure context is available everywhere
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WorldProvider>
        <RouterProvider router={router} />
      </WorldProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
