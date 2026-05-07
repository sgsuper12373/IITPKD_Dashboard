import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      include: /\.[jt]sx?$/,
    }),
  ],
  resolve: {
    extensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core — always cached together, never changes between deploys
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/react-router/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          // Recharts + its deps (d3, victory-vendor) — largest single dependency
          if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3') ||
              id.includes('node_modules/victory-vendor') ||
              id.includes('node_modules/react-smooth')) {
            return 'vendor-charts';
          }
          // HTTP / utilities
          if (id.includes('node_modules/axios')) {
            return 'vendor-http';
          }
        },
      },
    },
    // Warn when any single chunk exceeds 600 kB (Vite default is 500 kB)
    chunkSizeWarningLimit: 600,
  },
})
