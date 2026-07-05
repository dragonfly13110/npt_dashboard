import { lazy, Suspense } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import thTH from 'antd/locale/th_TH';
import ErrorBoundary from './components/ErrorBoundary/index';
import PageSkeleton from './components/PageSkeleton';
import AppLayout from './components/Layout/AppLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingChatbot from './components/LandingChatbot/LandingChatbot';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000, // 15 นาที — ข้อมูลยังถือว่า fresh
      gcTime: 60 * 60 * 1000, // 60 นาที — เก็บ cache ไว้ในหน่วยความจำ
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Lazy-loaded pages
const Login = lazy(() => import('./pages/Login'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Manual = lazy(() => import('./pages/Manual'));
const ManualArticle = lazy(() => import('./pages/ManualArticle'));
const InteractiveDashboard = lazy(() => import('./pages/InteractiveDashboard'));
const SmartMap = lazy(() => import('./pages/SmartMap'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SituationRoom = lazy(() => import('./pages/SituationRoom'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Chatbot = lazy(() => import('./pages/Chatbot'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const Bmc = lazy(() => import('./pages/Bmc'));
const DataRequests = lazy(() => import('./pages/dataRequests/DataRequests'));
const FarmerForum = lazy(() => import('./pages/community/FarmerForum'));

// Admin
const Personnel = lazy(() => import('./pages/admin/Personnel'));
const Assets = lazy(() => import('./pages/admin/Assets'));
const Budgets = lazy(() => import('./pages/admin/Budgets'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const AuditLog = lazy(() => import('./pages/admin/AuditLog'));
const RecentActivities = lazy(() => import('./pages/admin/RecentActivities'));
const VisitorAnalytics = lazy(() => import('./pages/admin/VisitorAnalytics'));
const WebsiteEvaluations = lazy(
  () => import('./pages/admin/WebsiteEvaluations')
);
const DataQuality = lazy(() => import('./pages/admin/DataQuality'));
const Profile = lazy(() => import('./pages/Profile'));

// Strategy
const Disasters = lazy(() => import('./pages/strategy/Disasters'));
const AgriculturalAreas = lazy(
  () => import('./pages/strategy/AgriculturalAreas')
);
const AgriculturalPrices = lazy(
  () => import('./pages/strategy/AgriculturalPrices')
);
const LearningCenters = lazy(() => import('./pages/strategy/LearningCenters'));
const FarmerRegistry = lazy(() => import('./pages/strategy/FarmerRegistry'));
const ParcelDrawingProgress = lazy(
  () => import('./pages/strategy/ParcelDrawingProgress')
);
const StrategyDashboard = lazy(
  () => import('./pages/strategy/StrategyDashboard')
);
const DailyWeather = lazy(() => import('./pages/strategy/DailyWeather'));

// Production
const LargePlots = lazy(() => import('./pages/production/LargePlots'));
const Certifications = lazy(() => import('./pages/production/Certifications'));
const CropProduction = lazy(() => import('./pages/production/CropProduction'));
const ProductionCosts = lazy(
  () => import('./pages/production/ProductionCosts')
);
const ProductionDashboard = lazy(
  () => import('./pages/production/ProductionDashboard')
);

// Development
const CommunityEnterprises = lazy(
  () => import('./pages/development/CommunityEnterprises')
);
const SmartFarmers = lazy(() => import('./pages/development/SmartFarmers'));
const SmartFarmerSf = lazy(() => import('./pages/development/SmartFarmerSf'));
const YoungSmartFarmerYsf = lazy(
  () => import('./pages/development/YoungSmartFarmerYsf')
);
const AgriculturalCareerGroups = lazy(
  () => import('./pages/development/AgriculturalCareerGroups')
);
const HousewifeFarmerGroups = lazy(() =>
  import('./pages/development/FarmerGroups').then((module) => ({
    default: module.HousewifeFarmerGroups,
  }))
);
const YoungFarmerGroups = lazy(
  () => import('./pages/development/YoungFarmerGroupsDashboard')
);

const AgriTourism = lazy(() => import('./pages/development/AgriTourism'));
const DevelopmentDashboard = lazy(
  () => import('./pages/development/DevelopmentDashboard')
);

// Protection
const PestOutbreaks = lazy(() => import('./pages/protection/PestOutbreaks'));
const AiDiseaseForecast = lazy(
  () => import('./pages/protection/AiDiseaseForecast')
);
const PestCenters = lazy(() => import('./pages/protection/PestCenters'));
const PlantDoctors = lazy(() => import('./pages/protection/PlantDoctors'));
const SoilFertilizerCenters = lazy(
  () => import('./pages/protection/SoilFertilizerCenters')
);
const SoilSeries = lazy(() => import('./pages/protection/SoilSeries'));
const FireHotspots = lazy(() => import('./pages/protection/FireHotspots'));
const ProtectionDashboard = lazy(
  () => import('./pages/protection/ProtectionDashboard')
);

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <PageSkeleton />;
  if (!isAdmin()) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicAdminReadRoute({ children }) {
  const { role, loading } = useAuth();
  if (loading) return <PageSkeleton />;
  if (
    role === 'guest' ||
    role === 'admin' ||
    role === 'viewer' ||
    role === 'editor'
  )
    return children;
  return <Navigate to="/dashboard" replace />;
}

function DataRequestRoute({ children }) {
  const { role, loading } = useAuth();
  if (loading) return <PageSkeleton />;
  if (!['admin', 'editor'].includes(role))
    return <Navigate to="/dashboard" replace />;
  return children;
}

function NonGuestRoute({ children }) {
  const { role, loading } = useAuth();
  if (loading) return <PageSkeleton />;
  if (role === 'guest') return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicLandingChatbot() {
  const location = useLocation();
  const isPublicRoute =
    location.pathname === '/' ||
    location.pathname === '/interactive-dashboard' ||
    location.pathname === '/smart-map' ||
    location.pathname.startsWith('/public/');

  return isPublicRoute ? <LandingChatbot /> : null;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" description="กำลังโหลด..." />
      </div>
    );
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        {/* Landing Page — PUBLIC */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/manual" element={<Manual />} />
        <Route path="/manual/:slug" element={<ManualArticle />} />
        <Route path="/bmc" element={<Bmc />} />

        {/* Interactive Dashboard — PUBLIC */}
        <Route
          path="/interactive-dashboard"
          element={<InteractiveDashboard />}
        />

        {/* Smart Map — PUBLIC */}
        <Route path="/smart-map" element={<SmartMap />} />

        {/* ===== PUBLIC VIEW PAGES (ไม่ต้อง Login) ===== */}
        {[
          { path: '/public/large-plots', Component: LargePlots },
          { path: '/public/smart-farmers', Component: SmartFarmers },
          { path: '/public/smart-farmer-sf', Component: SmartFarmerSf },
          {
            path: '/public/young-smart-farmer-ysf',
            Component: YoungSmartFarmerYsf,
          },
          {
            path: '/public/agricultural-career-groups',
            Component: AgriculturalCareerGroups,
          },
          { path: '/public/young-farmer-groups', Component: YoungFarmerGroups },
          {
            path: '/public/community-enterprises',
            Component: CommunityEnterprises,
          },
          { path: '/public/agri-tourism', Component: AgriTourism },

          { path: '/public/agricultural-areas', Component: AgriculturalAreas },
          {
            path: '/public/agricultural-prices',
            Component: AgriculturalPrices,
          },
          { path: '/public/disease-forecast', Component: AiDiseaseForecast },
          { path: '/public/fire-hotspots', Component: FireHotspots },
          // eslint-disable-next-line no-unused-vars
        ].map(({ path, Component }) => (
          <Route
            key={path}
            path={path}
            element={
              <div
                style={{
                  padding: '20px 24px',
                  maxWidth: 1400,
                  margin: '0 auto',
                  minHeight: '100vh',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <a
                    href="/"
                    style={{
                      color: '#1a7f37',
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: 16,
                    }}
                  >
                    ← กลับหน้าหลัก
                  </a>
                </div>
                <Component />
              </div>
            }
          />
        ))}

        {/* Login page */}
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <Login />}
        />

        {/* Admin area — PROTECTED */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route
            path="situation-room"
            element={
              <NonGuestRoute>
                <SituationRoom />
              </NonGuestRoute>
            }
          />
          <Route
            path="chatbot"
            element={
              <NonGuestRoute>
                <Chatbot />
              </NonGuestRoute>
            }
          />
          <Route path="search" element={<SearchResults />} />
          <Route
            path="data-requests"
            element={
              <DataRequestRoute>
                <DataRequests />
              </DataRequestRoute>
            }
          />
          <Route
            path="test-form"
            element={<Navigate to="/dashboard/data-requests" replace />}
          />

          {/* Community */}
          <Route path="community/forum" element={<FarmerForum />} />

          {/* Admin */}
          <Route
            path="admin/overview"
            element={
              <PublicAdminReadRoute>
                <AdminDashboard />
              </PublicAdminReadRoute>
            }
          />
          <Route
            path="admin/personnel"
            element={
              <PublicAdminReadRoute>
                <Personnel />
              </PublicAdminReadRoute>
            }
          />
          <Route
            path="admin/assets"
            element={
              <PublicAdminReadRoute>
                <Assets />
              </PublicAdminReadRoute>
            }
          />
          <Route
            path="admin/budgets"
            element={
              <PublicAdminReadRoute>
                <Budgets />
              </PublicAdminReadRoute>
            }
          />

          {/* Admin-only: User Management & Audit Log */}
          <Route
            path="admin/users"
            element={
              <AdminRoute>
                <UserManagement />
              </AdminRoute>
            }
          />
          <Route
            path="admin/data-quality"
            element={
              <AdminRoute>
                <DataQuality />
              </AdminRoute>
            }
          />
          <Route
            path="admin/audit-log"
            element={
              <AdminRoute>
                <AuditLog />
              </AdminRoute>
            }
          />
          <Route
            path="admin/recent-activities"
            element={
              <AdminRoute>
                <RecentActivities />
              </AdminRoute>
            }
          />
          <Route
            path="admin/visitors"
            element={
              <AdminRoute>
                <VisitorAnalytics />
              </AdminRoute>
            }
          />
          <Route
            path="admin/website-evaluations"
            element={
              <AdminRoute>
                <WebsiteEvaluations />
              </AdminRoute>
            }
          />

          {/* Strategy */}
          <Route path="strategy/overview" element={<StrategyDashboard />} />
          <Route path="strategy/farmer-registry" element={<FarmerRegistry />} />
          <Route
            path="strategy/parcel-drawing-progress"
            element={<ParcelDrawingProgress />}
          />
          <Route
            path="strategy/agricultural-areas"
            element={<AgriculturalAreas />}
          />
          <Route
            path="strategy/agricultural-prices"
            element={<AgriculturalPrices />}
          />
          <Route
            path="strategy/learning-centers"
            element={<LearningCenters />}
          />
          <Route
            path="strategy/disasters"
            element={<Navigate to="/dashboard/development/disasters" replace />}
          />
          <Route path="strategy/daily-weather" element={<DailyWeather />} />

          {/* Production */}
          <Route path="production/overview" element={<ProductionDashboard />} />
          <Route path="production/large-plots" element={<LargePlots />} />
          <Route
            path="production/certifications"
            element={<Certifications />}
          />
          <Route
            path="production/crop-production"
            element={<CropProduction />}
          />
          <Route
            path="production/production-costs"
            element={<ProductionCosts />}
          />

          {/* Development */}
          <Route
            path="development/overview"
            element={<DevelopmentDashboard />}
          />
          <Route
            path="development/community-enterprises"
            element={<CommunityEnterprises />}
          />
          <Route path="development/smart-farmers" element={<SmartFarmers />} />
          <Route
            path="development/smart-farmer-sf"
            element={<SmartFarmerSf />}
          />
          <Route
            path="development/young-smart-farmer-ysf"
            element={<YoungSmartFarmerYsf />}
          />
          <Route
            path="development/agricultural-career-groups"
            element={<AgriculturalCareerGroups />}
          />
          <Route
            path="development/farmer-groups"
            element={
              <Navigate
                to="/dashboard/development/housewife-farmer-groups"
                replace
              />
            }
          />
          <Route
            path="development/housewife-farmer-groups"
            element={<HousewifeFarmerGroups />}
          />
          <Route
            path="development/young-farmer-groups"
            element={<YoungFarmerGroups />}
          />

          <Route path="development/agri-tourism" element={<AgriTourism />} />
          <Route path="development/disasters" element={<Disasters />} />

          {/* Protection */}
          <Route path="protection/overview" element={<ProtectionDashboard />} />
          <Route path="protection/pest-outbreaks" element={<PestOutbreaks />} />
          <Route
            path="protection/disease-forecast"
            element={<AiDiseaseForecast />}
          />
          <Route path="protection/pest-centers" element={<PestCenters />} />
          <Route path="protection/plant-doctors" element={<PlantDoctors />} />
          <Route
            path="protection/soil-fertilizer"
            element={<SoilFertilizerCenters />}
          />
          <Route path="protection/soil-series" element={<SoilSeries />} />
          <Route path="protection/fire-hotspots" element={<FireHotspots />} />
        </Route>

        {/* 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <PublicLandingChatbot />
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          locale={thTH}
          theme={{
            token: {
              colorPrimary: '#1a7f37',
              borderRadius: 8,
              fontFamily:
                "'IBM Plex Sans Thai', 'Inter', -apple-system, sans-serif",
            },
          }}
        >
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </ConfigProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
