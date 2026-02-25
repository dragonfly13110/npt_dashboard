import { Form, Input, InputNumber, Select } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';
const columns = [
    { title: 'ศัตรูพืช/โรค', dataIndex: 'pest_name', key: 'pest_name', width: 180 },
    { title: 'พืชที่ถูกทำลาย', dataIndex: 'affected_crop', key: 'affected_crop', width: 150 },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'พื้นที่ระบาด (ไร่)', dataIndex: 'outbreak_area', key: 'outbreak_area', width: 140, align: 'right', render: v => v?.toLocaleString() || '-' },
    {
        title: 'ระดับ', dataIndex: 'severity', key: 'severity', width: 100, render: v => {
            const c = { 'รุนแรง': '#cf222e', 'ปานกลาง': '#bf8700', 'เล็กน้อย': '#1a7f37' };
            return <span style={{ fontWeight: 600, color: c[v] || '#656d76' }}>{v || '-'}</span>;
        }
    },
    { title: 'วันที่รายงาน', dataIndex: 'report_date', key: 'report_date', width: 130 },
];
const formFields = (
    <>
        <Form.Item name="pest_name" label="ชื่อศัตรูพืช/โรค" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="affected_crop" label="พืชที่ถูกทำลาย"><Input /></Form.Item>
        <Form.Item name="district" label="อำเภอ"><Input /></Form.Item>
        <Form.Item name="outbreak_area" label="พื้นที่ระบาด (ไร่)"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="severity" label="ระดับ"><Select options={['รุนแรง', 'ปานกลาง', 'เล็กน้อย'].map(d => ({ label: d, value: d }))} /></Form.Item>
        <Form.Item name="report_date" label="วันที่รายงาน"><Input placeholder="2568-01-15" /></Form.Item>
        <Form.Item name="notes" label="หมายเหตุ"><Input.TextArea rows={2} /></Form.Item>
    </>
);
const districts = ['เมืองนครปฐม', 'นครชัยศรี', 'สามพราน', 'ดอนตูม', 'บางเลน', 'กำแพงแสน', 'พุทธมณฑล'];

const filterConfig = [
    { key: 'district', label: 'อำเภอ', options: districts },
    { key: 'severity', label: 'ระดับ', options: ['รุนแรง', 'ปานกลาง', 'เล็กน้อย'] },
];

export default function PestOutbreaks() {
    return <CrudTable tableName="pest_outbreaks" title="พื้นที่การระบาดศัตรูพืช" columns={columns} formFields={formFields} searchField="pest_name" filterConfig={filterConfig} />;
}
