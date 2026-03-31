import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import thTH from 'antd/locale/th_TH';
import ErrorBoundary from './components/ErrorBoundary';
import PageSkeleton from './components/PageSkeleton';
import AppLayout from './components/Layout/AppLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000,   // 15 นาที — ข้อมูลยังถือว่า fresh
      gcTime: 60 * 60 * 1000,      // 60 นาที — เก็บ cache ไว้ในหน่วยความจำ
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Lazy-loaded pages
const Login = lazy(() => import('./pages/Login'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Chatbot = lazy(() => import('./pages/Chatbot'));

// Admin
const Personnel = lazy(() => import('./pages/admin/Personnel'));
const Assets = lazy(() => import('./pages/admin/Assets'));
const Budgets = lazy(() => import('./pages/admin/Budgets'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const AuditLog = lazy(() => import('./pages/admin/AuditLog'));
const RecentActivities = lazy(() => import('./pages/admin/RecentActivities'));

// Strategy
const Disasters = lazy(() => import('./pages/strategy/Disasters'));
const AgriculturalAreas = lazy(() => import('./pages/strategy/AgriculturalAreas'));
const LearningCenters = lazy(() => import('./pages/strategy/LearningCenters'));
const FarmerRegistry = lazy(() => import('./pages/strategy/FarmerRegistry'));
const GisAreas = lazy(() => import('./pages/strategy/GisAreas'));
const KpiPlans = lazy(() => import('./pages/strategy/KpiPlans'));
const StrategyDashboard = lazy(() => import('./pages/strategy/StrategyDashboard'));

// Production
const LargePlots = lazy(() => import('./pages/production/LargePlots'));
const Certifications = lazy(() => import('./pages/production/Certifications'));
const CropProduction = lazy(() => import('./pages/production/CropProduction'));
const ProductionDashboard = lazy(() => import('./pages/production/ProductionDashboard'));

// Development
const CommunityEnterprises = lazy(() => import('./pages/development/CommunityEnterprises'));
const SmartFarmers = lazy(() => import('./pages/development/SmartFarmers'));
const FarmerGroups = lazy(() => import('./pages/development/FarmerGroups'));
const FarmerInstitutes = lazy(() => import('./pages/development/FarmerInstitutes'));
const AgriTourism = lazy(() => import('./pages/development/AgriTourism'));
const DevelopmentDashboard = lazy(() => import('./pages/development/DevelopmentDashboard'));

// Protection
const PestOutbreaks = lazy(() => import('./pages/protection/PestOutbreaks'));
const PestCenters = lazy(() => import('./pages/protection/PestCenters'));
const SoilFertilizerCenters = lazy(() => import('./pages/protection/SoilFertilizerCenters'));
const FireHotspots = lazy(() => import('./pages/protection/FireHotspots'));
const ProtectionDashboard = lazy(() => import('./pages/protection/ProtectionDashboard'));

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

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" description="กำลังโหลด..." />
      </div>
    );
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        {/* Landing Page — PUBLIC */}
        <Route path="/" element={<LandingPage />} />

        {/* ===== PUBLIC VIEW PAGES (ไม่ต้อง Login) ===== */}
        {[
          { path: '/public/large-plots', Component: LargePlots },
          { path: '/public/smart-farmers', Component: SmartFarmers },
          { path: '/public/community-enterprises', Component: CommunityEnterprises },
          { path: '/public/agri-tourism', Component: AgriTourism },
          { path: '/public/farmer-institutes', Component: FarmerInstitutes },
          { path: '/public/agricultural-areas', Component: AgriculturalAreas },
        ].map(({ path, Component }) => (
          <Route key={path} path={path} element={
            <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
              <div style={{ marginBottom: 16 }}>
                <a href="/" style={{ color: '#1a7f37', textDecoration: 'none', fontWeight: 600, fontSize: 16 }}>← กลับหน้าหลัก</a>
              </div>
              <Component />
            </div>
          } />
        ))}

        {/* Login page */}
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

        {/* Admin area — PROTECTED */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="chatbot" element={<Chatbot />} />

          {/* Admin */}
          <Route path="admin/overview" element={<AdminDashboard />} />
          <Route path="admin/personnel" element={<Personnel />} />
          <Route path="admin/assets" element={<Assets />} />
          <Route path="admin/budgets" element={<Budgets />} />

          {/* Admin-only: User Management & Audit Log */}
          <Route path="admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
          <Route path="admin/audit-log" element={<AdminRoute><AuditLog /></AdminRoute>} />
          <Route path="admin/recent-activities" element={<RecentActivities />} />

          {/* Strategy */}
          <Route path="strategy/overview" element={<StrategyDashboard />} />
          <Route path="strategy/farmer-registry" element={<FarmerRegistry />} />
          <Route path="strategy/gis" element={<GisAreas />} />
          <Route path="strategy/agricultural-areas" element={<AgriculturalAreas />} />
          <Route path="strategy/learning-centers" element={<LearningCenters />} />
          <Route path="strategy/kpi" element={<KpiPlans />} />
          <Route path="strategy/disasters" element={<Disasters />} />

          {/* Production */}
          <Route path="production/overview" element={<ProductionDashboard />} />
          <Route path="production/large-plots" element={<LargePlots />} />
          <Route path="production/certifications" element={<Certifications />} />
          <Route path="production/crop-production" element={<CropProduction />} />

          {/* Development */}
          <Route path="development/overview" element={<DevelopmentDashboard />} />
          <Route path="development/community-enterprises" element={<CommunityEnterprises />} />
          <Route path="development/smart-farmers" element={<SmartFarmers />} />
          <Route path="development/farmer-groups" element={<FarmerGroups />} />
          <Route path="development/farmer-institutes" element={<FarmerInstitutes />} />
          <Route path="development/agri-tourism" element={<AgriTourism />} />

          {/* Protection */}
          <Route path="protection/overview" element={<ProtectionDashboard />} />
          <Route path="protection/pest-outbreaks" element={<PestOutbreaks />} />
          <Route path="protection/pest-centers" element={<PestCenters />} />
          <Route path="protection/soil-fertilizer" element={<SoilFertilizerCenters />} />
          <Route path="protection/fire-hotspots" element={<FireHotspots />} />
        </Route>

        {/* 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
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
              fontFamily: "'IBM Plex Sans Thai', 'Inter', -apple-system, sans-serif",
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
