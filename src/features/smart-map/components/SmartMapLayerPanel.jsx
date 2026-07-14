export default function SmartMapLayerPanel({
  isOpen,
  onControlsClose,
  metrics,
  activeMetric,
  onMetricToggle,
  markerLayers,
  visibleLayers,
  onLayerToggle,
  onClearPointLayers,
  layerStatusById,
  layerMetaByKey,
  isSoilLayerVisible,
  soilLayerTitle,
  soilLayerLoading,
  soilLayerError,
  onSoilLayerToggle,
  showSubdistrictLayer,
  onSubdistrictLayerToggle,
  basemap,
  onBasemapChange,
  currentMetric,
  minVal,
  maxVal,
}) {
  return (
    <div
      className={`smart-map-controls ${isOpen ? 'open' : ''}`}
      onClick={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="panel-drag-handle" />
      <div className="controls-mobile-header">
        <span>ตัวเลือกแผนที่</span>
        <button
          className="controls-close-btn"
          onClick={(event) => {
            event.stopPropagation();
            onControlsClose();
          }}
        >
          ✕
        </button>
      </div>
      <div className="controls-section-title">ตัวชี้วัด Choropleth</div>
      {metrics.map((metric) => (
        <button
          key={metric.key}
          className={`control-btn ${activeMetric === metric.key ? 'active' : ''}`}
          onClick={() => onMetricToggle(metric.key)}
        >
          <span className="control-btn-icon">{metric.icon}</span>
          <span className="control-btn-label">{metric.label}</span>
        </button>
      ))}

      <div className="controls-divider" />
      <div className="controls-section-title">ชั้นข้อมูลพิกัดฟาร์ม</div>
      <button
        type="button"
        className="control-clear-btn"
        onClick={onClearPointLayers}
      >
        ปิดทั้งหมด
      </button>
      {markerLayers
        .filter(
          (layer) =>
            !layerStatusById?.[layer.apiLayer] ||
            layerStatusById[layer.apiLayer].availability === 'active'
        )
        .map((layer) => (
        <label
          key={layer.key}
          className={`control-toggle-checkbox-label ${visibleLayers[layer.key] ? 'active' : ''}`}
          title={
            layerStatusById?.[layer.apiLayer] &&
            layerStatusById[layer.apiLayer].availability !== 'active'
              ? 'ข้อมูลยังไม่พร้อม'
              : undefined
          }
        >
          <input
            type="checkbox"
            checked={visibleLayers[layer.key]}
            onChange={() => onLayerToggle(layer.key)}
            className="control-toggle-checkbox-input"
            disabled={
              layer.disabled ||
              (layerStatusById?.[layer.apiLayer] &&
                layerStatusById[layer.apiLayer].availability !== 'active')
            }
          />
          <span
            className="control-toggle-checkbox-custom"
            style={{ '--accent-color': layer.color }}
          />
          <span
            className="control-toggle-dot"
            style={{ background: layer.color }}
          />
          <span className="control-toggle-text">
            {layer.icon} {layer.label}
            {visibleLayers[layer.key] &&
              layerMetaByKey?.[layer.key] &&
              ` แสดง ${layerMetaByKey[layer.key].count || 0} จาก ${layerStatusById?.[layer.apiLayer]?.rowCount || 0}`}
          </span>
        </label>
        ))}

      <div className="controls-divider" />
      <div className="controls-section-title">External GIS layers</div>
      <label
        className={`control-toggle-checkbox-label ${isSoilLayerVisible ? 'active' : ''}`}
        title={soilLayerTitle}
      >
        <input
          type="checkbox"
          checked={isSoilLayerVisible}
          onChange={onSoilLayerToggle}
          className="control-toggle-checkbox-input"
        />
        <span
          className="control-toggle-checkbox-custom"
          style={{ '--accent-color': '#8b5cf6' }}
        />
        <span
          className="control-toggle-dot"
          style={{ background: '#8b5cf6' }}
        />
        <span className="control-toggle-text">
          Soil series {soilLayerLoading ? '(loading...)' : ''}
        </span>
      </label>
      {soilLayerError && (
        <div className="control-layer-error">{soilLayerError}</div>
      )}
      <label
        className={`control-toggle-checkbox-label ${showSubdistrictLayer ? 'active' : ''}`}
        title="Show or hide subdistrict boundaries"
      >
        <input
          type="checkbox"
          checked={showSubdistrictLayer}
          onChange={onSubdistrictLayerToggle}
          className="control-toggle-checkbox-input"
        />
        <span
          className="control-toggle-checkbox-custom"
          style={{ '--accent-color': '#7c3aed' }}
        />
        <span
          className="control-toggle-dot"
          style={{ background: '#7c3aed' }}
        />
        <span className="control-toggle-text">ขอบเขตตำบล</span>
      </label>

      <div className="controls-divider" />
      <div className="controls-section-title">แผนที่พื้นหลัง</div>
      <div className="basemap-selector-grid">
        <button
          className={`basemap-btn ${basemap === 'osm' ? 'active' : ''}`}
          onClick={() => onBasemapChange('osm')}
          title="OpenStreetMap ภาษาไทย"
        >
          🗺️ OSM
        </button>
        <button
          className={`basemap-btn ${basemap === 'google-road' ? 'active' : ''}`}
          onClick={() => onBasemapChange('google-road')}
          title="Google Maps ถนนภาษาไทย"
        >
          🛣️ Google
        </button>
        <button
          className={`basemap-btn ${basemap === 'google-hybrid' ? 'active' : ''}`}
          onClick={() => onBasemapChange('google-hybrid')}
          title="Google Satellite ดาวเทียมภาษาไทย"
        >
          🛰️ Hybrid
        </button>
      </div>

      {currentMetric && (
        <div className="smart-map-legend">
          <div className="legend-title">
            {currentMetric.icon} {currentMetric.label} ({currentMetric.unit})
          </div>
          <div
            className="legend-bar"
            style={{
              background: `linear-gradient(90deg, ${currentMetric.colors.join(', ')})`,
            }}
          />
          <div className="legend-labels">
            <span>{minVal.toLocaleString()}</span>
            <span>{maxVal.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
