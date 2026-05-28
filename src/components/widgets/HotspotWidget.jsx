import { useState, useEffect, useMemo } from 'react';
import { FireOutlined } from '@ant-design/icons';
import { useApiCache } from '../../hooks/useApiCache';
import { supabase } from '../../supabaseClient';
import { downloadCsv, objectsToCsv, rowsToCsv } from '../../utils/csv';
import './HotspotWidget.css';

const ENDPOINT_MAP = { 1: '1day', 3: '3days', 7: '7days', 30: '30days' };

async function fetchHotspotData(dayRange) {
    if (dayRange === 60) {
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const dateStr = sixtyDaysAgo.toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('fire_hotspots')
            .select('*')
            .gte('acq_date', dateStr);

        if (error) throw error;

        return (data || []).map(row => ({
            geometry: { coordinates: [row.longitude, row.latitude] },
            properties: {
                ...row,
                ap_tn: row.district,
                tb_tn: row.subdistrict,
                lu_name: row.land_use,
                brightness: parseFloat(row.bright_ti4 || row.bright_ti5 || 0),
            }
        }));
    }

    const endpoint = ENDPOINT_MAP[dayRange] || '7days';
    const url = `/api/gistda/api/2.0/resources/features/viirs/${endpoint}?limit=1000&offset=0&ct_tn=${encodeURIComponent('ราชอาณาจักรไทย')}&pv_idn=73`;
    const res = await fetch(url, { headers: { 'accept': 'application/json' } });
    if (!res.ok) throw new Error(`Hotspot API: ${res.status}`);
    const json = await res.json();
    const items = json.features || json.data || (Array.isArray(json) ? json : []);
    if (!items.length) return [];
    return items.map(item => {
        const props = item.properties || item;
        return {
            geometry: { coordinates: [item.geometry?.coordinates?.[0] || props.longitude, item.geometry?.coordinates?.[1] || props.latitude] },
            properties: { ...props, brightness: parseFloat(props.bright_ti4 || props.bright_ti5 || props.brightness || 0) }
        };
    }).filter(f => f.geometry.coordinates[0] && f.geometry.coordinates[1]);
}

function getMockHotspots(dayRange) {
    const districts = ['เมืองนครปฐม', 'กำแพงแสน', 'บางเลน', 'ดอนตูม', 'นครชัยศรี', 'สามพราน', 'พุทธมณฑล'];
    const landuses = ['พื้นที่เกษตร', 'ชุมชนและอื่น ๆ', 'พื้นที่ริมทางหลวง', 'เขต สปก.'];
    const satellites = ['Suomi NPP', 'NOAA-20', 'NOAA-21'];
    const n = dayRange === 1 ? 3 : dayRange === 3 ? 8 : dayRange === 7 ? 15 : dayRange === 30 ? 40 : dayRange === 60 ? 75 : 40;
    return Array.from({ length: n }, (_, i) => ({
        geometry: { coordinates: [100.06 + (Math.random() - 0.5) * 0.3, 13.82 + (Math.random() - 0.5) * 0.3] },
        properties: {
            brightness: 310 + Math.random() * 20, confidence: ['high', 'nominal', 'low'][i % 3],
            acq_date: new Date().toISOString().split('T')[0] + 'T00:00:00',
            acq_time: `${String(10 + Math.floor(Math.random() * 12)).padStart(2, '0')}${String(Math.floor(Math.random() * 59)).padStart(2, '0')}`,
            ap_tn: districts[i % districts.length], tb_tn: 'ตำบลตัวอย่าง',
            satellite: satellites[i % satellites.length],
            lu_name: landuses[i % landuses.length], th_date: new Date().toISOString(), th_time: '0240', village: 'บ้านตัวอย่าง',
        }
    }));
}

function toThaiTime(thDate, thTime, acqDate, acqTime) {
    try {
        if (thDate) {
            const d = new Date(thDate);
            const t = thTime ? `${String(thTime).padStart(4, '0').slice(0, 2)}:${String(thTime).padStart(4, '0').slice(2)}` : '';
            const ds = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
            return t ? `${ds} ${t}` : ds;
        }
        if (acqDate) {
            const hhmm = String(acqTime || '0000').padStart(4, '0');
            const dateOnly = acqDate.includes('T') ? acqDate.split('T')[0] : acqDate;
            const d = new Date(`${dateOnly}T${hhmm.slice(0, 2)}:${hhmm.slice(2)}:00Z`);
            return d.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
        return '';
    } catch { return ''; }
}

function toDateOnly(thDate, acqDate) {
    try {
        if (thDate) {
            const d = new Date(thDate);
            return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        if (acqDate) {
            const dateOnly = acqDate.includes('T') ? acqDate.split('T')[0] : acqDate;
            const d = new Date(`${dateOnly}T00:00:00Z`);
            return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        return '';
    } catch { return ''; }
}

function getIsoDate(properties = {}) {
    const raw = properties.th_date || properties.acq_date || '';
    if (!raw) return '';
    try {
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return '';
        return d.toISOString().slice(0, 10);
    } catch {
        return '';
    }
}

function getDateSpanDays(start, end) {
    if (!start || !end) return 0;
    const startMs = new Date(`${start}T00:00:00`).getTime();
    const endMs = new Date(`${end}T00:00:00`).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return 0;
    return Math.floor((endMs - startMs) / 86400000) + 1;
}

function isInIsoDateRange(date, start, end) {
    if (!start || !end || !date) return true;
    return date >= start && date <= end;
}

const LANDUSE_COLORS = {
    'พื้นที่เกษตร': '#dc2626', 'ชุมชนและอื่น ๆ': '#f59e0b', 'พื้นที่ริมทางหลวง': '#6366f1',
    'เขต สปก.': '#10b981', 'ป่าสงวน': '#059669',
};
const DAY_OPTIONS = [
    { value: 1, label: '1 วัน' }, { value: 3, label: '3 วัน' },
    { value: 7, label: '7 วัน' }, { value: 30, label: '30 วัน' },
    { value: 60, label: '60 วัน' },
];
const SATELLITE_OPTIONS = [
    { value: 'all', label: 'ทุกดาวเทียม' },
    { value: 'Suomi NPP', label: 'Suomi NPP' },
    { value: 'NOAA-20', label: 'NOAA-20' },
    { value: 'NOAA-21', label: 'NOAA-21' },
];

function normalizeSatelliteName(value) {
    const raw = String(value || '').trim();
    const compact = raw.toLowerCase().replace(/[\s_-]+/g, '');
    if (!compact) return '';
    if (compact === 'n' || compact === 'npp' || compact === 'snpp' || compact.includes('suomi')) return 'Suomi NPP';
    if (compact === 'n20' || compact.includes('noaa20') || compact.includes('jpss1')) return 'NOAA-20';
    if (compact === 'n21' || compact.includes('noaa21') || compact.includes('jpss2')) return 'NOAA-21';
    return raw;
}

function getSatelliteName(properties = {}) {
    return normalizeSatelliteName(
        properties.satellite ||
        properties.sat_name ||
        properties.satname ||
        properties.sat ||
        properties.platform ||
        properties.source ||
        properties.instrument
    );
}

function getHotspotExcelRow(feature, index) {
    const p = feature.properties || {};
    const [lon, lat] = feature.geometry?.coordinates || [];
    return {
        'ลำดับ': index + 1,
        'วันที่-เวลา (ไทย)': toThaiTime(p.th_date, p.th_time, p.acq_date, p.acq_time),
        'วันที่': toDateOnly(p.th_date, p.acq_date),
        'อำเภอ': p.ap_tn || '-',
        'ตำบล': p.tb_tn || '-',
        'หมู่บ้าน': p.village || '-',
        'ดาวเทียม': getSatelliteName(p) || '-',
        'เครื่องมือ': p.instrument || 'VIIRS',
        'ประเภทพื้นที่': p.lu_name || '-',
        'ประเภทย่อย': p.lu_hp_name || '-',
        'ความเชื่อมั่น': p.confidence || '-',
        'Brightness (K)': p.brightness ? Number(p.brightness).toFixed(1) : '-',
        'FRP': p.frp || '-',
        'กลางวัน/กลางคืน': p.daynight || '-',
        'Latitude': lat || '',
        'Longitude': lon || '',
        'Google Map': p.linkgmap || (lat && lon ? `https://maps.google.com/maps?q=${lat},${lon}` : ''),
        'แหล่งข้อมูล': 'GISTDA VIIRS (ยังไม่ได้รับการยืนยันในพื้นที่)',
    };
}

function countBy(features, getter) {
    const counts = {};
    features.forEach((feature) => {
        const key = getter(feature) || 'ไม่ระบุ';
        counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count], index) => ({ 'ลำดับ': index + 1, 'รายการ': name, 'จำนวนจุด': count }));
}

function applySheetLayout(sheet, widths) {
    sheet['!cols'] = widths.map(wch => ({ wch }));
    const range = sheet['!ref'];
    if (range) {
        const end = range.split(':')[1];
        sheet['!autofilter'] = { ref: range };
        sheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
        if (end) sheet['!ref'] = range;
    }
}

export default function HotspotWidget() {
    const [dayRange, setDayRange] = useState(7);
    const [selectedSatellite, setSelectedSatellite] = useState('Suomi NPP');
    const [selectedAmphoe, setSelectedAmphoe] = useState(null);
    const [selectedTambon, setSelectedTambon] = useState(null);
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    const [dateRangeError, setDateRangeError] = useState('');
    const [selectedDateFilter, setSelectedDateFilter] = useState(null);
    const [displayLimit, setDisplayLimit] = useState(20);
    const [MapComponents, setMapComponents] = useState(null);
    const [geoJSONData, setGeoJSONData] = useState(null);

    useEffect(() => {
        setDisplayLimit(20);
        setSelectedDateFilter(null);
    }, [dayRange, selectedSatellite, selectedAmphoe, selectedTambon, customDateRange.start, customDateRange.end]);

    useEffect(() => {
        setSelectedTambon(null);
    }, [selectedAmphoe]);

    useEffect(() => {
        import('../../data/nakhon_pathom_districts.json').then(m => setGeoJSONData(m.default));
        Promise.all([import('leaflet'), import('react-leaflet')]).then(([L, RL]) => {
            delete L.default.Icon.Default.prototype._getIconUrl;
            L.default.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });
            setMapComponents({ L: L.default, ...RL });
        });
    }, []);

    const hasCustomDateRange = Boolean(customDateRange.start && customDateRange.end && !dateRangeError);
    const fetchDayRange = hasCustomDateRange ? 30 : dayRange;

    const { data: rawFeatures, isLoading } = useApiCache(
        ['hotspot_gistda_v3', fetchDayRange],
        () => fetchHotspotData(fetchDayRange),
        { staleMinutes: 10, cacheMinutes: 60 }
    );

    const useMock = !rawFeatures && !isLoading;
    const mockFeatures = useMemo(() => useMock ? getMockHotspots(fetchDayRange) : [], [useMock, fetchDayRange]);
    const localHotspots = useMemo(() => {
        const raw = rawFeatures || mockFeatures || [];
        // เรียงลำดับจากใหม่สุดไปเก่าสุด
        return [...raw].sort((a, b) => {
            const dateA = a.properties?.acq_date || a.properties?.th_date || '';
            const dateB = b.properties?.acq_date || b.properties?.th_date || '';
            const timeA = a.properties?.acq_time || a.properties?.th_time || '';
            const timeB = b.properties?.acq_time || b.properties?.th_time || '';
            return `${dateB}T${String(timeB).padStart(4, '0')}`.localeCompare(`${dateA}T${String(timeA).padStart(4, '0')}`);
        });
    }, [rawFeatures, mockFeatures]);

    const rangedHotspots = useMemo(() => {
        if (!hasCustomDateRange) return localHotspots;
        return localHotspots.filter(f => isInIsoDateRange(getIsoDate(f.properties), customDateRange.start, customDateRange.end));
    }, [customDateRange.end, customDateRange.start, hasCustomDateRange, localHotspots]);

    const satelliteHotspots = useMemo(() => {
        if (selectedSatellite === 'all') return rangedHotspots;
        return rangedHotspots.filter(f => getSatelliteName(f.properties) === selectedSatellite);
    }, [rangedHotspots, selectedSatellite]);

    const amphoeStats = useMemo(() => {
        const m = {};
        satelliteHotspots.forEach(f => { const n = f.properties?.ap_tn || 'ไม่ทราบ'; m[n] = (m[n] || 0) + 1; });
        return Object.entries(m).sort((a, b) => b[1] - a[1]);
    }, [satelliteHotspots]);

    const landuseStats = useMemo(() => {
        const m = {};
        satelliteHotspots.forEach(f => { const n = f.properties?.lu_name || 'อื่น ๆ'; m[n] = (m[n] || 0) + 1; });
        return Object.entries(m).sort((a, b) => b[1] - a[1]);
    }, [satelliteHotspots]);

    const tambonStats = useMemo(() => {
        if (!selectedAmphoe) return [];
        const m = {};
        satelliteHotspots
            .filter(f => (f.properties?.ap_tn || 'ไม่ทราบ') === selectedAmphoe)
            .forEach(f => { const n = f.properties?.tb_tn || 'ไม่ทราบตำบล'; m[n] = (m[n] || 0) + 1; });
        return Object.entries(m).sort((a, b) => b[1] - a[1]);
    }, [satelliteHotspots, selectedAmphoe]);

    const filteredHotspots = useMemo(() => {
        return satelliteHotspots.filter(f => {
            const p = f.properties || {};
            if (selectedAmphoe && (p.ap_tn || 'ไม่ทราบ') !== selectedAmphoe) return false;
            if (selectedTambon && (p.tb_tn || 'ไม่ทราบตำบล') !== selectedTambon) return false;
            return true;
        });
    }, [satelliteHotspots, selectedAmphoe, selectedTambon]);

    const uniqueDates = useMemo(() => {
        const dates = new Set();
        filteredHotspots.forEach(f => {
            const p = f.properties || {};
            const d = toDateOnly(p.th_date, p.acq_date);
            if (d) dates.add(d);
        });
        return Array.from(dates);
    }, [filteredHotspots]);

    const hotspotsForList = useMemo(() => {
        if (!selectedDateFilter) return filteredHotspots;
        return filteredHotspots.filter(f => {
            const p = f.properties || {};
            return toDateOnly(p.th_date, p.acq_date) === selectedDateFilter;
        });
    }, [filteredHotspots, selectedDateFilter]);

    const { MapContainer, TileLayer, CircleMarker, Tooltip, GeoJSON } = MapComponents || {};
    const hasHotspots = satelliteHotspots.length > 0;
    const activePeriodLabel = hasCustomDateRange
        ? `${customDateRange.start} ถึง ${customDateRange.end}`
        : `ย้อนหลัง ${dayRange} วัน`;

    const handleDateRangeChange = (field, value) => {
        const next = { ...customDateRange, [field]: value };
        let error = '';
        if (next.start && next.end) {
            const spanDays = getDateSpanDays(next.start, next.end);
            if (spanDays <= 0) error = 'วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด';
            if (spanDays > 30) error = 'เลือกช่วงได้สูงสุด 30 วัน';
        }
        setCustomDateRange(next);
        setDateRangeError(error);
        if (!error && next.start && next.end) {
            setDayRange(30);
            setSelectedAmphoe(null);
            setSelectedTambon(null);
        }
    };

    const clearDateRange = () => {
        setCustomDateRange({ start: '', end: '' });
        setDateRangeError('');
    };

    const handleExportCsv = async () => {
        const exportedAt = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
        const filterLabel = [
            `รอบข้อมูล: ${activePeriodLabel}`,
            `ดาวเทียม: ${selectedSatellite === 'all' ? 'ทุกดาวเทียม' : selectedSatellite}`,
            selectedAmphoe ? `อำเภอ: ${selectedAmphoe}` : 'อำเภอ: ทั้งหมด',
            selectedTambon ? `ตำบล: ${selectedTambon}` : 'ตำบล: ทั้งหมด',
            selectedDateFilter ? `วันที่: ${selectedDateFilter}` : 'วันที่: ทุกวัน',
        ];
        const detailRows = hotspotsForList.map(getHotspotExcelRow);
        const csv = rowsToCsv([
            ['รายงานจุดความร้อน จังหวัดนครปฐม'],
            ['ข้อมูลจาก GISTDA VIIRS ยังไม่ได้รับการยืนยันในพื้นที่'],
            [`ส่งออกเมื่อ ${exportedAt}`],
            [filterLabel.join(' | ')],
            [],
        ]) + '\r\n' + objectsToCsv(detailRows);
        const dateStamp = new Date().toISOString().slice(0, 10);
        const satellitePart = selectedSatellite === 'all' ? 'all-satellite' : selectedSatellite.replace(/\s+/g, '-').toLowerCase();
        const placePart = [selectedAmphoe, selectedTambon].filter(Boolean).join('-') || 'all-area';
        downloadCsv(`hotspots-npt-${dayRange}days-${satellitePart}-${placePart}-${dateStamp}.csv`, csv);
    };

    return (
        <div className="widget-box hotspot-widget-card slide-up-anim" style={{ animationDelay: '0.25s', padding: 0, overflow: 'hidden' }}>

            {/* ═══════ TOP SECTION — full width ═══════ */}

            {/* Header */}
            <div className="hotspot-widget-head" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
                padding: '14px 18px', borderBottom: '1px solid #f1f5f9',
                background: 'linear-gradient(135deg, #fef2f2 0%, #fff 100%)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="widget-icon" style={{ background: '#fee2e2', color: '#dc2626', width: 34, height: 34, fontSize: 15 }}><FireOutlined /></div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1e293b' }}>จุดความร้อน จ.นครปฐม (ข้อมูลจาก GISTDA ยังไม่ได้รับการยืนยันในพื้นที่)</h4>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>VIIRS / GISTDA Satellite</div>
                    </div>
                </div>
                <div className="hotspot-widget-controls" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <select
                        value={selectedSatellite}
                        onChange={(e) => {
                            setSelectedSatellite(e.target.value);
                            setSelectedAmphoe(null);
                        }}
                        style={{
                            height: 28, padding: '3px 8px', borderRadius: 8, cursor: 'pointer',
                            border: '1px solid #e2e8f0', background: '#fff', color: '#475569',
                            fontFamily: 'inherit', fontSize: 11, fontWeight: 500, outline: 'none',
                        }}
                        title="กรองตามดาวเทียม"
                    >
                        {SATELLITE_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    {DAY_OPTIONS.map(o => (
                        <button key={o.value}
                            className="hotspot-hover-float"
                            onClick={() => { setDayRange(o.value); setSelectedAmphoe(null); clearDateRange(); }}
                            style={{
                                padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                                border: !hasCustomDateRange && dayRange === o.value ? 'none' : '1px solid #e2e8f0',
                                background: !hasCustomDateRange && dayRange === o.value ? 'linear-gradient(135deg,#dc2626,#f97316)' : '#fff',
                                color: !hasCustomDateRange && dayRange === o.value ? '#fff' : '#64748b',
                                fontWeight: 500, fontSize: 11, transition: 'all 0.2s',
                                boxShadow: !hasCustomDateRange && dayRange === o.value ? '0 2px 8px rgba(220,38,38,0.25)' : 'none',
                            }}
                        >{o.label}</button>
                    ))}
                    <div className="hotspot-date-range" style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }}>
                        <input
                            type="date"
                            value={customDateRange.start}
                            onChange={(e) => handleDateRangeChange('start', e.target.value)}
                            style={{
                                height: 28, width: 118, padding: '2px 6px', borderRadius: 8,
                                border: dateRangeError ? '1px solid #ef4444' : hasCustomDateRange ? '1px solid #dc2626' : '1px solid #e2e8f0',
                                fontFamily: 'inherit', fontSize: 10, fontWeight: 500, color: '#475569',
                            }}
                            title="วันที่เริ่มต้น (เลือกได้สูงสุดช่วงละ 30 วัน)"
                        />
                        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>-</span>
                        <input
                            type="date"
                            value={customDateRange.end}
                            onChange={(e) => handleDateRangeChange('end', e.target.value)}
                            style={{
                                height: 28, width: 118, padding: '2px 6px', borderRadius: 8,
                                border: dateRangeError ? '1px solid #ef4444' : hasCustomDateRange ? '1px solid #dc2626' : '1px solid #e2e8f0',
                                fontFamily: 'inherit', fontSize: 10, fontWeight: 500, color: '#475569',
                            }}
                            title="วันที่สิ้นสุด (เลือกได้สูงสุดช่วงละ 30 วัน)"
                        />
                        {(customDateRange.start || customDateRange.end) && (
                            <button
                                type="button"
                                onClick={clearDateRange}
                                style={{
                                    height: 28, width: 28, borderRadius: 8, border: '1px solid #e2e8f0',
                                    background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: 800,
                                }}
                                title="ล้างช่วงวันที่"
                            >
                                ×
                            </button>
                        )}
                        {dateRangeError && (
                            <span style={{
                                position: 'absolute', top: 31, left: 0, whiteSpace: 'nowrap',
                                fontSize: 10, color: '#dc2626', fontWeight: 700, background: '#fff',
                                border: '1px solid #fecaca', borderRadius: 6, padding: '2px 6px', zIndex: 20,
                            }}>
                                {dateRangeError}
                            </span>
                        )}
                    </div>
                    <button
                        className="hotspot-hover-float"
                        onClick={handleExportCsv}
                        disabled={hotspotsForList.length === 0}
                        style={{
                            padding: '4px 10px', borderRadius: 8, cursor: hotspotsForList.length ? 'pointer' : 'not-allowed',
                            fontFamily: 'inherit', border: '1px solid #bbf7d0',
                            background: hotspotsForList.length ? '#ecfdf5' : '#f8fafc',
                            color: hotspotsForList.length ? '#047857' : '#94a3b8',
                            fontWeight: 600, fontSize: 11, transition: 'all 0.2s',
                        }}
                        title="ดาวน์โหลด Excel ตามตัวกรองปัจจุบัน"
                    >
                        📥 Excel
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="skeleton-pulse" style={{ height: 450, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="w-loader">กำลังตรวจสอบจุดความร้อน...</div>
                </div>
            ) : (
                <>
                    {!rawFeatures && (
                        <div style={{ fontSize: 11, color: '#f97316', background: '#fffbeb', padding: '5px 12px', fontWeight: 500, textAlign: 'center', borderBottom: '1px solid #fde68a' }}>
                            ⚠️ ไม่สามารถเชื่อมต่อ GISTDA API — แสดงข้อมูลจำลอง
                        </div>
                    )}

                    {/* Summary bar: count + amphoe + landuse */}
                    <div className="hotspot-summary-panel" style={{
                        padding: '12px 18px', borderBottom: '1px solid #f1f5f9',
                        background: hasHotspots ? 'linear-gradient(135deg,#fef2f2,#fff1f2)' : 'linear-gradient(135deg,#ecfdf5,#f0fdf4)',
                    }}>
                        {/* Row 1: Big number + amphoe cards */}
                        <div className="hotspot-summary-row" style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: landuseStats.length > 0 ? 10 : 0 }}>
                            {/* Count */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                <span style={{ fontSize: 32 }}>{hasHotspots ? '🔥' : '🌲'}</span>
                                <div>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: hasHotspots ? '#dc2626' : '#059669', lineHeight: 1 }}>
                                        {satelliteHotspots.length} <span style={{ fontSize: 13, fontWeight: 600 }}>จุด</span>
                                    </div>
                                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500, marginTop: 2 }}>
                                        {hasHotspots ? activePeriodLabel : 'ปลอดภัย 🌲'}
                                    </div>
                                </div>
                            </div>

                            {/* Amphoe grid — compact inline */}
                            {amphoeStats.length > 0 && (
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8', marginBottom: 4, letterSpacing: '0.3px' }}>กดที่อำเภอ เพื่อกลั่นกรองตำบล</div>
                                    <div className="hotspot-amphoe-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 3 }}>
                                        {amphoeStats.map(([name, count]) => {
                                            const sel = selectedAmphoe === name;
                                            return (
                                                <button key={name}
                                                    className="hotspot-hover-float"
                                                    onClick={() => setSelectedAmphoe(sel ? null : name)}
                                                    style={{
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
                                                        border: sel ? '2px solid #dc2626' : '1px solid #fecdd340',
                                                        background: sel ? '#fff' : 'rgba(255,255,255,0.6)',
                                                        fontFamily: 'inherit', fontSize: 11, transition: 'all 0.15s',
                                                    }}
                                                >
                                                    <span style={{ color: sel ? '#b91c1c' : '#334155', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>อ.{name}</span>
                                                    <span style={{
                                                        background: sel ? '#dc2626' : '#e11d48', color: '#fff',
                                                        padding: '1px 6px', borderRadius: 8, fontWeight: 700, fontSize: 10,
                                                        minWidth: 20, textAlign: 'center', flexShrink: 0, marginLeft: 4,
                                                    }}>{count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {selectedAmphoe && tambonStats.length > 0 && (
                                        <div className="hotspot-tambon-row" style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                                            <span style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8', marginRight: 2 }}>ตำบล:</span>
                                            <button
                                                className="hotspot-hover-float"
                                                onClick={() => setSelectedTambon(null)}
                                                style={{
                                                    padding: '3px 8px', borderRadius: 12, cursor: 'pointer',
                                                    border: !selectedTambon ? '1px solid #dc2626' : '1px solid #fecdd3',
                                                    background: !selectedTambon ? '#dc2626' : '#fff',
                                                    color: !selectedTambon ? '#fff' : '#dc2626',
                                                    fontFamily: 'inherit', fontSize: 10, fontWeight: 600,
                                                }}
                                            >
                                                ทั้งหมด {tambonStats.reduce((sum, [, count]) => sum + count, 0)}
                                            </button>
                                            {tambonStats.map(([name, count]) => {
                                                const sel = selectedTambon === name;
                                                return (
                                                    <button
                                                        key={name}
                                                        className="hotspot-hover-float"
                                                        onClick={() => setSelectedTambon(sel ? null : name)}
                                                        style={{
                                                            padding: '3px 8px', borderRadius: 12, cursor: 'pointer',
                                                            border: sel ? '1px solid #dc2626' : '1px solid #fecdd3',
                                                            background: sel ? '#dc2626' : '#fff',
                                                            color: sel ? '#fff' : '#dc2626',
                                                            fontFamily: 'inherit', fontSize: 10, fontWeight: 600,
                                                        }}
                                                    >
                                                        {name} {count}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Row 2: Landuse badges */}
                        {landuseStats.length > 0 && (
                            <div className="hotspot-landuse-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                                <span style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8', marginRight: 4 }}>Landuse:</span>
                                {landuseStats.map(([name, count]) => {
                                    const c = LANDUSE_COLORS[name] || '#64748b';
                                    return (
                                        <span key={name} style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500,
                                            background: `${c}12`, color: '#334155', border: `1px solid ${c}33`,
                                        }}>
                                            {name}
                                            <span style={{
                                                background: c, color: '#fff', borderRadius: '50%', width: 18, height: 18,
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 9, fontWeight: 600,
                                            }}>{count}</span>
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>


                    {/* ═══════ BOTTOM SECTION — two columns ═══════ */}
                    <div className="hotspot-mobile-layout" style={{ display: 'flex', minHeight: 450 }}>

                        {/* BOTTOM LEFT — Map */}
                        <div className="hotspot-map-panel" style={{ flex: '1 1 55%', minWidth: 0, position: 'relative', borderRight: '1px solid #f1f5f9' }}>
                            {MapComponents ? (
                                <MapContainer center={[13.85, 100.04]} zoom={10} zoomSnap={0.25}
                                    style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    {geoJSONData && (
                                        <GeoJSON key={`geo-${selectedSatellite}-${selectedAmphoe || 'all'}-${selectedTambon || 'all'}-${customDateRange.start || 'all'}-${customDateRange.end || dayRange}`} data={geoJSONData}
                                            style={(feature) => {
                                                const hl = selectedAmphoe && feature.properties?.amp_th === selectedAmphoe;
                                                return {
                                                    color: hl ? '#dc2626' : '#6366f1', weight: hl ? 3 : 1.5,
                                                    opacity: hl ? 1 : 0.5, fillColor: hl ? '#fecdd3' : '#a5b4fc',
                                                    fillOpacity: hl ? 0.3 : 0.06, dashArray: hl ? '' : '4,4',
                                                };
                                            }}
                                            onEachFeature={(feature, layer) => {
                                                const name = feature.properties?.amp_th;
                                                if (!name) return;
                                                const cnt = amphoeStats.find(([n]) => n === name)?.[1] || 0;
                                                layer.bindTooltip(`<b>อ.${name}</b>${cnt > 0 ? `<br/>🔥 ${cnt} จุด` : '<br/>✅ ปลอดภัย'}`, { sticky: true, direction: 'auto' });
                                                layer.on({
                                                    click: () => setSelectedAmphoe(p => p === name ? null : name),
                                                    mouseover: e => e.target.setStyle({ fillOpacity: 0.25, weight: 3 }),
                                                    mouseout: e => {
                                                        const hl = selectedAmphoe === name;
                                                        e.target.setStyle({ fillOpacity: hl ? 0.3 : 0.06, weight: hl ? 3 : 1.5 });
                                                    },
                                                });
                                            }}
                                        />
                                    )}
                                    {filteredHotspots.map((f, i) => {
                                        const [lon, lat] = f.geometry.coordinates;
                                        if (!lat || !lon) return null;
                                        const p = f.properties || {};
                                        const thaiTime = toThaiTime(p.th_date, p.th_time, p.acq_date, p.acq_time);
                                        return (
                                            <CircleMarker key={`h-${i}`} center={[lat, lon]}
                                                radius={6} fillColor="#dc2626" fillOpacity={0.9} color="#fff" weight={2}>
                                                <Tooltip sticky direction="top">
                                                    <div style={{ fontSize: 11, lineHeight: 1.6, fontFamily: 'inherit' }}>
                                                        {p.ap_tn && <div><b>อำเภอ:</b> {p.ap_tn}</div>}
                                                        {p.tb_tn && <div><b>ตำบล:</b> {p.tb_tn}</div>}
                                                        {p.village && <div><b>หมู่บ้าน:</b> {p.village}</div>}
                                                        <div><b>ประเภท:</b> {p.lu_name || '-'}{p.lu_hp_name ? ` (${p.lu_hp_name})` : ''}</div>
                                                        {thaiTime && <div><b>เวลา:</b> {thaiTime} น.</div>}
                                                        <div><b>ความร้อน:</b> {p.brightness ? `${Number(p.brightness).toFixed(1)} K` : '-'}</div>
                                                    </div>
                                                </Tooltip>
                                            </CircleMarker>
                                        );
                                    })}
                                </MapContainer>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
                                    กำลังโหลดแผนที่...
                                </div>
                            )}
                        </div>

                        {/* BOTTOM RIGHT — Detail list */}
                        <div className="hotspot-detail-panel" style={{ flex: '1 1 45%', minWidth: 0, overflowY: 'auto', maxHeight: 450 }}>
                            {filteredHotspots.length > 0 ? (
                                <div style={{ padding: '10px 14px' }}>
                                    <div className="hotspot-detail-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', letterSpacing: '0.3px' }}>
                                            🔥 รายละเอียด {selectedAmphoe ? `อ.${selectedAmphoe}` : ''}{selectedTambon ? ` ต.${selectedTambon}` : ''} ({hotspotsForList.length} จุด)
                                        </div>
                                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>
                                            <span style={{ cursor: 'pointer' }}>👆 คลิกเพื่อเปิดดู Google Map</span>
                                        </div>
                                    </div>

                                    {uniqueDates.length > 1 && (
                                        <div style={{ marginBottom: 12 }}>
                                            <select
                                                value={selectedDateFilter || ''}
                                                onChange={(e) => setSelectedDateFilter(e.target.value || null)}
                                                style={{
                                                    width: '100%', padding: '6px 10px', fontSize: 11, fontWeight: 700,
                                                    borderRadius: 8, cursor: 'pointer', border: '1px solid #cbd5e1',
                                                    background: '#f8fafc', color: '#1e293b', outline: 'none'
                                                }}
                                            >
                                                <option value="">🗓️ ทั้งหมด (ทุกวัน)</option>
                                                {uniqueDates.map(d => (
                                                    <option key={d} value={d}>📅 {d}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {hotspotsForList.length > 0 ? (
                                        <>
                                            {hotspotsForList.slice(0, displayLimit).map((f, i) => {
                                                const p = f.properties || {};
                                                const thaiTime = toThaiTime(p.th_date, p.th_time, p.acq_date, p.acq_time);
                                                return (
                                                    <a key={i} className="hotspot-list-item" href={p.linkgmap || `https://maps.google.com/maps?q=${f.geometry.coordinates[1]},${f.geometry.coordinates[0]}`} target="_blank" rel="noopener noreferrer" style={{
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        padding: '6px 8px', background: i % 2 === 0 ? '#fef2f2' : '#fff',
                                                        borderRadius: 6, marginBottom: 2, fontSize: 11,
                                                        textDecoration: 'none', color: 'inherit', border: '1px solid transparent', // for hover effect compatibility
                                                    }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ color: '#334155', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                📍 {p.ap_tn || `${f.geometry.coordinates[1].toFixed(3)},${f.geometry.coordinates[0].toFixed(3)}`}
                                                            </div>
                                                            <div style={{ fontSize: 9, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {p.tb_tn || ''}{p.village ? ` • ${p.village}` : ''}{p.lu_name ? ` • ${p.lu_name}` : ''}{p.lu_hp_name ? ` (${p.lu_hp_name})` : ''}
                                                            </div>
                                                        </div>
                                                        {thaiTime && <span style={{ fontWeight: 700, color: '#475569', whiteSpace: 'nowrap', marginLeft: 6, fontSize: 10, background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>🕒 {thaiTime}</span>}
                                                    </a>
                                                );
                                            })}

                                            {hotspotsForList.length > displayLimit && (
                                                <button
                                                    onClick={() => setDisplayLimit(prev => prev + 20)}
                                                    style={{
                                                        width: '100%', padding: '8px', marginTop: '8px',
                                                        background: '#f1f5f9', color: '#475569',
                                                        border: '1px dashed #cbd5e1', borderRadius: '8px',
                                                        fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#334155'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
                                                >
                                                    ➕ โหลดเพิ่มอีก ({hotspotsForList.length - displayLimit} จุด)
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 11 }}>
                                            ไม่พบจุดความร้อนในวันที่เลือก
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12 }}>
                                    ✅ ไม่พบจุดความร้อนในพื้นที่
                                </div>
                            )}

                            {/* Footer */}
                            <div style={{ padding: '8px 14px', borderTop: '1px solid #f1f5f9', fontSize: 9, color: '#94a3b8', textAlign: 'center', fontWeight: 600, background: '#fafbfc' }}>
                                ℹ️ VIIRS (GISTDA) • {selectedSatellite === 'all' ? 'ทุกดาวเทียม' : selectedSatellite} • {activePeriodLabel} • <code style={{ background: '#e2e8f0', padding: '1px 3px', borderRadius: 3, fontSize: 9 }}>/{ENDPOINT_MAP[fetchDayRange]}</code>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
