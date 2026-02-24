import { Form, Input, InputNumber, Select } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';
const columns = [
    { title: 'ชื่อกลุ่ม', dataIndex: 'group_name', key: 'group_name', width: 220 },
    { title: 'ประเภท', dataIndex: 'group_type', key: 'group_type', width: 140 },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'ประธาน', dataIndex: 'chairman', key: 'chairman', width: 150 },
    { title: 'สมาชิก', dataIndex: 'member_count', key: 'member_count', width: 100, align: 'right' },
];
const formFields = (
    <>
        <Form.Item name="group_name" label="ชื่อกลุ่ม" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="group_type" label="ประเภท"><Select options={['กลุ่มแม่บ้านเกษตรกร', 'กลุ่มยุวเกษตรกร'].map(d => ({ label: d, value: d }))} /></Form.Item>
        <Form.Item name="district" label="อำเภอ"><Input /></Form.Item>
        <Form.Item name="chairman" label="ประธาน"><Input /></Form.Item>
        <Form.Item name="member_count" label="จำนวนสมาชิก"><InputNumber style={{ width: '100%' }} /></Form.Item>
    </>
);
export default function FarmerGroups() {
    return <CrudTable tableName="farmer_groups" title="กลุ่มแม่บ้าน/ยุวเกษตรกร" columns={columns} formFields={formFields} searchField="group_name" />;
}
