import { useApiCache } from '../../hooks/useApiCache';

function getWeatherDetails(code) {
    const wmo = {
        0: { desc: 'ท้องฟ้าแจ่มใส', icon: '☀️' },
        1: { desc: 'ส่วนใหญ่แจ่มใส', icon: '🌤️' },
        2: { desc: 'มีเมฆบางส่วน', icon: '⛅' },
        3: { desc: 'มีเมฆมาก', icon: '☁️' },
        45: { desc: 'มีหมอก', icon: '🌫️' },
        48: { desc: 'หมอกลงจัด', icon: '🌫️' },
        51: { desc: 'ฝนปรอยบางเบา', icon: '🌦️' },
        53: { desc: 'ฝนปรอยปานกลาง', icon: '🌦️' },
        55: { desc: 'ฝนปรอยหนัก', icon: '🌧️' },
        61: { desc: 'ฝนตกเล็กน้อย', icon: '🌦️' },
        63: { desc: 'ฝนตกปานกลาง', icon: '🌧️' },
        65: { desc: 'ฝนตกหนัก', icon: '🌧️' },
        80: { desc: 'ฝนตกซู่เล็กน้อย', icon: '🌦️' },
        81: { desc: 'ฝนตกซู่ปานกลาง', icon: '🌧️' },
        82: { desc: 'ฝนตกซู่หนัก', icon: '🌧️' },
        95: { desc: 'ฝนฟ้าคะนอง', icon: '⛈️' },
        96: { desc: 'ฝนฟ้าคะนองลูกเห็บตกเล็กน้อย', icon: '⛈️' },
        99: { desc: 'ฝนฟ้าคะนองลูกเห็บตกหนัก', icon: '⛈️' }
    };
    return wmo[code] || { desc: 'ไม่ทราบสภาพอากาศ', icon: '❓' };
}

async function fetchWeatherData() {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=13.82&longitude=100.06&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FBangkok';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
    const data = await res.json();
    return { current: data.current, daily: data.daily };
}

export default function WeatherWidget() {
    const { data, isLoading } = useApiCache(
        'weather-nakhonpathom',
        fetchWeatherData,
        { staleMinutes: 30, cacheMinutes: 120 }
    );

    if (isLoading) return <div className="widget-box skeleton-pulse"><div className="w-loader">กำลังโหลดสภาพอากาศแบบละเอียด...</div></div>;
    if (!data?.current) return null;

    const weather = data.current;
    const daily = data.daily;
    const currentWmo = getWeatherDetails(weather.weather_code);

    return (
        <div className="widget-box slide-up-anim" style={{ 
            animationDelay: '0.1s', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px', 
            padding: '16px', 
            background: 'linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%)',
            borderRadius: '16px',
            border: '1px solid #e0f2fe'
        }}>
            {/* Top row: Icon + Temp + Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '12px', borderBottom: '1px dashed #e2e8f0' }}>
                <div style={{ fontSize: '48px', lineHeight: 1, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>{currentWmo.icon}</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', lineHeight: 1, letterSpacing: '-1px' }}>{Math.round(weather.temperature_2m)}°C</span>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#0284c7' }}>{currentWmo.desc}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>
                        📍 จ.นครปฐม &bull; อัปเดต {new Date(weather.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                    </span>
                </div>
            </div>

            {/* Middle row: Stats Layout Horizontal Compact */}
            <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '800' }}>รู้สึกเหมือน</span>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b' }}>{Math.round(weather.apparent_temperature)}°C</span>
                </div>
                <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '800' }}>ความชื้น</span>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b' }}>{weather.relative_humidity_2m}%</span>
                </div>
                <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '800' }}>แรงลม</span>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b' }}>{weather.wind_speed_10m} <small style={{fontSize: 9, fontWeight: 700}}>km/h</small></span>
                </div>
            </div>

            {/* Bottom row: Horizontal Forecast */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', paddingLeft: '8px', paddingRight: '8px' }}>
                {daily && [1, 2, 3, 4, 5].map(i => {
                    const dateObj = new Date(daily.time[i]);
                    const dayName = dateObj.toLocaleDateString('th-TH', { weekday: 'short' });
                    const wmo = getWeatherDetails(daily.weather_code[i]);
                    return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{dayName}</span>
                            <div style={{ fontSize: '20px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} title={wmo.desc}>{wmo.icon}</div>
                            <div style={{ display: 'flex', gap: '6px', fontSize: '11px', fontWeight: '800', marginTop: '2px' }}>
                                <span style={{ color: '#0f172a' }}>{Math.round(daily.temperature_2m_max[i])}°</span>
                                <span style={{ color: '#94a3b8' }}>{Math.round(daily.temperature_2m_min[i])}°</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
