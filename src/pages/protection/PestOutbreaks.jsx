import { Form, Input, InputNumber, Select } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';

const plotTypes = ['พื้นที่เสี่ยง', 'ศจช.', 'พื้นที่เฝ้าระวัง', 'ไม่ระบุ'];

const columns = [
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 110, ellipsis: true },
    { title: 'ตำบล', dataIndex: 'subdistrict', key: 'subdistrict', width: 100, ellipsis: true },
    { title: 'ม.', dataIndex: 'village_no', key: 'village_no', width: 45, align: 'center' },
    { title: 'เจ้าของแปลง', dataIndex: 'owner_name', key: 'owner_name', width: 150, ellipsis: true },
    { title: 'Zone', dataIndex: 'zone', key: 'zone', width: 55, align: 'center' },
    { title: 'X', dataIndex: 'coord_x', key: 'coord_x', width: 80, align: 'right', render: v => v?.toLocaleString() || '-' },
    { title: 'Y', dataIndex: 'coord_y', key: 'coord_y', width: 85, align: 'right', render: v => v?.toLocaleString() || '-' },
    { title: 'ชนิดพืช', dataIndex: 'crop_type', key: 'crop_type', width: 80, ellipsis: true },
    { title: 'พันธุ์', dataIndex: 'variety', key: 'variety', width: 80, ellipsis: true },
    { title: 'ไร่', dataIndex: 'planted_area_rai', key: 'planted_area_rai', width: 55, align: 'right', render: v => v?.toLocaleString() || '-' },
    { title: 'วันที่ปลูก', dataIndex: 'planting_date', key: 'planting_date', width: 95, ellipsis: true },
    { title: 'ประเภทแปลง', dataIndex: 'plot_type', key: 'plot_type', width: 100, ellipsis: true },
    {
        title: 'สถานะ', dataIndex: 'crop_status', key: 'crop_status', width: 80,
        render: v => {
            const c = {
                'สมบูรณ์': '#1a7f37',
                'ปกติ': '#1a7f37',
                'เสียหาย': '#cf222e',
                'กำลังเติบโต': '#bf8700',
            };
            return <span style={{ fontWeight: 600, color: c[v] || '#656d76' }}>{v || '-'}</span>;
        }
    },
];

const districts = ['เมืองนครปฐม', 'นครชัยศรี', 'สามพราน', 'ดอนตูม', 'บางเลน', 'กำแพงแสน', 'พุทธมณฑล'];

const formFields = (
    <>
        <Form.Item name="province" label="จังหวัด" initialValue="นครปฐม"><Input /></Form.Item>
        <Form.Item name="district" label="อำเภอ" rules={[{ required: true }]}>
            <Select options={districts.map(d => ({ label: d, value: d }))} placeholder="เลือกอำเภอ" />
        </Form.Item>
        <Form.Item name="subdistrict" label="ตำบล"><Input /></Form.Item>
        <Form.Item name="village_no" label="หมู่ที่"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
        <Form.Item name="owner_name" label="ชื่อ-สกุล เจ้าของแปลง" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="zone" label="Zone"><Input placeholder="เช่น 47P" /></Form.Item>
        <Form.Item name="coord_x" label="พิกัด X"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="coord_y" label="พิกัด Y"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="crop_type" label="ชนิดพืช" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="variety" label="พันธุ์"><Input /></Form.Item>
        <Form.Item name="planted_area_rai" label="พื้นที่ปลูก (ไร่)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
        <Form.Item name="planting_date" label="วันที่ปลูก"><Input placeholder="เช่น 1/1/2024" /></Form.Item>
        <Form.Item name="plot_type" label="ประเภทแปลง">
            <Select options={plotTypes.map(d => ({ label: d, value: d }))} placeholder="เลือกประเภทแปลง" allowClear />
        </Form.Item>
        <Form.Item name="crop_status" label="สถานะพืชที่ปลูก"><Input placeholder="เช่น สมบูรณ์, เสียหาย" /></Form.Item>
    </>
);

const filterConfig = [
    { key: 'district', label: 'อำเภอ', options: districts },
    { key: 'crop_type', label: 'ชนิดพืช', options: ['ข้าว', 'มะพร้าว', 'อ้อย', 'กล้วย', 'มันสำปะหลัง'] },
    { key: 'plot_type', label: 'ประเภทแปลง', options: plotTypes },
];

export default function PestOutbreaks() {
    return <CrudTable tableName="forecast_plots" title="แปลงพยากรณ์" columns={columns} formFields={formFields} searchField="owner_name" filterConfig={filterConfig} />;
}
