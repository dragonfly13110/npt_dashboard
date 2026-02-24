import { Form, Input, InputNumber } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';
const columns = [
    { title: 'ชื่อศูนย์', dataIndex: 'center_name', key: 'center_name', width: 220 },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'ผู้จัดการแปลง', dataIndex: 'manager', key: 'manager', width: 160 },
    { title: 'พืชหลัก', dataIndex: 'main_crop', key: 'main_crop', width: 140 },
    { title: 'พื้นที่ (ไร่)', dataIndex: 'area_rai', key: 'area_rai', width: 110, align: 'right' },
];
const formFields = (
    <>
        <Form.Item name="center_name" label="ชื่อศูนย์" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="district" label="อำเภอ"><Input /></Form.Item>
        <Form.Item name="manager" label="ผู้จัดการแปลง"><Input /></Form.Item>
        <Form.Item name="main_crop" label="พืชหลัก"><Input /></Form.Item>
        <Form.Item name="area_rai" label="พื้นที่ (ไร่)"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="contact_phone" label="เบอร์ติดต่อ"><Input /></Form.Item>
    </>
);
export default function LearningCenters() {
    return <CrudTable tableName="learning_centers" title="ศูนย์เรียนรู้ฯ (ศพก.)" columns={columns} formFields={formFields} searchField="center_name" />;
}
