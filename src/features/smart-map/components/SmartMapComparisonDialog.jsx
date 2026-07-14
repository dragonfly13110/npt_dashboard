import SmartMapMiniBarChart from './SmartMapMiniBarChart';

const cropChartDataFor = (data) =>
  [
    { label: 'นาปี', value: data.ricePi || 0, color: '#22c55e' },
    { label: 'นาปรัง', value: data.ricePrung || 0, color: '#3b82f6' },
    { label: 'พืชไร่', value: data.field || 0, color: '#eab308' },
    { label: 'ไม้ผล', value: data.fruit || 0, color: '#f97316' },
    {
      label: 'ผัก/สมุนไพร',
      value: (data.veg || 0) + (data.herb || 0),
      color: '#8b5cf6',
    },
    { label: 'ไม้ดอก', value: data.flow || 0, color: '#ec4899' },
  ].filter((item) => item.value > 0);

function Stats({ data }) {
  return (
    <div className="compare-section">
      <h3>🌾 สถิติหลัก</h3>
      {[
        ['พื้นที่เกษตรกรรม', data.area, 'ไร่'],
        ['ครัวเรือนเกษตร', data.house, 'ราย'],
        ['วิสาหกิจชุมชน', data.ce, 'แห่ง'],
        ['แปลงใหญ่', data.lp, 'แปลง'],
        ['Smart Farmer', data.sfSfCount, 'ราย'],
        ['Young Smart Farmer', data.ysfCount, 'ราย'],
      ].map(([label, value, unit]) => (
        <div className="compare-stat-row" key={label}>
          <span>{label}</span>
          <strong>
            {(value || 0).toLocaleString()} {unit}
          </strong>
        </div>
      ))}
    </div>
  );
}

function Weather({
  weather,
  getWeatherDetails,
  getPm25Color,
  getPm25LevelLabel,
}) {
  if (!weather)
    return <div className="compare-no-data">ไม่มีข้อมูลสภาพอากาศ</div>;

  const weatherInfo = getWeatherDetails(weather.weatherCode);
  const pmColor = getPm25Color(weather.pm25);
  return (
    <div className="compare-weather-grid">
      <div className="compare-weather-main">
        <span className="compare-weather-icon">{weatherInfo.icon}</span>
        <span>
          {weather.temp !== null ? `${weather.temp}°C` : '--'} (
          {weatherInfo.label})
        </span>
      </div>
      <div
        className="compare-pm-badge"
        style={{
          backgroundColor: pmColor + '15',
          color: pmColor,
          borderColor: pmColor,
        }}
      >
        PM2.5: {weather.pm25 !== null ? weather.pm25 : '--'} µg/m³ (
        {getPm25LevelLabel(weather.pm25)})
      </div>
      <div className="compare-weather-subs">
        <span>
          💧 ชื้น: {weather.humidity !== null ? `${weather.humidity}%` : '--'}
        </span>
        <span>
          💨 ลม:{' '}
          {weather.windSpeed !== null ? `${weather.windSpeed} กม./ชม.` : '--'}
        </span>
      </div>
    </div>
  );
}

function WhatIf({
  data,
  riceConversion,
  onRiceConversionChange,
  residueManagement,
  onResidueManagementChange,
  results,
}) {
  return (
    <div className="compare-section compare-policy-box">
      <h3>🎛️ จำลองผลลัพธ์ยุทธศาสตร์ (What-If)</h3>
      <div className="simulation-slider-group">
        <div className="slider-header">
          <span className="slider-label">เปลี่ยนนาปรัง: {riceConversion}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="50"
          step="5"
          value={riceConversion}
          onChange={(event) =>
            onRiceConversionChange(parseInt(event.target.value))
          }
          disabled={!(data.ricePrung > 0)}
          className="sim-range-input"
        />
      </div>
      <div className="simulation-slider-group">
        <div className="slider-header">
          <span className="slider-label">ลดการเผา: {residueManagement}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="10"
          value={residueManagement}
          onChange={(event) =>
            onResidueManagementChange(parseInt(event.target.value))
          }
          disabled={!((data.ricePi || 0) + (data.ricePrung || 0) > 0)}
          className="sim-range-input"
        />
      </div>
      <div className="compare-sim-results">
        <div className="sim-res-item">
          💧 ประหยัดน้ำ: <strong>{results.waterSaved.toLocaleString()}</strong>{' '}
          ลบ.ม.
        </div>
        <div className="sim-res-item">
          💰 รายได้เพิ่ม:{' '}
          <strong>+{results.incomeAdded.toLocaleString()}</strong> บาท
        </div>
        <div className="sim-res-item">
          🍃 ลด CO2e: <strong>{results.co2Reduced.toFixed(1)}</strong> ตัน
        </div>
        <div className="sim-res-item">
          🔥 ลดจุดร้อน: <strong>-{results.hotspotReduction.toFixed(1)}%</strong>
        </div>
      </div>
    </div>
  );
}

function DistrictContent({
  data,
  weather,
  getWeatherDetails,
  getPm25Color,
  getPm25LevelLabel,
  cropChartData,
  riceConversion,
  onRiceConversionChange,
  residueManagement,
  onResidueManagementChange,
  simulationResults,
}) {
  if (!data)
    return <div className="compare-no-data">ไม่มีข้อมูลสำหรับอำเภอนี้</div>;
  return (
    <>
      <Stats data={data} />
      <div className="compare-section compare-weather">
        <h3>🌤️ อากาศสด & PM2.5</h3>
        <Weather
          {...{ weather, getWeatherDetails, getPm25Color, getPm25LevelLabel }}
        />
      </div>
      <div className="compare-section">
        <h3>🚜 สัดส่วนพื้นที่เพาะปลูก</h3>
        <SmartMapMiniBarChart data={cropChartData} />
      </div>
      <div className="compare-section">
        <h3>⚠️ ภัยพิบัติ & จุดความร้อน</h3>
        {[
          ['พื้นที่ประสบภัย', data.disasterArea, 'ไร่'],
          ['ศัตรูพืชระบาด', data.pestArea, 'ไร่'],
          ['จุดความร้อนสะสม', data.fireCount, 'จุด'],
        ].map(([label, value, unit]) => (
          <div className="compare-stat-row" key={label}>
            <span>{label}</span>
            <strong>
              {(value || 0).toLocaleString()} {unit}
            </strong>
          </div>
        ))}
      </div>
      <WhatIf
        data={data}
        riceConversion={riceConversion}
        onRiceConversionChange={onRiceConversionChange}
        residueManagement={residueManagement}
        onResidueManagementChange={onResidueManagementChange}
        results={simulationResults}
      />
    </>
  );
}

export default function SmartMapComparisonDialog({
  selectedDistrict,
  selectedData,
  districtStats,
  districtNames,
  compareWithDistrictName,
  onCompareDistrictChange,
  onClose,
  weatherData,
  getWeatherDetails,
  getPm25Color,
  getPm25LevelLabel,
  cropChartData,
  simRiceConversion,
  onSimRiceConversionChange,
  simResidueManagement,
  onSimResidueManagementChange,
  simulationResults,
  compareAreaSqkm,
  compSimRiceConversion,
  onCompSimRiceConversionChange,
  compSimResidueManagement,
  onCompSimResidueManagementChange,
}) {
  const comparedData = districtStats[compareWithDistrictName];
  const compRicePrung = comparedData?.ricePrung || 0;
  const compTotalRice = compRicePrung + (comparedData?.ricePi || 0);
  const comparedResults = {
    waterSaved: Math.round(compRicePrung * (compSimRiceConversion / 100) * 600),
    incomeAdded: Math.round(
      compRicePrung * (compSimRiceConversion / 100) * 12000
    ),
    hotspotReduction: compSimResidueManagement * 0.8,
    co2Reduced: compTotalRice * (compSimResidueManagement / 100) * 0.35,
  };

  return (
    <div className="district-compare-modal-overlay" onClick={onClose}>
      <div
        className="district-compare-modal"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="compare-modal-header">
          <h2>📊 เปรียบเทียบข้อมูลรายอำเภอ (District Comparison)</h2>
          <button
            className="compare-modal-close"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            onTouchStart={(event) => {
              event.stopPropagation();
              onClose();
            }}
          >
            ✕
          </button>
        </div>
        <div className="compare-modal-body">
          <div className="compare-column compare-column-a">
            <div className="compare-column-header">
              <div className="compare-district-title">
                อ.{selectedDistrict.name} (หลัก)
              </div>
              <div className="compare-district-subtitle">
                พื้นที่ {selectedDistrict.areaSqkm?.toFixed(1)} ตร.กม.
              </div>
            </div>
            <DistrictContent
              data={selectedData}
              weather={weatherData[selectedDistrict.name]}
              getWeatherDetails={getWeatherDetails}
              getPm25Color={getPm25Color}
              getPm25LevelLabel={getPm25LevelLabel}
              cropChartData={cropChartData}
              riceConversion={simRiceConversion}
              onRiceConversionChange={onSimRiceConversionChange}
              residueManagement={simResidueManagement}
              onResidueManagementChange={onSimResidueManagementChange}
              simulationResults={simulationResults}
            />
          </div>
          <div className="compare-column compare-column-b">
            <div className="compare-column-header">
              <div className="compare-selector-wrapper">
                <label htmlFor="compare-district-select">เปรียบเทียบกับ:</label>
                <select
                  id="compare-district-select"
                  value={compareWithDistrictName || ''}
                  onChange={(event) =>
                    onCompareDistrictChange(event.target.value)
                  }
                  className="compare-district-select"
                >
                  {districtNames
                    .filter((name) => name !== selectedDistrict.name)
                    .map((name) => (
                      <option key={name} value={name}>
                        อ.{name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="compare-district-subtitle">
                พื้นที่ {compareAreaSqkm?.toFixed(1) || '--'} ตร.กม.
              </div>
            </div>
            <DistrictContent
              data={comparedData}
              weather={weatherData[compareWithDistrictName]}
              getWeatherDetails={getWeatherDetails}
              getPm25Color={getPm25Color}
              getPm25LevelLabel={getPm25LevelLabel}
              cropChartData={comparedData ? cropChartDataFor(comparedData) : []}
              riceConversion={compSimRiceConversion}
              onRiceConversionChange={onCompSimRiceConversionChange}
              residueManagement={compSimResidueManagement}
              onResidueManagementChange={onCompSimResidueManagementChange}
              simulationResults={comparedResults}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
