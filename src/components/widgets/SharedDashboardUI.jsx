import { Card } from 'antd';

export function PageHeader({ title, subtitle, icon: Icon }) {
    return (
        <div style={{ padding: '12px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                {Icon && <Icon style={{ fontSize: 22, color: '#1a7f37' }} />}
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1f2328' }}>{title}</h2>
            </div>
            <p style={{ margin: 0, color: '#656d76', fontSize: 14 }}>{subtitle}</p>
        </div>
    );
}

export function CategoryBentoCard({
    title, icon, totalLabel, totalCount, mainStatsTitle, mainStats
}) {
    return (
        <div className="bento-card" style={{ marginBottom: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3>{icon} {title}</h3>
                </div>
                {totalLabel && (
                    <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                        {totalLabel} {totalCount}
                    </div>
                )}
            </div>
            <div className="bento-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', flexGrow: 1 }}>
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 2 }}>{mainStatsTitle}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: mainStats.length > 4 ? 'repeat(2, 1fr)' : '1fr', gap: '8px' }}>
                        {mainStats.map(({ label, value, key, isTotal, colorType }, idx) => {
                            const isEven = idx % 2 === 0;
                            // colorType can be 'green', 'blue', 'red'
                            let bg, border, textConfig, valConfig;
                            if (isTotal) {
                                bg = '#eef2ff'; border = '#e0e7ff'; textConfig = '#4338ca'; valConfig = '#3730a3';
                            } else if (colorType === 'blue') {
                                bg = isEven ? '#eff6ff' : '#f8fafc'; border = isEven ? '#dbeafe' : '#e2e8f0'; textConfig = isEven ? '#1d4ed8' : '#475569'; valConfig = isEven ? '#1e40af' : '#0f172a';
                            } else if (colorType === 'red') {
                                bg = isEven ? '#fef2f2' : '#f8fafc'; border = isEven ? '#fee2e2' : '#e2e8f0'; textConfig = isEven ? '#b91c1c' : '#475569'; valConfig = isEven ? '#991b1b' : '#0f172a';
                            } else {
                                // Default green
                                bg = isEven ? '#f0fdf4' : '#f8fafc'; border = isEven ? '#dcfce3' : '#e2e8f0'; textConfig = isEven ? '#166534' : '#475569'; valConfig = isEven ? '#15803d' : '#0f172a';
                            }
                            return (
                                <div key={key || label} style={{ 
                                    display: 'flex', justifyContent: 'space-between', padding: '8px 12px', 
                                    background: bg, borderRadius: '8px', border: `1px solid ${border}`,
                                    gridColumn: isTotal ? '1 / -1' : 'auto', marginTop: isTotal ? 4 : 0
                                }}>
                                    <span style={{ fontSize: 13, color: textConfig, fontWeight: isTotal ? 700 : 500 }}>{label}</span>
                                    <span style={{ fontSize: 16, fontWeight: isTotal ? 800 : 700, color: valConfig }}>{value}</span>
                                </div>
                            );
                        })}
                        {mainStats.length === 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '24px 8px', gridColumn: '1 / -1', height: '100%', minHeight: '120px' }}>
                                <span style={{ fontSize: 24, marginBottom: 8, opacity: 0.5 }}>📭</span>
                                <span style={{ fontSize: 13 }}>รอรวบรวมข้อมูล...</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function CategoryChartCard({ title, children }) {
    return (
        <Card title={title} size="small" variant="outlined" style={{ borderRadius: 12 }}>
            <div style={{ height: 340 }}>
                {children}
            </div>
        </Card>
    );
}
