import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath, URL } from 'node:url'

function publicFarmerInstitutesV2Plugin(env) {
  const supabaseUrl = env.VITE_SUPABASE_URL || 'https://cjjirwqoovypymndhvwt.supabase.co'
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
  let supabase = null

  return {
    name: 'local-public-farmer-institutes-v2',
    configureServer(server) {
      server.middlewares.use('/api/public-farmer-institutes-v2', async (req, res) => {
        try {
          if (!supabaseKey) {
            res.statusCode = 503
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Supabase key is not configured for this local API route.' }))
            return
          }
          supabase ||= createClient(supabaseUrl, supabaseKey)
          const [
            smartFarmers,
            youngSmartFarmers,
            housewifeGroups,
            youngFarmerGroups,
            careerGroups,
          ] = await Promise.all([
            supabase.from('smart_farmer_sf').select('id,data_year,record_code,sequence_no,district,agricultural_activity,production_standard,farmer_status,annual_agri_income,production_area').order('data_year', { ascending: false }),
            supabase.from('young_smart_farmer_ysf').select('id,data_year,record_code,sequence_no,district,subdistrict,agricultural_activity,production_standard,farmer_status,farm_area_rai,annual_agri_income,main_activity_type').order('data_year', { ascending: false }),
            supabase.from('housewife_farmer_groups').select('id,year,group_name,district,subdistrict,member_count,income,fund_management,activity,production_standard,potential_level,model_group,community_enterprise_registration').order('year', { ascending: false }),
            supabase.from('young_farmer_groups_detailed').select('id,data_year,group_name,district,subdistrict,member_count,income,fund_management,activity,potential_level,model_group').order('data_year', { ascending: false }),
            supabase.from('agricultural_career_groups').select('id,data_year,group_name,district,subdistrict,member_count,income,fund_management,activity,main_activity,production_standard,potential_level,community_enterprise_registration').order('data_year', { ascending: false }),
          ])
          const failures = [smartFarmers, youngSmartFarmers, housewifeGroups, youngFarmerGroups, careerGroups]
            .filter(result => result.error)
            .map(result => result.error.message)
          if (failures.length) throw new Error(failures.join(', '))
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            smartFarmers: smartFarmers.data || [],
            youngSmartFarmers: youngSmartFarmers.data || [],
            housewifeGroups: housewifeGroups.data || [],
            youngFarmerGroups: youngFarmerGroups.data || [],
            careerGroups: careerGroups.data || [],
          }))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [publicFarmerInstitutesV2Plugin(env), react()],
    cacheDir: 'output/vite-cache',
    resolve: {
      alias: {
        recharts: fileURLToPath(new URL('./src/components/charts/RechartsEChartAdapter.jsx', import.meta.url)),
      },
    },
    server: {
      proxy: {
        // Proxy Netlify Functions to deployed site (AI proxy, sync, etc.)
        '/.netlify/functions': {
          target: 'https://npt-dashboard.netlify.app',
          changeOrigin: true,
        },
        '/api/kku': {
          target: 'https://gen.ai.kku.ac.th',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/kku/, '')
        },
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
        '/api/doae-esc': {
          target: 'https://esc.doae.go.th',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/doae-esc/, '')
        },
        '/api/doae-hq': {
          target: 'https://www.doae.go.th',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/doae-hq/, '')
        },
        '/api/bangchak-oil-price': {
          target: 'https://oil-price.bangchak.co.th',
          changeOrigin: true,
          rewrite: () => '/ApiOilPrice2/th'
        },
        '/api/rss/kasetorganic': { target: 'https://www.kasetorganic.com', changeOrigin: true, rewrite: () => '/feed/' },
        '/api/rss/kasetkaoklai': { target: 'https://www.kasetkaoklai.com', changeOrigin: true, rewrite: () => '/home/feed' },
        '/api/rss/kasettumkin': { target: 'https://kasettumkin.com', changeOrigin: true, rewrite: () => '/feed' },
        '/api/rss/thairath': { target: 'https://www.thairath.co.th', changeOrigin: true, rewrite: () => '/rss/agriculture' },
        '/api/rss/agrinewsthai': { target: 'https://www.agrinewsthai.com', changeOrigin: true, rewrite: () => '/feed' },
        '/api/rss/moac': { target: 'http://www.opsmoac.go.th', changeOrigin: true, rewrite: () => '/all_rss/news-all-382791791793.xml' }
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.js',
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['tests/e2e/**/*', 'node_modules/**/*'],
    }
  }
})
