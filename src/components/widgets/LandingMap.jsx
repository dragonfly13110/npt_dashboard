import { useEffect, useState } from 'react';

export default function LandingMap({ mapData, districtStats }) {
    const [MapComponents, setMapComponents] = useState(null);
    const [geoJSONData, setGeoJSONData] = useState(null);

    useEffect(() => {
        // Load GeoJSON data directly
        import('../../data/nakhon_pathom_districts.json').then(module => {
            setGeoJSONData(module.default);
        });

        // Dynamic import to avoid SSR issues
        Promise.all([
            import('leaflet'),
            import('react-leaflet'),
        ]).then(([L, RL]) => {
            // Fix default icon issue
            delete L.default.Icon.Default.prototype._getIconUrl;
            L.default.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });

            setMapComponents({ L: L.default, ...RL });
        });
    }, []);

    if (!MapComponents) {
        return <div className="map-placeholder">กำลังโหลดแผนที่...</div>;
    }
    const { MapContainer, TileLayer, Popup, CircleMarker, GeoJSON, LayersControl, LayerGroup } = MapComponents;

    const gisMarkers = mapData.filter(d => d.type === 'gis');
    const tourMarkers = mapData.filter(d => d.type === 'tourism');

    return (
        <div className="bento-map-wrapper">
            <MapContainer
                center={[13.82, 100.06]}
                zoom={10}
                zoomSnap={0.25}
                zoomDelta={0.5}
                style={{ height: '100%', width: '100%', borderRadius: 16 }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LayersControl position="topright">
                    <LayersControl.Overlay checked name="🗺️ ขอบเขตอำเภอและข้อมูลเชิงลึก">
                        {geoJSONData && Object.keys(districtStats).length > 0 && (
                            <GeoJSON
                                key={Object.keys(districtStats).length}
                                data={geoJSONData}
                                style={{
                                    color: '#3b82f6', // blue-500
                                    weight: 2,
                                    opacity: 0.7,
                                    fillColor: '#93c5fd', // blue-300
                                    fillOpacity: 0.15,
                                    dashArray: '5, 5'
                                }}
                                onEachFeature={(feature, layer) => {
                                    const distName = feature.properties?.amp_th;
                                    if (distName && districtStats[distName]) {
                                        const stats = districtStats[distName];
                                        const html = `
                                            <div class="dist-tooltip">
                                                <div class="dist-tooltip-title">🎯 อำเภอ${distName}</div>
                                                <div class="dist-tooltip-row">
                                                    <span class="dist-label">🌱 พื้นที่การเกษตร</span>
                                                    <span class="dist-val highlight">${stats.area.toLocaleString()} <small>ไร่</small></span>
                                                </div>
                                                <div class="dist-tooltip-row">
                                                    <span class="dist-label">👨‍🌾 ครัวเรือนเกษตรกร</span>
                                                    <span class="dist-val">${stats.house.toLocaleString()} <small>ราย</small></span>
                                                </div>
                                                <div class="dist-tooltip-row">
                                                    <span class="dist-label">🤝 วิสาหกิจชุมชน</span>
                                                    <span class="dist-val">${stats.ce.toLocaleString()} <small>แห่ง</small></span>
                                                </div>
                                                <div class="dist-tooltip-row">
                                                    <span class="dist-label">🌾 แปลงใหญ่</span>
                                                    <span class="dist-val">${stats.lp.toLocaleString()} <small>แปลง</small></span>
                                                </div>
                                                <div class="dist-tooltip-divider">รายละเอียดพื้นที่ (ไร่)</div>
                                                <div class="dist-tooltip-grid">
                                                    <div class="dist-grid-item"><span title="ข้าวนาปี">🌾 นาปี:</span> <strong>${stats.ricePi.toLocaleString()}</strong></div>
                                                    <div class="dist-grid-item"><span title="ข้าวนาปรัง">🌾 นาปรัง:</span> <strong>${stats.ricePrung.toLocaleString()}</strong></div>
                                                    <div class="dist-grid-item"><span title="พืชไร่">🌽 พืชไร่:</span> <strong>${stats.field.toLocaleString()}</strong></div>
                                                    <div class="dist-grid-item"><span title="ไม้ผล">🍎 ไม้ผล:</span> <strong>${stats.fruit.toLocaleString()}</strong></div>
                                                    <div class="dist-grid-item"><span title="ผัก/สมุนไพร">🥬 ผัก/สมุนไพร:</span> <strong>${(stats.veg + stats.herb).toLocaleString()}</strong></div>
                                                    <div class="dist-grid-item"><span title="ไม้ดอกไม้ประดับ">🌸 ไม้ดอก:</span> <strong>${stats.flow.toLocaleString()}</strong></div>
                                                <div class="dist-tooltip-divider">กลุ่มและศูนย์การเรียนรู้</div>
                                                <div class="dist-tooltip-grid">
                                                    <div class="dist-grid-item"><span title="กลุ่มแม่บ้านเกษตรกร">👩‍🌾 แม่บ้าน:</span> <strong>${stats.instHousewives.toLocaleString()}</strong></div>
                                                    <div class="dist-grid-item"><span title="กลุ่มยุวเกษตรกร">👦 ยุวเกษตร:</span> <strong>${stats.instYoung.toLocaleString()}</strong></div>
                                                    <div class="dist-grid-item"><span title="กลุ่มส่งเสริมอาชีพ">💼 อาชีพ:</span> <strong>${stats.instCareer.toLocaleString()}</strong></div>
                                                    <div class="dist-grid-item"><span title="ศูนย์เรียนรู้การเพิ่มประสิทธิภาพการผลิตสินค้าเกษตร">🏫 ศพก.:</span> <strong>${stats.lc.toLocaleString()}</strong></div>
                                                    <div class="dist-grid-item"><span title="ศูนย์จัดการศัตรูพืชชุมชน">🐛 ศจช.:</span> <strong>${stats.pc.toLocaleString()}</strong></div>
                                                    <div class="dist-grid-item"><span title="ศูนย์จัดการดินและปุ๋ยชุมชน">🌱 ศดปช.:</span> <strong>${stats.sfc.toLocaleString()}</strong></div>
                                                </div>
                                            </div>
                                        `;
                                        layer.bindTooltip(html, {
                                            sticky: true,
                                            direction: 'auto',
                                            className: 'dist-tooltip-container'
                                        });
                                        layer.on({
                                            mouseover: (e) => {
                                                const l = e.target;
                                                l.setStyle({ fillOpacity: 0.35, color: '#1d4ed8', weight: 3 });
                                            },
                                            mouseout: (e) => {
                                                const l = e.target;
                                                l.setStyle({ fillOpacity: 0.15, color: '#3b82f6', weight: 2 });
                                            }
                                        });
                                    }
                                }}
                            />
                        )}
                    </LayersControl.Overlay>
                    <LayersControl.Overlay checked name="📍 พื้นที่ GIS (หมุดสีน้ำเงิน)">
                        <LayerGroup>
                            {gisMarkers.map((item, idx) => (
                                <CircleMarker
                                    key={`gis-${idx}`}
                                    center={[item.lat, item.lon]}
                                    radius={8}
                                    fillColor="#2563eb"
                                    fillOpacity={0.85}
                                    color="#fff"
                                    weight={2}
                                >
                                    <Popup>
                                        <div style={{ fontFamily: 'inherit', minWidth: 160 }}>
                                            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: '#1e293b' }}>
                                                {item.name}
                                            </div>
                                            <div style={{ fontSize: 13, color: '#64748b', display: 'flex', gap: 6 }}>
                                                <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 4 }}>
                                                    {item.typeLabel}
                                                </span>
                                                <span>อ.{item.district}</span>
                                            </div>
                                        </div>
                                        </Popup>
                                </CircleMarker>
                            ))}
                        </LayerGroup>
                    </LayersControl.Overlay>
                    <LayersControl.Overlay checked name="🏕️ ท่องเที่ยวเชิงเกษตร (หมุดสีเขียว)">
                        <LayerGroup>
                            {tourMarkers.map((item, idx) => (
                                <CircleMarker
                                    key={`tour-${idx}`}
                                    center={[item.lat, item.lon]}
                                    radius={8}
                                    fillColor="#16a34a"
                                    fillOpacity={0.85}
                                    color="#fff"
                                    weight={2}
                                >
                                    <Popup>
                                        <div style={{ fontFamily: 'inherit', minWidth: 160 }}>
                                            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: '#1e293b' }}>
                                                {item.name}
                                            </div>
                                            <div style={{ fontSize: 13, color: '#64748b', display: 'flex', gap: 6 }}>
                                                <span style={{ background: '#dcfce3', color: '#166534', padding: '2px 6px', borderRadius: 4 }}>
                                                    {item.typeLabel}
                                                </span>
                                                <span>อ.{item.district}</span>
                                            </div>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            ))}
                        </LayerGroup>
                    </LayersControl.Overlay>
                </LayersControl>
            </MapContainer>
        </div>
    );
}
