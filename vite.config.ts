import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ensure proper base path for production
  base: './',
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
    }
  },
  // Development server configuration
  server: {
    // Enable CORS for development
    cors: true,
    // Fix MIME type issues for worker scripts
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  // Ensure proper asset handling
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.hdr', '**/*.exr'],
  // Define global constants to fix __name errors
  define: {
    __name: '"vite-app"',
    global: 'globalThis'
  }
})
