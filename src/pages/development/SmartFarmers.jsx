import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Typography, Layout } from 'antd';
import { TeamOutlined, UserOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const { Content } = Layout;

export default function SmartFarmers() {
    const navigate = useNavigate();

    useEffect(() => {
        document.title = 'ข้อมูลเกษตรกรปราดเปรื่อง | ศูนย์ข้อมูลการเกษตรนครปฐม';
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', 'เลือกดูข้อมูล Smart Farmer หรือ Young Smart Farmer จังหวัดนครปฐม');
    }, []);

    const isPublic = window.location.pathname.startsWith('/public');

    const handleNavigate = (path) => {
        if (isPublic) {
            navigate(`/public/${path}`);
        } else {
            navigate(`/dashboard/development/${path}`);
        }
    };

    return (
        <Content style={{ padding: '24px', maxWidth: 1000, margin: '0 auto', background: 'transparent' }}>
            <div style={{ textAlign: 'center', marginBottom: 40, marginTop: 20 }}>
                <Title level={2} style={{ color: '#1a7f37', marginBottom: 16 }}>
                    ข้อมูลเกษตรกรปราดเปรื่อง (Smart Farmer)
                </Title>
                <Paragraph style={{ fontSize: 16, color: '#475569' }}>
                    กรุณาเลือกประเภทของเกษตรกรที่คุณต้องการเรียกดูรายละเอียดข้อมูล
                </Paragraph>
            </div>

            <Row gutter={[24, 24]} justify="center">
                <Col xs={24} sm={12}>
                    <Card 
                        hoverable 
                        onClick={() => handleNavigate('smart-farmer-sf')}
                        style={{ 
                            height: '100%', 
                            borderRadius: 16, 
                            border: '1px solid #fed7aa',
                            overflow: 'hidden',
                            boxShadow: '0 4px 12px rgba(194, 65, 12, 0.05)'
                        }}
                        bodyStyle={{ padding: '40px 32px', textAlign: 'center' }}
                    >
                        <div style={{ 
                            width: 80, height: 80, borderRadius: '50%', 
                            background: '#fff7ed', color: '#c2410c',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 36, margin: '0 auto 24px'
                        }}>
                            <UserOutlined />
                        </div>
                        <Title level={3} style={{ color: '#9a3412', marginBottom: 16, fontSize: 22 }}>
                            Smart Farmer (SF)
                        </Title>
                        <Paragraph style={{ color: '#64748b', fontSize: 15, marginBottom: 0 }}>
                            ข้อมูลเกษตรกรปราดเปรื่องต้นแบบ (Smart Farmer) ทั้งหมดในพื้นที่จังหวัดนครปฐม พร้อมรายละเอียดกิจกรรมการเกษตร
                        </Paragraph>
                    </Card>
                </Col>

                <Col xs={24} sm={12}>
                    <Card 
                        hoverable 
                        onClick={() => handleNavigate('young-smart-farmer-ysf')}
                        style={{ 
                            height: '100%', 
                            borderRadius: 16, 
                            border: '1px solid #bbf7d0',
                            overflow: 'hidden',
                            boxShadow: '0 4px 12px rgba(21, 128, 61, 0.05)'
                        }}
                        bodyStyle={{ padding: '40px 32px', textAlign: 'center' }}
                    >
                        <div style={{ 
                            width: 80, height: 80, borderRadius: '50%', 
                            background: '#f0fdf4', color: '#15803d',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 36, margin: '0 auto 24px'
                        }}>
                            <TeamOutlined />
                        </div>
                        <Title level={3} style={{ color: '#166534', marginBottom: 16, fontSize: 22 }}>
                            Young Smart Farmer (YSF)
                        </Title>
                        <Paragraph style={{ color: '#64748b', fontSize: 15, marginBottom: 0 }}>
                            ข้อมูลเกษตรกรรุ่นใหม่ (Young Smart Farmer) ทั้งหมดในพื้นที่จังหวัดนครปฐม พร้อมรายละเอียดกิจกรรมการเกษตร
                        </Paragraph>
                    </Card>
                </Col>
            </Row>
        </Content>
    );
}
