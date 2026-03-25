import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
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
            'API-Key': (env.VITE_GISTDA_API_KEY && env.VITE_GISTDA_API_KEY.length > 5) ? env.VITE_GISTDA_API_KEY : '2lAkC1Ob7uugojJ1JlgHJPveFRdtCRg51qkZazYqh1fmEf18Me2DtLMsWLOT1aMi',
            'accept': 'application/json'
          }
        },
        '/api/doae-npt': {
          target: 'https://nakhonpathom.doae.go.th',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/doae-npt/, '')
        },
        '/api/doae-hq': {
          target: 'https://www.doae.go.th',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/doae-hq/, '')
        }
      }
    }
  }
})
