import { useEffect, useState, useMemo } from 'react';
import { Form, Input, InputNumber, Select, Spin, Row, Col, Card } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    ResponsiveContainer, ComposedChart, Line
} from 'recharts';
import { supabase } from '../../supabaseClient';
import CrudTable from '../../components/DataTable/CrudTable';
import { useApiCache } from '../../hooks/useApiCache';
import { useAuth } from '../../contexts/AuthContext';

const columns = [
    { title: 'ชื่อเกษตรกร', importHeader: 'ชื่อ - นามสกุล', dataIndex: 'farmer_name', key: 'farmer_name', width: 150, ellipsis: true, sorter: (a, b) => String(a.farmer_name || '').localeCompare(String(b.farmer_name || ''), 'th') },
    { title: 'ชื่อพืช', importHeader: 'ชื่อพืช', dataIndex: 'crop_name', key: 'crop_name', width: 110, ellipsis: true, sorter: (a, b) => String(a.crop_name || '').localeCompare(String(b.crop_name || ''), 'th') },
    { title: 'รหัสแปลง', importHeader: 'รหัสแปลง', dataIndex: 'plot_code', key: 'plot_code', width: 140, ellipsis: true },
    { title: 'ชนิดแปลง', importHeader: 'ชนิดของแปลง', dataIndex: 'plot_type', key: 'plot_type', width: 80, ellipsis: true },
    { title: 'พื้นที่(ไร่)', importHeader: 'พื้นที่ปลูก(ไร่)', dataIndex: 'area_rai', key: 'area_rai', width: 80, align: 'right', render: v => v?.toLocaleString() || '-', sorter: (a, b) => (a.area_rai || 0) - (b.area_rai || 0) },
    { title: 'ผลผลิต(กก)', importHeader: 'ปริมาณการผลิต(กิโลกรัม)', dataIndex: 'production_volume_kg', key: 'production_volume_kg', width: 90, align: 'right', render: v => v?.toLocaleString() || '-', sorter: (a, b) => (a.production_volume_kg || 0) - (b.production_volume_kg || 0) },
    { title: 'รับรองเมื่อ', importHeader: 'วันที่ได้รับการรับรอง', dataIndex: 'cert_date', key: 'cert_date', width: 90, ellipsis: true },
    { title: 'หมดอายุ', importHeader: 'วันที่สิ้นสุดการรับรอง', dataIndex: 'exp_date', key: 'exp_date', width: 90, ellipsis: true },
    { title: 'หมู่(แปลง)', importHeader: 'แปลง_หมู่', dataIndex: 'plot_moo', key: 'plot_moo', width: 70, align: 'center', ellipsis: true },
    { title: 'ตำบล(แปลง)', importHeader: 'แปลง_ตำบล', dataIndex: 'plot_subdistrict', key: 'plot_subdistrict', width: 95, ellipsis: true },
    { title: 'อำเภอ(แปลง)', importHeader: 'แปลง_อำเภอ', dataIndex: 'plot_district', key: 'plot_district', width: 100, ellipsis: true, sorter: (a, b) => String(a.plot_district || '').localeCompare(String(b.plot_district || ''), 'th') },
    { title: 'หมู่(บ้าน)', importHeader: 'เกษตรกร_หมู่', dataIndex: 'farmer_moo', key: 'farmer_moo', width: 70, align: 'center', ellipsis: true },
    { title: 'ตำบล(บ้าน)', importHeader: 'เกษตรกร_ตำบล', dataIndex: 'farmer_subdistrict', key: 'farmer_subdistrict', width: 95, ellipsis: true },
    { title: 'อำเภอ(บ้าน)', importHeader: 'เกษตรกร_อำเภอ', dataIndex: 'farmer_district', key: 'farmer_district', width: 100, ellipsis: true },
];

const formFields = (
    <>
        <Form.Item name="cert_date" label="วันที่รับรอง"><Input placeholder="ว/ด/ป เช่น 27/8/2567" /></Form.Item>
        <Form.Item name="exp_date" label="วันที่สิ้นสุด"><Input placeholder="ว/ด/ป" /></Form.Item>
        <Form.Item name="farmer_name" label="ชื่อ-นามสกุล" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="plot_code" label="รหัสแปลง"><Input /></Form.Item>
        <Form.Item name="crop_name" label="ชื่อพืช"><Input /></Form.Item>
        <Form.Item name="plot_type" label="ชนิดของแปลง"><Input placeholder="DOA กรมวิชาการเกษตร" /></Form.Item>
        <Form.Item name="area_rai" label="พื้นที่ปลูก(ไร่)"><InputNumber style={{ width: '100%' }} step={0.01} /></Form.Item>
        <Form.Item name="production_volume_kg" label="ปริมาณการผลิต (กก.)"><InputNumber style={{ width: '100%' }} step={0.01} /></Form.Item>
        <Form.Item name="plot_moo" label="แปลง หมู่"><Input /></Form.Item>
        <Form.Item name="plot_subdistrict" label="แปลง ตำบล"><Input /></Form.Item>
        <Form.Item name="plot_district" label="แปลง อำเภอ">
            <Select allowClear options={['เมืองนครปฐม', 'นครชัยศรี', 'สามพราน', 'ดอนตูม', 'บางเลน', 'กำแพงแสน', 'พุทธมณฑล'].map(d => ({ label: d, value: d }))} />
        </Form.Item>
        <Form.Item name="farmer_moo" label="เกษตรกร หมู่"><Input /></Form.Item>
        <Form.Item name="farmer_subdistrict" label="เกษตรกร ตำบล"><Input /></Form.Item>
        <Form.Item name="farmer_district" label="เกษตรกร อำเภอ"><Input /></Form.Item>
    </>
);

const districts = ['เมืองนครปฐม', 'นครชัยศรี', 'สามพราน', 'ดอนตูม', 'บางเลน', 'กำแพงแสน', 'พุทธมณฑล'];

const COLORS = ['#1a7f37', '#0969da', '#bf8700', '#cf222e', '#8250df', '#0550ae', '#bc8c00', '#2da44e'];

const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        let total = 0;
        payload.forEach(entry => { total += (entry.value || 0); });
        return (
            <div style={{ backgroundColor: '#fff', padding: '10px 14px', border: '1px solid #e8ecf0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1f2328' }}>อำเภอ{label}</div>
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} style={{ margin: '4px 0', color: entry.color, fontSize: 13 }}>
                        {entry.name} : {entry.value?.toLocaleString()} ราย
                    </div>
                ))}
                <div style={{ margin: '8px 0 0 0', fontWeight: 600, color: '#1f2328', borderTop: '1px solid #e8ecf0', paddingTop: '8px', fontSize: 13 }}>
                    รวมทั้งหมด : {total.toLocaleString()} ราย
                </div>
            </div>
        );
    }
    return null;
};

export default function Certifications() {
    const { role } = useAuth();
    const isGuest = role === 'guest';

    useEffect(() => {
        document.title = 'มาตรฐาน GAP นครปฐม | ศูนย์ข้อมูลการเกษตรนครปฐม';
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', 'ข้อมูลมาตรฐาน GAP จังหวัดนครปฐม พร้อมสรุปแยกตามพืช พื้นที่ และอายุใบรับรอง');
    }, []);

    // Filters for charts
    const [filterCrop, setFilterCrop] = useState(null);
    const [filterDistrict, setFilterDistrict] = useState(null);
    const [filterYear, setFilterYear] = useState(null);

    const fetchCertifications = async () => {
        if (isGuest) {
            const res = await fetch('/api/public-certifications');
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(payload.error || `HTTP ${res.status}`);
            return payload.data || [];
        }

        const { data, error } = await supabase.from('certifications').select('*');
        if (error && error.code !== '42P01') throw error; // ignore if table doesn't exist yet
        return data || [];
    };

    const { data: dashboardData = [], isLoading: loading } = useApiCache(
        ['all-certifications', role],
        fetchCertifications, 
        { staleMinutes: 10 }
    );

    const fetchPublicTableData = async ({ pagination, search, filters, sorter, defaultSort }) => {
        let rows = [...dashboardData];

        if (search) {
            const term = search.toLowerCase();
            rows = rows.filter(row => (
                String(row.plot_code || '').toLowerCase().includes(term) ||
                String(row.crop_name || '').toLowerCase().includes(term)
            ));
        }

        Object.entries(filters || {}).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return;
            if (key === 'exp_date') {
                rows = rows.filter(row => String(row.exp_date || '').includes(value));
            } else {
                rows = rows.filter(row => row[key] === value);
            }
        });

        const activeSort = sorter?.field && sorter?.order ? sorter : defaultSort;
        if (activeSort?.field && activeSort?.order) {
            rows.sort((a, b) => {
                const av = a[activeSort.field] ?? '';
                const bv = b[activeSort.field] ?? '';
                const result = typeof av === 'number' && typeof bv === 'number'
                    ? av - bv
                    : String(av).localeCompare(String(bv), 'th');
                return activeSort.order === 'ascend' ? result : -result;
            });
        }

        const current = pagination.current || 1;
        const pageSize = pagination.pageSize || 10;
        const from = (current - 1) * pageSize;
        return { data: rows.slice(from, from + pageSize), total: rows.length };
    };

    const cropOptions = useMemo(() => {
        const unique = [...new Set(dashboardData.map(d => d.crop_name).filter(Boolean))].sort();
        return unique.map(c => ({ label: c, value: c }));
    }, [dashboardData]);

    const districtOptions = useMemo(() => {
        const unique = [...new Set(dashboardData.map(d => d.plot_district).filter(Boolean))].sort();
        return unique.map(d => ({ label: d, value: d }));
    }, [dashboardData]);

    const yearOptions = useMemo(() => {
        const years = new Set();
        dashboardData.forEach(item => {
            if (item.exp_date) {
                const parts = String(item.exp_date).split('/');
                if (parts.length === 3 && parts[2].length === 4 && !isNaN(parts[2])) {
                    years.add(parts[2]);
                }
            }
        });
        return Array.from(years).sort().reverse().map(y => ({ label: y, value: y }));
    }, [dashboardData]);

    // Derived filtered data
    const filteredData = useMemo(() => {
        return dashboardData.filter(item => {
            if (filterCrop && item.crop_name !== filterCrop) return false;
            if (filterDistrict && item.plot_district !== filterDistrict) return false;
            if (filterYear) {
                if (!item.exp_date || !String(item.exp_date).includes(`/${filterYear}`)) return false;
            }
            return true;
        });
    }, [dashboardData, filterCrop, filterDistrict, filterYear]);

    // 1. Calculate and find the TRUE Top 10 Crops by Total Planted Area (Rai)
    const top10Crops = useMemo(() => {
        const cropArea = {};
        filteredData.forEach(item => {
            const crop = item.crop_name || 'ไม่ระบุพืช';
            cropArea[crop] = (cropArea[crop] || 0) + (Number(item.area_rai) || 0);
        });
        return Object.entries(cropArea)
            .sort((a, b) => b[1] - a[1]) // Sort descending by Area Rai
            .slice(0, 10) // Take Top 10
            .map(entry => entry[0]);
    }, [filteredData]);

    // 2. Pie Chart: Number of unique farmers ONLY for the Top 10 Crops
    const pieData = useMemo(() => {
        const cropFarmers = {};
        filteredData.forEach(item => {
            const crop = item.crop_name || 'ไม่ระบุพืช';
            if (!top10Crops.includes(crop)) return; // Only process Top 10 crops

            if (!cropFarmers[crop]) cropFarmers[crop] = new Set();
            const farmerKey = item.farmer_name || item.farmer_key;
            if (farmerKey) cropFarmers[crop].add(farmerKey);
        });

        // Ensure they remain in the Top 10 sorted order
        return top10Crops.map(name => ({
            name,
            value: cropFarmers[name] ? cropFarmers[name].size : 0
        })).filter(d => d.value > 0);
    }, [filteredData, top10Crops]);

    // 3. Bar Chart: Number of unique farmers by district (stacked by the Top 10 Crops)
    const { barData, barGroups } = useMemo(() => {
        const districtCropFarmers = {};

        filteredData.forEach(item => {
            const dist = item.plot_district || 'ไม่ระบุอำเภอ';
            const crop = item.crop_name || 'ไม่ระบุพืช';
            const farmer = item.farmer_name || item.farmer_key;

            if (!top10Crops.includes(crop)) return; // Only process Top 10 crops

            if (!districtCropFarmers[dist]) {
                districtCropFarmers[dist] = { _totalSet: new Set() };
            }
            if (!districtCropFarmers[dist][crop]) {
                districtCropFarmers[dist][crop] = new Set();
            }

            if (farmer) {
                districtCropFarmers[dist][crop].add(farmer);
                districtCropFarmers[dist]._totalSet.add(farmer);
            }
        });

        const barDataArray = Object.keys(districtCropFarmers).map(dist => {
            const obj = { name: dist, total: districtCropFarmers[dist]._totalSet.size };
            top10Crops.forEach(crop => {
                obj[crop] = districtCropFarmers[dist][crop] ? districtCropFarmers[dist][crop].size : 0;
            });
            return obj;
        }).sort((a, b) => b.total - a.total); // Sort districts by total farmers descending

        return { barData: barDataArray, barGroups: top10Crops };
    }, [filteredData, top10Crops]);

    // Table filters config
    const tableFilterConfig = [
        { key: 'crop_name', label: 'ชื่อพืช', options: cropOptions.map(o => o.value) },
        { key: 'plot_district', label: 'อำเภอ (แปลง)', options: districtOptions.map(o => o.value).concat(districts) },
        { key: 'exp_date', label: 'ปีหมดอายุ', options: yearOptions.map(o => o.value), operator: 'ilike' }
    ];

    // 4. Horizontal Bar Chart: Total Production Volume (Kg) by Crop (Top 10 by Volume)
    const volumeData = useMemo(() => {
        const cropVolume = {};
        filteredData.forEach(item => {
            const crop = item.crop_name || 'ไม่ระบุพืช';
            cropVolume[crop] = (cropVolume[crop] || 0) + (Number(item.production_volume_kg) || 0);
        });
        return Object.entries(cropVolume)
            .sort((a, b) => b[1] - a[1]) // Sort descending
            .slice(0, 10)
            .map(([name, value]) => ({ name, value }))
            .filter(d => d.value > 0);
    }, [filteredData]);

    // 5. Line/Bar Chart: Certificates Expiring by Year
    const expireData = useMemo(() => {
        const yearCount = {};
        filteredData.forEach(item => {
            if (!item.exp_date) return;
            const parts = item.exp_date.split('/');
            const year = parts.length === 3 ? parts[2] : 'ไม่ระบุ';
            // Simple validation: check if it looks like a year (4 digits)
            if (year.length === 4 && !isNaN(year)) {
                 yearCount[year] = (yearCount[year] || 0) + 1;
            }
        });
        return Object.entries(yearCount)
            .sort((a, b) => a[0].localeCompare(b[0])) // Sort chronologically year by year
            .map(([year, count]) => ({ year, count }));
    }, [filteredData]);

    return (
        <div>
            {/* ===== Dashboard Section ===== */}
            <div style={{
                padding: 20,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e8ecf0',
                marginBottom: 24
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <PieChartOutlined style={{ fontSize: 18, color: '#1a7f37' }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2328' }}>สรุปข้อมูลเกษตรกรมาตรฐาน GAP</span>
                </div>

                {/* Filters */}
                <div style={{
                    display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20,
                    padding: '12px 16px', background: '#f6f8fa', borderRadius: 8, border: '1px solid #e8ecf0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, color: '#656d76', fontWeight: 500 }}>พืช:</span>
                        <Select
                            value={filterCrop}
                            onChange={setFilterCrop}
                            options={cropOptions}
                            placeholder="ทั้งหมด"
                            allowClear
                            style={{ minWidth: 150 }}
                            size="small"
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, color: '#656d76', fontWeight: 500 }}>อำเภอ:</span>
                        <Select
                            value={filterDistrict}
                            onChange={setFilterDistrict}
                            options={districtOptions}
                            placeholder="ทั้งหมด"
                            allowClear
                            style={{ minWidth: 150 }}
                            size="small"
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, color: '#656d76', fontWeight: 500 }}>ปีหมดอายุ:</span>
                        <Select
                            value={filterYear}
                            onChange={setFilterYear}
                            options={yearOptions}
                            placeholder="ทั้งหมด"
                            allowClear
                            style={{ minWidth: 120 }}
                            size="small"
                        />
                    </div>
                </div>

                {/* Charts */}
                {loading ? (
                    <div style={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Spin tip="กำลังโหลด..." />
                    </div>
                ) : (
                    <Row gutter={[24, 24]}>
                        <Col xs={24} lg={12}>
                            <Card title="จำนวนเกษตรกร (ราย) แยกตามชนิดพืช (Top 10)" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                                <div style={{ height: 300 }}>
                                    {pieData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip formatter={(value) => [value.toLocaleString() + ' ราย', 'เกษตรกร']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76' }}>ไม่พบข้อมูล (รอการเพิ่มไฟล์ฐานข้อมูล)</div>
                                    )}
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Card title="ภาพรวมจำนวนเกษตรกร (ราย) แยกตามอำเภอ (เฉพาะพืชที่มีพื้นที่ปลูก 10 อันดับแรก)" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                                <div style={{ height: 300 }}>
                                    {barData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#656d76' }} axisLine={{ stroke: '#e8ecf0' }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#656d76' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: '#f6f8fa' }} content={<CustomBarTooltip />} />
                                                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                                {barGroups.slice(0, 10).map((group, index) => (
                                                    <Bar key={group} dataKey={group} stackId="a" fill={COLORS[index % COLORS.length]} maxBarSize={50} />
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76' }}>ไม่พบข้อมูล (รอการเพิ่มไฟล์ฐานข้อมูล)</div>
                                    )}
                                </div>
                            </Card>
                        </Col>
                    </Row>
                )}
                
                {!loading && (
                    <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                        <Col xs={24} lg={12}>
                            <Card title="ปริมาณผลผลิตรวม (กิโลกรัม) - 10 อันดับแรก" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                                <div style={{ height: 300 }}>
                                    {volumeData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={volumeData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8ecf0" />
                                                <XAxis type="number" tick={{ fontSize: 12, fill: '#656d76' }} tickFormatter={(val) => val.toLocaleString()} />
                                                <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#656d76' }} width={80} interval={0} />
                                                <RechartsTooltip formatter={(value) => [value.toLocaleString() + ' กก.', 'ผลผลิต']} cursor={{fill: '#f6f8fa'}} />
                                                <Bar dataKey="value" fill="#d46b08" radius={[0, 4, 4, 0]} maxBarSize={30}>
                                                    {volumeData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76' }}>ไม่พบข้อมูล</div>
                                    )}
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Card title="แนวโน้มใบรับรอง GAP หมดอายุ (แบ่งตามปี)" size="small" bordered={false} style={{ background: '#fafbfc' }}>
                                <div style={{ height: 300 }}>
                                    {expireData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={expireData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf0" />
                                                <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#656d76' }} />
                                                <YAxis tick={{ fontSize: 12, fill: '#656d76' }} allowDecimals={false} />
                                                <RechartsTooltip formatter={(value) => [value.toLocaleString() + ' แปลง', 'ใบรับรองจะหมดอายุ']} />
                                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                                <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: '#f59e0b' }} activeDot={{ r: 8 }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76' }}>ไม่พบข้อมูล</div>
                                    )}
                                </div>
                            </Card>
                        </Col>
                    </Row>
                )}
            </div>

            {/* ===== Data Table Section ===== */}
            <CrudTable
                tableName="certifications"
                title="ฐานข้อมูลมาตรฐาน GAP"
                columns={columns}
                formFields={formFields}
                searchField="farmer_name"
                searchFields={['farmer_name', 'plot_code', 'crop_name']}
                filterConfig={tableFilterConfig}
                fetchDataOverride={isGuest ? fetchPublicTableData : null}
                fetchAllOverride={isGuest ? async () => dashboardData : null}
            />
        </div>
    );
}
