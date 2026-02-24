import { Form, Input, Select } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';
const columns = [
    { title: 'ชื่อเกษตรกร/ฟาร์ม', dataIndex: 'farm_name', key: 'farm_name', width: 200 },
    { title: 'ประเภท', dataIndex: 'cert_type', key: 'cert_type', width: 120 },
    { title: 'สินค้า', dataIndex: 'commodity', key: 'commodity', width: 140 },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    {
        title: 'สถานะ', dataIndex: 'status', key: 'status', width: 110, render: v => (
            <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: v === 'ผ่าน' ? '#dafbe1' : '#fff8c5', color: v === 'ผ่าน' ? '#1a7f37' : '#bf8700' }}>{v || '-'}</span>
        )
    },
];
const formFields = (
    <>
        <Form.Item name="farm_name" label="ชื่อเกษตรกร/ฟาร์ม" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="cert_type" label="ประเภทมาตรฐาน"><Select options={['GAP', 'เกษตรอินทรีย์', 'อื่นๆ'].map(d => ({ label: d, value: d }))} /></Form.Item>
        <Form.Item name="commodity" label="สินค้า"><Input /></Form.Item>
        <Form.Item name="district" label="อำเภอ"><Input /></Form.Item>
        <Form.Item name="status" label="สถานะ"><Select options={['ผ่าน', 'รอตรวจ', 'ไม่ผ่าน'].map(d => ({ label: d, value: d }))} /></Form.Item>
    </>
);
export default function Certifications() {
    return <CrudTable tableName="certifications" title="มาตรฐานสินค้าเกษตร (GAP/อินทรีย์)" columns={columns} formFields={formFields} searchField="farm_name" />;
}
