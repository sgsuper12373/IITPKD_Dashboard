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
    // esnext keeps output smaller (no legacy polyfills) — safe for modern browsers
    target: 'esnext',
    // Inline assets ≤ 8 kB as data-URIs to avoid extra HTTP requests
    assetsInlineLimit: 8192,
    rollupOptions: {
      output: {
        chunkFileNames: "assets/[name]-[hash].js",   // stable names → long-lived browser cache
        manualChunks: (id) => {
          // React core — tiny, always needed, long-lived cache
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/react-router/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          // Recharts + its heavy deps (d3, victory-vendor) — loaded lazily
          if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3') ||
              id.includes('node_modules/victory-vendor') ||
              id.includes('node_modules/react-smooth')) {
            return 'vendor-charts';
          }
          // PDF export libs — large (~700 kB) but only used on explicit export action
          // Separating them prevents them from blocking first paint
          if (id.includes('node_modules/jspdf') ||
              id.includes('node_modules/jspdf-autotable') ||
              id.includes('node_modules/html2canvas')) {
            return 'vendor-pdf';
          }
          // HTTP / utilities
          if (id.includes('node_modules/axios')) {
            return 'vendor-http';
          }
        },
      },
    },
    // Warn when any single chunk exceeds 600 kB
    chunkSizeWarningLimit: 600,
  },
})
