import { useEffect } from 'react';
import { Form, Input, InputNumber } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';

const columns = [
    { title: 'ชื่อแหล่งท่องเที่ยว', dataIndex: 'spot_name', key: 'spot_name', width: 220 },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'ประเภท', dataIndex: 'spot_type', key: 'spot_type', width: 140 },
    { title: 'ผู้ประสานงาน', dataIndex: 'contact_person', key: 'contact_person', width: 150 },
    { title: 'เบอร์โทร', dataIndex: 'phone', key: 'phone', width: 130 },
];

const formFields = (
    <>
        <Form.Item name="spot_name" label="ชื่อแหล่งท่องเที่ยว" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="district" label="อำเภอ"><Input /></Form.Item>
        <Form.Item name="spot_type" label="ประเภท"><Input placeholder="สวนเกษตร, ฟาร์มสเตย์" /></Form.Item>
        <Form.Item name="contact_person" label="ผู้ประสานงาน"><Input /></Form.Item>
        <Form.Item name="phone" label="เบอร์โทร"><Input /></Form.Item>
        <Form.Item name="latitude" label="ละติจูด"><InputNumber style={{ width: '100%' }} step={0.000001} /></Form.Item>
        <Form.Item name="longitude" label="ลองจิจูด"><InputNumber style={{ width: '100%' }} step={0.000001} /></Form.Item>
        <Form.Item name="description" label="รายละเอียด"><Input.TextArea rows={2} /></Form.Item>
    </>
);

export default function AgriTourism() {
    useEffect(() => {
        document.title = 'ท่องเที่ยวเชิงเกษตรนครปฐม | ศูนย์ข้อมูลการเกษตรนครปฐม';
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', 'รวมแหล่งท่องเที่ยวเชิงเกษตรในจังหวัดนครปฐม พร้อมข้อมูลสถานที่ กิจกรรม และช่องทางติดต่อ');
    }, []);

    return <CrudTable tableName="agri_tourism" title="แหล่งท่องเที่ยวเชิงเกษตร" columns={columns} formFields={formFields} searchField="spot_name" />;
}
