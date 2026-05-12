import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Input, Card, Tag, Empty, Spin, Table, Typography, Badge } from 'antd';
import {
    SearchOutlined, DatabaseOutlined, RightOutlined,
    ReloadOutlined, BulbOutlined
} from '@ant-design/icons';
import { globalSearch } from '../services/globalSearchService';
import { useAuth } from '../contexts/AuthContext';
import { isPrivateColumn } from '../utils/dataPrivacy';

const { Text, Title } = Typography;

const GROUP_COLORS = {
    'ยุทธศาสตร์': '#0969da',
    'ส่งเสริมการผลิต': '#1a7f37',
    'พัฒนาเกษตรกร': '#8250df',
    'อารักขาพืช': '#cf222e',
};

// ========== Thai column name mapping ==========
const COLUMN_LABELS = {
    district: 'อำเภอ',
    subdistrict: 'ตำบล',
    name: 'ชื่อ',
    full_name: 'ชื่อ-นามสกุล',
    farmer_name: 'ชื่อเกษตรกร',
    chairman_name: 'ประธาน',
    chairman: 'ประธาน',
    contact_person: 'ผู้ติดต่อ',
    owner_name: 'เจ้าของ',
    plot_name: 'ชื่อแปลง',
    plot_code: 'รหัสแปลง',
    plot_district: 'อำเภอ',
    enterprise_name: 'ชื่อวิสาหกิจ',
    enterprise_type: 'ประเภทวิสาหกิจ',
    group_name: 'ชื่อกลุ่ม',
    group_type: 'ประเภทกลุ่ม',
    center_name: 'ชื่อศูนย์',
    spot_name: 'ชื่อจุด/แหล่ง',
    spot_type: 'ประเภท',
    area_name: 'ชื่อพื้นที่',
    area_type: 'ประเภทพื้นที่',
    crop_name: 'ชื่อพืช',
    crop_type: 'ประเภทพืช',
    commodity: 'สินค้า',
    secondary_commodity: 'สินค้ารอง',
    main_product: 'ผลผลิตหลัก',
    main_crop: 'พืชหลัก',
    main_crop_type: 'ประเภทพืชหลัก',
    featured_product: 'สินค้าเด่น',
    variety: 'พันธุ์',
    farmer_type: 'ประเภทเกษตรกร',
    agency: 'หน่วยงาน',
    disaster_type: 'ประเภทภัย',
    project_name: 'โครงการ',
    total_area_rai: 'พื้นที่ (ไร่)',
    agri_crop_area_rai: 'พื้นที่เพาะปลูก (ไร่)',
    farmer_households: 'ครัวเรือนเกษตรกร',
    member_count: 'จำนวนสมาชิก',
    capital_baht: 'ทุน (บาท)',
    certified_area_rai: 'พื้นที่รับรอง (ไร่)',
    planted_area_rai: 'พื้นที่ปลูก (ไร่)',
    harvested_area_rai: 'พื้นที่เก็บเกี่ยว (ไร่)',
    yield_kg_per_rai: 'ผลผลิต (กก./ไร่)',
    total_production_ton: 'ผลผลิตรวม (ตัน)',
    affected_area_rai: 'พื้นที่เสียหาย (ไร่)',
    affected_households: 'ครัวเรือนที่ได้รับผลกระทบ',
    damage_baht: 'มูลค่าเสียหาย (บาท)',
    households_count: 'จำนวนครัวเรือน',
    total_members: 'สมาชิกทั้งหมด',
    group_count: 'จำนวนกลุ่ม',
    sf_count: 'จำนวน SF',
    ysf_count: 'จำนวน YSF',
    rice_in_season_rai: 'ข้าวนาปี (ไร่)',
    rice_off_season_rai: 'ข้าวนาปรัง (ไร่)',
    field_crops_rai: 'พืชไร่ (ไร่)',
    horticulture_rai: 'ไม้ผล (ไร่)',
    fruit_trees_rai: 'ไม้ผลยืนต้น (ไร่)',
    vegetables_rai: 'ผัก (ไร่)',
    flowers_rai: 'ไม้ดอก (ไร่)',
    herbs_spices_rai: 'สมุนไพร (ไร่)',
    status: 'สถานะ',
    year: 'ปี',
    phone: 'โทรศัพท์',
    address: 'ที่อยู่',
    lat: 'ละติจูด',
    lng: 'ลองจิจูด',
    latitude: 'ละติจูด',
    longitude: 'ลองจิจูด',
    description: 'รายละเอียด',
    note: 'หมายเหตุ',
    notes: 'หมายเหตุ',
    remark: 'หมายเหตุ',
};

function getThaiColumnName(key) {
    if (COLUMN_LABELS[key]) return COLUMN_LABELS[key];
    // Titlecase fallback
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Suggested searches for empty state
const SUGGESTIONS = [
    { icon: '🏠', text: 'กำแพงแสน', desc: 'ค้นหาข้อมูลอำเภอ' },
    { icon: '🌾', text: 'ข้าว', desc: 'ข้อมูลพืชข้าว' },
    { icon: '✅', text: 'GAP', desc: 'มาตรฐาน GAP' },
    { icon: '🌿', text: 'แปลงใหญ่', desc: 'ข้อมูลแปลงใหญ่' },
    { icon: '🏪', text: 'วิสาหกิจ', desc: 'วิสาหกิจชุมชน' },
    { icon: '👨‍🌾', text: 'Smart Farmer', desc: 'เกษตรกรรุ่นใหม่' },
];

export default function SearchResults() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { role } = useAuth();
    const initialQuery = searchParams.get('q') || '';
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedTable, setExpandedTable] = useState(null);

    const performSearch = useCallback(async (searchTerm) => {
        if (!searchTerm || searchTerm.trim().length < 2) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            const data = await globalSearch(searchTerm, 50, role);
            setResults(data);
            if (data.length > 0) {
                setExpandedTable(data[0].table);
            }
        } catch (err) {
            console.error('Search error:', err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [role]);

    useEffect(() => {
        if (initialQuery) {
            performSearch(initialQuery);
        }
    }, [initialQuery, performSearch]);

    const handleSearch = (value) => {
        setQuery(value);
        if (value.trim().length >= 2) {
            navigate(`/dashboard/search?q=${encodeURIComponent(value.trim())}`, { replace: true });
            performSearch(value);
        }
    };

    const totalResults = results.reduce((sum, r) => sum + r.totalCount, 0);

    useEffect(() => {
        document.title = 'ค้นหาข้อมูล | ศูนย์ข้อมูลการเกษตรนครปฐม';
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', 'ค้นหาข้อมูลเกษตรกร พื้นที่เพาะปลูก วิสาหกิจชุมชน Smart Farmer แปลงใหญ่ และข้อมูลเกษตรอื่นๆ ในระบบ');
    }, []);

    // Build columns with Thai names
    const buildColumns = (tableResult) => {
        if (!tableResult.results || tableResult.results.length === 0) return [];
        const sampleRow = tableResult.results[0].raw;
        const keys = Object.keys(sampleRow).filter(k =>
            !['id', 'created_at', 'updated_at'].includes(k) &&
            !(role === 'guest' && isPrivateColumn(tableResult.table, { dataIndex: k })) &&
            !k.includes('image') && !k.includes('url') &&
            !k.includes('file') && !k.includes('path')
        );

        // Prioritize columns that contain the search query so they are not hidden
        const q = query.toLowerCase();
        const priorityKeys = keys.filter(k => 
            tableResult.results.some(r => r.raw && r.raw[k] && String(r.raw[k]).toLowerCase().includes(q))
        );
        const otherKeys = keys.filter(k => !priorityKeys.includes(k));
        const finalKeys = [...priorityKeys, ...otherKeys].slice(0, 6);

        return finalKeys.map(key => ({
            title: getThaiColumnName(key),
            dataIndex: ['raw', key],
            key,
            ellipsis: true,
            width: 160,
            render: (val) => {
                if (val === null || val === undefined) return <Text type="secondary">-</Text>;
                const str = String(val);
                if (str.length > 60) return str.substring(0, 60) + '...';
                return highlightText(str, query);
            }
        }));
    };

    return (
        <div style={{ maxWidth: 1200 }}>
            <div className="md-page-header">
                <h2>🔍 ค้นหาข้อมูลทั้งระบบ</h2>
                <p style={{ margin: 0, fontSize: 13, color: '#656d76' }}>
                    <DatabaseOutlined /> ค้นหาข้ามทุกตารางในฐานข้อมูลสำนักงานเกษตร • กด <kbd style={{ background: '#e8ecf0', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>Ctrl+K</kbd> เพื่อเปิดค้นหาเร็ว
                </p>
            </div>

            <Card
                variant="outlined"
                style={{ borderRadius: 12, marginBottom: 20 }}
                styles={{ body: { padding: '16px 20px' } }}
            >
                <Input.Search
                    size="large"
                    placeholder="พิมพ์ชื่อ, อำเภอ, สินค้า, กลุ่ม, หรือคำค้นหาอะไรก็ได้..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onSearch={handleSearch}
                    enterButton={
                        <span><SearchOutlined /> ค้นหา</span>
                    }
                    loading={loading}
                    allowClear
                    style={{ borderRadius: 12 }}
                />
            </Card>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 16, color: '#656d76' }}>
                        กำลังค้นหาจาก 18 ตาราง...
                    </div>
                </div>
            ) : results.length === 0 && query ? (
                /* ===== Enhanced Empty State ===== */
                <Card variant="outlined" style={{ borderRadius: 12 }}>
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div>
                                <div style={{ fontSize: 16, marginBottom: 4 }}>ไม่พบข้อมูลสำหรับ &quot;{query}&quot;</div>
                                <Text type="secondary">ลองเปลี่ยนคำค้นหา หรือใช้คำสั้นๆ ดูครับ</Text>
                            </div>
                        }
                    />
                    <div style={{
                        marginTop: 20, padding: '16px 20px',
                        background: '#f6f8fa', borderRadius: 10,
                    }}>
                        <Text style={{ fontSize: 13, marginBottom: 12, display: 'block' }}>
                            <BulbOutlined style={{ color: '#bf8700' }} /> ลองค้นหาคำเหล่านี้:
                        </Text>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {SUGGESTIONS.map(s => (
                                <Tag
                                    key={s.text}
                                    style={{ cursor: 'pointer', fontSize: 13, padding: '4px 12px', borderRadius: 16 }}
                                    onClick={() => handleSearch(s.text)}
                                >
                                    {s.icon} {s.text}
                                </Tag>
                            ))}
                        </div>
                    </div>
                </Card>
            ) : results.length === 0 && !query ? (
                /* ===== Initial State with Suggestions ===== */
                <Card variant="outlined" style={{ borderRadius: 12 }}>
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                        <Title level={4} style={{ margin: 0 }}>เริ่มค้นหาข้อมูลได้เลย</Title>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                            พิมพ์ชื่ออำเภอ ชื่อพืช ชื่อเกษตรกร หรือคำค้นหาอะไรก็ได้
                        </Text>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {SUGGESTIONS.map(s => (
                                <Card
                                    key={s.text}
                                    variant="outlined"
                                    hoverable
                                    style={{ borderRadius: 12, width: 160, textAlign: 'center' }}
                                    styles={{ body: { padding: '16px 12px' } }}
                                    onClick={() => handleSearch(s.text)}
                                >
                                    <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.text}</div>
                                    <Text type="secondary" style={{ fontSize: 11 }}>{s.desc}</Text>
                                </Card>
                            ))}
                        </div>
                    </div>
                </Card>
            ) : results.length > 0 ? (
                <>
                    {/* Summary bar */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        marginBottom: 16, padding: '10px 16px',
                        background: '#f6f8fa', borderRadius: 10, border: '1px solid #d0d7de',
                        flexWrap: 'wrap',
                    }}>
                        <SearchOutlined style={{ color: '#656d76' }} />
                        <Text>
                            พบ <Text strong>{totalResults.toLocaleString()}</Text> รายการ
                            จาก <Text strong>{results.length}</Text> ตาราง
                            สำหรับ &quot;<Text strong>{query}</Text>&quot;
                        </Text>
                        <div style={{ flex: 1 }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            <ReloadOutlined /> ข้อมูลแบบ Real-time จาก Database
                        </Text>
                    </div>

                    {/* Results grouped by table */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {results.map((tableResult) => {
                            const isExpanded = expandedTable === tableResult.table;
                            const columns = buildColumns(tableResult);

                            return (
                                <Card
                                    key={tableResult.table}
                                    variant="outlined"
                                    style={{
                                        borderRadius: 12,
                                        border: isExpanded ? `2px solid ${GROUP_COLORS[tableResult.group] || '#d0d7de'}` : '1px solid #d0d7de',
                                        transition: 'all 0.2s ease',
                                    }}
                                    styles={{ body: { padding: 0 } }}
                                >
                                    <div
                                        onClick={() => setExpandedTable(isExpanded ? null : tableResult.table)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '14px 20px', cursor: 'pointer',
                                            background: isExpanded ? '#f6f8fa' : 'transparent',
                                            borderBottom: isExpanded ? '1px solid #d0d7de' : 'none',
                                            borderRadius: isExpanded ? '12px 12px 0 0' : 12,
                                            transition: 'background 0.2s ease',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: 22 }}>{tableResult.icon}</span>
                                            <div>
                                                <Title level={5} style={{ margin: 0, fontSize: 15 }}>
                                                    {tableResult.label}
                                                </Title>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {tableResult.group}
                                                </Text>
                                            </div>
                                            <Badge
                                                count={tableResult.totalCount}
                                                style={{
                                                    backgroundColor: GROUP_COLORS[tableResult.group] || '#8b949e',
                                                    fontSize: 11,
                                                }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Tag
                                                color="blue"
                                                style={{ cursor: 'pointer', fontSize: 11 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(tableResult.route);
                                                }}
                                            >
                                                ไปที่หน้าข้อมูล <RightOutlined />
                                            </Tag>
                                            <RightOutlined
                                                style={{
                                                    fontSize: 11, color: '#8b949e',
                                                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                                                    transition: 'transform 0.2s',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div style={{ padding: '0 4px 4px' }}>
                                            <Table
                                                dataSource={tableResult.results}
                                                columns={columns}
                                                rowKey={(r) => r.id || Math.random()}
                                                size="small"
                                                pagination={tableResult.results.length > 10 ? { pageSize: 10, size: 'small' } : false}
                                                scroll={{ x: 'max-content' }}
                                                style={{ fontSize: 13 }}
                                            />
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </>
            ) : null}
        </div>
    );
}

function highlightText(text, query) {
    if (!text || !query) return text;
    const str = String(text);
    
    // Split by query case-insensitive
    const parts = str.split(new RegExp(`(${query})`, 'gi'));
    if (parts.length === 1) return str;

    return (
        <>
            {parts.map((part, i) => 
                part.toLowerCase() === query.toLowerCase() ? (
                    <mark key={i} style={{ backgroundColor: '#ffec3d', color: '#000', padding: '0 4px', borderRadius: '4px', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </>
    );
}
