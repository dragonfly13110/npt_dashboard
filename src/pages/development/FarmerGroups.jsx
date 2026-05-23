import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Checkbox, Col, Empty, Form, Input, InputNumber, Modal, Popconfirm, Popover, Progress, Row, Select, Space, Spin, Statistic, Table, Tag, Tooltip, message } from 'antd';
import { AppstoreOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, EnvironmentOutlined, PlusOutlined, SearchOutlined, ShopOutlined, TeamOutlined, TrophyOutlined, UploadOutlined, WalletOutlined } from '@ant-design/icons';
import CrudTable from '../../components/DataTable/CrudTable';
import CsvImportModal from '../../components/DataTable/CsvImportModal';
import { supabase } from '../../supabaseClient';
import { useApiCache } from '../../hooks/useApiCache';
import { useAuth } from '../../contexts/AuthContext';
import districtGeoJSON from '../../data/nakhon_pathom_districts.json';

const baseColumns = [
    { title: 'à¸Šà¸·à¹ˆà¸­à¸à¸¥à¸¸à¹ˆà¸¡', dataIndex: 'group_name', key: 'group_name', width: 220 },
    { title: 'à¸­à¸³à¹€à¸ à¸­', dataIndex: 'district', key: 'district', width: 130 },
    { title: 'à¸›à¸£à¸°à¸˜à¸²à¸™', dataIndex: 'chairman', key: 'chairman', width: 150 },
    { title: 'à¸ªà¸¡à¸²à¸Šà¸´à¸', dataIndex: 'member_count', key: 'member_count', width: 100, align: 'right' },
];

const formFields = (
    <>
        <Form.Item name="group_name" label="à¸Šà¸·à¹ˆà¸­à¸à¸¥à¸¸à¹ˆà¸¡" rules={[{ required: true }]}>
            <Input />
        </Form.Item>
        <Form.Item name="district" label="à¸­à¸³à¹€à¸ à¸­">
            <Input />
        </Form.Item>
        <Form.Item name="chairman" label="à¸›à¸£à¸°à¸˜à¸²à¸™">
            <Input />
        </Form.Item>
        <Form.Item name="member_count" label="à¸ˆà¸³à¸™à¸§à¸™à¸ªà¸¡à¸²à¸Šà¸´à¸">
            <InputNumber style={{ width: '100%' }} />
        </Form.Item>
    </>
);

const money = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('th-TH');

const hasValue = (value) => value !== null && value !== undefined && value !== '';
const yes = (value) => String(value || '').trim() === 'à¸¡à¸µ';
const HOUSEWIFE_TABLE = 'housewife_farmer_groups';

function countBy(rows, key) {
    const map = new Map();
    rows.forEach((row) => {
        const label = row[key] || 'à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸';
        map.set(label, (map.get(label) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function sum(rows, key) {
    return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}

function StatCard({ title, value, suffix, icon, color }) {
    return (
        <Card styles={{ body: { padding: 18 } }} style={{ height: '100%' }}>
            <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Statistic title={title} value={value} suffix={suffix} valueStyle={{ fontSize: 26, fontWeight: 700 }} />
                <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    fontSize: 20,
                    background: color,
                }}>
                    {icon}
                </div>
            </Space>
        </Card>
    );
}

function RankedList({ title, rows, suffix = 'à¸à¸¥à¸¸à¹ˆà¸¡' }) {
    const max = rows[0]?.[1] || 1;
    return (
        <Card title={title} style={{ height: '100%' }} styles={{ body: { paddingTop: 8 } }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {rows.slice(0, 6).map(([label, value]) => (
                    <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                            <span style={{ color: '#57606a', flexShrink: 0 }}>{number.format(value)} {suffix}</span>
                        </div>
                        <Progress percent={Math.round((value / max) * 100)} showInfo={false} strokeColor="#1a7f37" />
                    </div>
                ))}
            </Space>
        </Card>
    );
}

function YearComparison({ rows }) {
    const byYear = countBy(rows, 'year').sort((a, b) => Number(a[0]) - Number(b[0]));
    const max = Math.max(...byYear.map(([, value]) => value), 1);

    return (
        <Card title="à¸ˆà¸³à¸™à¸§à¸™à¸à¸¥à¸¸à¹ˆà¸¡à¹à¸¢à¸à¸•à¸²à¸¡à¸›à¸µ" style={{ height: '100%' }} styles={{ body: { paddingTop: 8 } }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {byYear.map(([label, value]) => (
                    <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                            <span style={{ fontWeight: 700 }}>{label}</span>
                            <span style={{ color: '#57606a' }}>{number.format(value)} à¸à¸¥à¸¸à¹ˆà¸¡</span>
                        </div>
                        <Progress percent={Math.round((value / max) * 100)} showInfo={false} strokeColor="#0969da" />
                    </div>
                ))}
            </Space>
        </Card>
    );
}

function HousewifeMap({ rows, year }) {
    const [MapComponents, setMapComponents] = useState(null);

    useEffect(() => {
        Promise.all([
            import('leaflet'),
            import('react-leaflet'),
        ]).then(([L, RL]) => {
            delete L.default.Icon.Default.prototype._getIconUrl;
            L.default.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });
            setMapComponents({ L: L.default, ...RL });
        });
    }, []);

    const points = useMemo(() => rows
        .filter((row) => row.year === year && hasValue(row.lat) && hasValue(row.lon))
        .map((row) => ({ ...row, lat: Number(row.lat), lon: Number(row.lon) }))
        .filter((row) => !Number.isNaN(row.lat) && !Number.isNaN(row.lon)), [rows, year]);

    if (!MapComponents) {
        return (
            <Card title={`à¹à¸œà¸™à¸—à¸µà¹ˆà¸à¸¥à¸¸à¹ˆà¸¡à¹à¸¡à¹ˆà¸šà¹‰à¸²à¸™à¹€à¸à¸©à¸•à¸£à¸à¸£ à¸›à¸µ ${year}`}>
                <div style={{ height: 420, display: 'grid', placeItems: 'center' }}>
                    <Spin tip="à¸à¸³à¸¥à¸±à¸‡à¹‚à¸«à¸¥à¸”à¹à¸œà¸™à¸—à¸µà¹ˆ..." />
                </div>
            </Card>
        );
    }

    if (!points.length) {
        return (
            <Card title={`à¹à¸œà¸™à¸—à¸µà¹ˆà¸à¸¥à¸¸à¹ˆà¸¡à¹à¸¡à¹ˆà¸šà¹‰à¸²à¸™à¹€à¸à¸©à¸•à¸£à¸à¸£ à¸›à¸µ ${year}`}>
                <div style={{ height: 420, display: 'grid', placeItems: 'center' }}>
                    <Empty description="à¹„à¸¡à¹ˆà¸¡à¸µà¸žà¸´à¸à¸±à¸”à¸ªà¸³à¸«à¸£à¸±à¸šà¸›à¸µà¸™à¸µà¹‰" />
                </div>
            </Card>
        );
    }

    const { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON, useMap } = MapComponents;

    const FitBounds = () => {
        const map = useMap();

        useEffect(() => {
            const bounds = MapComponents.L.latLngBounds(points.map((point) => [point.lat, point.lon]));
            if (bounds.isValid()) {
                map.invalidateSize();
                map.fitBounds(bounds, { padding: [36, 36], maxZoom: 11, animate: false });
            }
        }, [map]);

        return null;
    };

    return (
        <Card
            title={`à¹à¸œà¸™à¸—à¸µà¹ˆà¸à¸¥à¸¸à¹ˆà¸¡à¹à¸¡à¹ˆà¸šà¹‰à¸²à¸™à¹€à¸à¸©à¸•à¸£à¸à¸£ à¸›à¸µ ${year}`}
            extra={`${number.format(points.length)} à¸ˆà¸¸à¸”à¸žà¸´à¸à¸±à¸”`}
            style={{ marginBottom: 16 }}
        >
            <MapContainer
                center={[13.82, 100.05]}
                zoom={10}
                zoomSnap={0.25}
                zoomDelta={0.5}
                style={{ height: 460, width: '100%', borderRadius: 8, border: '1px solid #e8ecf0' }}
                scrollWheelZoom={true}
            >
                <FitBounds />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <GeoJSON
                    data={districtGeoJSON}
                    style={{
                        color: '#1a7f37',
                        weight: 2,
                        opacity: 0.75,
                        fillColor: '#2da44e',
                        fillOpacity: 0.08,
                        dashArray: '5, 5',
                    }}
                    onEachFeature={(feature, layer) => {
                        const name = feature.properties?.amp_th || feature.properties?.AMP_NAMT;
                        if (name) layer.bindTooltip(`à¸­à¸³à¹€à¸ à¸­${name}`, { sticky: true });
                    }}
                />
                {points.map((item) => {
                    const color = yes(item.has_sales_channel) ? '#0969da' : '#bf8700';
                    return (
                        <CircleMarker
                            key={item.id}
                            center={[item.lat, item.lon]}
                            radius={8}
                            fillColor={color}
                            fillOpacity={0.85}
                            color="#fff"
                            weight={2}
                        >
                            <Popup>
                                <div style={{ minWidth: 220, fontFamily: 'inherit' }}>
                                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{item.group_name}</div>
                                    <div style={{ color: '#57606a', fontSize: 13 }}>à¸­.{item.district} à¸•.{item.subdistrict}</div>
                                    <div style={{ marginTop: 8, display: 'grid', gap: 4, fontSize: 13 }}>
                                        <span>à¸ªà¸¡à¸²à¸Šà¸´à¸: <strong>{number.format(item.member_count || 0)}</strong> à¸£à¸²à¸¢</span>
                                        <span>à¸à¸´à¸ˆà¸à¸£à¸£à¸¡: <strong>{item.activity || '-'}</strong></span>
                                        <span>à¸¨à¸±à¸à¸¢à¸ à¸²à¸ž: <strong>{item.potential_level || '-'}</strong></span>
                                        <span>à¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡à¸ˆà¸³à¸«à¸™à¹ˆà¸²à¸¢: <strong>{item.has_sales_channel || 'à¹„à¸¡à¹ˆà¸¡à¸µ'}</strong></span>
                                    </div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12, color: '#57606a', fontSize: 12 }}>
                <span><EnvironmentOutlined style={{ color: '#0969da' }} /> à¸¡à¸µà¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡à¸ˆà¸³à¸«à¸™à¹ˆà¸²à¸¢</span>
                <span><EnvironmentOutlined style={{ color: '#bf8700' }} /> à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡à¸ˆà¸³à¸«à¸™à¹ˆà¸²à¸¢</span>
            </div>
        </Card>
    );
}

const housewifeColumns = [
    { title: 'à¸›à¸µà¸‚à¹‰à¸­à¸¡à¸¹à¸¥', dataIndex: 'year', key: 'year', width: 75, fixed: 'left', align: 'center' },
    { title: 'à¸Šà¸·à¹ˆà¸­à¸à¸¥à¸¸à¹ˆà¸¡', dataIndex: 'group_name', key: 'group_name', width: 220, fixed: 'left', ellipsis: true },
    { title: 'à¸­à¸³à¹€à¸ à¸­', dataIndex: 'district', key: 'district', width: 100 },
    { title: 'à¸•à¸³à¸šà¸¥', dataIndex: 'subdistrict', key: 'subdistrict', width: 100 },
    { title: 'à¸«à¸¡à¸¹à¹ˆ', dataIndex: 'moo', key: 'moo', width: 60, align: 'center' },
    { title: 'à¹€à¸¥à¸‚à¸—à¸µà¹ˆ', dataIndex: 'address_no', key: 'address_no', width: 80 },
    { title: 'à¸ªà¸¡à¸²à¸Šà¸´à¸', dataIndex: 'member_count', key: 'member_count', width: 80, align: 'right', render: (v) => number.format(v || 0) },
    { title: 'à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¸à¸¥à¸¸à¹ˆà¸¡', dataIndex: 'activity', key: 'activity', width: 200, ellipsis: true },
    { title: 'à¸¨à¸±à¸à¸¢à¸ à¸²à¸ž', dataIndex: 'potential_level', key: 'potential_level', width: 95, render: (v) => v ? <Tag color={v === 'à¸”à¸µ' ? 'green' : 'gold'}>{v}</Tag> : '-' },
    { title: 'à¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡à¸ˆà¸³à¸«à¸™à¹ˆà¸²à¸¢', dataIndex: 'has_sales_channel', key: 'has_sales_channel', width: 110, render: (v) => <Tag color={yes(v) ? 'blue' : 'default'}>{v || 'à¹„à¸¡à¹ˆà¸¡à¸µ'}</Tag> },
    { title: 'à¸ˆà¸”à¸—à¸°à¹€à¸šà¸µà¸¢à¸™à¸§à¸´à¸ªà¸²à¸«à¸à¸´à¸ˆà¸¯', dataIndex: 'community_enterprise_registration', key: 'community_enterprise_registration', width: 150, ellipsis: true },
    { title: 'à¸à¸¥à¸¸à¹ˆà¸¡à¸•à¹‰à¸™à¹à¸šà¸š', dataIndex: 'model_group', key: 'model_group', width: 100, ellipsis: true },
    { title: 'à¸—à¸¸à¸™', dataIndex: 'fund_management', key: 'fund_management', width: 100, align: 'right', render: (v) => money.format(v || 0) },
    { title: 'à¸£à¸²à¸¢à¹„à¸”à¹‰', dataIndex: 'income', key: 'income', width: 100, align: 'right', render: (v) => money.format(v || 0) },
    { title: 'à¸¡à¸²à¸•à¸£à¸à¸²à¸™à¸à¸²à¸£à¸œà¸¥à¸´à¸•', dataIndex: 'production_standard', key: 'production_standard', width: 130, render: (v) => v || '-', ellipsis: true },
    { title: 'à¸­à¸­à¸™à¹„à¸¥à¸™à¹Œà¹ƒà¸™à¸›à¸£à¸°à¹€à¸—à¸¨', dataIndex: 'online_domestic', key: 'online_domestic', width: 120, render: (v) => v || '-', ellipsis: true },
    { title: 'à¸­à¸­à¸™à¹„à¸¥à¸™à¹Œà¸•à¹ˆà¸²à¸‡à¸›à¸£à¸°à¹€à¸—à¸¨', dataIndex: 'online_international', key: 'online_international', width: 130, render: (v) => v || '-', ellipsis: true },
    { title: 'à¸­à¸­à¸Ÿà¹„à¸¥à¸™à¹Œà¹ƒà¸™à¸›à¸£à¸°à¹€à¸—à¸¨', dataIndex: 'offline_domestic', key: 'offline_domestic', width: 120, render: (v) => v || '-', ellipsis: true },
    { title: 'à¸­à¸­à¸Ÿà¹„à¸¥à¸™à¹Œà¸•à¹ˆà¸²à¸‡à¸›à¸£à¸°à¹€à¸—à¸¨', dataIndex: 'offline_international', key: 'offline_international', width: 130, render: (v) => v || '-', ellipsis: true },
    { title: 'à¹‚à¸—à¸£à¸¨à¸±à¸žà¸—à¹Œ', dataIndex: 'phone', key: 'phone', width: 110, render: (v) => v && v !== '0' ? v : '-' },
    { title: 'à¸§à¸±à¸™à¸—à¸µà¹ˆà¸ˆà¸±à¸”à¸•à¸±à¹‰à¸‡', dataIndex: 'established_text', key: 'established_text', width: 110, ellipsis: true },
    { title: 'Lat', dataIndex: 'lat', key: 'lat', width: 90, render: (v) => hasValue(v) ? Number(v).toFixed(6) : '-' },
    { title: 'Lon', dataIndex: 'lon', key: 'lon', width: 90, render: (v) => hasValue(v) ? Number(v).toFixed(6) : '-' },
];

// Column picker config
const REQUIRED_KEYS = ['year', 'group_name', 'district', 'subdistrict', 'member_count', 'activity'];
const DEFAULT_KEYS = ['year', 'group_name', 'district', 'subdistrict', 'member_count', 'activity', 'potential_level', 'has_sales_channel', 'community_enterprise_registration', 'model_group', 'fund_management', 'income', 'production_standard', 'phone'];
const ALL_OPTIONAL_KEYS = housewifeColumns.filter((c) => !REQUIRED_KEYS.includes(c.key)).map((c) => c.key);
const DEFAULT_OPTIONAL_KEYS = DEFAULT_KEYS.filter((k) => !REQUIRED_KEYS.includes(k));

const normalizeHousewifeValues = (values) => ({
    ...values,
    year: values.year ? Number(values.year) : null,
    moo: values.moo ? Number(values.moo) : null,
    member_count: values.member_count ? Number(values.member_count) : 0,
    fund_management: values.fund_management ? Number(values.fund_management) : 0,
    income: values.income ? Number(values.income) : 0,
    lat: values.lat ? Number(values.lat) : null,
    lon: values.lon ? Number(values.lon) : null,
});

const housewifeFormFields = (
    <>
        <Row gutter={12}>
            <Col xs={24} md={8}>
                <Form.Item name="year" label="à¸›à¸µà¸‚à¹‰à¸­à¸¡à¸¹à¸¥" rules={[{ required: true }]}>
                    <InputNumber min={2500} max={2600} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col xs={24} md={16}>
                <Form.Item name="group_name" label="à¸Šà¸·à¹ˆà¸­à¸à¸¥à¸¸à¹ˆà¸¡" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="district" label="à¸­à¸³à¹€à¸ à¸­">
                    <Input />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="subdistrict" label="à¸•à¸³à¸šà¸¥">
                    <Input />
                </Form.Item>
            </Col>
            <Col xs={12} md={4}>
                <Form.Item name="moo" label="à¸«à¸¡à¸¹à¹ˆ">
                    <InputNumber style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col xs={12} md={4}>
                <Form.Item name="address_no" label="à¹€à¸¥à¸‚à¸—à¸µà¹ˆ">
                    <Input />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="member_count" label="à¸ªà¸¡à¸²à¸Šà¸´à¸">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="phone" label="à¹‚à¸—à¸£à¸¨à¸±à¸žà¸—à¹Œ">
                    <Input />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="established_text" label="à¸§à¸±à¸™à¸—à¸µà¹ˆà¸ˆà¸±à¸”à¸•à¸±à¹‰à¸‡">
                    <Input />
                </Form.Item>
            </Col>
            <Col xs={24}>
                <Form.Item name="activity" label="à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¸à¸¥à¸¸à¹ˆà¸¡">
                    <Input />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="potential_level" label="à¸¨à¸±à¸à¸¢à¸ à¸²à¸ž">
                    <Select allowClear options={['à¸”à¸µ', 'à¸›à¸²à¸™à¸à¸¥à¸²à¸‡', 'à¸›à¸£à¸±à¸šà¸›à¸£à¸¸à¸‡'].map((value) => ({ value, label: value }))} />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="has_sales_channel" label="à¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡à¸ˆà¸³à¸«à¸™à¹ˆà¸²à¸¢">
                    <Select allowClear options={['à¸¡à¸µ', 'à¹„à¸¡à¹ˆà¸¡à¸µ'].map((value) => ({ value, label: value }))} />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="community_enterprise_registration" label="à¸ˆà¸”à¸—à¸°à¹€à¸šà¸µà¸¢à¸™à¸§à¸´à¸ªà¸²à¸«à¸à¸´à¸ˆà¸¯">
                    <Input />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="model_group" label="à¸à¸¥à¸¸à¹ˆà¸¡à¸•à¹‰à¸™à¹à¸šà¸š">
                    <Input />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="fund_management" label="à¸—à¸¸à¸™">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col xs={24} md={8}>
                <Form.Item name="income" label="à¸£à¸²à¸¢à¹„à¸”à¹‰">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col xs={24} md={12}>
                <Form.Item name="lat" label="Lat">
                    <InputNumber style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col xs={24} md={12}>
                <Form.Item name="lon" label="Lon">
                    <InputNumber style={{ width: '100%' }} />
                </Form.Item>
            </Col>
        </Row>
    </>
);

export function HousewifeFarmerGroups() {
    const { canEdit, canDelete } = useAuth();
    const userCanEdit = canEdit();
    const userCanDelete = canDelete();
    const [search, setSearch] = useState('');
    const [district, setDistrict] = useState('à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”');
    const [year, setYear] = useState(2568);
    const [modalOpen, setModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [saving, setSaving] = useState(false);
    const [visibleOptionalColumns, setVisibleOptionalColumns] = useState(DEFAULT_OPTIONAL_KEYS);
    const [form] = Form.useForm();

    const fetchGroups = async () => {
        const { data, error } = await supabase
            .from(HOUSEWIFE_TABLE)
            .select('*')
            .order('year', { ascending: false })
            .order('district', { ascending: true })
            .order('group_name', { ascending: true });
        if (error) throw error;
        return data || [];
    };

    const { data: rows = [], isLoading, refetch } = useApiCache(['housewife_farmer_groups_full'], fetchGroups);

    const districts = useMemo(() => ['à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”', ...countBy(rows, 'district').map(([name]) => name)], [rows]);
    const years = useMemo(() => countBy(rows, 'year').map(([name]) => name).sort((a, b) => Number(b) - Number(a)), [rows]);
    const activeYear = years.includes(year) ? year : (years[0] || 2568);
    const activeYearRows = useMemo(() => rows.filter((row) => row.year === activeYear), [rows, activeYear]);

    const filteredRows = useMemo(() => {
        const text = search.trim().toLowerCase();
        return rows.filter((row) => {
            const matchDistrict = district === 'à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”' || row.district === district;
            const matchYear = row.year === activeYear;
            const matchText = !text || [
                row.group_name,
                row.district,
                row.subdistrict,
                row.activity,
                row.potential_level,
                row.has_sales_channel,
            ].some((value) => String(value || '').toLowerCase().includes(text));
            return matchDistrict && matchYear && matchText;
        });
    }, [rows, search, district, activeYear]);

    const stats = useMemo(() => {
        const sales = activeYearRows.filter((row) => yes(row.has_sales_channel)).length;
        return {
            total: activeYearRows.length,
            members: sum(activeYearRows, 'member_count'),
            sales,
            salesPct: activeYearRows.length ? Math.round((sales / activeYearRows.length) * 100) : 0,
            income: sum(activeYearRows, 'income'),
            good: activeYearRows.filter((row) => row.potential_level === 'à¸”à¸µ').length,
            districts: countBy(activeYearRows, 'district'),
            activities: countBy(activeYearRows, 'activity'),
            potential: countBy(activeYearRows, 'potential_level'),
        };
    }, [activeYearRows]);

    const openAdd = () => {
        setEditingRecord(null);
        form.setFieldsValue({ year: activeYear, province: 'à¸™à¸„à¸£à¸›à¸à¸¡', has_sales_channel: 'à¹„à¸¡à¹ˆà¸¡à¸µ' });
        setModalOpen(true);
    };

    const openEdit = (record) => {
        setEditingRecord(record);
        form.setFieldsValue(record);
        setModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = normalizeHousewifeValues(await form.validateFields());
            setSaving(true);

            const result = editingRecord
                ? await supabase.from(HOUSEWIFE_TABLE).update(values).eq('id', editingRecord.id)
                : await supabase.from(HOUSEWIFE_TABLE).insert([values]);

            if (result.error) throw result.error;

            message.success(editingRecord ? 'à¹à¸à¹‰à¹„à¸‚à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹à¸¥à¹‰à¸§' : 'à¹€à¸žà¸´à¹ˆà¸¡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹à¸¥à¹‰à¸§');
            setModalOpen(false);
            setEditingRecord(null);
            form.resetFields();
            refetch();
        } catch (err) {
            if (err?.errorFields) return;
            message.error(err.message || 'à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        const { error } = await supabase.from(HOUSEWIFE_TABLE).delete().eq('id', id);
        if (error) {
            message.error(`à¸¥à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸¥à¹‰à¸¡à¹€à¸«à¸¥à¸§: ${error.message}`);
            return;
        }
        message.success('à¸¥à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¸³à¹€à¸£à¹‡à¸ˆ');
        refetch();
    };

    const handleExportCSV = () => {
        if (!filteredRows.length) return;
        const visibleCols = housewifeColumns.filter((c) => visibleKeys.has(c.key));
        const headers = visibleCols.map(c => c.title);
        const keys = visibleCols.map(c => c.dataIndex);
        const csvContent = [
            headers.join(','),
            ...filteredRows.map(row => keys.map(k => `"${row[k] ?? ''}"`).join(','))
        ].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `HousewifeFarmerGroups_${activeYear}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // --- Column picker logic ---
    const visibleKeys = new Set([...REQUIRED_KEYS, ...visibleOptionalColumns]);
    const filteredHousewifeColumns = housewifeColumns.filter((c) => visibleKeys.has(c.key));
    const totalColCount = housewifeColumns.length;
    const visibleColCount = filteredHousewifeColumns.length;

    const columnPickerContent = (
        <div style={{ maxWidth: 340 }}>
            <Space size={4} style={{ marginBottom: 8 }}>
                <Button size="small" onClick={() => setVisibleOptionalColumns([...ALL_OPTIONAL_KEYS])}>à¹€à¸¥à¸·à¸­à¸à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”</Button>
                <Button size="small" onClick={() => setVisibleOptionalColumns(DEFAULT_OPTIONAL_KEYS)}>à¸„à¹ˆà¸²à¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™</Button>
                <Button size="small" onClick={() => setVisibleOptionalColumns([])}>à¸«à¸¥à¸±à¸à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™</Button>
            </Space>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 0' }}>
                {housewifeColumns.map((col) => {
                    const isRequired = REQUIRED_KEYS.includes(col.key);
                    return (
                        <Checkbox
                            key={col.key}
                            checked={isRequired || visibleOptionalColumns.includes(col.key)}
                            disabled={isRequired}
                            onChange={(e) => {
                                setVisibleOptionalColumns((prev) =>
                                    e.target.checked ? [...prev, col.key] : prev.filter((k) => k !== col.key)
                                );
                            }}
                            style={{ width: '50%', marginInlineStart: 0 }}
                        >
                            {col.title}{isRequired ? ' (à¸«à¸¥à¸±à¸)' : ''}
                        </Checkbox>
                    );
                })}
            </div>
        </div>
    );

    const tableColumns = (!userCanEdit && !userCanDelete) ? filteredHousewifeColumns : [
        ...filteredHousewifeColumns,
        {
            title: 'à¸ˆà¸±à¸”à¸à¸²à¸£',
            key: 'actions',
            width: 90,
            fixed: 'right',
            align: 'center',
            render: (_, record) => (
                <Space size={4}>
                    {userCanEdit && (
                        <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
                    )}
                    {userCanDelete && (
                        <Popconfirm
                            title="à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸¥à¸š"
                            description="à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸¥à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸™à¸µà¹‰à¹ƒà¸Šà¹ˆà¹„à¸«à¸¡?"
                            okText="à¸¥à¸š"
                            cancelText="à¸¢à¸à¹€à¸¥à¸´à¸"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => handleDelete(record.id)}
                        >
                            <Tooltip title="à¸¥à¸š">
                                <Button danger icon={<DeleteOutlined />} />
                            </Tooltip>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    const scrollX = useMemo(() => {
        return tableColumns.reduce((sum, col) => sum + (col.width || 120), 0);
    }, [tableColumns]);

    return (
        <div>
            <div className="md-page-header">
                <h2>à¸à¸¥à¸¸à¹ˆà¸¡à¹à¸¡à¹ˆà¸šà¹‰à¸²à¸™à¹€à¸à¸©à¸•à¸£à¸à¸£</h2>
                <p>à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ˆà¸²à¸à¸à¸²à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ Supabase à¹à¸ªà¸”à¸‡à¸›à¸µ {activeYear} à¹€à¸›à¹‡à¸™à¸«à¸¥à¸±à¸ à¸žà¸£à¹‰à¸­à¸¡à¸”à¸¹à¸¢à¹‰à¸­à¸™à¸«à¸¥à¸±à¸‡à¹à¸¢à¸à¸£à¸²à¸¢à¸›à¸µ 2565-2568</p>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 16, alignItems: 'stretch' }}>
                <Col xs={24} lg={18}>
                    <HousewifeMap rows={rows} year={activeYear} />
                </Col>
                <Col xs={24} lg={6}>
                    <YearComparison rows={rows} />
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} xl={6}>
                    <StatCard title="à¸ˆà¸³à¸™à¸§à¸™à¸à¸¥à¸¸à¹ˆà¸¡" value={stats.total} suffix="à¸à¸¥à¸¸à¹ˆà¸¡" icon={<TeamOutlined />} color="#1a7f37" />
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <StatCard title="à¸ªà¸¡à¸²à¸Šà¸´à¸à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”" value={stats.members} suffix="à¸£à¸²à¸¢" icon={<TrophyOutlined />} color="#0969da" />
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <StatCard title="à¸¡à¸µà¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡à¸ˆà¸³à¸«à¸™à¹ˆà¸²à¸¢" value={stats.salesPct} suffix="%" icon={<ShopOutlined />} color="#bf8700" />
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <StatCard title="à¸£à¸²à¸¢à¹„à¸”à¹‰à¸£à¸§à¸¡" value={stats.income} suffix="à¸šà¸²à¸—" icon={<WalletOutlined />} color="#8250df" />
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} lg={8}>
                    <RankedList title="à¸­à¸³à¹€à¸ à¸­à¸—à¸µà¹ˆà¸¡à¸µà¸à¸¥à¸¸à¹ˆà¸¡à¸¡à¸²à¸à¸ªà¸¸à¸”" rows={stats.districts} />
                </Col>
                <Col xs={24} lg={8}>
                    <RankedList title="à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¹€à¸”à¹ˆà¸™" rows={stats.activities} />
                </Col>
                <Col xs={24} lg={8}>
                    <RankedList title="à¸£à¸°à¸”à¸±à¸šà¸¨à¸±à¸à¸¢à¸ à¸²à¸ž" rows={stats.potential} />
                </Col>
            </Row>

            <Card
                title={`à¸•à¸²à¸£à¸²à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸à¸¥à¸¸à¹ˆà¸¡à¹à¸¡à¹ˆà¸šà¹‰à¸²à¸™à¹€à¸à¸©à¸•à¸£à¸à¸£ à¸›à¸µ ${activeYear}`}
                extra={
                    <Space wrap>
                        <span>{number.format(filteredRows.length)} / {number.format(activeYearRows.length)} à¸£à¸²à¸¢à¸à¸²à¸£</span>
                        {(userCanEdit || userCanDelete) && (
                            <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>
                                Import CSV
                            </Button>
                        )}
                        <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>
                            Export CSV
                        </Button>
                        <Popover content={columnPickerContent} title="à¹€à¸¥à¸·à¸­à¸à¸„à¸­à¸¥à¸±à¸¡à¸™à¹Œà¸—à¸µà¹ˆà¹à¸ªà¸”à¸‡" trigger="click" placement="bottomRight">
                            <Button icon={<AppstoreOutlined />}>à¸„à¸­à¸¥à¸±à¸¡à¸™à¹Œ {visibleColCount}/{totalColCount}</Button>
                        </Popover>
                        {userCanEdit && (
                            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
                                à¹€à¸žà¸´à¹ˆà¸¡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥
                            </Button>
                        )}
                    </Space>
                }
            >
                <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                    <Input
                        allowClear
                        prefix={<SearchOutlined />}
                        placeholder="à¸„à¹‰à¸™à¸«à¸²à¸Šà¸·à¹ˆà¸­à¸à¸¥à¸¸à¹ˆà¸¡ à¸­à¸³à¹€à¸ à¸­ à¸•à¸³à¸šà¸¥ à¸à¸´à¸ˆà¸à¸£à¸£à¸¡"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        style={{ width: 320, maxWidth: '100%' }}
                    />
                    <Space wrap>
                        <Select value={activeYear} onChange={setYear} options={years.map((value) => ({ value, label: value }))} style={{ width: 130 }} />
                        <Select value={district} onChange={setDistrict} options={districts.map((value) => ({ value, label: value }))} style={{ width: 180 }} />
                    </Space>
                </Space>
                <Table
                    rowKey="id"
                    loading={isLoading}
                    columns={tableColumns}
                    dataSource={filteredRows}
                    scroll={{ x: scrollX }}
                    size="middle"
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                />
            </Card>

            <CsvImportModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                tableName={HOUSEWIFE_TABLE}
                columns={housewifeColumns}
                onSuccess={refetch}
            />

            <Modal
                title={editingRecord ? 'à¹à¸à¹‰à¹„à¸‚à¸‚à¹‰à¸­à¸¡à¸¹à¸¥' : 'à¹€à¸žà¸´à¹ˆà¸¡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleSave}
                confirmLoading={saving}
                width={900}
                okText="à¸šà¸±à¸™à¸—à¸¶à¸"
                cancelText="à¸¢à¸à¹€à¸¥à¸´à¸"
                destroyOnHidden
            >
                <Form form={form} layout="vertical">
                    {housewifeFormFields}
                </Form>
            </Modal>
        </div>
    );
}

export function YoungFarmerGroups() {
    return (
        <CrudTable
            tableName="young_farmer_groups"
            title="à¸à¸¥à¸¸à¹ˆà¸¡à¸¢à¸¸à¸§à¹€à¸à¸©à¸•à¸£à¸à¸£"
            columns={baseColumns}
            formFields={formFields}
            searchField="group_name"
            searchFields={['group_name', 'district', 'chairman']}
        />
    );
}

export default HousewifeFarmerGroups;
