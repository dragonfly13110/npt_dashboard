import { useEffect, useState, useMemo } from 'react';
import { Form, Input, InputNumber, Select, Spin, Row, Col, Card } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import { supabase } from '../../supabaseClient';
import CrudTable from '../../components/DataTable/CrudTable';
import {
  barOption,
  comboOption,
  pieOption,
} from '../../components/charts/echartOptions';
import { useApiCache } from '../../hooks/useApiCache';
import { useAuth } from '../../contexts/AuthContext';
import EChart from '../../components/widgets/EChart';

const guestHiddenColumns = new Set(['farmer_name', 'plot_code']);

const columns = [
  {
    title: 'ชื่อเกษตรกร',
    importHeader: 'ชื่อ - นามสกุล',
    dataIndex: 'farmer_name',
    key: 'farmer_name',
    width: 150,
    ellipsis: true,
    sorter: (a, b) =>
      String(a.farmer_name || '').localeCompare(
        String(b.farmer_name || ''),
        'th'
      ),
  },
  {
    title: 'ชื่อพืช',
    importHeader: 'ชื่อพืช',
    dataIndex: 'crop_name',
    key: 'crop_name',
    width: 110,
    ellipsis: true,
    sorter: (a, b) =>
      String(a.crop_name || '').localeCompare(String(b.crop_name || ''), 'th'),
  },
  {
    title: 'รหัสแปลง',
    importHeader: 'รหัสแปลง',
    dataIndex: 'plot_code',
    key: 'plot_code',
    width: 140,
    ellipsis: true,
  },
  {
    title: 'ชนิดแปลง',
    importHeader: 'ชนิดของแปลง',
    dataIndex: 'plot_type',
    key: 'plot_type',
    width: 80,
    ellipsis: true,
  },
  {
    title: 'พื้นที่(ไร่)',
    importHeader: 'พื้นที่ปลูก(ไร่)',
    dataIndex: 'area_rai',
    key: 'area_rai',
    width: 80,
    align: 'right',
    render: (v) => v?.toLocaleString() || '-',
    sorter: (a, b) => (a.area_rai || 0) - (b.area_rai || 0),
  },
  {
    title: 'ผลผลิต(กก)',
    importHeader: 'ปริมาณการผลิต(กิโลกรัม)',
    dataIndex: 'production_volume_kg',
    key: 'production_volume_kg',
    width: 90,
    align: 'right',
    render: (v) => v?.toLocaleString() || '-',
    sorter: (a, b) =>
      (a.production_volume_kg || 0) - (b.production_volume_kg || 0),
  },
  {
    title: 'รับรองเมื่อ',
    importHeader: 'วันที่ได้รับการรับรอง',
    dataIndex: 'cert_date',
    key: 'cert_date',
    width: 90,
    ellipsis: true,
  },
  {
    title: 'หมดอายุ',
    importHeader: 'วันที่สิ้นสุดการรับรอง',
    dataIndex: 'exp_date',
    key: 'exp_date',
    width: 90,
    ellipsis: true,
  },
  {
    title: 'หมู่(แปลง)',
    importHeader: 'แปลง_หมู่',
    dataIndex: 'plot_moo',
    key: 'plot_moo',
    width: 70,
    align: 'center',
    ellipsis: true,
  },
  {
    title: 'ตำบล(แปลง)',
    importHeader: 'แปลง_ตำบล',
    dataIndex: 'plot_subdistrict',
    key: 'plot_subdistrict',
    width: 95,
    ellipsis: true,
  },
  {
    title: 'อำเภอ(แปลง)',
    importHeader: 'แปลง_อำเภอ',
    dataIndex: 'plot_district',
    key: 'plot_district',
    width: 100,
    ellipsis: true,
    sorter: (a, b) =>
      String(a.plot_district || '').localeCompare(
        String(b.plot_district || ''),
        'th'
      ),
  },
  {
    title: 'หมู่(บ้าน)',
    importHeader: 'เกษตรกร_หมู่',
    dataIndex: 'farmer_moo',
    key: 'farmer_moo',
    width: 70,
    align: 'center',
    ellipsis: true,
  },
  {
    title: 'ตำบล(บ้าน)',
    importHeader: 'เกษตรกร_ตำบล',
    dataIndex: 'farmer_subdistrict',
    key: 'farmer_subdistrict',
    width: 95,
    ellipsis: true,
  },
  {
    title: 'อำเภอ(บ้าน)',
    importHeader: 'เกษตรกร_อำเภอ',
    dataIndex: 'farmer_district',
    key: 'farmer_district',
    width: 100,
    ellipsis: true,
  },
];

const formFields = (
  <>
    <Form.Item name="cert_date" label="วันที่รับรอง">
      <Input placeholder="ว/ด/ป เช่น 27/8/2567" />
    </Form.Item>
    <Form.Item name="exp_date" label="วันที่สิ้นสุด">
      <Input placeholder="ว/ด/ป" />
    </Form.Item>
    <Form.Item
      name="farmer_name"
      label="ชื่อ-นามสกุล"
      rules={[{ required: true }]}
    >
      <Input />
    </Form.Item>
    <Form.Item name="plot_code" label="รหัสแปลง">
      <Input />
    </Form.Item>
    <Form.Item name="crop_name" label="ชื่อพืช">
      <Input />
    </Form.Item>
    <Form.Item name="plot_type" label="ชนิดของแปลง">
      <Input placeholder="DOA กรมวิชาการเกษตร" />
    </Form.Item>
    <Form.Item name="area_rai" label="พื้นที่ปลูก(ไร่)">
      <InputNumber style={{ width: '100%' }} step={0.01} />
    </Form.Item>
    <Form.Item name="production_volume_kg" label="ปริมาณการผลิต (กก.)">
      <InputNumber style={{ width: '100%' }} step={0.01} />
    </Form.Item>
    <Form.Item name="plot_moo" label="แปลง หมู่">
      <Input />
    </Form.Item>
    <Form.Item name="plot_subdistrict" label="แปลง ตำบล">
      <Input />
    </Form.Item>
    <Form.Item name="plot_district" label="แปลง อำเภอ">
      <Select
        allowClear
        options={[
          'เมืองนครปฐม',
          'นครชัยศรี',
          'สามพราน',
          'ดอนตูม',
          'บางเลน',
          'กำแพงแสน',
          'พุทธมณฑล',
        ].map((d) => ({ label: d, value: d }))}
      />
    </Form.Item>
    <Form.Item name="farmer_moo" label="เกษตรกร หมู่">
      <Input />
    </Form.Item>
    <Form.Item name="farmer_subdistrict" label="เกษตรกร ตำบล">
      <Input />
    </Form.Item>
    <Form.Item name="farmer_district" label="เกษตรกร อำเภอ">
      <Input />
    </Form.Item>
  </>
);

const districts = [
  'เมืองนครปฐม',
  'นครชัยศรี',
  'สามพราน',
  'ดอนตูม',
  'บางเลน',
  'กำแพงแสน',
  'พุทธมณฑล',
];

const COLORS = [
  '#1a7f37',
  '#0969da',
  '#bf8700',
  '#cf222e',
  '#8250df',
  '#0550ae',
  '#bc8c00',
  '#2da44e',
];

const matchesFilters = (row, filters) =>
  Object.entries(filters || {}).every(([key, value]) => {
    if (value === undefined || value === null || value === '') return true;
    if (key === 'cert_date') return String(row.cert_date || '').includes(value);
    if (key === 'exp_date') return String(row.exp_date || '').includes(value);
    return row[key] === value;
  });

const thaiYearsFrom = (rows, key) => {
  const years = new Set();
  rows.forEach((item) => {
    const parts = String(item[key] || '').split('/');
    if (parts.length === 3 && parts[2].length === 4 && !isNaN(parts[2]))
      years.add(parts[2]);
  });
  return Array.from(years)
    .sort()
    .reverse()
    .map((year) => ({ label: year, value: year }));
};

export default function Certifications({ publicMode = false }) {
  const { role } = useAuth();
  const isPublic = publicMode || role === 'guest';
  const tableColumns = useMemo(
    () =>
      isPublic
        ? columns.filter((col) => !guestHiddenColumns.has(col.dataIndex))
        : columns,
    [isPublic]
  );

  useEffect(() => {
    document.title = 'มาตรฐาน GAP นครปฐม | ศูนย์ข้อมูลการเกษตรนครปฐม';
    const meta = document.querySelector('meta[name="description"]');
    if (meta)
      meta.setAttribute(
        'content',
        'ข้อมูลมาตรฐาน GAP จังหวัดนครปฐม พร้อมสรุปแยกตามพืช พื้นที่ และอายุใบรับรอง'
      );
  }, []);

  const [pageFilters, setPageFilters] = useState({});

  const fetchCertifications = async () => {
    if (isPublic) {
      const res = await fetch('/api/public-certifications?count=1');
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || `HTTP ${res.status}`);
      return [];
    }

    const { data, error } = await supabase.from('certifications').select('*');
    if (error && error.code !== '42P01') throw error; // ignore if table doesn't exist yet
    return data || [];
  };

  const { data: dashboardData = [], isLoading: loading } = useApiCache(
    ['all-certifications-v2', isPublic ? 'public' : role],
    fetchCertifications,
    { staleMinutes: 10 }
  );

  const fetchPublicTableData = async ({
    pagination,
    search,
    filters,
    sorter,
    defaultSort,
  }) => {
    const activeSort = sorter?.field && sorter?.order ? sorter : defaultSort;
    const params = new URLSearchParams({
      page: String(pagination.current || 1),
      pageSize: String(pagination.pageSize || 10),
      sort: activeSort?.field || 'created_at',
      order: activeSort?.order === 'ascend' ? 'asc' : 'desc',
    });
    if (search) params.set('search', search);
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, value);
      }
    });
    const res = await fetch(`/api/public-certifications?${params}`);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || `HTTP ${res.status}`);
    return { data: payload.data || [], total: payload.count || 0 };
  };

  const cropOptions = useMemo(() => {
    const unique = [
      ...new Set(dashboardData.map((d) => d.crop_name).filter(Boolean)),
    ].sort();
    return unique.map((c) => ({ label: c, value: c }));
  }, [dashboardData]);

  const districtOptions = useMemo(() => {
    const unique = [
      ...new Set(dashboardData.map((d) => d.plot_district).filter(Boolean)),
    ].sort();
    return unique.map((d) => ({ label: d, value: d }));
  }, [dashboardData]);

  const certYearOptions = useMemo(
    () => thaiYearsFrom(dashboardData, 'cert_date'),
    [dashboardData]
  );

  const expireYearOptions = useMemo(
    () => thaiYearsFrom(dashboardData, 'exp_date'),
    [dashboardData]
  );

  const plotSubdistrictOptions = useMemo(() => {
    const rows = pageFilters.plot_district
      ? dashboardData.filter(
          (item) => item.plot_district === pageFilters.plot_district
        )
      : dashboardData;
    return [
      ...new Set(rows.map((item) => item.plot_subdistrict).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b, 'th'));
  }, [dashboardData, pageFilters.plot_district]);

  const tableFilterConfig = useMemo(
    () => [
      {
        key: 'cert_date',
        label: 'ปี',
        options: certYearOptions.map((o) => o.value),
        operator: 'ilike',
      },
      {
        key: 'exp_date',
        label: 'ปีหมดอายุ',
        options: expireYearOptions.map((o) => o.value),
        operator: 'ilike',
      },
      {
        key: 'plot_district',
        label: 'อำเภอ (แปลง)',
        options: [
          ...new Set(districtOptions.map((o) => o.value).concat(districts)),
        ],
      },
      {
        key: 'plot_subdistrict',
        label: 'ตำบล (แปลง)',
        options: plotSubdistrictOptions,
      },
      {
        key: 'crop_name',
        label: 'ชนิดพืช',
        options: cropOptions.map((o) => o.value),
      },
    ],
    [
      certYearOptions,
      cropOptions,
      districtOptions,
      expireYearOptions,
      plotSubdistrictOptions,
    ]
  );

  const handlePageFilterChange = (key, value) => {
    setPageFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'plot_district' ? { plot_subdistrict: undefined } : {}),
    }));
  };

  const clearPageFilters = () => setPageFilters({});

  const hasPageFilters = Object.values(pageFilters).some(
    (value) => value !== undefined && value !== null && value !== ''
  );

  // Derived filtered data
  const filteredData = useMemo(
    () =>
      isPublic
        ? []
        : dashboardData.filter((item) => matchesFilters(item, pageFilters)),
    [dashboardData, isPublic, pageFilters]
  );

  // 1. Calculate and find the TRUE Top 10 Crops by Total Planted Area (Rai)
  const top10Crops = useMemo(() => {
    const cropArea = {};
    filteredData.forEach((item) => {
      const crop = item.crop_name || 'ไม่ระบุพืช';
      cropArea[crop] = (cropArea[crop] || 0) + (Number(item.area_rai) || 0);
    });
    return Object.entries(cropArea)
      .sort((a, b) => b[1] - a[1]) // Sort descending by Area Rai
      .slice(0, 10) // Take Top 10
      .map((entry) => entry[0]);
  }, [filteredData]);

  // 2. Pie Chart: Number of unique farmers ONLY for the Top 10 Crops
  const pieData = useMemo(() => {
    const cropFarmers = {};
    const cropPlots = {};
    filteredData.forEach((item) => {
      const crop = item.crop_name || 'ไม่ระบุพืช';
      if (!top10Crops.includes(crop)) return; // Only process Top 10 crops

      cropPlots[crop] = (cropPlots[crop] || 0) + 1;
      if (!cropFarmers[crop]) cropFarmers[crop] = new Set();
      const farmerKey = item.farmer_name || item.farmer_key;
      if (farmerKey) cropFarmers[crop].add(farmerKey);
    });

    // Ensure they remain in the Top 10 sorted order
    return top10Crops
      .map((name) => ({
        name,
        value: isPublic
          ? cropPlots[name] || 0
          : cropFarmers[name]
            ? cropFarmers[name].size
            : 0,
      }))
      .filter((d) => d.value > 0);
  }, [filteredData, isPublic, top10Crops]);

  // 3. Bar Chart: Number of unique farmers by district (stacked by the Top 10 Crops)
  const { barData, barGroups } = useMemo(() => {
    const districtCropFarmers = {};

    filteredData.forEach((item) => {
      const dist = item.plot_district || 'ไม่ระบุอำเภอ';
      const crop = item.crop_name || 'ไม่ระบุพืช';
      const farmer = item.farmer_name || item.farmer_key;

      if (!top10Crops.includes(crop)) return; // Only process Top 10 crops

      if (!districtCropFarmers[dist]) {
        districtCropFarmers[dist] = { _totalSet: new Set(), _totalPlots: 0 };
      }
      if (!districtCropFarmers[dist][crop]) {
        districtCropFarmers[dist][crop] = isPublic ? 0 : new Set();
      }

      if (isPublic) {
        districtCropFarmers[dist][crop] += 1;
        districtCropFarmers[dist]._totalPlots += 1;
      } else if (farmer) {
        districtCropFarmers[dist][crop].add(farmer);
        districtCropFarmers[dist]._totalSet.add(farmer);
      }
    });

    const barDataArray = Object.keys(districtCropFarmers)
      .map((dist) => {
        const obj = {
          name: dist,
          total: isPublic
            ? districtCropFarmers[dist]._totalPlots
            : districtCropFarmers[dist]._totalSet.size,
        };
        top10Crops.forEach((crop) => {
          obj[crop] = isPublic
            ? districtCropFarmers[dist][crop] || 0
            : districtCropFarmers[dist][crop]
              ? districtCropFarmers[dist][crop].size
              : 0;
        });
        return obj;
      })
      .sort((a, b) => b.total - a.total); // Sort districts by total farmers descending

    return { barData: barDataArray, barGroups: top10Crops };
  }, [filteredData, isPublic, top10Crops]);

  // 4. Horizontal Bar Chart: Total Production Volume (Kg) by Crop (Top 10 by Volume)
  const volumeData = useMemo(() => {
    const cropVolume = {};
    filteredData.forEach((item) => {
      const crop = item.crop_name || 'ไม่ระบุพืช';
      cropVolume[crop] =
        (cropVolume[crop] || 0) + (Number(item.production_volume_kg) || 0);
    });
    return Object.entries(cropVolume)
      .sort((a, b) => b[1] - a[1]) // Sort descending
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0);
  }, [filteredData]);

  // 5. Line/Bar Chart: Certificates Expiring by Year
  const expireData = useMemo(() => {
    const yearCount = {};
    filteredData.forEach((item) => {
      if (!item.exp_date) return;
      const parts = item.exp_date.split('/');
      const year = parts.length === 3 ? parts[2] : 'ไม่ระบุ';
      // Simple validation: check if it looks like a year (4 digits)
      if (year.length === 4 && !isNaN(year)) {
        yearCount[year] = (yearCount[year] || 0) + 1;
      }
    });
    return Object.entries(yearCount)
      .sort((a, b) => a[0].localeCompare(b[0])) // Sort chronologically year by year
      .map(([year, count]) => ({ year, count }));
  }, [filteredData]);

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
            สรุปข้อมูลเกษตรกรมาตรฐาน GAP
          </span>
        </div>

        {/* Filters */}
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
          {tableFilterConfig.map((filter) => (
            <div
              key={filter.key}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span style={{ fontSize: 13, color: '#656d76', fontWeight: 500 }}>
                {filter.label}:
              </span>
              <Select
                value={pageFilters[filter.key]}
                onChange={(value) => handlePageFilterChange(filter.key, value)}
                options={filter.options.map((option) =>
                  typeof option === 'object'
                    ? option
                    : { label: String(option), value: option }
                )}
                placeholder="ทั้งหมด"
                allowClear
                style={{ minWidth: filter.key === 'exp_date' ? 120 : 150 }}
                size="small"
                showSearch
              />
            </div>
          ))}
          {hasPageFilters && (
            <a
              onClick={clearPageFilters}
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
        {loading ? (
          <div
            style={{
              height: 300,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Spin tip="กำลังโหลด..." />
          </div>
        ) : (
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card
                title={
                  isPublic
                    ? 'จำนวนแปลง แยกตามชนิดพืช (Top 10)'
                    : 'จำนวนเกษตรกร (ราย) แยกตามชนิดพืช (Top 10)'
                }
                size="small"
                bordered={false}
                style={{ background: '#fafbfc' }}
              >
                <div style={{ height: 300 }}>
                  {pieData.length > 0 ? (
                    <EChart
                      option={pieOption(pieData, {
                        colors: COLORS,
                        unit: isPublic ? 'แปลง' : 'ราย',
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
                      ไม่พบข้อมูล (รอการเพิ่มไฟล์ฐานข้อมูล)
                    </div>
                  )}
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card
                title={
                  isPublic
                    ? 'ภาพรวมจำนวนแปลง แยกตามอำเภอ (เฉพาะพืชที่มีพื้นที่ปลูก 10 อันดับแรก)'
                    : 'ภาพรวมจำนวนเกษตรกร (ราย) แยกตามอำเภอ (เฉพาะพืชที่มีพื้นที่ปลูก 10 อันดับแรก)'
                }
                size="small"
                bordered={false}
                style={{ background: '#fafbfc' }}
              >
                <div style={{ height: 300 }}>
                  {barData.length > 0 ? (
                    <EChart
                      option={barOption(
                        barData,
                        barGroups.slice(0, 10).map((group, index) => ({
                          key: group,
                          name: group,
                          color: COLORS[index % COLORS.length],
                          maxBarSize: 50,
                        })),
                        {
                          colors: COLORS,
                          unit: isPublic ? 'แปลง' : 'ราย',
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
                      ไม่พบข้อมูล (รอการเพิ่มไฟล์ฐานข้อมูล)
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {!loading && (
          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            <Col xs={24} lg={12}>
              <Card
                title="ปริมาณผลผลิตรวม (กิโลกรัม) - 10 อันดับแรก"
                size="small"
                bordered={false}
                style={{ background: '#fafbfc' }}
              >
                <div style={{ height: 300 }}>
                  {volumeData.length > 0 ? (
                    <EChart
                      option={barOption(
                        volumeData,
                        [
                          {
                            key: 'value',
                            name: 'ผลผลิต',
                            color: (_item, index) =>
                              COLORS[(index + 4) % COLORS.length],
                            maxBarSize: 30,
                          },
                        ],
                        { layout: 'vertical', unit: 'กก.', grid: { left: 88 } }
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
            <Col xs={24} lg={12}>
              <Card
                title="แนวโน้มใบรับรอง GAP หมดอายุ (แบ่งตามปี)"
                size="small"
                bordered={false}
                style={{ background: '#fafbfc' }}
              >
                <div style={{ height: 300 }}>
                  {expireData.length > 0 ? (
                    <EChart
                      option={comboOption(
                        expireData,
                        [
                          {
                            key: 'count',
                            name: 'ใบรับรองจะหมดอายุ',
                            color: '#3b82f6',
                            maxBarSize: 50,
                          },
                          {
                            key: 'count',
                            name: 'แนวโน้ม',
                            color: '#f59e0b',
                            type: 'line',
                          },
                        ],
                        {
                          categoryKey: 'year',
                          unit: 'แปลง',
                          colors: ['#3b82f6', '#f59e0b'],
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

      {/* ===== Data Table Section ===== */}
      <CrudTable
        tableName="certifications"
        title="ฐานข้อมูลมาตรฐาน GAP"
        columns={tableColumns}
        formFields={formFields}
        searchField="farmer_name"
        searchFields={['farmer_name', 'plot_code', 'crop_name']}
        filterConfig={tableFilterConfig}
        controlledFilters={pageFilters}
        onFiltersChange={setPageFilters}
        hideFilterBar
        readOnly={isPublic}
        fetchDataOverride={isPublic ? fetchPublicTableData : null}
        fetchAllOverride={isPublic ? async () => [] : null}
      />
    </div>
  );
}
