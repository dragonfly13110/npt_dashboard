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
      },
      '/api/gistda': {
        target: 'https://api-gateway.gistda.or.th',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gistda/, '')
      },
      '/api/doae-npt': {
        target: 'https://nakhonpathom.doae.go.th',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/doae-npt/, '')
      }
    }
  }
})
