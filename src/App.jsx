import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import thTH from 'antd/locale/th_TH';
import { supabase } from './supabaseClient';
import AppLayout from './components/Layout/AppLayout';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';

// Admin
import Personnel from './pages/admin/Personnel';
import Assets from './pages/admin/Assets';
import Budgets from './pages/admin/Budgets';

// Strategy
import FarmerRegistry from './pages/strategy/FarmerRegistry';
import GisAreas from './pages/strategy/GisAreas';
import Disasters from './pages/strategy/Disasters';
import KpiPlans from './pages/strategy/KpiPlans';

// Production
import LargePlots from './pages/production/LargePlots';
import LearningCenters from './pages/production/LearningCenters';
import Certifications from './pages/production/Certifications';
import CropProduction from './pages/production/CropProduction';

// Development
import CommunityEnterprises from './pages/development/CommunityEnterprises';
import SmartFarmers from './pages/development/SmartFarmers';
import FarmerGroups from './pages/development/FarmerGroups';
import AgriTourism from './pages/development/AgriTourism';

// Protection
import PestOutbreaks from './pages/protection/PestOutbreaks';
import PestCenters from './pages/protection/PestCenters';
import BiocontrolStock from './pages/protection/BiocontrolStock';
import FireHotspots from './pages/protection/FireHotspots';

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
        <Routes>
          {/* Landing Page — PUBLIC (ไม่ต้อง login, ไม่มี sidebar) */}
          <Route path="/" element={<LandingPage />} />

          {/* Login page */}
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

          {/* Admin area — PROTECTED (ต้อง login, มี sidebar) */}
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
