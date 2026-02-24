import { Form, Input, Select, InputNumber, DatePicker } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';

const columns = [
    { title: 'ชื่อรายการ', dataIndex: 'name', key: 'name', width: 220 },
    { title: 'ประเภท', dataIndex: 'category', key: 'category', width: 140 },
    { title: 'หมายเลข/ทะเบียน', dataIndex: 'serial_number', key: 'serial_number', width: 160 },
    { title: 'สถานที่', dataIndex: 'location', key: 'location', width: 140 },
    {
        title: 'สถานะ', dataIndex: 'condition', key: 'condition', width: 100,
        render: (val) => {
            const colors = { 'ใช้งานได้': '#dafbe1', 'ชำรุด': '#fff8c5', 'จำหน่าย': '#ffebe9' };
            const textColors = { 'ใช้งานได้': '#1a7f37', 'ชำรุด': '#bf8700', 'จำหน่าย': '#cf222e' };
            return (
                <span style={{
                    padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                    background: colors[val] || '#f6f8fa', color: textColors[val] || '#656d76'
                }}>
                    {val || '-'}
                </span>
            );
        }
    },
    {
        title: 'มูลค่า (บาท)', dataIndex: 'value', key: 'value', width: 130, align: 'right',
        render: (val) => val ? Number(val).toLocaleString() : '-'
    },
];

const formFields = (
    <>
        <Form.Item name="name" label="ชื่อรายการ" rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}>
            <Input placeholder="รถยนต์ราชการ Toyota Hilux" />
        </Form.Item>
        <Form.Item name="category" label="ประเภท" rules={[{ required: true, message: 'กรุณาเลือกประเภท' }]}>
            <Select placeholder="เลือกประเภท" options={[
                { label: 'รถยนต์ราชการ', value: 'รถยนต์ราชการ' },
                { label: 'คอมพิวเตอร์', value: 'คอมพิวเตอร์' },
                { label: 'เครื่องพิมพ์', value: 'เครื่องพิมพ์' },
                { label: 'เครื่องใช้สำนักงาน', value: 'เครื่องใช้สำนักงาน' },
                { label: 'อุปกรณ์การเกษตร', value: 'อุปกรณ์การเกษตร' },
                { label: 'อื่นๆ', value: 'อื่นๆ' },
            ]} />
        </Form.Item>
        <Form.Item name="serial_number" label="หมายเลข/ทะเบียน">
            <Input placeholder="กจ 1234 นฐ" />
        </Form.Item>
        <Form.Item name="location" label="สถานที่เก็บ/ใช้งาน">
            <Input placeholder="สำนักงานเกษตรจังหวัด ชั้น 1" />
        </Form.Item>
        <Form.Item name="condition" label="สถานะ">
            <Select placeholder="เลือกสถานะ" options={[
                { label: 'ใช้งานได้', value: 'ใช้งานได้' },
                { label: 'ชำรุด', value: 'ชำรุด' },
                { label: 'จำหน่าย', value: 'จำหน่าย' },
            ]} />
        </Form.Item>
        <Form.Item name="value" label="มูลค่า (บาท)">
            <InputNumber style={{ width: '100%' }} placeholder="500000" formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
        </Form.Item>
        <Form.Item name="notes" label="หมายเหตุ">
            <Input.TextArea rows={2} placeholder="รายละเอียดเพิ่มเติม" />
        </Form.Item>
    </>
);

export default function Assets() {
    return (
        <CrudTable
            tableName="assets"
            title="พัสดุและครุภัณฑ์"
            columns={columns}
            formFields={formFields}
            searchField="name"
        />
    );
}
