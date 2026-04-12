import { useState, useEffect, useCallback } from 'react';
import { useApiCache } from '../../hooks/useApiCache';

// พิกัดพื้นที่เกษตรหลักของแต่ละอำเภอ
const DISTRICTS = [
    { name: 'เมืองนครปฐม', lat: 13.82, lon: 100.06 },
    { name: 'กำแพงแสน', lat: 14.02, lon: 99.98 },
    { name: 'นครชัยศรี', lat: 13.78, lon: 100.13 },
    { name: 'ดอนตูม', lat: 13.93, lon: 100.10 },
    { name: 'บางเลน', lat: 14.00, lon: 100.16 },
    { name: 'สามพราน', lat: 13.73, lon: 100.22 },
    { name: 'พุทธมณฑล', lat: 13.80, lon: 100.32 },
];

const DEPTH_LABELS = [
    { key: 'soil_moisture_0_to_1cm', label: '0–1 cm', depth: 'ผิวดินบนสุด' },
    { key: 'soil_moisture_3_to_9cm', label: '3–9 cm', depth: 'ชั้นรากอ่อน' },
    { key: 'soil_moisture_9_to_27cm', label: '9–27 cm', depth: 'ชั้นรากหลัก' },
    { key: 'soil_moisture_27_to_81cm', label: '27–81 cm', depth: 'ชั้นลึก' },
];

function getMoistureInfo(val) {
    if (val <= 0.15) return { level: 'แห้งมาก', color: '#ef4444', emoji: '🏜️', tip: 'ดินแห้งจัด ต้องให้น้ำทันที เสี่ยงพืชเหี่ยวเฉา' };
    if (val <= 0.22) return { level: 'แห้ง', color: '#f59e0b', emoji: '🌤️', tip: 'ดินค่อนข้างแห้ง ควรให้น้ำเพิ่มสำหรับพืชใบ/พืชผัก' };
    if (val <= 0.32) return { level: 'เหมาะสม', color: '#10b981', emoji: '✅', tip: 'ดินชุ่มชื้นพอเหมาะ เหมาะกับการเพาะปลูกทุกชนิด' };
    if (val <= 0.40) return { level: 'ชุ่มชื้นดี', color: '#3b82f6', emoji: '💧', tip: 'ดินมีน้ำอุดมสมบูรณ์ ลดการให้น้ำลงได้' };
    return { level: 'อิ่มน้ำ', color: '#8b5cf6', emoji: '🌊', tip: 'ดินอิ่มตัวด้วยน้ำ ระวังน้ำท่วมขัง หลีกเลี่ยงการไถพรวน' };
}

function parseSoilResponse(json) {
    const now = new Date();
    const nowStr = now.toISOString().slice(0, 13);
    let idx = json.hourly.time.findIndex(t => t.startsWith(nowStr));
    if (idx === -1) idx = Math.max(0, json.hourly.time.length - 25);

    const current = {
        soil_moisture_0_to_1cm: json.hourly.soil_moisture_0_to_1cm[idx],
        soil_moisture_3_to_9cm: json.hourly.soil_moisture_3_to_9cm[idx],
        soil_moisture_9_to_27cm: json.hourly.soil_moisture_9_to_27cm[idx],
        soil_moisture_27_to_81cm: json.hourly.soil_moisture_27_to_81cm[idx],
        soil_temp_surface: json.hourly.soil_temperature_0cm?.[idx],
        soil_temp_deep: json.hourly.soil_temperature_18cm?.[idx],
        time: json.hourly.time[idx],
    };

    const trend = [];
    for (let i = 0; i < 12; i++) {
        const ti = idx + i;
        if (ti < json.hourly.time.length) {
            trend.push({ time: new Date(json.hourly.time[ti]).getHours() + ':00', value: json.hourly.soil_moisture_0_to_1cm[ti] ?? 0 });
        }
    }

    const history = [];
    const startIdx = Math.max(0, idx - 7 * 24);
    for (let i = startIdx; i <= idx; i += 6) {
        const t = new Date(json.hourly.time[i]);
        history.push({
            label: `${t.getDate()}/${t.getMonth() + 1}`,
            surface: json.hourly.soil_moisture_0_to_1cm[i] ?? 0,
            root: json.hourly.soil_moisture_9_to_27cm[i] ?? 0,
            deep: json.hourly.soil_moisture_27_to_81cm[i] ?? 0,
        });
    }

    return { current, trend, history };
}

export default function SoilMoistureWidget() {
    const [districtIdx, setDistrictIdx] = useState(0);
    const [showHistory, setShowHistory] = useState(false);
    const district = DISTRICTS[districtIdx];

    const fetchFn = useCallback(async () => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${district.lat}&longitude=${district.lon}` +
            '&hourly=soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm,soil_moisture_27_to_81cm,soil_temperature_0cm,soil_temperature_18cm' +
            '&models=icon_seamless&timezone=Asia%2FBangkok&forecast_days=2&past_days=7';
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Soil API error: ${res.status}`);
        return parseSoilResponse(await res.json());
    }, [district.lat, district.lon]);

    const cacheKey = `soil-icon-${district.name}`;
    const { data, isLoading } = useApiCache(cacheKey, fetchFn, { staleMinutes: 30, cacheMinutes: 120 });

    if (isLoading) return <div className="widget-box skeleton-pulse"><div className="w-loader">กำลังโหลดข้อมูลดิน อ.{district.name}...</div></div>;
    if (!data?.current) return null;

    const { current, trend, history } = data;
    const surfaceVal = current.soil_moisture_0_to_1cm ?? 0;
    const surfaceInfo = getMoistureInfo(surfaceVal);
    const maxVal = Math.max(...trend.map(t => t.value), 0.01);

    return (
        <div className="widget-box slide-up-anim" style={{
            animationDelay: '0.3s', display: 'flex', flexDirection: 'column', gap: 12, padding: 16,
            background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)', borderRadius: 16, border: '1px solid #dcfce7'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 10, borderBottom: '1px dashed #e2e8f0' }}>
                <div style={{ fontSize: 36, lineHeight: 1, filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.1))' }}>🌱</div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>ความชื้นดิน</span>
                        <span style={{ fontSize: 16, fontWeight: 900, color: surfaceInfo.color }}>{surfaceInfo.emoji} {surfaceInfo.level}</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                        📍 อ.{district.name} &bull; {new Date(current.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                    </span>
                </div>
            </div>

            {/* District Selector */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DISTRICTS.map((d, i) => (
                    <button
                        key={d.name}
                        onClick={() => setDistrictIdx(i)}
                        style={{
                            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                            background: i === districtIdx ? '#10b981' : '#f1f5f9',
                            color: i === districtIdx ? '#fff' : '#64748b',
                        }}
                    >
                        {d.name}
                    </button>
                ))}
            </div>

            {/* Moisture Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DEPTH_LABELS.map(d => {
                    const val = current[d.key] ?? 0;
                    const pct = Math.min((val / 0.5) * 100, 100);
                    const info = getMoistureInfo(val);
                    return (
                        <div key={d.key}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
                                <span style={{ color: '#475569' }}>{d.depth} <small style={{ fontWeight: 500, color: '#94a3b8' }}>({d.label})</small></span>
                                <span style={{ color: info.color }}>{(val * 100).toFixed(1)}% <small style={{ fontWeight: 500 }}>m³/m³</small></span>
                            </div>
                            <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', width: `${pct}%`, borderRadius: 99,
                                    background: `linear-gradient(90deg, ${info.color}88, ${info.color})`,
                                    transition: 'width 1.2s ease-in-out'
                                }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Temperature Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 14px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: '#64748b', fontWeight: 800 }}>อุณหภูมิผิวดิน</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#1e293b' }}>{current.soil_temp_surface?.toFixed(1) ?? '–'}°C</span>
                </div>
                <div style={{ width: 1, background: '#e2e8f0' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: '#64748b', fontWeight: 800 }}>อุณหภูมิชั้นล่าง</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#1e293b' }}>{current.soil_temp_deep?.toFixed(1) ?? '–'}°C</span>
                </div>
            </div>

            {/* Toggle History */}
            <button
                onClick={() => setShowHistory(prev => !prev)}
                style={{
                    background: showHistory ? '#10b981' : '#fff',
                    color: showHistory ? '#fff' : '#10b981',
                    border: `1.5px solid ${showHistory ? '#10b981' : '#d1fae5'}`,
                    padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}
            >
                {showHistory ? '✕ ปิดกราฟย้อนหลัง' : '📅 ดูข้อมูลย้อนหลัง 7 วัน'}
            </button>

            {/* Historical Chart */}
            {showHistory && history.length > 0 && (
                <div style={{
                    background: '#f8fafc', borderRadius: 12, padding: '14px 12px',
                    border: '1px solid #e2e8f0', animation: 'fadeSlideIn 0.3s ease'
                }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 10 }}>
                        📊 ความชื้นดิน อ.{district.name} — ย้อนหลัง 7 วัน
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginBottom: 8, fontSize: 10, fontWeight: 700 }}>
                        <span style={{ color: '#10b981' }}>● ผิวดิน</span>
                        <span style={{ color: '#3b82f6' }}>● ชั้นราก</span>
                        <span style={{ color: '#8b5cf6' }}>● ชั้นลึก</span>
                    </div>
                    <div style={{ position: 'relative', height: 120, marginLeft: 28 }}>
                        <div style={{ position: 'absolute', left: -28, top: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8', fontWeight: 600, width: 26, textAlign: 'right' }}>
                            <span>50%</span><span>25%</span><span>0%</span>
                        </div>
                        <svg viewBox={`0 0 ${(history.length - 1) * 14} 120`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                            <line x1="0" y1="0" x2={(history.length - 1) * 14} y2="0" stroke="#e2e8f0" strokeDasharray="3 3" />
                            <line x1="0" y1="60" x2={(history.length - 1) * 14} y2="60" stroke="#e2e8f0" strokeDasharray="3 3" />
                            <line x1="0" y1="120" x2={(history.length - 1) * 14} y2="120" stroke="#e2e8f0" strokeDasharray="3 3" />
                            {renderLine(history, 'surface', '#10b981', 14)}
                            {renderLine(history, 'root', '#3b82f6', 14)}
                            {renderLine(history, 'deep', '#8b5cf6', 14)}
                        </svg>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8', marginTop: 4, marginLeft: 28 }}>
                        {history.filter((_, i) => i % Math.max(1, Math.floor(history.length / 5)) === 0).map((h, i) => (
                            <span key={i}>{h.label}</span>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 10, color: '#64748b', fontWeight: 600, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <span>ผิวดิน: {(Math.min(...history.map(h => h.surface)) * 100).toFixed(1)}–{(Math.max(...history.map(h => h.surface)) * 100).toFixed(1)}%</span>
                        <span>ชั้นราก: {(Math.min(...history.map(h => h.root)) * 100).toFixed(1)}–{(Math.max(...history.map(h => h.root)) * 100).toFixed(1)}%</span>
                        <span>ชั้นลึก: {(Math.min(...history.map(h => h.deep)) * 100).toFixed(1)}–{(Math.max(...history.map(h => h.deep)) * 100).toFixed(1)}%</span>
                    </div>
                </div>
            )}

            {/* Sparkline */}
            {!showHistory && (
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>แนวโน้มความชื้นผิวดิน 12 ชม.</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 32 }}>
                        {trend.map((t, i) => {
                            const h = Math.max((t.value / maxVal) * 30, 3);
                            const info = getMoistureInfo(t.value);
                            return (
                                <div key={i} title={`${t.time}: ${(t.value * 100).toFixed(1)}%`}
                                    style={{ flex: 1, height: h, borderRadius: '3px 3px 0 0', background: info.color, opacity: 0.7, transition: 'height 0.5s ease' }} />
                            );
                        })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                        <span>{trend[0]?.time}</span>
                        <span>{trend[trend.length - 1]?.time}</span>
                    </div>
                </div>
            )}

            {/* Tip */}
            <div style={{ fontSize: 11, background: surfaceInfo.color + '15', color: surfaceInfo.color, padding: '8px 12px', borderRadius: 8, fontWeight: 700, border: `1px dashed ${surfaceInfo.color}40` }}>
                💡 {surfaceInfo.tip}
            </div>
        </div>
    );
}

function renderLine(history, key, color, spacing) {
    const maxScale = 0.5;
    const chartH = 120;
    const points = history.map((h, i) => {
        const x = i * spacing;
        const y = chartH - ((h[key] ?? 0) / maxScale) * chartH;
        return `${x},${Math.max(0, Math.min(chartH, y))}`;
    }).join(' ');
    return (
        <>
            <polygon points={`0,${chartH} ${points} ${(history.length - 1) * spacing},${chartH}`} fill={color} opacity="0.1" />
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </>
    );
}
