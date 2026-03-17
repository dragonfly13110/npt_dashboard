import { Form, Input, InputNumber, Select } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';

const columns = [
    { title: 'รหัส', dataIndex: 'code', key: 'code', width: 90, sorter: (a, b) => (Number(a.code) || 0) - (Number(b.code) || 0) },
    { title: 'แปลงใหญ่ปี', dataIndex: 'year', key: 'year', width: 100, align: 'center', sorter: (a, b) => (a.year || 0) - (b.year || 0) },
    { title: 'กลุ่มสินค้า', dataIndex: 'commodity_group', key: 'commodity_group', width: 120, sorter: (a, b) => String(a.commodity_group || '').localeCompare(String(b.commodity_group || ''), 'th') },
    { title: 'สินค้าหลัก', dataIndex: 'commodity', key: 'commodity', width: 120, sorter: (a, b) => String(a.commodity || '').localeCompare(String(b.commodity || ''), 'th') },
    { title: 'สินค้ารอง', dataIndex: 'secondary_commodity', key: 'secondary_commodity', width: 120, sorter: (a, b) => String(a.secondary_commodity || '').localeCompare(String(b.secondary_commodity || ''), 'th') },
    { title: 'ชื่อแปลงใหญ่', dataIndex: 'plot_name', key: 'plot_name', width: 220, sorter: (a, b) => String(a.plot_name || '').localeCompare(String(b.plot_name || ''), 'th') },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130, sorter: (a, b) => String(a.district || '').localeCompare(String(b.district || ''), 'th') },
    { title: 'ตำบล', dataIndex: 'subdistrict', key: 'subdistrict', width: 130, sorter: (a, b) => String(a.subdistrict || '').localeCompare(String(b.subdistrict || ''), 'th') },
    { title: 'โทรศัพท์', dataIndex: 'phone', key: 'phone', width: 130 },
    { title: 'เกษตรกร', dataIndex: 'member_count', key: 'member_count', width: 100, align: 'right', render: v => v?.toLocaleString() || '-', sorter: (a, b) => (a.member_count || 0) - (b.member_count || 0) },
    { title: 'พื้นที่(ไร่)', dataIndex: 'area_rai', key: 'area_rai', width: 110, align: 'right', render: v => v?.toLocaleString() || '-', sorter: (a, b) => (a.area_rai || 0) - (b.area_rai || 0) },
    { title: 'หน่วยงาน', dataIndex: 'agency', key: 'agency', width: 160, sorter: (a, b) => String(a.agency || '').localeCompare(String(b.agency || ''), 'th') },
];

const formFields = (
    <>
        <Form.Item name="code" label="รหัส"><Input /></Form.Item>
        <Form.Item name="year" label="แปลงใหญ่ปี"><InputNumber style={{ width: '100%' }} placeholder="2568" /></Form.Item>
        <Form.Item name="commodity_group" label="กลุ่มสินค้า"><Input placeholder="ข้าว, ผัก/สมุนไพร" /></Form.Item>
        <Form.Item name="commodity" label="สินค้าหลัก" rules={[{ required: true }]}><Input placeholder="ข้าว" /></Form.Item>
        <Form.Item name="secondary_commodity" label="สินค้ารอง"><Input placeholder="ข้าวโพดฝักอ่อน" /></Form.Item>
        <Form.Item name="plot_name" label="ชื่อแปลงใหญ่" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="district" label="อำเภอ">
            <Select
                placeholder="เลือกอำเภอ"
                allowClear
                options={[
                    'เมืองนครปฐม', 'นครชัยศรี', 'สามพราน', 'ดอนตูม',
                    'บางเลน', 'กำแพงแสน', 'พุทธมณฑล'
                ].map(d => ({ label: d, value: d }))}
            />
        </Form.Item>
        <Form.Item name="subdistrict" label="ตำบล"><Input /></Form.Item>
        <Form.Item name="phone" label="โทรศัพท์"><Input placeholder="08x-xxx-xxxx" /></Form.Item>
        <Form.Item name="member_count" label="จำนวนเกษตรกร"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="area_rai" label="พื้นที่ (ไร่)"><InputNumber style={{ width: '100%' }} step={0.01} /></Form.Item>
        <Form.Item name="agency" label="หน่วยงาน"><Input placeholder="กรมการข้าว, กรมส่งเสริมการเกษตร" /></Form.Item>
        <Form.Item name="notes" label="หมายเหตุ"><Input.TextArea rows={2} /></Form.Item>
    </>
);

const districts = ['เมืองนครปฐม', 'นครชัยศรี', 'สามพราน', 'ดอนตูม', 'บางเลน', 'กำแพงแสน', 'พุทธมณฑล'];

const filterConfig = [
    { key: 'year', label: 'แปลงใหญ่ปี', options: [2558, 2559, 2560, 2561, 2562, 2563, 2564, 2565, 2566, 2567, 2568, 2569, 2570] },
    { key: 'district', label: 'อำเภอ', options: districts },
    { key: 'commodity_group', label: 'กลุ่มสินค้า', options: ['ข้าว', 'ผัก/สมุนไพร', 'ไม้ผล', 'พืชไร่', 'ไม้ดอกไม้ประดับ', 'ไม้ยืนต้น', 'ปศุสัตว์', 'ประมง', 'แมลงเศรษฐกิจ'] },
    { key: 'agency', label: 'หน่วยงาน', options: ['กรมส่งเสริมการเกษตร', 'กรมการข้าว', 'กรมประมง', 'กรมปศุสัตว์', 'กรมหม่อนไหม', 'การยางแห่งประเทศไทย'] },
];

export default function LargePlots() {
    return <CrudTable tableName="large_plots" title="ข้อมูลแปลงใหญ่" columns={columns} formFields={formFields} searchField="plot_name" filterConfig={filterConfig} />;
}
