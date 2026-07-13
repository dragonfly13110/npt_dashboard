import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { Spin } from 'antd';
import { BugOutlined } from '@ant-design/icons';

const fetchDiseaseForecast = async () => {
  const { data, error } = await supabase
    .from('ai_disease_forecasts')
    .select('*')
    .order('forecast_date', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
};

export default function DiseaseForecastDetail() {
  const {
    data: forecastData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['landing-detail', 'disease-forecast'],
    queryFn: fetchDiseaseForecast,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  if (isLoading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <Spin size="large" tip="กำลังโหลดคำทำนายจากฐานข้อมูล..." />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{ padding: '30px 10px', textAlign: 'center', color: '#e53e3e' }}
      >
        ไม่สามารถดึงข้อมูลพยากรณ์โรคพืชได้: {error.message}
      </div>
    );
  }

  if (!forecastData) {
    return (
      <div
        style={{ padding: '30px 10px', textAlign: 'center', color: '#64748b' }}
      >
        ไม่พบข้อมูลการพยากรณ์สำหรับวันนี้
      </div>
    );
  }

  return (
    <div className="forecast-modal-content">
      <div
        className="forecast-meta-info"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '20px',
        }}
      >
        <span
          className="forecast-date-badge"
          style={{
            background: '#f1f5f9',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#334155',
            fontWeight: 600,
          }}
        >
          📅 คาดการณ์ล่วงหน้า 7 วัน ตั้งแต่วันที่:{' '}
          {new Date(forecastData.forecast_date).toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </span>
        <span
          className="forecast-source-badge"
          style={{
            background: '#ecfdf5',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#065f46',
            fontWeight: 600,
          }}
        >
          ⚡ วิเคราะห์ด้วย AI + Google Grounding + สภาพอากาศนครปฐม
        </span>
      </div>

      <div
        className="forecast-summary-card"
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <h4
          style={{
            margin: '0 0 8px 0',
            fontWeight: 'bold',
            fontSize: '15px',
            color: '#0f172a',
          }}
        >
          📋 สรุปภาพรวมความเสี่ยงล่วงหน้า 7 วัน
        </h4>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            lineHeight: 1.6,
            color: '#334155',
          }}
        >
          {forecastData.summary}
        </p>
      </div>

      <h4
        className="forecast-grid-title"
        style={{
          fontWeight: 'bold',
          fontSize: '16px',
          color: '#0f172a',
          marginBottom: '16px',
        }}
      >
        🚨 รายการโรคและแมลงศัตรูพืชที่มีความเสี่ยง
      </h4>

      <div
        className="forecast-cards-grid"
        style={{
          display: 'grid',
          gap: '16px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        }}
      >
        {forecastData.details &&
          forecastData.details.map((item, idx) => {
            const isHigh = item.risk_level === 'สูง';
            const isMedium = item.risk_level === 'ปานกลาง';
            const riskBg = isHigh
              ? '#fef2f2'
              : isMedium
                ? '#fffbeb'
                : '#f0fdf4';
            const riskBorder = isHigh
              ? '#fca5a5'
              : isMedium
                ? '#fde047'
                : '#86efac';
            const riskColor = isHigh
              ? '#991b1b'
              : isMedium
                ? '#854d0e'
                : '#166534';
            const typeBg = item.type === 'โรคพืช' ? '#e0f2fe' : '#f3e8ff';
            const typeColor = item.type === 'โรคพืช' ? '#0369a1' : '#6b21a8';

            return (
              <div
                className="forecast-card"
                key={idx}
                style={{
                  background: '#ffffff',
                  border: `1px solid ${riskBorder}`,
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  className="forecast-card-header"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <div className="forecast-card-title-area">
                    <h5
                      style={{
                        margin: '0 0 4px 0',
                        fontSize: '15px',
                        fontWeight: 'bold',
                        color: '#0f172a',
                      }}
                    >
                      {item.name}
                    </h5>
                    <span
                      className="forecast-badge type-badge"
                      style={{
                        background: typeBg,
                        color: typeColor,
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {item.type}
                    </span>
                  </div>
                  <span
                    className="forecast-badge risk-badge"
                    style={{
                      background: riskBg,
                      color: riskColor,
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '4px 8px',
                      borderRadius: '999px',
                      border: `1px solid ${riskBorder}`,
                    }}
                  >
                    ความเสี่ยง: {item.risk_level}
                  </span>
                </div>
                <div
                  className="forecast-card-body"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '13px',
                  }}
                >
                  <div className="forecast-crop-info">
                    <span style={{ color: '#64748b' }}>🌱 พืชที่กระทบ:</span>{' '}
                    <strong style={{ color: '#0f172a' }}>
                      {item.target_crop}
                    </strong>
                  </div>
                  <p style={{ margin: 0, color: '#334155', lineHeight: 1.5 }}>
                    {item.description}
                  </p>
                  <div
                    className="forecast-prevention"
                    style={{
                      background: '#f8fafc',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    <h6
                      style={{
                        margin: '0 0 4px 0',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#475569',
                      }}
                    >
                      🛡️ คำแนะนำในการป้องกันเฝ้าระวัง:
                    </h6>
                    <p
                      style={{
                        margin: 0,
                        color: '#475569',
                        fontSize: '12px',
                        lineHeight: 1.5,
                      }}
                    >
                      {item.prevention}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
