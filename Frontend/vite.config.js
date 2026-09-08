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
    // Dev-only: Vite's HMR client needs a WebSocket back to this same dev
    // server. A bare "ws:" scheme (no host) permits a WebSocket to ANY host
    // over unencrypted ws:// — if an XSS bug ever existed, that would let
    // injected script exfiltrate data to an attacker's own server. Scoping
    // to localhost/127.0.0.1 with a wildcard port (the dev server's port
    // varies — Vite falls back to 5174, 5175... when 5173 is taken) keeps
    // HMR working without opening connect-src up to arbitrary hosts.
    `connect-src 'self' ${apiBase} https://accounts.google.com` + (isDev ? ' ws://localhost:* ws://127.0.0.1:*' : ''),
    "frame-src https://accounts.google.com https://maps.google.com https://www.google.com",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  // Applied as a middleware (below) rather than the static `server.headers`
  // option: `server.headers` is only wired into Vite's *own* transform
  // pipeline, and doesn't reliably reach every internal endpoint (the HMR
  // client, virtual modules, etc.) across Vite versions — a scanner pointed
  // at the dev server can walk right past those and find no CSP/X-Frame-
  // Options/etc. A middleware installed first, before Vite's internal
  // middlewares, runs for literally every request that hits this server.
  const devSecurityHeaders = {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '0',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    // No Strict-Transport-Security here: this dev server is plain HTTP, and
    // HSTS is a promise about HTTPS — browsers ignore it over an insecure
    // connection anyway (RFC 6797), so it was previously just dead weight.
  }

  /** @type {import('vite').Plugin} */
  const securityHeadersPlugin = {
    name: 'security-headers',
    configureServer(server) {
      // No returned function → this runs BEFORE Vite installs its own
      // internal middlewares, so nothing can be served without it.
      server.middlewares.use((_req, res, next) => {
        for (const [key, value] of Object.entries(devSecurityHeaders)) {
          res.setHeader(key, value)
        }
        next()
      })
    },
  }

  return {
  plugins: [
    react({
      include: /\.[jt]sx?$/,
    }),
    securityHeadersPlugin,
  ],
  resolve: {
    extensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
  },
  server: {
    // Vite defaults this to `true` (reflects any request Origin back in
    // Access-Control-Allow-Origin) — nothing legitimately needs to fetch
    // this dev server's own JS/CSS/HTML cross-origin, so turn it off rather
    // than inherit an open-by-default CORS policy.
    cors: false,
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
