import { useEffect, useState } from 'react';
import { Button, Divider, Form, Input, Space, Typography, message } from 'antd';
import {
    ArrowLeftOutlined, EyeOutlined, GoogleOutlined,
    KeyOutlined, MailOutlined, SafetyOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import '../styles/login.css';

const { Text, Title } = Typography;

export default function Login() {
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const navigate = useNavigate();
    const { loginAsGuest } = useAuth();

    useEffect(() => {
        document.title = 'เข้าสู่ระบบ | ศูนย์ข้อมูลการเกษตรนครปฐม';

        const robots = document.querySelector('meta[name="robots"]');
        const previousContent = robots?.getAttribute('content');
        if (robots) robots.setAttribute('content', 'noindex, nofollow');

        return () => {
            if (robots && previousContent) {
                robots.setAttribute('content', previousContent);
            }
        };
    }, []);

    const handleGuestLogin = () => {
        loginAsGuest();
        navigate('/dashboard');
    };

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard`,
            },
        });

        if (error) {
            message.error(`เข้าสู่ระบบด้วย Google ไม่สำเร็จ: ${error.message}`);
            setGoogleLoading(false);
        }
    };

    const handleLogin = async (values) => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password,
            });
            if (error) throw error;
            message.success('เข้าสู่ระบบสำเร็จ');
            navigate('/dashboard');
        } catch (err) {
            message.error(`เข้าสู่ระบบไม่สำเร็จ: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-bg-grid" />
            <div className="login-orb login-orb--1" />
            <div className="login-orb login-orb--2" />
            <div className="login-orb login-orb--3" />

            <div className="login-card-new">
                <div className="login-card-content">
                    <div className="login-header">
                        <div className="login-badge"><SafetyOutlined /> NPT AGRICULTURE</div>
                        <div className="login-icon-wrap">
                            <span className="login-icon">🌾</span>
                        </div>
                        <Title level={2} style={{ color: '#e6edf3', margin: 0 }}>ระบบฐานข้อมูลกลาง</Title>
                        <Text style={{ color: '#8b949e' }}>สำนักงานเกษตรจังหวัดนครปฐม</Text>
                    </div>

                    <Space direction="vertical" size={14} style={{ width: '100%' }}>
                        <Button
                            className="google-btn"
                            icon={<GoogleOutlined />}
                            loading={googleLoading}
                            onClick={handleGoogleLogin}
                            block
                        >
                            เข้าสู่ระบบด้วย Google
                        </Button>

                        <Divider className="login-divider">หรือ</Divider>

                        <Form onFinish={handleLogin} layout="vertical" requiredMark={false}>
                            <Form.Item
                                name="email"
                                label="อีเมล"
                                rules={[
                                    { required: true, message: 'กรุณากรอกอีเมล' },
                                    { type: 'email', message: 'รูปแบบอีเมลไม่ถูกต้อง' },
                                ]}
                            >
                                <Input className="login-input" prefix={<MailOutlined />} placeholder="email@example.com" />
                            </Form.Item>

                            <Form.Item
                                name="password"
                                label="รหัสผ่าน"
                                rules={[{ required: true, message: 'กรุณากรอกรหัสผ่าน' }]}
                            >
                                <Input.Password className="login-input" prefix={<KeyOutlined />} placeholder="รหัสผ่าน" />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                className="login-submit-btn"
                                loading={loading}
                                block
                            >
                                เข้าสู่ระบบ
                            </Button>
                        </Form>

                        <Button className="guest-btn" icon={<EyeOutlined />} onClick={handleGuestLogin} block>
                            บุคคลทั่วไป (เข้าชมข้อมูล)
                        </Button>
                    </Space>

                    <div className="login-footer">
                        <Button
                            type="link"
                            icon={<ArrowLeftOutlined />}
                            onClick={() => navigate('/')}
                        >
                            กลับหน้าแรก
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
