# Backend Architecture: Minimal 3D Portfolio (v2) - Supabase

This document outlines the backend architecture for the Minimal 3D Portfolio, leveraging Supabase as the Backend-as-a-Service (BaaS) platform.

## 1. Core Platform: Supabase

Supabase provides a suite of tools built around a PostgreSQL database, offering:

*   **Database:** A dedicated, scalable PostgreSQL database.
*   **Authentication:** Supabase Auth for managing user identities (primarily for the admin).
*   **Storage:** Supabase Storage for storing large files like 3D models, images, and videos.
*   **Auto-generated APIs:** Instant RESTful and GraphQL APIs for database tables.
*   **Edge Functions:** Serverless functions for custom backend logic if needed (Deno-based).
*   **Realtime (Optional):** For features requiring live data synchronization, though likely not a primary need for this version.

## 2. Data Models (PostgreSQL Tables)

The following tables will be created in the Supabase PostgreSQL database. Row Level Security (RLS) will be applied to control access.

### 2.1. `users` (Handled by Supabase Auth)

*   Managed by Supabase Auth. Stores admin user information.
*   No direct manipulation needed unless customizing auth flows.

### 2.2. `projects`

*   `id`: `UUID` (Primary Key, default `uuid_generate_v4()`)
*   `created_at`: `TIMESTAMP WITH TIME ZONE` (default `now()`)
*   `updated_at`: `TIMESTAMP WITH TIME ZONE` (default `now()`)
*   `owner_id`: `UUID` (Foreign Key to `auth.users(id)` - the admin who owns/created it)
*   `title`: `TEXT` (Not Null)
*   `slug`: `TEXT` (Unique, for friendly URLs, generated from title)
*   `description`: `TEXT`
*   `summary`: `TEXT` (Shorter version for cards/previews)
*   `thumbnail_url`: `TEXT` (URL from Supabase Storage)
*   `tags`: `TEXT[]` (Array of tags/categories)
*   `live_url`: `TEXT` (Link to live demo)
*   `source_code_url`: `TEXT` (Link to repository)
*   `is_published`: `BOOLEAN` (default `false`)
*   `order_position`: `INTEGER` (For manual sorting of projects, default `0`)
*   `world_config_id`: `UUID` (Optional Foreign Key to `world_configurations` if a project has a unique overarching scene config)

### 2.3. `media_objects`

*   `id`: `UUID` (Primary Key)
*   `created_at`: `TIMESTAMP WITH TIME ZONE`
*   `project_id`: `UUID` (Foreign Key to `projects(id)`, Nullable if media can be global)
*   `owner_id`: `UUID` (Foreign Key to `auth.users(id)`)
*   `name`: `TEXT` (User-defined name for the asset)
*   `file_name`: `TEXT` (Original uploaded file name)
*   `file_path`: `TEXT` (Path in Supabase Storage, e.g., `user_id/project_id/model.glb`)
*   `storage_bucket`: `TEXT` (e.g., 'project-media')
*   `mime_type`: `TEXT` (e.g., `model/gltf-binary`, `image/jpeg`)
*   `size_bytes`: `BIGINT`
*   `type`: `TEXT` (Enum: 'model', 'image', 'video', 'hdri', 'texture')
*   `metadata`: `JSONB` (For storing specific attributes, e.g., image dimensions, model polycount)

### 2.4. `scene_elements` (Representing objects within a project's 3D scene)

*   `id`: `UUID` (Primary Key)
*   `created_at`: `TIMESTAMP WITH TIME ZONE`
*   `project_id`: `UUID` (Foreign Key to `projects(id)`)
*   `media_object_id`: `UUID` (Optional FK to `media_objects(id)` if this element is based on an uploaded asset)
*   `element_type`: `TEXT` (Enum: 'model', 'image_plane', 'video_plane', 'light', 'text_label', 'hotspot', 'environment')
*   `name`: `TEXT` (Descriptive name for the element in the scene)
*   `position`: `JSONB` (e.g., `{ "x": 0, "y": 1, "z": -2 }` or `[0, 1, -2]`)
*   `rotation`: `JSONB` (Euler angles or Quaternion)
*   `scale`: `JSONB` (e.g., `{ "x": 1, "y": 1, "z": 1 }` or `[1, 1, 1]`)
*   `properties`: `JSONB` (Specific properties depending on `element_type`. E.g., for 'light': `{ "type": "PointLight", "intensity": 0.8, "color": "#FFFFFF" }`; for 'model': `{ "url": "path_to_model_in_storage" }` (could be redundant if media_object_id is used); for 'hotspot': `{ "action_type": "navigate", "target_url": "/about" }`)

### 2.5. `world_configurations` (Global or project-specific 3D scene settings)

*   `id`: `UUID` (Primary Key)
*   `name`: `TEXT` (e.g., "Main Portfolio Hub", "Project X Scene")
*   `owner_id`: `UUID` (Foreign Key to `auth.users(id)`)
*   `background_type`: `TEXT` (Enum: 'color', 'hdri', 'image')
*   `background_value`: `TEXT` (Hex color, URL to HDRI/image from Storage)
*   `ambient_light_intensity`: `FLOAT`
*   `ambient_light_color`: `TEXT` (Hex color)
*   `default_camera_position`: `JSONB`
*   `default_camera_look_at`: `JSONB`
*   `fog_settings`: `JSONB` (Optional: `{ "color": "#000000", "near": 1, "far": 100 }`)
*   `post_processing_effects`: `JSONB` (Optional: array of effects like bloom, SSAO)

## 3. Authentication (Supabase Auth)

*   **Admin Login:** Email/Password authentication for the portfolio owner.
*   **JWTs:** Supabase Auth will issue JSON Web Tokens upon successful login. The frontend will store this token (securely, e.g., in memory or httpOnly cookie if using server-side rendering for auth parts) and send it in the `Authorization` header for requests to protected backend resources.
*   **Row Level Security (RLS):** RLS policies on tables will ensure:
    *   Admin can only CUD (Create, Update, Delete) their own data (projects, media, etc.).
    *   Published projects and their associated media are publicly readable (SELECT).
    *   Unpublished data is not publicly accessible.

## 4. Storage (Supabase Storage)

*   **Buckets:**
    *   `project-media`: Public bucket for storing 3D models, images, videos used in projects.
        *   Access policies: Public read, admin write.
    *   `env-maps`: Public bucket for HDRI files.
    *   (Possibly) `admin-assets`: Private bucket for admin panel specific assets if any.
*   **File Uploads:** The frontend admin panel will upload files directly to Supabase Storage using the Supabase client library.
*   **File Paths:** Organized structure, e.g., `user_id/project_id/file_name.glb`.

## 5. APIs

*   **Supabase Client Library (JavaScript):** The frontend will primarily interact with Supabase using the official `supabase-js` library. This handles:
    *   Authentication requests.
    *   Database queries (CRUD operations on tables).
    *   File uploads/downloads to Storage.
*   **REST/GraphQL:** Supabase automatically provides these APIs. While `supabase-js` is preferred for frontend, these can be useful for external integrations or debugging.
*   **Database Functions (SQL):** For complex queries or data manipulation that is better handled at the database level (e.g., generating slugs, cascading deletes if not handled by FK constraints). These can be called via RPC from `supabase-js`.
*   **Edge Functions (Deno, Optional):**
    *   If specific backend logic is needed that doesn't fit well into RLS or SQL functions (e.g., integrating with a third-party service, complex data processing before insertion).
    *   Example: An edge function to resize images upon upload or to validate complex project configurations.

## 6. Security Policies (RLS Examples)

### `projects` table:

*   **Admin can manage their own projects:**
    ```sql
    CREATE POLICY "Admin full access to own projects"
    ON projects FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);
    ```
*   **Public can read published projects:**
    ```sql
    CREATE POLICY "Public read access to published projects"
    ON projects FOR SELECT
    USING (is_published = true);
    ```

### `media_objects` table:

*   **Admin can manage their own media:**
    ```sql
    CREATE POLICY "Admin full access to own media"
    ON media_objects FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);
    ```
*   **Public can read media linked to published projects (or globally accessible media):**
    This requires a more complex policy, possibly checking the `is_published` status of the linked project or if `project_id` is NULL for global assets.
    ```sql
    -- Simplified example for media linked to published projects
    CREATE POLICY "Public read access to media of published projects"
    ON media_objects FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = media_objects.project_id AND p.is_published = true
      )
      -- OR media_objects.project_id IS NULL -- if some media is globally public
    );
    ```

Similar RLS policies will be defined for `scene_elements` and `world_configurations`.

## 7. Deployment

*   Supabase handles the deployment and scaling of the database, auth, storage, and edge functions.
*   Database schema migrations will be managed using Supabase's migration tools (either via the Supabase CLI or the dashboard).

## 8. Backup and Recovery

*   Supabase provides automated backups for the PostgreSQL database. Configure Point-in-Time Recovery (PITR) if needed for more granular recovery options (check Supabase plan).
*   Storage objects are also managed and backed up by Supabase. 