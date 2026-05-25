import { useState } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Row, Col, Space, Button, message } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import CrudTable from '../../components/DataTable/CrudTable';
import { useAuth } from '../../contexts/AuthContext';
import HotspotWidget from '../../components/widgets/HotspotWidget';

const columns = [
    { title: 'วันที่พบ', dataIndex: 'acq_date', key: 'acq_date', width: 110, sorter: (a, b) => new Date(a.acq_date) - new Date(b.acq_date) },
    { title: 'เวลา', dataIndex: 'acq_time', key: 'acq_time', width: 80, render: v => v ? `${v.substring(0,2)}:${v.substring(2)} น.` : '-' },
    { title: 'ความน่าเชื่อถือ', dataIndex: 'confidence', key: 'confidence', width: 120, render: v => {
        const conf = String(v || '').toLowerCase();
        return conf === 'high' ? <span style={{ color: '#cf222e', fontWeight: 600 }}>สูง (High)</span> :
               conf === 'nominal' ? <span style={{ color: '#bf8700', fontWeight: 600 }}>ปานกลาง (Nom)</span> :
               conf === 'low' ? <span style={{ color: '#1a7f37' }}>ต่ำ (Low)</span> : '-';
    }},
    { title: 'ความร้อน (FRP)', dataIndex: 'frp', key: 'frp', width: 120, sorter: (a, b) => (a.frp || 0) - (b.frp || 0), render: v => v ? `${v} MW` : '-' },
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 120 },
    { title: 'ตำบล', dataIndex: 'subdistrict', key: 'subdistrict', width: 120 },
    { title: 'ประเภทพื้นที่', dataIndex: 'land_use', key: 'land_use', width: 150 },
    { title: 'พิกัด (Lat, Long)', key: 'coords', width: 200, render: (_, r) => r.latitude && r.longitude ? `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}` : '-' },
    { title: 'ดาวเทียม', dataIndex: 'satellite', key: 'satellite', width: 90, align: 'center' },
];

const formFields = (
    <>
        <Row gutter={16}>
            <Col span={12}>
                <Form.Item name="acq_date" label="วันที่พบ (YYYY-MM-DD)" rules={[{ required: true }]}><Input placeholder="2026-04-20" /></Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="acq_time" label="เวลา (HHMM)"><Input placeholder="1350" /></Form.Item>
            </Col>
        </Row>
        <Row gutter={16}>
            <Col span={12}>
                <Form.Item name="district" label="อำเภอ" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="subdistrict" label="ตำบล"><Input /></Form.Item>
            </Col>
        </Row>
        <Row gutter={16}>
            <Col span={12}>
                <Form.Item name="latitude" label="ละติจูด" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} step={0.000001} /></Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="longitude" label="ลองจิจูด" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} step={0.000001} /></Form.Item>
            </Col>
        </Row>
        <Row gutter={16}>
            <Col span={12}>
                <Form.Item name="confidence" label="ระดับความน่าเชื่อถือ"><Select options={['High', 'Nominal', 'Low'].map(d => ({ label: d, value: d.toLowerCase() }))} /></Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="frp" label="ค่าพลังงานความร้อน (FRP)"><InputNumber style={{ width: '100%' }} /></Form.Item>
            </Col>
        </Row>
        <Row gutter={16}>
            <Col span={12}>
                <Form.Item name="land_use" label="ประเภทพื้นที่"><Input placeholder="เช่น พื้นที่เกษตร" /></Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="village" label="หมู่บ้าน/ชุมชน"><Input /></Form.Item>
            </Col>
        </Row>
        <Row gutter={16}>
            <Col span={12}>
                <Form.Item name="satellite" label="ดาวเทียม"><Input placeholder="VIIRS / Suomi NPP" /></Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="year" label="ปีที่บันทึก"><InputNumber style={{ width: '100%' }} /></Form.Item>
            </Col>
        </Row>
        <Form.Item name="source" label="แหล่งข้อมูล">
            <Input disabled defaultValue="GISTDA" placeholder="GISTDA" />
        </Form.Item>
    </>
);

const districts = ['เมืองนครปฐม', 'นครชัยศรี', 'สามพราน', 'ดอนตูม', 'บางเลน', 'กำแพงแสน', 'พุทธมณฑล'];
const confidences = [{ label: 'สูง (High)', value: 'high' }, { label: 'ปานกลาง (Nominal)', value: 'nominal' }, { label: 'ต่ำ (Low)', value: 'low' }];

const filterConfig = [
    { key: 'district', label: 'อำเภอ', options: districts },
    { key: 'confidence', label: 'ความน่าเชื่อถือ', options: confidences },
];

export default function FireHotspots() {
    const { canEdit } = useAuth();
    const [syncing, setSyncing] = useState(false);

    const getSyncErrorMessage = (status, messageText) => {
        if (status === 502 || status === 503 || status === 504) {
            return 'GISTDA หรือ gateway ตอบกลับไม่ได้ชั่วคราว ข้อมูลเดิมในตารางยังไม่หาย ลองกดใหม่ภายหลัง';
        }
        return messageText || `HTTP ${status}`;
    };

    const handleSyncHotspots = async (refetch) => {
        setSyncing(true);
        try {
            const res = await fetch('/.netlify/functions/sync-hotspots', { method: 'POST' });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(getSyncErrorMessage(res.status, payload.error || payload.message));
            }

            const latest = payload.latest?.acq_date ? ` ล่าสุด ${payload.latest.acq_date}` : '';
            message.success(`${payload.message || 'ดึงข้อมูล GISTDA สำเร็จ'}${latest}`);
            refetch?.();
        } catch (err) {
            message.error(`ดึงข้อมูล GISTDA ไม่สำเร็จ: ${err.message}`);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <HotspotWidget />
            <CrudTable 
                tableName="fire_hotspots" 
                title="จุด Hotspot (GISTDA)" 
                columns={columns} 
                formFields={formFields} 
                searchField="district" 
                filterConfig={filterConfig} 
                defaultSort={{ field: 'acq_date', order: 'descend' }}
                extraActions={({ refetch }) => canEdit() && (
                    <Button
                        icon={<SyncOutlined spin={syncing} />}
                        loading={syncing}
                        onClick={() => handleSyncHotspots(refetch)}
                        className="export-btn"
                    >
                        ดึงข้อมูล GISTDA
                    </Button>
                )}
            />
        </div>
    );
}
