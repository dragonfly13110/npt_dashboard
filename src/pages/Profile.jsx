import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  notification,
  Tag,
  Spin,
} from 'antd';
import { UserOutlined, SaveOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

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

const ROLE_CONFIG = {
  admin: { label: 'ผู้ดูแลระบบ', color: 'red', icon: '👑' },
  editor: { label: 'แก้ไขได้', color: 'blue', icon: '✏️' },
  viewer: { label: 'ดูอย่างเดียว', color: 'default', icon: '👁️' },
};

export default function Profile() {
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (profile) {
      form.setFieldsValue({
        full_name: profile.full_name || '',
        position: profile.position || '',
        department: profile.department || undefined,
      });
    }
  }, [profile, form]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const values = await form.validateFields();

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: values.full_name || '',
          position: values.position || '',
          department: values.department || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      notification.success({
        message: 'บันทึกสำเร็จ',
        description: 'อัปเดตข้อมูลส่วนตัวของคุณเรียบร้อยแล้ว',
        placement: 'topRight',
      });

      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (err) {
      notification.error({
        message: 'เกิดข้อผิดพลาด',
        description: err.message || 'บันทึกข้อมูลไม่สำเร็จ',
        placement: 'topRight',
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '300px',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  const roleCfg = ROLE_CONFIG[profile?.role] || ROLE_CONFIG.viewer;

  return (
    <div className="crud-container" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="crud-header">
        <span className="crud-title">
          <UserOutlined style={{ marginRight: 8 }} />
          โปรไฟล์ส่วนตัว
        </span>
      </div>

      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #e8ecf0',
          background: '#fff',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: '1px solid #f0f2f5',
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
              {user?.email}
            </div>
            <div style={{ marginTop: 6 }}>
              สิทธิ์ในระบบ:{' '}
              <Tag
                color={roleCfg.color}
                style={{ fontSize: 12, padding: '2px 8px' }}
              >
                {roleCfg.icon} {roleCfg.label}
              </Tag>
            </div>
          </div>
        </div>

        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="full_name"
            label="ชื่อ-นามสกุล"
            rules={[{ required: true, message: 'กรุณากรอกชื่อ-นามสกุล' }]}
          >
            <Input
              size="large"
              placeholder="กรอกชื่อ-นามสกุลของคุณ"
              prefix={<UserOutlined style={{ color: '#8b949e' }} />}
            />
          </Form.Item>

          <Form.Item name="position" label="ตำแหน่ง">
            <Input
              size="large"
              placeholder="ระบุตำแหน่งหน้าที่การทำงาน เช่น นักวิชาการส่งเสริมการเกษตร"
            />
          </Form.Item>

          <Form.Item name="department" label="กลุ่มงาน / สถานที่ทำงาน">
            <Select
              size="large"
              placeholder="เลือกกลุ่มงานของคุณ"
              allowClear
              options={departments.map((d) => ({ label: d, value: d }))}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
              size="large"
              block
              className="add-btn"
            >
              บันทึกข้อมูลโปรไฟล์
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
