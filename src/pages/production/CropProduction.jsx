import { Form, Input, InputNumber, Select } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';
const columns = [
    { title: 'พืช', dataIndex: 'crop_name', key: 'crop_name', width: 150 },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'พื้นที่ปลูก (ไร่)', dataIndex: 'planted_area', key: 'planted_area', width: 140, align: 'right', render: v => v?.toLocaleString() || '-' },
    { title: 'ผลผลิต (ตัน)', dataIndex: 'production_ton', key: 'production_ton', width: 130, align: 'right', render: v => v?.toLocaleString() || '-' },
    { title: 'ช่วงเก็บเกี่ยว', dataIndex: 'harvest_period', key: 'harvest_period', width: 140 },
    { title: 'ปี', dataIndex: 'year', key: 'year', width: 80, align: 'center' },
];
const formFields = (
    <>
        <Form.Item name="crop_name" label="ชื่อพืช" rules={[{ required: true }]}><Input placeholder="ข้าว, มะพร้าวน้ำหอม, ส้มโอ" /></Form.Item>
        <Form.Item name="district" label="อำเภอ"><Input /></Form.Item>
        <Form.Item name="planted_area" label="พื้นที่ปลูก (ไร่)"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="production_ton" label="ผลผลิต (ตัน)"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="harvest_period" label="ช่วงเก็บเกี่ยว"><Input placeholder="ม.ค.-มี.ค." /></Form.Item>
        <Form.Item name="year" label="ปี"><InputNumber style={{ width: '100%' }} placeholder="2568" /></Form.Item>
    </>
);
export default function CropProduction() {
    return <CrudTable tableName="crop_production" title="ผลผลิตพืชเศรษฐกิจ" columns={columns} formFields={formFields} searchField="crop_name" />;
}
