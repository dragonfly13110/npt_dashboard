import { Form, Input, InputNumber, Select } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';
const columns = [
    { title: 'ชื่อวิสาหกิจ', dataIndex: 'enterprise_name', key: 'enterprise_name', width: 220 },
    { title: 'ประเภทสินค้า/บริการ', dataIndex: 'product_type', key: 'product_type', width: 160 },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'ประธาน', dataIndex: 'chairman', key: 'chairman', width: 150 },
    { title: 'สมาชิก', dataIndex: 'member_count', key: 'member_count', width: 100, align: 'right' },
    { title: 'ระดับ', dataIndex: 'level', key: 'level', width: 100 },
];
const formFields = (
    <>
        <Form.Item name="enterprise_name" label="ชื่อวิสาหกิจ" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="product_type" label="ประเภทสินค้า/บริการ"><Input /></Form.Item>
        <Form.Item name="district" label="อำเภอ"><Input /></Form.Item>
        <Form.Item name="chairman" label="ประธาน"><Input /></Form.Item>
        <Form.Item name="member_count" label="จำนวนสมาชิก"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="level" label="ระดับ"><Select options={['เข้มแข็ง', 'ปานกลาง', 'เริ่มต้น'].map(d => ({ label: d, value: d }))} /></Form.Item>
    </>
);
export default function CommunityEnterprises() {
    return <CrudTable tableName="community_enterprises" title="วิสาหกิจชุมชน" columns={columns} formFields={formFields} searchField="enterprise_name" />;
}
