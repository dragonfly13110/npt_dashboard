import { Form, Input, InputNumber } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';

const columns = [
    { title: 'ชื่อกลุ่ม', dataIndex: 'group_name', key: 'group_name', width: 220 },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'ประธาน', dataIndex: 'chairman', key: 'chairman', width: 150 },
    { title: 'สมาชิก', dataIndex: 'member_count', key: 'member_count', width: 100, align: 'right' },
];

const formFields = (
    <>
        <Form.Item name="group_name" label="ชื่อกลุ่ม" rules={[{ required: true }]}>
            <Input />
        </Form.Item>
        <Form.Item name="district" label="อำเภอ">
            <Input />
        </Form.Item>
        <Form.Item name="chairman" label="ประธาน">
            <Input />
        </Form.Item>
        <Form.Item name="member_count" label="จำนวนสมาชิก">
            <InputNumber style={{ width: '100%' }} />
        </Form.Item>
    </>
);

export function HousewifeFarmerGroups() {
    return (
        <CrudTable
            tableName="housewife_farmer_groups"
            title="กลุ่มแม่บ้านเกษตรกร"
            columns={columns}
            formFields={formFields}
            searchField="group_name"
            searchFields={['group_name', 'district', 'chairman']}
        />
    );
}

export function YoungFarmerGroups() {
    return (
        <CrudTable
            tableName="young_farmer_groups"
            title="กลุ่มยุวเกษตรกร"
            columns={columns}
            formFields={formFields}
            searchField="group_name"
            searchFields={['group_name', 'district', 'chairman']}
        />
    );
}

export default HousewifeFarmerGroups;
