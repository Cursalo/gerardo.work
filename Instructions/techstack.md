# Tech Stack for Minimal 3D Portfolio (v2)

This document outlines the core technologies and tools chosen for the development of the new version of the Minimal 3D Portfolio.

## Frontend

*   **Framework/Library:** React (v18+)
*   **Language:** TypeScript
*   **Build Tool:** Vite
*   **3D Rendering:** Three.js / React Three Fiber (R3F)
*   **State Management:** Zustand (or React Context API for simpler needs)
*   **Routing:** React Router DOM
*   **Styling:** Tailwind CSS (or Styled Components / CSS Modules)
*   **HTTP Client:** `fetch` API or `axios` for Supabase communication

## Backend

*   **Platform:** Supabase
    *   **Database:** Supabase Postgres
    *   **Authentication:** Supabase Auth (for admin panel)
    *   **Storage:** Supabase Storage (for 3D models, images, videos)
    *   **APIs:** Auto-generated REST and GraphQL APIs by Supabase, potentially Supabase Edge Functions for custom logic.

## Development & Operations

*   **Version Control:** Git & GitHub (or similar)
*   **Package Manager:** npm or yarn
*   **IDE:** Visual Studio Code / Cursor
*   **Deployment:** Vercel, Netlify, or GitHub Pages (for frontend), Supabase handles backend deployment.

## Design & Prototyping (Optional)

*   **Tool:** Figma (or similar)

## Justification for Key Choices

*   **React & TypeScript:** Modern, robust combination for building interactive UIs with strong type safety.
*   **Vite:** Fast development server and build tool.
*   **React Three Fiber:** Simplifies working with Three.js in a React environment, promoting a declarative approach to 3D scenes.
*   **Supabase:** Provides a comprehensive backend solution (database, auth, storage, APIs) that reduces development overhead, allowing focus on frontend features. Its PostgreSQL core offers power and flexibility.
*   **Tailwind CSS (Example):** Utility-first CSS framework for rapid UI development.
*   **Zustand (Example):** Simple and effective state management solution for React. 