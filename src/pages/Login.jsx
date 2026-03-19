import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Login() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

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
            message.error('เข้าสู่ระบบไม่สำเร็จ: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-logo">
                    <span className="logo-icon">🌾</span>
                </div>
                <h1 className="login-title">ระบบฐานข้อมูลกลาง</h1>
                <p className="login-subtitle">สำนักงานเกษตรจังหวัดนครปฐม</p>

                <Form onFinish={handleLogin} size="large" layout="vertical">
                    <Form.Item
                        name="email"
                        label="อีเมล"
                        rules={[{ required: true, message: 'กรุณากรอกอีเมล' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="email@example.com" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="รหัสผ่าน"
                        rules={[{ required: true, message: 'กรุณากรอกรหัสผ่าน' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="รหัสผ่าน" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
                        <Button type="primary" htmlType="submit" className="login-btn" loading={loading}>
                            เข้าสู่ระบบ
                        </Button>
                    </Form.Item>
                </Form>

                <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <Button
                        type="link"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate('/')}
                        size="large"
                        style={{ color: '#94a3b8', fontSize: 16 }}
                    >
                        กลับหน้าแรก
                    </Button>
                </div>
            </div>
        </div>
    );
}
