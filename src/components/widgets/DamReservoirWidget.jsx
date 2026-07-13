import { useState } from 'react';
import { useApiCache } from '../../hooks/useApiCache';
import { UpOutlined, DownOutlined } from '@ant-design/icons';

// เขื่อนที่ส่งน้ำให้นครปฐมโดยตรง (ลุ่มน้ำแม่กลอง → ท่าจีน)
const NPT_DAMS = [
  { id: '200401', reason: 'ต้นทุนน้ำหลัก ลุ่มแม่กลอง (แควใหญ่)' },
  { id: '200402', reason: 'ต้นทุนน้ำหลัก ลุ่มแม่กลอง (แควน้อย)' },
  { id: '100303', reason: 'แหล่งน้ำเสริม ลุ่มท่าจีนตอนบน' },
  { id: '200603', reason: 'ระบบชลประทานภาคกลาง' },
];

function getStorageInfo(pct) {
  if (pct >= 80)
    return {
      level: 'สูง',
      color: '#3b82f6',
      bg: '#dbeafe',
      emoji: '🔵',
      tip: 'น้ำเพียงพอ เหมาะสำหรับการเพาะปลูกทุกชนิด',
    };
  if (pct >= 50)
    return {
      level: 'ปานกลาง',
      color: '#10b981',
      bg: '#d1fae5',
      emoji: '🟢',
      tip: 'น้ำพอเพียง วางแผนการใช้น้ำอย่างเหมาะสม',
    };
  if (pct >= 30)
    return {
      level: 'น้อย',
      color: '#f59e0b',
      bg: '#fef3c7',
      emoji: '🟡',
      tip: 'น้ำเริ่มน้อย ควรประหยัดน้ำและเลือกพืชที่ใช้น้ำน้อย',
    };
  return {
    level: 'วิกฤต',
    color: '#ef4444',
    bg: '#fee2e2',
    emoji: '🔴',
    tip: 'น้ำน้อยมาก! งดทำนาปรัง หันมาปลูกพืชใช้น้ำน้อย',
  };
}

async function fetchDamData() {
  const res = await fetch('https://app.rid.go.th/reservoir/api/dam/public');
  if (!res.ok) throw new Error(`RID API error: ${res.status}`);
  const json = await res.json();

  const allDams = json.data.flatMap((region) =>
    region.dam.map((d) => ({ ...d, region: region.region }))
  );

  // เลือกเฉพาะเขื่อนที่เกี่ยวข้องกับนครปฐม
  const nptDams = NPT_DAMS.map((cfg) => {
    const dam = allDams.find((d) => d.id === cfg.id);
    if (!dam) return null;
    return { ...dam, reason: cfg.reason };
  }).filter(Boolean);

  // รวมน้ำเฉพาะ 2 เขื่อนหลัก (ศรีนครินทร์ + วชิราลงกรณ)
  const mainTwo = nptDams.filter((d) => d.id === '200401' || d.id === '200402');
  const combinedCap = mainTwo.reduce((s, d) => s + (d.capacity || 0), 0);
  const combinedVol = mainTwo.reduce((s, d) => s + (d.volume || 0), 0);
  const combinedPct = combinedCap > 0 ? (combinedVol / combinedCap) * 100 : 0;

  return {
    date: json.date,
    combinedCapacity: combinedCap,
    combinedVolume: combinedVol,
    combinedPercent: combinedPct,
    dams: nptDams,
  };
}

export default function DamReservoirWidget({
  defaultExpanded = false,
  summary = false,
  onOpen,
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { data, isLoading } = useApiCache('dam-reservoir-npt', fetchDamData, {
    staleMinutes: 60,
    cacheMinutes: 360,
  });

  if (summary) {
    return (
      <button
        className="live-kpi-card live-kpi-card--water"
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
      >
        <span className="live-kpi-icon">💧</span>
        <span className="live-kpi-copy">
          <small>สถานการณ์น้ำ</small>
          <strong>{data ? `${data.combinedPercent.toFixed(0)}%` : '—'}</strong>
          <span>
            {data
              ? `${data.combinedVolume.toLocaleString()} ล้าน ม³`
              : 'กำลังอัปเดตข้อมูล'}
          </span>
        </span>
        <span className="live-kpi-open">ดูรายละเอียด →</span>
      </button>
    );
  }

  if (isLoading)
    return (
      <div className="widget-box skeleton-pulse">
        <div className="w-loader">กำลังโหลดข้อมูลเขื่อน...</div>
      </div>
    );
  if (!data) return null;

  const overallInfo = getStorageInfo(data.combinedPercent);

  return (
    <div
      className="widget-box slide-up-anim"
      style={{
        animationDelay: '0.4s',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 20,
        background: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)',
        borderRadius: 16,
        border: '1px solid #dbeafe',
      }}
    >
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          paddingBottom: isExpanded ? 10 : 0,
          borderBottom: isExpanded ? '1px dashed #e2e8f0' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              fontSize: 36,
              lineHeight: 1,
              filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.1))',
            }}
          >
            💧
          </div>
          <div>
            <h4
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 800,
                color: '#0f172a',
              }}
            >
              สถานการณ์น้ำ — ผลกระทบต่อ จ.นครปฐม
            </h4>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
              กรมชลประทาน &bull; ข้อมูลวันที่ {data.date}
            </span>
          </div>
        </div>
        <span
          style={{
            fontSize: '12px',
            color: '#64748b',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            paddingRight: '4px',
          }}
        >
          <small
            style={{ fontSize: '10px', fontWeight: 'normal', color: '#94a3b8' }}
          >
            ({isExpanded ? 'คลิกเพื่อซ่อน' : 'คลิกเพื่อขยาย'})
          </small>
          {isExpanded ? <UpOutlined /> : <DownOutlined />}
        </span>
      </div>

      {/* ข้อมูลรวม 2 เขื่อนหลัก */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: overallInfo.bg,
          padding: '12px 16px',
          borderRadius: 12,
          border: `1px solid ${overallInfo.color}25`,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
            แหล่งน้ำต้นทุนหลัก (ศรีนครินทร์ + วชิราลงกรณ)
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 6,
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 22, fontWeight: 900, color: '#0f172a' }}>
              {data.combinedVolume.toLocaleString()}
            </span>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              / {data.combinedCapacity.toLocaleString()} ล้าน ม³
            </span>
          </div>
        </div>
        <GaugeCircle percent={data.combinedPercent} color={overallInfo.color} />
      </div>

      {isExpanded && (
        <>
          {/* Dam List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.dams.map((dam) => {
              const info = getStorageInfo(dam.percent_storage);
              return (
                <div
                  key={dam.id}
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: '10px 14px',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#1e293b',
                      }}
                    >
                      {dam.name}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: info.color,
                        background: info.bg,
                        padding: '2px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {dam.percent_storage?.toFixed(1)}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div
                    style={{
                      height: 6,
                      background: '#f1f5f9',
                      borderRadius: 99,
                      overflow: 'hidden',
                      marginBottom: 5,
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(dam.percent_storage, 100)}%`,
                        borderRadius: 99,
                        background: `linear-gradient(90deg, ${info.color}99, ${info.color})`,
                        transition: 'width 1.5s ease-in-out',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 10,
                      color: '#64748b',
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                      🔗 {dam.reason}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {dam.inflow != null && (
                        <span style={{ color: '#10b981' }}>↓{dam.inflow}</span>
                      )}
                      {dam.outflow != null && (
                        <span style={{ color: '#f59e0b' }}>↑{dam.outflow}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Agricultural Advice */}
          <div
            style={{
              fontSize: 11,
              background: overallInfo.bg,
              color: overallInfo.color,
              padding: '8px 12px',
              borderRadius: 8,
              fontWeight: 700,
              border: `1px dashed ${overallInfo.color}40`,
            }}
          >
            🌾 {overallInfo.tip}
          </div>

          <div
            style={{
              fontSize: 10,
              color: '#94a3b8',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            น้ำจากเขื่อนศรีนครินทร์ + วชิราลงกรณ → เขื่อนแม่กลอง → คลองชลประทาน
            → จ.นครปฐม
          </div>
        </>
      )}
    </div>
  );
}

function GaugeCircle({ percent, color }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  return (
    <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
      <svg
        width="68"
        height="68"
        viewBox="0 0 68 68"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx="34"
          cy="34"
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="7"
        />
        <circle
          cx="34"
          cy="34"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 900, color, lineHeight: 1 }}>
          {percent.toFixed(0)}%
        </span>
        <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>
          รวม
        </span>
      </div>
    </div>
  );
}
