import { useEffect, useState, useRef, useMemo } from 'react';
import { Skeleton, Button, Row, Col, Card, Tag } from 'antd';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    ClockCircleOutlined, FilePdfOutlined,
    AimOutlined, BankOutlined, TeamOutlined, AlertOutlined,
    ScheduleOutlined
} from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

const PIE_COLORS = [
    '#66bb6a', '#42a5f5', '#ffca28', '#ef5350', '#ab47bc',
    '#26a69a', '#ff7043', '#8d6e63', '#78909c', '#5c6bc0',
    '#ec407a', '#29b6f6', '#9ccc65', '#ffa726', '#7e57c2'
];

// All tables grouped by section
const groupConfig = [
    { group: 'ยุทธศาสตร์ฯ', icon: '🎯', color: '#1565c0', tables: [
        { table: 'agricultural_areas', label: 'พื้นที่การเกษตร' },
        { table: 'learning_centers', label: 'ศพก.' },
        { table: 'disasters', label: 'ภัยพิบัติ' },
    ]},
    { group: 'ส่งเสริมการผลิต', icon: '🌱', color: '#43a047', tables: [
        { table: 'large_plots', label: 'แปลงใหญ่' },
        { table: 'certifications', label: 'มาตรฐาน GAP' },
        { table: 'crop_production', label: 'ผลผลิตพืช' },
    ]},
    { group: 'พัฒนาเกษตรกร', icon: '🤝', color: '#6a1b9a', tables: [
        { table: 'community_enterprises', label: 'วิสาหกิจ' },
        { table: 'smart_farmers', label: 'เกษตรกรรุ่นใหม่' },
        { table: 'farmer_groups', label: 'กลุ่มแม่บ้าน' },
        { table: 'farmer_institutes', label: 'สถาบันเกษตรกร' },
        { table: 'agri_tourism', label: 'ท่องเที่ยวเกษตร' },
    ]},
    { group: 'อารักขาพืช', icon: '🛡️', color: '#e65100', tables: [
        { table: 'forecast_plots', label: 'แปลงพยากรณ์' },
        { table: 'pest_centers', label: 'ศจช.' },
        { table: 'soil_fertilizer_centers', label: 'ศดปช.' },
        { table: 'fire_hotspots', label: 'จุดเฝ้าระวัง PM2.5' },
    ]},
];

const allTables = groupConfig.flatMap(g => g.tables.map(t => ({ ...t, group: g.group, groupIcon: g.icon, groupColor: g.color })));

function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'เมื่อสักครู่';
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} วันที่แล้ว`;
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard() {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [agriData, setAgriData] = useState([]);
    const [largePlots, setLargePlots] = useState([]);
    const [fiData, setFiData] = useState([]);
    const [activities, setActivities] = useState([]);
    const [activityLoading, setActivityLoading] = useState(true);
    const [pdfExporting, setPdfExporting] = useState(false);
    const dashRef = useRef(null);

    useEffect(() => {
        loadStats();
        loadChartData();
        loadActivities();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        const results = [];
        for (const tbl of allTables) {
            try {
                const { count, error } = await supabase
                    .from(tbl.table)
                    .select('*', { count: 'exact', head: true });
                results.push({ ...tbl, count: error ? 0 : (count ?? 0) });
            } catch {
                results.push({ ...tbl, count: 0 });
            }
        }
        setStats(results);
        setLoading(false);
    };

    const loadChartData = async () => {
        try {
            const [agri, lp, fi] = await Promise.all([
                supabase.from('agricultural_areas').select('*'),
                supabase.from('large_plots').select('*'),
                supabase.from('farmer_institutes').select('*'),
            ]);
            setAgriData(agri.data || []);
            setLargePlots(lp.data || []);
            setFiData(fi.data || []);
        } catch { /* skip */ }
    };

    const loadActivities = async () => {
        setActivityLoading(true);
        const acts = [];
        for (const tbl of allTables) {
            try {
                const { data, error } = await supabase
                    .from(tbl.table)
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(1);
                if (!error && data?.length) {
                    const row = data[0];
                    acts.push({
                        table: tbl.label,
                        group: tbl.group,
                        icon: tbl.groupIcon,
                        name: row.name || row.full_name || row.project_name || row.center_name || row.district || tbl.label,
                        created_at: row.created_at,
                    });
                }
            } catch { /* skip */ }
        }
        acts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setActivities(acts.slice(0, 8));
        setActivityLoading(false);
    };

    // --- Charts ---
    // Agricultural areas: Pie by crop type
    const agriPie = useMemo(() => {
        const fields = [
            { key: 'rice_in_season_rai', label: 'ข้าวนาปี' },
            { key: 'rice_off_season_rai', label: 'ข้าวนาปรัง' },
            { key: 'field_crops_rai', label: 'พืชไร่' },
            { key: 'horticulture_rai', label: 'พืชสวน' },
            { key: 'fruit_trees_rai', label: 'ไม้ผล/ไม้ยืนต้น' },
            { key: 'vegetables_rai', label: 'พืชผัก' },
            { key: 'flowers_rai', label: 'ไม้ดอก/ไม้ประดับ' },
            { key: 'herbs_spices_rai', label: 'สมุนไพร' },
        ];
        return fields.map(f => ({
            name: f.label,
            value: agriData.reduce((sum, row) => sum + (Number(row[f.key]) || 0), 0)
        })).filter(d => d.value > 0);
    }, [agriData]);

    // Group summary bar
    const groupBar = useMemo(() => {
        return groupConfig.map(g => ({
            name: g.group,
            value: stats.filter(s => s.group === g.group).reduce((sum, s) => sum + s.count, 0),
            color: g.color,
        })).filter(d => d.value > 0);
    }, [stats]);

    // Large plots by commodity
    const lpPie = useMemo(() => {
        const map = {};
        largePlots.forEach(p => {
            const cg = p.commodity_group || 'ไม่ระบุ';
            map[cg] = (map[cg] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [largePlots]);

    // Highlights: meaningful stats
    const highlights = useMemo(() => {
        const totalAgriRai = agriData.reduce((sum, r) => sum + (Number(r.total_area_rai) || 0), 0);
        const totalCropRai = agriData.reduce((sum, r) => sum + (Number(r.agri_crop_area_rai) || 0), 0);
        const lpCount = largePlots.length;
        const uniqueCommodities = [...new Set(largePlots.map(p => p.commodity_group).filter(Boolean))].length;
        const getCount = (table) => stats.find(s => s.table === table)?.count || 0;

        // Farmer institutes specific computes
        const totalFiGroups = fiData.reduce((sum, r) => sum + (Number(r.total_groups) || 0), 0);
        const totalHousewives = fiData.reduce((sum, r) => sum + (Number(r.housewives_groups) || 0), 0);
        const totalYoungFarmers = fiData.reduce((sum, r) => sum + (Number(r.young_farmer_groups) || 0), 0);

        return [
            { icon: '🌾', label: 'พื้นที่เกษตรรวม', value: totalAgriRai.toLocaleString() + ' ไร่', bg: '#f0fdf4', iconBg: '#43a047' },
            { icon: '🌿', label: 'พื้นที่ด้านพืช', value: totalCropRai.toLocaleString() + ' ไร่', bg: '#ecfdf5', iconBg: '#26a69a' },
            { icon: '📦', label: 'แปลงใหญ่', value: lpCount + ' แปลง', bg: '#eff6ff', iconBg: '#1565c0' },
            { icon: '🏷️', label: 'กลุ่มสินค้าแปลงใหญ่', value: uniqueCommodities + ' กลุ่ม', bg: '#f5f3ff', iconBg: '#6a1b9a' },
            { icon: '🏫', label: 'ศูนย์เรียนรู้ (ศพก.)', value: getCount('learning_centers') + ' ศูนย์', bg: '#eff6ff', iconBg: '#1976d2' },
            { icon: '🏥', label: 'ศูนย์จัดการศัตรูพืช (ศจช.)', value: getCount('pest_centers') + ' ศูนย์', bg: '#fff7ed', iconBg: '#e65100' },
            { icon: '🧪', label: 'ศูนย์ดินปุ๋ย (ศดปช.)', value: getCount('soil_fertilizer_centers') + ' ศูนย์', bg: '#f0fdfa', iconBg: '#00695c' },
            { icon: '🤝', label: 'สถาบันเกษตรกรรวม', value: totalFiGroups.toLocaleString() + ' กลุ่ม', bg: '#fdf2f8', iconBg: '#c2185b' },
            { icon: '👩‍🌾', label: 'กลุ่มแม่บ้านเกษตรกร', value: totalHousewives.toLocaleString() + ' กลุ่ม', bg: '#f0fdf4', iconBg: '#1a7f37' },
            { icon: '🧑‍🌾', label: 'กลุ่มยุวเกษตรกร', value: totalYoungFarmers.toLocaleString() + ' กลุ่ม', bg: '#fffbeb', iconBg: '#bf8700' },
        ].filter(h => !h.value.startsWith('0'));
    }, [agriData, largePlots, fiData, stats]);

    const totalRecords = stats.reduce((sum, s) => sum + s.count, 0);

    const handleExportPdf = async () => {
        if (!dashRef.current) return;
        setPdfExporting(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');
            const canvas = await html2canvas(dashRef.current, {
                scale: 2, useCORS: true, logging: false, backgroundColor: '#f6f8fa',
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const ratio = Math.min(pdfW / canvas.width, pdfH / canvas.height);
            const w = canvas.width * ratio;
            const h = canvas.height * ratio;
            pdf.addImage(imgData, 'PNG', (pdfW - w) / 2, 4, w, h);
            pdf.save(`dashboard_${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (err) { console.error(err); }
        finally { setPdfExporting(false); }
    };

    return (
        <div ref={dashRef}>
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div className="md-page-header" style={{ marginBottom: 0 }}>
                    <h2>📊 Dashboard ภาพรวม</h2>
                </div>
                <Button
                    icon={<FilePdfOutlined />}
                    onClick={handleExportPdf}
                    loading={pdfExporting}
                    className="export-btn pdf-export-btn"
                >
                    พิมพ์ PDF
                </Button>
            </div>

            {/* ===== Group Summary Cards ===== */}
            <div className="md-stat-row">
                {loading ? (
                    [1, 2, 3, 4].map(i => (
                        <div key={i} className="md-stat-card"><Skeleton active paragraph={{ rows: 1 }} /></div>
                    ))
                ) : (
                    groupConfig.map((g) => {
                        const groupTotal = stats.filter(s => s.group === g.group).reduce((sum, s) => sum + s.count, 0);
                        const IconMap = { 'ยุทธศาสตร์ฯ': AimOutlined, 'ส่งเสริมการผลิต': BankOutlined, 'พัฒนาเกษตรกร': TeamOutlined, 'อารักขาพืช': AlertOutlined };
                        const IconComp = IconMap[g.group] || AimOutlined;
                        const colorMap = { '#1565c0': 'blue', '#43a047': 'green', '#6a1b9a': 'purple', '#e65100': 'orange' };
                        return (
                            <div key={g.group} className="md-stat-card">
                                <div className="md-stat-card-inner">
                                    <div className="md-stat-card-top">
                                        <div className={`md-stat-icon ${colorMap[g.color] || 'blue'}`}>
                                            <IconComp style={{ fontSize: 24 }} />
                                        </div>
                                        <div className="md-stat-info">
                                            <div className="md-stat-label">{g.icon} {g.group}</div>
                                            <div className="md-stat-value">{groupTotal.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className="md-stat-footer">
                                        <ScheduleOutlined />
                                        <span>รายการข้อมูลรวม {g.tables.length} หมวด</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ===== Charts ===== */}
            <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
                {/* Agricultural Areas Pie */}
                <Col xs={24} lg={12}>
                    <Card title="🌾 สัดส่วนพื้นที่เกษตรตามชนิดพืช" size="small" bordered style={{ borderRadius: 12 }}>
                        <div style={{ height: 300 }}>
                            {agriPie.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={agriPie} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                            {agriPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <RTooltip formatter={(val) => [val.toLocaleString() + ' ไร่', 'พื้นที่']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <EmptyChart label="พื้นที่การเกษตร" />}
                        </div>
                    </Card>
                </Col>

                {/* Large Plots Pie */}
                <Col xs={24} lg={12}>
                    <Card title="🌿 แปลงใหญ่ตามกลุ่มสินค้า" size="small" bordered style={{ borderRadius: 12 }}>
                        <div style={{ height: 300 }}>
                            {lpPie.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={lpPie} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                            {lpPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <RTooltip formatter={(val) => [val + ' แปลง', 'จำนวน']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <EmptyChart label="แปลงใหญ่" />}
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* ===== Bottom Row: Key Highlights + Activity ===== */}
            <div className="md-bottom-row">
                {/* Key Highlights */}
                <div className="md-projects-card">
                    <div className="md-projects-header">
                        <h3>⭐ ไฮไลท์ข้อมูลสำคัญ</h3>
                        <p>ตัวเลขสำคัญจากข้อมูลจริงในระบบ</p>
                    </div>
                    {loading ? (
                        <div style={{ padding: '16px 24px' }}>
                            <Skeleton active paragraph={{ rows: 6 }} />
                        </div>
                    ) : (
                        <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                            {highlights.map((h, i) => (
                                <div key={i} style={{
                                    background: h.bg, borderRadius: 12, padding: '18px 20px',
                                    display: 'flex', alignItems: 'center', gap: 16,
                                    border: '1px solid #f0f2f5', transition: 'transform 0.15s',
                                }}>
                                    <div style={{
                                        width: 52, height: 52, borderRadius: 12,
                                        background: h.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 26, flexShrink: 0, boxShadow: `0 4px 12px ${h.iconBg}40`
                                    }}>
                                        {h.icon}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 24, fontWeight: 700, color: '#1f2328', lineHeight: 1.2 }}>
                                            {h.value}
                                        </div>
                                        <div style={{ fontSize: 13, color: '#656d76', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {h.label}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Activity Timeline */}
                <div className="md-activity-card">
                    <div className="md-activity-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ margin: 0, marginBottom: 4 }}>🕐 กิจกรรมล่าสุด</h3>
                            <p style={{ margin: 0 }}>อัปเดตข้อมูลล่าสุดจากทุกกลุ่มงาน</p>
                        </div>
                        <Link to="/dashboard/admin/recent-activities">
                            <Button type="primary" size="small" style={{ borderRadius: 6 }}>
                                ดูเพิ่มเติม
                            </Button>
                        </Link>
                    </div>
                    {activityLoading ? (
                        <div style={{ padding: '0 24px 20px' }}>
                            <Skeleton active paragraph={{ rows: 6 }} />
                        </div>
                    ) : activities.length > 0 ? (
                        <ul className="md-timeline">
                            {activities.map((act, i) => {
                                const dotColors = ['green', 'blue', 'orange', 'purple', 'red', 'pink'];
                                return (
                                    <li key={i} className="md-timeline-item">
                                        <div className={`md-timeline-dot ${dotColors[i % dotColors.length]}`}>
                                            {act.icon}
                                        </div>
                                        <div className="md-timeline-content">
                                            <div className="md-timeline-title">
                                                <strong>{act.table}</strong> — {act.name}
                                            </div>
                                            <div className="md-timeline-time">
                                                <ClockCircleOutlined /> {formatDate(act.created_at)} · {formatTimeAgo(act.created_at)}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div style={{ padding: '20px 24px', textAlign: 'center', color: '#8b949e' }}>
                            ยังไม่มีกิจกรรม
                        </div>
                    )}
                </div>
            </div>

            {/* Empty state */}
            {totalRecords === 0 && !loading && (
                <div className="md-empty-state">
                    <div className="md-empty-icon">📭</div>
                    <h3>ยังไม่มีข้อมูลในระบบ</h3>
                    <p>เริ่มเพิ่มข้อมูลผ่านเมนูด้านซ้ายได้เลยครับ</p>
                </div>
            )}
        </div>
    );
}

function EmptyChart({ label }) {
    return (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 32 }}>📭</span>
            <span>ยังไม่มีข้อมูล{label}</span>
        </div>
    );
}
