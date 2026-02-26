import { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Select, Button, Empty, Modal, Form, notification } from 'antd';
import {
    ReloadOutlined, UserOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import { supabase } from '../../supabaseClient';

const ROLE_CONFIG = {
    admin: { label: 'ผู้ดูแลระบบ', color: 'red', icon: '👑' },
    editor: { label: 'แก้ไขได้', color: 'blue', icon: '✏️' },
    viewer: { label: 'ดูอย่างเดียว', color: 'default', icon: '👁️' },
};

const departments = [
    'ฝ่ายบริหารทั่วไป',
    'กลุ่มยุทธศาสตร์และสารสนเทศ',
    'กลุ่มส่งเสริมและพัฒนาการผลิต',
    'กลุ่มส่งเสริมและพัฒนาเกษตรกร',
    'กลุ่มอารักขาพืช',
];

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editModal, setEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setUsers(data || []);
        } catch (err) {
            console.error('Error loading users:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    const handleEdit = (record) => {
        setEditingUser(record);
        form.setFieldsValue({
            role: record.role || 'viewer',
            department: record.department || undefined,
            full_name: record.full_name || '',
        });
        setEditModal(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const { error } = await supabase
                .from('profiles')
                .update(values)
                .eq('id', editingUser.id);
            if (error) throw error;
            notification.success({
                message: 'บันทึกสำเร็จ',
                description: 'อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว',
                placement: 'topRight',
            });
            setEditModal(false);
            loadUsers();
        } catch (err) {
            notification.error({
                message: 'เกิดข้อผิดพลาด',
                description: err.message,
                placement: 'topRight',
            });
        }
    };

    const columns = [
        {
            title: 'อีเมล',
            dataIndex: 'email',
            key: 'email',
            width: 250,
        },
        {
            title: 'ชื่อ',
            dataIndex: 'full_name',
            key: 'full_name',
            width: 180,
            render: (val) => val || <span style={{ color: '#8b949e' }}>ยังไม่ระบุ</span>,
        },
        {
            title: 'สิทธิ์',
            dataIndex: 'role',
            key: 'role',
            width: 150,
            render: (val) => {
                const cfg = ROLE_CONFIG[val] || ROLE_CONFIG.viewer;
                return (
                    <Tag color={cfg.color} style={{ fontSize: 13 }}>
                        {cfg.icon} {cfg.label}
                    </Tag>
                );
            },
        },
        {
            title: 'กลุ่มงาน',
            dataIndex: 'department',
            key: 'department',
            width: 220,
            render: (val) => val || <span style={{ color: '#8b949e' }}>ยังไม่กำหนด</span>,
        },
        {
            title: 'จัดการ',
            key: 'actions',
            width: 100,
            align: 'center',
            render: (_, record) => (
                <Button
                    size="small"
                    type="primary"
                    onClick={() => handleEdit(record)}
                    className="add-btn"
                >
                    แก้ไขสิทธิ์
                </Button>
            ),
        },
    ];

    return (
        <div className="crud-container">
            <div className="crud-header">
                <div className="crud-header-left">
                    <span className="crud-title">
                        <SafetyCertificateOutlined style={{ marginRight: 8 }} />
                        จัดการสิทธิ์ผู้ใช้
                    </span>
                    <Tag className="crud-count">{users.length} คน</Tag>
                </div>
                <div className="crud-header-right">
                    <Button icon={<ReloadOutlined />} onClick={loadUsers} className="export-btn">
                        รีเฟรช
                    </Button>
                </div>
            </div>

            {/* Role legend */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                    <div key={key} style={{
                        padding: '8px 16px',
                        background: '#fff',
                        borderRadius: 8,
                        border: '1px solid #e8ecf0',
                        fontSize: 13,
                    }}>
                        <Tag color={cfg.color}>{cfg.icon} {cfg.label}</Tag>
                        <span style={{ color: '#656d76', marginLeft: 4 }}>
                            {key === 'admin' && '— ทำได้ทุกอย่าง + จัดการผู้ใช้'}
                            {key === 'editor' && '— เพิ่ม/แก้ไขได้ ลบไม่ได้'}
                            {key === 'viewer' && '— ดูข้อมูลอย่างเดียว'}
                        </span>
                    </div>
                ))}
            </div>

            <Table
                dataSource={users}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 20, showTotal: (t) => `ทั้งหมด ${t} คน` }}
                locale={{ emptyText: <Empty description="ยังไม่มีผู้ใช้" /> }}
                scroll={{ x: 'max-content' }}
            />

            <Modal
                title="แก้ไขสิทธิ์ผู้ใช้"
                open={editModal}
                onCancel={() => setEditModal(false)}
                onOk={handleSave}
                okText="บันทึก"
                cancelText="ยกเลิก"
                width={500}
                className="crud-modal"
                destroyOnClose
            >
                <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f6f8fa', borderRadius: 8 }}>
                    <UserOutlined /> {editingUser?.email}
                </div>
                <Form form={form} layout="vertical">
                    <Form.Item name="full_name" label="ชื่อ-นามสกุล">
                        <input className="ant-input" placeholder="กรอกชื่อ-นามสกุล" />
                    </Form.Item>
                    <Form.Item name="role" label="สิทธิ์" rules={[{ required: true }]}>
                        <Select
                            options={[
                                { label: '👑 ผู้ดูแลระบบ (admin)', value: 'admin' },
                                { label: '✏️ แก้ไขได้ (editor)', value: 'editor' },
                                { label: '👁️ ดูอย่างเดียว (viewer)', value: 'viewer' },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item name="department" label="กลุ่มงาน">
                        <Select
                            placeholder="เลือกกลุ่มงาน"
                            allowClear
                            options={departments.map(d => ({ label: d, value: d }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
