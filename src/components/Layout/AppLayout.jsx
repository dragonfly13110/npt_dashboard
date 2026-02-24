import { Layout, Avatar, Dropdown, Button } from 'antd';
import { UserOutlined, LogoutOutlined, LoginOutlined } from '@ant-design/icons';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { supabase } from '../../supabaseClient';

const { Header, Content } = Layout;

export default function AppLayout({ user }) {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

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
            <Sidebar user={user} />
            <Layout>
                <Header className="app-header">
                    <div className="header-left">
                        <span className="page-title">ระบบฐานข้อมูลกลาง</span>
                    </div>
                    <div className="header-right">
                        {user ? (
                            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                                <div className="user-info">
                                    <Avatar size={34} icon={<UserOutlined />} style={{ backgroundColor: '#1a7f37' }} />
                                    <div>
                                        <div className="user-name">{user?.email || 'เจ้าหน้าที่'}</div>
                                        <div className="user-group">เกษตรจังหวัดนครปฐม</div>
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
        </Layout>
    );
}
