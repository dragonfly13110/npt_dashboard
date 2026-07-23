/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  clearGuestSession,
  createGuestSession,
  getGuestSession,
} from '../services/guestSessionService';
import {
  canDistrictEditorWriteTable,
  canGroupAccessTable,
  canGuestAccessGroup,
  canGuestAccessTable,
  getDepartmentGroupKey,
} from '../domain/datasetCatalog';

const AuthContext = createContext(null);

// กลุ่มงาน → group key mapping
const DEPARTMENT_GROUP_MAP = {
  ฝ่ายบริหารทั่วไป: 'admin',
  กลุ่มยุทธศาสตร์และสารสนเทศ: 'strategy',
  กลุ่มส่งเสริมและพัฒนาการผลิต: 'production',
  กลุ่มส่งเสริมและพัฒนาเกษตรกร: 'development',
  กลุ่มอารักขาพืช: 'protection',
};

// group key → tables ที่อยู่ในกลุ่ม
const GROUP_TABLES = {
  admin: ['personnel', 'assets', 'budgets'],
  strategy: [
    'farmer_registry',
    'tbk_cultivation_snapshots',
    'agricultural_areas',
    'learning_centers',
    'disasters',
    'daily_weather',
  ],
  production: [
    'large_plots',
    'learning_centers',
    'certifications',
    'crop_production',
    'production_costs',
  ],
  development: [
    'community_enterprises',
    'smart_farmers',
    'smart_farmer_sf',
    'young_smart_farmer_ysf',
    'agricultural_career_groups',
    'farmer_groups',
    'housewife_farmer_groups',
    'young_farmer_groups',
    'young_farmer_groups_detailed',
    'farmer_institutes',
    'agri_tourism',
    'disasters',
  ],
  protection: [
    'forecast_plots',
    'pest_outbreaks',
    'pest_centers',
    'plant_doctors',
    'soil_fertilizer_centers',
    'biocontrol_stock',
    'fire_hotspots',
  ],
  community: ['forum_posts', 'forum_comments'],
};

const PUBLIC_READ_GROUPS = [
  'admin',
  'strategy',
  'production',
  'development',
  'protection',
  'community',
];
const PUBLIC_READ_TABLES = [
  ...new Set([
    ...Object.values(GROUP_TABLES).flat(),
    'agricultural_areas',
    'learning_centers',
    'pest_outbreaks',
    'soil_fertilizer_centers',
    'farmer_institutes',
    'daily_weather',
    'site_statistics',
    'forum_posts',
    'forum_comments',
  ]),
];

const DISTRICT_WRITE_TABLES = ['personnel', 'budgets'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ดึง profile จากตาราง profiles
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) {
        // JWT หมดอายุ → sign out แล้วเคลียร์ session
        if (
          error.code === 'PGRST303' ||
          error.message?.includes('JWT expired')
        ) {
          console.warn('[Auth] JWT expired — signing out stale session');
          await clearGuestSession();
          await supabase.auth.signOut({ scope: 'local' });
          setUser(null);
          setProfile(null);
          return;
        }
        throw error;
      }
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      // ถ้ายังไม่มี profile ให้ set default
      setProfile({ role: 'viewer', department: null });
    }
  };

  const loginAsGuest = async () => {
    await createGuestSession();
    setUser({ id: 'guest', email: 'guest@example.com' });
    setProfile({ role: 'guest', department: null });
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          console.warn('[Auth] getSession error:', error.message);
          await clearGuestSession();
          await supabase.auth.signOut({ scope: 'local' });
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        const u = session?.user ?? null;
        if (u) {
          await clearGuestSession();
          setUser(u);
          await fetchProfile(u.id);
          setLoading(false);
          return;
        }

        const guestSession = await getGuestSession();
        if (guestSession) {
          setUser({ id: 'guest', email: 'guest@example.com' });
          setProfile({ role: 'guest', department: null });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.warn('[Auth] initAuth failed, clearing session:', err);
        await clearGuestSession();
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id);
      } else {
        setProfile(null);
        try {
          localStorage.removeItem('npt_dashboard_chatbot_messages_v1');
        } catch (e) {}
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Helper functions
  const role = user ? profile?.role || 'viewer' : 'guest';
  const department = profile?.department || null;
  const groupKey = getDepartmentGroupKey(department);

  const isAdmin = () => role === 'admin';
  const isDistrictEditor = () => role === 'district_editor';
  const canEdit = (tableName = null) => {
    if (role === 'admin') return true;
    if (!tableName) return role === 'editor' || isDistrictEditor();
    if (isDistrictEditor()) return canDistrictEditorWriteTable(tableName);
    if (role !== 'editor' || !groupKey) return false;
    return canGroupAccessTable(groupKey, tableName);
  };
  const canDelete = () => role === 'admin';

  // ตรวจสอบว่าผู้ใช้สามารถเข้าถึงกลุ่มงานนี้ได้หรือไม่
  const canAccessGroup = (targetGroup) => {
    if (role === 'admin') return true;
    if (role === 'editor' || isDistrictEditor()) return true;
    if (role === 'guest') return canGuestAccessGroup(targetGroup);
    return groupKey === targetGroup;
  };

  // ตรวจสอบว่าผู้ใช้สามารถเข้าถึงตารางนี้ได้หรือไม่
  const canAccessTable = (tableName) => {
    if (role === 'admin') return true;
    if (role === 'editor' || isDistrictEditor()) return true;
    if (role === 'guest') return canGuestAccessTable(tableName);
    if (!groupKey) return false;
    return canGroupAccessTable(groupKey, tableName);
  };

  const value = {
    user,
    profile,
    loading,
    role,
    department,
    groupKey,
    isAdmin,
    canEdit,
    canDelete,
    canAccessGroup,
    canAccessTable,
    refreshProfile: () => user && fetchProfile(user.id),
    loginAsGuest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export { DEPARTMENT_GROUP_MAP, GROUP_TABLES };
