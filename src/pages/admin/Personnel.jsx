import { Form, Input, Select, DatePicker } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';

const columns = [
    { title: 'ชื่อ-นามสกุล', dataIndex: 'full_name', key: 'full_name', width: 180 },
    { title: 'ตำแหน่ง', dataIndex: 'position', key: 'position', width: 160 },
    { title: 'กลุ่มงาน', dataIndex: 'department', key: 'department', width: 150 },
    { title: 'เบอร์โทร', dataIndex: 'phone', key: 'phone', width: 130 },
    { title: 'อีเมล', dataIndex: 'email', key: 'email', width: 200 },
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
        <Form.Item name="department" label="กลุ่มงาน" rules={[{ required: true, message: 'กรุณาเลือกกลุ่มงาน' }]}>
            <Select placeholder="เลือกกลุ่มงาน" options={departments.map(d => ({ label: d, value: d }))} />
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
        />
    );
}
