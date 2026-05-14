import { Form, Input, Select, DatePicker } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';

const columns = [
    { title: 'ชื่อ-นามสกุล', dataIndex: 'full_name', key: 'full_name', width: 220 },
    { title: 'ตำแหน่ง', dataIndex: 'position', key: 'position', width: 200 },
    { title: 'ระดับหน่วยงาน', dataIndex: 'office_type', key: 'office_type', width: 130, render: (v) => v === 'Provincial' ? 'ระดับจังหวัด' : (v === 'District' ? 'ระดับอำเภอ' : v) },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'กลุ่มงาน/ฝ่าย', dataIndex: 'department', key: 'department', width: 200 },
    { title: 'เบอร์โทร', dataIndex: 'phone', key: 'phone', width: 130 },
    { title: 'อีเมล', dataIndex: 'email', key: 'email', width: 180 },
    {
        title: 'สถานะ', dataIndex: 'status', key: 'status', width: 100,
        render: (val) => (
            <span style={{
                padding: '2px 10px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
                background: val === 'ปฏิบัติงาน' ? '#dafbe1' : '#fff8c5',
                color: val === 'ปฏิบัติงาน' ? '#1a7f37' : '#bf8700'
            }}>
                {val || 'ปฏิบัติงาน'}
            </span>
        )
    },
];

const departments = [
    'ฝ่ายบริหารทั่วไป',
    'กลุ่มยุทธศาสตร์และสารสนเทศ',
    'กลุ่มส่งเสริมและพัฒนาการผลิต',
    'กลุ่มส่งเสริมและพัฒนาเกษตรกร',
    'กลุ่มอารักขาพืช',
];

const formFields = (
    <>
        <Form.Item name="full_name" label="ชื่อ-นามสกุล" rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}>
            <Input placeholder="นายสมชาย ใจดี" />
        </Form.Item>
        <Form.Item name="position" label="ตำแหน่ง" rules={[{ required: true, message: 'กรุณากรอกตำแหน่ง' }]}>
            <Input placeholder="นักวิชาการส่งเสริมการเกษตรชำนาญการ" />
        </Form.Item>
        <Form.Item name="department" label="กลุ่มงาน">
            <Input placeholder="เช่น กลุ่มส่งเสริมและพัฒนาเกษตรกร" />
        </Form.Item>
        <Form.Item name="office_type" label="ระดับหน่วยงาน">
            <Select placeholder="เลือกหน่วยงาน" options={[
                { label: 'ระดับจังหวัด', value: 'Provincial' },
                { label: 'ระดับอำเภอ', value: 'District' }
            ]} />
        </Form.Item>
        <Form.Item name="district" label="อำเภอ (ถ้าอยู่ระดับอำเภอ)">
            <Input placeholder="เช่น เมืองนครปฐม" />
        </Form.Item>
        <Form.Item name="province" label="จังหวัด">
            <Input placeholder="นครปฐม" />
        </Form.Item>
        <Form.Item name="phone" label="เบอร์โทร">
            <Input placeholder="08x-xxx-xxxx" />
        </Form.Item>
        <Form.Item name="email" label="อีเมล">
            <Input placeholder="email@doae.go.th" />
        </Form.Item>
        <Form.Item name="status" label="สถานะ">
            <Select placeholder="เลือกสถานะ" options={[
                { label: 'ปฏิบัติงาน', value: 'ปฏิบัติงาน' },
                { label: 'ลาศึกษาต่อ', value: 'ลาศึกษาต่อ' },
                { label: 'ช่วยราชการ', value: 'ช่วยราชการ' },
                { label: 'เกษียณ', value: 'เกษียณ' },
            ]} />
        </Form.Item>
    </>
);

export default function Personnel() {
    return (
        <CrudTable
            tableName="personnel"
            title="ข้อมูลบุคลากร"
            columns={columns}
            formFields={formFields}
            searchField="full_name"
            searchFields={['full_name', 'department', 'district', 'position']}
        />
    );
}
