import { useEffect, useState, useMemo } from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  Row,
  Col,
  Card,
  Spin,
} from 'antd';
import { EnvironmentOutlined, PieChartOutlined } from '@ant-design/icons';
import CrudTable from '../../components/DataTable/CrudTable';
import { barOption, pieOption } from '../../components/charts/echartOptions';
import { supabase } from '../../supabaseClient';
import { useApiCache } from '../../hooks/useApiCache';
import EChart from '../../components/widgets/EChart';
import districtGeoJSON from '../../data/nakhon_pathom_districts.json';

const columns = [
  {
    title: 'ชื่อ ศพก.',
    dataIndex: 'name',
    key: 'name',
    width: 280,
    importHeader: 'ชื่อ_ศพก',
  },
  {
    title: 'สินค้าเด่น',
    dataIndex: 'featured_product',
    key: 'featured_product',
    width: 100,
    importHeader: 'สินค้าเด่น',
  },
  {
    title: 'หมู่ที่',
    dataIndex: 'moo',
    key: 'moo',
    width: 70,
    align: 'center',
    importHeader: 'หมู่ที่',
  },
  {
    title: 'ตำบล',
    dataIndex: 'subdistrict',
    key: 'subdistrict',
    width: 100,
    importHeader: 'ตำบล',
  },
  {
    title: 'อำเภอ',
    dataIndex: 'district',
    key: 'district',
    width: 100,
    importHeader: 'อำเภอ',
  },
  {
    title: (
      <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>
        ศูนย์
        <br />
        เครือข่าย
      </div>
    ),
    importHeader: 'จำนวนศูนย์เครือข่าย_ศูนย์',
    dataIndex: 'network_centers_count',
    key: 'network_centers_count',
    width: 90,
    align: 'right',
    render: (val) => (val != null ? Number(val).toLocaleString() : '-'),
  },
  {
    title: 'ชื่อ-สกุล ประธาน',
    dataIndex: 'chairman_name',
    key: 'chairman_name',
    width: 150,
    importHeader: 'ชื่อ_สกุล_ประธาน',
  },
  {
    title: 'เบอร์โทรศัพท์',
    dataIndex: 'phone',
    key: 'phone',
    width: 130,
    importHeader: 'เบอร์โทรศัพท์',
  },
  {
    title: (
      <div style={{ whiteSpace: 'normal', lineHeight: '1.2' }}>
        องค์ความรู้/
        <br />
        หลักสูตรอบรม
      </div>
    ),
    importHeader: 'องค์ความรู้_หลักสูตรอบรม',
    dataIndex: 'knowledge_course',
    key: 'knowledge_course',
    width: 220,
    ellipsis: true,
  },
];

const formFields = (
  <div
    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}
  >
    <Form.Item
      name="name"
      label="ชื่อ ศพก."
      rules={[{ required: true }]}
      style={{ gridColumn: '1 / -1' }}
    >
      <Input />
    </Form.Item>
    <Form.Item name="featured_product" label="สินค้าเด่น">
      <Input />
    </Form.Item>
    <Form.Item name="moo" label="หมู่ที่">
      <Input />
    </Form.Item>
    <Form.Item name="subdistrict" label="ตำบล">
      <Input />
    </Form.Item>
    <Form.Item name="district" label="อำเภอ">
      <Input />
    </Form.Item>
    <Form.Item name="network_centers_count" label="จำนวนศูนย์เครือข่าย">
      <InputNumber style={{ width: '100%' }} />
    </Form.Item>
    <Form.Item name="chairman_name" label="ชื่อ-สกุล ประธาน">
      <Input />
    </Form.Item>
    <Form.Item name="phone" label="เบอร์โทรศัพท์">
      <Input />
    </Form.Item>
    <Form.Item
      name="knowledge_course"
      label="องค์ความรู้/หลักสูตรอบรม"
      style={{ gridColumn: '1 / -1' }}
    >
      <Input.TextArea rows={2} />
    </Form.Item>
  </div>
);

const PIE_COLORS = [
  '#66bb6a',
  '#42a5f5',
  '#ffca28',
  '#ef5350',
  '#ab47bc',
  '#26a69a',
  '#ff7043',
  '#8d6e63',
  '#78909c',
  '#5c6bc0',
  '#ec407a',
  '#29b6f6',
  '#9ccc65',
  '#ffa726',
  '#7e57c2',
];

const BAR_COLOR = '#42a5f5';

const FILTER_KEYS = ['district', 'subdistrict', 'featured_product'];

const isBlank = (value) =>
  value === undefined || value === null || value === '';

const matchesFilters = (item, filters, exceptKey = null) =>
  FILTER_KEYS.every((key) => {
    if (key === exceptKey) return true;
    const value = filters[key];
    if (isBlank(value)) return true;
    return item[key] === value;
  });

const buildOptions = (data, key, filters) => {
  const values = data
    .filter((item) => matchesFilters(item, filters, key))
    .map((item) => item[key])
    .filter(Boolean);
  return [...new Set(values)]
    .sort((a, b) => String(a).localeCompare(String(b), 'th'))
    .map((value) => ({ label: value, value }));
};

const getCoordinate = (item, keys) => {
  for (const key of keys) {
    const value = item[key] ?? item.custom_fields?.[key];
    if (!isBlank(value)) return Number(value);
  }
  return NaN;
};

const toMapPoint = (item) => {
  const lat = getCoordinate(item, ['latitude', 'lat']);
  const lon = getCoordinate(item, ['longitude', 'lng', 'lon']);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { ...item, lat, lon };
};

function FitMapBounds({ points, MapComponents, useMap }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length || !MapComponents?.L) return;

    const bounds = MapComponents.L.latLngBounds(
      points.map((point) => [point.lat, point.lon])
    );
    if (!bounds.isValid()) return;

    map.invalidateSize();
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 12, animate: false });
  }, [map, points, MapComponents]);

  return null;
}

export default function LearningCenters() {
  const [filters, setFilters] = useState({});
  const [MapComponents, setMapComponents] = useState(null);

  useEffect(() => {
    Promise.all([
      import('leaflet'),
      import('react-leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([L, RL]) => {
      delete L.default.Icon.Default.prototype._getIconUrl;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      setMapComponents({ L: L.default, ...RL });
    });
  }, []);

  const fetchAllCenters = async () => {
    const { data, error } = await supabase.from('learning_centers').select('*');
    if (error) throw error;
    return data || [];
  };

  const { data: chartData = [], isLoading: chartLoading } = useApiCache(
    ['all-learning-centers'],
    fetchAllCenters,
    { staleMinutes: 10 }
  );

  const districtOptions = useMemo(() => {
    return buildOptions(chartData, 'district', filters);
  }, [chartData, filters]);

  const subdistrictOptions = useMemo(() => {
    return buildOptions(chartData, 'subdistrict', filters);
  }, [chartData, filters]);

  const productOptions = useMemo(() => {
    return buildOptions(chartData, 'featured_product', filters);
  }, [chartData, filters]);

  const filteredData = useMemo(() => {
    return chartData.filter((item) => matchesFilters(item, filters));
  }, [chartData, filters]);

  const mapPoints = useMemo(() => {
    return filteredData.map(toMapPoint).filter(Boolean);
  }, [filteredData]);

  // Pie: by featured_product
  const pieData = useMemo(() => {
    const counts = {};
    filteredData.forEach((item) => {
      const product = item.featured_product || 'ไม่ระบุ';
      counts[product] = (counts[product] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Bar: network_centers_count by district
  const barData = useMemo(() => {
    const distMap = {};
    filteredData.forEach((item) => {
      const dist = item.district || 'ไม่ระบุ';
      if (!distMap[dist]) distMap[dist] = { name: dist, network_centers: 0 };
      distMap[dist].network_centers += Number(item.network_centers_count) || 0;
    });
    return Object.values(distMap).sort(
      (a, b) => b.network_centers - a.network_centers
    );
  }, [filteredData]);

  const activeFilterCount = Object.values(filters).filter(
    (value) => !isBlank(value)
  ).length;
  const hasActiveFilter = activeFilterCount > 0;

  const tableFilterConfig = [
    { key: 'district', label: 'อำเภอ', options: districtOptions },
    { key: 'subdistrict', label: 'ตำบล', options: subdistrictOptions },
    { key: 'featured_product', label: 'สินค้าเด่น', options: productOptions },
  ];

  const handleFilterChange = (key, value) => {
    setFilters((current) => {
      const next = { ...current, [key]: value || undefined };
      if (key === 'district') next.subdistrict = undefined;
      return Object.fromEntries(
        Object.entries(next).filter(([, filterValue]) => !isBlank(filterValue))
      );
    });
  };

  const renderMap = () => {
    if (!MapComponents) {
      return (
        <div
          style={{
            height: 380,
            display: 'grid',
            placeItems: 'center',
            color: '#656d76',
          }}
        >
          <Spin tip="กำลังโหลดแผนที่..." />
        </div>
      );
    }

    if (!mapPoints.length) {
      return (
        <div
          style={{
            height: 380,
            display: 'grid',
            placeItems: 'center',
            color: '#656d76',
            background: '#f6f8fa',
            borderRadius: 8,
          }}
        >
          ไม่พบพิกัดในข้อมูลที่กรองอยู่
        </div>
      );
    }

    const { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON, useMap } =
      MapComponents;

    return (
      <MapContainer
        center={[13.82, 100.05]}
        zoom={10}
        zoomSnap={0.25}
        zoomDelta={0.5}
        style={{
          height: 420,
          width: '100%',
          borderRadius: 8,
          border: '1px solid #e8ecf0',
        }}
        scrollWheelZoom={false}
      >
        <FitMapBounds
          points={mapPoints}
          MapComponents={MapComponents}
          useMap={useMap}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON
          data={districtGeoJSON}
          style={{
            color: '#1a7f37',
            weight: 2,
            opacity: 0.7,
            fillColor: '#2da44e',
            fillOpacity: 0.08,
            dashArray: '5, 5',
          }}
          onEachFeature={(feature, layer) => {
            const name =
              feature.properties?.amp_th || feature.properties?.AMP_NAMT;
            if (name) layer.bindTooltip(`อำเภอ${name}`, { sticky: true });
          }}
        />
        {mapPoints.map((item) => (
          <CircleMarker
            key={item.id}
            center={[item.lat, item.lon]}
            radius={8}
            fillColor="#0969da"
            fillOpacity={0.85}
            color="#fff"
            weight={2}
            eventHandlers={{
              click: () => {
                setFilters((current) => ({
                  ...current,
                  district: item.district || undefined,
                  subdistrict: item.subdistrict || undefined,
                }));
              },
            }}
          >
            <Popup>
              <div style={{ minWidth: 220, fontFamily: 'inherit' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {item.name}
                </div>
                <div style={{ color: '#57606a', fontSize: 13 }}>
                  อ.{item.district || '-'} ต.{item.subdistrict || '-'}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    display: 'grid',
                    gap: 4,
                    fontSize: 13,
                  }}
                >
                  <span>
                    สินค้าเด่น: <strong>{item.featured_product || '-'}</strong>
                  </span>
                  <span>
                    หมู่ที่: <strong>{item.moo || '-'}</strong>
                  </span>
                  <span>
                    ศูนย์เครือข่าย:{' '}
                    <strong>
                      {Number(item.network_centers_count || 0).toLocaleString()}
                    </strong>{' '}
                    ศูนย์
                  </span>
                  <span>
                    ประธาน: <strong>{item.chairman_name || '-'}</strong>
                  </span>
                  <span>
                    โทร: <strong>{item.phone || '-'}</strong>
                  </span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    );
  };

  return (
    <div>
      <div
        style={{
          padding: 20,
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e8ecf0',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
          }}
        >
          <PieChartOutlined style={{ fontSize: 18, color: '#1a7f37' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2328' }}>
            สรุปข้อมูล ศพก.
          </span>
          <Tag color="green">
            {hasActiveFilter
              ? `แสดง ${filteredData.length} จาก ${chartData.length} ศูนย์`
              : `รวมข้อมูลทั้งหมด ${chartData.length} ศูนย์`}
          </Tag>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 12,
            marginBottom: 20,
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            padding: '12px 16px',
            background: '#f6f8fa',
            borderRadius: 8,
            border: '1px solid #e8ecf0',
          }}
        >
          <div>
            <label className="filter-label">อำเภอ</label>
            <Select
              value={filters.district}
              onChange={(value) => handleFilterChange('district', value)}
              options={districtOptions}
              placeholder="ทั้งหมด"
              allowClear
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label className="filter-label">ตำบล</label>
            <Select
              value={filters.subdistrict}
              onChange={(value) => handleFilterChange('subdistrict', value)}
              options={subdistrictOptions}
              placeholder="ทั้งหมด"
              allowClear
              showSearch
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label className="filter-label">สินค้าเด่น</label>
            <Select
              value={filters.featured_product}
              onChange={(value) =>
                handleFilterChange('featured_product', value)
              }
              options={productOptions}
              placeholder="ทั้งหมด"
              allowClear
              showSearch
              style={{ width: '100%' }}
            />
          </div>
          {hasActiveFilter && (
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <Button size="small" danger onClick={() => setFilters({})}>
                ล้างตัวกรอง
              </Button>
            </div>
          )}
        </div>

        {chartLoading ? (
          <div
            style={{
              height: 300,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Spin tip="กำลังโหลดข้อมูลกราฟ..." />
          </div>
        ) : (
          <>
            <Card
              title={
                <span>
                  <EnvironmentOutlined
                    style={{ color: '#0969da', marginRight: 8 }}
                  />
                  แผนที่จุดที่ตั้ง ศพก.
                </span>
              }
              extra={`${mapPoints.length.toLocaleString()} จุดพิกัด`}
              size="small"
              bordered={false}
              style={{ background: '#fafbfc', marginBottom: 24 }}
            >
              {renderMap()}
            </Card>
            <Row gutter={[24, 24]}>
              <Col xs={24} lg={12}>
                <Card
                  title="สัดส่วน ศพก. แยกตามสินค้าเด่น"
                  size="small"
                  bordered={false}
                  style={{ background: '#fafbfc' }}
                >
                  <div style={{ height: 300 }}>
                    {pieData.length > 0 ? (
                      <EChart
                        option={pieOption(pieData, {
                          colors: PIE_COLORS,
                          unit: 'ศูนย์',
                        })}
                      />
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          height: '100%',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#656d76',
                        }}
                      >
                        ไม่พบข้อมูล
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card
                  title="จำนวนศูนย์เครือข่ายแยกตามอำเภอ"
                  size="small"
                  bordered={false}
                  style={{ background: '#fafbfc' }}
                >
                  <div style={{ height: 300 }}>
                    {barData.length > 0 ? (
                      <EChart
                        option={barOption(
                          barData,
                          [
                            {
                              key: 'network_centers',
                              name: 'ศูนย์เครือข่าย',
                              color: BAR_COLOR,
                            },
                          ],
                          { unit: 'ศูนย์' }
                        )}
                      />
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          height: '100%',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#656d76',
                        }}
                      >
                        ไม่พบข้อมูล
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </div>

      <CrudTable
        tableName="learning_centers"
        title="ศูนย์เรียนรู้ฯ (ศพก.)"
        columns={columns}
        formFields={formFields}
        searchField="name"
        searchFields={['name', 'district', 'subdistrict', 'featured_product']}
        filterConfig={tableFilterConfig}
        controlledFilters={filters}
        onFiltersChange={setFilters}
        hideFilterBar
      />
    </div>
  );
}
