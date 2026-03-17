import React, { useState } from 'react';
import { Layout, Menu, Drawer } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    DashboardOutlined,
    TeamOutlined,
    CarOutlined,
    DollarOutlined,
    FileTextOutlined,
    GlobalOutlined,
    ThunderboltOutlined,
    AimOutlined,
    BankOutlined,
    SafetyCertificateOutlined,
    BarChartOutlined,
    ShopOutlined,
    UserSwitchOutlined,
    UsergroupAddOutlined,
    EnvironmentOutlined,
    BugOutlined,
    MedicineBoxOutlined,
    ExperimentOutlined,
    FireOutlined,
    LogoutOutlined,
    HomeOutlined,
    HistoryOutlined,
    PieChartOutlined,
} from '@ant-design/icons';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

const { Sider } = Layout;

// กลุ่มงาน → group key สำหรับกรองตาม department
const GROUP_KEYS = {
    'ฝ่ายบริหารทั่วไป': 'admin',
    'กลุ่มยุทธศาสตร์และสารสนเทศ': 'strategy',
    'กลุ่มส่งเสริมและพัฒนาการผลิต': 'production',
    'กลุ่มส่งเสริมและพัฒนาเกษตรกร': 'development',
    'กลุ่มอารักขาพืช': 'protection',
};

// เมนูทั้งหมด (พร้อม group key)
const allMenuItems = [
    {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: 'แดชบอร์ดรวม',
    },
    {
        key: 'admin',
        group: 'admin',
        icon: <TeamOutlined />,
        label: 'ฝ่ายบริหารทั่วไป',
        children: [
            { key: '/dashboard/admin/overview', icon: <PieChartOutlined />, label: 'Dashboard กลุ่ม' },
            { key: '/dashboard/admin/personnel', icon: <TeamOutlined />, label: 'ข้อมูลบุคลากร' },
            { key: '/dashboard/admin/assets', icon: <CarOutlined />, label: 'พัสดุ/ครุภัณฑ์' },
            { key: '/dashboard/admin/budgets', icon: <DollarOutlined />, label: 'งบประมาณ' },
        ],
    },
    {
        key: 'strategy',
        group: 'strategy',
        icon: <AimOutlined />,
        label: 'ยุทธศาสตร์ฯ',
        children: [
            { key: '/dashboard/strategy/overview', icon: <PieChartOutlined />, label: 'Dashboard กลุ่ม' },
            { key: '/dashboard/strategy/farmer-registry', icon: <FileTextOutlined />, label: 'ทะเบียนเกษตรกร' },
            { key: '/dashboard/strategy/gis', icon: <GlobalOutlined />, label: 'พิกัด GIS' },
            { key: '/dashboard/strategy/disasters', icon: <ThunderboltOutlined />, label: 'ภัยพิบัติ' },
            { key: '/dashboard/strategy/kpi', icon: <AimOutlined />, label: 'แผน/KPI' },
        ],
    },
    {
        key: 'production',
        group: 'production',
        icon: <BankOutlined />,
        label: 'ส่งเสริมการผลิต',
        children: [
            { key: '/dashboard/production/overview', icon: <PieChartOutlined />, label: 'Dashboard กลุ่ม' },
            { key: '/dashboard/production/large-plots', icon: <BankOutlined />, label: 'แปลงใหญ่' },
            { key: '/dashboard/production/learning-centers', icon: <BankOutlined />, label: 'ศพก.' },
            { key: '/dashboard/production/certifications', icon: <SafetyCertificateOutlined />, label: 'มาตรฐาน GAP' },
            { key: '/dashboard/production/crop-production', icon: <BarChartOutlined />, label: 'ผลผลิตพืช' },
        ],
    },
    {
        key: 'development',
        group: 'development',
        icon: <ShopOutlined />,
        label: 'ส่งเสริมเกษตรกร',
        children: [
            { key: '/dashboard/development/overview', icon: <PieChartOutlined />, label: 'Dashboard กลุ่ม' },
            { key: '/dashboard/development/community-enterprises', icon: <ShopOutlined />, label: 'วิสาหกิจชุมชน' },
            { key: '/dashboard/development/smart-farmers', icon: <UserSwitchOutlined />, label: 'เกษตรกรรุ่นใหม่' },
            { key: '/dashboard/development/farmer-groups', icon: <UsergroupAddOutlined />, label: 'กลุ่มแม่บ้าน/ยุวฯ' },
            { key: '/dashboard/development/agri-tourism', icon: <EnvironmentOutlined />, label: 'ท่องเที่ยวเกษตร' },
        ],
    },
    {
        key: 'protection',
        group: 'protection',
        icon: <BugOutlined />,
        label: 'อารักขาพืช',
        children: [
            { key: '/dashboard/protection/overview', icon: <PieChartOutlined />, label: 'Dashboard กลุ่ม' },
            { key: '/dashboard/protection/pest-outbreaks', icon: <BugOutlined />, label: 'แปลงพยากรณ์' },
            { key: '/dashboard/protection/pest-centers', icon: <MedicineBoxOutlined />, label: 'ศจช.' },
            { key: '/dashboard/protection/biocontrol', icon: <ExperimentOutlined />, label: 'ชีวภัณฑ์' },
            { key: '/dashboard/protection/fire-hotspots', icon: <FireOutlined />, label: 'จุดเฝ้าระวัง PM2.5' },
        ],
    },
];

// เมนูสำหรับ admin เท่านั้น
const adminOnlyItems = [
    { type: 'divider' },
    {
        key: 'system',
        icon: <SafetyCertificateOutlined />,
        label: 'ระบบ',
        children: [
            { key: '/dashboard/admin/users', icon: <TeamOutlined />, label: 'จัดการสิทธิ์ผู้ใช้' },
            { key: '/dashboard/admin/audit-log', icon: <HistoryOutlined />, label: 'ประวัติการแก้ไข' },
        ],
    },
];

function getFilteredMenuItems(role, department) {
    // Admin เห็นทุกเมนู
    if (role === 'admin') {
        return [...allMenuItems, ...adminOnlyItems];
    }

    // editor/viewer เห็นเฉพาะ Dashboard รวม + กลุ่มงานตัวเอง
    const userGroup = department ? GROUP_KEYS[department] : null;
    const filtered = allMenuItems.filter(item => {
        // Dashboard รวม เห็นเสมอ
        if (item.key === '/dashboard') return true;
        // กลุ่มงานของตัวเอง
        if (item.group && item.group === userGroup) return true;
        // ไม่มีกลุ่มงานก็เห็นทุกกลุ่ม (fallback)
        if (!userGroup && item.group) return true;
        return false;
    });
    return filtered;
}

const bottomMenuItems = [
    { key: 'home', icon: <HomeOutlined />, label: 'กลับหน้าหลัก' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'ออกจากระบบ', danger: true },
];

function SidebarContent({ user, onMenuClick, location, menuItems }) {
    const openKeys = menuItems
        .filter(item => item.children)
        .filter(item => item.children.some(child => location.pathname.startsWith(child.key)))
        .map(item => item.key);

    return (
        <>
            <div className="sidebar-header">
                <div className="sidebar-brand">
                    <span className="brand-icon">🌾</span>
                    <div>
                        <div>สนง.เกษตรจังหวัด</div>
                        <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.6 }}>นครปฐม</div>
                    </div>
                </div>
            </div>

            <Menu
                mode="inline"
                selectedKeys={[location.pathname]}
                defaultOpenKeys={openKeys}
                items={menuItems}
                onClick={onMenuClick}
            />

            <div className="sidebar-bottom-menu">
                <Menu
                    mode="inline"
                    selectable={false}
                    items={bottomMenuItems}
                    onClick={({ key }) => onMenuClick({ key })}
                    style={{ background: 'transparent', border: 'none' }}
                />
            </div>
        </>
    );
}

export default function Sidebar({ user, mobileOpen, onMobileClose }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { role, department } = useAuth();
    const [collapsed, setCollapsed] = useState(false);

    const menuItems = getFilteredMenuItems(role, department);

    const handleMenuClick = async ({ key }) => {
        if (key === 'logout') {
            await supabase.auth.signOut();
            navigate('/');
        } else if (key === 'home') {
            navigate('/');
        } else {
            navigate(key);
        }
        if (onMobileClose) onMobileClose();
    };

    return (
        <>
            {/* Desktop Sidebar */}
            <Sider
                className="sidebar sidebar-desktop"
                width={260}
                collapsible
                collapsed={collapsed}
                onCollapse={setCollapsed}
                breakpoint="lg"
                trigger={null}
            >
                {collapsed ? (
                    <div className="sidebar-header">
                        <div style={{ textAlign: 'center', fontSize: 28 }}>🌾</div>
                    </div>
                ) : null}
                {!collapsed && (
                    <SidebarContent
                        user={user}
                        onMenuClick={handleMenuClick}
                        location={location}
                        menuItems={menuItems}
                    />
                )}
                {collapsed && (
                    <>
                        <Menu
                            mode="inline"
                            selectedKeys={[location.pathname]}
                            items={menuItems}
                            onClick={handleMenuClick}
                        />
                    </>
                )}
            </Sider>

            {/* Mobile Drawer */}
            <Drawer
                placement="left"
                open={mobileOpen}
                onClose={onMobileClose}
                width={280}
                className="mobile-sidebar-drawer"
                styles={{ body: { padding: 0, background: '#0d1117' } }}
            >
                <SidebarContent
                    user={user}
                    onMenuClick={handleMenuClick}
                    location={location}
                    menuItems={menuItems}
                />
            </Drawer>
        </>
    );
}
