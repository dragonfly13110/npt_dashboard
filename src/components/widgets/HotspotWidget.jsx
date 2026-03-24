import { useEffect, useState, useMemo } from 'react';
import { FireOutlined, ReloadOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, CircleMarker, Tooltip, GeoJSON } from 'react-leaflet';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import 'leaflet/dist/leaflet.css';

const RANGE_OPTIONS = [
    { label: '7 วัน', value: 7 },
    { label: '15 วัน', value: 15 },
    { label: '30 วัน', value: 30 },
];

function formatThaiTime(dateStr, timeStr) {
    if (!dateStr && !timeStr) return 'ไม่ระบุเวลา';

    try {
        let hours = 0;
        let mins = 0;
        let tStr = String(timeStr || '').trim();
        
        // Handle HH:MM or HHMM from acq_time
        if (tStr.includes(':')) {
            const parts = tStr.split(':');
            hours = parseInt(parts[0], 10) || 0;
            mins = parseInt(parts[1], 10) || 0;
        } else if (tStr.length >= 3) {
            const padded = tStr.padStart(4, '0');
            hours = parseInt(padded.substring(0, 2), 10) || 0;
            mins = parseInt(padded.substring(2, 4), 10) || 0;
        }
        
        // Ensure we only grab YYYY-MM-DD from acq_date (e.g., "2026-03-22T00:00:00" -> "2026-03-22")
        const cleanDate = String(dateStr || '').substring(0, 10);
        if (!cleanDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Fallback if not parsable
            return `${dateStr || ''} ${timeStr || ''}`.trim();
        }

        // Combine the cleanDate with parsed hours/mins into UTC 
        // VIIRS time (e.g. "0722") is in UTC, so we suffix 'Z'.
        const d = new Date(`${cleanDate}T${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00Z`);
        
        if (isNaN(d.getTime())) {
            return `${dateStr || ''} ${timeStr || ''}`.trim();
        }

        return d.toLocaleString('th-TH', { 
            timeZone: 'Asia/Bangkok',
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }) + ' น.';
    } catch(e) {
        return `${dateStr || ''} ${timeStr || ''}`.trim();
    }
}

function formatThaiTimestamp(date) {
    return date.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }) + ' น.';
}

export default function HotspotWidget() {
    const [loading, setLoading] = useState(true);
    const [hotspots, setHotspots] = useState(null);
    const [error, setError] = useState(null);
    const [selectedAmphoe, setSelectedAmphoe] = useState(null);
    const [geoJSONData, setGeoJSONData] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [dayRange, setDayRange] = useState(30);

    useEffect(() => {
        // Load GeoJSON data for boundaries
        import('../../data/nakhon_pathom_districts.json').then(module => {
            setGeoJSONData(module.default || module);
        }).catch(err => console.log('Could not load geojson', err));
    }, []);

    useEffect(() => {
        fetchHotspots();
    }, [dayRange]);

    const fetchHotspots = async () => {
        setLoading(true);
        setError(null);
        setSelectedAmphoe(null);
        try {
            const apiKey = import.meta.env.VITE_GISTDA_API_KEY;
            if (!apiKey) throw new Error('GISTDA API Key ไม่ได้ตั้งค่าใน .env');

            // GISTDA supports: 24hours, 48hours, 72hours, 7days, 30days
            // Map our dayRange to the closest API endpoint
            const endpointMap = { 7: '7days', 15: '30days', 30: '30days' };
            const endpoint = endpointMap[dayRange] || '30days';
            
            const url = `/api/gistda/api/2.0/resources/features/viirs/${endpoint}?limit=2000&offset=0&pv_idn=73`;
            
            const response = await fetch(url, {
                headers: {
                    'API-Key': apiKey,
                    'accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            
            let count = 0;
            let dCounts = {};
            let luCounts = {};
            let validItems = [];

            // Attempt to parse typical geojson or array formats
            const items = data.features || data.data || (Array.isArray(data) ? data : []);
            
            // If dayRange is 15, we need to client-side filter from 30days data
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - dayRange);

            const filteredItems = items.filter(item => {
                if (dayRange === 30 || dayRange === 7) return true; // API handles these
                const props = item.properties || item;
                const dateRaw = props.acq_date || props.ACQ_DATE || props.date || '';
                const cleanDate = String(dateRaw).substring(0, 10);
                if (!cleanDate) return true;
                return new Date(cleanDate) >= cutoffDate;
            });

            count = filteredItems.length;
            
            filteredItems.forEach(item => {
                const props = item.properties || item;
                const ampo = props.ap_tn || props.amphoe || 'ไม่ระบุอำเภอ';
                dCounts[ampo] = (dCounts[ampo] || 0) + 1;
                
                const lu = props.lu_tn || props.lu_name || props.landuse || props.LU_NAME || 'อื่นๆ';
                luCounts[lu] = (luCounts[lu] || 0) + 1;
                
                const lat = item.geometry?.coordinates?.[1] || props.latitude || props.lat || props.LATITUDE;
                const lon = item.geometry?.coordinates?.[0] || props.longitude || props.lon || props.LONGITUDE;
                
                const dateRaw = props.acq_date || props.ACQ_DATE || props.date;
                const timeRaw = props.acq_time || props.ACQ_TIME || props.time;
                const thaiTime = formatThaiTime(dateRaw, timeRaw);
                const dateKey = String(dateRaw || '').substring(0, 10);
                const confidence = props.confidence || props.CONFIDENCE || '';

                if (lat && lon) {
                    validItems.push({ lat, lon, lu, ampo, thaiTime, dateKey, confidence, rawProps: props });
                }
            });

            setHotspots({ count, districtCounts: dCounts, luCounts, validItems, original: data });
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Hotspot fetch error:", err);
            setError(err.message);
            // If CORS or Auth fails, we still want to show the widget UI gracefully
            setHotspots({ count: 0, districtCounts: {}, luCounts: {}, validItems: [] });
        } finally {
            setLoading(false);
        }
    };

    const { count, districtCounts, luCounts, validItems } = hotspots || { count: 0, districtCounts: {}, luCounts: {}, validItems: [] };
    const districts = Object.entries(districtCounts).sort((a, b) => b[1] - a[1]);
    const landuses = Object.entries(luCounts).sort((a, b) => b[1] - a[1]);

    const displayedItems = selectedAmphoe ? validItems.filter(v => v.ampo === selectedAmphoe) : validItems;

    // ===== TREND CHART DATA =====
    const trendData = useMemo(() => {
        if (!validItems || validItems.length === 0) return [];
        const dayCounts = {};
        validItems.forEach(item => {
            if (item.dateKey) {
                dayCounts[item.dateKey] = (dayCounts[item.dateKey] || 0) + 1;
            }
        });
        return Object.entries(dayCounts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, cnt]) => {
                const d = new Date(date);
                const label = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                return { date, label, จุดความร้อน: cnt };
            });
    }, [validItems]);

    // ===== Confidence-based color =====
    const getMarkerColor = (confidence) => {
        const c = String(confidence).toLowerCase();
        if (c === 'high' || c === 'h') return { fill: '#dc2626', stroke: '#991b1b' };  // Red
        if (c === 'nominal' || c === 'n') return { fill: '#f59e0b', stroke: '#b45309' }; // Orange
        if (c === 'low' || c === 'l') return { fill: '#eab308', stroke: '#a16207' };     // Yellow
        return { fill: '#ef4444', stroke: '#991b1b' }; // default red
    };

    if (loading) {
        return (
            <div className="widget-box slide-up-anim" style={{ animationDelay: '0.1s' }}>
                <div className="skeleton-pulse" style={{ height: '140px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="w-loader">กำลังตรวจสอบจุดความร้อน VIIRS...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="widget-box slide-up-anim" style={{ animationDelay: '0.1s' }}>
            {/* ===== HEADER with Range Selector & Refresh ===== */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div className="widget-header" style={{ marginBottom: 0 }}>
                    <div className="widget-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                        <FireOutlined />
                    </div>
                    <h4>จุดความร้อน จ.นครปฐม (VIIRS)</h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Day Range Selector */}
                    <div style={{ 
                        display: 'inline-flex', borderRadius: '8px', overflow: 'hidden',
                        border: '1px solid #e2e8f0', background: '#f8fafc'
                    }}>
                        {RANGE_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setDayRange(opt.value)}
                                style={{
                                    padding: '5px 12px', fontSize: '12px', fontWeight: 600,
                                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                    transition: 'all 0.2s',
                                    background: dayRange === opt.value ? '#dc2626' : 'transparent',
                                    color: dayRange === opt.value ? '#fff' : '#64748b',
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    {/* Refresh Button */}
                    <button
                        onClick={fetchHotspots}
                        disabled={loading}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                            border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b',
                            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                            transition: 'all 0.2s'
                        }}
                        title="รีเฟรชข้อมูล"
                    >
                        <ReloadOutlined spin={loading} /> รีเฟรช
                    </button>
                </div>
            </div>

            {/* ===== Last Updated ===== */}
            {lastUpdated && (
                <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '11px', color: '#94a3b8', marginTop: '8px', marginBottom: '4px'
                }}>
                    <ClockCircleOutlined style={{ fontSize: '10px' }} />
                    อัปเดตล่าสุด: {formatThaiTimestamp(lastUpdated)}
                </div>
            )}

            {count > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '16px' }}>
                    {/* LEFT COLUMN: Summary & Lists */}
                    <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '16px', borderBottom: '1px dashed #cbd5e1' }}>
                            <div style={{ fontSize: '42px', lineHeight: 1, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>
                                🚨
                            </div>
                            <div>
                                <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#dc2626', margin: 0, lineHeight: 1 }}>
                                    {count} <span style={{ fontSize: '16px', fontWeight: 600, color: '#475569' }}>จุด</span>
                                </h2>
                                <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>
                                    พบจุดความร้อนในนครปฐม (รอบ {dayRange} วัน)
                                </p>
                            </div>
                        </div>

                        {/* ===== TREND CHART ===== */}
                        {trendData.length > 1 && (
                            <div>
                                <h4 style={{ fontSize: '13px', color: '#64748b', margin: '0 0 10px', fontWeight: 600 }}>
                                    📈 แนวโน้มจุดความร้อนรายวัน
                                </h4>
                                <div style={{ height: '160px', width: '100%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="hotspotGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis 
                                                dataKey="label" 
                                                tick={{ fontSize: 10, fill: '#94a3b8' }} 
                                                axisLine={{ stroke: '#e2e8f0' }}
                                                tickLine={false}
                                            />
                                            <YAxis 
                                                allowDecimals={false}
                                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <RTooltip 
                                                contentStyle={{ 
                                                    borderRadius: '8px', border: '1px solid #fecaca',
                                                    fontSize: '12px', fontFamily: 'inherit',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                                                }}
                                                formatter={(val) => [`${val} จุด`, 'จุดความร้อน']}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="จุดความร้อน"
                                                stroke="#ef4444" 
                                                strokeWidth={2}
                                                fill="url(#hotspotGrad)"
                                                dot={{ r: 3, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                                                activeDot={{ r: 5, stroke: '#dc2626', strokeWidth: 2 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {districts.length > 0 && (
                            <div>
                                <h4 style={{ fontSize: '13px', color: '#64748b', margin: '0 0 10px', fontWeight: 600 }}>
                                    พื้นที่แจ้งเตือน <span style={{fontWeight: 400, fontSize: '11px'}}>(กดเพื่อดูพิกัด)</span>
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                                    {districts.map(([district, dCount]) => {
                                        const isSelected = selectedAmphoe === district;
                                        return (
                                            <div 
                                                key={district} 
                                                onClick={() => setSelectedAmphoe(isSelected ? null : district)}
                                                style={{ 
                                                    display: 'flex', justifyContent: 'space-between', 
                                                    background: isSelected ? '#ef4444' : '#fef2f2', 
                                                    padding: '6px 10px', borderRadius: '6px', 
                                                    border: isSelected ? '1px solid #dc2626' : '1px solid #fecaca',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    boxShadow: isSelected ? '0 2px 4px rgba(239, 68, 68, 0.2)' : 'none'
                                                }}
                                            >
                                                <span style={{ fontSize: '12px', color: isSelected ? '#fff' : '#991b1b', fontWeight: 500 }}>อ.{district.replace('อำเภอ', '').trim()}</span>
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#fff' : '#7f1d1d' }}>{dCount}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {landuses.length > 0 && (
                            <div>
                                <h4 style={{ fontSize: '13px', color: '#64748b', margin: '0 0 10px', fontWeight: 600 }}>พื้นที่พบเหตุไฟป่า (Landuse)</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {landuses.map(([lu, lCount]) => (
                                        <div key={lu} style={{ background: '#fef3c7', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', color: '#92400e', fontWeight: 600, border: '1px solid #fde68a' }}>
                                            {lu} <span style={{ background: '#f59e0b', color: '#fff', padding: '1px 6px', borderRadius: '8px', marginLeft: '4px', fontSize: '11px' }}>{lCount}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>

                    {/* RIGHT COLUMN: Map & Interactions */}
                    <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        {validItems.length > 0 && (
                            <>
                                <div style={{ height: '400px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative', zIndex: 1 }}>
                                    <MapContainer center={[13.82, 100.06]} zoom={9} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                                        
                                        {geoJSONData && (
                                            <GeoJSON
                                                key={selectedAmphoe || 'all'}
                                                data={geoJSONData}
                                                style={(feature) => {
                                                    const ampName = feature.properties?.amp_th || '';
                                                    const selName = selectedAmphoe ? selectedAmphoe.replace('อำเภอ', '').trim() : null;
                                                    const isSel = selName && ampName === selName;
                                                    
                                                    return {
                                                        color: isSel ? '#ef4444' : '#3b82f6',
                                                        weight: isSel ? 3 : 2,
                                                        opacity: isSel ? 0.9 : 0.7,
                                                        fillColor: isSel ? '#fee2e2' : '#93c5fd',
                                                        fillOpacity: isSel ? 0.4 : 0.15,
                                                        dashArray: isSel ? '' : '5, 5'
                                                    };
                                                }}
                                            />
                                        )}

                                        {displayedItems.map((item, idx) => {
                                            const colors = getMarkerColor(item.confidence);
                                            return (
                                                <CircleMarker 
                                                    key={idx} 
                                                    center={[item.lat, item.lon]} 
                                                    radius={5}
                                                    pathOptions={{ color: colors.stroke, fillColor: colors.fill, fillOpacity: 0.9, weight: 2 }}
                                                >
                                                    <Tooltip direction="top" offset={[0, -5]}>
                                                        <div style={{ fontFamily: 'var(--font-family)', fontSize: '12px' }}>
                                                            <strong>พื้นที่:</strong> {item.lu}<br/>
                                                            <strong>อำเภอ:</strong> {item.ampo}<br/>
                                                            {item.confidence && <><strong>ความเชื่อมั่น:</strong> {item.confidence}<br/></>}
                                                            <strong style={{ color: '#dc2626' }}>เวลา:</strong> {item.thaiTime}
                                                        </div>
                                                    </Tooltip>
                                                </CircleMarker>
                                            );
                                        })}
                                    </MapContainer>
                                </div>
                                {/* Confidence legend */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>ระดับ:</span>
                                    {[
                                        { color: '#dc2626', label: 'สูง (High)' },
                                        { color: '#f59e0b', label: 'ปกติ (Nominal)' },
                                        { color: '#eab308', label: 'ต่ำ (Low)' },
                                    ].map(l => (
                                        <span key={l.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b' }}>
                                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, display: 'inline-block', border: '1px solid #fff', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
                                            {l.label}
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}

                        {selectedAmphoe && displayedItems.length > 0 && (
                            <div style={{ marginTop: '16px', maxHeight: '180px', overflowY: 'auto', paddingRight: '8px' }}>
                                <h4 style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px', fontWeight: 600 }}>รายละเอียดจุดความร้อน อ.{selectedAmphoe.replace('อำเภอ', '').trim()}</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px' }}>
                                    {displayedItems.map((item, idx) => (
                                        <div key={idx} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                                            <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '2px' }}>📍 ตรวจพบเวลา {item.thaiTime}</div>
                                            <div style={{ color: '#475569' }}>พิกัด: {Number(item.lat).toFixed(4)}, {Number(item.lon).toFixed(4)}</div>
                                            <div style={{ color: '#64748b' }}>ประเภท: <span style={{fontWeight: 600}}>{item.lu}</span></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '16px', borderBottom: '1px dashed #cbd5e1', marginTop: '16px' }}>
                        <div style={{ fontSize: '42px', lineHeight: 1, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>
                            ✅
                        </div>
                        <div>
                            <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#16a34a', margin: 0, lineHeight: 1 }}>
                                0 <span style={{ fontSize: '16px', fontWeight: 600, color: '#475569' }}>จุด</span>
                            </h2>
                            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>
                                ไม่พบจุดความร้อนในรอบ {dayRange} วัน
                            </p>
                        </div>
                    </div>
                    <div style={{ marginTop: '16px', textAlign: 'center', padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <span style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>พื้นที่ปลอดภัย สภาพอากาศปกติ 🌲</span>
                    </div>
                </>
            )}
            
            {error && count === 0 && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#ef4444', textAlign: 'center' }}>
                    <small>หมายเหตุ: {error.includes('Failed to fetch') ? 'อาจติดปัญหาการเชื่อมต่อ API (CORS)' : error}</small>
                </div>
            )}
        </div>
    );
}
