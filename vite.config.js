import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/nabc': {
        target: 'https://agriapi.nabc.go.th',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nabc/, '')
      }
    }
  }
})
