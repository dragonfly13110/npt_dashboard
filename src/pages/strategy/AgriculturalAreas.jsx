import { useEffect, useState, useMemo } from 'react';
import { Form, Input, InputNumber, Select, Tag, Row, Col, Card, Spin } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import EChart from '../../components/widgets/EChart';
import { CROP_COLORS } from '../../components/charts/echartOptions';
import CrudTable from '../../components/DataTable/CrudTable';
import { supabase } from '../../supabaseClient';
import { useApiCache } from '../../hooks/useApiCache';
import { useDashboardData } from '../../hooks/useDashboardData';
import './AgriculturalAreas.css';

const columns = [
    { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 90, fixed: 'left', importHeader: 'อำเภอ' },
    { title: 'หมู่บ้าน', dataIndex: 'villages_count', key: 'villages_count', width: 80, align: 'right', importHeader: 'จำนวนหมู่บ้าน', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: 'ตำบล', dataIndex: 'subdistricts_count', key: 'subdistricts_count', width: 70, align: 'right', importHeader: 'จำนวนตำบล', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>ครัวเรือน<br/>เกษตรกร</div>, importHeader: 'จำนวนครัวเรือนเกษตรกร_ครัวเรือน', dataIndex: 'farmer_households', key: 'farmer_households', width: 100, align: 'right', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>พื้นที่<br/>ทั้งหมด (ไร่)</div>, importHeader: 'พื้นที่ทั้งหมด_ไร่', dataIndex: 'total_area_rai', key: 'total_area_rai', width: 100, align: 'right', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>พื้นที่ด่านพืช<br/>(ไร่)</div>, importHeader: 'พื้นที่การเกษตรด้านพืช_ไร่', dataIndex: 'agri_crop_area_rai', key: 'agri_crop_area_rai', width: 100, align: 'right', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: 'ข้าวนาปี', dataIndex: 'rice_in_season_rai', key: 'rice_in_season_rai', width: 90, align: 'right', importHeader: 'ข้าวนาปี_ไร่', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: 'ข้าวนาปรัง', dataIndex: 'rice_off_season_rai', key: 'rice_off_season_rai', width: 90, align: 'right', importHeader: 'ข้าวนาปรัง_ไร่', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: 'พืชไร่', dataIndex: 'field_crops_rai', key: 'field_crops_rai', width: 80, align: 'right', importHeader: 'พืชไร่_ไร่', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: 'พืชสวน', dataIndex: 'horticulture_rai', key: 'horticulture_rai', width: 80, align: 'right', importHeader: 'พืชสวน_ไร่', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>ไม้ผล<br/>ไม้ยืนต้น</div>, importHeader: 'ไม้ผลไม้ยืนต้น_ไร่', dataIndex: 'fruit_trees_rai', key: 'fruit_trees_rai', width: 90, align: 'right', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: 'พืชผัก', dataIndex: 'vegetables_rai', key: 'vegetables_rai', width: 80, align: 'right', importHeader: 'พืชผัก_ไร่', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>ไม้ดอก<br/>ไม้ประดับ</div>, importHeader: 'ไม้ดอกไม้ประดับ_ไร่', dataIndex: 'flowers_rai', key: 'flowers_rai', width: 90, align: 'right', render: val => val != null ? Number(val).toLocaleString() : '-' },
    { title: <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>สมุนไพร<br/>เครื่องเทศ</div>, importHeader: 'สมุนไพรเครื่องเทศ_ไร่', dataIndex: 'herbs_spices_rai', key: 'herbs_spices_rai', width: 90, align: 'right', render: val => val != null ? Number(val).toLocaleString() : '-' },
];

const formFields = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <Form.Item name="district" label="อำเภอ" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="villages_count" label="จำนวนหมู่บ้าน"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="subdistricts_count" label="จำนวนตำบล"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="farmer_households" label="จำนวนครัวเรือนเกษตรกร_ครัวเรือน"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="total_area_rai" label="พื้นที่ทั้งหมด_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="agri_crop_area_rai" label="พื้นที่การเกษตรด้านพืช_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="rice_in_season_rai" label="ข้าวนาปี_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="rice_off_season_rai" label="ข้าวนาปรัง_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="field_crops_rai" label="พืชไร่_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="horticulture_rai" label="พืชสวน_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="fruit_trees_rai" label="ไม้ผลไม้ยืนต้น_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="vegetables_rai" label="พืชผัก_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="flowers_rai" label="ไม้ดอกไม้ประดับ_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="herbs_spices_rai" label="สมุนไพรเครื่องเทศ_ไร่"><InputNumber style={{ width: '100%' }} /></Form.Item>
    </div>
);

const CROP_TYPES = [
    { key: 'rice_in_season_rai', label: 'ข้าวนาปี', color: CROP_COLORS['ข้าวนาปี'] },
    { key: 'rice_off_season_rai', label: 'ข้าวนาปรัง', color: CROP_COLORS['ข้าวนาปรัง'] },
    { key: 'field_crops_rai', label: 'พืชไร่', color: CROP_COLORS['พืชไร่'] },
    { key: 'horticulture_rai', label: 'พืชสวน', color: CROP_COLORS['พืชสวน'] },
    { key: 'fruit_trees_rai', label: 'ไม้ผลไม้ยืนต้น', color: CROP_COLORS['ไม้ผลไม้ยืนต้น'] },
    { key: 'vegetables_rai', label: 'พืชผัก', color: CROP_COLORS['พืชผัก'] },
    { key: 'flowers_rai', label: 'ไม้ดอกไม้ประดับ', color: CROP_COLORS['ไม้ดอกไม้ประดับ'] },
    { key: 'herbs_spices_rai', label: 'สมุนไพรเครื่องเทศ', color: CROP_COLORS['สมุนไพรเครื่องเทศ'] }
];

export default function AgriculturalAreas() {
    useEffect(() => {
        document.title = 'พื้นที่การเกษตรนครปฐม | ศูนย์ข้อมูลการเกษตรนครปฐม';
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', 'สรุปพื้นที่การเกษตรของจังหวัดนครปฐม แยกตามอำเภอและชนิดพืช พร้อมข้อมูลตารางค้นหาและกราฟสรุป');
    }, []);

    const [filterDistrict, setFilterDistrict] = useState(null);
    const [MapComponents, setMapComponents] = useState(null);
    const [geoJSONData, setGeoJSONData] = useState(null);

    const { districtStats = {} } = useDashboardData();

    useEffect(() => {
        // Load GeoJSON data directly
        import('../../data/nakhon_pathom_districts.json').then(module => {
            setGeoJSONData(module.default);
        });

        // Dynamic import to avoid SSR issues
        Promise.all([
            import('leaflet'),
            import('react-leaflet'),
            import('leaflet/dist/leaflet.css')
        ]).then(([L, RL]) => {
            // Fix default icon issue
            delete L.default.Icon.Default.prototype._getIconUrl;
            L.default.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });

            setMapComponents({ L: L.default, ...RL });
        });
    }, []);

    const fetchAgriAreas = async () => {
        const { data, error } = await supabase
            .from('agricultural_areas')
            .select('*')
            .neq('district', 'รวม'); // Don't chart the "Total" row if imported
        if (error) throw error;
        return data || [];
    };

    const { data: chartData = [], isLoading: chartLoading } = useApiCache(
        ['all-agricultural-areas'], 
        fetchAgriAreas, 
        { staleMinutes: 10 }
    );

    const districtOptions = useMemo(() => {
        const unique = [...new Set(chartData.map(d => d.district).filter(Boolean))].sort();
        return unique.map(d => ({ label: d, value: d }));
    }, [chartData]);

    const filteredData = useMemo(() => {
        return chartData.filter(item => {
            if (filterDistrict && item.district !== filterDistrict) return false;
            return true;
        });
    }, [chartData, filterDistrict]);

    const totals = useMemo(() => {
        let cropArea = 0;
        let households = 0;
        let villages = 0;
        let subdistricts = 0;

        filteredData.forEach(item => {
            cropArea += Number(item.agri_crop_area_rai) || 0;
            households += Number(item.farmer_households) || 0;
            villages += Number(item.villages_count) || 0;
            subdistricts += Number(item.subdistricts_count) || 0;
        });

        return { cropArea, households, villages, subdistricts };
    }, [filteredData]);

    const pieData = useMemo(() => {
        let sums = {};
        CROP_TYPES.forEach(t => sums[t.key] = 0);

        filteredData.forEach(item => {
            CROP_TYPES.forEach(t => {
                sums[t.key] += Number(item[t.key]) || 0;
            });
        });

        return CROP_TYPES.map(type => ({
            name: type.label,
            value: sums[type.key],
            color: type.color
        })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
    }, [filteredData]);


    const hasActiveFilter = !!filterDistrict;

    const tableFilterConfig = [
        { key: 'district', label: 'อำเภอ', options: districtOptions }
    ];

    const FitDistrictBounds = () => {
        const { useMap } = MapComponents;
        const map = useMap();

        useEffect(() => {
            if (!geoJSONData || !MapComponents?.L) return;
            const bounds = MapComponents.L.geoJSON(geoJSONData).getBounds();
            if (!bounds.isValid()) return;

            map.invalidateSize();
            map.fitBounds(bounds, {
                paddingTopLeft: [8, 8],
                paddingBottomRight: [8, 8],
                maxZoom: 10,
                animate: false,
            });
        }, [map]);

        return null;
    };

    // ECharts configuration options
    const pieOption = useMemo(() => {
        const data = pieData.map(item => ({
            value: item.value,
            name: item.name,
            itemStyle: { color: item.color }
        }));


        return {
            tooltip: {
                trigger: 'item',
                confine: true,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 8,
                padding: [12, 16],
                extraCssText: 'box-shadow: 0 4px 20px rgba(0,0,0,0.12); border-radius: 10px; min-width: 220px; max-height: 320px; overflow-y: auto;',
                textStyle: { color: '#0f172a', fontSize: 12, fontFamily: 'system-ui, sans-serif' },
                formatter: (params) => {
                    const cropType = CROP_TYPES.find(t => t.label === params.name);
                    const cropColor = pieData.find(d => d.name === params.name)?.color || '#16a34a';

                    const districtRows = filteredData
                        .map(d => ({
                            name: d.district || 'ไม่ระบุ',
                            val: Number(cropType ? d[cropType.key] : 0) || 0
                        }))
                        .filter(d => d.val > 0)
                        .sort((a, b) => b.val - a.val);

                    const distHtml = districtRows.map((d, i) =>
                        '<div style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding:2px 0;">' +
                        '<span style="color:' + (i === 0 ? '#14532d' : '#475569') + '; font-weight:' + (i === 0 ? '700' : '400') + '; font-size:12px;">' +
                        (i === 0 ? '🥇 ' : '· ') + 'อ.' + d.name +
                        '</span>' +
                        '<strong style="color:' + (i === 0 ? '#15803d' : '#0f172a') + '; font-size:12px;">' +
                        d.val.toLocaleString() + ' <span style="color:#94a3b8; font-weight:400; font-size:10px;">ไร่</span>' +
                        '</strong></div>'
                    ).join('');

                    const noData = districtRows.length === 0
                        ? '<div style="color:#94a3b8; font-size:12px; padding:4px 0;">ไม่พบข้อมูลอำเภอ</div>'
                        : '';

                    return '<div style="font-weight:700; font-size:13px; margin-bottom:8px; padding-bottom:6px; border-bottom:2px solid ' + cropColor + '40; color:#1e293b; display:flex; align-items:center; gap:6px;">' +
                        '<span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:' + cropColor + ';"></span>' +
                        params.name + '</div>' +
                        '<div style="font-size:11px; color:#94a3b8; margin-bottom:6px;">พื้นที่เพาะปลูกแยกตามอำเภอ</div>' +
                        distHtml + noData +
                        '<div style="margin-top:8px; padding-top:6px; border-top:1px solid #f1f5f9; display:flex; justify-content:space-between; font-weight:700; font-size:12px;">' +
                        '<span style="color:#475569;">รวมทั้งจังหวัด</span>' +
                        '<strong style="color:' + cropColor + ';">' + Number(params.value).toLocaleString() + ' ไร่ <span style="color:#94a3b8; font-weight:400;">(' + params.percent + '%)</span></strong>' +
                        '</div>';
                }

            },
            legend: {
                orient: 'horizontal',
                bottom: '0%',
                left: 'center',
                type: 'scroll',
                textStyle: { color: '#64748b', fontSize: 11 }
            },
            series: [
                {
                    name: 'สัดส่วนพื้นที่',
                    type: 'pie',
                    radius: ['40%', '58%'],
                    center: ['50%', '40%'],
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderRadius: 6,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: true,
                        position: 'outside',
                        formatter: '{b} ({d}%)',
                        fontSize: 11,
                        color: '#64748b'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: 12,
                            fontWeight: 'bold'
                        }
                    },
                    data: data
                }
            ]
        };
    }, [pieData, filteredData]);


    const renderMap = (height = '100%') => {
        if (!MapComponents || !geoJSONData) {
            return (
                <div style={{ display: 'grid', placeItems: 'center', height: height, background: '#f8fafc', color: '#64748b' }}>
                    กำลังโหลดแผนที่ขอบเขต...
                </div>
            );
        }

        return (
            <div className="agri-leaflet-map-wrapper">
                <MapComponents.MapContainer
                    center={[13.82, 100.05]}
                    zoom={10}
                    zoomSnap={0.25}
                    zoomDelta={0.5}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                >
                    <FitDistrictBounds />
                    <MapComponents.TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapComponents.GeoJSON
                        key={`${chartData.length}-${Object.keys(districtStats || {}).length}-${filterDistrict || 'all'}`}
                        data={geoJSONData}
                        style={(feature) => {
                            const distName = feature.properties?.amp_th;
                            const isSelected = distName === filterDistrict;
                            return {
                                color: isSelected ? '#ef4444' : '#3b82f6',
                                weight: isSelected ? 3 : 1.5,
                                opacity: isSelected ? 0.95 : 0.6,
                                fillColor: isSelected ? '#fca5a5' : '#93c5fd',
                                fillOpacity: isSelected ? 0.4 : 0.1,
                                dashArray: isSelected ? '' : '5, 5'
                            };
                        }}
                        onEachFeature={(feature, layer) => {
                            const distName = feature.properties?.amp_th;
                            const chartStats = chartData.find(d => d.district === distName);
                            const stats = districtStats?.[distName];
                            
                            if (distName) {
                                let tooltipHtml = '';
                                if (chartStats) {
                                    // Always build crop rows from chartStats (direct Supabase data — guaranteed accurate)
                                    const cropRows = [
                                        { icon: '🌾', label: 'ข้าวนาปี', val: chartStats.rice_in_season_rai },
                                        { icon: '🌾', label: 'ข้าวนาปรัง', val: chartStats.rice_off_season_rai },
                                        { icon: '🌽', label: 'พืชไร่', val: chartStats.field_crops_rai },
                                        { icon: '🌿', label: 'พืชสวน', val: chartStats.horticulture_rai },
                                        { icon: '🍎', label: 'ไม้ผล/ยืนต้น', val: chartStats.fruit_trees_rai },
                                        { icon: '🥬', label: 'พืชผัก', val: chartStats.vegetables_rai },
                                        { icon: '🌸', label: 'ไม้ดอก/ประดับ', val: chartStats.flowers_rai },
                                        { icon: '🌿', label: 'สมุนไพร', val: chartStats.herbs_spices_rai },
                                    ].filter(r => Number(r.val) > 0);

                                    const cropGridHtml = cropRows.map(r =>
                                        `<div class="dist-grid-item"><span>${r.icon} ${r.label}:</span> <strong>${Number(r.val).toLocaleString()}</strong></div>`
                                    ).join('');

                                    tooltipHtml = `
                                        <div class="dist-tooltip">
                                            <div class="dist-tooltip-title">🎯 อำเภอ${distName}</div>
                                            <div class="dist-tooltip-row">
                                                <span class="dist-label">🌱 พื้นที่เพาะปลูกพืช</span>
                                                <span class="dist-val highlight">${Number(chartStats.agri_crop_area_rai || 0).toLocaleString()} <small>ไร่</small></span>
                                            </div>
                                            <div class="dist-tooltip-row">
                                                <span class="dist-label">👨‍🌾 ครัวเรือนเกษตรกร</span>
                                                <span class="dist-val">${Number(chartStats.farmer_households || 0).toLocaleString()} <small>ราย</small></span>
                                            </div>
                                            ${stats ? `
                                            <div class="dist-tooltip-row">
                                                <span class="dist-label">🤝 วิสาหกิจชุมชน</span>
                                                <span class="dist-val">${(stats.ce || 0).toLocaleString()} <small>แห่ง</small></span>
                                            </div>
                                            <div class="dist-tooltip-row">
                                                <span class="dist-label">🌾 แปลงใหญ่</span>
                                                <span class="dist-val">${(stats.lp || 0).toLocaleString()} <small>แปลง</small></span>
                                            </div>
                                            ` : ''}
                                            <div class="dist-tooltip-divider">แยกตามชนิดพืช (ไร่)</div>
                                            <div class="dist-tooltip-grid">
                                                ${cropGridHtml}
                                            </div>
                                        </div>
                                    `;
                                }

                                if (tooltipHtml) {
                                    layer.bindTooltip(tooltipHtml, {
                                        sticky: true,
                                        direction: 'auto',
                                        className: 'dist-tooltip-container'
                                    });
                                }
                                
                                layer.on({
                                    mouseover: (e) => {
                                        const l = e.target;
                                        l.setStyle({ fillOpacity: 0.35, color: '#dc2626', weight: 3, dashArray: '' });
                                    },
                                    mouseout: (e) => {
                                        const l = e.target;
                                        const isSelected = distName === filterDistrict;
                                        l.setStyle({
                                            fillOpacity: isSelected ? 0.4 : 0.1,
                                            color: isSelected ? '#ef4444' : '#3b82f6',
                                            weight: isSelected ? 3 : 1.5,
                                            dashArray: isSelected ? '' : '5, 5'
                                        });
                                    },
                                    click: () => {
                                        setFilterDistrict(prev => prev === distName ? null : distName);
                                    }
                                });
                            }
                        }}
                    />
                </MapComponents.MapContainer>
            </div>
        );
    };

    return (
        <div>
            {/* Page Header */}
            <div className="agri-areas-page-header">
                <h2>
                    <PieChartOutlined style={{ color: '#16a34a' }} />
                    รายงานพื้นที่การเกษตรแยกตามชนิดพืชจังหวัดนครปฐม
                </h2>
                <p>
                    วิเคราะห์ข้อมูลพื้นที่เพาะปลูกพืชเศรษฐกิจแยกรายอำเภอและชนิดพืช (เช่น ข้าวนาปี, ข้าวนาปรัง, พืชสวน, ผัก, ไม้ดอกไม้ประดับ) พร้อมตารางสถิติและสัดส่วนพื้นที่
                </p>
            </div>


            {!chartLoading ? (
                <div className="gis-split-row">
                    {/* Left sticky map panel */}
                    <div className="gis-left-panel">
                        <Card
                            title="🗺️ ระบบภูมิสารสนเทศ (GIS) แหล่งพื้นที่เพาะปลูกนครปฐม"
                            size="small"
                            bordered={false}
                            className="agri-map-card"
                            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                            bodyStyle={{ flex: 1, padding: 12 }}
                        >
                            {renderMap('100%')}
                        </Card>
                    </div>

                    {/* Right scrollable data panel */}
                    <div className="gis-right-scroll-panel">
                        {/* KPI Cards — now lives above chart panel */}
                        {!chartLoading && (
                            <div className="agri-kpi-grid agri-kpi-grid--compact">
                                <div className="agri-kpi-card green-theme">
                                    <div className="kpi-icon-wrapper">🌱</div>
                                    <div className="kpi-content">
                                        <span className="kpi-label">พื้นที่เพาะปลูกพืช{hasActiveFilter ? ` (อ.${filterDistrict})` : 'รวม'}</span>
                                        <span className="kpi-value">{totals.cropArea.toLocaleString()}<small>ไร่</small></span>
                                    </div>
                                </div>
                                <div className="agri-kpi-card lime-theme">
                                    <div className="kpi-icon-wrapper">👨‍🌾</div>
                                    <div className="kpi-content">
                                        <span className="kpi-label">ครัวเรือนเกษตรกร</span>
                                        <span className="kpi-value">{totals.households.toLocaleString()}<small>ครัวเรือน</small></span>
                                    </div>
                                </div>
                                <div className="agri-kpi-card blue-theme">
                                    <div className="kpi-icon-wrapper">🏡</div>
                                    <div className="kpi-content">
                                        <span className="kpi-label">จำนวนหมู่บ้าน</span>
                                        <span className="kpi-value">{totals.villages.toLocaleString()}<small>หมู่บ้าน</small></span>
                                    </div>
                                </div>
                                <div className="agri-kpi-card purple-theme">
                                    <div className="kpi-icon-wrapper">🗺️</div>
                                    <div className="kpi-content">
                                        <span className="kpi-label">จำนวนตำบล</span>
                                        <span className="kpi-value">{totals.subdistricts.toLocaleString()}<small>ตำบล</small></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 13, color: '#656d76', fontWeight: 500 }}>เลือกอำเภอ:</span>
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
                                <Tag color="green" style={{ margin: 0 }}>
                                    {hasActiveFilter ? `อ.${filterDistrict}` : 'รวมจังหวัด'}
                                </Tag>
                            </div>
                        </div>

                        {/* Charts */}
                        <Card title={`📊 สัดส่วนพื้นที่เพาะปลูกพืช (อ.${filterDistrict || 'รวมทั้งหมด'})`} size="small" bordered={false} className="chart-card-premium">
                            <div style={{ height: 320 }}>
                                {pieData.length > 0 ? (
                                    <EChart option={pieOption} style={{ height: 320 }} />
                                ) : (
                                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#656d76' }}>ไม่พบข้อมูล</div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            ) : (
                <div style={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, marginBottom: 24 }}>
                    <Spin tip="กำลังโหลดข้อมูลแดชบอร์ด..." />
                </div>
            )}

            <CrudTable 
                tableName="agricultural_areas" 
                title="รายการพื้นที่การเกษตร" 
                columns={columns} 
                formFields={formFields} 
                searchField="district" 
                searchFields={['district']} 
                filterConfig={tableFilterConfig}
            />
        </div>
    );
}
