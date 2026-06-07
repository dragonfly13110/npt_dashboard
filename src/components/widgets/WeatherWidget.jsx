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
  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=13.82&longitude=100.06&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FBangkok';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  const data = await res.json();
  return { current: data.current, daily: data.daily };
}

export default function WeatherWidget({ mini }) {
  const { data, isLoading } = useApiCache(
    'weather-nakhonpathom',
    fetchWeatherData,
    { staleMinutes: 30, cacheMinutes: 120 }
  );

  if (mini) {
    if (isLoading) {
      return (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #eaeaea',
            padding: '16px',
            borderRadius: 4,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            color: '#666666',
          }}
        >
          กำลังโหลดสภาพอากาศ...
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

    const forecastDays = [];
    if (daily && daily.time) {
      for (let i = 1; i <= 3; i++) {
        if (daily.time[i]) {
          const dateObj = new Date(daily.time[i]);
          const dayName = dateObj.toLocaleDateString('th-TH', {
            weekday: 'short',
          });
          const wmo = getWeatherDetails(daily.weather_code[i]);
          forecastDays.push({
            dayName,
            desc: wmo.desc,
            icon: wmo.icon,
            max: Math.round(daily.temperature_2m_max[i]),
            min: Math.round(daily.temperature_2m_min[i]),
          });
        }
      }
    }

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '18px 20px',
          background: '#ffffff',
          border: '1px solid #eaeaea',
          borderRadius: 4,
          height: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
            paddingBottom: 10,
            marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>{currentWmo.icon}</span>
            <div>
              <strong style={{ fontSize: 14, color: '#111111' }}>
                นครปฐม: {currentWmo.desc}
              </strong>
              <div style={{ fontSize: 11, color: '#888888' }}>
                อัปเดต {updatedAt} น.
              </div>
            </div>
          </div>
          <strong style={{ fontSize: 22, fontWeight: 700, color: '#111111' }}>
            {Math.round(weather.temperature_2m)}°C
          </strong>
        </div>

        {forecastDays.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              margin: '8px 0 12px 0',
              borderTop: '1px dashed #f0f0f0',
              borderBottom: '1px dashed #f0f0f0',
              padding: '10px 0',
            }}
          >
            {forecastDays.map((day, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                }}
              >
                <span style={{ color: '#666666', width: 45, fontWeight: 500 }}>
                  {day.dayName}
                </span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flex: 1,
                    marginLeft: 8,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{day.icon}</span>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#888888',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {day.desc}
                  </span>
                </span>
                <span
                  style={{ fontWeight: 600, color: '#111111', fontSize: 12 }}
                >
                  {day.max}°{' '}
                  <span
                    style={{
                      fontWeight: 'normal',
                      color: '#888888',
                      fontSize: 11,
                    }}
                  >
                    / {day.min}°
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginTop: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: '#fafafa',
              border: '1px solid #eaeaea',
              borderRadius: 4,
              padding: '8px 10px',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 11, color: '#666666' }}>รู้สึกเหมือน</span>
            <strong style={{ fontSize: 13, color: '#111111', marginTop: 2 }}>
              {Math.round(weather.apparent_temperature)}°C
            </strong>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: '#fafafa',
              border: '1px solid #eaeaea',
              borderRadius: 4,
              padding: '8px 10px',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 11, color: '#666666' }}>ความชื้น</span>
            <strong style={{ fontSize: 13, color: '#111111', marginTop: 2 }}>
              {weather.relative_humidity_2m}%
            </strong>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: '#fafafa',
              border: '1px solid #eaeaea',
              borderRadius: 4,
              padding: '8px 10px',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 11, color: '#666666' }}>แรงลม</span>
            <strong style={{ fontSize: 13, color: '#111111', marginTop: 2 }}>
              {weather.wind_speed_10m}{' '}
              <small
                style={{ fontSize: 9, fontWeight: 'normal', color: '#666666' }}
              >
                km/h
              </small>
            </strong>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="weather-ios-card weather-ios-loading"
        aria-label="กำลังโหลดสภาพอากาศ"
      >
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
    <section
      className="weather-ios-card slide-up-anim"
      aria-label="สภาพอากาศนครปฐม"
    >
      <div className="weather-ios-glow" />

      <div className="weather-ios-head">
        <div>
          <span className="weather-ios-eyebrow">นครปฐม</span>
          <h3>สภาพอากาศวันนี้</h3>
          <p>
            {currentWmo.desc} · อัปเดต {updatedAt} น.
          </p>
        </div>
        <div className="weather-ios-icon" title={currentWmo.desc}>
          {currentWmo.icon}
        </div>
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
          <strong>
            {weather.wind_speed_10m} <small>km/h</small>
          </strong>
        </div>
        <div>
          <span>พยากรณ์</span>
          <strong>{daily?.time?.length ? '5 วัน' : '-'}</strong>
        </div>
      </div>

      {daily && (
        <div className="weather-ios-forecast" aria-label="พยากรณ์อากาศ 5 วัน">
          {[1, 2, 3, 4, 5].map((i) => {
            const dateObj = new Date(daily.time[i]);
            const dayName = dateObj.toLocaleDateString('th-TH', {
              weekday: 'short',
            });
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
