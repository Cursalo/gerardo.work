# Requirements for Minimal 3D Portfolio (v2)

This document details the functional and non-functional requirements for the project.

## 1. Functional Requirements

### 1.1. Public Portfolio View

*   **FR1.1.1:** Display a main 3D scene showcasing an overview of projects.
*   **FR1.1.2:** Allow users to navigate and interact with the main 3D scene (e.g., camera controls, clicking on project representations).
*   **FR1.1.3:** Clicking on a project in the main scene should transition to a dedicated 3D scene or detailed view for that project.
*   **FR1.1.4:** Each project view should display associated media (3D models, images, videos, descriptions) within its 3D environment.
*   **FR1.1.5:** Smooth transitions between scenes/views.
*   **FR1.1.6:** Portfolio should be responsive and accessible on desktop and mobile devices.
*   **FR1.1.7:** Optimized loading times for 3D assets.
*   **FR1.1.8:** Display project title, description, technologies used, and links (e.g., live demo, source code).

### 1.2. Admin Panel

*   **FR1.2.1:** Secure login for administrator.
*   **FR1.2.2:** Dashboard to manage portfolio content (Projects, Worlds/Scenes, Media).
*   **FR1.2.3:** **Project Management:**
    *   Create new projects with details (title, description, thumbnail, associated media, 3D scene settings).
    *   Edit existing projects.
    *   Delete projects.
    *   Reorder projects.
*   **FR1.2.4:** **Media Management:**
    *   Upload media files (3D models - glTF/GLB, images - JPEG/PNG/WebP, videos - MP4/WebM).
    *   Associate media with specific projects.
    *   Manage media properties (e.g., position, scale, rotation within a project's 3D scene).
    *   Delete media files.
*   **FR1.2.5:** **World/Scene Configuration (Main & Project-specific):**
    *   Configure global 3D scene settings (e.g., lighting, environment maps, camera defaults).
    *   Configure individual project scene settings.
*   **FR1.2.6:** User-friendly interface for managing complex 3D object properties (transforms, materials if applicable).
*   **FR1.2.7:** Preview changes before publishing.

## 2. Non-Functional Requirements

### 2.1. Performance

*   **NFR2.1.1:** Main portfolio page load time: < 3 seconds on a decent internet connection.
*   **NFR2.1.2:** Project scene transition time: < 2 seconds.
*   **NFR2.1.3:** Smooth 3D rendering at >= 30 FPS on target devices.
*   **NFR2.1.4:** Efficient loading and management of 3D assets (lazy loading, compression).

### 2.2. Scalability

*   **NFR2.2.1:** The system should handle an increasing number of projects and media assets without significant performance degradation.
*   **NFR2.2.2:** Supabase infrastructure should scale according to usage.

### 2.3. Security

*   **NFR2.3.1:** Admin panel access must be protected by strong authentication (Supabase Auth).
*   **NFR2.3.2:** Protection against common web vulnerabilities (XSS, CSRF).
*   **NFR2.3.3:** Secure handling of any sensitive data.

### 2.4. Maintainability

*   **NFR2.4.1:** Codebase must be well-structured, documented, and follow best practices (clean code, DRY principle).
*   **NFR2.4.2:** Modular design for both frontend and backend components.
*   **NFR2.4.3:** Easy to update dependencies and technologies.

### 2.5. Usability

*   **NFR2.5.1:** Intuitive navigation for public users.
*   **NFR2.5.2:** Admin panel should be easy to use for content management, even for users with limited technical skills for 3D configurations.

### 2.6. Reliability

*   **NFR2.6.1:** High availability of the portfolio.
*   **NFR2.6.2:** Data integrity ensured by Supabase.

### 2.7. Compatibility

*   **NFR2.7.1:** Support for modern web browsers (Chrome, Firefox, Safari, Edge) on desktop and mobile.

## 3. Data Requirements

*   **DR3.1:** Data models for Projects, Media Objects (images, videos, 3D models), World/Scene configurations.
*   **DR3.2:** Relationships between projects and their associated media/scenes. 