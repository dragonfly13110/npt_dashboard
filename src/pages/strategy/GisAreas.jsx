import { Form, Input, InputNumber, Select } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';
const columns = [
    { title: 'ชื่อแปลง/พื้นที่', dataIndex: 'area_name', key: 'area_name', width: 200 },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'ละติจูด', dataIndex: 'latitude', key: 'latitude', width: 120 },
    { title: 'ลองจิจูด', dataIndex: 'longitude', key: 'longitude', width: 120 },
    { title: 'ประเภท', dataIndex: 'area_type', key: 'area_type', width: 140 },
    { title: 'พื้นที่ (ไร่)', dataIndex: 'area_rai', key: 'area_rai', width: 110, align: 'right', render: v => v?.toLocaleString() || '-' },
];
const formFields = (
    <>
        <Form.Item name="area_name" label="ชื่อแปลง/พื้นที่" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="district" label="อำเภอ"><Input /></Form.Item>
        <Form.Item name="latitude" label="ละติจูด"><InputNumber style={{ width: '100%' }} step={0.000001} /></Form.Item>
        <Form.Item name="longitude" label="ลองจิจูด"><InputNumber style={{ width: '100%' }} step={0.000001} /></Form.Item>
        <Form.Item name="area_type" label="ประเภทการใช้ที่ดิน"><Input placeholder="นาข้าว, สวนผลไม้" /></Form.Item>
        <Form.Item name="area_rai" label="พื้นที่ (ไร่)"><InputNumber style={{ width: '100%' }} /></Form.Item>
    </>
);
export default function GisAreas() {
    return <CrudTable tableName="gis_areas" title="ข้อมูลพิกัด GIS" columns={columns} formFields={formFields} searchField="area_name" />;
}
