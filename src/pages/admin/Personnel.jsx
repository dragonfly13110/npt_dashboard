import { useState, useEffect } from 'react';
import { Form, Input, Select, DatePicker, Row, Col, Card, Statistic } from 'antd';
import { TeamOutlined, BankOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658', '#8dd1e1', '#a4de6c'];

export default function Personnel() {
    const [stats, setStats] = useState({
        total: 0,
        provincial: 0,
        district: 0
    });
    const [positionData, setPositionData] = useState([]);
    const [departmentData, setDepartmentData] = useState([]);

    const fetchStats = async () => {
        const { data, error } = await supabase.from('personnel').select('office_type, position, department');
        if (!error && data) {
            setStats({
                total: data.length,
                provincial: data.filter(d => d.office_type === 'Provincial').length,
                district: data.filter(d => d.office_type === 'District').length
            });

            // Process position counts
            const posCounts = {};
            const depCounts = {};
            data.forEach(d => {
                const pos = d.position || 'ไม่ระบุ';
                const dep = d.department || 'ไม่ระบุ';
                posCounts[pos] = (posCounts[pos] || 0) + 1;
                depCounts[dep] = (depCounts[dep] || 0) + 1;
            });

            // Format for charts (Top 6 + Others)
            const formatForChart = (counts) => {
                const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
                const top = sorted.slice(0, 6).map(([name, value]) => ({ name, value }));
                const others = sorted.slice(6).reduce((sum, curr) => sum + curr[1], 0);
                if (others > 0) top.push({ name: 'อื่นๆ', value: others });
                return top;
            };

            setPositionData(formatForChart(posCounts));
            setDepartmentData(formatForChart(depCounts));
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    return (
        <div style={{ paddingBottom: 24 }}>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={8}>
                    <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <Statistic title="บุคลากรทั้งหมด" value={stats.total} prefix={<TeamOutlined style={{ color: '#1890ff' }} />} suffix="คน" />
                    </Card>
                </Col>
                <Col xs={12} sm={8}>
                    <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <Statistic title="ระดับจังหวัด" value={stats.provincial} prefix={<BankOutlined style={{ color: '#52c41a' }} />} suffix="คน" />
                    </Card>
                </Col>
                <Col xs={12} sm={8}>
                    <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <Statistic title="ระดับอำเภอ" value={stats.district} prefix={<EnvironmentOutlined style={{ color: '#fa8c16' }} />} suffix="คน" />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={12}>
                    <Card title="สัดส่วนบุคลากรแยกตามตำแหน่ง" bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', height: '100%' }}>
                        <div style={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={positionData} 
                                        cx="50%" 
                                        cy="45%" 
                                        labelLine={true} 
                                        label 
                                        outerRadius={100} 
                                        fill="#8884d8" 
                                        dataKey="value"
                                        nameKey="name"
                                        isAnimationActive={false}
                                    >
                                        {positionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value) => [`${value} คน`, 'จำนวน']} />
                                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card title="สัดส่วนบุคลากรแยกตามกลุ่มงาน/อำเภอ" bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', height: '100%' }}>
                        <div style={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={departmentData} 
                                        cx="50%" 
                                        cy="45%" 
                                        labelLine={true} 
                                        label 
                                        outerRadius={100} 
                                        fill="#82ca9d" 
                                        dataKey="value"
                                        nameKey="name"
                                        isAnimationActive={false}
                                    >
                                        {departmentData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value) => [`${value} คน`, 'จำนวน']} />
                                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
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
                    fetchStats();
                    return null;
                }}
            />
        </div>
    );
}
