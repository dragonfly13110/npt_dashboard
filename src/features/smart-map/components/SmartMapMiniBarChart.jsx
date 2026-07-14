export default function SmartMapMiniBarChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map((item) => (
        <div
          key={item.label}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#475569',
              minWidth: 72,
              textAlign: 'right',
            }}
          >
            {item.label}
          </span>
          <div
            style={{
              flex: 1,
              height: 14,
              background: 'rgba(15, 23, 42, 0.06)',
              borderRadius: 7,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.max((item.value / max) * 100, 2)}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${item.color}cc, ${item.color})`,
                borderRadius: 7,
                transition: 'width 0.6s ease',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: '#1e293b',
              minWidth: 50,
              textAlign: 'right',
            }}
          >
            {item.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
