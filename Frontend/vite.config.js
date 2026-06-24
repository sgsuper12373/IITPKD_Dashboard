import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = env.VITE_API_BASE_URL || 'http://127.0.0.1:5000'

  const isDev = mode === 'development'
  const csp = [
    "default-src 'self'",
    isDev ? "script-src 'self' 'unsafe-inline' https://accounts.google.com" : "script-src 'self' https://accounts.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
    `img-src 'self' data: blob: ${apiBase}`,
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' ${apiBase} https://accounts.google.com` + (isDev ? ' ws:' : ''),
    "frame-src https://accounts.google.com https://maps.google.com https://www.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return {
  plugins: [
    react({
      include: /\.[jt]sx?$/,
    }),
  ],
  resolve: {
    extensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
  },
  server: {
    headers: {
      'Content-Security-Policy': csp,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-XSS-Protection': '0',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
    fs: {
      strict: true,
    },
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
  }
})
