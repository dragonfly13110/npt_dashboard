import { useEffect, useState } from 'react';
import { Empty, Spin } from 'antd';
import districtGeoJSON from '../../data/nakhon_pathom_districts.json';
import { groupPointsByYear } from '../../utils/floodData';

const MAP_HEIGHT = 680;

const GROUP_COLORS = {
  ข้าว: '#2563eb',
  พืชผัก: '#16a34a',
  ไม้ผล: '#f59e0b',
  ไม้ดอก: '#db2777',
  ไม้ยืนต้น: '#7c3aed',
  พืชไร่: '#0891b2',
};

export default function FloodMap({ points }) {
  const [map, setMap] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      import('react-leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([reactLeaflet]) => {
      if (active) setMap(reactLeaflet);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!map) {
    return (
      <div
        style={{ height: MAP_HEIGHT, display: 'grid', placeItems: 'center' }}
      >
        <Spin />
      </div>
    );
  }
  if (!points.length) {
    return (
      <div
        style={{ height: MAP_HEIGHT, display: 'grid', placeItems: 'center' }}
      >
        <Empty description="ไม่มีพิกัดในตัวกรองนี้" />
      </div>
    );
  }

  const {
    MapContainer,
    TileLayer,
    CircleMarker,
    Popup,
    GeoJSON,
    LayersControl,
    LayerGroup,
  } = map;
  return (
    <MapContainer
      center={[13.82, 100.04]}
      zoom={10.5}
      zoomDelta={0.5}
      zoomSnap={0.5}
      preferCanvas
      style={{ height: MAP_HEIGHT, borderRadius: 8 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <GeoJSON
        data={districtGeoJSON}
        style={{ color: '#166534', weight: 2, fillOpacity: 0.02 }}
      />
      <LayersControl position="topright">
        {groupPointsByYear(points).map(([year, yearPoints]) => (
          <LayersControl.Overlay checked key={year} name={`ปี ${year}`}>
            <LayerGroup>
              {yearPoints.map((point) => (
                <CircleMarker
                  key={point.id}
                  center={[point.lat, point.lng]}
                  radius={Math.min(
                    8,
                    2 + Math.sqrt(point.affected_area_rai || 0)
                  )}
                  color="#fff"
                  weight={1}
                  fillColor={GROUP_COLORS[point.activity_group] || '#64748b'}
                  fillOpacity={0.75}
                >
                  <Popup>
                    <strong>{point.crop_type}</strong>
                    <div>
                      ปี {point.year} · อ.{point.district} ต.
                      {point.subdistrict} หมู่ {point.village_no}
                    </div>
                    <div>
                      กลุ่ม {point.activity_group}
                      {point.variety ? ` · พันธุ์ ${point.variety}` : ''}
                    </div>
                    <div>
                      พื้นที่ประสบภัย{' '}
                      {point.affected_area_rai.toLocaleString('th-TH')} ไร่
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </LayerGroup>
          </LayersControl.Overlay>
        ))}
      </LayersControl>
    </MapContainer>
  );
}
