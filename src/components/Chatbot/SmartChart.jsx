import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell,
    LineChart, Line
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a28CFE', '#ff66b2', '#7acc00'];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: '#fff', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{label || payload[0].payload.name}</p>
                {payload.map((entry, index) => (
                    <p key={index} style={{ margin: 0, color: entry.color }}>
                        {entry.name}: {entry.value.toLocaleString()}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function SmartChart({ rawContent }) {
    let config = null;
    try {
        config = JSON.parse(rawContent);
    } catch (e) {
        return <div style={{ color: 'red' }}>[ข้อมูลกราฟไม่ถูกต้อง ไม่สามารถเรนเดอร์ได้]</div>;
    }

    if (!config || !config.data || !Array.isArray(config.data)) {
        return <div style={{ color: 'red' }}>[รูปแบบข้อมูลกราฟไม่ตรงตามที่รองรับ]</div>;
    }

    const { type, title, data, xAxisKey = "name", series = [{ key: "value", name: "Value" }] } = config;

    return (
        <div style={{ width: '100%', height: 300, background: '#fff', padding: 16, borderRadius: 8, marginTop: 8, marginBottom: 8, border: '1px solid #e1e4e8' }}>
            {title && <div style={{ fontWeight: 'bold', marginBottom: 12, textAlign: 'center', color: '#24292f' }}>{title}</div>}
            <ResponsiveContainer width="100%" height="85%">
                {type === 'pie' ? (
                    <PieChart>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={0}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey={series[0].key}
                            nameKey={xAxisKey}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                    </PieChart>
                ) : type === 'line' ? (
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => val.toLocaleString()} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        {series.map((s, idx) => (
                            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} />
                        ))}
                    </LineChart>
                ) : (
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => val.toLocaleString()} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        {series.map((s, idx) => (
                            <Bar key={s.key} dataKey={s.key} name={s.name} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
                        ))}
                    </BarChart>
                )}
            </ResponsiveContainer>
        </div>
    );
}
