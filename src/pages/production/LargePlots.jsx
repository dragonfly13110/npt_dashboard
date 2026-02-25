import { Form, Input, InputNumber, Select } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';
const columns = [
    { title: 'ชื่อแปลงใหญ่', dataIndex: 'plot_name', key: 'plot_name', width: 200 },
    { title: 'สินค้า', dataIndex: 'commodity', key: 'commodity', width: 140 },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'จำนวนสมาชิก', dataIndex: 'member_count', key: 'member_count', width: 130, align: 'right', render: v => v?.toLocaleString() || '-' },
    { title: 'พื้นที่ (ไร่)', dataIndex: 'area_rai', key: 'area_rai', width: 120, align: 'right', render: v => v?.toLocaleString() || '-' },
    { title: 'ปี', dataIndex: 'year', key: 'year', width: 80, align: 'center' },
];
const formFields = (
    <>
        <Form.Item name="plot_name" label="ชื่อแปลงใหญ่" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="commodity" label="สินค้า/พืช" rules={[{ required: true }]}><Input placeholder="ข้าว, มะพร้าวน้ำหอม" /></Form.Item>
        <Form.Item name="district" label="อำเภอ"><Input /></Form.Item>
        <Form.Item name="member_count" label="จำนวนสมาชิก"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="area_rai" label="พื้นที่ (ไร่)"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="year" label="ปี"><InputNumber style={{ width: '100%' }} placeholder="2568" /></Form.Item>
    </>
);
const districts = ['เมืองนครปฐม', 'นครชัยศรี', 'สามพราน', 'ดอนตูม', 'บางเลน', 'กำแพงแสน', 'พุทธมณฑล'];

const filterConfig = [
    { key: 'district', label: 'อำเภอ', options: districts },
];

export default function LargePlots() {
    return <CrudTable tableName="large_plots" title="ข้อมูลแปลงใหญ่" columns={columns} formFields={formFields} searchField="plot_name" filterConfig={filterConfig} />;
}
