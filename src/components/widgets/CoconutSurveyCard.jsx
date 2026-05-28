import React, { useMemo } from 'react';
import { Tooltip } from 'antd';
import { EnvironmentOutlined, BarChartOutlined } from '@ant-design/icons';

export const CoconutSurveyCard = ({ coconutList = [], loading }) => {
    const stats = useMemo(() => {
        let totalArea = 0;
        let totalIncome = 0;
        const districtBreakdown = {};

        coconutList.forEach((row) => {
            const district = row.district || 'ไม่ระบุ';
            const area = Number(row.planted_area_rai) || 0;
            const income = Number(row.total_income) || 0;

            totalArea += area;
            totalIncome += income;

            if (!districtBreakdown[district]) {
                districtBreakdown[district] = { area: 0, income: 0, count: 0 };
            }
            districtBreakdown[district].area += area;
            districtBreakdown[district].income += income;
            districtBreakdown[district].count += 1;
        });

        return {
            totalArea,
            totalIncome,
            count: coconutList.length,
            districtBreakdown,
        };
    }, [coconutList]);

    const renderDistrictTooltip = (fieldKey, label, unit = 'ไร่') => {
        if (!stats.districtBreakdown || Object.keys(stats.districtBreakdown).length === 0) {
            return <div style={{ fontSize: 12 }}>ไม่มีข้อมูลรายอำเภอ</div>;
        }

        const sorted = Object.entries(stats.districtBreakdown)
            .map(([name, data]) => ({
                name,
                value: data[fieldKey] || 0,
            }))
            .sort((a, b) => b.value - a.value);

        return (
            <div style={{ padding: '4px' }}>
                <strong style={{ display: 'block', marginBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '4px', fontSize: '13px' }}>
                    📍 {label} (รายอำเภอ)
                </strong>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '200px' }}>
                    <tbody>
                        {sorted.map(({ name, value }) => (
                            <tr key={name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '3px 8px 3px 0', fontSize: '12px', color: '#e2e8f0' }}>{name}</td>
                                <td style={{ padding: '3px 0', fontSize: '12px', fontWeight: 'bold', textAlign: 'right', color: '#ffffff' }}>
                                    {fieldKey === 'income' ? value.toLocaleString('th-TH', { maximumFractionDigits: 0 }) : value.toLocaleString('th-TH', { maximumFractionDigits: 1 })}{' '}
                                    <span style={{ fontSize: '10px', fontWeight: 'normal', color: '#cbd5e1' }}>{unit}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="bento-card coconut-survey-card" style={{ gridArea: 'coconut' }}>
            <div className="bento-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3>🥥 มะพร้าวน้ำหอมนครปฐม</h3>
                </div>
                <div style={{ background: '#ecfdf5', padding: '4px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#16803d' }}>
                    สำรวจแล้ว {stats.count} ครั้ง
                </div>
            </div>
            <div className="bento-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                        <div className="skeleton-box" style={{ height: '54px', borderRadius: '8px' }}></div>
                        <div className="skeleton-box" style={{ height: '54px', borderRadius: '8px' }}></div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                        <Tooltip trigger="click" title={renderDistrictTooltip('area', 'พื้นที่ปลูกมะพร้าวน้ำหอม', 'ไร่')} color="rgba(15, 23, 42, 0.95)">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', cursor: 'pointer', transition: 'all 0.2s' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '20px' }}>🌴</span>
                                    <span style={{ fontSize: 14, color: '#16a34a', fontWeight: 600 }}>พื้นที่ปลูกรวม</span>
                                </div>
                                <span style={{ fontSize: 18, fontWeight: 800, color: '#15803d' }}>
                                    {stats.totalArea.toLocaleString('th-TH', { maximumFractionDigits: 1 })} <span style={{ fontSize: 12, fontWeight: 600 }}>ไร่</span>
                                </span>
                            </div>
                        </Tooltip>

                        <Tooltip trigger="click" title={renderDistrictTooltip('income', 'รายได้จากการจำหน่าย', 'บาท')} color="rgba(15, 23, 42, 0.95)">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0', cursor: 'pointer', transition: 'all 0.2s' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '20px' }}>💰</span>
                                    <span style={{ fontSize: 14, color: '#047857', fontWeight: 600 }}>รายได้สะสมรวม</span>
                                </div>
                                <span style={{ fontSize: 18, fontWeight: 800, color: '#065f46' }}>
                                    {stats.totalIncome.toLocaleString('th-TH', { maximumFractionDigits: 0 })} <span style={{ fontSize: 12, fontWeight: 600 }}>บาท</span>
                                </span>
                            </div>
                        </Tooltip>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>รายได้เฉลี่ยต่อไร่</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>
                                {stats.totalArea > 0 ? Math.round(stats.totalIncome / stats.totalArea).toLocaleString('th-TH') : 0} บาท/ไร่
                            </span>
                        </div>
                    </div>
                )}
            </div>
            <a href="/dashboard/production/coconut-aromatic-survey" style={{ display: 'block', textAlign: 'center', padding: '10px 16px', background: '#ecfdf5', color: '#16803d', fontSize: 13, fontWeight: 600, textDecoration: 'none', borderTop: '1px solid #a7f3d0', borderRadius: '0 0 14px 14px' }}>📊 ดูรายละเอียดและบันทึกข้อมูล →</a>
        </div>
    );
};
export default CoconutSurveyCard;
