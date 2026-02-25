import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import thTH from 'antd/locale/th_TH';
import { supabase } from './supabaseClient';
import ErrorBoundary from './components/ErrorBoundary';
import PageSkeleton from './components/PageSkeleton';
import AppLayout from './components/Layout/AppLayout';

// Lazy-loaded pages
const Login = lazy(() => import('./pages/Login'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Admin
const Personnel = lazy(() => import('./pages/admin/Personnel'));
const Assets = lazy(() => import('./pages/admin/Assets'));
const Budgets = lazy(() => import('./pages/admin/Budgets'));

// Strategy
const FarmerRegistry = lazy(() => import('./pages/strategy/FarmerRegistry'));
const GisAreas = lazy(() => import('./pages/strategy/GisAreas'));
const Disasters = lazy(() => import('./pages/strategy/Disasters'));
const KpiPlans = lazy(() => import('./pages/strategy/KpiPlans'));

// Production
const LargePlots = lazy(() => import('./pages/production/LargePlots'));
const LearningCenters = lazy(() => import('./pages/production/LearningCenters'));
const Certifications = lazy(() => import('./pages/production/Certifications'));
const CropProduction = lazy(() => import('./pages/production/CropProduction'));

// Development
const CommunityEnterprises = lazy(() => import('./pages/development/CommunityEnterprises'));
const SmartFarmers = lazy(() => import('./pages/development/SmartFarmers'));
const FarmerGroups = lazy(() => import('./pages/development/FarmerGroups'));
const AgriTourism = lazy(() => import('./pages/development/AgriTourism'));

// Protection
const PestOutbreaks = lazy(() => import('./pages/protection/PestOutbreaks'));
const PestCenters = lazy(() => import('./pages/protection/PestCenters'));
const BiocontrolStock = lazy(() => import('./pages/protection/BiocontrolStock'));
const FireHotspots = lazy(() => import('./pages/protection/FireHotspots'));

function ProtectedRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="กำลังโหลด..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
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
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              {/* Landing Page — PUBLIC */}
              <Route path="/" element={<LandingPage />} />

              {/* Login page */}
              <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

              {/* Admin area — PROTECTED */}
              <Route path="/dashboard" element={
                <ProtectedRoute user={user}>
                  <AppLayout user={user} />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />

                {/* Admin */}
                <Route path="admin/personnel" element={<Personnel />} />
                <Route path="admin/assets" element={<Assets />} />
                <Route path="admin/budgets" element={<Budgets />} />

                {/* Strategy */}
                <Route path="strategy/farmer-registry" element={<FarmerRegistry />} />
                <Route path="strategy/gis" element={<GisAreas />} />
                <Route path="strategy/disasters" element={<Disasters />} />
                <Route path="strategy/kpi" element={<KpiPlans />} />

                {/* Production */}
                <Route path="production/large-plots" element={<LargePlots />} />
                <Route path="production/learning-centers" element={<LearningCenters />} />
                <Route path="production/certifications" element={<Certifications />} />
                <Route path="production/crop-production" element={<CropProduction />} />

                {/* Development */}
                <Route path="development/community-enterprises" element={<CommunityEnterprises />} />
                <Route path="development/smart-farmers" element={<SmartFarmers />} />
                <Route path="development/farmer-groups" element={<FarmerGroups />} />
                <Route path="development/agri-tourism" element={<AgriTourism />} />

                {/* Protection */}
                <Route path="protection/pest-outbreaks" element={<PestOutbreaks />} />
                <Route path="protection/pest-centers" element={<PestCenters />} />
                <Route path="protection/biocontrol" element={<BiocontrolStock />} />
                <Route path="protection/fire-hotspots" element={<FireHotspots />} />
              </Route>

              {/* 404 Not Found */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ConfigProvider>
    </ErrorBoundary>
  );
}
