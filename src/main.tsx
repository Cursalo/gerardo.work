import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import App from './App.tsx'
import Admin from './pages/Admin.tsx'
import NotFound from './pages/NotFound.tsx'
import WorldViewer from './pages/WorldViewer.tsx'
import ProjectSubworld from './pages/ProjectSubworld.tsx'
import Debug from './pages/Debug.tsx'
import './index.css'
import { WorldProvider } from './context/WorldContext.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx';

// Handle GitHub Pages redirects
const initialRoute = sessionStorage.getItem('initialRoute');
if (initialRoute) {
  sessionStorage.removeItem('initialRoute');
  console.log('React Router: Handling GitHub Pages redirect to:', initialRoute);
}

// Define routes
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorBoundary><NotFound /></ErrorBoundary>,
  },
  {
    path: "/admin",
    element: <Admin />,
    errorElement: <ErrorBoundary><NotFound /></ErrorBoundary>,
  },
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
    path: "/project/:projectId",
    element: <ProjectSubworld />,
    errorElement: <ErrorBoundary><NotFound /></ErrorBoundary>,
  },
  {
    path: "/projects/:projectName/index.html",
    element: <ProjectSubworld />,
    errorElement: <ErrorBoundary><NotFound /></ErrorBoundary>,
  },
  {
    path: "/projects/:projectName",
    element: <ProjectSubworld />,
    errorElement: <ErrorBoundary><NotFound /></ErrorBoundary>,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

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
