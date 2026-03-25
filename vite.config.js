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
        rewrite: (path) => path.replace(/^\/api\/gistda/, ''),
        headers: {
          'API-Key': '2lAkC1Ob7uugojJ1JlgHJPveFRdtCRg51qkZazYqh1fmEf18Me2DtLMsWLOT1aMi'
        }
      }
    }
  }
})
