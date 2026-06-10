import { useState } from 'react';
import {
  Table,
  Tag,
  Select,
  Button,
  Empty,
  Modal,
  Form,
  notification,
  Popconfirm,
  Space,
} from 'antd';
import {
  ReloadOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { supabase } from '../../supabaseClient';
import { useApiCache } from '../../hooks/useApiCache';
import { useAuth } from '../../contexts/AuthContext';

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
  'เมืองนครปฐม',
  'กำแพงแสน',
  'นครชัยศรี',
  'ดอนตูม',
  'บางเลน',
  'สามพราน',
  'พุทธมณฑล',
  'อื่นๆ',
];

export default function UserManagement() {
  const [editModal, setEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [form] = Form.useForm();
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const {
    data: users = [],
    isLoading: loading,
    refetch: loadUsers,
  } = useApiCache('admin-users', fetchUsers);

  const handleEdit = (record) => {
    setEditingUser(record);
    form.setFieldsValue({
      role: record.role || 'viewer',
      department: record.department || undefined,
      full_name: record.full_name || '',
      position: record.position || '',
    });
    setEditModal(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error('ไม่พบ session สำหรับยืนยันสิทธิ์ผู้ดูแลระบบ');
      }

      const response = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          user_id: editingUser.id,
          full_name: values.full_name,
          role: values.role,
          department: values.department,
          position: values.position,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          'ไม่พบ API สำหรับแก้ไขผู้ใช้ กรุณาใช้งานผ่าน Netlify/Production หรือ netlify dev'
        );
      }

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'แก้ไขสิทธิ์ผู้ใช้ไม่สำเร็จ');
      }

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

  const handleDelete = async (record) => {
    if (record.id === currentUser?.id) {
      notification.warning({
        message: 'ไม่สามารถลบบัญชีตัวเองได้',
        description: 'กรุณาใช้งานบัญชีผู้ดูแลระบบอื่น หากต้องการลบบัญชีนี้',
        placement: 'topRight',
      });
      return;
    }

    setDeletingUserId(record.id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error('ไม่พบ session สำหรับยืนยันสิทธิ์ผู้ดูแลระบบ');
      }

      const response = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ user_id: record.id }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          'ไม่พบ API สำหรับลบผู้ใช้ กรุณาใช้งานผ่าน Netlify/Production หรือ netlify dev'
        );
      }

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'ลบผู้ใช้ไม่สำเร็จ');
      }

      notification.success({
        message: 'ลบผู้ใช้สำเร็จ',
        description: `ลบบัญชี ${record.email || payload.deleted_email || record.id} เรียบร้อยแล้ว`,
        placement: 'topRight',
      });
      loadUsers();
    } catch (err) {
      notification.error({
        message: 'ลบผู้ใช้ไม่สำเร็จ',
        description: err.message,
        placement: 'topRight',
      });
    } finally {
      setDeletingUserId(null);
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
      render: (val) =>
        val || <span style={{ color: '#8b949e' }}>ยังไม่ระบุ</span>,
    },
    {
      title: 'ตำแหน่ง',
      dataIndex: 'position',
      key: 'position',
      width: 180,
      render: (val) =>
        val || <span style={{ color: '#8b949e' }}>ยังไม่ระบุ</span>,
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
      render: (val) =>
        val || <span style={{ color: '#8b949e' }}>ยังไม่กำหนด</span>,
    },
    {
      title: 'จัดการ',
      key: 'actions',
      width: 190,
      align: 'center',
      render: (_, record) => {
        const isSelf = record.id === currentUser?.id;
        return (
          <Space size={8}>
            <Button
              size="small"
              type="primary"
              onClick={() => handleEdit(record)}
              className="add-btn"
            >
              แก้ไขสิทธิ์
            </Button>
            <Popconfirm
              title="ลบผู้ใช้นี้?"
              description={
                <span>
                  ระบบจะลบทั้งบัญชีเข้าสู่ระบบและโปรไฟล์ของ{' '}
                  <b>{record.email || 'ผู้ใช้นี้'}</b>
                </span>
              }
              okText="ลบผู้ใช้"
              cancelText="ยกเลิก"
              okButtonProps={{ danger: true }}
              disabled={isSelf}
              onConfirm={() => handleDelete(record)}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={isSelf}
                loading={deletingUserId === record.id}
              >
                ลบ
              </Button>
            </Popconfirm>
          </Space>
        );
      },
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
          <Button
            icon={<ReloadOutlined />}
            onClick={loadUsers}
            className="export-btn"
          >
            รีเฟรช
          </Button>
        </div>
      </div>

      {/* Role legend */}
      <div
        style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}
      >
        {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
          <div
            key={key}
            style={{
              padding: '8px 16px',
              background: '#fff',
              borderRadius: 8,
              border: '1px solid #e8ecf0',
              fontSize: 13,
            }}
          >
            <Tag color={cfg.color}>
              {cfg.icon} {cfg.label}
            </Tag>
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
        <div
          style={{
            marginBottom: 16,
            padding: '8px 12px',
            background: '#f6f8fa',
            borderRadius: 8,
          }}
        >
          <UserOutlined /> {editingUser?.email}
        </div>
        <Form form={form} layout="vertical">
          <Form.Item name="full_name" label="ชื่อ-นามสกุล">
            <input className="ant-input" placeholder="กรอกชื่อ-นามสกุล" />
          </Form.Item>
          <Form.Item name="position" label="ตำแหน่ง">
            <input className="ant-input" placeholder="กรอกตำแหน่งหน้าที่" />
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
              options={departments.map((d) => ({ label: d, value: d }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
