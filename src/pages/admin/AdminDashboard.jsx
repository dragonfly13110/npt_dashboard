import { Skeleton } from 'antd';
import {
    CarOutlined,
    ClockCircleOutlined,
    DatabaseOutlined,
    DollarOutlined,
    RiseOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import { barOption, pieOption } from '../../components/charts/echartOptions';
import { supabase } from '../../supabaseClient';
import { useApiCache } from '../../hooks/useApiCache';
import { useAuth } from '../../contexts/AuthContext';
import EChart from '../../components/widgets/EChart';

const chartPalette = ['#1a7f37', '#0969da', '#bf8700', '#8250df', '#cf222e', '#0a7ea4'];
const axisBase = {
    axisLabel: { color: '#656d76', fontSize: 11 },
    axisLine: { lineStyle: { color: '#d0d7de' } },
    axisTick: { show: false },
};

const tables = [
    { table: 'personnel', label: 'บุคลากร', shortLabel: 'คน', color: 'green', iconComponent: TeamOutlined },
    { table: 'assets', label: 'พัสดุ/ครุภัณฑ์', shortLabel: 'รายการ', color: 'blue', iconComponent: CarOutlined },
    { table: 'budgets', label: 'งบประมาณ', shortLabel: 'รายการ', color: 'orange', iconComponent: DollarOutlined },
];

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

async function fetchTrend(tableCfg) {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            month: d.toLocaleDateString('th-TH', { month: 'short' }),
            start: d.toISOString(),
            end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString(),
            count: 0,
        });
    }

    for (const cfg of tableCfg) {
        for (const m of months) {
            try {
                const { count, error } = await supabase
                    .from(cfg.table)
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', m.start)
                    .lte('created_at', m.end);
                if (!error) m.count += (count ?? 0);
            } catch {
                // Skip unavailable data sources so the overview still renders.
            }
        }
    }
    return months.map(m => ({ name: m.month, รายการ: m.count }));
}

async function fetchRecentActivity(tableCfg, role) {
    const activities = [];
    for (const cfg of tableCfg) {
        try {
            const { data, error } = await supabase
                .from(cfg.table)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(3);
            if (!error && data) {
                data.forEach(row => {
                    activities.push({
                        table: cfg.label,
                        color: cfg.color,
                        name: role === 'guest' ? cfg.label : (row.full_name || row.name || row.project_name || row.title || cfg.label),
                        created_at: row.created_at,
                    });
                });
            }
        } catch {
            // Skip unavailable data sources so the overview still renders.
        }
    }
    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return activities.slice(0, 8);
}

function miniBarOption(data) {
    const option = barOption(data, [{ key: 'value', name: 'จำนวน', color: '#1a7f37' }], {
        grid: { top: 20, right: 18, bottom: 32, left: 40 },
    });
    return {
        ...option,
        color: chartPalette,
        tooltip: { ...option.tooltip, backgroundColor: '#0f172a' },
        xAxis: { ...option.xAxis, ...axisBase },
        yAxis: { ...option.yAxis, ...axisBase, splitLine: { lineStyle: { color: '#eef1f4', type: 'dashed' } } },
    };
}

function miniPieOption(data) {
    const option = pieOption(data, {
        colors: chartPalette,
        radius: ['48%', '72%'],
    });
    return {
        ...option,
        tooltip: { ...option.tooltip, backgroundColor: '#0f172a' },
        series: option.series.map((series) => ({
            ...series,
            label: { ...series.label, color: '#1f2328', fontSize: 12 },
            labelLine: { ...series.labelLine, lineStyle: { color: '#d0d7de' } },
        })),
    };
}

function miniLineOption(data) {
    return {
        tooltip: { trigger: 'axis', backgroundColor: '#0f172a' },
        grid: { top: 20, right: 18, bottom: 28, left: 34, containLabel: true },
        xAxis: { type: 'category', data: data.map((item) => item.name), ...axisBase },
        yAxis: { type: 'value', ...axisBase, splitLine: { lineStyle: { color: '#eef1f4', type: 'dashed' } } },
        series: [{
            type: 'line',
            data: data.map((item) => item.รายการ ?? item['รายการ'] ?? 0),
            smooth: true,
            symbol: 'circle',
            symbolSize: 7,
            areaStyle: { color: 'rgba(26, 127, 55, 0.08)' },
            lineStyle: { color: '#1a7f37', width: 2.5 },
            itemStyle: { color: '#1a7f37' },
        }],
    };
}

function getShare(count, total) {
    if (!total) return 0;
    return Math.round((count / total) * 100);
}

export default function AdminDashboard() {
    const { role } = useAuth();
    const fetchAdminDashboardData = async () => {
        const statsResults = [];
        for (const tbl of tables) {
            try {
                const { count, error } = await supabase
                    .from(tbl.table)
                    .select('*', { count: 'exact', head: true });
                statsResults.push({ ...tbl, count: error ? 0 : (count ?? 0) });
            } catch {
                statsResults.push({ ...tbl, count: 0 });
            }
        }

        const [trendData, actData] = await Promise.all([
            fetchTrend(tables),
            fetchRecentActivity(tables, role),
        ]);

        return { stats: statsResults, trendData, activities: actData };
    };

    const { data, isLoading } = useApiCache(['admin-dashboard-data', role], fetchAdminDashboardData);

    const stats = data?.stats || [];
    const trendData = data?.trendData || [];
    const activities = data?.activities || [];
    const loading = isLoading;
    const trendLoading = isLoading;
    const activityLoading = isLoading;

    const totalRecords = stats.reduce((sum, s) => sum + s.count, 0);
    const barData = stats.filter(s => s.count > 0).map(s => ({ name: s.label, value: s.count }));
    const pieData = stats.filter(s => s.count > 0).map(s => ({ name: s.label, value: s.count }));
    const topCategory = stats.reduce((best, item) => (item.count > (best?.count ?? -1) ? item : best), null);
    const latestActivity = activities[0]?.created_at ? formatTimeAgo(activities[0].created_at) : 'ยังไม่มีกิจกรรม';

    return (
        <div className="admin-overview-page">
            <section className="admin-overview-hero">
                <div>
                    <div className="admin-overview-eyebrow">ฝ่ายบริหารทั่วไป</div>
                    <h1>ภาพรวมงานบริหารจังหวัด</h1>
                    <p>ติดตามข้อมูลบุคลากร พัสดุ/ครุภัณฑ์ งบประมาณ และความเคลื่อนไหวล่าสุดจากฐานข้อมูลกลาง</p>
                </div>
                <div className="admin-overview-hero-metrics" aria-label="สรุปภาพรวมฝ่ายบริหาร">
                    <div>
                        <span>ข้อมูลทั้งหมด</span>
                        <strong>{loading ? '-' : totalRecords.toLocaleString()}</strong>
                    </div>
                    <div>
                        <span>หมวดที่มากสุด</span>
                        <strong>{loading ? '-' : topCategory?.label || '-'}</strong>
                    </div>
                    <div>
                        <span>อัปเดตล่าสุด</span>
                        <strong>{activityLoading ? '-' : latestActivity}</strong>
                    </div>
                </div>
            </section>

            <section className="admin-overview-stat-grid" aria-label="ตัวชี้วัดหลัก">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="admin-overview-card admin-overview-stat-card">
                            <Skeleton active paragraph={{ rows: 2 }} />
                        </div>
                    ))
                ) : (
                    stats.map((s) => {
                        const IconComp = s.iconComponent;
                        return (
                            <article key={s.table} className={`admin-overview-card admin-overview-stat-card is-${s.color}`}>
                                <div className="admin-overview-stat-top">
                                    <div className="admin-overview-stat-icon">
                                        <IconComp />
                                    </div>
                                    <div className="admin-overview-share">{getShare(s.count, totalRecords)}%</div>
                                </div>
                                <div className="admin-overview-stat-label">{s.label}</div>
                                <div className="admin-overview-stat-value">{s.count.toLocaleString()}</div>
                                <div className="admin-overview-stat-note">รวม{s.shortLabel}ในระบบบริหาร</div>
                            </article>
                        );
                    })
                )}
            </section>

            <section className="admin-overview-chart-grid">
                <article className="admin-overview-card admin-overview-chart-card">
                    <div className="admin-overview-card-header">
                        <div>
                            <h2>จำนวนข้อมูลตามหมวด</h2>
                            <p>เปรียบเทียบขนาดฐานข้อมูลของงานบริหารแต่ละประเภท</p>
                        </div>
                        <DatabaseOutlined />
                    </div>
                    <div className="admin-overview-chart">
                        {barData.length > 0 ? (
                            <EChart option={miniBarOption(barData)} style={{ height: 280 }} />
                        ) : (
                            <div className="admin-overview-empty-inline">ยังไม่มีข้อมูลสำหรับแสดงกราฟ</div>
                        )}
                    </div>
                </article>

                <article className="admin-overview-card admin-overview-chart-card">
                    <div className="admin-overview-card-header">
                        <div>
                            <h2>สัดส่วนข้อมูล</h2>
                            <p>เห็นน้ำหนักของแต่ละหมวดเมื่อเทียบกับข้อมูลทั้งหมด {totalRecords.toLocaleString()} รายการ</p>
                        </div>
                        <RiseOutlined />
                    </div>
                    <div className="admin-overview-chart">
                        {pieData.length > 0 ? (
                            <EChart option={miniPieOption(pieData)} style={{ height: 280 }} />
                        ) : (
                            <div className="admin-overview-empty-inline">ยังไม่มีข้อมูลสำหรับแสดงกราฟ</div>
                        )}
                    </div>
                </article>
            </section>

            <section className="admin-overview-bottom-grid">
                <article className="admin-overview-card admin-overview-chart-card">
                    <div className="admin-overview-card-header">
                        <div>
                            <h2>แนวโน้มรายเดือน</h2>
                            <p>จำนวนข้อมูลที่เพิ่มขึ้นในช่วง 6 เดือนย้อนหลัง</p>
                        </div>
                        <SafetyCertificateOutlined />
                    </div>
                    <div className="admin-overview-chart">
                        {trendLoading ? (
                            <Skeleton active paragraph={{ rows: 5 }} />
                        ) : (
                            <EChart option={miniLineOption(trendData)} style={{ height: 280 }} />
                        )}
                    </div>
                </article>

                <aside className="admin-overview-card admin-overview-activity-card">
                    <div className="admin-overview-card-header">
                        <div>
                            <h2>กิจกรรมล่าสุด</h2>
                            <p>รายการข้อมูลที่มีการเพิ่มล่าสุดในฝ่ายบริหาร</p>
                        </div>
                        <ClockCircleOutlined />
                    </div>
                    {activityLoading ? (
                        <Skeleton active paragraph={{ rows: 7 }} />
                    ) : activities.length > 0 ? (
                        <ul className="admin-overview-activity-list">
                            {activities.map((act, i) => {
                                const matchedTable = tables.find(table => table.label === act.table);
                                const IconComp = matchedTable?.iconComponent || DatabaseOutlined;
                                return (
                                    <li key={i} className="admin-overview-activity-item">
                                        <div className={`admin-overview-activity-icon is-${matchedTable?.color || 'green'}`}>
                                            <IconComp />
                                        </div>
                                        <div className="admin-overview-activity-content">
                                            <div className="admin-overview-activity-title">
                                                <strong>{act.table}</strong>
                                                <span>{act.name}</span>
                                            </div>
                                            <div className="admin-overview-activity-time">
                                                {formatDate(act.created_at)} · {formatTimeAgo(act.created_at)}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="admin-overview-empty-inline">ยังไม่มีกิจกรรมในฝ่ายบริหาร</div>
                    )}
                </aside>
            </section>

            {barData.length === 0 && !loading && (
                <div className="admin-overview-empty-state">
                    <DatabaseOutlined />
                    <h2>ยังไม่มีข้อมูลในกลุ่มนี้</h2>
                    <p>เริ่มเพิ่มข้อมูลผ่านเมนูด้านซ้ายได้เลยครับ</p>
                </div>
            )}
        </div>
    );
}
