import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Select,
  Space,
  notification,
} from 'antd';
import { BellOutlined, StopOutlined } from '@ant-design/icons';
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '../../services/pushNotifications';

const DISTRICTS = [
  'เมืองนครปฐม',
  'กำแพงแสน',
  'นครชัยศรี',
  'ดอนตูม',
  'บางเลน',
  'สามพราน',
  'พุทธมณฑล',
];

export default function NotificationSettings() {
  const [types, setTypes] = useState(['outbreak', 'hotspot']);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(false);
  const supported = isPushSupported();

  const subscribe = async () => {
    setLoading(true);
    try {
      await subscribeToPush({
        outbreak: types.includes('outbreak'),
        hotspot: types.includes('hotspot'),
        districts,
      });
      notification.success({ message: 'เปิดการแจ้งเตือนแล้ว' });
    } catch (error) {
      notification.error({
        message: 'เปิดการแจ้งเตือนไม่สำเร็จ',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      await unsubscribeFromPush();
      notification.success({ message: 'ยกเลิกการแจ้งเตือนแล้ว' });
    } catch (error) {
      notification.error({
        message: 'ยกเลิกไม่สำเร็จ',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="การแจ้งเตือนภัยการเกษตร"
      style={{ marginTop: 16, borderRadius: 12 }}
    >
      {!supported && (
        <Alert
          type="warning"
          showIcon
          message="เบราว์เซอร์นี้ไม่รองรับ Web Push"
        />
      )}
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Checkbox.Group
          value={types}
          onChange={setTypes}
          options={[
            { label: 'แจ้งเตือนการระบาด', value: 'outbreak' },
            { label: 'แจ้งเตือนจุดเผา', value: 'hotspot' },
          ]}
        />
        <Select
          mode="multiple"
          allowClear
          value={districts}
          onChange={setDistricts}
          placeholder="ทุกอำเภอ"
          options={DISTRICTS.map((district) => ({
            label: district,
            value: district,
          }))}
          style={{ width: '100%' }}
        />
        <Space wrap>
          <Button
            type="primary"
            icon={<BellOutlined />}
            disabled={!supported || types.length === 0}
            loading={loading}
            onClick={subscribe}
          >
            เปิดการแจ้งเตือน
          </Button>
          <Button
            icon={<StopOutlined />}
            loading={loading}
            onClick={unsubscribe}
          >
            ยกเลิกการแจ้งเตือน
          </Button>
        </Space>
      </Space>
    </Card>
  );
}
