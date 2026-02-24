import { Form, Input, InputNumber, Select } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';
const columns = [
    { title: 'ชื่อ-นามสกุล', dataIndex: 'full_name', key: 'full_name', width: 180 },
    { title: 'ประเภท', dataIndex: 'farmer_type', key: 'farmer_type', width: 150 },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'สินค้าหลัก', dataIndex: 'main_product', key: 'main_product', width: 150 },
    { title: 'เบอร์โทร', dataIndex: 'phone', key: 'phone', width: 130 },
];
const formFields = (
    <>
        <Form.Item name="full_name" label="ชื่อ-นามสกุล" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="farmer_type" label="ประเภท"><Select options={['Smart Farmer', 'Young Smart Farmer'].map(d => ({ label: d, value: d }))} /></Form.Item>
        <Form.Item name="district" label="อำเภอ"><Input /></Form.Item>
        <Form.Item name="main_product" label="สินค้าหลัก"><Input /></Form.Item>
        <Form.Item name="phone" label="เบอร์โทร"><Input /></Form.Item>
    </>
);
export default function SmartFarmers() {
    return <CrudTable tableName="smart_farmers" title="เกษตรกรรุ่นใหม่ (Smart Farmer)" columns={columns} formFields={formFields} searchField="full_name" />;
}
