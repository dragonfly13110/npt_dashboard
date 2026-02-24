import { Form, Input, Select, InputNumber } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';

const columns = [
    { title: 'ชื่อโครงการ', dataIndex: 'project_name', key: 'project_name', width: 250 },
    { title: 'ปีงบประมาณ', dataIndex: 'fiscal_year', key: 'fiscal_year', width: 120, align: 'center' },
    { title: 'แหล่งงบ', dataIndex: 'budget_source', key: 'budget_source', width: 140 },
    {
        title: 'งบประมาณ (บาท)', dataIndex: 'budget_amount', key: 'budget_amount', width: 150, align: 'right',
        render: (val) => val ? Number(val).toLocaleString() : '-'
    },
    {
        title: 'เบิกจ่าย (บาท)', dataIndex: 'spent_amount', key: 'spent_amount', width: 150, align: 'right',
        render: (val) => val ? Number(val).toLocaleString() : '-'
    },
    {
        title: '% เบิกจ่าย', key: 'percent', width: 110, align: 'center',
        render: (_, rec) => {
            if (!rec.budget_amount || !rec.spent_amount) return '-';
            const pct = ((rec.spent_amount / rec.budget_amount) * 100).toFixed(1);
            const color = pct >= 80 ? '#1a7f37' : pct >= 50 ? '#bf8700' : '#cf222e';
            return <span style={{ fontWeight: 600, color }}>{pct}%</span>;
        }
    },
    {
        title: 'สถานะ', dataIndex: 'status', key: 'status', width: 110,
        render: (val) => {
            const colors = { 'ดำเนินการ': '#dafbe1', 'เสร็จสิ้น': '#ddf4ff', 'ยกเลิก': '#ffebe9' };
            const textColors = { 'ดำเนินการ': '#1a7f37', 'เสร็จสิ้น': '#0969da', 'ยกเลิก': '#cf222e' };
            return (
                <span style={{
                    padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                    background: colors[val] || '#f6f8fa', color: textColors[val] || '#656d76'
                }}>
                    {val || '-'}
                </span>
            );
        }
    },
];

const formFields = (
    <>
        <Form.Item name="project_name" label="ชื่อโครงการ" rules={[{ required: true, message: 'กรุณากรอกชื่อโครงการ' }]}>
            <Input placeholder="โครงการส่งเสริมการปลูกพืชเศรษฐกิจ" />
        </Form.Item>
        <Form.Item name="fiscal_year" label="ปีงบประมาณ" rules={[{ required: true, message: 'กรุณากรอกปีงบ' }]}>
            <InputNumber style={{ width: '100%' }} placeholder="2568" min={2560} max={2580} />
        </Form.Item>
        <Form.Item name="budget_source" label="แหล่งงบประมาณ">
            <Select placeholder="เลือกแหล่งงบ" options={[
                { label: 'งบปกติ', value: 'งบปกติ' },
                { label: 'งบจังหวัด', value: 'งบจังหวัด' },
                { label: 'งบกลุ่มจังหวัด', value: 'งบกลุ่มจังหวัด' },
                { label: 'งบเงินกู้', value: 'งบเงินกู้' },
                { label: 'อื่นๆ', value: 'อื่นๆ' },
            ]} />
        </Form.Item>
        <Form.Item name="budget_amount" label="งบประมาณที่ได้รับ (บาท)" rules={[{ required: true, message: 'กรุณากรอกงบประมาณ' }]}>
            <InputNumber style={{ width: '100%' }} placeholder="1000000" formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
        </Form.Item>
        <Form.Item name="spent_amount" label="เบิกจ่ายแล้ว (บาท)">
            <InputNumber style={{ width: '100%' }} placeholder="500000" formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
        </Form.Item>
        <Form.Item name="status" label="สถานะ">
            <Select placeholder="เลือกสถานะ" options={[
                { label: 'ดำเนินการ', value: 'ดำเนินการ' },
                { label: 'เสร็จสิ้น', value: 'เสร็จสิ้น' },
                { label: 'ยกเลิก', value: 'ยกเลิก' },
            ]} />
        </Form.Item>
        <Form.Item name="notes" label="หมายเหตุ">
            <Input.TextArea rows={2} placeholder="รายละเอียดเพิ่มเติม" />
        </Form.Item>
    </>
);

export default function Budgets() {
    return (
        <CrudTable
            tableName="budgets"
            title="ข้อมูลงบประมาณ"
            columns={columns}
            formFields={formFields}
            searchField="project_name"
        />
    );
}
