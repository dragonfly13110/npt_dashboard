import { Form, Input, InputNumber, Select } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';
const columns = [
    { title: 'ตัวชี้วัด', dataIndex: 'kpi_name', key: 'kpi_name', width: 250 },
    { title: 'หน่วย', dataIndex: 'unit', key: 'unit', width: 100 },
    { title: 'เป้าหมาย', dataIndex: 'target', key: 'target', width: 110, align: 'right' },
    { title: 'ผลดำเนินการ', dataIndex: 'actual', key: 'actual', width: 120, align: 'right' },
    {
        title: '% สำเร็จ', key: 'pct', width: 100, align: 'center', render: (_, r) => {
            if (!r.target || !r.actual) return '-';
            const p = ((r.actual / r.target) * 100).toFixed(1);
            return <span style={{ fontWeight: 600, color: p >= 80 ? '#1a7f37' : p >= 50 ? '#bf8700' : '#cf222e' }}>{p}%</span>;
        }
    },
    { title: 'ปีงบ', dataIndex: 'fiscal_year', key: 'fiscal_year', width: 80, align: 'center' },
];
const formFields = (
    <>
        <Form.Item name="kpi_name" label="ชื่อตัวชี้วัด" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="unit" label="หน่วยวัด"><Input placeholder="ราย, ไร่, แห่ง" /></Form.Item>
        <Form.Item name="target" label="เป้าหมาย"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="actual" label="ผลดำเนินการ"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="fiscal_year" label="ปีงบประมาณ"><InputNumber style={{ width: '100%' }} placeholder="2568" /></Form.Item>
    </>
);
export default function KpiPlans() {
    return <CrudTable tableName="kpi_plans" title="แผนปฏิบัติราชการ / KPI" columns={columns} formFields={formFields} searchField="kpi_name" />;
}
