import { useState, useMemo } from 'react';
import { FireOutlined, EnvironmentOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { useApiCache } from '../../hooks/useApiCache';

async function fetchHotspotData(dayRange) {
    // GISTDA only guarantees certain endpoints like /7days or /30days. /1days returns 404.
    // We will always fetch 7days and filter locally based on dayRange.
    const url = `/api/gistda/api/2.0/resources/features/viirs/7days?limit=1000&offset=0&pv_idn=73`;
    console.log(`[Hotspot] Fetching /7days to filter for last ${dayRange} days`);
    
    const res = await fetch(url, {
        headers: { 'accept': 'application/json' }
    });
    
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`[Hotspot] API error ${res.status}:`, text.slice(0, 300));
        throw new Error(`Hotspot API: ${res.status}`);
    }
    
    const json = await res.json();
    const items = json.features || json.data || (Array.isArray(json) ? json : []);
    
    if (items.length === 0) {
        console.warn("[Hotspot] No items returned from API.");
        return [];
    }
    
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(now.getDate() - dayRange);
    
    // Map GISTDA raw JSON into GeoJSON format required by the widget
    return items.map(item => {
        const props = item.properties || item;
        const lat = item.geometry?.coordinates?.[1] || props.latitude || props.lat || props.LATITUDE;
        const lon = item.geometry?.coordinates?.[0] || props.longitude || props.lon || props.LONGITUDE;
        const brightness = props.bright_ti4 || props.bright_ti5 || props.brightness || props.BRIGHTNESS || 0;
        
        return {
            geometry: { coordinates: [lon, lat] },
            properties: {
                ...props,
                brightness: parseFloat(brightness)
            }
        };
    }).filter(f => {
        if (!f.geometry.coordinates[0] || !f.geometry.coordinates[1]) return false;
        
        // Local date filtering based on the requested dayRange
        const acqDate = f.properties.acq_date || f.properties.ACQ_DATE;
        if (acqDate) {
            const dataDate = new Date(acqDate);
            if (dataDate < cutoffDate) {
                return false;
            }
        }
        return true;
    });
}

// Filter features for Nakhon Pathom area
function filterNakhonPathom(features) {
    if (!features) return [];
    return features.filter(f => {
        const lat = f.geometry?.coordinates?.[1];
        const lon = f.geometry?.coordinates?.[0];
        return lat >= 13.6 && lat <= 14.2 && lon >= 99.8 && lon <= 100.4;
    });
}

function getMockHotspots(dayRange) {
    const mockCount = dayRange === 1 ? 3 : dayRange === 3 ? 8 : 15;
    const mock = [];
    for (let i = 0; i < mockCount; i++) {
        mock.push({
            geometry: {
                coordinates: [
                    100.06 + (Math.random() - 0.5) * 0.3,
                    13.82 + (Math.random() - 0.5) * 0.3
                ]
            },
            properties: {
                brightness: 310 + Math.random() * 20,
                acq_time: `${10 + Math.floor(Math.random() * 12)}:${String(Math.floor(Math.random() * 59)).padStart(2, '0')}`,
                acq_date: new Date().toISOString().split('T')[0],
                confidence: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)]
            }
        });
    }
    return mock;
}

export default function HotspotWidget() {
    const [dayRange, setDayRange] = useState(1);

    const { data: rawFeatures, isLoading } = useApiCache(
        ['hotspot_gistda_v2', dayRange],
        () => fetchHotspotData(dayRange),
        { staleMinutes: 10, cacheMinutes: 60 }  // ลดเวลาแคชลงเพื่อความชัวร์ในช่วงทดสอบ
    );

    // Use fetched data or fallback mock
    const features = rawFeatures || [];
    const useMock = !rawFeatures && !isLoading;
    const mockFeatures = useMemo(() => useMock ? getMockHotspots(dayRange) : [], [useMock, dayRange]);
    
    const localHotspots = filterNakhonPathom(rawFeatures ? features : mockFeatures);
    const totalHotspots = (rawFeatures ? features : mockFeatures).length;

    const stats = useMemo(() => {
        const src = rawFeatures ? features : mockFeatures;
        if (!src.length) return { avgBright: '-', maxBright: '-', highConf: 0 };
        
        const validBrightness = src
            .map(f => f.properties?.brightness)
            .filter(b => typeof b === 'number' && !isNaN(b));
        
        return {
            avgBright: validBrightness.length > 0 
                ? (validBrightness.reduce((a, b) => a + b, 0) / validBrightness.length).toFixed(1) + ' K'
                : '-',
            maxBright: validBrightness.length > 0 
                ? Math.max(...validBrightness).toFixed(1) + ' K'
                : '-',
            highConf: src.filter(f => {
                const c = f.properties?.confidence;
                return c === 'high' || c === 'h' || (typeof c === 'number' && c >= 80);
            }).length
        };
    }, [features, mockFeatures, rawFeatures]);

    return (
        <div className="widget-box slide-up-anim" style={{ animationDelay: '0.25s' }}>
            <div className="widget-header" style={{ justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="widget-icon" style={{ background: '#fee2e2', color: '#dc2626' }}><FireOutlined /></div>
                    <h4>จุดความร้อน (VIIRS/GISTDA)</h4>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                    {[1, 3, 7].map(d => (
                        <button key={d}
                            onClick={() => setDayRange(d)}
                            style={{
                                padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit',
                                border: dayRange === d ? '1px solid #dc2626' : '1px solid #e2e8f0',
                                background: dayRange === d ? 'linear-gradient(135deg, #dc2626, #f97316)' : '#f8fafc',
                                color: dayRange === d ? '#fff' : '#475569',
                                fontWeight: '700', fontSize: '11px',
                                transition: 'all 0.2s',
                            }}
                        >
                            {d === 1 ? 'วันนี้' : d === 3 ? '3 วัน' : 'สัปดาห์'}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="skeleton-pulse" style={{ height: '220px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="w-loader">กำลังตรวจสอบจุดความร้อน...</div>
                </div>
            ) : (
                <>
                    {!rawFeatures && (
                        <div style={{ fontSize: '11px', color: '#f97316', background: '#fffbeb', padding: '6px 12px', borderRadius: '8px', marginBottom: '10px', fontWeight: '600', border: '1px solid #fde68a', textAlign: 'center' }}>
                            ⚠️ ไม่สามารถเชื่อมต่อ GISTDA API — แสดงข้อมูลจำลอง
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
                        <div style={{ background: 'linear-gradient(135deg, #fef2f2, #fff1f2)', borderRadius: '12px', padding: '14px', border: '1px solid #fecdd3' }}>
                            <div style={{ fontSize: '11px', color: '#f43f5e', fontWeight: '700', marginBottom: '4px' }}>⚡ ทั่วประเทศ</div>
                            <div style={{ fontSize: '26px', fontWeight: '900', color: '#be123c' }}>{totalHotspots.toLocaleString()}</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>จุดความร้อน</div>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)', borderRadius: '12px', padding: '14px', border: '1px solid #a7f3d0' }}>
                            <div style={{ fontSize: '11px', color: '#059669', fontWeight: '700', marginBottom: '4px' }}>
                                <EnvironmentOutlined /> จ.นครปฐม
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: '900', color: localHotspots.length > 0 ? '#dc2626' : '#059669' }}>
                                {localHotspots.length}
                            </div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                                {localHotspots.length > 0 ? '⚠️ ตรวจพบจุดความร้อน' : '✅ ไม่พบจุดความร้อน'}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                        <div style={{ background: '#fffbeb', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid #fde68a' }}>
                            <div style={{ fontSize: '10px', color: '#92400e', fontWeight: '700', marginBottom: '2px' }}>Avg Brightness</div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#b45309' }}>{stats.avgBright}</div>
                        </div>
                        <div style={{ background: '#fef2f2', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid #fecaca' }}>
                            <div style={{ fontSize: '10px', color: '#991b1b', fontWeight: '700', marginBottom: '2px' }}>Max Brightness</div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#dc2626' }}>{stats.maxBright}</div>
                        </div>
                        <div style={{ background: '#eef2ff', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid #c7d2fe' }}>
                            <div style={{ fontSize: '10px', color: '#3730a3', fontWeight: '700', marginBottom: '2px' }}>High Confidence</div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#4f46e5' }}>{stats.highConf}</div>
                        </div>
                    </div>

                    {localHotspots.length > 0 && (
                        <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '12px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626', marginBottom: '8px' }}>
                                🔥 จุดความร้อนในนครปฐม ({localHotspots.length} จุด)
                            </div>
                            {localHotspots.slice(0, 5).map((f, i) => (
                                <div key={i} style={{ 
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '8px 10px', background: i % 2 === 0 ? '#fef2f2' : '#fff', 
                                    borderRadius: '8px', marginBottom: '4px', fontSize: '12px'
                                }}>
                                    <span style={{ color: '#475569', fontWeight: '600' }}>
                                        📍 {f.geometry.coordinates[1].toFixed(4)}, {f.geometry.coordinates[0].toFixed(4)}
                                    </span>
                                    <span style={{ fontWeight: '800', color: '#ef4444' }}>
                                        {f.properties?.brightness ? `${Number(f.properties.brightness).toFixed(1)} K` : '-'}
                                    </span>
                                </div>
                            ))}
                            {localHotspots.length > 5 && (
                                <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginTop: '4px' }}>
                                    ...และอีก {localHotspots.length - 5} จุด
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ marginTop: '12px', fontSize: '10px', color: '#94a3b8', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', textAlign: 'center', fontWeight: '600', lineHeight: '1.4' }}>
                        ℹ️ ข้อมูลจากดาวเทียม VIIRS (GISTDA) — ใช้ proxy ผ่าน <code style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: '4px' }}>/api/gistda</code>
                    </div>
                </>
            )}
        </div>
    );
}
