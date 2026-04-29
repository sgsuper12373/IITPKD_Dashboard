import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Also transform JSX in .js files
      include: /\.[jt]sx?$/,
    }),
  ],
  resolve: {
    extensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
  },
})
