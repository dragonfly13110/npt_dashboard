import { Form, Input, InputNumber, Select } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';
const columns = [
    { title: 'ประเภทภัย', dataIndex: 'disaster_type', key: 'disaster_type', width: 130 },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'ตำบล', dataIndex: 'subdistrict', key: 'subdistrict', width: 130 },
    { title: 'พื้นที่เสียหาย (ไร่)', dataIndex: 'damaged_area', key: 'damaged_area', width: 150, align: 'right', render: v => v?.toLocaleString() || '-' },
    { title: 'เกษตรกรได้รับผลกระทบ', dataIndex: 'affected_farmers', key: 'affected_farmers', width: 170, align: 'right', render: v => v?.toLocaleString() || '-' },
    { title: 'ปี', dataIndex: 'year', key: 'year', width: 80, align: 'center' },
];
const formFields = (
    <>
        <Form.Item name="disaster_type" label="ประเภทภัย" rules={[{ required: true }]}>
            <Select options={['น้ำท่วม', 'ภัยแล้ง', 'วาตภัย', 'ศัตรูพืชระบาด', 'อื่นๆ'].map(d => ({ label: d, value: d }))} />
        </Form.Item>
        <Form.Item name="district" label="อำเภอ" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="subdistrict" label="ตำบล"><Input /></Form.Item>
        <Form.Item name="damaged_area" label="พื้นที่เสียหาย (ไร่)"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="affected_farmers" label="เกษตรกรได้รับผลกระทบ (ราย)"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="year" label="ปี"><InputNumber style={{ width: '100%' }} placeholder="2568" /></Form.Item>
        <Form.Item name="notes" label="หมายเหตุ"><Input.TextArea rows={2} /></Form.Item>
    </>
);
const districts = ['เมืองนครปฐม', 'นครชัยศรี', 'สามพราน', 'ดอนตูม', 'บางเลน', 'กำแพงแสน', 'พุทธมณฑล'];

const filterConfig = [
    { key: 'district', label: 'อำเภอ', options: districts },
    { key: 'disaster_type', label: 'ประเภทภัย', options: ['น้ำท่วม', 'ภัยแล้ง', 'วาตภัย', 'ศัตรูพืชระบาด', 'อื่นๆ'] },
];

export default function Disasters() {
    return <CrudTable tableName="disasters" title="ข้อมูลภัยพิบัติทางการเกษตร" columns={columns} formFields={formFields} searchField="district" filterConfig={filterConfig} />;
}
