export default function SmartMapPointLayerDropdown({
  markerLayers,
  visibleLayers,
  onLayerToggle,
  onClear,
  layerStatusById,
  layerMetaByKey,
}) {
  const layers = markerLayers.filter(
    (layer) => layerStatusById?.[layer.apiLayer]?.availability === 'active'
  );
  return (
    <details className="smart-map-point-dropdown">
      <summary>📍 ชั้นข้อมูลพิกัดฟาร์ม</summary>
      <div className="smart-map-point-dropdown-menu">
        <button type="button" onClick={onClear}>ปิดทั้งหมด</button>
        {layers.map((layer) => (
          <label key={layer.key}>
            <input
              type="checkbox"
              checked={visibleLayers[layer.key]}
              onChange={() => onLayerToggle(layer.key)}
            />
            <span style={{ color: layer.color }}>●</span> {layer.icon} {layer.label}
            {visibleLayers[layer.key] && layerMetaByKey?.[layer.key]
              ? ` (${layerMetaByKey[layer.key].count || 0}/${layerStatusById[layer.apiLayer].rowCount || 0})`
              : ''}
          </label>
        ))}
      </div>
    </details>
  );
}
