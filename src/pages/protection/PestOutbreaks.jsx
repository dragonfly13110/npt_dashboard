import { useState, useMemo } from 'react';
import {
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
import {
  barOption,
  pieOption,
  getCropColor,
} from '../../components/charts/echartOptions';
import ForecastMap from '../../components/Map/ForecastMap';
import { supabase } from '../../supabaseClient';
import { useApiCache } from '../../hooks/useApiCache';
import EChart from '../../components/widgets/EChart';
import { useAuth } from '../../contexts/AuthContext';
import { getPublicSelectColumns } from '../../utils/dataPrivacy';

const plotTypes = ['พื้นที่เสี่ยง', 'ศจช.', 'พื้นที่เฝ้าระวัง', 'ไม่ระบุ'];

const PLOT_TYPE_COLORS = {
  พื้นที่เสี่ยง: '#cf222e',
  'ศจช.': '#0969da',
  พื้นที่เฝ้าระวัง: '#bf8700',
  ไม่ระบุ: '#656d76',
};

const CHART_COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#4caf50',
  '#e91e63',
];

const columns = [
  {
    title: 'อำเภอ',
    dataIndex: 'district',
    key: 'district',
    width: 110,
    ellipsis: true,
  },
  {
    title: 'ตำบล',
    dataIndex: 'subdistrict',
    key: 'subdistrict',
    width: 100,
    ellipsis: true,
  },
  {
    title: 'ม.',
    dataIndex: 'village_no',
    key: 'village_no',
    width: 45,
    align: 'center',
  },
  {
    title: 'เจ้าของแปลง',
    dataIndex: 'owner_name',
    key: 'owner_name',
    width: 150,
    ellipsis: true,
  },
  { title: 'Zone', dataIndex: 'zone', key: 'zone', width: 55, align: 'center' },
  {
    title: 'X',
    dataIndex: 'coord_x',
    key: 'coord_x',
    width: 80,
    align: 'right',
    render: (v) => v?.toLocaleString() || '-',
  },
  {
    title: 'Y',
    dataIndex: 'coord_y',
    key: 'coord_y',
    width: 85,
    align: 'right',
    render: (v) => v?.toLocaleString() || '-',
  },
  {
    title: 'ชนิดพืช',
    dataIndex: 'crop_type',
    key: 'crop_type',
    width: 80,
    ellipsis: true,
  },
  {
    title: 'พันธุ์',
    dataIndex: 'variety',
    key: 'variety',
    width: 80,
    ellipsis: true,
  },
  {
    title: 'ไร่',
    dataIndex: 'planted_area_rai',
    key: 'planted_area_rai',
    width: 55,
    align: 'right',
    render: (v) => v?.toLocaleString() || '-',
  },
  {
    title: 'วันที่ปลูก',
    dataIndex: 'planting_date',
    key: 'planting_date',
    width: 95,
    ellipsis: true,
  },
  {
    title: 'ประเภทแปลง',
    dataIndex: 'plot_type',
    key: 'plot_type',
    width: 100,
    ellipsis: true,
  },
  {
    title: 'สถานะ',
    dataIndex: 'crop_status',
    key: 'crop_status',
    width: 80,
    render: (v) => {
      const c = {
        สมบูรณ์: '#1a7f37',
        ปกติ: '#1a7f37',
        เสียหาย: '#cf222e',
        กำลังเติบโต: '#bf8700',
      };
      return (
        <span style={{ fontWeight: 600, color: c[v] || '#656d76' }}>
          {v || '-'}
        </span>
      );
    },
  },
];

const districts = [
  'เมืองนครปฐม',
  'นครชัยศรี',
  'สามพราน',
  'ดอนตูม',
  'บางเลน',
  'กำแพงแสน',
  'พุทธมณฑล',
];

const formFields = (
  <>
    <Form.Item name="province" label="จังหวัด" initialValue="นครปฐม">
      <Input />
    </Form.Item>
    <Form.Item name="district" label="อำเภอ" rules={[{ required: true }]}>
      <Select
        options={districts.map((d) => ({ label: d, value: d }))}
        placeholder="เลือกอำเภอ"
      />
    </Form.Item>
    <Form.Item name="subdistrict" label="ตำบล">
      <Input />
    </Form.Item>
    <Form.Item name="village_no" label="หมู่ที่">
      <InputNumber style={{ width: '100%' }} min={1} />
    </Form.Item>
    <Form.Item
      name="owner_name"
      label="ชื่อ-สกุล เจ้าของแปลง"
      rules={[{ required: true }]}
    >
      <Input />
    </Form.Item>
    <Form.Item name="zone" label="Zone">
      <Input placeholder="เช่น 47P" />
    </Form.Item>
    <Form.Item name="coord_x" label="พิกัด X">
      <InputNumber style={{ width: '100%' }} />
    </Form.Item>
    <Form.Item name="coord_y" label="พิกัด Y">
      <InputNumber style={{ width: '100%' }} />
    </Form.Item>
    <Form.Item name="crop_type" label="ชนิดพืช" rules={[{ required: true }]}>
      <Input />
    </Form.Item>
    <Form.Item name="variety" label="พันธุ์">
      <Input />
    </Form.Item>
    <Form.Item name="planted_area_rai" label="พื้นที่ปลูก (ไร่)">
      <InputNumber style={{ width: '100%' }} min={0} />
    </Form.Item>
    <Form.Item name="planting_date" label="วันที่ปลูก">
      <Input placeholder="เช่น 1/1/2024" />
    </Form.Item>
    <Form.Item name="plot_type" label="ประเภทแปลง">
      <Select
        options={plotTypes.map((d) => ({ label: d, value: d }))}
        placeholder="เลือกประเภทแปลง"
        allowClear
      />
    </Form.Item>
    <Form.Item name="crop_status" label="สถานะพืชที่ปลูก">
      <Input placeholder="เช่น สมบูรณ์, เสียหาย" />
    </Form.Item>
  </>
);

const filterConfig = [
  { key: 'district', label: 'อำเภอ', options: districts },
  {
    key: 'crop_type',
    label: 'ชนิดพืช',
    options: ['ข้าว', 'มะพร้าว', 'อ้อย', 'กล้วย', 'มันสำปะหลัง'],
  },
  { key: 'plot_type', label: 'ประเภทแปลง', options: plotTypes },
];

export default function PestOutbreaks() {
  const { role } = useAuth();
  // Global filters
  const [filterDistrict, setFilterDistrict] = useState(null);
  const [filterPlotType, setFilterPlotType] = useState(null);
  const [filterCropType, setFilterCropType] = useState(null);

  const fetchMapData = async () => {
    const selectColumns = getPublicSelectColumns(
      'forecast_plots',
      columns,
      role
    );
    const { data, error } = await supabase
      .from('forecast_plots')
      .select(selectColumns)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const { data: mapData = [], isLoading: mapLoading } = useApiCache(
    ['all-forecast-plots', role],
    fetchMapData,
    { staleMinutes: 10 }
  );

  // Derive unique values for filter dropdowns
  const districtOptions = useMemo(() => {
    const unique = [
      ...new Set(mapData.map((d) => d.district).filter(Boolean)),
    ].sort();
    return unique.map((d) => ({ label: d, value: d }));
  }, [mapData]);

  const cropOptions = useMemo(() => {
    const unique = [
      ...new Set(mapData.map((d) => d.crop_type).filter(Boolean)),
    ].sort();
    return unique.map((d) => ({ label: d, value: d }));
  }, [mapData]);

  const plotTypeOptions = useMemo(() => {
    const unique = [
      ...new Set(mapData.map((d) => d.plot_type).filter(Boolean)),
    ].sort();
    return unique.map((d) => ({ label: d, value: d }));
  }, [mapData]);

  // Filtered data for children
  const filteredData = useMemo(() => {
    return mapData.filter((item) => {
      if (filterDistrict && item.district !== filterDistrict) return false;
      if (filterPlotType && item.plot_type !== filterPlotType) return false;
      if (filterCropType && item.crop_type !== filterCropType) return false;
      return true;
    });
  }, [mapData, filterDistrict, filterPlotType, filterCropType]);

  // Calculate Pie Chart Data (Crop Type)
  const pieData = useMemo(() => {
    const counts = {};
    filteredData.forEach((item) => {
      const crop = item.crop_type || 'ไม่ระบุ';
      counts[crop] = (counts[crop] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: getCropColor(name) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Calculate Stacked Bar Chart Data (District & Plot Type)
  const { barData, barGroups } = useMemo(() => {
    const counts = {};
    const typeSet = new Set();

    filteredData.forEach((item) => {
      const dist = item.district || 'ไม่ระบุ';
      const type = item.plot_type || 'ไม่ระบุ';

      if (!counts[dist]) counts[dist] = { name: dist, total: 0 };

      counts[dist][type] = (counts[dist][type] || 0) + 1;
      counts[dist].total += 1;
      typeSet.add(type);
    });

    const sortedBarData = Object.values(counts).sort(
      (a, b) => b.total - a.total
    );
    const sortedTypeGroups = Array.from(typeSet).sort((a, b) => {
      const order = {
        พื้นที่เสี่ยง: 1,
        'ศจช.': 2,
        พื้นที่เฝ้าระวัง: 3,
        ไม่ระบุ: 4,
      };
      return (order[a] || 9) - (order[b] || 9);
    });

    return { barData: sortedBarData, barGroups: sortedTypeGroups };
  }, [filteredData]);

  const hasActiveFilter = filterDistrict || filterPlotType || filterCropType;

  return (
    <div>
      {/* ===== Dashboard Section ===== */}
      <div
        style={{
          padding: 20,
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e8ecf0',
          marginBottom: 24,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <PieChartOutlined style={{ fontSize: 18, color: '#1a7f37' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2328' }}>
            สรุปข้อมูลการพยากรณ์
          </span>
          <Tag color="green">
            {hasActiveFilter
              ? `${filteredData.length} / ${mapData.length} แปลง`
              : `${mapData.length} แปลง`}
          </Tag>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              color: '#656d76',
              background: '#f6f8fa',
              padding: '4px 10px',
              borderRadius: 20,
              border: '1px solid #e8ecf0',
              fontWeight: 500,
            }}
          >
            📅 ข้อมูล ณ วันที่ 25 พ.ค. 2569 (25/05/2026)
          </span>
        </div>

        {/* Unified Filters */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 20,
            padding: '12px 16px',
            background: '#f6f8fa',
            borderRadius: 8,
            border: '1px solid #e8ecf0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#656d76', fontWeight: 500 }}>
              อำเภอ:
            </span>
            <Select
              value={filterDistrict}
              onChange={setFilterDistrict}
              options={districtOptions}
              placeholder="ทั้งหมด"
              allowClear
              style={{ minWidth: 150 }}
              size="small"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#656d76', fontWeight: 500 }}>
              ประเภทแปลง:
            </span>
            <Select
              value={filterPlotType}
              onChange={setFilterPlotType}
              options={plotTypeOptions}
              placeholder="ทั้งหมด"
              allowClear
              style={{ minWidth: 140 }}
              size="small"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#656d76', fontWeight: 500 }}>
              ชนิดพืช:
            </span>
            <Select
              value={filterCropType}
              onChange={setFilterCropType}
              options={cropOptions}
              placeholder="ทั้งหมด"
              allowClear
              style={{ minWidth: 140 }}
              size="small"
            />
          </div>
          {hasActiveFilter && (
            <a
              onClick={() => {
                setFilterDistrict(null);
                setFilterPlotType(null);
                setFilterCropType(null);
              }}
              style={{
                fontSize: 13,
                cursor: 'pointer',
                alignSelf: 'center',
                color: '#cf222e',
              }}
            >
              ล้างตัวกรอง
            </a>
          )}
        </div>

        {/* Charts */}
        {mapLoading ? (
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
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card
                title="สรุปตามชนิดพืช"
                size="small"
                bordered={false}
                style={{ background: '#fafbfc' }}
              >
                <div style={{ height: 300 }}>
                  {pieData.length > 0 ? (
                    <EChart
                      option={pieOption(pieData, {
                        colors: CHART_COLORS,
                        unit: 'แปลง',
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
                title="สรุปตามอำเภอ (แยกประเภทแปลง)"
                size="small"
                bordered={false}
                style={{ background: '#fafbfc' }}
              >
                <div style={{ height: 300 }}>
                  {barData.length > 0 ? (
                    <EChart
                      option={barOption(
                        barData,
                        barGroups.map((type) => ({
                          key: type,
                          name: type,
                          color: PLOT_TYPE_COLORS[type] || '#8250df',
                          maxBarSize: 50,
                        })),
                        {
                          colors: CHART_COLORS,
                          unit: 'แปลง',
                          stacked: true,
                          totalKey: 'total',
                        }
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
        )}
      </div>

      {/* ===== ตาราง ===== */}
      <CrudTable
        tableName="forecast_plots"
        title="ข้อมูลการพยากรณ์ (ข้อมูล ณ วันที่ 25 พ.ค. 2569)"
        columns={columns}
        formFields={formFields}
        searchFields={[
          'owner_name',
          'crop_type',
          'variety',
          'district',
          'subdistrict',
        ]}
        filterConfig={filterConfig}
      />

      {/* ===== แผนที่ ===== */}
      <div
        style={{
          marginTop: 24,
          padding: 20,
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e8ecf0',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            flexWrap: 'wrap',
          }}
        >
          <EnvironmentOutlined style={{ fontSize: 18, color: '#1a7f37' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2328' }}>
            แผนที่แสดงพิกัดแปลงพยากรณ์
          </span>
          <Tag color="green">
            {hasActiveFilter
              ? `${filteredData.length} / ${mapData.length} แปลง`
              : `${mapData.length} แปลง`}
          </Tag>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              color: '#656d76',
              background: '#f6f8fa',
              padding: '4px 10px',
              borderRadius: 20,
              border: '1px solid #e8ecf0',
              fontWeight: 500,
            }}
          >
            📅 ข้อมูล ณ วันที่ 25 พ.ค. 2569 (25/05/2026)
          </span>
        </div>

        {/* Map */}
        {mapLoading ? (
          <div
            style={{
              height: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f6f8fa',
              borderRadius: 12,
              border: '1px solid #e8ecf0',
            }}
          >
            <span style={{ color: '#656d76' }}>กำลังโหลดข้อมูลแผนที่...</span>
          </div>
        ) : (
          <ForecastMap data={filteredData} />
        )}
      </div>
    </div>
  );
}
