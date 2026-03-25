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
        <div className="widget-box weather-widget-detailed slide-up-anim">
            <div className="weather-main">
                <div className="weather-main-icon" title={currentWmo.desc}>{currentWmo.icon}</div>
                <div className="weather-main-temp">
                    <h2>{Math.round(weather.temperature_2m)}°C</h2>
                    <p>{currentWmo.desc}</p>
                </div>
            </div>
            
            <div className="weather-stats-grid">
                <div className="w-stat">
                    <span className="w-label">รู้สึกเหมือน</span>
                    <span className="w-val">{Math.round(weather.apparent_temperature)}°C</span>
                </div>
                <div className="w-stat">
                    <span className="w-label">ความชื้น</span>
                    <span className="w-val">{weather.relative_humidity_2m}%</span>
                </div>
                <div className="w-stat">
                    <span className="w-label">แรงลม</span>
                    <span className="w-val">{weather.wind_speed_10m} <small style={{fontSize: 10, color: '#64748b'}}>km/h</small></span>
                </div>
            </div>

            <div className="weather-forecast">
                <h4>พยากรณ์ 5 วันล่วงหน้า (นครปฐม)</h4>
                {daily && [1, 2, 3, 4, 5].map(i => {
                    const dateObj = new Date(daily.time[i]);
                    const dayName = dateObj.toLocaleDateString('th-TH', { weekday: 'short' });
                    const dateNum = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                    const wmo = getWeatherDetails(daily.weather_code[i]);
                    return (
                        <div key={i} className="forecast-item">
                            <div className="f-day">{dayName} <small>{dateNum}</small></div>
                            <div className="f-icon" title={wmo.desc}>{wmo.icon}</div>
                            <div className="f-temp" title="อุณหภูมิสูงสุด/ต่ำสุด">
                                <span className="max-t">{Math.round(daily.temperature_2m_max[i])}°</span>
                                <span className="min-t">{Math.round(daily.temperature_2m_min[i])}°</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
