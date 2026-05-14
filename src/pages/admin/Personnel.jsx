import { useState, useEffect } from 'react';
import { Form, Input, Select, DatePicker, Row, Col, Card, Statistic } from 'antd';
import { TeamOutlined, BankOutlined, EnvironmentOutlined, CheckCircleOutlined } from '@ant-design/icons';
import CrudTable from '../../components/DataTable/CrudTable';
import { supabase } from '../../supabaseClient';

const columns = [
    { title: 'ชื่อ-นามสกุล', dataIndex: 'full_name', key: 'full_name', width: 220 },
    { title: 'ตำแหน่ง', dataIndex: 'position', key: 'position', width: 200 },
    { title: 'ระดับหน่วยงาน', dataIndex: 'office_type', key: 'office_type', width: 130, render: (v) => v === 'Provincial' ? 'ระดับจังหวัด' : (v === 'District' ? 'ระดับอำเภอ' : v) },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'กลุ่มงาน/ฝ่าย', dataIndex: 'department', key: 'department', width: 200 },
    { title: 'เบอร์โทร', dataIndex: 'phone', key: 'phone', width: 130 },
    { title: 'อีเมล', dataIndex: 'email', key: 'email', width: 180 },
    {
        title: 'สถานะ', dataIndex: 'status', key: 'status', width: 100,
        render: (val) => (
            <span style={{
                padding: '2px 10px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
                background: val === 'ปฏิบัติงาน' ? '#dafbe1' : '#fff8c5',
                color: val === 'ปฏิบัติงาน' ? '#1a7f37' : '#bf8700'
            }}>
                {val || 'ปฏิบัติงาน'}
            </span>
        )
    },
];

const formFields = (
    <>
        <Form.Item name="full_name" label="ชื่อ-นามสกุล" rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}>
            <Input placeholder="นายสมชาย ใจดี" />
        </Form.Item>
        <Form.Item name="position" label="ตำแหน่ง" rules={[{ required: true, message: 'กรุณากรอกตำแหน่ง' }]}>
            <Input placeholder="นักวิชาการส่งเสริมการเกษตรชำนาญการ" />
        </Form.Item>
        <Form.Item name="department" label="กลุ่มงาน">
            <Input placeholder="เช่น กลุ่มส่งเสริมและพัฒนาเกษตรกร" />
        </Form.Item>
        <Form.Item name="office_type" label="ระดับหน่วยงาน">
            <Select placeholder="เลือกหน่วยงาน" options={[
                { label: 'ระดับจังหวัด', value: 'Provincial' },
                { label: 'ระดับอำเภอ', value: 'District' }
            ]} />
        </Form.Item>
        <Form.Item name="district" label="อำเภอ (ถ้าอยู่ระดับอำเภอ)">
            <Input placeholder="เช่น เมืองนครปฐม" />
        </Form.Item>
        <Form.Item name="province" label="จังหวัด">
            <Input placeholder="นครปฐม" />
        </Form.Item>
        <Form.Item name="phone" label="เบอร์โทร">
            <Input placeholder="08x-xxx-xxxx" />
        </Form.Item>
        <Form.Item name="email" label="อีเมล">
            <Input placeholder="email@doae.go.th" />
        </Form.Item>
        <Form.Item name="status" label="สถานะ">
            <Select placeholder="เลือกสถานะ" options={[
                { label: 'ปฏิบัติงาน', value: 'ปฏิบัติงาน' },
                { label: 'ลาศึกษาต่อ', value: 'ลาศึกษาต่อ' },
                { label: 'ช่วยราชการ', value: 'ช่วยราชการ' },
                { label: 'เกษียณ', value: 'เกษียณ' },
            ]} />
        </Form.Item>
    </>
);

const filterConfig = [
    { key: 'office_type', label: 'ระดับหน่วยงาน', options: [{ label: 'ระดับจังหวัด', value: 'Provincial' }, { label: 'ระดับอำเภอ', value: 'District' }] },
    { key: 'district', label: 'อำเภอ', options: ['เมืองนครปฐม', 'กำแพงแสน', 'นครชัยศรี', 'ดอนตูม', 'บางเลน', 'สามพราน', 'พุทธมณฑล'] },
    { key: 'status', label: 'สถานะ', options: ['ปฏิบัติงาน', 'ลาศึกษาต่อ', 'ช่วยราชการ', 'เกษียณ'] }
];

export default function Personnel() {
    const [stats, setStats] = useState({
        total: 0,
        provincial: 0,
        district: 0,
        working: 0
    });

    const fetchStats = async () => {
        const { data, error } = await supabase.from('personnel').select('office_type, status');
        if (!error && data) {
            setStats({
                total: data.length,
                provincial: data.filter(d => d.office_type === 'Provincial').length,
                district: data.filter(d => d.office_type === 'District').length,
                working: data.filter(d => !d.status || d.status === 'ปฏิบัติงาน').length
            });
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    return (
        <div style={{ paddingBottom: 24 }}>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                    <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <Statistic title="บุคลากรทั้งหมด" value={stats.total} prefix={<TeamOutlined style={{ color: '#1890ff' }} />} suffix="คน" />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <Statistic title="ระดับจังหวัด" value={stats.provincial} prefix={<BankOutlined style={{ color: '#52c41a' }} />} suffix="คน" />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <Statistic title="ระดับอำเภอ" value={stats.district} prefix={<EnvironmentOutlined style={{ color: '#fa8c16' }} />} suffix="คน" />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <Statistic title="กำลังปฏิบัติงาน" value={stats.working} prefix={<CheckCircleOutlined style={{ color: '#13c2c2' }} />} suffix="คน" />
                    </Card>
                </Col>
            </Row>

            <CrudTable
                tableName="personnel"
                title="ข้อมูลบุคลากร"
                columns={columns}
                formFields={formFields}
                searchField="full_name"
                searchFields={['full_name', 'department', 'district', 'position']}
                filterConfig={filterConfig}
                defaultSort={{ field: 'sort_order', order: 'ascend' }}
                extraActions={() => {
                    // Refetch stats when table reloads
                    fetchStats();
                    return null;
                }}
            />
        </div>
    );
}
