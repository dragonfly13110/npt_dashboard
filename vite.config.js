import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { syncGeoplotsProgress } from './scripts/sync_geoplots_progress.js';
import fs from 'node:fs';
import path from 'node:path';

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function requireAdmin(req, env) {
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { error: 'Missing local SUPABASE_SERVICE_ROLE_KEY', status: 503 };
  }
  const token = (req.headers.authorization || '')
    .replace(/^Bearer\s+/i, '')
    .trim();
  if (!token) return { error: 'Missing authorization token', status: 401 };

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);
  if (userError || !user)
    return { error: 'Invalid authorization token', status: 401 };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profileError || profile?.role !== 'admin') {
    return { error: 'Only admins can sync GEOPLOTS data', status: 403 };
  }
  return null;
}

function localGeoplotsSyncPlugin(env) {
  return {
    name: 'local-geoplots-sync',
    configureServer(server) {
      server.middlewares.use(
        '/.netlify/functions/sync-geoplots-progress',
        async (req, res) => {
          if (req.method !== 'POST') {
            json(res, 405, { error: 'Method not allowed' });
            return;
          }
          try {
            const authError = await requireAdmin(req, env);
            if (authError) {
              json(res, authError.status, { error: authError.error });
              return;
            }
            const rows = await syncGeoplotsProgress();
            json(res, 200, { ok: true, rows: rows.length });
          } catch (err) {
            json(res, 500, { error: err.message || 'GEOPLOTS sync failed' });
          }
        }
      );
    },
  };
}

function publicFarmerInstitutesV2Plugin(env) {
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
  let supabase = null;

  return {
    name: 'local-public-farmer-institutes-v2',
    configureServer(server) {
      server.middlewares.use(
        '/api/public-farmer-institutes-v2',
        async (req, res) => {
          try {
            if (!supabaseKey) {
              res.statusCode = 503;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error:
                    'Supabase key is not configured for this local API route.',
                })
              );
              return;
            }
            supabase ||= createClient(supabaseUrl, supabaseKey);
            const [
              smartFarmers,
              youngSmartFarmers,
              housewifeGroups,
              youngFarmerGroups,
              careerGroups,
            ] = await Promise.all([
              supabase
                .from('smart_farmer_sf')
                .select(
                  'id,data_year,record_code,sequence_no,district,agricultural_activity,production_standard,farmer_status,annual_agri_income,production_area'
                )
                .order('data_year', { ascending: false }),
              supabase
                .from('young_smart_farmer_ysf')
                .select(
                  'id,data_year,record_code,sequence_no,district,subdistrict,agricultural_activity,production_standard,farmer_status,farm_area_rai,annual_agri_income,main_activity_type'
                )
                .order('data_year', { ascending: false }),
              supabase
                .from('housewife_farmer_groups')
                .select(
                  'id,year,group_name,district,subdistrict,member_count,income,fund_management,activity,production_standard,potential_level,model_group,community_enterprise_registration'
                )
                .order('year', { ascending: false }),
              supabase
                .from('young_farmer_groups_detailed')
                .select(
                  'id,data_year,group_name,district,subdistrict,member_count,income,fund_management,activity,potential_level,model_group'
                )
                .order('data_year', { ascending: false }),
              supabase
                .from('agricultural_career_groups')
                .select(
                  'id,data_year,group_name,district,subdistrict,member_count,income,fund_management,activity,main_activity,production_standard,potential_level,community_enterprise_registration'
                )
                .order('data_year', { ascending: false }),
            ]);
            const failures = [
              smartFarmers,
              youngSmartFarmers,
              housewifeGroups,
              youngFarmerGroups,
              careerGroups,
            ]
              .filter((result) => result.error)
              .map((result) => result.error.message);
            if (failures.length) throw new Error(failures.join(', '));
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                smartFarmers: smartFarmers.data || [],
                youngSmartFarmers: youngSmartFarmers.data || [],
                housewifeGroups: housewifeGroups.data || [],
                youngFarmerGroups: youngFarmerGroups.data || [],
                careerGroups: careerGroups.data || [],
              })
            );
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        }
      );
    },
  };
}

function publicCertificationsPlugin(env) {
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
  let supabase = null;

  const fetchAllCertifications = async () => {
    const pageSize = 1000;
    const rows = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from('certifications')
        .select(
          'id,crop_name,plot_type,area_rai,production_volume_kg,cert_date,exp_date,plot_moo,plot_subdistrict,plot_district,farmer_moo,farmer_subdistrict,farmer_district,created_at'
        )
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < pageSize) return rows;
    }
  };

  return {
    name: 'local-public-certifications',
    configureServer(server) {
      server.middlewares.use(
        '/api/public-certifications',
        async (_req, res) => {
          try {
            if (!supabaseUrl || !supabaseKey) {
              json(res, 503, {
                error:
                  'Supabase env is not configured for this local API route.',
              });
              return;
            }
            supabase ||= createClient(supabaseUrl, supabaseKey);
            const { count, error: countError } = await supabase
              .from('certifications')
              .select('*', { count: 'exact', head: true });
            if (countError) throw countError;

            const rows = await fetchAllCertifications();

            json(res, 200, {
              data: rows.map((row) => ({
                ...row,
                farmer_name: null,
                plot_code: null,
                farmer_key: row.id ? `cert-${row.id}` : null,
              })),
              count: count || 0,
            });
          } catch (err) {
            json(res, 500, { error: err.message });
          }
        }
      );
    },
  };
}

function localMocPriceProxyPlugin() {
  return {
    name: 'local-moc-price-proxy',
    configureServer(server) {
      server.middlewares.use(
        '/.netlify/functions/moc-price-proxy',
        async (req, res) => {
          try {
            const { default: handler } =
              await import('./netlify/functions/moc-price-proxy.js');
            const fullUrl = `http://localhost${req.url}`;
            const mockRequest = {
              method: req.method,
              url: fullUrl,
              headers: {
                get(name) {
                  return req.headers[name.toLowerCase()] || null;
                },
              },
            };
            const response = await handler(mockRequest);
            const responseBody = await response.text();
            res.statusCode = response.status;
            response.headers.forEach((val, key) => {
              res.setHeader(key, val);
            });
            res.end(responseBody);
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        }
      );
    },
  };
}

function localNetlifyFunctionsPlugin() {
  return {
    name: 'local-netlify-functions-router',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) {
          return next();
        }

        const urlObj = new URL(
          req.url,
          `http://${req.headers.host || 'localhost'}`
        );
        const parts = urlObj.pathname.split('/').filter(Boolean);

        if (parts[0] !== 'api' || parts.length < 2) {
          return next();
        }

        const functionName = parts[1];

        // Skip endpoints that are already handled explicitly by other plugins
        const skippedFunctions = [
          'data-dictionary',
          'public-farmer-institutes-v2',
          'public-certifications',
        ];
        if (skippedFunctions.includes(functionName)) {
          return next();
        }

        // We check for files inside netlify/functions/
        const possibleFiles = [
          path.resolve(`./netlify/functions/${functionName}.js`),
          path.resolve(`./netlify/functions/${functionName}.cjs`),
        ];

        let fileToImport = null;
        for (const file of possibleFiles) {
          if (fs.existsSync(file)) {
            fileToImport = file;
            break;
          }
        }

        if (!fileToImport) {
          return next();
        }

        try {
          const { default: handler } = await import(
            pathToFileURL(fileToImport).href
          );

          let body = '';
          if (
            req.method === 'POST' ||
            req.method === 'PUT' ||
            req.method === 'DELETE' ||
            req.method === 'PATCH'
          ) {
            body = await new Promise((resolve) => {
              let data = '';
              req.on('data', (chunk) => {
                data += chunk;
              });
              req.on('end', () => {
                resolve(data);
              });
            });
          }

          const mockRequest = {
            method: req.method,
            url: urlObj.href,
            headers: {
              get(name) {
                return req.headers[name.toLowerCase()] || null;
              },
            },
            json: async () => JSON.parse(body || '{}'),
            text: async () => body,
          };

          const response = await handler(mockRequest);
          const responseBody = await response.text();

          res.statusCode = response.status;
          response.headers.forEach((val, key) => {
            res.setHeader(key, val);
          });
          res.end(responseBody);
        } catch (err) {
          console.error(
            `Error in local function router for ${functionName}:`,
            err
          );
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

function localDataDictionaryPlugin() {
  return {
    name: 'local-data-dictionary',
    configureServer(server) {
      server.middlewares.use('/api/data-dictionary', async (req, res) => {
        try {
          const { default: handler } =
            await import('./netlify/functions/data-dictionary.js');
          const fullUrl = `http://localhost${req.url}`;
          let body = '';
          if (req.method === 'POST') {
            body = await new Promise((resolve) => {
              let data = '';
              req.on('data', (chunk) => {
                data += chunk;
              });
              req.on('end', () => {
                resolve(data);
              });
            });
          }
          const mockRequest = {
            method: req.method,
            url: fullUrl,
            headers: {
              get(name) {
                return req.headers[name.toLowerCase()] || null;
              },
            },
            json: async () => JSON.parse(body || '{}'),
            text: async () => body,
          };
          const response = await handler(mockRequest);
          const responseBody = await response.text();
          res.statusCode = response.status;
          response.headers.forEach((val, key) => {
            res.setHeader(key, val);
          });
          res.end(responseBody);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

function localDataQualityStatsPlugin() {
  return {
    name: 'local-data-quality-stats',
    configureServer(server) {
      server.middlewares.use(
        '/api/admin/data-quality-stats',
        async (req, res) => {
          try {
            const { default: handler } =
              await import('./netlify/functions/data-quality-stats.js');
            const fullUrl = `http://localhost${req.url}`;
            let body = '';
            if (req.method === 'POST') {
              body = await new Promise((resolve) => {
                let data = '';
                req.on('data', (chunk) => {
                  data += chunk;
                });
                req.on('end', () => {
                  resolve(data);
                });
              });
            }
            const mockRequest = {
              method: req.method,
              url: fullUrl,
              headers: {
                get(name) {
                  return req.headers[name.toLowerCase()] || null;
                },
              },
              json: async () => JSON.parse(body || '{}'),
              text: async () => body,
            };
            const response = await handler(mockRequest);
            const responseBody = await response.text();
            res.statusCode = response.status;
            response.headers.forEach((val, key) => {
              res.setHeader(key, val);
            });
            res.end(responseBody);
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        }
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gistdaApiKey = env.GISTDA_API_KEY || env.VITE_GISTDA_API_KEY;

  // Environment variables validation
  const requiredEnv =
    mode === 'production'
      ? ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
      : ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missingEnv = requiredEnv.filter((key) => !env[key]);

  if (missingEnv.length > 0) {
    const errorMsg = `Missing environment variables: ${missingEnv.join(', ')}`;
    if (mode === 'production') {
      console.error(`\x1b[31mError: ${errorMsg}\x1b[0m`);
      throw new Error(errorMsg);
    } else {
      console.warn(
        `\x1b[33mWarning: ${errorMsg}. Please configure them in your .env.local file.\x1b[0m`
      );
    }
  }

  return {
    plugins: [
      localGeoplotsSyncPlugin(env),
      localMocPriceProxyPlugin(),
      localDataQualityStatsPlugin(env),
      localDataDictionaryPlugin(),
      localNetlifyFunctionsPlugin(),
      publicFarmerInstitutesV2Plugin(env),
      publicCertificationsPlugin(env),
      react(),
    ],
    cacheDir: 'tmp/vite-cache',
    resolve: {
      alias: {
        recharts: fileURLToPath(
          new URL(
            './src/components/charts/RechartsEChartAdapter.jsx',
            import.meta.url
          )
        ),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('echarts')) {
                return 'echarts';
              }
            }
          },
        },
      },
    },
    server: {
      watch: {
        ignored: ['**/farmer69_knowledge_v1.1/**', '**/*.pdf', '**/tmp/**'],
      },
      proxy: {
        // Proxy Netlify Functions to deployed site (AI proxy, sync, etc.)
        '/.netlify/functions': {
          target: 'https://npt-dashboard.netlify.app',
          changeOrigin: true,
        },
        '/api/kku': {
          target: 'https://gen.ai.kku.ac.th',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/kku/, ''),
        },
        '/api/nabc': {
          target: 'https://agriapi.nabc.go.th',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/nabc/, ''),
        },
        '/api/gistda': gistdaApiKey
          ? {
              target: 'https://api-gateway.gistda.or.th',
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api\/gistda/, ''),
              headers: {
                'API-Key': gistdaApiKey,
                accept: 'application/json',
              },
            }
          : {
              target: 'https://npt-dashboard.netlify.app',
              changeOrigin: true,
            },
        '/api/doae-npt': {
          target: 'https://nakhonpathom.doae.go.th',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/doae-npt/, ''),
        },
        '/api/doae-esc': {
          target: 'https://esc.doae.go.th',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/doae-esc/, ''),
        },
        '/api/doae-hq': {
          target: 'https://www.doae.go.th',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/doae-hq/, ''),
        },
        '/api/bangchak-oil-price': {
          target: 'https://oil-price.bangchak.co.th',
          changeOrigin: true,
          rewrite: () => '/ApiOilPrice2/th',
        },
        '/api/rss/kasetorganic': {
          target: 'https://www.kasetorganic.com',
          changeOrigin: true,
          rewrite: () => '/feed/',
        },
        '/api/rss/kasetkaoklai': {
          target: 'https://www.kasetkaoklai.com',
          changeOrigin: true,
          rewrite: () => '/home/feed',
        },
        '/api/rss/kasettumkin': {
          target: 'https://kasettumkin.com',
          changeOrigin: true,
          rewrite: () => '/feed',
        },
        '/api/rss/thairath': {
          target: 'https://www.thairath.co.th',
          changeOrigin: true,
          rewrite: () => '/rss/agriculture',
        },
        '/api/rss/agrinewsthai': {
          target: 'https://www.agrinewsthai.com',
          changeOrigin: true,
          rewrite: () => '/feed',
        },
        '/api/rss/moac': {
          target: 'http://www.opsmoac.go.th',
          changeOrigin: true,
          rewrite: () => '/all_rss/news-all-382791791793.xml',
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      // ponytail: test-only placeholders let pure helpers import the client without real credentials.
      env: {
        VITE_SUPABASE_URL: 'https://example.test',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      },
      setupFiles: './src/setupTests.js',
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['tests/e2e/**/*', 'node_modules/**/*'],
    },
  };
});
