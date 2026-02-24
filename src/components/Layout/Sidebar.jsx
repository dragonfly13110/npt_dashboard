import { useState } from 'react';
import { Layout, Menu, Modal } from 'antd';
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
} from '@ant-design/icons';
import { supabase } from '../../supabaseClient';

const { Sider } = Layout;

const menuItems = [
    {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: 'แดชบอร์ด',
    },
    {
        key: 'admin',
        icon: <TeamOutlined />,
        label: 'ฝ่ายบริหารทั่วไป',
        children: [
            { key: '/dashboard/admin/personnel', icon: <TeamOutlined />, label: 'ข้อมูลบุคลากร' },
            { key: '/dashboard/admin/assets', icon: <CarOutlined />, label: 'พัสดุ/ครุภัณฑ์' },
            { key: '/dashboard/admin/budgets', icon: <DollarOutlined />, label: 'งบประมาณ' },
        ],
    },
    {
        key: 'strategy',
        icon: <AimOutlined />,
        label: 'ยุทธศาสตร์ฯ',
        children: [
            { key: '/dashboard/strategy/farmer-registry', icon: <FileTextOutlined />, label: 'ทะเบียนเกษตรกร' },
            { key: '/dashboard/strategy/gis', icon: <GlobalOutlined />, label: 'พิกัด GIS' },
            { key: '/dashboard/strategy/disasters', icon: <ThunderboltOutlined />, label: 'ภัยพิบัติ' },
            { key: '/dashboard/strategy/kpi', icon: <AimOutlined />, label: 'แผน/KPI' },
        ],
    },
    {
        key: 'production',
        icon: <BankOutlined />,
        label: 'ส่งเสริมการผลิต',
        children: [
            { key: '/dashboard/production/large-plots', icon: <BankOutlined />, label: 'แปลงใหญ่' },
            { key: '/dashboard/production/learning-centers', icon: <BankOutlined />, label: 'ศพก.' },
            { key: '/dashboard/production/certifications', icon: <SafetyCertificateOutlined />, label: 'มาตรฐาน GAP' },
            { key: '/dashboard/production/crop-production', icon: <BarChartOutlined />, label: 'ผลผลิตพืช' },
        ],
    },
    {
        key: 'development',
        icon: <ShopOutlined />,
        label: 'ส่งเสริมเกษตรกร',
        children: [
            { key: '/dashboard/development/community-enterprises', icon: <ShopOutlined />, label: 'วิสาหกิจชุมชน' },
            { key: '/dashboard/development/smart-farmers', icon: <UserSwitchOutlined />, label: 'เกษตรกรรุ่นใหม่' },
            { key: '/dashboard/development/farmer-groups', icon: <UsergroupAddOutlined />, label: 'กลุ่มแม่บ้าน/ยุวฯ' },
            { key: '/dashboard/development/agri-tourism', icon: <EnvironmentOutlined />, label: 'ท่องเที่ยวเกษตร' },
        ],
    },
    {
        key: 'protection',
        icon: <BugOutlined />,
        label: 'อารักขาพืช',
        children: [
            { key: '/dashboard/protection/pest-outbreaks', icon: <BugOutlined />, label: 'พื้นที่ระบาด' },
            { key: '/dashboard/protection/pest-centers', icon: <MedicineBoxOutlined />, label: 'ศจช.' },
            { key: '/dashboard/protection/biocontrol', icon: <ExperimentOutlined />, label: 'ชีวภัณฑ์' },
            { key: '/dashboard/protection/fire-hotspots', icon: <FireOutlined />, label: 'จุดเฝ้าระวัง PM2.5' },
        ],
    },
];

export default function Sidebar({ user }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    const handleMenuClick = ({ key }) => {
        navigate(key);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const openKeys = menuItems
        .filter(item => item.children)
        .filter(item => item.children.some(child => location.pathname.startsWith(child.key)))
        .map(item => item.key);

    return (
        <Sider
            className="sidebar"
            width={260}
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            breakpoint="lg"
            trigger={null}
        >
            <div className="sidebar-header">
                {!collapsed ? (
                    <div className="sidebar-brand">
                        <span className="brand-icon">🌾</span>
                        <div>
                            <div>สนง.เกษตรจังหวัด</div>
                            <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.6 }}>นครปฐม</div>
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', fontSize: 28 }}>🌾</div>
                )}
            </div>

            <Menu
                mode="inline"
                selectedKeys={[location.pathname]}
                defaultOpenKeys={openKeys}
                items={menuItems}
                onClick={handleMenuClick}
            />

            <div style={{ position: 'absolute', bottom: 60, width: '100%', padding: '0 8px' }}>
                <Menu
                    mode="inline"
                    selectable={false}
                    items={[
                        { key: 'home', icon: <HomeOutlined />, label: 'กลับหน้าหลัก', onClick: () => navigate('/') },
                        { key: 'logout', icon: <LogoutOutlined />, label: 'ออกจากระบบ', danger: true, onClick: handleLogout },
                    ]}
                    style={{ background: 'transparent', border: 'none' }}
                />
            </div>
        </Sider>
    );
}
