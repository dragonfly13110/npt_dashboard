import SmartMapMiniBarChart from './SmartMapMiniBarChart';

export default function SmartMapDetailPanel({
  selectedDistrict,
  selectedSubdistrict,
  selectedData,
  summaryAvailability,
  panelClosing,
  onClose,
  onCompare,
  weather,
  getWeatherDetails,
  getPm25Color,
  getPm25LevelLabel,
  cropChartData,
  simRiceConversion,
  onRiceConversionChange,
  simResidueManagement,
  onResidueManagementChange,
  simulationResults,
  aiLoading,
  aiError,
  aiInsight,
  onGenerateAIInsight,
}) {
  if (!selectedDistrict || !selectedData) return null;

  const riceArea = (selectedData.ricePi || 0) + (selectedData.ricePrung || 0);

  return (
    <div
      className={`district-panel ${panelClosing ? 'district-panel-closing' : ''}`}
      onClick={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="panel-drag-handle" />
      <div className="panel-header">
        <div>
          <div className="panel-district-name">อ.{selectedDistrict.name}</div>
          <div className="panel-district-area">
            พื้นที่ {selectedDistrict.areaSqkm?.toFixed(1)} ตร.กม.
            {selectedSubdistrict ? ` | ต.${selectedSubdistrict.name}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="panel-compare-btn"
            onClick={onCompare}
            title="เปรียบเทียบข้อมูลรายอำเภอ"
          >
            📊 เปรียบเทียบ
          </button>
          <button
            className="panel-close-btn"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {summaryAvailability === 'district_only' && (
        <div
          role="status"
          className="panel-section"
          style={{ color: '#9a3412' }}
        >
          ข้อมูลระดับอำเภอ (ไม่มีข้อมูลระดับตำบล)
        </div>
      )}

      <div className="panel-section weather-live-card">
        <div className="panel-section-title">🌤️ สภาพอากาศสดและฝุ่น PM2.5</div>
        {weather ? (
          (() => {
            if (weather.loading) {
              return (
                <div className="weather-loading">
                  กำลังโหลดข้อมูลสภาพอากาศ...
                </div>
              );
            }
            if (weather.error) {
              return (
                <div className="weather-error">
                  ไม่สามารถดึงข้อมูลสภาพอากาศได้
                </div>
              );
            }
            const weatherInfo = getWeatherDetails(weather.weatherCode);
            const pmColor = getPm25Color(weather.pm25);
            const pmLabel = getPm25LevelLabel(weather.pm25);
            return (
              <div className="weather-detail-grid">
                <div className="weather-main-info">
                  <span className="weather-icon-large">{weatherInfo.icon}</span>
                  <div>
                    <div className="weather-temp-val">
                      {weather.temp !== null ? `${weather.temp}°C` : '--'}
                    </div>
                    <div className="weather-desc">{weatherInfo.label}</div>
                  </div>
                </div>
                <div
                  className="weather-pm25-card"
                  style={{ borderLeftColor: pmColor }}
                >
                  <div className="pm25-val-wrapper">
                    <span className="pm25-number" style={{ color: pmColor }}>
                      {weather.pm25 !== null ? weather.pm25 : '--'}
                    </span>
                    <span className="pm25-unit">µg/m³</span>
                  </div>
                  <div
                    className="pm25-badge"
                    style={{ backgroundColor: pmColor + '15', color: pmColor }}
                  >
                    {pmLabel}
                  </div>
                  <div className="pm25-label">ระดับฝุ่น PM2.5</div>
                </div>
                <div className="weather-sub-details">
                  <div className="weather-sub-item">
                    <span className="sub-icon">💧</span>
                    <div>
                      <div className="sub-val">
                        {weather.humidity !== null
                          ? `${weather.humidity}%`
                          : '--'}
                      </div>
                      <div className="sub-lbl">ความชื้น</div>
                    </div>
                  </div>
                  <div className="weather-sub-item">
                    <span className="sub-icon">💨</span>
                    <div>
                      <div className="sub-val">
                        {weather.windSpeed !== null
                          ? `${weather.windSpeed} กม./ชม.`
                          : '--'}
                      </div>
                      <div className="sub-lbl">ความเร็วลม</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="weather-loading">กำลังโหลดข้อมูลสภาพอากาศ...</div>
        )}
      </div>

      <div className="panel-section">
        <div className="panel-section-title">ตัวชี้วัดหลัก</div>
        <div className="panel-stats-grid">
          {[
            ['🌾', selectedData.area || 0, 'พื้นที่เกษตร (ไร่)'],
            ['🏠', selectedData.house || 0, 'ครัวเรือนเกษตรกร'],
            ['🤝', selectedData.ce || 0, 'วิสาหกิจชุมชน'],
            ['🌱', selectedData.lp || 0, 'แปลงใหญ่'],
          ].map(([icon, value, label]) => (
            <div className="panel-stat" key={label}>
              <div className="panel-stat-icon">{icon}</div>
              <div className="panel-stat-value">{value.toLocaleString()}</div>
              <div className="panel-stat-label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {cropChartData.length > 0 && (
        <div className="panel-section">
          <div className="panel-section-title">
            สัดส่วนพื้นที่เพาะปลูก (ไร่)
          </div>
          <SmartMapMiniBarChart data={cropChartData} />
        </div>
      )}

      <div className="panel-section policy-simulation">
        <div className="panel-section-title">
          🎛️ จำลองผลลัพธ์การปรับนโยบาย (What-If)
        </div>
        <div className="simulation-slider-group">
          <div className="slider-header">
            <span className="slider-label">เปลี่ยนนาปรังเป็นพืชสวน/พืชไร่</span>
            <span className="slider-value">{simRiceConversion}%</span>
          </div>
          <input
            aria-label="เปลี่ยนนาปรังเป็นพืชสวน/พืชไร่"
            type="range"
            min="0"
            max="50"
            step="5"
            value={simRiceConversion}
            onChange={(event) =>
              onRiceConversionChange(parseInt(event.target.value, 10))
            }
            disabled={!(selectedData.ricePrung > 0)}
            className="sim-range-input"
          />
          {!(selectedData.ricePrung > 0) && (
            <div className="slider-hint-disabled">
              ไม่มีพื้นที่นาปรังในอำเภอนี้
            </div>
          )}
        </div>

        <div className="simulation-slider-group">
          <div className="slider-header">
            <span className="slider-label">ลดการเผาเศษวัสดุทางการเกษตร</span>
            <span className="slider-value">{simResidueManagement}%</span>
          </div>
          <input
            aria-label="ลดการเผาเศษวัสดุทางการเกษตร"
            type="range"
            min="0"
            max="100"
            step="10"
            value={simResidueManagement}
            onChange={(event) =>
              onResidueManagementChange(parseInt(event.target.value, 10))
            }
            disabled={!(riceArea > 0)}
            className="sim-range-input"
          />
          {!(riceArea > 0) && (
            <div className="slider-hint-disabled">
              ไม่มีพื้นที่ปลูกข้าวในอำเภอนี้
            </div>
          )}
        </div>

        <div className="simulation-results-grid">
          {[
            [
              'water-saved',
              '💧',
              simulationResults.waterSaved.toLocaleString(),
              'ประหยัดน้ำสะสม (ลบ.ม.)',
            ],
            [
              'income-added',
              '💰',
              `+${simulationResults.incomeAdded.toLocaleString()}`,
              'รายได้เกษตรกรที่เพิ่ม (บาท)',
            ],
            [
              'co2-reduced',
              '🍃',
              simulationResults.co2Reduced.toLocaleString(undefined, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }),
              'ลดปล่อย CO2e (ตัน)',
            ],
            [
              'hotspot-reduction',
              '🔥',
              `-${simulationResults.hotspotReduction.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
              'ลดจุดความร้อนเกษตร',
            ],
          ].map(([className, icon, value, label]) => (
            <div className={`sim-result-card ${className}`} key={className}>
              <div className="sim-card-icon">{icon}</div>
              <div className="sim-card-value">{value}</div>
              <div className="sim-card-label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">ศูนย์เรียนรู้และกลุ่ม</div>
        <div className="panel-mini-stats">
          {[
            [selectedData.lc, 'ศพก.'],
            [selectedData.pc, 'ศจช.'],
            [selectedData.sfc, 'ศดปช.'],
          ].map(([value, label]) => (
            <div className="panel-mini-stat" key={label}>
              <div className="panel-mini-stat-value">{value || 0}</div>
              <div className="panel-mini-stat-label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">กลุ่มสถาบันเกษตรกร</div>
        <div className="panel-mini-stats">
          {[
            [selectedData.instHousewives, 'แม่บ้าน'],
            [selectedData.instYoung, 'ยุวเกษตร'],
            [selectedData.instCareer, 'อาชีพ'],
          ].map(([value, label]) => (
            <div className="panel-mini-stat" key={label}>
              <div className="panel-mini-stat-value">{value || 0}</div>
              <div className="panel-mini-stat-label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">เกษตรกรปราดเปรื่อง (ราย)</div>
        <div
          className="panel-mini-stats"
          style={{ gridTemplateColumns: '1fr 1fr' }}
        >
          {[
            [selectedData.sfSfCount, 'Smart Farmer'],
            [selectedData.ysfCount, 'Young Smart'],
          ].map(([value, label]) => (
            <div className="panel-mini-stat" key={label}>
              <div className="panel-mini-stat-value">{value || 0}</div>
              <div className="panel-mini-stat-label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">ภัยพิบัติและจุดความร้อน</div>
        <div className="panel-stats-grid">
          {[
            ['⚠️', selectedData.disasterArea || 0, 'พื้นที่ภัยพิบัติ (ไร่)'],
            ['🐛', selectedData.pestArea || 0, 'ศัตรูพืชระบาด (ไร่)'],
          ].map(([icon, value, label]) => (
            <div className="panel-stat" key={label}>
              <div className="panel-stat-icon">{icon}</div>
              <div className="panel-stat-value">{value.toLocaleString()}</div>
              <div className="panel-stat-label">{label}</div>
            </div>
          ))}
          <div
            className="panel-stat"
            style={{
              gridColumn: 'span 2',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
            }}
          >
            <span style={{ fontSize: '20px' }}>🔥</span>
            <div style={{ textAlign: 'left' }}>
              <div className="panel-stat-value">
                {selectedData.fireCount || 0}
              </div>
              <div className="panel-stat-label">จุดความร้อน PM2.5 สะสม</div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel-section ai-insights-section">
        <div className="panel-section-title">
          🤖 คำแนะนำยุทธศาสตร์เชิงพื้นที่ (AI Insight)
        </div>
        {aiError && (
          <div className="ai-error-banner">
            <span className="ai-error-icon">⚠️</span>
            <span className="ai-error-text">{aiError}</span>
            <button className="ai-retry-btn" onClick={onGenerateAIInsight}>
              ลองใหม่
            </button>
          </div>
        )}
        {aiLoading && (
          <div className="ai-loading-container">
            <div className="ai-pulse-loader">
              <div className="ai-pulse-bar" />
              <div className="ai-pulse-bar" />
              <div className="ai-pulse-bar" />
            </div>
            <div className="ai-loading-text">
              Gemini กำลังวิเคราะห์ข้อมูลเชิงลึก...
            </div>
          </div>
        )}
        {!aiLoading && !aiError && !aiInsight && (
          <button className="ai-generate-btn" onClick={onGenerateAIInsight}>
            <span className="ai-btn-sparkle">✨</span>{' '}
            วิเคราะห์ศักยภาพพื้นที่ด้วย AI
          </button>
        )}
        {!aiLoading && !aiError && aiInsight && (
          <div className="ai-insight-card">
            <div className="ai-insight-header">
              <span className="ai-insight-tag">🪄 Gemini Analyst</span>
              <button
                className="ai-refresh-btn"
                onClick={onGenerateAIInsight}
                title="วิเคราะห์ใหม่"
              >
                🔄
              </button>
            </div>
            <div className="ai-insight-content">{aiInsight}</div>
          </div>
        )}
      </div>
    </div>
  );
}
