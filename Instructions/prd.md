# Product Requirements Document: Minimal 3D Portfolio (v2)

## 1. Introduction

This document outlines the product requirements for the second version of the "Minimal 3D Portfolio." The project aims to create a visually engaging and interactive platform for showcasing personal or professional projects using 3D environments, backed by a robust and easy-to-manage content system.

## 2. Goals

*   **Primary Goal:** To provide an immersive and memorable way for visitors to explore a collection of projects.
*   **Secondary Goal:** To empower the portfolio owner with a simple yet powerful admin interface to manage and update portfolio content without needing to modify code directly.
*   **Technical Goal:** To build a modern, performant, and maintainable application using best practices and a scalable tech stack (React, Three.js/R3F, Supabase).

## 3. Target Audience

*   **Portfolio Visitors:** Potential employers, clients, collaborators, or anyone interested in viewing the showcased work. They expect a unique, smooth, and informative experience.
*   **Portfolio Owner (Administrator):** The individual whose work is being showcased. They need an efficient way to update projects, media, and the overall presentation.

## 4. Key Features

### 4.1. Public Portfolio

*   **Interactive 3D Main Hub:** A central 3D scene that acts as an entry point, possibly showcasing representations of different projects.
*   **Individual 3D Project "Worlds":** Each project can have its own dedicated 3D scene or an expanded view within the main hub, allowing for tailored presentation of its content.
*   **Multimedia Display:** Support for displaying 3D models, images, videos, and textual descriptions within the 3D environment.
*   **Intuitive Navigation:** Easy-to-understand controls for moving within scenes and selecting projects.
*   **Responsive Design:** Seamless experience across desktop, tablet, and mobile devices.
*   **Fast Loading:** Optimized asset loading for a quick initial experience.
*   **Project Details:** Clear presentation of project information (title, description, technologies, links).

### 4.2. Admin Panel

*   **Secure Authentication:** Login system for the administrator.
*   **Project CRUD:** Ability to Create, Read, Update, and Delete projects.
    *   Fields: Title, description, summary, thumbnail image, categories/tags, live URL, source code URL, main 3D model (if any).
*   **Media Object Management:**
    *   Upload various media types (images, videos, 3D models like glTF/GLB).
    *   Link media objects to specific projects.
    *   Define properties for media objects within a project's 3D scene (e.g., position, rotation, scale, interaction type like "info hotspot" or "play video").
*   **Scene/World Configuration:**
    *   Adjust global scene settings (lighting, background/HDRI).
    *   Customize individual project scene layouts or elements.
*   **User-Friendly Interface:** Simplified controls for managing potentially complex 3D scene data.

## 5. User Stories (Examples)

*   **As a Visitor,** I want to easily explore different projects in a visually appealing 3D environment so I can get a good understanding of the creator's skills.
*   **As a Visitor,** I want the portfolio to load quickly and run smoothly on my device so I don't get frustrated.
*   **As a Visitor,** I want to be able to view project details, such as descriptions and links to live demos or code.
*   **As the Portfolio Owner,** I want to log in to an admin panel to add a new project, including its 3D model, images, and description, without writing code.
*   **As the Portfolio Owner,** I want to easily update the position or scale of a 3D model within a project's scene through the admin panel.
*   **As the Portfolio Owner,** I want to be sure that my media assets (3D models, images) are stored securely and efficiently.

## 6. Success Metrics

*   **Engagement:** Average time spent on site, number of projects viewed per session.
*   **Usability (Admin):** Time taken to add or update a project.
*   **Performance:** Page load speed (e.g., Google PageSpeed Insights score), FPS in 3D scenes.
*   **Adoption (Owner):** Regular updates to the portfolio content.
*   **Feedback:** Positive feedback from visitors regarding the experience.

## 7. Future Considerations (Out of Scope for v2 Initial Release)

*   Advanced animation controls in the admin panel.
*   User analytics integration.
*   Multiple themes or layout options.
*   Collaborative features (if applicable).
*   Blog integration. 