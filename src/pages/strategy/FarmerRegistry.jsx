import { Form, Input, Select, InputNumber } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';

const columns = [
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'จำนวนครัวเรือน', dataIndex: 'household_count', key: 'household_count', width: 140, align: 'right', render: v => v?.toLocaleString() || '-' },
    { title: 'พื้นที่เกษตร (ไร่)', dataIndex: 'farm_area_rai', key: 'farm_area_rai', width: 150, align: 'right', render: v => v?.toLocaleString() || '-' },
    { title: 'พืชหลัก', dataIndex: 'main_crop', key: 'main_crop', width: 150 },
    { title: 'ปีข้อมูล', dataIndex: 'data_year', key: 'data_year', width: 100, align: 'center' },
];

const formFields = (
    <>
        <Form.Item name="district" label="อำเภอ" rules={[{ required: true }]}>
            <Select placeholder="เลือกอำเภอ" options={[
                'เมืองนครปฐม', 'นครชัยศรี', 'สามพราน', 'ดอนตูม', 'บางเลน', 'กำแพงแสน', 'พุทธมณฑล'
            ].map(d => ({ label: d, value: d }))} />
        </Form.Item>
        <Form.Item name="household_count" label="จำนวนครัวเรือนเกษตรกร"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="farm_area_rai" label="พื้นที่เกษตร (ไร่)"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="main_crop" label="พืชหลัก"><Input placeholder="ข้าว, มะพร้าว" /></Form.Item>
        <Form.Item name="data_year" label="ปีข้อมูล"><InputNumber style={{ width: '100%' }} placeholder="2568" /></Form.Item>
    </>
);

const districts = ['เมืองนครปฐม', 'นครชัยศรี', 'สามพราน', 'ดอนตูม', 'บางเลน', 'กำแพงแสน', 'พุทธมณฑล'];

const filterConfig = [
    { key: 'district', label: 'อำเภอ', options: districts },
];

export default function FarmerRegistry() {
    return <CrudTable tableName="farmer_registry" title="ทะเบียนเกษตรกร" columns={columns} formFields={formFields} searchField="district" filterConfig={filterConfig} />;
}
