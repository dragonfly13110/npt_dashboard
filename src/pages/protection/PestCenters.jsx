import { Form, Input, InputNumber } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';
const columns = [
    { title: 'ชื่อศูนย์ ศจช.', dataIndex: 'center_name', key: 'center_name', width: 220 },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'ตำบล', dataIndex: 'subdistrict', key: 'subdistrict', width: 130 },
    { title: 'ประธาน', dataIndex: 'chairman', key: 'chairman', width: 150 },
    { title: 'สมาชิก', dataIndex: 'member_count', key: 'member_count', width: 100, align: 'right' },
];
const formFields = (
    <>
        <Form.Item name="center_name" label="ชื่อศูนย์" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="district" label="อำเภอ"><Input /></Form.Item>
        <Form.Item name="subdistrict" label="ตำบล"><Input /></Form.Item>
        <Form.Item name="chairman" label="ประธาน"><Input /></Form.Item>
        <Form.Item name="member_count" label="จำนวนสมาชิก"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="contact_phone" label="เบอร์ติดต่อ"><Input /></Form.Item>
    </>
);
export default function PestCenters() {
    return <CrudTable tableName="pest_centers" title="ศูนย์จัดการศัตรูพืชชุมชน (ศจช.)" columns={columns} formFields={formFields} searchField="center_name" />;
}
