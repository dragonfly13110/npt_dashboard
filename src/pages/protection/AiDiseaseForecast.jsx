import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Spin,
  DatePicker,
  Input,
  Select,
  Row,
  Col,
  Empty,
  Badge,
  Button,
  Drawer,
  message,
} from 'antd';
import {
  BugOutlined,
  CalendarOutlined,
  SearchOutlined,
  FilterOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  DashboardOutlined,
  ArrowLeftOutlined,
  SyncOutlined,
  EyeOutlined,
} from '@ant-design/icons';

import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import {
  getActionSummary,
  getForecastWindow,
  getPriorityDetails,
  hasChemicalAdvice,
} from './forecastGuidance';
import { resolveDiseaseKnowledge } from './diseaseKnowledge';
import './AiDiseaseForecast.css';

const { RangePicker } = DatePicker;

// Safe Date parsing to prevent timezone shifts
const parseThaiDateStr = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const parseThaiFullDateStr = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export default function AiDiseaseForecast() {
  const { canEdit } = useAuth();
  const [forecastList, setForecastList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  // Filters for current forecast details
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('ALL');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [targetRunDate, setTargetRunDate] = useState(null);
  const [activeKnowledge, setActiveKnowledge] = useState(null);
  const [inspectionChecks, setInspectionChecks] = useState({});

  // Fetch all forecasts function
  const fetchForecasts = async (selectDate = null) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_disease_forecasts')
        .select('*')
        .order('forecast_date', { ascending: false });

      if (error) throw error;
      setForecastList(data || []);

      if (data && data.length > 0) {
        if (selectDate === true) {
          setSelectedForecast(data[0]);
        } else if (typeof selectDate === 'string') {
          const matched = data.find(
            (item) => item.forecast_date === selectDate
          );
          setSelectedForecast(matched || data[0]);
        } else if (!selectedForecast) {
          setSelectedForecast(data[0]);
        } else {
          // Sync the active selected forecast with latest data if it still exists
          const updatedSelected = data.find(
            (item) => item.id === selectedForecast.id
          );
          if (updatedSelected) {
            setSelectedForecast(updatedSelected);
          } else {
            setSelectedForecast(data[0]);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching forecasts:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all forecasts on mount
  useEffect(() => {
    fetchForecasts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getRunDate = (customDateStr) => {
    return (
      customDateStr ||
      new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
    );
  };

  const isUsableForecast = (forecast) => {
    return (
      forecast &&
      typeof forecast.summary === 'string' &&
      forecast.summary.trim() &&
      !forecast.summary.startsWith('Pending AI analysis') &&
      Array.isArray(forecast.details)
    );
  };

  const fetchForecastByDate = async (forecastDate) => {
    const { data, error } = await supabase
      .from('ai_disease_forecasts')
      .select('*')
      .eq('forecast_date', forecastDate)
      .maybeSingle();

    if (error) throw error;
    return data;
  };

  const waitForForecast = async (forecastDate, previousUpdatedAt) => {
    const maxAttempts = 24;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const forecast = await fetchForecastByDate(forecastDate);
      if (
        isUsableForecast(forecast) &&
        (!previousUpdatedAt || forecast.updated_at !== previousUpdatedAt)
      )
        return forecast;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    return null;
  };

  // Handle manual analysis request
  const handleRunForecast = async (customDateStr) => {
    setAnalyzing(true);
    const msgKey = 'ai-forecast-run';
    message.loading({
      content: 'กำลังเริ่มกระบวนการวิเคราะห์พยากรณ์ด้วย AI...',
      key: msgKey,
    });
    try {
      const forecastDate = getRunDate(customDateStr);
      const previousForecast = await fetchForecastByDate(forecastDate);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('กรุณาเข้าสู่ระบบอีกครั้งก่อนสั่งวิเคราะห์');
      }

      const res = await fetch(
        '/.netlify/functions/forecast-disease-insect-background',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ date: forecastDate, force: true }),
        }
      );
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          payload.error || payload.message || `HTTP ${res.status}`
        );
      }

      message.loading({
        content: `ส่งงานวิเคราะห์วันที่ ${forecastDate} แล้ว กำลังรอผล...`,
        key: msgKey,
      });
      const generatedForecast = await waitForForecast(
        forecastDate,
        previousForecast?.updated_at
      );
      if (!generatedForecast) {
        throw new Error(
          'ระบบยังสร้างผลไม่เสร็จภายในเวลาที่กำหนด กรุณากดรีเฟรชประวัติอีกครั้ง'
        );
      }

      setSelectedForecast(generatedForecast);
      await fetchForecasts(forecastDate);
      message.success({
        content: `วิเคราะห์และบันทึกข้อมูลพยากรณ์วันที่ ${forecastDate} สำเร็จ`,
        key: msgKey,
        duration: 4,
      });
    } catch (err) {
      message.error({
        content: `การวิเคราะห์พยากรณ์ล้มเหลว: ${err.message}`,
        key: msgKey,
        duration: 5,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Filter historical date list on the left side based on DateRange
  const filteredHistoryList = useMemo(() => {
    if (!dateRange || dateRange.length !== 2) return forecastList;
    const [start, end] = dateRange;
    const startStr = start.format('YYYY-MM-DD');
    const endStr = end.format('YYYY-MM-DD');

    return forecastList.filter((item) => {
      return item.forecast_date >= startStr && item.forecast_date <= endStr;
    });
  }, [forecastList, dateRange]);

  // Handle date list selection click
  const handleSelectDate = (item) => {
    setSelectedForecast(item);
    // Reset filters when switching forecast dates
    setSearchQuery('');
    setSelectedCrop('ALL');
    setSelectedRisk('ALL');
  };

  // Calculate crop options dynamically for the active selected forecast details
  const cropOptions = useMemo(() => {
    if (!selectedForecast || !selectedForecast.details) return [];
    const crops = selectedForecast.details
      .map((item) => item.target_crop)
      .filter(Boolean);
    const uniqueCrops = [...new Set(crops)].sort();
    return [
      { value: 'ALL', label: 'พืชทั้งหมด' },
      ...uniqueCrops.map((c) => ({ value: c, label: c })),
    ];
  }, [selectedForecast]);

  // Filter current forecast cards
  const filteredDetails = useMemo(() => {
    if (!selectedForecast || !selectedForecast.details) return [];
    return selectedForecast.details.filter((item) => {
      // Text search
      const nameMatch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description &&
          item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.target_crop &&
          item.target_crop.toLowerCase().includes(searchQuery.toLowerCase()));

      // Crop filter
      const cropMatch =
        selectedCrop === 'ALL' || item.target_crop === selectedCrop;

      // Risk filter
      const riskMatch =
        selectedRisk === 'ALL' || item.risk_level === selectedRisk;

      return nameMatch && cropMatch && riskMatch;
    });
  }, [selectedForecast, searchQuery, selectedCrop, selectedRisk]);

  // Statistics counts for the selected forecast
  const stats = useMemo(() => {
    if (!selectedForecast || !selectedForecast.details) {
      return { total: 0, high: 0, medium: 0, low: 0 };
    }
    const details = selectedForecast.details;
    return {
      total: details.length,
      high: details.filter((d) => d.risk_level === 'สูง').length,
      medium: details.filter((d) => d.risk_level === 'ปานกลาง').length,
      low: details.filter((d) => d.risk_level === 'ต่ำ').length,
    };
  }, [selectedForecast]);

  const priorityDetails = useMemo(
    () => getPriorityDetails(selectedForecast?.details),
    [selectedForecast]
  );
  const forecastWindow = useMemo(
    () => getForecastWindow(selectedForecast?.forecast_date),
    [selectedForecast]
  );
  const todayActions = useMemo(
    () =>
      priorityDetails
        .map((item) => ({
          crop: item.target_crop,
          disease: item.name,
          action: getActionSummary(item.prevention),
        }))
        .filter((item) => item.action)
        .slice(0, 3),
    [priorityDetails]
  );

  const openKnowledge = (item) => {
    const knowledge = resolveDiseaseKnowledge(item);
    if (!knowledge) return;
    setActiveKnowledge({ ...knowledge, forecast: item });
    setInspectionChecks({});
  };

  return (
    <div className="forecast-history-container">
      {/* Page Header */}
      <div
        className="forecast-page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ flex: '1 1 500px' }}>
          <h2>
            <BugOutlined style={{ color: '#166534' }} />
            พยากรณ์และเตือนภัยโรค-แมลงศัตรูพืชอัจฉริยะ (ล่วงหน้า 7 วัน)
          </h2>
          <p>
            ระบบวิเคราะห์ประเมินความเสี่ยงล่วงหน้าของศัตรูพืชและโรคระบาดในพื้นที่จังหวัดนครปฐม
            โดยเชื่อมโยงฐานข้อมูลสภาพอากาศย้อนหลัง คาดการณ์สภาพอากาศล่วงหน้า
            และประวัติโรคระบาดด้วย AI
          </p>
        </div>
        {canEdit('ai_disease_forecasts') && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <DatePicker
              placeholder="เลือกวันที่ย้อนหลัง"
              onChange={(date, dateString) =>
                setTargetRunDate(dateString || null)
              }
              style={{ width: '160px', borderRadius: '8px', height: '40px' }}
              disabled={analyzing}
            />
            <Button
              type="primary"
              icon={<SyncOutlined spin={analyzing} />}
              loading={analyzing}
              onClick={() => handleRunForecast(targetRunDate)}
              style={{
                background: '#166534',
                borderColor: '#166534',
                borderRadius: '8px',
                height: '40px',
                fontWeight: 'bold',
                boxShadow: '0 4px 10px rgba(22, 101, 52, 0.15)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {targetRunDate
                ? `วิเคราะห์พยากรณ์วันที่ ${targetRunDate}`
                : 'วิเคราะห์พยากรณ์ด้วย AI ตอนนี้'}
            </Button>
          </div>
        )}
      </div>

      {loading && forecastList.length === 0 ? (
        <div style={{ padding: '80px 0', textAlign: 'center' }}>
          <Spin size="large" tip="กำลังโหลดประวัติข้อมูลพยากรณ์..." />
        </div>
      ) : (
        <div className="forecast-layout">
          {/* LEFT PANEL: Historical Dates List */}
          <div className="history-sidebar-card">
            <h3 className="sidebar-title">
              <CalendarOutlined />
              ประวัติการพยากรณ์
            </h3>

            <RangePicker
              placeholder={['เริ่ม', 'สิ้นสุด']}
              style={{ width: '100%' }}
              value={dateRange}
              onChange={setDateRange}
              allowClear
            />

            <div className="history-list">
              {filteredHistoryList.length === 0 ? (
                <div
                  style={{
                    padding: '20px 0',
                    textAlign: 'center',
                    color: '#94a3b8',
                  }}
                >
                  ไม่พบประวัติพยากรณ์
                </div>
              ) : (
                filteredHistoryList.map((item) => {
                  const isActive =
                    selectedForecast && selectedForecast.id === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`history-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelectDate(item)}
                    >
                      <div className="history-item-date">
                        <span>{parseThaiDateStr(item.forecast_date)}</span>
                        {isActive && <Badge status="success" />}
                      </div>
                      <p className="history-item-snippet">{item.summary}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Forecast Details */}
          <div className="forecast-main-content">
            {selectedForecast ? (
              <>
                {/* Selected Date Header */}
                <div className="active-forecast-header">
                  <h3 className="active-date-title">
                    📅 วันที่วิเคราะห์พยากรณ์:{' '}
                    {parseThaiFullDateStr(selectedForecast.forecast_date)}
                  </h3>
                  <span className="generation-badge">
                    🤖{' '}
                    {selectedForecast.model
                      ? `${selectedForecast.model} · Google Search`
                      : 'ผลวิเคราะห์เดิม · ไม่ได้บันทึกโมเดล'}
                  </span>
                </div>

                <section className="forecast-decision-board">
                  <div className="decision-priority">
                    <span className="decision-eyebrow">จุดเฝ้าระวังสูงสุด</span>
                    <strong>
                      {priorityDetails[0]?.name || 'ไม่พบความเสี่ยง'}
                    </strong>
                    <p>
                      {priorityDetails[0]
                        ? `${priorityDetails[0].target_crop} · ความเสี่ยง${priorityDetails[0].risk_level}`
                        : 'ยังไม่มีรายการที่ต้องเฝ้าระวัง'}
                    </p>
                  </div>
                  <div className="forecast-window-card">
                    <div className="window-heading">
                      <strong>ช่วงเฝ้าระวัง 7 วัน</strong>
                      <span>ความเสี่ยงรวมทั้งช่วง ไม่ใช่คะแนนรายวัน</span>
                    </div>
                    <div className="forecast-window-days">
                      {forecastWindow.map((day) => (
                        <span key={day}>{day}</span>
                      ))}
                    </div>
                  </div>
                </section>

                {todayActions.length > 0 && (
                  <section className="today-actions-card">
                    <div>
                      <span className="decision-eyebrow">ลงมือวันนี้</span>
                      <h4>3 งานเร่งด่วนก่อนโรคระบาด</h4>
                    </div>
                    <ol>
                      {todayActions.map((item) => (
                        <li key={`${item.crop}-${item.disease}`}>
                          <strong>{item.crop}</strong>
                          <span>{item.action}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                {/* Overall Summary Block */}
                <div className="overall-summary-card">
                  <h4>
                    <DashboardOutlined />
                    บทสรุปภาพรวมความเสี่ยงล่วงหน้า 7 วัน (จังหวัดนครปฐม)
                  </h4>
                  <p>{selectedForecast.summary}</p>
                </div>

                <details className="forecast-sources-card" open>
                  <summary>
                    แหล่งข้อมูลที่ AI ใช้วิเคราะห์ (
                    {selectedForecast.sources?.length || 0})
                  </summary>
                  {selectedForecast.search_queries?.length > 0 && (
                    <div className="search-query-list">
                      {selectedForecast.search_queries.map((query) => (
                        <span key={query}>{query}</span>
                      ))}
                    </div>
                  )}
                  {selectedForecast.sources?.length > 0 ? (
                    <ol>
                      {selectedForecast.sources.map((source, index) => (
                        <li key={`${source.url}-${index}`}>
                          <a href={source.url} target="_blank" rel="noreferrer">
                            {source.title || source.url}
                          </a>
                          {source.cited_texts?.[0] && (
                            <p>{source.cited_texts[0]}</p>
                          )}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="missing-citations">
                      ผลวิเคราะห์เดิมนี้ไม่ได้บันทึก URL และ citation ไว้
                    </p>
                  )}
                </details>

                {/* Stats Cards Grid */}
                <div className="forecast-stats-grid">
                  <div className="forecast-stat-card stat-total">
                    <span className="stat-card-label">
                      รายการระบาดที่เฝ้าระวัง
                    </span>
                    <span className="stat-card-value">{stats.total} ชนิด</span>
                  </div>
                  <div className="forecast-stat-card stat-high">
                    <span className="stat-card-label">ระดับความเสี่ยง สูง</span>
                    <span className="stat-card-value">{stats.high} ชนิด</span>
                  </div>
                  <div className="forecast-stat-card stat-medium">
                    <span className="stat-card-label">
                      ระดับความเสี่ยง ปานกลาง
                    </span>
                    <span className="stat-card-value">{stats.medium} ชนิด</span>
                  </div>
                  <div className="forecast-stat-card stat-low">
                    <span className="stat-card-label">ระดับความเสี่ยง ต่ำ</span>
                    <span className="stat-card-value">{stats.low} ชนิด</span>
                  </div>
                </div>

                {/* Filter Controls */}
                <div className="detail-filter-card">
                  <div className="crop-quick-filter" aria-label="เลือกชนิดพืช">
                    {cropOptions.map((crop) => (
                      <button
                        type="button"
                        key={crop.value}
                        className={selectedCrop === crop.value ? 'active' : ''}
                        onClick={() => setSelectedCrop(crop.value)}
                      >
                        {crop.label}
                      </button>
                    ))}
                  </div>
                  <div className="detail-filter-flex">
                    <div
                      className="filter-group"
                      style={{ flexGrow: 1, minWidth: '200px' }}
                    >
                      <Input
                        placeholder="ค้นหาชื่อโรค หรือคำสำคัญ..."
                        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        allowClear
                      />
                    </div>

                    <div className="filter-group">
                      <label>
                        <FilterOutlined /> ชนิดพืช:
                      </label>
                      <Select
                        style={{ width: 140 }}
                        value={selectedCrop}
                        onChange={setSelectedCrop}
                        options={cropOptions}
                      />
                    </div>

                    <div className="filter-group">
                      <label>
                        <AlertOutlined /> ระดับความเสี่ยง:
                      </label>
                      <Select
                        style={{ width: 140 }}
                        value={selectedRisk}
                        onChange={setSelectedRisk}
                        options={[
                          { value: 'ALL', label: 'ความเสี่ยงทั้งหมด' },
                          { value: 'สูง', label: 'สูง' },
                          { value: 'ปานกลาง', label: 'ปานกลาง' },
                          { value: 'ต่ำ', label: 'ต่ำ' },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {/* Detailed Outbreak Cards Grid */}
                {filteredDetails.length === 0 ? (
                  <Card bordered={false} style={{ borderRadius: 16 }}>
                    <Empty
                      description={
                        selectedForecast.details?.length === 0
                          ? 'รอบนี้ไม่พบความเสี่ยงสำคัญที่มีหลักฐานเพียงพอ'
                          : 'ไม่พบโรคพืชหรือแมลงศัตรูพืชที่ตรงกับตัวกรองที่เลือก'
                      }
                    />
                  </Card>
                ) : (
                  <div className="detail-cards-grid">
                    {filteredDetails.map((item, idx) => {
                      const isHigh = item.risk_level === 'สูง';
                      const isMedium = item.risk_level === 'ปานกลาง';
                      const riskClass = isHigh
                        ? 'risk-high'
                        : isMedium
                          ? 'risk-medium'
                          : 'risk-low';
                      const typeClass =
                        item.type === 'โรคพืช' ? 'tag-disease' : 'tag-pest';
                      const knowledge = resolveDiseaseKnowledge(item);

                      return (
                        <div
                          className={`detail-forecast-card ${riskClass}`}
                          key={idx}
                        >
                          <div className="card-header-area">
                            <div className="card-title-block">
                              <h3>{item.name}</h3>
                              <div className="badge-row">
                                <span className={`tag-badge ${typeClass}`}>
                                  {item.type}
                                </span>
                              </div>
                            </div>
                            <span className={`risk-pill ${riskClass}`}>
                              {isHigh && <AlertOutlined />}
                              {isMedium && <WarningOutlined />}
                              {!isHigh && !isMedium && <CheckCircleOutlined />}
                              &nbsp;ความเสี่ยง: {item.risk_level}
                            </span>
                          </div>
                          <div className="card-body-area">
                            <div className="crop-target-info">
                              <span>🌱 พืชที่กระทบ:</span>
                              <strong>{item.target_crop}</strong>
                            </div>
                            <p className="card-description">
                              {item.description}
                            </p>
                            <div className="confidence-row">
                              ความมั่นใจของหลักฐาน:{' '}
                              <strong>{item.confidence || 'ไม่ระบุ'}</strong>
                            </div>
                            {(item.evidence?.length > 0 ||
                              item.symptoms_to_watch?.length > 0 ||
                              item.monitoring_actions?.length > 0 ||
                              item.ipm_actions?.length > 0) && (
                              <details className="analysis-evidence">
                                <summary>ดูหลักฐานและแผนตรวจแปลง</summary>
                                {item.evidence?.length > 0 && (
                                  <section>
                                    <h6>หลักฐานที่ใช้ประเมิน</h6>
                                    <ul>
                                      {item.evidence.map((evidence, index) => (
                                        <li key={`${evidence.factor}-${index}`}>
                                          <strong>{evidence.factor}:</strong>{' '}
                                          {evidence.observation}
                                          {evidence.implication &&
                                            ` — ${evidence.implication}`}
                                        </li>
                                      ))}
                                    </ul>
                                  </section>
                                )}
                                {item.symptoms_to_watch?.length > 0 && (
                                  <section>
                                    <h6>อาการที่ต้องเฝ้าดู</h6>
                                    <ul>
                                      {item.symptoms_to_watch.map((text) => (
                                        <li key={text}>{text}</li>
                                      ))}
                                    </ul>
                                  </section>
                                )}
                                {item.monitoring_actions?.length > 0 && (
                                  <section>
                                    <h6>แผนตรวจแปลง</h6>
                                    <ul>
                                      {item.monitoring_actions.map((text) => (
                                        <li key={text}>{text}</li>
                                      ))}
                                    </ul>
                                  </section>
                                )}
                                {item.ipm_actions?.length > 0 && (
                                  <section>
                                    <h6>แนวทาง IPM</h6>
                                    <ul>
                                      {item.ipm_actions.map((text) => (
                                        <li key={text}>{text}</li>
                                      ))}
                                    </ul>
                                  </section>
                                )}
                              </details>
                            )}
                            {knowledge && (
                              <button
                                type="button"
                                className="inspect-disease-button"
                                onClick={() => openKnowledge(item)}
                              >
                                <EyeOutlined />
                                ตรวจอาการก่อนจัดการ
                              </button>
                            )}
                            <div className="card-prevention-block">
                              <h6>🛡️ แนวทาง IPM และการป้องกัน:</h6>
                              <p>{item.prevention}</p>
                            </div>
                            {hasChemicalAdvice(item.prevention) && (
                              <div className="chemical-safety-note">
                                <strong>มีคำแนะนำเกี่ยวกับสารเคมี</strong>
                                <span>
                                  ข้อมูลส่วนนี้สร้างจาก AI ต้องตรวจฉลาก
                                  พืชเป้าหมาย และทะเบียนก่อนใช้
                                </span>
                                <a href="/public/pesticides">
                                  เปิดคลังความรู้สารเคมี →
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <Card bordered={false} style={{ borderRadius: 16 }}>
                <Empty description="ไม่พบข้อมูลพยากรณ์ กรุณาเลือกวันที่ต้องการทางแถบด้านซ้าย" />
              </Card>
            )}
          </div>
        </div>
      )}

      <Drawer
        className="disease-knowledge-drawer"
        title={activeKnowledge?.forecast?.name || 'คู่มือตรวจแปลง'}
        open={Boolean(activeKnowledge)}
        onClose={() => setActiveKnowledge(null)}
        width={620}
      >
        {activeKnowledge && (
          <div className="knowledge-drawer-content">
            <div className="knowledge-status">
              <span>ฐานความรู้ตรวจสอบเบื้องต้น</span>
              <strong>รอเจ้าหน้าที่รับรอง</strong>
            </div>

            <section>
              <h3>อาการสำคัญ</h3>
              <ul>
                {activeKnowledge.symptoms.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="confused-section">
              <h3>อาจสับสนกับ</h3>
              <div className="knowledge-tags">
                {activeKnowledge.confusedWith.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </section>

            <section>
              <h3>วิธีสำรวจแปลง</h3>
              <ol>
                {activeKnowledge.scoutingSteps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </section>

            <section className="inspection-checklist">
              <h3>Checklist ก่อนจัดการ</h3>
              {[
                'พบอาการจริงในแปลง',
                'ตรวจหลายจุด ไม่ใช่ต้นเดียว',
                'อาการตรงกับคำอธิบาย',
                'แยกสาเหตุที่มักสับสนแล้ว',
              ].map((label) => (
                <label key={label}>
                  <input
                    type="checkbox"
                    checked={Boolean(inspectionChecks[label])}
                    onChange={(event) =>
                      setInspectionChecks((current) => ({
                        ...current,
                        [label]: event.target.checked,
                      }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </section>

            <section className="ipm-section">
              <h3>เริ่มด้วย IPM</h3>
              <ul>
                {activeKnowledge.ipmMethods.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            {activeKnowledge.pesticideSlug ? (
              <a
                className="verified-knowledge-link"
                href={`/public/pesticides/${activeKnowledge.pesticideSlug}`}
              >
                เปิดคำแนะนำสารที่ตรงกับพืชและโรค →
              </a>
            ) : (
              <p className="no-pesticide-match">
                ยังไม่มีเอกสารสารเคมีที่ตรงทั้งพืชและโรคในคลัง
                จึงไม่แนะนำสารจากชื่อโรคใกล้เคียง
              </p>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
