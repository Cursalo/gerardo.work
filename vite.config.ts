import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use absolute paths for production to fix path resolution issues
  base: '/',
  // Fix worker and MIME type issues
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['three']
  },
  // Build configuration for production
  build: {
    // Generate relative paths for assets
    assetsDir: 'assets',
    // Ensure proper chunking for better loading
    rollupOptions: {
      output: {
        // Separate chunks for better caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          'three-js': ['three', '@react-three/fiber', '@react-three/drei'],
        }
      }
    },
    // Ensure the projects directory is copied to the build output
    copyPublicDir: true
  },
  // Development server configuration
  server: {
    // Enable CORS for development
    cors: true,
    // Fix MIME type issues for worker scripts
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin'
    },
    // Ensure proper serving of static files
    fs: {
      // Allow serving files from the projects directory
      allow: ['..']
    }
  },
  // Ensure proper asset handling including project.json files
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.hdr', '**/*.exr', '**/project.json'],
  // Define global constants to fix __name errors
  define: {
    __name: '"vite-app"',
    global: 'globalThis'
  },
  // Ensure public directory is properly configured
  publicDir: 'public'
})
