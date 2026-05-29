import { useEffect, useState, useMemo } from 'react';
import { Card, Spin, Input, Button, Row, Col, Space, Table, Tag, Empty } from 'antd';
import {
    LineChartOutlined,
    CarOutlined,
    SearchOutlined,
    DownloadOutlined,
    ArrowLeftOutlined,
    LinkOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import { useApiCache } from '../../hooks/useApiCache';
import './AgriculturalPrices.css';

const SOURCE_URL = 'https://mex.moc.go.th/page/dit/checkprice/type/W/catid/4';
const OIL_SOURCE_URL = 'https://oil-price.bangchak.co.th/ApiOilPrice2/th';

const CATEGORIES = [
    { id: '3', label: '🥬 ผัก', text: 'ผัก' },
    { id: '4', label: '🍎 ผลไม้', text: 'ผลไม้' },
    { id: '7', label: '🌽 พืชไร่', text: 'พืชไร่' },
    { id: '10', label: '🌾 ข้าว', text: 'ข้าว' },
    { id: '5', label: '🌶️ ของแห้ง', text: 'ของแห้ง' },
];

const OIL_THEMES = {
    'ดีเซล B20': { bg: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)', text: '#f1f5f9', accent: '#94a3b8' },
    'ไฮดีเซล S': { bg: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)', text: '#ffffff', accent: '#93c5fd' },
    'แก๊สโซฮอล 95 S EVO': { bg: 'linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)', text: '#ffffff', accent: '#fca5a5' },
    'แก๊สโซฮอล 91 S EVO': { bg: 'linear-gradient(135deg, #15803d 0%, #14532d 100%)', text: '#ffffff', accent: '#86efac' },
    'แก๊สโซฮอล E20 S EVO': { bg: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)', text: '#ffffff', accent: '#6ee7b7' },
    'แก๊สโซฮอล E85 S EVO': { bg: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)', text: '#ffffff', accent: '#c4b5fd' },
};

async function fetchAgriPrices(catid) {
    const res = await fetch(`/.netlify/functions/moc-price-proxy?catid=${encodeURIComponent(catid)}`);
    if (!res.ok) throw new Error(`MOC price proxy returned ${res.status}`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.items)) {
        throw new Error(json.message || 'MOC price proxy returned no data');
    }
    return json;
}

async function fetchOilPrices() {
    // Try local endpoint first
    const localProxy = await fetch('/api/bangchak-oil-price?source=api-v2');
    if (localProxy.ok && localProxy.headers.get('content-type')?.includes('application/json')) {
        const json = await localProxy.json();
        const items = normalizeOilItems(json);
        if (items.length) {
            return {
                success: true,
                source: 'บริษัท บางจาก คอร์ปอเรชั่น จำกัด (มหาชน)',
                sourceUrl: OIL_SOURCE_URL,
                unit: 'บาท/ลิตร',
                items,
            };
        }
    }

    const res = await fetch('/.netlify/functions/bangchak-oil-price-proxy?source=api-v2');
    if (!res.ok) throw new Error(`Bangchak oil price proxy returned ${res.status}`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.items)) {
        throw new Error(json.message || 'Bangchak oil price proxy returned no data');
    }
    return json;
}

function normalizeOilItems(json) {
    const payload = Array.isArray(json) ? json[0] : json;
    const rawOilList = payload?.OilList;
    const oilList = typeof rawOilList === 'string' ? JSON.parse(rawOilList) : rawOilList;
    if (!Array.isArray(oilList)) return [];

    const COMMON_OIL_ORDER = [
        'ดีเซล B20',
        'ไฮดีเซล S',
        'แก๊สโซฮอล 95 S EVO',
        'แก๊สโซฮอล 91 S EVO',
        'แก๊สโซฮอล E20 S EVO',
        'แก๊สโซฮอล E85 S EVO',
    ];

    return oilList
        .map((item) => {
            const name = String(item.OilName || '').trim();
            const today = String(item.PriceToday || '').trim();
            const tomorrow = String(item.PriceTomorrow || '').trim();
            if (name.includes('พรีเมียม') || name.includes('premium')) return null;
            return {
                name,
                today,
                tomorrow,
                diff: String(item.PriceDifTomorrow || item.PriceDifYesterday || '').trim(),
            };
        })
        .filter(item => item && COMMON_OIL_ORDER.some(o => item.name.includes(o)))
        .sort((a, b) => {
            const getIndex = (name) => {
                const idx = COMMON_OIL_ORDER.findIndex(o => name.includes(o));
                return idx === -1 ? 99 : idx;
            };
            return getIndex(a.name) - getIndex(b.name);
        });
}

function formatThaiDate(dateText) {
    if (!dateText) return '';
    const date = new Date(`${dateText}T00:00:00+07:00`);
    if (Number.isNaN(date.getTime())) return dateText;
    return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export default function AgriculturalPrices() {
    useEffect(() => {
        document.title = 'ราคาสินค้าเกษตรและพลังงาน | ศูนย์ข้อมูลการเกษตรนครปฐม';
    }, []);

    const [selectedCategory, setSelectedCategory] = useState('4');
    const [searchQuery, setSearchQuery] = useState('');

    const { data: agriData, isLoading: isAgriLoading, error: agriError, refetch: refetchAgri } = useApiCache(
        ['moc-agri-prices', selectedCategory],
        () => fetchAgriPrices(selectedCategory),
        { staleMinutes: 30, cacheMinutes: 120 }
    );

    const { data: oilData, isLoading: isOilLoading, error: oilError, refetch: refetchOil } = useApiCache(
        ['bangchak-oil-prices-api-v2'],
        fetchOilPrices,
        { staleMinutes: 30, cacheMinutes: 120 }
    );

    const oilItems = useMemo(() => oilData?.items || [], [oilData]);
    const rawCropItems = useMemo(() => agriData?.items || [], [agriData]);
    const dataDateText = formatThaiDate(agriData?.dataDate);
    const selectedCatLabel = CATEGORIES.find(c => c.id === selectedCategory)?.text || '';

    // Filter crop items
    const filteredCropItems = useMemo(() => {
        if (!searchQuery.trim()) return rawCropItems;
        const q = searchQuery.toLowerCase().trim();
        return rawCropItems.filter(item =>
            item.product_name?.toLowerCase().includes(q) ||
            item.market_name?.toLowerCase().includes(q)
        );
    }, [rawCropItems, searchQuery]);

    const handleExportCSV = () => {
        if (!filteredCropItems.length) return;
        const headers = ['ชื่อผลผลิต', 'ตลาด/ผู้ให้ข้อมูล', 'ราคาช่วง', 'ราคาเฉลี่ย', 'หน่วย', 'วันที่อัปเดต'];
        const csvRows = [
            headers.join(','),
            ...filteredCropItems.map(item => [
                `"${item.product_name || ''}"`,
                `"${item.market_name || 'กรมการค้าภายใน'}"`,
                `"${item.price_range || ''}"`,
                `"${item.avg_price || ''}"`,
                `"${item.unit || ''}"`,
                `"${dataDateText || ''}"`
            ].join(','))
        ];

        const csvContent = '\uFEFF' + csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ราคา_${selectedCatLabel}_${agriData?.dataDate || new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const columns = [
        {
            title: 'ชื่อผลผลิตทางการเกษตร',
            dataIndex: 'product_name',
            key: 'product_name',
            fontWeight: 600,
            render: (text) => <strong style={{ color: '#0f172a', fontSize: '14.5px' }}>{text}</strong>
        },
        {
            title: 'ราคาเฉลี่ย (บาท)',
            dataIndex: 'avg_price',
            key: 'avg_price',
            width: 150,
            align: 'right',
            render: (val, record) => {
                const num = Number(val);
                return (
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 800, fontSize: '16px', color: '#16a34a' }}>
                            {Number.isNaN(num) ? val : num.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                        </span>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{record.price_range && `ช่วง: ${record.price_range}`}</div>
                    </div>
                );
            }
        },
        {
            title: 'หน่วยวัด',
            dataIndex: 'unit',
            key: 'unit',
            width: 120,
            render: (val) => <Tag color="blue" style={{ borderRadius: 6, fontWeight: 500 }}>{val || '-'}</Tag>
        },
        {
            title: 'แหล่งข้อมูล',
            dataIndex: 'market_name',
            key: 'market_name',
            width: 160,
            render: (val) => <span style={{ fontSize: '13px', color: '#64748b' }}>{val || 'กรมการค้าภายใน'}</span>
        }
    ];

    const isDashboardPath = window.location.pathname.startsWith('/dashboard');

    return (
        <div className="agri-prices-container">
            {/* Header section */}
            <div className="prices-page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {isDashboardPath && (
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={() => window.history.back()}
                            style={{ borderRadius: 8 }}
                        />
                    )}
                    <div>
                        <h2>
                            <LineChartOutlined style={{ color: '#16a34a' }} />
                            รายงานราคาสินค้าเกษตรและพลังงานวันนี้
                        </h2>
                        <p>
                            รวบรวมข้อมูลราคาขายส่งผลผลิตทางการเกษตรจากกรมการค้าภายใน และราคาน้ำมันขายปลีกจากสถานีบริการน้ำมันบางจาก อัปเดตสดใหม่รายวัน
                        </p>
                    </div>
                </div>
                <Space>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => { refetchAgri(); refetchOil(); }}
                        style={{ borderRadius: 8 }}
                    >
                        รีเฟรชข้อมูล
                    </Button>
                </Space>
            </div>

            <Row gutter={[24, 24]}>
                {/* OIL PRICES SECTION */}
                <Col xs={24} lg={8}>
                    <Card
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                                <CarOutlined style={{ fontSize: 20, color: '#0969da' }} />
                                <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>⛽ ราคาน้ำมันวันนี้</span>
                            </div>
                        }
                        extra={
                            <a href={oilData?.sourceUrl || OIL_SOURCE_URL} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#0284c7', fontWeight: 600 }}>
                                บางจาก <LinkOutlined />
                            </a>
                        }
                        bordered={false}
                        className="oil-prices-card"
                    >
                        {isOilLoading ? (
                            <div style={{ textAlign: 'center', padding: '60px 0' }}>
                                <Spin tip="กำลังอัปเดตราคาน้ำมัน..." />
                            </div>
                        ) : oilError ? (
                            <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8' }}>
                                <Empty description="ไม่สามารถดึงข้อมูลราคาน้ำมันได้ในขณะนี้" />
                                <Button type="primary" size="small" href={OIL_SOURCE_URL} target="_blank" style={{ marginTop: 12, borderRadius: 6 }}>
                                    ตรวจสอบที่หน้าเว็บบางจาก
                                </Button>
                            </div>
                        ) : (
                            <div className="oil-cards-grid">
                                {oilItems.map(item => {
                                    const cleanName = item.name.replace('แก๊สโซฮอล', 'โซฮอล์').replace('ไฮดีเซล', 'ดีเซล');
                                    const theme = OIL_THEMES[item.name] || {
                                        bg: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
                                        text: '#ffffff',
                                        accent: '#e0f2fe'
                                    };
                                    const diffVal = Number(item.diff);
                                    const diffText = !Number.isNaN(diffVal) && diffVal !== 0
                                        ? `${diffVal > 0 ? '+' : ''}${diffVal.toFixed(2)}`
                                        : '0.00';

                                    return (
                                        <div
                                            key={item.name}
                                            className="oil-price-item-card"
                                            style={{ background: theme.bg, color: theme.text }}
                                        >
                                            <div className="oil-card-header">
                                                <span className="oil-brand-name">{cleanName}</span>
                                                <span className="oil-tag">EVO</span>
                                            </div>
                                            <div className="oil-card-body">
                                                <div className="oil-main-price">
                                                    <span>{item.today || '-'}</span>
                                                    <small style={{ color: theme.accent }}>บาท/ลิตร</small>
                                                </div>
                                                <div className="oil-diff-info" style={{ color: diffVal > 0 ? '#fca5a5' : diffVal < 0 ? '#a7f3d0' : theme.accent }}>
                                                    <span>พรุ่งนี้: {item.tomorrow || item.today}</span>
                                                    <span className="diff-pill" style={{
                                                        background: diffVal > 0 ? 'rgba(239, 68, 68, 0.25)' : diffVal < 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.1)'
                                                    }}>
                                                        {diffText}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </Col>

                {/* AGRI PRICES SECTION */}
                <Col xs={24} lg={16}>
                    <Card
                        bordered={false}
                        className="agri-prices-main-card"
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                                <LineChartOutlined style={{ fontSize: 20, color: '#16a34a' }} />
                                <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>🥦 ราคาผลผลิตขายส่ง</span>
                            </div>
                        }
                        extra={
                            <a href={agriData?.sourceUrl || SOURCE_URL} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#0284c7', fontWeight: 600 }}>
                                กรมการค้าภายใน <LinkOutlined />
                            </a>
                        }
                    >
                        {/* Tab lists */}
                        <div className="price-categories-tabs">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    className={`tab-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                                    onClick={() => { setSelectedCategory(cat.id); setSearchQuery(''); }}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Search & Export section */}
                        <div className="search-export-bar">
                            <Input
                                placeholder={`ค้นหาผลผลิตในหมวด${selectedCatLabel}...`}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{ maxWidth: 320, borderRadius: 8 }}
                                prefix={<SearchOutlined style={{ color: '#cbd5e1' }} />}
                                allowClear
                            />
                            {filteredCropItems.length > 0 && (
                                <Button
                                    type="primary"
                                    icon={<DownloadOutlined />}
                                    onClick={handleExportCSV}
                                    className="export-csv-btn"
                                >
                                    ดาวน์โหลดข้อมูล (CSV)
                                </Button>
                            )}
                        </div>

                        {isAgriLoading ? (
                            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                                <Spin tip={`กำลังดึงข้อมูลราคา${selectedCatLabel}...`} />
                            </div>
                        ) : agriError ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                                <Empty description="ไม่สามารถเชื่อมต่อข้อมูลกรมการค้าภายในได้" />
                                <Button type="primary" href={SOURCE_URL} target="_blank" style={{ marginTop: 12, borderRadius: 6 }}>
                                    ดูที่หน้าเว็บกรมการค้าภายใน
                                </Button>
                            </div>
                        ) : (
                            <div className="price-table-wrapper">
                                <div style={{ marginBottom: 12, fontSize: 13, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>พบ {filteredCropItems.length} รายการ</span>
                                    <span>{dataDateText ? `อัปเดตล่าสุด ณ วันที่ ${dataDateText}` : 'ข้อมูลล่าสุด'}</span>
                                </div>
                                <Table
                                    dataSource={filteredCropItems}
                                    columns={columns}
                                    rowKey={(record, index) => record.id || record.no || index}
                                    pagination={{
                                        pageSize: 10,
                                        showSizeChanger: false,
                                        showTotal: (total) => `ทั้งหมด ${total} รายการ`
                                    }}
                                    locale={{ emptyText: <Empty description="ไม่พบผลผลิตที่ตรงกับการค้นหา" /> }}
                                    className="custom-price-table"
                                    size="middle"
                                />
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
