import { useState, useEffect, useCallback } from 'react';
import { Form, InputNumber, DatePicker, Row, Col, Card, Button, message } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import CrudTable from '../../components/DataTable/CrudTable';
import { areaOption, barOption } from '../../components/charts/echartOptions';
import { supabase } from '../../supabaseClient';
import RainfallSummaryWidget from '../../components/widgets/RainfallSummaryWidget';
import EChart from '../../components/widgets/EChart';

const columns = [
    { title: 'วันที่', dataIndex: 'date', key: 'date', width: 120, sorter: (a, b) => new Date(a.date) - new Date(b.date), defaultSortOrder: 'descend' },
    { title: 'อุณหภูมิเฉลี่ย (°C)', dataIndex: 'tavg', key: 'tavg', width: 140, render: v => v ? `${v}°C` : '-' },
    { title: 'อุณหภูมิต่ำสุด/สูงสุด (°C)', key: 'tminmax', width: 180, render: (_, r) => (r.tmin && r.tmax) ? `${r.tmin} - ${r.tmax}°C` : '-' },
    { 
        title: 'ปริมาณน้ำฝน (mm)', 
        dataIndex: 'prcp', 
        key: 'prcp', 
        width: 170, 
        sorter: (a, b) => (a.prcp || 0) - (b.prcp || 0),
        render: v => {
            if (v === null || v === undefined) return '-';
            const mm = parseFloat(v);
            if (mm > 35) return <span style={{ color: '#cf222e', fontWeight: 600 }}>{mm} mm (ฝนตกหนัก)</span>;
            if (mm > 10) return <span style={{ color: '#bf8700', fontWeight: 600 }}>{mm} mm (ปานกลาง)</span>;
            if (mm > 0) return <span style={{ color: '#1a7f37' }}>{mm} mm (ฝนตกปรอยๆ)</span>;
            return <span style={{ color: '#6e7781' }}>0 mm (ฝนไม่ตก)</span>;
        }
    },
    { title: 'ความเร็วลม (km/h)', dataIndex: 'wspd', key: 'wspd', width: 140, render: v => v ? `${v} km/h` : '-' },
];

const formFields = (
    <Row gutter={16}>
        <Col span={12}>
            <Form.Item name="date" label="วันที่ (YYYY-MM-DD)" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item name="tavg" label="อุณหภูมิเฉลี่ย (°C)">
                <InputNumber style={{ width: '100%' }} step={0.1} />
            </Form.Item>
            <Form.Item name="prcp" label="ปริมาณน้ำฝน (mm)">
                <InputNumber style={{ width: '100%' }} step={0.1} />
            </Form.Item>
        </Col>
        <Col span={12}>
             <Form.Item name="tmax" label="อุณหภูมิสูงสุด (°C)">
                <InputNumber style={{ width: '100%' }} step={0.1} />
            </Form.Item>
            <Form.Item name="tmin" label="อุณหภูมิต่ำสุด (°C)">
                <InputNumber style={{ width: '100%' }} step={0.1} />
            </Form.Item>
            <Form.Item name="wspd" label="ความเร็วลม (km/h)">
                <InputNumber style={{ width: '100%' }} step={0.1} />
            </Form.Item>
        </Col>
    </Row>
);

const months = [
    { label: 'มกราคม 2026', value: '2026-01' },
    { label: 'กุมภาพันธ์ 2026', value: '2026-02' },
    { label: 'มีนาคม 2026', value: '2026-03' },
    { label: 'เมษายน 2026', value: '2026-04' },
    { label: 'พฤษภาคม 2026', value: '2026-05' },
    { label: 'มิถุนายน 2026', value: '2026-06' },
];

const filterConfig = [
    { key: 'date', label: 'เดือนเป้าหมาย', options: months, operator: 'month' }
];

export default function DailyWeather() {
    const [chartData, setChartData] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        document.title = 'สภาพอากาศรายวันนครปฐม | ศูนย์ข้อมูลการเกษตรนครปฐม';
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', 'ข้อมูลสภาพอากาศรายวันจังหวัดนครปฐม พร้อมอุณหภูมิ ปริมาณน้ำฝน และความเร็วลม');
    }, []);

    const fetchCharts = useCallback(async () => {
        const { data } = await supabase.from('daily_weather')
            .select('date, tavg, tmin, tmax, prcp')
            .order('date', { ascending: false })
            .limit(90);
        
        if (data) setChartData([...data].reverse());
    }, []);

    useEffect(() => {
        fetchCharts();
    }, [fetchCharts, refreshKey]);

    const handleSyncWeather = async (refetchTable) => {
        setSyncing(true);
        try {
            const res = await fetch('/.netlify/functions/sync-weather');
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || body.message || 'Sync weather failed');
            message.success(body.message || 'อัปเดตข้อมูลอากาศล่าสุดแล้ว');
            setRefreshKey(key => key + 1);
            await refetchTable?.();
        } catch (err) {
            message.error(`อัปเดตข้อมูลไม่สำเร็จ: ${err.message}`);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Embed the Summary Strip here */}
            <div style={{ background: 'linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%)', padding: '16px', borderRadius: '16px', border: '1px solid #e0f2fe' }}>
                 <RainfallSummaryWidget key={refreshKey} />
            </div>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card title="อุณหภูมิเฉลี่ยย้อนหลัง (90 วัน)" bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ width: '100%', height: 280 }}>
                            <EChart option={areaOption(
                                chartData,
                                [{ key: 'tavg', name: 'อุณหภูมิ (°C)', color: '#cf222e', opacity: 0.22 }],
                                { categoryKey: 'date', unit: '°C', grid: { left: 40 } }
                            )} />
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="ปริมาณน้ำฝนย้อนหลัง (90 วัน)" bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ width: '100%', height: 280 }}>
                            <EChart option={barOption(
                                chartData,
                                [{ key: 'prcp', name: 'น้ำฝน (mm)', color: '#1890ff' }],
                                { categoryKey: 'date', unit: 'mm', grid: { left: 40 } }
                            )} />
                        </div>
                    </Card>
                </Col>
            </Row>

            <CrudTable 
                tableName="daily_weather" 
                title="สภาพอากาศและปริมาณน้ำฝน (Meteostat)" 
                columns={columns} 
                formFields={formFields} 
                searchField="date"
                filterConfig={filterConfig}
                defaultSort={{ field: 'date', order: 'descend' }}
                extraActions={({ refetch }) => (
                    <Button
                        icon={<SyncOutlined spin={syncing} />}
                        loading={syncing}
                        onClick={() => handleSyncWeather(refetch)}
                        className="export-btn"
                    >
                        อัปเดตอากาศ
                    </Button>
                )}
            />
        </div>
    );
}
