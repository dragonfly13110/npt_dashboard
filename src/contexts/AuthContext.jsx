/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

// กลุ่มงาน → group key mapping
const DEPARTMENT_GROUP_MAP = {
    'ฝ่ายบริหารทั่วไป': 'admin',
    'กลุ่มยุทธศาสตร์และสารสนเทศ': 'strategy',
    'กลุ่มส่งเสริมและพัฒนาการผลิต': 'production',
    'กลุ่มส่งเสริมและพัฒนาเกษตรกร': 'development',
    'กลุ่มอารักขาพืช': 'protection',
};

// group key → tables ที่อยู่ในกลุ่ม
const GROUP_TABLES = {
    admin: ['personnel', 'assets', 'budgets'],
    strategy: ['farmer_registry', 'gis_areas', 'disasters', 'kpi_plans'],
    production: ['large_plots', 'learning_centers', 'certifications', 'crop_production'],
    development: ['community_enterprises', 'smart_farmers', 'farmer_groups', 'agri_tourism'],
    protection: ['forecast_plots', 'pest_centers', 'biocontrol_stock', 'fire_hotspots'],
};

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
                if (error.code === 'PGRST303' || error.message?.includes('JWT expired')) {
                    console.warn('[Auth] JWT expired — signing out stale session');
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

    const loginAsGuest = () => {
        localStorage.setItem('guestMode', 'true');
        setUser({ id: 'guest', email: 'guest@example.com' });
        setProfile({ role: 'guest', department: null });
    };

    useEffect(() => {
        const checkGuestMode = () => {
             return localStorage.getItem('guestMode') === 'true';
        };

        const initAuth = async () => {
            if (checkGuestMode()) {
                setUser({ id: 'guest', email: 'guest@example.com' });
                setProfile({ role: 'guest', department: null });
                setLoading(false);
                return;
            }

            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.warn('[Auth] getSession error:', error.message);
                    await supabase.auth.signOut({ scope: 'local' });
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                    return;
                }
                const u = session?.user ?? null;
                setUser(u);
                if (u) {
                    await fetchProfile(u.id);
                }
            } catch (err) {
                console.warn('[Auth] initAuth failed, clearing session:', err);
                await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
                setUser(null);
                setProfile(null);
            }
            setLoading(false);
        };
        
        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (checkGuestMode()) return;
            const u = session?.user ?? null;
            setUser(u);
            if (u) {
                fetchProfile(u.id);
            } else {
                setProfile(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Helper functions
    const role = profile?.role || 'viewer';
    const department = profile?.department || null;
    const groupKey = department ? DEPARTMENT_GROUP_MAP[department] : null;

    const isAdmin = () => role === 'admin';
    const canEdit = () => role === 'admin' || role === 'editor';
    const canDelete = () => role === 'admin';

    // ตรวจสอบว่าผู้ใช้สามารถเข้าถึงกลุ่มงานนี้ได้หรือไม่
    const canAccessGroup = (targetGroup) => {
        if (role === 'admin' || role === 'guest') return true;
        return groupKey === targetGroup;
    };

    // ตรวจสอบว่าผู้ใช้สามารถเข้าถึงตารางนี้ได้หรือไม่
    const canAccessTable = (tableName) => {
        if (role === 'admin' || role === 'guest') return true;
        if (!groupKey) return false;
        return GROUP_TABLES[groupKey]?.includes(tableName) || false;
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

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}

export { DEPARTMENT_GROUP_MAP, GROUP_TABLES };
