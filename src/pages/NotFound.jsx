import { Button } from 'antd';
import { HomeOutlined, LoginOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="not-found-container">
            <div className="not-found-bg"></div>
            <div className="not-found-content">
                <div className="not-found-code">404</div>
                <div className="not-found-icon">🌾</div>
                <h1 className="not-found-title">ไม่พบหน้าที่คุณต้องการ</h1>
                <p className="not-found-desc">
                    หน้าที่คุณกำลังค้นหาอาจถูกย้าย ลบ หรือไม่เคยมีอยู่
                    <br />
                    กรุณาตรวจสอบ URL อีกครั้ง หรือกลับไปหน้าหลัก
                </p>
                <div className="not-found-actions">
                    <Button
                        type="primary"
                        icon={<HomeOutlined />}
                        size="large"
                        onClick={() => navigate('/')}
                        className="add-btn"
                    >
                        กลับหน้าหลัก
                    </Button>
                    <Button
                        icon={<LoginOutlined />}
                        size="large"
                        onClick={() => navigate('/login')}
                    >
                        เข้าสู่ระบบ
                    </Button>
                </div>
            </div>
        </div>
    );
}
