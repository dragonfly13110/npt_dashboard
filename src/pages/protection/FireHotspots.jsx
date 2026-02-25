import { Form, Input, InputNumber, Select } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';
const columns = [
    { title: 'ตำแหน่ง/ชื่อจุด', dataIndex: 'spot_name', key: 'spot_name', width: 200 },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'ละติจูด', dataIndex: 'latitude', key: 'latitude', width: 120 },
    { title: 'ลองจิจูด', dataIndex: 'longitude', key: 'longitude', width: 120 },
    {
        title: 'ระดับความเสี่ยง', dataIndex: 'risk_level', key: 'risk_level', width: 130, render: v => {
            const c = { 'สูง': '#cf222e', 'ปานกลาง': '#bf8700', 'ต่ำ': '#1a7f37' };
            return <span style={{ fontWeight: 600, color: c[v] || '#656d76' }}>{v || '-'}</span>;
        }
    },
    { title: 'ปี', dataIndex: 'year', key: 'year', width: 80, align: 'center' },
];
const formFields = (
    <>
        <Form.Item name="spot_name" label="ชื่อจุด/ตำแหน่ง" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="district" label="อำเภอ"><Input /></Form.Item>
        <Form.Item name="latitude" label="ละติจูด"><InputNumber style={{ width: '100%' }} step={0.000001} /></Form.Item>
        <Form.Item name="longitude" label="ลองจิจูด"><InputNumber style={{ width: '100%' }} step={0.000001} /></Form.Item>
        <Form.Item name="risk_level" label="ระดับความเสี่ยง"><Select options={['สูง', 'ปานกลาง', 'ต่ำ'].map(d => ({ label: d, value: d }))} /></Form.Item>
        <Form.Item name="year" label="ปี"><InputNumber style={{ width: '100%' }} placeholder="2568" /></Form.Item>
        <Form.Item name="notes" label="หมายเหตุ"><Input.TextArea rows={2} /></Form.Item>
    </>
);
const districts = ['เมืองนครปฐม', 'นครชัยศรี', 'สามพราน', 'ดอนตูม', 'บางเลน', 'กำแพงแสน', 'พุทธมณฑล'];

const filterConfig = [
    { key: 'district', label: 'อำเภอ', options: districts },
    { key: 'risk_level', label: 'ระดับความเสี่ยง', options: ['สูง', 'ปานกลาง', 'ต่ำ'] },
];

export default function FireHotspots() {
    return <CrudTable tableName="fire_hotspots" title="จุดเฝ้าระวังการเผา / PM2.5" columns={columns} formFields={formFields} searchField="spot_name" filterConfig={filterConfig} />;
}
