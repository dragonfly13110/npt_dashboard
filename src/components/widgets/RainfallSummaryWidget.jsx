import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';

export default function RainfallSummaryWidget() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLatestWeather() {
            try {
                setLoading(true);
                const { data: rows } = await supabase
                    .from('daily_weather')
                    .select('date, tavg, tmin, tmax, prcp, wspd, pres')
                    .order('date', { ascending: false })
                    .limit(7);
                if (rows && rows.length > 0) setData(rows);
            } catch (err) {
                console.error("Error fetching daily_weather:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchLatestWeather();
    }, []);

    const stats = useMemo(() => {
        if (!data || data.length === 0) return null;
        const totalRain = data.reduce((s, d) => s + (d.prcp || 0), 0);
        const avgWind = data.reduce((s, d) => s + (d.wspd || 0), 0) / data.length;
        const maxRain = Math.max(...data.map(d => d.prcp || 0));
        const rainyDays = data.filter(d => d.prcp > 0).length;
        const avgTemp = data.reduce((s, d) => s + (d.tavg || 0), 0) / data.length;
        const maxTemp = Math.max(...data.map(d => d.tmax || 0));
        const minTemp = Math.min(...data.filter(d => d.tmin != null).map(d => d.tmin));
        const avgPres = data.filter(d => d.pres).reduce((s, d) => s + d.pres, 0) / (data.filter(d => d.pres).length || 1);
        const latest = data[0];
        return { totalRain, avgWind, maxRain, rainyDays, avgTemp, maxTemp, minTemp, avgPres, latest };
    }, [data]);

    if (loading) {
        return (
            <div className="skeleton-pulse" style={{ height: '72px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="w-loader">กำลังโหลดข้อมูลอุตุนิยมวิทยา...</div>
            </div>
        );
    }

    if (!data || !stats) return null;

    const getRainLevel = (mm) => {
        if (mm > 35) return { text: 'ฝนหนัก', color: '#dc2626' };
        if (mm > 10) return { text: 'ปานกลาง', color: '#f59e0b' };
        if (mm > 0) return { text: 'ฝนเล็กน้อย', color: '#0ea5e9' };
        return { text: 'ไม่มีฝน', color: '#94a3b8' };
    };

    const latestRain = getRainLevel(stats.latest?.prcp || 0);

    return (
        <div className="rainfall-strip slide-up-anim">
            {/* Left: Title + Source + Latest status */}
            <div className="rs-left">
                <div className="rs-title-row">
                    <span className="rs-icon">🌦️</span>
                    <div className="rs-title-text">
                        <h4>สรุปอุตุนิยมวิทยา 7 วัน <span className="rs-badge" style={{ background: latestRain.color }}>{latestRain.text}</span></h4>
                        <span className="rs-source">
                            📍 อ.เมืองนครปฐม • อัปเดต {new Date(stats.latest.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} •
                            <a href="https://meteostat.net" target="_blank" rel="noopener noreferrer" className="rs-source-link"> Meteostat API</a>
                        </span>
                    </div>
                </div>
            </div>

            {/* Center: Key stats */}
            <div className="rs-stats">
                <div className="rs-stat">
                    <span className="rs-stat-icon">🌧️</span>
                    <div className="rs-stat-data">
                        <span className="rs-val" style={{ color: stats.totalRain > 0 ? '#0ea5e9' : '#cbd5e1' }}>{stats.totalRain.toFixed(1)}<small>mm</small></span>
                        <span className="rs-label">ฝนรวม</span>
                    </div>
                </div>

                <div className="rs-stat">
                    <span className="rs-stat-icon">⛈️</span>
                    <div className="rs-stat-data">
                        <span className="rs-val" style={{ color: stats.maxRain > 0 ? '#0284c7' : '#cbd5e1' }}>{stats.maxRain.toFixed(1)}<small>mm</small></span>
                        <span className="rs-label">ฝนสูงสุด</span>
                    </div>
                </div>

                <div className="rs-stat">
                    <span className="rs-stat-icon">💨</span>
                    <div className="rs-stat-data">
                        <span className="rs-val">{stats.avgWind.toFixed(1)}<small>km/h</small></span>
                        <span className="rs-label">ลมเฉลี่ย</span>
                    </div>
                </div>

                <div className="rs-stat">
                    <span className="rs-stat-icon">🌡️</span>
                    <div className="rs-stat-data">
                        <span className="rs-val">{Math.round(stats.minTemp)}°–{Math.round(stats.maxTemp)}°<small>C</small></span>
                        <span className="rs-label">อุณหภูมิ</span>
                    </div>
                </div>

                <div className="rs-stat">
                    <span className="rs-stat-icon">📊</span>
                    <div className="rs-stat-data">
                        <span className="rs-val">{stats.avgPres > 0 ? stats.avgPres.toFixed(0) : '-'}<small>hPa</small></span>
                        <span className="rs-label">ความกดอากาศ</span>
                    </div>
                </div>
            </div>

            {/* Right: Mini 7-day */}
            <div className="rs-days">
                {data.slice().reverse().map((day) => {
                    const hasRain = day.prcp > 0;
                    return (
                        <div key={day.date} className="rs-day" title={`${day.date}\nฝน: ${day.prcp || 0} mm\nลม: ${day.wspd || 0} km/h\nอุณหภูมิ: ${day.tmin}°-${day.tmax}°C`}>
                            <span className="rs-day-name">{new Date(day.date).toLocaleDateString('th-TH', { weekday: 'short' })}</span>
                            <span className="rs-day-icon">{hasRain ? '🌧' : '☀️'}</span>
                            <span className="rs-day-rain" style={{ color: hasRain ? '#0ea5e9' : '#cbd5e1' }}>{day.prcp || 0}</span>
                            <span className="rs-day-wind">{day.wspd || 0}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
