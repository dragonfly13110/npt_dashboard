import { useEffect, useState } from 'react';

function AnimatedNumber({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let active = true;
    if (!value) {
      requestAnimationFrame(() => {
        if (active) setDisplay(0);
      });
      return;
    }
    const startTime = performance.now();
    const animate = (now) => {
      if (!active) return;
      const progress = Math.min((now - startTime) / duration, 1);
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    return () => {
      active = false;
    };
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

export default function SmartMapKpiBar({ totals }) {
  const cards = [
    ['🏠', totals.house, 'ครัวเรือนเกษตรกร'],
    ['🌾', totals.area, 'พื้นที่เกษตร (ไร่)'],
    ['🤝', totals.ce, 'วิสาหกิจชุมชน'],
    ['🌱', totals.lp, 'แปลงใหญ่'],
  ];

  return (
    <div className="smart-map-kpi-bar">
      {cards.map(([icon, value, label]) => (
        <div className="kpi-card" key={label}>
          <span className="kpi-icon">{icon}</span>
          <span className="kpi-value">
            <AnimatedNumber value={value} />
          </span>
          <span className="kpi-label">{label}</span>
        </div>
      ))}
    </div>
  );
}
