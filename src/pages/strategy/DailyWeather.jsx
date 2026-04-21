import { useState, useEffect } from 'react';
import { Form, InputNumber, DatePicker, Row, Col, Card } from 'antd';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import CrudTable from '../../components/DataTable/CrudTable';
import { supabase } from '../../supabaseClient';

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

    useEffect(() => {
        // Fetch all recent data for charting
        async function fetchCharts() {
            const { data } = await supabase.from('daily_weather')
                .select('date, tavg, tmin, tmax, prcp')
                .order('date', { ascending: true })
                .limit(90); // last 90 days for chart
            
            if (data) setChartData(data);
        }
        fetchCharts();
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card title="อุณหภูมิเฉลี่ยย้อนหลัง (90 วัน)" bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ width: '100%', height: 280 }}>
                            <ResponsiveContainer>
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#cf222e" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#cf222e" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(v) => v.split('-').slice(1).join('/')} />
                                    <YAxis tick={{fontSize: 10}} domain={['dataMin - 2', 'dataMax + 2']} />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Area type="monotone" dataKey="tavg" name="อุณหภูมิ (°C)" stroke="#cf222e" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="ปริมาณน้ำฝนย้อนหลัง (90 วัน)" bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ width: '100%', height: 280 }}>
                            <ResponsiveContainer>
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(v) => v.split('-').slice(1).join('/')} />
                                    <YAxis tick={{fontSize: 10}} />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{fill: '#f0f0f0'}} />
                                    <Bar dataKey="prcp" name="น้ำฝน (mm)" fill="#1890ff" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
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
            />
        </div>
    );
}
