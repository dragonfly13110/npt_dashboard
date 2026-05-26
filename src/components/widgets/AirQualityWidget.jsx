import { useState, useEffect } from 'react';
import { useApiCache } from '../../hooks/useApiCache';

function getAqiInfo(pm25) {
    if (pm25 <= 15) return { level: 'ดีมาก', color: '#10b981', bg: '#d1fae5', desc: 'คุณภาพอากาศดีมาก เหมาะสำหรับการทำกิจกรรมหรือเพาะปลูกในที่โล่ง', alert: '💚' };
    if (pm25 <= 35) return { level: 'ปานกลาง', color: '#f59e0b', bg: '#fef3c7', desc: 'คุณภาพอากาศปานกลาง ประชาชนสามารถทำงานกลางแจ้งได้ตามปกติ', alert: '💛' };
    if (pm25 <= 55) return { level: 'เริ่มมีผลกระทบ', color: '#f97316', bg: '#ffedd5', desc: 'เกษตรกรหรือผู้ที่มีความอ่อนไหวควรดูแลตัวเอง สวมหน้ากากถ้าจำเป็น', alert: '🧡' };
    if (pm25 <= 150) return { level: 'มีผลกระทบ', color: '#ef4444', bg: '#fee2e2', desc: 'ควรสวมหน้ากากอนามัย N95 และงดการเผาเศษวัสดุทางการเกษตรเด็ดขาด', alert: '❤️' };
    return { level: 'อันตราย', color: '#8b5cf6', bg: '#ede9fe', desc: 'งดกิจกรรมกลางแจ้งเด็ดขาด! สภาพอากาศอันตรายต่อสุขภาพมาก', alert: '💜' };
}

async function fetchAqiForLocation(lat, lon) {
    // 1. Get Location Name
    let locName = 'นครปฐม';
    try {
        const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=th`);
        const geoJson = await geoRes.json();
        if (geoJson.principalSubdivision) {
            locName = geoJson.principalSubdivision.replace('จังหวัด', '').replace('Province', '').trim();
        } else if (geoJson.city) {
            locName = geoJson.city.replace('จังหวัด', '').trim();
        }
    } catch (e) {
        console.error("Geo API fail", e);
    }

    // 2. Fetch AQI
    const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm2_5,pm10&hourly=pm2_5&timezone=Asia%2FBangkok`);
    if (!res.ok) throw new Error(`AQI API error: ${res.status}`);
    const json = await res.json();
    
    if (!json.current) throw new Error('No AQI current data');
    
    const ct = json.current.time;
    const dateObj = new Date(ct);
    const timeLabel = dateObj.toLocaleDateString('th-TH', { 
        day: 'numeric', month: 'short', year: '2-digit' 
    }) + ' | ' + dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

    let forecast = [];
    if (json.hourly && json.hourly.time) {
        const currentIndex = json.hourly.time.indexOf(ct);
        if (currentIndex !== -1) {
            for (let i = 1; i <= 4; i++) {
                const fIndex = currentIndex + i;
                if (fIndex < json.hourly.time.length) {
                    const fTime = new Date(json.hourly.time[fIndex]);
                    const fPm = json.hourly.pm2_5[fIndex];
                    forecast.push({
                        time: fTime.getHours() + ':00',
                        pm25: fPm,
                        info: getAqiInfo(fPm)
                    });
                }
            }
        }
    }

    return {
        pm25: json.current.pm2_5,
        pm10: json.current.pm10,
        aqi: json.current.european_aqi,
        timeLabel,
        forecast,
        locationName: locName
    };
}

function getGeolocation() {
    return new Promise((resolve) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
                () => resolve({ lat: 13.82, lon: 100.06 }), // fallback
                { timeout: 6000 }
            );
        } else {
            resolve({ lat: 13.82, lon: 100.06 });
        }
    });
}

export default function AirQualityWidget() {
    const [coords, setCoords] = useState(null);

    useEffect(() => {
        getGeolocation().then(setCoords);
    }, []);

    const { data: aqiData, isLoading } = useApiCache(
        ['aqi', coords?.lat, coords?.lon],
        () => fetchAqiForLocation(coords.lat, coords.lon),
        { 
            staleMinutes: 15, 
            cacheMinutes: 60,
            enabled: !!coords 
        }
    );

    if (isLoading || !coords) return <div className="widget-box skeleton-pulse"><div className="w-loader">กำลังตรวจสอบพิกัดและคุณภาพอากาศ...</div></div>;
    
    // Fallback data if fetch failed
    const displayData = aqiData || {
        pm25: 45, pm10: 60, aqi: 80,
        timeLabel: 'วันนี้ | 12:00 น.',
        locationName: 'ข้อมูลจำลอง',
        forecast: [
            { time: '13:00', pm25: 46, info: getAqiInfo(46) },
            { time: '14:00', pm25: 50, info: getAqiInfo(50) },
            { time: '15:00', pm25: 55, info: getAqiInfo(55) },
            { time: '16:00', pm25: 60, info: getAqiInfo(60) }
        ]
    };

    const info = getAqiInfo(displayData.pm25);
    const percentage = Math.min((displayData.pm25 / 150) * 100, 100);
    const circleRadius = 36;
    const circumference = 2 * Math.PI * circleRadius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="widget-box aqi-widget slide-up-anim" style={{ animationDelay: '0.2s', display: 'flex', flexDirection: 'column', gap: '12px', padding: '18px 20px' }}>
            <div className="widget-header" style={{ marginBottom: 0, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="widget-icon" style={{ background: info.bg, color: info.color }}>{info.alert}</div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ margin: 0, fontSize: '15px' }}>คุณภาพอากาศ (PM 2.5)</h4>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                            📍 จ.{displayData.locationName} &bull; อัปเดต: {displayData.timeLabel}
                        </span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0 }}>
                    <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="45" cy="45" r={circleRadius} fill="none" stroke="#f1f5f9" strokeWidth="12" />
                        <circle cx="45" cy="45" r={circleRadius} fill="none" stroke={info.color} strokeWidth="12" 
                            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" 
                            style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }} />
                    </svg>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '20px', fontWeight: '900', color: info.color, lineHeight: '1' }}>{Math.round(displayData.pm25)}</span>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>µg/m³</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: info.color, marginBottom: '2px' }}>{info.level}</span>
                    <span style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>{info.desc}</span>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px', padding: '6px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>PM 10</span>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#334155' }}>{Math.round(displayData.pm10)} <small style={{fontSize: '9px', fontWeight: 'normal'}}>µg/m³</small></span>
                        </div>
                        <div style={{ borderLeft: '1px solid #e2e8f0', margin: '0 4px' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>EU AQI</span>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#334155' }}>{Math.round(displayData.aqi)} <small style={{fontSize: '9px', fontWeight: 'normal'}}>Index</small></span>
                        </div>
                    </div>
                </div>
            </div>

            {displayData.forecast && displayData.forecast.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', borderTop: '1px dashed #e2e8f0', paddingTop: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                        ล่วงหน้า<br/>4 ชม.
                    </div>
                    {displayData.forecast.map((f, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{f.time}</span>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: f.info.color }}></div>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{Math.round(f.pm25)}</span>
                        </div>
                    ))}
                </div>
            )}

            {displayData.pm25 > 35 && (
                <div style={{ fontSize: '11px', background: '#fee2e2', color: '#b91c1c', padding: '8px 12px', borderRadius: '8px', fontWeight: '700', border: '1px dashed #fca5a5', marginTop: '2px' }}>
                    🚨 แจ้งเตือน: ควรงดการเผาเศษวัสดุทางการเกษตรอย่างเด็ดขาด
                </div>
            )}
        </div>
    );
}
