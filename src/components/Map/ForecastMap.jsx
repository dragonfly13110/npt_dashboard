import { useState, useEffect, useMemo } from 'react';
import { Spin, Tag, Empty } from 'antd';
import { utmToLatLng } from '../../utils/geo';
import districtGeoJSON from '../../data/nakhon_pathom_districts.json';

const PLOT_TYPE_COLORS = {
    'พื้นที่เสี่ยง': '#cf222e',
    'ศจช.': '#0969da',
    'ศจช': '#0969da',
    'พื้นที่เฝ้าระวัง': '#bf8700',
    'ไม่ระบุ': '#656d76',
};

const CROP_STATUS_COLORS = {
    'สมบูรณ์': '#1a7f37',
    'ปกติ': '#1a7f37',
    'เสียหาย': '#cf222e',
    'กำลังเติบโต': '#bf8700',
};

export default function ForecastMap({ data = [] }) {
    const [MapComponents, setMapComponents] = useState(null);

    useEffect(() => {
        Promise.all([
            import('leaflet'),
            import('react-leaflet'),
        ]).then(([L, RL]) => {
            delete L.default.Icon.Default.prototype._getIconUrl;
            L.default.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });
            setMapComponents({ L: L.default, ...RL });
        });
    }, []);

    // Convert UTM coordinates to lat/lng
    const mapPoints = useMemo(() => {
        return data
            .filter(item => item.coord_x && item.coord_y)
            .map(item => {
                const x = parseFloat(item.coord_x);
                const y = parseFloat(item.coord_y);
                if (isNaN(x) || isNaN(y)) return null;
                const { lat, lng } = utmToLatLng(x, y, 47, 'N');
                if (lat === 0 && lng === 0) return null;
                return { ...item, lat, lng };
            })
            .filter(Boolean);
    }, [data]);

    if (!MapComponents) {
        return (
            <div style={{ height: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin tip="กำลังโหลดแผนที่..." />
            </div>
        );
    }

    if (mapPoints.length === 0) {
        return (
            <div style={{ height: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="ไม่มีข้อมูลพิกัดสำหรับแสดงบนแผนที่" />
            </div>
        );
    }

    const { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON } = MapComponents;

    // Calculate center from average of all points
    const centerLat = mapPoints.reduce((sum, p) => sum + p.lat, 0) / mapPoints.length;
    const centerLng = mapPoints.reduce((sum, p) => sum + p.lng, 0) / mapPoints.length;

    return (
        <div className="forecast-map-wrapper">
            <MapContainer
                center={[centerLat, centerLng]}
                zoom={10}
                style={{ height: 700, borderRadius: 12, border: '1px solid #e8ecf0' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {districtGeoJSON && (
                    <GeoJSON
                        data={districtGeoJSON}
                        style={{
                            color: '#1a7f37', // A slightly visible green/blue
                            weight: 2,
                            opacity: 0.6,
                            fillColor: 'transparent',
                            fillOpacity: 0.0,
                            dashArray: '5, 5'
                        }}
                        onEachFeature={(feature, layer) => {
                            if (feature.properties && feature.properties.AMP_NAMT) {
                                layer.bindTooltip(`อำเภอ${feature.properties.AMP_NAMT}`, {
                                    sticky: true,
                                    direction: 'auto',
                                });
                            }
                        }}
                    />
                )}


                {mapPoints.map((item, idx) => {
                    const color = PLOT_TYPE_COLORS[item.plot_type] || '#8250df';
                    return (
                        <CircleMarker
                            key={item.id || idx}
                            center={[item.lat, item.lng]}
                            radius={8}
                            fillColor={color}
                            fillOpacity={0.85}
                            color="#fff"
                            weight={2}
                        >
                            <Popup>
                                <div style={{ fontFamily: 'inherit', minWidth: 200, fontSize: 13 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#1f2328' }}>
                                        แปลงพยากรณ์ #{item.id || item.row_number || idx + 1}
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <tbody>
                                            {item.district && (
                                                <tr>
                                                    <td style={{ color: '#656d76', paddingRight: 8, paddingBottom: 3 }}>อำเภอ</td>
                                                    <td style={{ fontWeight: 500 }}>
                                                        {item.district}
                                                        {item.subdistrict && ` / ${item.subdistrict}`}
                                                    </td>
                                                </tr>
                                            )}
                                            {item.crop_type && (
                                                <tr>
                                                    <td style={{ color: '#656d76', paddingRight: 8, paddingBottom: 3 }}>ชนิดพืช</td>
                                                    <td style={{ fontWeight: 500 }}>{item.crop_type}{item.variety ? ` (${item.variety})` : ''}</td>
                                                </tr>
                                            )}
                                            {item.planted_area_rai && (
                                                <tr>
                                                    <td style={{ color: '#656d76', paddingRight: 8, paddingBottom: 3 }}>พื้นที่</td>
                                                    <td style={{ fontWeight: 500 }}>{item.planted_area_rai} ไร่</td>
                                                </tr>
                                            )}
                                            {item.plot_type && (
                                                <tr>
                                                    <td style={{ color: '#656d76', paddingRight: 8, paddingBottom: 3 }}>ประเภท</td>
                                                    <td>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            padding: '1px 8px',
                                                            borderRadius: 6,
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            background: color + '18',
                                                            color: color,
                                                        }}>
                                                            {item.plot_type}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )}
                                            {item.crop_status && item.crop_status !== 'ไม่ระบุ' && (
                                                <tr>
                                                    <td style={{ color: '#656d76', paddingRight: 8, paddingBottom: 3 }}>สถานะ</td>
                                                    <td style={{ fontWeight: 600, color: CROP_STATUS_COLORS[item.crop_status] || '#656d76' }}>
                                                        {item.crop_status}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>

            {/* Legend */}
            <div style={{
                display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12, padding: '8px 12px',
                background: '#f6f8fa', borderRadius: 8, border: '1px solid #e8ecf0',
            }}>
                <span style={{ fontSize: 12, color: '#656d76', fontWeight: 600, marginRight: 4 }}>ประเภทแปลง:</span>
                {Object.entries(PLOT_TYPE_COLORS).filter(([k]) => k !== 'ศจช').map(([label, color]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <span style={{
                            width: 10, height: 10, borderRadius: '50%',
                            background: color, display: 'inline-block', border: '2px solid #fff',
                            boxShadow: '0 0 0 1px ' + color + '40',
                        }} />
                        <span style={{ color: '#656d76' }}>{label}</span>
                    </div>
                ))}
                <span style={{ fontSize: 12, color: '#8b949e' }}>
                    ({mapPoints.length} จาก {data.length} แปลง มีพิกัด)
                </span>
            </div>
        </div>
    );
}
