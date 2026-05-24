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
    RobotOutlined,
    HomeOutlined,
    HistoryOutlined,
    PieChartOutlined,
    CommentOutlined,
    CloudOutlined,
    FormOutlined,
    FileExcelOutlined,
} from '@ant-design/icons';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import GlobalSearch from '../Search/GlobalSearch';

const { Sider } = Layout;

// กลุ่มงาน → group key สำหรับกรองตาม department
const GROUP_KEYS = {
    'ฝ่ายบริหารทั่วไป': 'admin',
    'กลุ่มยุทธศาสตร์และสารสนเทศ': 'strategy',
    'กลุ่มส่งเสริมและพัฒนาการผลิต': 'production',
    'กลุ่มส่งเสริมและพัฒนาเกษตรกร': 'development',
    'กลุ่มอารักขาพืช': 'protection',
    'ชุมชนเกษตรกร': 'community',
};

// เมนูทั้งหมด (พร้อม group key)
const allMenuItems = [
    {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: 'แดชบอร์ดรวม',
    },
    {
        key: '/dashboard/chatbot',
        icon: <RobotOutlined />,
        label: 'Chatbot ผู้ช่วย AI',
    },

    {
        key: '/dashboard/data-requests',
        icon: <FormOutlined />,
        label: 'คำขอข้อมูล',
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
            { key: '/dashboard/strategy/agricultural-areas', icon: <EnvironmentOutlined />, label: 'พื้นที่การเกษตร' },
            { key: '/dashboard/strategy/learning-centers', icon: <BankOutlined />, label: 'ศพก.' },
            { key: '/dashboard/strategy/daily-weather', icon: <CloudOutlined />, label: 'สภาพอากาศ/น้ำฝน' },
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
            { key: '/dashboard/production/certifications', icon: <SafetyCertificateOutlined />, label: 'มาตรฐาน GAP' },
            { key: '/dashboard/production/crop-production', icon: <BarChartOutlined />, label: 'ผลผลิตพืช' },
            { key: '/dashboard/production/coconut-aromatic-survey', icon: <FileExcelOutlined />, label: 'แบบเก็บมะพร้าวน้ำหอม' },
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
            { key: '/dashboard/development/smart-farmer-sf', icon: <UserSwitchOutlined />, label: 'เกษตรกรปราดเปรื่อง (SF)' },
            { key: '/dashboard/development/young-smart-farmer-ysf', icon: <UserSwitchOutlined />, label: 'เกษตรกรรุ่นใหม่ (YSF)' },
            { key: '/dashboard/development/agricultural-career-groups', icon: <UsergroupAddOutlined />, label: 'กลุ่มส่งเสริมอาชีพการเกษตร' },
            { key: '/dashboard/development/housewife-farmer-groups', icon: <UsergroupAddOutlined />, label: 'กลุ่มแม่บ้านเกษตรกร' },
            { key: '/dashboard/development/young-farmer-groups', icon: <UsergroupAddOutlined />, label: 'กลุ่มยุวเกษตรกร' },
            { key: '/dashboard/development/farmer-institutes', icon: <UsergroupAddOutlined />, label: 'สถาบันเกษตรกร (รวม)' },
            { key: '/dashboard/development/agri-tourism', icon: <EnvironmentOutlined />, label: 'ท่องเที่ยวเกษตร' },
            { key: '/dashboard/development/disasters', icon: <ThunderboltOutlined />, label: 'ภัยพิบัติ' },
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
            { key: '/dashboard/protection/soil-fertilizer', icon: <ExperimentOutlined />, label: 'ศดปช.' },
            { key: '/dashboard/protection/fire-hotspots', icon: <FireOutlined />, label: 'จุด Hotspot (GISTDA)' },
        ],
    },
    {
        key: '/dashboard/community/forum',
        icon: <CommentOutlined />,
        label: 'กระดานข่าว (Forum)',
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
            { key: '/dashboard/admin/recent-activities', icon: <HistoryOutlined />, label: 'กิจกรรมล่าสุดทั้งหมด' },
        ],
    },
];

const PUBLIC_GUEST_GROUPS = ['admin'];

function getFilteredMenuItems(role, department) {
    // Admin เห็นทุกเมนู
    if (role === 'admin') {
        return [...allMenuItems, ...adminOnlyItems];
    }

    // editor/viewer เห็นเฉพาะ Dashboard รวม + กลุ่มงานตัวเอง
    const userGroup = department ? GROUP_KEYS[department] : null;
    const filtered = allMenuItems.filter(item => {
        if (role === 'guest' && ['/dashboard/chatbot', '/dashboard/data-requests'].includes(item.key)) return false;
        // เมนูเบื้องต้นที่ทุกคนเห็นเสมอ
        if (['/dashboard', '/dashboard/chatbot', '/dashboard/data-requests', '/dashboard/community/forum'].includes(item.key)) return true;
        if (role === 'guest' && item.group) return PUBLIC_GUEST_GROUPS.includes(item.group);
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

// eslint-disable-next-line no-unused-vars
function SidebarContent({ user, onMenuClick, location, menuItems }) {
    const rootSubmenuKeys = menuItems.filter(i => i.children).map(i => i.key);

    const initialOpenKeys = menuItems
        .filter(item => item.children)
        .filter(item => item.children.some(child => location.pathname.startsWith(child.key)))
        .map(item => item.key);

    const [openKeys, setOpenKeys] = useState(initialOpenKeys);

    const onOpenChange = (keys) => {
        const latestOpenKey = keys.find((key) => openKeys.indexOf(key) === -1);
        if (rootSubmenuKeys.indexOf(latestOpenKey) === -1) {
            setOpenKeys(keys);
        } else {
            setOpenKeys(latestOpenKey ? [latestOpenKey] : []);
        }
    };

    return (
        <div className="sidebar-container">
            <div className="sidebar-header">
                <div className="sidebar-brand" style={{ marginBottom: 16 }}>
                    <span className="brand-icon">🌾</span>
                    <div>
                        <div>สนง.เกษตรจังหวัด</div>
                        <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.6 }}>นครปฐม</div>
                    </div>
                </div>
                <div className="sidebar-search-wrapper">
                    <GlobalSearch />
                </div>
            </div>

            <div className="sidebar-menu-wrapper">
                <Menu
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    openKeys={openKeys}
                    onOpenChange={onOpenChange}
                    items={menuItems}
                    onClick={onMenuClick}
                />
            </div>

            <div className="sidebar-bottom-menu">
                <Menu
                    mode="inline"
                    selectable={false}
                    items={bottomMenuItems}
                    onClick={({ key }) => onMenuClick({ key })}
                    style={{ background: 'transparent', border: 'none' }}
                />
            </div>
        </div>
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
            localStorage.removeItem('guestMode');
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
                        <div style={{ textAlign: 'center', marginTop: 8 }}>
                            <GlobalSearch collapsed={true} />
                        </div>
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
