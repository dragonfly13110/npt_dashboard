import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import './SmartMap.css';

// ===== CHOROPLETH CONFIG =====
const METRICS = [
    { key: 'area', label: 'พื้นที่เกษตร', unit: 'ไร่', icon: '🌾', colors: ['#6ee7b7', '#34d399', '#059669', '#064e3b'] },
    { key: 'house', label: 'ครัวเรือน', unit: 'ราย', icon: '🏠', colors: ['#93c5fd', '#60a5fa', '#2563eb', '#1e3a5f'] },
    { key: 'ce', label: 'วิสาหกิจชุมชน', unit: 'แห่ง', icon: '🤝', colors: ['#d8b4fe', '#c084fc', '#9333ea', '#4a1d6b'] },
    { key: 'lp', label: 'แปลงใหญ่', unit: 'แปลง', icon: '🌱', colors: ['#fdba74', '#fb923c', '#ea580c', '#7c2d12'] },
];

const MARKER_LAYERS = [
    { key: 'gis', label: 'พื้นที่ GIS', color: '#3b82f6', icon: '📍' },
    { key: 'tourism', label: 'ท่องเที่ยวเกษตร', color: '#22c55e', icon: '🏕️' },
];

const DISTRICT_CENTROIDS = {
    'เมืองนครปฐม': [13.82, 100.04],
    'กำแพงแสน': [14.01, 99.98],
    'บางเลน': [14.02, 100.17],
    'ดอนตูม': [13.98, 100.08],
    'นครชัยศรี': [13.80, 100.18],
    'สามพราน': [13.72, 100.22],
    'พุทธมณฑล': [13.78, 100.32],
};

// ===== MINI BAR CHART (pure CSS) =====
function MiniBarChart({ data }) {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data.map(d => d.value), 1);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.map(d => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', minWidth: 72, textAlign: 'right' }}>
                        {d.label}
                    </span>
                    <div style={{ flex: 1, height: 14, background: 'rgba(15, 23, 42, 0.06)', borderRadius: 7, overflow: 'hidden' }}>
                        <div
                            style={{
                                width: `${Math.max((d.value / max) * 100, 2)}%`,
                                height: '100%',
                                background: `linear-gradient(90deg, ${d.color}cc, ${d.color})`,
                                borderRadius: 7,
                                transition: 'width 0.6s ease',
                            }}
                        />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', minWidth: 50, textAlign: 'right' }}>
                        {d.value.toLocaleString()}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ===== ANIMATED NUMBER =====
function AnimatedNumber({ value, duration = 800 }) {
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        if (!value) { setDisplay(0); return; }
        let start = 0;
        const startTime = performance.now();
        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            start = Math.round(value * eased);
            setDisplay(start);
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [value, duration]);

    return <>{display.toLocaleString()}</>;
}

// ===== MAIN COMPONENT =====
export default function SmartMap() {
    const navigate = useNavigate();
    const { loading: dataLoading, districtStats, mapData } = useDashboardData();

    const [MapComponents, setMapComponents] = useState(null);
    const [geoJSONData, setGeoJSONData] = useState(null);
    const [activeMetric, setActiveMetric] = useState('area');
    const [visibleLayers, setVisibleLayers] = useState({ gis: true, tourism: true });
    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [panelClosing, setPanelClosing] = useState(false);
    const [resetKey, setResetKey] = useState(0);

    // AI Insights states
    const [aiLoading, setAiLoading] = useState(false);
    const [aiInsights, setAiInsights] = useState({});
    const [aiError, setAiError] = useState(null);

    // Simulation Sliders states
    const [simRiceConversion, setSimRiceConversion] = useState(0);
    const [simResidueManagement, setSimResidueManagement] = useState(0);

    // Reset simulation and AI error when district changes
    useEffect(() => {
        setSimRiceConversion(0);
        setSimResidueManagement(0);
        setAiError(null);
    }, [selectedDistrict]);

    // Compute totals for KPI bar
    const totals = useMemo(() => {
        if (!districtStats || Object.keys(districtStats).length === 0) {
            return { area: 0, house: 0, ce: 0, lp: 0, sf: 0 };
        }
        const vals = Object.values(districtStats);
        return {
            area: vals.reduce((s, d) => s + (d.area || 0), 0),
            house: vals.reduce((s, d) => s + (d.house || 0), 0),
            ce: vals.reduce((s, d) => s + (d.ce || 0), 0),
            lp: vals.reduce((s, d) => s + (d.lp || 0), 0),
            sf: 0, // SF count is from a different source, placeholder
        };
    }, [districtStats]);

    // Load Leaflet + GeoJSON
    useEffect(() => {
        import('../data/nakhon_pathom_districts.json').then(m => setGeoJSONData(m.default));
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

    // Toggle marker layers
    const toggleLayer = useCallback((key) => {
        setVisibleLayers(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    // Close panel with animation
    const closePanel = useCallback(() => {
        setPanelClosing(true);
        setTimeout(() => {
            setSelectedDistrict(null);
            setPanelClosing(false);
        }, 300);
    }, []);

    const handleResetView = useCallback(() => {
        closePanel();
        setResetKey(prev => prev + 1);
    }, [closePanel]);

    // Get metric info
    const currentMetric = METRICS.find(m => m.key === activeMetric) || METRICS[0];

    // Compute choropleth min/max
    const { minVal, maxVal } = useMemo(() => {
        if (!districtStats || Object.keys(districtStats).length === 0) return { minVal: 0, maxVal: 1 };
        const vals = Object.values(districtStats).map(d => d[activeMetric] || 0);
        return { minVal: Math.min(...vals), maxVal: Math.max(...vals, 1) };
    }, [districtStats, activeMetric]);

    // Color interpolation for choropleth
    const getDistrictColor = useCallback((value) => {
        const t = maxVal > minVal ? (value - minVal) / (maxVal - minVal) : 0.5;
        const colors = currentMetric.colors;
        const idx = Math.min(Math.floor(t * colors.length), colors.length - 1);
        return colors[idx];
    }, [minVal, maxVal, currentMetric]);

    // Get selected district data for panel
    const selectedData = useMemo(() => {
        if (!selectedDistrict || !districtStats) return null;
        return districtStats[selectedDistrict.name] || null;
    }, [selectedDistrict, districtStats]);

    // Memoized Policy Simulation calculations
    const simulationResults = useMemo(() => {
        if (!selectedData) {
            return { waterSaved: 0, incomeAdded: 0, hotspotReduction: 0, co2Reduced: 0 };
        }
        const ricePrung = selectedData.ricePrung || 0;
        const ricePi = selectedData.ricePi || 0;
        const totalRice = ricePrung + ricePi;

        // Water saved: (ricePrung * conversion_rate) * 600 m3
        const waterSaved = Math.round((ricePrung * (simRiceConversion / 100)) * 600);

        // Additional Income: (ricePrung * conversion_rate) * 12,000 Baht
        const incomeAdded = Math.round((ricePrung * (simRiceConversion / 100)) * 12000);

        // Hotspot Reduction: residue_management * 0.8
        const hotspotReduction = simResidueManagement * 0.8;

        // CO2 Reduced: totalRice * residue_management * 0.35
        const co2Reduced = (totalRice * (simResidueManagement / 100)) * 0.35;

        return { waterSaved, incomeAdded, hotspotReduction, co2Reduced };
    }, [selectedData, simRiceConversion, simResidueManagement]);

    // Async handler to call Gemini API for district-specific agricultural insights
    const handleGenerateAIInsight = useCallback(async (districtName) => {
        if (!districtName || !selectedData) return;
        
        setAiLoading(true);
        setAiError(null);

        try {
            const { callAI } = await import('../services/aiService');

            // Format agricultural land usage distribution for the AI prompt
            const cropsStr = [
                selectedData.ricePi > 0 ? `- นาปี: ${selectedData.ricePi.toLocaleString()} ไร่` : '',
                selectedData.ricePrung > 0 ? `- นาปรัง: ${selectedData.ricePrung.toLocaleString()} ไร่` : '',
                selectedData.field > 0 ? `- พืชไร่: ${selectedData.field.toLocaleString()} ไร่` : '',
                selectedData.fruit > 0 ? `- ไม้ผล: ${selectedData.fruit.toLocaleString()} ไร่` : '',
                ((selectedData.veg || 0) + (selectedData.herb || 0)) > 0 ? `- ผักและสมุนไพร: ${((selectedData.veg || 0) + (selectedData.herb || 0)).toLocaleString()} ไร่` : '',
                selectedData.flow > 0 ? `- ไม้ดอก: ${selectedData.flow.toLocaleString()} ไร่` : '',
            ].filter(Boolean).join('\n');

            const systemPrompt = `คุณคือผู้เชี่ยวชาญด้านข้อมูลเกษตรอัจฉริยะ (Smart Agriculture Analyst) ของจังหวัดนครปฐม
หน้าที่ของคุณคือวิเคราะห์ข้อมูลสถิติเกษตรระดับอำเภอ และให้คำแนะนำเชิงยุทธศาสตร์ที่เฉียบคม ตรงจุด ปฏิบัติได้จริง
เขียนคำตอบเป็นภาษาไทยที่เป็นทางการ กระชับ และสร้างสรรค์`;

            const userPrompt = `โปรดวิเคราะห์ข้อมูลสถิติการเกษตรของ อำเภอ${districtName} จังหวัดนครปฐม ดังนี้:
- พื้นที่เกษตรกรรมทั้งหมด: ${(selectedData.area || 0).toLocaleString()} ไร่ (${selectedDistrict.areaSqkm?.toFixed(1)} ตร.กม.)
- จำนวนครัวเรือนเกษตรกร: ${(selectedData.house || 0).toLocaleString()} ครัวเรือน
- เครือข่ายเกษตรกร: วิสาหกิจชุมชน ${(selectedData.ce || 0)} แห่ง, แปลงใหญ่ ${(selectedData.lp || 0)} แปลง, ศพก. ${(selectedData.lc || 0)} แห่ง, ศจช. ${(selectedData.pc || 0)} แห่ง, ศดปช. ${(selectedData.sfc || 0)} แห่ง
- กลุ่มสถาบัน: กลุ่มแม่บ้านเกษตรกร ${(selectedData.instHousewives || 0)} กลุ่ม, ยุวเกษตรกร ${(selectedData.instYoung || 0)} กลุ่ม, กลุ่มส่งเสริมอาชีพ ${(selectedData.instCareer || 0)} กลุ่ม
- เกษตรกรชั้นนำ: Smart Farmer ${(selectedData.sfSfCount || 0)} ราย, Young Smart Farmer ${(selectedData.ysfCount || 0)} ราย
- ภัยคุกคาม: พื้นที่ประสบภัยพิบัติ ${(selectedData.disasterArea || 0).toLocaleString()} ไร่, ศัตรูพืชระบาด ${(selectedData.pestArea || 0).toLocaleString()} ไร่, จุดความร้อน PM2.5 สะสม ${selectedData.fireCount || 0} จุด
- โครงสร้างการเพาะปลูกพืช:
${cropsStr}

คำชี้แจงในการตอบ:
1. วิเคราะห์วิสัยทัศน์ จุดเด่น หรือโอกาสในการพัฒนาของอำเภอนี้โดยอิงจากสถิติตัวเลข
2. ชี้ประเด็นความเสี่ยงหรือจุดท้าทายหลัก (เช่น ภัยแล้ง โรคพืช ความร้อน)
3. เสนอแนะนโยบายเชิงรุก 1-2 ข้อที่เป็นรูปธรรม (เช่น การปรับนโยบาย conversion หรือ การจัดการเศษวัสดุแบบไร้มลพิษ)

ข้อจำกัดสำคัญมาก:
- ตอบเป็นภาษาไทยที่กระชับและเป็นทางการ
- สรุปแยกเป็น 3 หัวข้อสั้นๆ (ใช้สัญลักษณ์ 🎯 โอกาสพัฒนา, ⚠️ ความท้าทายหลัก, 💡 ข้อเสนอแนะเชิงรุก)
- ความยาวรวมไม่เกิน 4-5 ประโยค
- ห้ามใช้ markdown หนาบางซ้อนกันยุ่งเหยิง เอาแบบอ่านง่ายสบายตาที่สุด`;

            const response = await callAI('gemini', systemPrompt, userPrompt, { deepThinking: false });
            
            if (response) {
                setAiInsights(prev => ({
                    ...prev,
                    [districtName]: response
                }));
            } else {
                throw new Error("ไม่ได้รับข้อมูลวิเคราะห์จาก AI กรุณาลองใหม่อีกครั้ง");
            }
        } catch (err) {
            console.error("AI Insight Error: ", err);
            setAiError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI");
        } finally {
            setAiLoading(false);
        }
    }, [selectedData, selectedDistrict]);

    // Loading state
    if (!MapComponents || !geoJSONData || dataLoading) {
        return (
            <div className="smart-map-page">
                <div className="smart-map-loading">
                    <div className="loading-spinner" />
                    <div className="loading-text">กำลังโหลดแผนที่อัจฉริยะ...</div>
                </div>
            </div>
        );
    }

    const { L, MapContainer, TileLayer, CircleMarker, Marker, Popup, GeoJSON, useMap, ZoomControl } = MapComponents;

    // ===== FIT BOUNDS COMPONENT =====
    function FitBounds() {
        const map = useMap();
        useEffect(() => {
            if (!geoJSONData || !L) return;
            const bounds = L.geoJSON(geoJSONData).getBounds();
            if (!bounds.isValid()) return;
            map.invalidateSize();
            map.fitBounds(bounds, {
                paddingTopLeft: [selectedDistrict ? 360 : 28, 80],
                paddingBottomRight: [240, 100],
                maxZoom: 11,
                animate: true,
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [geoJSONData, L, map, resetKey]);
        return null;
    }

    // ===== GIS + TOURISM MARKERS =====
    const gisMarkers = mapData.filter(d => d.type === 'gis');
    const tourMarkers = mapData.filter(d => d.type === 'tourism');

    // ===== CROP DATA FOR SELECTED DISTRICT =====
    const cropChartData = selectedData ? [
        { label: 'นาปี', value: selectedData.ricePi || 0, color: '#22c55e' },
        { label: 'นาปรัง', value: selectedData.ricePrung || 0, color: '#3b82f6' },
        { label: 'พืชไร่', value: selectedData.field || 0, color: '#eab308' },
        { label: 'ไม้ผล', value: selectedData.fruit || 0, color: '#f97316' },
        { label: 'ผัก/สมุนไพร', value: (selectedData.veg || 0) + (selectedData.herb || 0), color: '#8b5cf6' },
        { label: 'ไม้ดอก', value: selectedData.flow || 0, color: '#ec4899' },
    ].filter(d => d.value > 0) : [];

    return (
        <div className="smart-map-page">
            {/* ===== ACTION BUTTONS ===== */}
            <div className="smart-map-action-group">
                <button className="smart-map-back" onClick={() => navigate('/')}>
                    ← กลับหน้าหลัก
                </button>
                <button className="smart-map-reset" onClick={handleResetView}>
                    🔄 รีเซ็ตมุมมอง
                </button>
            </div>

            {/* ===== PAGE TITLE ===== */}
            <div className="smart-map-title">
                <span className="smart-map-title-icon">🗺️</span>
                <span className="smart-map-title-text">แผนที่นครปฐมอัจฉริยะ</span>
                <span className="smart-map-title-sub">Smart Agri Map</span>
            </div>

            {/* ===== LAYER CONTROL PANEL ===== */}
            <div className="smart-map-controls">
                <div className="controls-section-title">ตัวชี้วัด Choropleth</div>
                {METRICS.map(m => (
                    <button
                        key={m.key}
                        className={`control-btn ${activeMetric === m.key ? 'active' : ''}`}
                        onClick={() => setActiveMetric(m.key)}
                    >
                        <span className="control-btn-icon">{m.icon}</span>
                        <span className="control-btn-label">{m.label}</span>
                    </button>
                ))}

                <div className="controls-divider" />
                <div className="controls-section-title">ชั้นข้อมูล</div>
                {MARKER_LAYERS.map(ml => (
                    <button
                        key={ml.key}
                        className={`control-toggle ${visibleLayers[ml.key] ? 'active' : ''}`}
                        onClick={() => toggleLayer(ml.key)}
                    >
                        <span className="control-toggle-dot" style={{ background: ml.color }} />
                        <span>{ml.icon} {ml.label}</span>
                    </button>
                ))}

                {/* ===== LEGEND ===== */}
                <div className="smart-map-legend">
                    <div className="legend-title">{currentMetric.icon} {currentMetric.label} ({currentMetric.unit})</div>
                    <div
                        className="legend-bar"
                        style={{ background: `linear-gradient(90deg, ${currentMetric.colors.join(', ')})` }}
                    />
                    <div className="legend-labels">
                        <span>{minVal.toLocaleString()}</span>
                        <span>{maxVal.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* ===== DISTRICT DETAIL PANEL ===== */}
            {selectedDistrict && selectedData && (
                <div className={`district-panel ${panelClosing ? 'district-panel-closing' : ''}`}>
                    <div className="panel-header">
                        <div>
                            <div className="panel-district-name">อ.{selectedDistrict.name}</div>
                            <div className="panel-district-area">
                                พื้นที่ {selectedDistrict.areaSqkm?.toFixed(1)} ตร.กม.
                            </div>
                        </div>
                        <button className="panel-close-btn" onClick={closePanel}>✕</button>
                    </div>

                    <div className="panel-section">
                        <div className="panel-section-title">ตัวชี้วัดหลัก</div>
                        <div className="panel-stats-grid">
                            <div className="panel-stat">
                                <div className="panel-stat-icon">🌾</div>
                                <div className="panel-stat-value">{(selectedData.area || 0).toLocaleString()}</div>
                                <div className="panel-stat-label">พื้นที่เกษตร (ไร่)</div>
                            </div>
                            <div className="panel-stat">
                                <div className="panel-stat-icon">🏠</div>
                                <div className="panel-stat-value">{(selectedData.house || 0).toLocaleString()}</div>
                                <div className="panel-stat-label">ครัวเรือนเกษตรกร</div>
                            </div>
                            <div className="panel-stat">
                                <div className="panel-stat-icon">🤝</div>
                                <div className="panel-stat-value">{(selectedData.ce || 0).toLocaleString()}</div>
                                <div className="panel-stat-label">วิสาหกิจชุมชน</div>
                            </div>
                            <div className="panel-stat">
                                <div className="panel-stat-icon">🌱</div>
                                <div className="panel-stat-value">{(selectedData.lp || 0).toLocaleString()}</div>
                                <div className="panel-stat-label">แปลงใหญ่</div>
                            </div>
                        </div>
                    </div>

                    {cropChartData.length > 0 && (
                        <div className="panel-section">
                            <div className="panel-section-title">สัดส่วนพื้นที่เพาะปลูก (ไร่)</div>
                            <MiniBarChart data={cropChartData} />
                        </div>
                    )}

                    {/* ===== POLICY SIMULATION SECTION ===== */}
                    <div className="panel-section policy-simulation">
                        <div className="panel-section-title">🎛️ จำลองผลลัพธ์การปรับนโยบาย (What-If)</div>
                        
                        {/* Rice conversion slider */}
                        <div className="simulation-slider-group">
                            <div className="slider-header">
                                <span className="slider-label">เปลี่ยนนาปรังเป็นพืชสวน/พืชไร่</span>
                                <span className="slider-value">{simRiceConversion}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="50"
                                step="5"
                                value={simRiceConversion}
                                onChange={(e) => setSimRiceConversion(parseInt(e.target.value))}
                                disabled={!(selectedData.ricePrung > 0)}
                                className="sim-range-input"
                            />
                            {!(selectedData.ricePrung > 0) && (
                                <div className="slider-hint-disabled">ไม่มีพื้นที่นาปรังในอำเภอนี้</div>
                            )}
                        </div>

                        {/* Residue management slider */}
                        <div className="simulation-slider-group">
                            <div className="slider-header">
                                <span className="slider-label">ลดการเผาเศษวัสดุทางการเกษตร</span>
                                <span className="slider-value">{simResidueManagement}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="10"
                                value={simResidueManagement}
                                onChange={(e) => setSimResidueManagement(parseInt(e.target.value))}
                                disabled={!(((selectedData.ricePi || 0) + (selectedData.ricePrung || 0)) > 0)}
                                className="sim-range-input"
                            />
                            {!(((selectedData.ricePi || 0) + (selectedData.ricePrung || 0)) > 0) && (
                                <div className="slider-hint-disabled">ไม่มีพื้นที่ปลูกข้าวในอำเภอนี้</div>
                            )}
                        </div>

                        {/* Simulation results grid */}
                        <div className="simulation-results-grid">
                            <div className="sim-result-card water-saved">
                                <div className="sim-card-icon">💧</div>
                                <div className="sim-card-value">
                                    {simulationResults.waterSaved.toLocaleString()}
                                </div>
                                <div className="sim-card-label">ประหยัดน้ำสะสม (ลบ.ม.)</div>
                            </div>
                            <div className="sim-result-card income-added">
                                <div className="sim-card-icon">💰</div>
                                <div className="sim-card-value">
                                    +{simulationResults.incomeAdded.toLocaleString()}
                                </div>
                                <div className="sim-card-label">รายได้เกษตรกรที่เพิ่ม (บาท)</div>
                            </div>
                            <div className="sim-result-card co2-reduced">
                                <div className="sim-card-icon">🍃</div>
                                <div className="sim-card-value">
                                    {simulationResults.co2Reduced.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                </div>
                                <div className="sim-card-label">ลดปล่อย CO2e (ตัน)</div>
                            </div>
                            <div className="sim-result-card hotspot-reduction">
                                <div className="sim-card-icon">🔥</div>
                                <div className="sim-card-value">
                                    -{simulationResults.hotspotReduction.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                                </div>
                                <div className="sim-card-label">ลดจุดความร้อนเกษตร</div>
                            </div>
                        </div>
                    </div>

                    <div className="panel-section">
                        <div className="panel-section-title">ศูนย์เรียนรู้และกลุ่ม</div>
                        <div className="panel-mini-stats">
                            <div className="panel-mini-stat">
                                <div className="panel-mini-stat-value">{(selectedData.lc || 0)}</div>
                                <div className="panel-mini-stat-label">ศพก.</div>
                            </div>
                            <div className="panel-mini-stat">
                                <div className="panel-mini-stat-value">{(selectedData.pc || 0)}</div>
                                <div className="panel-mini-stat-label">ศจช.</div>
                            </div>
                            <div className="panel-mini-stat">
                                <div className="panel-mini-stat-value">{(selectedData.sfc || 0)}</div>
                                <div className="panel-mini-stat-label">ศดปช.</div>
                            </div>
                        </div>
                    </div>

                    <div className="panel-section">
                        <div className="panel-section-title">กลุ่มสถาบันเกษตรกร</div>
                        <div className="panel-mini-stats">
                            <div className="panel-mini-stat">
                                <div className="panel-mini-stat-value">{(selectedData.instHousewives || 0)}</div>
                                <div className="panel-mini-stat-label">แม่บ้าน</div>
                            </div>
                            <div className="panel-mini-stat">
                                <div className="panel-mini-stat-value">{(selectedData.instYoung || 0)}</div>
                                <div className="panel-mini-stat-label">ยุวเกษตร</div>
                            </div>
                            <div className="panel-mini-stat">
                                <div className="panel-mini-stat-value">{(selectedData.instCareer || 0)}</div>
                                <div className="panel-mini-stat-label">อาชีพ</div>
                            </div>
                        </div>
                    </div>

                    <div className="panel-section">
                        <div className="panel-section-title">เกษตรกรปราดเปรื่อง (ราย)</div>
                        <div className="panel-mini-stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            <div className="panel-mini-stat">
                                <div className="panel-mini-stat-value">{(selectedData.sfSfCount || 0)}</div>
                                <div className="panel-mini-stat-label">Smart Farmer</div>
                            </div>
                            <div className="panel-mini-stat">
                                <div className="panel-mini-stat-value">{(selectedData.ysfCount || 0)}</div>
                                <div className="panel-mini-stat-label">Young Smart</div>
                            </div>
                        </div>
                    </div>

                    <div className="panel-section">
                        <div className="panel-section-title">ภัยพิบัติและจุดความร้อน</div>
                        <div className="panel-stats-grid">
                            <div className="panel-stat">
                                <div className="panel-stat-icon">⚠️</div>
                                <div className="panel-stat-value">{(selectedData.disasterArea || 0).toLocaleString()}</div>
                                <div className="panel-stat-label">พื้นที่ภัยพิบัติ (ไร่)</div>
                            </div>
                            <div className="panel-stat">
                                <div className="panel-stat-icon">🐛</div>
                                <div className="panel-stat-value">{(selectedData.pestArea || 0).toLocaleString()}</div>
                                <div className="panel-stat-label">ศัตรูพืชระบาด (ไร่)</div>
                            </div>
                            <div className="panel-stat" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px' }}>
                                <span style={{ fontSize: '20px' }}>🔥</span>
                                <div style={{ textAlign: 'left' }}>
                                    <div className="panel-stat-value">{(selectedData.fireCount || 0)}</div>
                                    <div className="panel-stat-label">จุดความร้อน PM2.5 สะสม</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ===== AI INSIGHTS SECTION ===== */}
                    <div className="panel-section ai-insights-section">
                        <div className="panel-section-title">🤖 คำแนะนำยุทธศาสตร์เชิงพื้นที่ (AI Insight)</div>
                        
                        {aiError && (
                            <div className="ai-error-banner">
                                <span className="ai-error-icon">⚠️</span>
                                <span className="ai-error-text">{aiError}</span>
                                <button className="ai-retry-btn" onClick={() => handleGenerateAIInsight(selectedDistrict.name)}>
                                    ลองใหม่
                                </button>
                            </div>
                        )}

                        {aiLoading && (
                            <div className="ai-loading-container">
                                <div className="ai-pulse-loader">
                                    <div className="ai-pulse-bar" />
                                    <div className="ai-pulse-bar" />
                                    <div className="ai-pulse-bar" />
                                </div>
                                <div className="ai-loading-text">Gemini กำลังวิเคราะห์ข้อมูลเชิงลึก...</div>
                            </div>
                        )}

                        {!aiLoading && !aiError && !aiInsights[selectedDistrict.name] && (
                            <button
                                className="ai-generate-btn"
                                onClick={() => handleGenerateAIInsight(selectedDistrict.name)}
                            >
                                <span className="ai-btn-sparkle">✨</span> วิเคราะห์ศักยภาพพื้นที่ด้วย AI
                            </button>
                        )}

                        {!aiLoading && !aiError && aiInsights[selectedDistrict.name] && (
                            <div className="ai-insight-card">
                                <div className="ai-insight-header">
                                    <span className="ai-insight-tag">🪄 Gemini Analyst</span>
                                    <button 
                                        className="ai-refresh-btn" 
                                        onClick={() => handleGenerateAIInsight(selectedDistrict.name)}
                                        title="วิเคราะห์ใหม่"
                                    >
                                        🔄
                                    </button>
                                </div>
                                <div className="ai-insight-content">
                                    {aiInsights[selectedDistrict.name]}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ===== KPI STATS BAR ===== */}
            <div className="smart-map-kpi-bar">
                <div className="kpi-card">
                    <span className="kpi-icon">🏠</span>
                    <span className="kpi-value"><AnimatedNumber value={totals.house} /></span>
                    <span className="kpi-label">ครัวเรือนเกษตรกร</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-icon">🌾</span>
                    <span className="kpi-value"><AnimatedNumber value={totals.area} /></span>
                    <span className="kpi-label">พื้นที่เกษตร (ไร่)</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-icon">🤝</span>
                    <span className="kpi-value"><AnimatedNumber value={totals.ce} /></span>
                    <span className="kpi-label">วิสาหกิจชุมชน</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-icon">🌱</span>
                    <span className="kpi-value"><AnimatedNumber value={totals.lp} /></span>
                    <span className="kpi-label">แปลงใหญ่</span>
                </div>
            </div>

            {/* ===== MAP ===== */}
            <div className="smart-map-container">
                <MapContainer
                    center={[13.82, 100.05]}
                    zoom={10}
                    zoomSnap={0.25}
                    zoomDelta={0.5}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                    zoomControl={false}
                >
                    <FitBounds />
                    <TileLayer
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                    <ZoomControl position="topright" />

                    {/* ===== CHOROPLETH GEOJSON ===== */}
                    {Object.keys(districtStats).length > 0 && (
                        <GeoJSON
                            key={`choropleth-${activeMetric}-${selectedDistrict ? selectedDistrict.name : 'none'}`}
                            data={geoJSONData}
                            style={(feature) => {
                                const distName = feature.properties?.amp_th;
                                const stats = districtStats[distName];
                                const value = stats ? (stats[activeMetric] || 0) : 0;
                                const fillColor = getDistrictColor(value);
                                const isSelected = selectedDistrict && selectedDistrict.name === distName;
                                return {
                                    fillColor,
                                    fillOpacity: isSelected ? 0.7 : 0.5,
                                    color: isSelected ? '#10b981' : 'rgba(15, 23, 42, 0.15)',
                                    weight: isSelected ? 3.5 : 2,
                                };
                            }}
                            onEachFeature={(feature, layer) => {
                                const distName = feature.properties?.amp_th;
                                const stats = districtStats[distName];
                                if (!distName || !stats) return;

                                // Tooltip
                                const html = `
                                    <div class="tooltip-name">🎯 อ.${distName}</div>
                                    <div class="tooltip-row"><span>🌾 พื้นที่เกษตร</span><strong>${(stats.area || 0).toLocaleString()} ไร่</strong></div>
                                    <div class="tooltip-row"><span>🏠 ครัวเรือน</span><strong>${(stats.house || 0).toLocaleString()} ราย</strong></div>
                                    <div class="tooltip-row"><span>🤝 วิสาหกิจ</span><strong>${(stats.ce || 0).toLocaleString()} แห่ง</strong></div>
                                    <div class="tooltip-row"><span>🌱 แปลงใหญ่</span><strong>${(stats.lp || 0).toLocaleString()} แปลง</strong></div>
                                    <div class="tooltip-hint">คลิกเพื่อดูรายละเอียด</div>
                                `;
                                layer.bindTooltip(html, {
                                    sticky: true,
                                    direction: 'auto',
                                    className: 'smart-map-tooltip',
                                });

                                // Hover effect
                                layer.on({
                                    mouseover: (e) => {
                                        const isSelected = selectedDistrict && selectedDistrict.name === distName;
                                        e.target.setStyle({
                                            fillOpacity: 0.7,
                                            weight: isSelected ? 3.5 : 3,
                                            color: isSelected ? '#10b981' : 'rgba(15, 23, 42, 0.3)'
                                        });
                                    },
                                    mouseout: (e) => {
                                        const isSelected = selectedDistrict && selectedDistrict.name === distName;
                                        e.target.setStyle({
                                            fillOpacity: isSelected ? 0.7 : 0.5,
                                            weight: isSelected ? 3.5 : 2,
                                            color: isSelected ? '#10b981' : 'rgba(15, 23, 42, 0.15)'
                                        });
                                    },
                                    click: () => {
                                        setPanelClosing(false);
                                        setSelectedDistrict({
                                            name: distName,
                                            areaSqkm: feature.properties?.area_sqkm || 0,
                                        });
                                    },
                                });
                            }}
                        />
                    )}

                    {/* ===== DISTRICT LABELS ===== */}
                    {L && Object.entries(DISTRICT_CENTROIDS).map(([name, coords]) => {
                        const isSelected = selectedDistrict && selectedDistrict.name === name;
                        return (
                            <Marker
                                key={`label-${name}`}
                                position={coords}
                                interactive={false}
                                icon={L.divIcon({
                                    className: 'district-map-label-container',
                                    html: `<div class="district-map-label ${isSelected ? 'selected' : ''}">${name}</div>`,
                                    iconSize: [0, 0],
                                })}
                            />
                        );
                    })}

                    {/* ===== GIS MARKERS ===== */}
                    {visibleLayers.gis && gisMarkers.map((item, idx) => (
                        <CircleMarker
                            key={`gis-${idx}`}
                            center={[item.lat, item.lon]}
                            radius={7}
                            fillColor="#3b82f6"
                            fillOpacity={0.9}
                            color="rgba(255,255,255,0.6)"
                            weight={1.5}
                            className="pulse-marker-gis"
                        >
                            <Popup>
                                <div style={{ fontFamily: 'Kanit, sans-serif', minWidth: 140 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: '#1e293b' }}>
                                        {item.name}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#64748b' }}>
                                        <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                                            {item.typeLabel}
                                        </span>
                                        {' '}อ.{item.district}
                                    </div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    ))}

                    {/* ===== TOURISM MARKERS ===== */}
                    {visibleLayers.tourism && tourMarkers.map((item, idx) => (
                        <CircleMarker
                            key={`tour-${idx}`}
                            center={[item.lat, item.lon]}
                            radius={7}
                            fillColor="#22c55e"
                            fillOpacity={0.9}
                            color="rgba(255,255,255,0.6)"
                            weight={1.5}
                            className="pulse-marker-tour"
                        >
                            <Popup>
                                <div style={{ fontFamily: 'Kanit, sans-serif', minWidth: 140 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: '#1e293b' }}>
                                        {item.name}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#64748b' }}>
                                        <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                                            {item.typeLabel}
                                        </span>
                                        {' '}อ.{item.district}
                                    </div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}
