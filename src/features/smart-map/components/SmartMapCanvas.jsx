import { createElement, Fragment } from 'react';
import {
  FitBounds,
  MapFlyTo,
  MapSizeInvalidator,
  MapZoomTracker,
} from './MapControls';
import MapLayerErrorBoundary from './MapLayerErrorBoundary';

const EMPTY_STATS = {};

const DISTRICT_LABEL_POSITIONS = {
  กำแพงแสน: [14.07, 99.85], // Northwest outer edge (inside polygon)
  บางเลน: [14.14, 100.26], // Northeast outer edge (inside polygon)
  ดอนตูม: [14.03, 100.08], // Northern edge (inside polygon)
  เมืองนครปฐม: [13.75, 99.95], // Southwest outer edge (inside polygon)
  นครชัยศรี: [13.9, 100.25], // Northeast/East outer edge (inside polygon)
  สามพราน: [13.66, 100.09], // Southern/Southwest outer edge (inside polygon)
  พุทธมณฑล: [13.82, 100.32], // Northern/Northeast tip (inside polygon)
};

const getSoilProperty = (properties, keys) => {
  if (!properties) return null;
  for (const key of keys) {
    const value = properties[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return null;
};

const getSoilFeatureLabel = (properties) => {
  const series =
    getSoilProperty(properties, [
      'soilserien',
      'SOIL_SERIE',
      'SOIL_SERIES',
      'SOIL_NAME',
      'SERIES',
      'S_NAME',
      'soil_series',
      'soil_series_name',
      'soil_name',
      'series',
      'name',
    ]) || 'Soil series';
  const group = getSoilProperty(properties, [
    'soilgroup',
    'SOIL_GROUP',
    'GROUP',
    'SGROUP',
    'soil_group',
    'group',
  ]);
  const unit = getSoilProperty(properties, [
    'soilseries',
    'MAP_UNIT',
    'UNIT',
    'SYMBOL',
    'CODE',
    'map_unit',
    'symbol',
    'code',
  ]);
  const texture = getSoilProperty(properties, ['texture_to', 'TEXTURE']);
  const fertility = getSoilProperty(properties, ['fertility', 'FERTILITY']);
  const ph = getSoilProperty(properties, ['pH_top', 'PH_TOP']);
  const amphoe = getSoilProperty(properties, ['AMPHOE_T', 'amphoe']);
  const areaRai = getSoilProperty(properties, ['area_rai', 'AREA_RAI']);

  return { series, group, unit, texture, fertility, ph, amphoe, areaRai };
};

const SOIL_LAYER_COLORS = [
  '#7c3aed',
  '#0f766e',
  '#d97706',
  '#dc2626',
  '#2563eb',
  '#16a34a',
  '#c026d3',
  '#ea580c',
  '#0891b2',
  '#65a30d',
  '#be123c',
  '#4f46e5',
];

const getStableColor = (value) => {
  const text = String(value || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return SOIL_LAYER_COLORS[hash % SOIL_LAYER_COLORS.length];
};

const MARKER_STYLE = {
  young_farmer: {
    radius: 7,
    fillColor: '#fbbf24',
    color: 'rgba(255,255,255,0.6)',
    weight: 1.5,
    titleColor: '#b45309',
    badgeBg: '#fef3c7',
    badgeColor: '#b45309',
  },
  career_group: {
    radius: 7,
    fillColor: '#a855f7',
    color: 'rgba(255,255,255,0.6)',
    weight: 1.5,
    titleColor: '#6b21a8',
    badgeBg: '#f3e8ff',
    badgeColor: '#6b21a8',
  },
  forecast: {
    radius: 7,
    fillColor: '#ec4899',
    color: 'rgba(255,255,255,0.6)',
    weight: 1.5,
    titleColor: '#1e293b',
    badgeBg: '#f3e8ff',
    badgeColor: '#6b21a8',
  },
  hotspot: {
    radius: 8,
    fillColor: '#ef4444',
    color: 'rgba(255,255,255,0.8)',
    weight: 2,
    titleColor: '#dc2626',
    badgeBg: '#fee2e2',
    badgeColor: '#991b1b',
  },
};

const markerDetailStyle = {
  fontSize: 12,
  color: '#475569',
  marginBottom: 4,
};

function MarkerTooltipContent({ item, style }) {
  return (
    <div style={{ minWidth: 180 }}>
      <div
        style={{
          fontWeight: 700,
          fontSize: 14,
          marginBottom: 4,
          color: style.titleColor,
        }}
      >
        {item.type === 'hotspot' ? `🔥 ${item.name}` : item.name}
      </div>
      {item.memberCount > 0 && (
        <div style={markerDetailStyle}>
          👥 <strong>สมาชิก:</strong> {item.memberCount.toLocaleString()} ราย
        </div>
      )}
      {item.activity && (
        <div style={{ ...markerDetailStyle, marginBottom: 6 }}>
          🌾 <strong>กิจกรรมหลัก:</strong> {item.activity}
        </div>
      )}
      {item.type === 'forecast' && (
        <>
          <div style={markerDetailStyle}>
            🌾 <strong>ชนิดพืช:</strong> {item.cropType || 'ไม่ระบุ'}
          </div>
          <div style={markerDetailStyle}>
            📐 <strong>ขนาดพื้นที่:</strong>{' '}
            {item.area ? `${item.area.toLocaleString()} ไร่` : 'ไม่ระบุ'}
          </div>
          <div style={{ ...markerDetailStyle, marginBottom: 6 }}>
            📈 <strong>สถานะแปลง:</strong> {item.status || 'ไม่ระบุ'}
          </div>
        </>
      )}
      {item.type === 'hotspot' && (
        <>
          <div style={markerDetailStyle}>
            🎯 <strong>ความมั่นใจ:</strong> {item.confidence}%
          </div>
          <div style={{ ...markerDetailStyle, marginBottom: 6 }}>
            ⚡ <strong>กำลังความร้อน (FRP):</strong> {item.frp} MW
          </div>
        </>
      )}
      <div style={{ fontSize: 11, color: '#64748b' }}>
        <span
          style={{
            background: style.badgeBg,
            color: style.badgeColor,
            padding: '2px 6px',
            borderRadius: 4,
            fontWeight: 600,
          }}
        >
          {item.typeLabel}
        </span>{' '}
        {item.subdistrict ? `ต.${item.subdistrict} ` : ''}อ.
        {item.district || '-'}
      </div>
    </div>
  );
}

function MarkerLayer({
  layerKey,
  items,
  circleMarker: CircleMarker,
  tooltip: Tooltip,
}) {
  const style = MARKER_STYLE[layerKey];

  return items.map((item, idx) =>
    createElement(
      CircleMarker,
      {
        key: `${layerKey}-${idx}`,
        center: [item.lat, item.lon],
        radius: style.radius,
        fillColor: style.fillColor,
        fillOpacity: 0.9,
        color: style.color,
        weight: style.weight,
        className: `pulse-marker-${layerKey}`,
        pane: 'markerPane',
      },
      createElement(
        Tooltip,
        {
          className: 'smart-map-marker-tooltip',
          direction: 'top',
          offset: [0, -5],
          opacity: 1,
        },
        <MarkerTooltipContent item={item} style={style} />
      )
    )
  );
}

function MapLayerErrorNotice({ Pane, layerId, layerName }) {
  const ErrorPane = Pane;
  return (
    <ErrorPane
      name={`smart-map-layer-error-${layerId}`}
      style={{ zIndex: 650 }}
    >
      <div
        className="smart-map-layer-error"
        role="status"
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          maxWidth: 280,
          padding: '8px 12px',
          borderRadius: 6,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          fontSize: 12,
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.14)',
        }}
      >
        ไม่สามารถแสดง{layerName}ได้
      </div>
    </ErrorPane>
  );
}

export default function SmartMapCanvas({
  MapComponents,
  geoJSONData,
  resetKey,
  selectedDistrict,
  selectedSubdistrict,
  basemap,
  isControlsOpen,
  setMapZoom,
  districtCentroids,
  activeMetric,
  districtStats,
  subdistrictStats = EMPTY_STATS,
  choroplethLevel = 'district',
  weatherData,
  getDistrictColor,
  getWeatherDetails,
  getPm25Color,
  getPm25LevelLabel,
  setPanelClosing,
  onSelectDistrict,
  onSelectSubdistrict,
  isSoilLayerVisible,
  soilLayerData,
  soilLayerMeta,
  showSubdistrictLayer,
  mapZoom,
  visibleSubdistrictFeatures,
  markerLayers,
  visibleLayers,
  allCoords,
  layerErrors = {},
}) {
  const {
    L,
    MapContainer,
    TileLayer,
    CircleMarker,
    Marker,
    Tooltip,
    Pane,
    GeoJSON,
    useMap,
    useMapEvents,
    ZoomControl,
    Polyline,
  } = MapComponents;
  const layerFallback = (layerId, layerName) => (
    <MapLayerErrorNotice Pane={Pane} layerId={layerId} layerName={layerName} />
  );

  return (
    <div className="smart-map-container">
      <MapContainer
        center={[13.82, 100.05]}
        zoom={10}
        zoomSnap={0.25}
        zoomDelta={0.5}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <FitBounds
          useMap={useMap}
          geoJSONData={geoJSONData}
          L={L}
          resetKey={resetKey}
          selectedDistrict={selectedDistrict}
        />
        <MapSizeInvalidator
          useMap={useMap}
          watchKey={`${basemap}-${isControlsOpen}-${selectedDistrict?.name || 'none'}`}
        />
        <MapFlyTo
          useMap={useMap}
          selectedDistrict={selectedDistrict}
          centroids={districtCentroids}
        />
        <MapZoomTracker useMapEvents={useMapEvents} setMapZoom={setMapZoom} />
        <TileLayer
          key={basemap}
          attribution={
            basemap === 'osm'
              ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              : '&copy; Google Maps'
          }
          url={
            basemap === 'osm'
              ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              : basemap === 'google-road'
                ? 'https://mt1.google.com/vt/lyrs=m&hl=th&x={x}&y={y}&z={z}'
                : 'https://mt1.google.com/vt/lyrs=y&hl=th&x={x}&y={y}&z={z}'
          }
        />
        <ZoomControl position="topright" />

        {/* ===== CHOROPLETH GEOJSON ===== */}
        <MapLayerErrorBoundary
          layerName="ชั้นข้อมูลสีตามตัวชี้วัด"
          fallback={layerFallback('choropleth', 'ชั้นข้อมูลสีตามตัวชี้วัด')}
          resetOn={[
            geoJSONData,
            activeMetric,
            districtStats,
            subdistrictStats,
            choroplethLevel,
            weatherData,
          ]}
        >
          {choroplethLevel === 'district' &&
            activeMetric &&
            Object.keys(districtStats).length > 0 && (
              <GeoJSON
                key={`choropleth-${activeMetric}-${selectedDistrict ? selectedDistrict.name : 'none'}-weather-${Object.keys(weatherData).length}`}
                data={geoJSONData}
                style={(feature) => {
                  const distName = feature.properties?.amp_th;
                  const stats = districtStats[distName];
                  const value = stats ? stats[activeMetric] || 0 : 0;
                  const fillColor = getDistrictColor(value);
                  const isSelected =
                    selectedDistrict && selectedDistrict.name === distName;
                  return {
                    fillColor,
                    fillOpacity: isSelected ? 0.7 : 0.5,
                    color: isSelected ? '#ef4444' : 'rgba(15, 23, 42, 0.15)',
                    weight: isSelected ? 5 : 2,
                  };
                }}
                onEachFeature={(feature, layer) => {
                  const distName = feature.properties?.amp_th;
                  const stats = districtStats[distName] || {};
                  if (!distName) return;

                  // Fetch weather stats for tooltip
                  const w = weatherData[distName];
                  let weatherHtml = '';
                  if (w && !w.loading && !w.error) {
                    const weatherInfo = getWeatherDetails(w.weatherCode);
                    const pmColor = getPm25Color(w.pm25);
                    const pmLabel = getPm25LevelLabel(w.pm25);
                    weatherHtml = `
                                        <div class="tooltip-divider"></div>
                                        <div class="tooltip-weather">
                                            <div class="tooltip-weather-main">
                                                <span class="tooltip-weather-icon">${weatherInfo.icon}</span>
                                                <span class="tooltip-weather-temp">${w.temp !== null ? `${w.temp}°C` : '--'}</span>
                                                <span class="tooltip-weather-desc">${weatherInfo.label}</span>
                                            </div>
                                            <div class="tooltip-pm-badge" style="background-color: ${pmColor}15; color: ${pmColor}; border-color: ${pmColor}">
                                                ฝุ่น PM2.5: ${w.pm25 !== null ? w.pm25 : '--'} µg/m³ (${pmLabel})
                                            </div>
                                        </div>
                                    `;
                  } else {
                    weatherHtml = `
                                        <div class="tooltip-divider"></div>
                                        <div class="tooltip-weather-loading">
                                            ⏳ กำลังโหลดข้อมูลสภาพอากาศ...
                                        </div>
                                    `;
                  }

                  // Tooltip
                  const html = `
                                    <div class="tooltip-name">🎯 อ.${distName}</div>
                                    <div class="tooltip-row"><span>🌾 พื้นที่เกษตร</span><strong>${(stats.area || 0).toLocaleString()} ไร่</strong></div>
                                    <div class="tooltip-row"><span>🏠 ครัวเรือน</span><strong>${(stats.house || 0).toLocaleString()} ราย</strong></div>
                                    <div class="tooltip-row"><span>🤝 วิสาหกิจ</span><strong>${(stats.ce || 0).toLocaleString()} แห่ง</strong></div>
                                    <div class="tooltip-row"><span>🌱 แปลงใหญ่</span><strong>${(stats.lp || 0).toLocaleString()} แปลง</strong></div>
                                    ${weatherHtml}
                                    <div class="tooltip-hint">คลิกเพื่อดูรายละเอียด</div>
                                `;
                  layer.bindTooltip(html, {
                    sticky: true,
                    direction: 'auto',
                    className: 'smart-map-tooltip',
                  });

                  // Hover effect
                  layer.on({
                    mouseover: (e) => {
                      const isSelected =
                        selectedDistrict && selectedDistrict.name === distName;
                      e.target.setStyle({
                        fillOpacity: 0.7,
                        weight: isSelected ? 5 : 3,
                        color: isSelected ? '#ef4444' : 'rgba(15, 23, 42, 0.3)',
                      });
                    },
                    mouseout: (e) => {
                      const isSelected =
                        selectedDistrict && selectedDistrict.name === distName;
                      e.target.setStyle({
                        fillOpacity: isSelected ? 0.7 : 0.5,
                        weight: isSelected ? 5 : 2,
                        color: isSelected
                          ? '#ef4444'
                          : 'rgba(15, 23, 42, 0.15)',
                      });
                    },
                    click: () => {
                      setPanelClosing(false);
                      onSelectDistrict({
                        name: distName,
                        areaSqkm: feature.properties?.area_sqkm || 0,
                      });
                    },
                  });
                }}
              />
            )}
        </MapLayerErrorBoundary>

        <MapLayerErrorBoundary
          layerName="เส้นขอบเขตอำเภอ"
          fallback={layerFallback('district-boundaries', 'เส้นขอบเขตอำเภอ')}
          resetOn={[geoJSONData, selectedDistrict]}
        >
          {geoJSONData && (
            <GeoJSON
              key={`district-boundaries-${selectedDistrict ? selectedDistrict.name : 'none'}-${activeMetric || 'off'}`}
              data={geoJSONData}
              style={(feature) => {
                const distName = feature.properties?.amp_th;
                const isSelected =
                  selectedDistrict && selectedDistrict.name === distName;
                return {
                  fillOpacity: 0,
                  color: isSelected ? '#dc2626' : '#334155',
                  weight: isSelected ? 4.5 : 2.5,
                  opacity: isSelected ? 0.95 : 0.65,
                  dashArray: '',
                };
              }}
              interactive={false}
            />
          )}
        </MapLayerErrorBoundary>

        <MapLayerErrorBoundary
          layerName="ชั้นข้อมูลดิน"
          fallback={layerFallback('soil', 'ชั้นข้อมูลดิน')}
          resetOn={[isSoilLayerVisible, soilLayerData, soilLayerMeta]}
        >
          {isSoilLayerVisible && soilLayerData && (
            <GeoJSON
              key={`soil-series-${soilLayerData.features?.length || 0}`}
              data={soilLayerData}
              style={(feature) => {
                const props = feature.properties || {};
                const color = getStableColor(
                  props.soilgroup || props.soilseries || props.soilserien
                );
                return {
                  color,
                  weight: 1.8,
                  opacity: 0.9,
                  fillColor: color,
                  fillOpacity: 0.16,
                };
              }}
              onEachFeature={(feature, layer) => {
                const props = feature.properties || {};
                const {
                  series,
                  group,
                  unit,
                  texture,
                  fertility,
                  ph,
                  amphoe,
                  areaRai,
                } = getSoilFeatureLabel(props);
                const metaName =
                  soilLayerMeta?.name ||
                  soilLayerMeta?.title ||
                  'LDD soil series';
                const displaySeries = String(series).startsWith('ชุดดิน')
                  ? series
                  : `ชุดดิน${series}`;
                layer.bindTooltip(
                  `<div class="tooltip-name">${displaySeries}</div>
                   <div class="tooltip-row"><span>ชื่อชุดดิน</span><strong>${displaySeries}</strong></div>
                   ${unit ? `<div class="tooltip-row"><span>รหัสชุดดิน</span><strong>${unit}</strong></div>` : ''}
                   ${group ? `<div class="tooltip-row"><span>กลุ่มชุดดิน</span><strong>${group}</strong></div>` : ''}
                   ${texture ? `<div class="tooltip-row"><span>เนื้อดิน</span><strong>${texture}</strong></div>` : ''}
                   ${fertility ? `<div class="tooltip-row"><span>ความอุดมสมบูรณ์</span><strong>${fertility}</strong></div>` : ''}
                   ${ph ? `<div class="tooltip-row"><span>pH ดินบน</span><strong>${ph}</strong></div>` : ''}
                   ${areaRai ? `<div class="tooltip-row"><span>พื้นที่</span><strong>${Number(areaRai).toLocaleString('th-TH', { maximumFractionDigits: 2 })} ไร่</strong></div>` : ''}
                   ${amphoe ? `<div class="tooltip-row"><span>อำเภอ</span><strong>${amphoe}</strong></div>` : ''}
                   <div class="tooltip-hint">${metaName}</div>`,
                  {
                    sticky: true,
                    direction: 'auto',
                    className: 'smart-map-tooltip',
                  }
                );
              }}
            />
          )}
        </MapLayerErrorBoundary>

        <MapLayerErrorBoundary
          layerName="เส้นขอบเขตตำบล"
          fallback={layerFallback('subdistricts', 'เส้นขอบเขตตำบล')}
          resetOn={[
            showSubdistrictLayer,
            selectedDistrict,
            selectedSubdistrict,
            visibleSubdistrictFeatures,
            activeMetric,
            subdistrictStats,
            choroplethLevel,
          ]}
        >
          {showSubdistrictLayer &&
            (selectedDistrict || mapZoom >= 11) &&
            visibleSubdistrictFeatures.length > 0 && (
              <GeoJSON
                key={`subdistrict-${selectedDistrict?.name || 'all'}-${selectedSubdistrict?.code || 'none'}-${mapZoom}`}
                data={{
                  type: 'FeatureCollection',
                  features: visibleSubdistrictFeatures,
                }}
                style={(feature) => {
                  const name =
                    feature.properties?.tam_th ||
                    feature.properties?.tam_en ||
                    feature.properties?.tam_code;
                  const value = subdistrictStats[name]?.[activeMetric] || 0;
                  const isSelected =
                    selectedSubdistrict?.code === feature.properties?.tam_code;
                  return {
                    color: isSelected ? '#7c2d12' : '#7c3aed',
                    weight: isSelected ? 3 : 1,
                    opacity: isSelected ? 0.95 : 0.45,
                    fillColor:
                      choroplethLevel === 'subdistrict' && activeMetric
                        ? getDistrictColor(value)
                        : isSelected
                          ? '#fed7aa'
                          : '#ede9fe',
                    fillOpacity:
                      choroplethLevel === 'subdistrict' && activeMetric
                        ? isSelected
                          ? 0.7
                          : 0.5
                        : isSelected
                          ? 0.35
                          : 0.08,
                    dashArray: isSelected ? '' : '2,4',
                  };
                }}
                onEachFeature={(feature, layer) => {
                  const props = feature.properties || {};
                  const name = props.tam_th || props.tam_en || props.tam_code;
                  const district = props.amp_th || props.amp_en;
                  layer.bindTooltip(
                    `ต.${name}${district ? ` / อ.${district}` : ''}`,
                    {
                      sticky: true,
                      direction: 'auto',
                      className: 'smart-map-tooltip',
                    }
                  );
                  layer.on({
                    click: () => {
                      setPanelClosing(false);
                      const selectedDistrict = {
                        name: district,
                        areaSqkm:
                          geoJSONData.features?.find(
                            (f) => f.properties?.amp_th === district
                          )?.properties?.area_sqkm || 0,
                      };
                      onSelectSubdistrict(selectedDistrict, {
                        code: props.tam_code,
                        name,
                        areaSqkm: props.area_sqkm || 0,
                      });
                    },
                  });
                }}
              />
            )}
        </MapLayerErrorBoundary>

        {/* ===== DISTRICT LABELS ===== */}
        <MapLayerErrorBoundary
          layerName="ป้ายชื่ออำเภอ"
          fallback={layerFallback('district-labels', 'ป้ายชื่ออำเภอ')}
          resetOn={[mapZoom, L, districtCentroids, selectedDistrict]}
        >
          {mapZoom >= 10 &&
            L &&
            Object.entries(districtCentroids).map(([name, coords]) => {
              const isSelected =
                selectedDistrict && selectedDistrict.name === name;
              const labelHtml = `<div class="map-label-name">${name}</div>`;
              const labelPos = DISTRICT_LABEL_POSITIONS[name] || coords;

              return (
                <Fragment key={`label-group-${name}`}>
                  <Polyline
                    positions={[coords, labelPos]}
                    pathOptions={{
                      color: isSelected ? '#ef4444' : '#64748b',
                      weight: isSelected ? 2.5 : 1.2,
                      dashArray: '5, 5',
                      opacity: isSelected ? 0.9 : 0.4,
                    }}
                    interactive={false}
                  />
                  <Marker
                    key={`label-${name}`}
                    position={labelPos}
                    interactive={true}
                    eventHandlers={{
                      click: () => {
                        setPanelClosing(false);
                        const feat = geoJSONData?.features?.find(
                          (f) => f.properties?.amp_th === name
                        );
                        onSelectDistrict({
                          name,
                          areaSqkm: feat?.properties?.area_sqkm || 0,
                        });
                      },
                    }}
                    icon={L.divIcon({
                      className: 'district-map-label-container',
                      html: `<div class="district-map-label ${isSelected ? 'selected' : ''}">${labelHtml}</div>`,
                      iconSize: [0, 0],
                    })}
                  />
                </Fragment>
              );
            })}
        </MapLayerErrorBoundary>

        {markerLayers.map(({ key }) => (
          <MapLayerErrorBoundary
            key={key}
            layerName={key}
            fallback={layerFallback(key, key)}
            resetOn={[visibleLayers[key], allCoords[key]]}
          >
            {visibleLayers[key] && layerErrors[key]
              ? layerFallback(key, key)
              : visibleLayers[key] && (
                  <MarkerLayer
                    layerKey={key}
                    items={allCoords[key]}
                    circleMarker={CircleMarker}
                    tooltip={Tooltip}
                  />
                )}
          </MapLayerErrorBoundary>
        ))}
      </MapContainer>
    </div>
  );
}
