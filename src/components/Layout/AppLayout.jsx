import { useState, useEffect } from 'react';
import { Layout, Avatar, Dropdown, Button, Breadcrumb, Tag } from 'antd';
import {
    UserOutlined, LogoutOutlined, LoginOutlined,
    MenuOutlined, HomeOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { supabase } from '../../supabaseClient';
import { useSessionTimeout } from '../../hooks/useSessionTimeout.jsx';
import { useAuth } from '../../contexts/AuthContext';

const { Header, Content } = Layout;

const ROLE_BADGE = {
    admin: { label: 'Admin', color: '#cf222e' },
    editor: { label: 'Editor', color: '#0969da' },
    viewer: { label: 'Viewer', color: '#8b949e' },
};

// Route → Thai label mapping
const routeLabels = {
    dashboard: 'แดชบอร์ด',
    'situation-room': 'Executive Situation Room',
    admin: 'ฝ่ายบริหารทั่วไป',
    personnel: 'ข้อมูลบุคลากร',
    assets: 'พัสดุ/ครุภัณฑ์',
    budgets: 'งบประมาณ',
    users: 'จัดการสิทธิ์ผู้ใช้',
    'audit-log': 'ประวัติการแก้ไข',
    'recent-activities': 'กิจกรรมล่าสุดทั้งหมด',
    overview: 'Dashboard กลุ่ม',
    strategy: 'ยุทธศาสตร์ฯ',
    'farmer-registry': 'ทะเบียนเกษตรกร',
    disasters: 'ภัยพิบัติ',
    production: 'ส่งเสริมการผลิต',
    'large-plots': 'แปลงใหญ่',
    'learning-centers': 'ศพก.',
    certifications: 'มาตรฐาน GAP',
    'crop-production': 'ผลผลิตพืช',
    development: 'ส่งเสริมเกษตรกร',
    'community-enterprises': 'วิสาหกิจชุมชน',
    'smart-farmers': 'เกษตรกรรุ่นใหม่',
    'farmer-groups': 'กลุ่มแม่บ้าน/ยุวฯ',
    'housewife-farmer-groups': 'กลุ่มแม่บ้านเกษตรกร',
    'young-farmer-groups': 'กลุ่มยุวเกษตรกร',
    'agri-tourism': 'ท่องเที่ยวเกษตร',
    protection: 'อารักขาพืช',
    'pest-outbreaks': 'แปลงพยากรณ์',
    'pest-centers': 'ศจช.',
    biocontrol: 'ชีวภัณฑ์',
    'fire-hotspots': 'จุดเฝ้าระวัง PM2.5',
};

function buildBreadcrumbs(pathname) {
    const segments = pathname.split('/').filter(Boolean);
    const items = [{ title: <Link to="/dashboard"><HomeOutlined /> แดชบอร์ด</Link> }];

    if (segments.length <= 1) return items; // dashboard root

    for (let i = 1; i < segments.length; i++) {
        const seg = segments[i];
        const label = routeLabels[seg] || seg;

        if (i === segments.length - 1) {
            items.push({ title: label });
        } else {
            items.push({ title: label });
        }
    }

    return items;
}

export default function AppLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const { WarningModal } = useSessionTimeout();
    const { user, role, profile } = useAuth();

    // ปิด sidebar เมื่อเปลี่ยนหน้า (มือถือ)
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMobileOpen(prev => prev ? false : prev);
    }, [location.pathname]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const breadcrumbItems = buildBreadcrumbs(location.pathname);
    const roleBadge = ROLE_BADGE[role] || ROLE_BADGE.viewer;

    const userMenuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'โปรไฟล์',
        },
        { type: 'divider' },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'ออกจากระบบ',
            danger: true,
            onClick: handleLogout,
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar
                user={user}
                mobileOpen={mobileOpen}
                onMobileClose={() => setMobileOpen(false)}
            />
            <Layout>
                <Header className="app-header">
                    <div className="header-left">
                        <Button
                            className="mobile-menu-btn"
                            type="text"
                            icon={<MenuOutlined />}
                            onClick={() => setMobileOpen(true)}
                        />
                        <div className="header-breadcrumb">
                            <Breadcrumb items={breadcrumbItems} />
                        </div>
                    </div>
                    <div className="header-right">
                        {user ? (
                            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                                <div className="user-info">
                                    <Avatar size={34} icon={<UserOutlined />} style={{ backgroundColor: '#1a7f37' }} />
                                    <div className="user-info-text">
                                        <div className="user-name">
                                            {profile?.full_name || user?.email || 'เจ้าหน้าที่'}
                                            <Tag
                                                color={roleBadge.color}
                                                style={{ marginLeft: 6, fontSize: 10, lineHeight: '16px', padding: '0 6px' }}
                                            >
                                                {roleBadge.label}
                                            </Tag>
                                        </div>
                                        <div className="user-group">
                                            {profile?.department || 'เกษตรจังหวัดนครปฐม'}
                                        </div>
                                    </div>
                                </div>
                            </Dropdown>
                        ) : (
                            <Button
                                type="primary"
                                icon={<LoginOutlined />}
                                onClick={() => navigate('/login')}
                                className="add-btn"
                            >
                                เข้าสู่ระบบ
                            </Button>
                        )}
                    </div>
                </Header>
                <Content className="content-area">
                    <Outlet />
                </Content>
            </Layout>
            <WarningModal />
        </Layout>
    );
}
