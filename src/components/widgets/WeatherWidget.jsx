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
        96: { desc: 'ฝนฟ้าคะนองลูกเห็บเล็กน้อย', icon: '⛈️' },
        99: { desc: 'ฝนฟ้าคะนองลูกเห็บหนัก', icon: '⛈️' },
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

    if (isLoading) {
        return (
            <div className="weather-ios-card weather-ios-loading" aria-label="กำลังโหลดสภาพอากาศ">
                <div className="weather-ios-skeleton weather-ios-skeleton-main" />
                <div className="weather-ios-skeleton weather-ios-skeleton-strip" />
                <div className="weather-ios-skeleton weather-ios-skeleton-forecast" />
            </div>
        );
    }

    if (!data?.current) return null;

    const weather = data.current;
    const daily = data.daily;
    const currentWmo = getWeatherDetails(weather.weather_code);
    const updatedAt = new Date(weather.time).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <section className="weather-ios-card slide-up-anim" aria-label="สภาพอากาศนครปฐม">
            <div className="weather-ios-glow" />

            <div className="weather-ios-head">
                <div>
                    <span className="weather-ios-eyebrow">นครปฐม</span>
                    <h3>สภาพอากาศวันนี้</h3>
                    <p>{currentWmo.desc} · อัปเดต {updatedAt} น.</p>
                </div>
                <div className="weather-ios-icon" title={currentWmo.desc}>{currentWmo.icon}</div>
            </div>

            <div className="weather-ios-temp-row">
                <div className="weather-ios-temp">
                    {Math.round(weather.temperature_2m)}
                    <span>°C</span>
                </div>
                <div className="weather-ios-note">
                    <span>รู้สึกเหมือน</span>
                    <strong>{Math.round(weather.apparent_temperature)}°C</strong>
                </div>
            </div>

            <div className="weather-ios-metrics">
                <div>
                    <span>ความชื้น</span>
                    <strong>{weather.relative_humidity_2m}%</strong>
                </div>
                <div>
                    <span>แรงลม</span>
                    <strong>{weather.wind_speed_10m} <small>km/h</small></strong>
                </div>
                <div>
                    <span>พยากรณ์</span>
                    <strong>{daily?.time?.length ? '5 วัน' : '-'}</strong>
                </div>
            </div>

            {daily && (
                <div className="weather-ios-forecast" aria-label="พยากรณ์อากาศ 5 วัน">
                    {[1, 2, 3, 4, 5].map(i => {
                        const dateObj = new Date(daily.time[i]);
                        const dayName = dateObj.toLocaleDateString('th-TH', { weekday: 'short' });
                        const wmo = getWeatherDetails(daily.weather_code[i]);
                        return (
                            <div className="weather-ios-day" key={daily.time[i]}>
                                <span>{dayName}</span>
                                <b title={wmo.desc}>{wmo.icon}</b>
                                <strong>{Math.round(daily.temperature_2m_max[i])}°</strong>
                                <small>{Math.round(daily.temperature_2m_min[i])}°</small>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
