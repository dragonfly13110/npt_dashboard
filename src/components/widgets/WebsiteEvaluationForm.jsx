import React, { useState } from 'react';
import { Form, Radio, Rate, Input, Button, message, Space } from 'antd';
import { LikeOutlined, FormOutlined, SendOutlined } from '@ant-design/icons';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

export default function WebsiteEvaluationForm({ onSuccess }) {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values) => {
    // 1. Honeypot check to block bot spammers
    if (values.honeypot) {
      message.success('ขอบคุณสำหรับความคิดเห็นและการประเมินเว็บไซต์ของคุณค่ะ! 🙏');
      if (onSuccess) onSuccess();
      return;
    }

    // 2. Cooldown check (24 hours) to prevent double submissions from the same browser
    const lastSubmission = localStorage.getItem('npt_website_evaluation_submitted');
    if (lastSubmission) {
      const diff = Date.now() - parseInt(lastSubmission);
      const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours
      if (diff < cooldownPeriod) {
        message.warning('คุณเคยส่งประเมินความพึงพอใจแล้วในวันนี้ ขอบคุณมากค่ะ! 🙏');
        if (onSuccess) onSuccess();
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        user_type: values.user_type,
        rating_usability: values.rating_usability,
        rating_information: values.rating_information,
        rating_speed: values.rating_speed,
        comments: values.comments || null,
        user_id: user?.id || null,
      };

      const { error } = await supabase
        .from('website_evaluations')
        .insert([payload]);

      if (error) throw error;

      // Save submission time to localStorage
      localStorage.setItem('npt_website_evaluation_submitted', Date.now().toString());

      message.success('ขอบคุณสำหรับความคิดเห็นและการประเมินเว็บไซต์ของคุณค่ะ! 🙏');
      form.resetFields();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error submitting evaluation:', err);
      message.error('ไม่สามารถส่งข้อมูลการประเมินได้ กรุณาลองใหม่อีกครั้งค่ะ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Kanit', 'Athiti', sans-serif" }}>
      <p
        style={{
          color: '#64748b',
          fontSize: '14px',
          marginBottom: '24px',
          textAlign: 'center',
        }}
      >
        ความคิดเห็นของคุณมีความหมายอย่างยิ่ง
        เพื่อการพัฒนาและปรับปรุงระบบฐานข้อมูลกลาง สำนักงานเกษตรจังหวัดนครปฐม
        ให้ดียิ่งขึ้นค่ะ
      </p>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          user_type: 'เกษตรกร',
          rating_usability: 5,
          rating_information: 5,
          rating_speed: 5,
          honeypot: '',
        }}
      >
        {/* Honeypot field (hidden from real users, but filled by bots) */}
        <Form.Item name="honeypot" style={{ display: 'none' }}>
          <Input tabIndex={-1} autoComplete="off" />
        </Form.Item>

        {/* User Type */}
        <Form.Item
          name="user_type"
          label={
            <strong style={{ fontSize: '15px', color: '#1e293b' }}>
              คุณคือผู้ใช้งานกลุ่มใด?
            </strong>
          }
          rules={[{ required: true, message: 'กรุณาเลือกประเภทผู้ใช้งาน' }]}
        >
          <Radio.Group style={{ width: '100%' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '10px',
                marginTop: '8px',
              }}
            >
              {[
                'เกษตรกร',
                'เจ้าหน้าที่เกษตร',
                'ผู้ประกอบการ',
                'นักเรียนนักศึกษา',
                'อื่น ๆ',
              ].map((role) => (
                <Radio.Button
                  key={role}
                  value={role}
                  style={{
                    textAlign: 'center',
                    height: '42px',
                    lineHeight: '40px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  {role}
                </Radio.Button>
              ))}
            </div>
          </Radio.Group>
        </Form.Item>

        <hr
          style={{
            border: '0',
            borderTop: '1px solid #f1f5f9',
            margin: '24px 0',
          }}
        />

        {/* Ratings Title */}
        <div style={{ marginBottom: '16px' }}>
          <strong style={{ fontSize: '15px', color: '#1e293b' }}>
            หัวข้อประเมินความพึงพอใจ (1-5 ดาว)
          </strong>
        </div>

        {/* Rating 1 */}
        <Form.Item
          name="rating_usability"
          label={
            <span style={{ fontSize: '14px', color: '#475569' }}>
              1. ความง่ายและสะดวกในการใช้งานและการจัดวางหน้าจอ
            </span>
          }
          rules={[{ required: true, message: 'กรุณาให้คะแนนความพึงพอใจ' }]}
        >
          <Rate style={{ fontSize: '28px', color: '#f59e0b' }} />
        </Form.Item>

        {/* Rating 2 */}
        <Form.Item
          name="rating_information"
          label={
            <span style={{ fontSize: '14px', color: '#475569' }}>
              2. ความถูกต้องและเป็นประโยชน์ของข้อมูลด้านการเกษตร
            </span>
          }
          rules={[{ required: true, message: 'กรุณาให้คะแนนความพึงพอใจ' }]}
        >
          <Rate style={{ fontSize: '28px', color: '#f59e0b' }} />
        </Form.Item>

        {/* Rating 3 */}
        <Form.Item
          name="rating_speed"
          label={
            <span style={{ fontSize: '14px', color: '#475569' }}>
              3. ความรวดเร็วและการตอบสนองของระบบเว็บไซต์
            </span>
          }
          rules={[{ required: true, message: 'กรุณาให้คะแนนความพึงพอใจ' }]}
        >
          <Rate style={{ fontSize: '28px', color: '#f59e0b' }} />
        </Form.Item>

        <hr
          style={{
            border: '0',
            borderTop: '1px solid #f1f5f9',
            margin: '24px 0',
          }}
        />

        {/* Comments */}
        <Form.Item
          name="comments"
          label={
            <strong style={{ fontSize: '15px', color: '#1e293b' }}>
              ข้อคิดเห็นหรือข้อเสนอแนะอื่น ๆ
            </strong>
          }
        >
          <Input.TextArea
            rows={4}
            placeholder="เขียนความคิดเห็นของคุณที่นี่..."
            maxLength={1000}
            showCount
            style={{ borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </Form.Item>

        {/* Action Buttons */}
        <Form.Item
          style={{ marginBottom: 0, marginTop: '24px', textAlign: 'right' }}
        >
          <Space>
            <Button
              onClick={onSuccess}
              style={{
                borderRadius: '8px',
                height: '42px',
                padding: '0 24px',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              ยกเลิก
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              icon={<SendOutlined />}
              style={{
                borderRadius: '8px',
                height: '42px',
                padding: '0 32px',
                fontSize: '14px',
                fontWeight: 600,
                background: '#16a34a',
                borderColor: '#16a34a',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)',
              }}
            >
              ส่งประเมิน
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
}
