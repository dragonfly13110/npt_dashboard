import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Col, Row, Select, Spin, Table, Tag } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import { supabase } from '../../supabaseClient';
import EChart from '../../components/widgets/EChart';

const SOIL_COLORS = [
  '#15803d',
  '#0f766e',
  '#2563eb',
  '#7c3aed',
  '#c2410c',
  '#b45309',
  '#be123c',
  '#4d7c0f',
  '#0891b2',
  '#9333ea',
  '#64748b',
];

const thaiNumber = new Intl.NumberFormat('th-TH', {
  maximumFractionDigits: 2,
});

const columns = [
  {
    title: 'ชุดดิน',
    dataIndex: 'soil_series_name',
    key: 'soil_series_name',
    width: 170,
    fixed: 'left',
    render: (value, row) => (
      <div>
        <strong>{value}</strong>
        {row.soil_series_code && (
          <div style={{ color: '#64748b', fontSize: 12 }}>
            {row.soil_series_code}
          </div>
        )}
      </div>
    ),
  },
  {
    title: 'กลุ่มชุดดิน',
    dataIndex: 'soil_group',
    key: 'soil_group',
    width: 110,
    align: 'center',
    render: (value) => (value ? <Tag color="green">{value}</Tag> : '-'),
  },
  { title: 'เนื้อดิน', dataIndex: 'texture', key: 'texture', width: 190 },
  {
    title: 'ความอุดมสมบูรณ์',
    dataIndex: 'fertility',
    key: 'fertility',
    width: 150,
  },
  { title: 'pH ดินบน', dataIndex: 'ph_top', key: 'ph_top', width: 180 },
  { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 140 },
  {
    title: 'พื้นที่ (ไร่)',
    dataIndex: 'area_rai',
    key: 'area_rai',
    width: 130,
    align: 'right',
    render: (value) =>
      typeof value === 'number'
        ? value.toLocaleString('th-TH', { maximumFractionDigits: 2 })
        : '-',
  },
  {
    title: 'แหล่งข้อมูล',
    dataIndex: 'source_dataset',
    key: 'source_dataset',
    width: 220,
  },
];

function uniqOptions(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), 'th'))
    .map((value) => ({ label: value, value }));
}

function colorFor(value) {
  const text = String(value || 'ไม่ระบุ');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % SOIL_COLORS.length;
  }
  return SOIL_COLORS[Math.abs(hash)];
}

function escapeHtml(value) {
  return String(value ?? '-')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function aggregateArea(rows, key) {
  const grouped = new Map();
  rows.forEach((row) => {
    const label = row[key] || 'ไม่ระบุ';
    grouped.set(label, (grouped.get(label) || 0) + Number(row.area_rai || 0));
  });
  return [...grouped.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function aggregateCount(rows, key) {
  const grouped = new Map();
  rows.forEach((row) => {
    const label = row[key] || 'ไม่ระบุ';
    grouped.set(label, (grouped.get(label) || 0) + 1);
  });
  return [...grouped.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function topWithOther(items, limit = 8) {
  if (items.length <= limit) return items;
  const visible = items.slice(0, limit);
  const other = items.slice(limit).reduce((sum, item) => sum + item.value, 0);
  return [...visible, { name: 'อื่น ๆ', value: other }];
}

function MapFitBounds({ L, geojson, useMap }) {
  const map = useMap();

  useEffect(() => {
    if (!L || !geojson.features.length) return;
    const bounds = L.geoJSON(geojson).getBounds();
    if (!bounds.isValid()) return;

    window.setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds.pad(-0.08), {
        animate: false,
        maxZoom: 12,
        padding: [8, 8],
      });
    }, 0);
  }, [L, geojson, map]);

  return null;
}

function SoilDetailPanel({ row }) {
  if (!row) {
    return (
      <div style={{ color: '#64748b', padding: 16 }}>
        ชี้พื้นที่บนแผนที่เพื่อดูรายละเอียดชุดดิน
      </div>
    );
  }

  const items = [
    ['รหัสชุดดิน', row.soil_series_code],
    ['กลุ่มชุดดิน', row.soil_group],
    ['อำเภอ', row.district],
    ['เนื้อดิน', row.texture],
    ['ความอุดมสมบูรณ์', row.fertility],
    ['pH ดินบน', row.ph_top],
    ['พื้นที่', `${thaiNumber.format(Number(row.area_rai || 0))} ไร่`],
  ];

  return (
    <div style={{ display: 'grid', gap: 12, padding: 16 }}>
      <div>
        <div style={{ color: '#64748b', fontSize: 12 }}>ชุดดินที่เลือก</div>
        <h3 style={{ color: '#0f172a', margin: '4px 0 0' }}>
          {row.soil_series_name || '-'}
        </h3>
      </div>
      {items.map(([label, value]) => (
        <div
          key={label}
          style={{
            borderBottom: '1px solid #eef2f7',
            display: 'flex',
            gap: 12,
            justifyContent: 'space-between',
            paddingBottom: 8,
          }}
        >
          <span style={{ color: '#64748b' }}>{label}</span>
          <strong style={{ color: '#0f172a', textAlign: 'right' }}>
            {value || '-'}
          </strong>
        </div>
      ))}
      <div style={{ color: '#94a3b8', fontSize: 12 }}>
        {row.source_dataset || 'Soil Series, Nakhon Pathom'}
      </div>
    </div>
  );
}

function SoilSeriesMap({ geojson, legendItems, onHover }) {
  const [modules, setModules] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      import('leaflet'),
      import('react-leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([leaflet, reactLeaflet]) => {
      if (!active) return;
      setModules({ L: leaflet.default || leaflet, ...reactLeaflet });
    });
    return () => {
      active = false;
    };
  }, []);

  if (!modules) {
    return (
      <div style={{ display: 'grid', minHeight: 420, placeItems: 'center' }}>
        <Spin tip="กำลังเตรียมแผนที่..." />
      </div>
    );
  }

  const { L, MapContainer, TileLayer, GeoJSON, useMap } = modules;

  return (
    <div style={{ position: 'relative' }}>
      <MapContainer
        center={[13.82, 100.05]}
        zoom={10}
        scrollWheelZoom
        style={{
          borderRadius: 12,
          height: 500,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON
          key={geojson.features
            .map((feature) => feature.properties.id)
            .join('-')}
          data={geojson}
          onEachFeature={(feature, layer) => {
            const row = feature.properties;
            const detail = `
              <div style="min-width:190px">
                <strong>${escapeHtml(row.soil_series_name)}</strong>
                <div>รหัส: ${escapeHtml(row.soil_series_code)}</div>
                <div>กลุ่ม: ${escapeHtml(row.soil_group)}</div>
                <div>อำเภอ: ${escapeHtml(row.district)}</div>
                <div>พื้นที่: ${escapeHtml(thaiNumber.format(Number(row.area_rai || 0)))} ไร่</div>
              </div>
            `;
            layer.bindTooltip(detail, {
              direction: 'top',
              opacity: 0.96,
              sticky: true,
            });
            layer.on({
              mouseover: () => {
                onHover(row);
                layer.setStyle({ fillOpacity: 0.62, weight: 3 });
                layer.bringToFront();
              },
              mouseout: () => {
                const color = colorFor(row.soil_group);
                layer.setStyle({
                  color,
                  fillColor: color,
                  fillOpacity: 0.42,
                  opacity: 0.95,
                  weight: 1.5,
                });
              },
              click: () => onHover(row),
            });
          }}
          style={(feature) => {
            const color = colorFor(feature.properties.soil_group);
            return {
              color,
              fillColor: color,
              fillOpacity: 0.42,
              opacity: 0.95,
              weight: 1.5,
            };
          }}
        />
        <MapFitBounds L={L} geojson={geojson} useMap={useMap} />
      </MapContainer>

      <div
        style={{
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          bottom: 16,
          boxShadow: '0 16px 34px rgba(15,23,42,0.14)',
          display: 'grid',
          gap: 8,
          left: 16,
          maxWidth: 260,
          padding: 12,
          position: 'absolute',
          zIndex: 500,
        }}
      >
        <strong style={{ color: '#0f172a' }}>กลุ่มชุดดิน</strong>
        {legendItems.slice(0, 7).map((item) => (
          <div
            key={item.name}
            style={{ alignItems: 'center', display: 'flex', gap: 8 }}
          >
            <span
              style={{
                background: colorFor(item.name),
                borderRadius: 999,
                height: 10,
                width: 10,
              }}
            />
            <span style={{ color: '#475569', fontSize: 12 }}>
              {item.name} · {thaiNumber.format(item.value)} ไร่
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SoilSeries() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [district, setDistrict] = useState(null);
  const [soilGroup, setSoilGroup] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from('soil_series')
        .select(
          'id,source_feature_id,soil_series_name,soil_series_code,soil_group,texture,fertility,ph_top,district,area_rai,source_dataset,geometry'
        )
        .order('district')
        .order('soil_series_name');

      if (!active) return;
      if (queryError) setError(queryError.message);
      else setRows(data || []);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const districtOptions = useMemo(() => uniqOptions(rows, 'district'), [rows]);
  const soilGroupOptions = useMemo(
    () => uniqOptions(rows, 'soil_group'),
    [rows]
  );

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (district && row.district !== district) return false;
        if (soilGroup && row.soil_group !== soilGroup) return false;
        return true;
      }),
    [district, rows, soilGroup]
  );

  const stats = useMemo(() => {
    const area = filteredRows.reduce(
      (sum, row) => sum + Number(row.area_rai || 0),
      0
    );
    return {
      features: filteredRows.length,
      series: new Set(filteredRows.map((row) => row.soil_series_name)).size,
      districts: new Set(filteredRows.map((row) => row.district)).size,
      area,
    };
  }, [filteredRows]);

  const mapGeojson = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: filteredRows
        .filter((row) => row.geometry)
        .map((row) => ({
          type: 'Feature',
          geometry: row.geometry,
          properties: row,
        })),
    }),
    [filteredRows]
  );

  const districtArea = useMemo(
    () => aggregateArea(filteredRows, 'district'),
    [filteredRows]
  );
  const seriesArea = useMemo(
    () => topWithOther(aggregateArea(filteredRows, 'soil_series_name')),
    [filteredRows]
  );
  const groupCounts = useMemo(
    () => aggregateCount(filteredRows, 'soil_group'),
    [filteredRows]
  );
  const groupArea = useMemo(
    () => aggregateArea(filteredRows, 'soil_group'),
    [filteredRows]
  );
  const focusRow = useMemo(
    () =>
      hoveredRow && filteredRows.some((row) => row.id === hoveredRow.id)
        ? hoveredRow
        : [...filteredRows].sort(
            (a, b) => Number(b.area_rai || 0) - Number(a.area_rai || 0)
          )[0],
    [filteredRows, hoveredRow]
  );

  const districtAreaOption = useMemo(
    () => ({
      grid: { top: 18, right: 18, bottom: 72, left: 62 },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => `${thaiNumber.format(value)} ไร่`,
      },
      xAxis: {
        type: 'category',
        data: districtArea.map((item) => item.name),
        axisLabel: { interval: 0, rotate: 28 },
      },
      yAxis: { type: 'value', name: 'ไร่' },
      series: [
        {
          name: 'พื้นที่',
          type: 'bar',
          data: districtArea.map((item) => item.value),
          itemStyle: { color: '#15803d' },
        },
      ],
    }),
    [districtArea]
  );

  const seriesAreaOption = useMemo(
    () => ({
      color: seriesArea.map((item) => colorFor(item.name)),
      legend: { bottom: 0, type: 'scroll' },
      tooltip: {
        trigger: 'item',
        valueFormatter: (value) => `${thaiNumber.format(value)} ไร่`,
      },
      series: [
        {
          name: 'พื้นที่ชุดดิน',
          type: 'pie',
          radius: ['42%', '72%'],
          center: ['50%', '44%'],
          data: seriesArea,
          label: { formatter: '{b}' },
        },
      ],
    }),
    [seriesArea]
  );

  const groupCountsOption = useMemo(
    () => ({
      grid: { top: 18, right: 18, bottom: 48, left: 46 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: groupCounts.map((item) => item.name),
        axisLabel: { interval: 0 },
      },
      yAxis: { type: 'value', name: 'polygon' },
      series: [
        {
          name: 'จำนวน polygon',
          type: 'bar',
          data: groupCounts.map((item) => item.value),
          itemStyle: { color: '#0f766e' },
        },
      ],
    }),
    [groupCounts]
  );

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 360 }}>
        <Spin size="large" tip="กำลังโหลดข้อมูลชุดดิน..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ margin: 0, color: '#0f172a' }}>
          <ExperimentOutlined style={{ color: '#15803d', marginRight: 8 }} />
          ข้อมูลชุดดินจังหวัดนครปฐม
        </h2>
        <p style={{ margin: '8px 0 0', color: '#64748b' }}>
          ข้อมูลชุดดินจากกรมพัฒนาที่ดิน
          สำหรับใช้ประกอบงานวิเคราะห์พื้นที่และอารักขาพืช
        </p>
      </div>

      {error && (
        <Alert
          type="error"
          showIcon
          message="โหลดข้อมูลชุดดินไม่สำเร็จ"
          description={error}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <div style={{ color: '#64748b' }}>พื้นที่ข้อมูล</div>
            <strong style={{ fontSize: 28 }}>
              {stats.area.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
            </strong>
            <div style={{ color: '#64748b' }}>ไร่</div>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <div style={{ color: '#64748b' }}>ชุดดิน</div>
            <strong style={{ fontSize: 28 }}>{stats.series}</strong>
            <div style={{ color: '#64748b' }}>รายการ</div>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <div style={{ color: '#64748b' }}>แปลง polygon</div>
            <strong style={{ fontSize: 28 }}>{stats.features}</strong>
            <div style={{ color: '#64748b' }}>features</div>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <div style={{ color: '#64748b' }}>ครอบคลุม</div>
            <strong style={{ fontSize: 28 }}>{stats.districts}</strong>
            <div style={{ color: '#64748b' }}>อำเภอ</div>
          </Card>
        </Col>
      </Row>

      <Card>
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          <Select
            allowClear
            placeholder="เลือกอำเภอ"
            options={districtOptions}
            value={district}
            onChange={setDistrict}
            style={{ minWidth: 180 }}
          />
          <Select
            allowClear
            placeholder="เลือกกลุ่มชุดดิน"
            options={soilGroupOptions}
            value={soilGroup}
            onChange={setSoilGroup}
            style={{ minWidth: 180 }}
          />
        </div>
      </Card>

      <Card
        title="แผนที่และรายละเอียดชุดดิน"
        styles={{ body: { padding: 12 } }}
      >
        <Row gutter={[16, 16]} align="stretch">
          <Col xs={24} xl={16}>
            <SoilSeriesMap
              geojson={mapGeojson}
              legendItems={groupArea}
              onHover={setHoveredRow}
            />
          </Col>
          <Col xs={24} xl={8}>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                minHeight: 500,
              }}
            >
              <SoilDetailPanel row={focusRow} />
            </div>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="พื้นที่ตามอำเภอ">
            <EChart option={districtAreaOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="สัดส่วนพื้นที่ตามชุดดิน">
            <EChart option={seriesAreaOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="จำนวน polygon ตามกลุ่มชุดดิน">
            <EChart option={groupCountsOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredRows}
          scroll={{ x: 1280 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>
    </div>
  );
}
