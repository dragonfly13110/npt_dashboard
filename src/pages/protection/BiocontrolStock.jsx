import { Form, Input, InputNumber, Select } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';
const columns = [
    { title: 'ชนิดชีวภัณฑ์', dataIndex: 'product_name', key: 'product_name', width: 200 },
    { title: 'แหล่งผลิต', dataIndex: 'source', key: 'source', width: 160 },
    { title: 'ปริมาณ (กก.)', dataIndex: 'quantity_kg', key: 'quantity_kg', width: 130, align: 'right', render: v => v?.toLocaleString() || '-' },
    { title: 'เดือน/ปี', dataIndex: 'period', key: 'period', width: 120 },
    { title: 'สถานะ', dataIndex: 'status', key: 'status', width: 100 },
];
const formFields = (
    <>
        <Form.Item name="product_name" label="ชนิดชีวภัณฑ์" rules={[{ required: true }]}>
            <Select options={['เชื้อไตรโคเดอร์มา', 'เชื้อบิวเวอร์เรีย', 'เชื้อเมตาไรเซียม', 'สารสกัดสะเดา', 'อื่นๆ'].map(d => ({ label: d, value: d }))} />
        </Form.Item>
        <Form.Item name="source" label="แหล่งผลิต"><Input placeholder="ศจช. อ.เมือง" /></Form.Item>
        <Form.Item name="quantity_kg" label="ปริมาณ (กก.)"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="period" label="เดือน/ปีผลิต"><Input placeholder="ม.ค. 2568" /></Form.Item>
        <Form.Item name="status" label="สถานะ"><Select options={['ในสต็อก', 'แจกจ่ายแล้ว', 'ผลิตเพิ่ม'].map(d => ({ label: d, value: d }))} /></Form.Item>
    </>
);
export default function BiocontrolStock() {
    return <CrudTable tableName="biocontrol_stock" title="สต็อกและการผลิตชีวภัณฑ์" columns={columns} formFields={formFields} searchField="product_name" />;
}
