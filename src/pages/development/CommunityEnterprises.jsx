import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Spin,
  Tag,
} from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import CrudTable from '../../components/DataTable/CrudTable';
import { barOption, pieOption } from '../../components/charts/echartOptions';
import { supabase } from '../../supabaseClient';
import { useApiCache } from '../../hooks/useApiCache';
import EChart from '../../components/widgets/EChart';

const districts = [
  'เมืองนครปฐม',
  'นครชัยศรี',
  'สามพราน',
  'ดอนตูม',
  'บางเลน',
  'กำแพงแสน',
  'พุทธมณฑล',
];
const enterpriseTypes = ['วิสาหกิจชุมชน', 'เครือข่ายวิสาหกิจชุมชน'];
const CHART_COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
];
const DISTRICT_COLORS = {
  เมืองนครปฐม: '#0969da',
  นครชัยศรี: '#1a7f37',
  สามพราน: '#bf8700',
  ดอนตูม: '#8250df',
  บางเลน: '#cf222e',
  กำแพงแสน: '#0550ae',
  พุทธมณฑล: '#953800',
};

const columns = [
  {
    title: 'ลำดับ',
    dataIndex: 'sequence_no',
    key: 'sequence_no',
    width: 70,
    align: 'center',
  },
  {
    title: 'วันที่อนุมัติ',
    dataIndex: 'approval_date',
    key: 'approval_date',
    width: 120,
  },
  {
    title: 'ประเภท',
    dataIndex: 'enterprise_type',
    key: 'enterprise_type',
    width: 160,
  },
  {
    title: 'ชื่อวิสาหกิจชุมชน',
    dataIndex: 'enterprise_name',
    key: 'enterprise_name',
    width: 280,
    ellipsis: true,
  },
  {
    title: 'ที่ตั้ง',
    dataIndex: 'address',
    key: 'address',
    width: 200,
    ellipsis: true,
  },
  {
    title: 'หมู่',
    dataIndex: 'village_no',
    key: 'village_no',
    width: 60,
    align: 'center',
  },
  { title: 'ตำบล', dataIndex: 'subdistrict', key: 'subdistrict', width: 120 },
  { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 130 },
];

const formFields = (
  <>
    <Form.Item name="sequence_no" label="ลำดับ">
      <InputNumber style={{ width: '100%' }} min={1} />
    </Form.Item>
    <Form.Item name="approval_date" label="วันที่อนุมัติ">
      <Input />
    </Form.Item>
    <Form.Item
      name="enterprise_type"
      label="ประเภท"
      rules={[{ required: true }]}
    >
      <Select options={enterpriseTypes.map((d) => ({ label: d, value: d }))} />
    </Form.Item>
    <Form.Item
      name="enterprise_name"
      label="ชื่อวิสาหกิจชุมชน"
      rules={[{ required: true }]}
    >
      <Input />
    </Form.Item>
    <Form.Item name="address" label="ที่ตั้ง">
      <Input />
    </Form.Item>
    <Form.Item name="village_no" label="หมู่">
      <InputNumber style={{ width: '100%' }} min={1} />
    </Form.Item>
    <Form.Item name="subdistrict" label="ตำบล">
      <Input />
    </Form.Item>
    <Form.Item name="district" label="อำเภอ" rules={[{ required: true }]}>
      <Select options={districts.map((d) => ({ label: d, value: d }))} />
    </Form.Item>
  </>
);

const thaiYearFrom = (value) => {
  const text = String(value || '');
  const fourDigit = text.match(/(25\d{2})/);
  if (fourDigit) return fourDigit[1];
  const twoDigit = text.match(/(\d{2})\s*$/);
  return twoDigit ? `25${twoDigit[1]}` : '';
};

const uniqueOptions = (rows, key) =>
  [...new Set(rows.map((row) => row[key]).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), 'th'))
    .map((value) => ({ label: value, value }));

const compareValue = (a, b) => {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a || '').localeCompare(String(b || ''), 'th', {
    numeric: true,
  });
};

const matchesFilters = (row, filters) =>
  Object.entries(filters || {}).every(([key, value]) => {
    if (value === undefined || value === null || value === '') return true;
    if (key === 'approval_year')
      return thaiYearFrom(row.approval_date) === value;
    return row[key] === value;
  });

export default function CommunityEnterprises() {
  useEffect(() => {
    document.title = 'วิสาหกิจชุมชนนครปฐม | ศูนย์ข้อมูลการเกษตรนครปฐม';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        'ข้อมูลวิสาหกิจชุมชนจังหวัดนครปฐม พร้อมสรุปจำนวน แยกตามอำเภอ และตารางค้นหาข้อมูลแบบใช้งานได้จริง'
      );
    }
  }, []);

  const [pageFilters, setPageFilters] = useState({});

  const fetchCommunityEnterprises = async () => {
    const { data, error } = await supabase
      .from('community_enterprises')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const { data: chartData = [], isLoading: chartLoading } = useApiCache(
    'community_enterprises_page',
    fetchCommunityEnterprises
  );

  const yearOptions = useMemo(
    () =>
      [
        ...new Set(
          chartData
            .map((row) => thaiYearFrom(row.approval_date))
            .filter(Boolean)
        ),
      ]
        .sort((a, b) => b.localeCompare(a, 'th'))
        .map((year) => ({ label: year, value: year })),
    [chartData]
  );

  const typeOptions = useMemo(
    () => uniqueOptions(chartData, 'enterprise_type'),
    [chartData]
  );

  const districtOptions = useMemo(
    () => uniqueOptions(chartData, 'district'),
    [chartData]
  );

  const subdistrictOptions = useMemo(() => {
    const rows = pageFilters.district
      ? chartData.filter((row) => row.district === pageFilters.district)
      : chartData;
    return uniqueOptions(rows, 'subdistrict');
  }, [chartData, pageFilters.district]);

  const filterConfig = useMemo(
    () => [
      { key: 'approval_year', label: 'ปี', options: yearOptions },
      { key: 'enterprise_type', label: 'ประเภท', options: typeOptions },
      {
        key: 'district',
        label: 'อำเภอ',
        options: districtOptions.length ? districtOptions : districts,
      },
      { key: 'subdistrict', label: 'ตำบล', options: subdistrictOptions },
    ],
    [districtOptions, subdistrictOptions, typeOptions, yearOptions]
  );

  const setFilter = (key, value) => {
    setPageFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'district' ? { subdistrict: undefined } : {}),
    }));
  };

  const clearFilters = () => setPageFilters({});

  const filteredData = useMemo(
    () => chartData.filter((item) => matchesFilters(item, pageFilters)),
    [chartData, pageFilters]
  );

  const pieData = useMemo(
    () =>
      Object.entries(
        filteredData.reduce((acc, item) => {
          const district = item.district || 'ไม่ระบุ';
          acc[district] = (acc[district] || 0) + 1;
          return acc;
        }, {})
      )
        .map(([name, value]) => ({
          name,
          value,
          color: DISTRICT_COLORS[name] || '#656d76',
        }))
        .sort((a, b) => b.value - a.value),
    [filteredData]
  );

  const { barData, barGroups } = useMemo(() => {
    const counts = {};
    const typeSet = new Set();
    filteredData.forEach((item) => {
      const district = item.district || 'ไม่ระบุ';
      const type = item.enterprise_type || 'ไม่ระบุ';
      if (!counts[district]) counts[district] = { name: district, total: 0 };
      counts[district][type] = (counts[district][type] || 0) + 1;
      counts[district].total += 1;
      typeSet.add(type);
    });
    return {
      barData: Object.values(counts).sort((a, b) => b.total - a.total),
      barGroups: [...typeSet].sort(),
    };
  }, [filteredData]);

  const fetchTableData = ({ pagination, search, searchFields, sorter }) => {
    const needle = String(search || '')
      .trim()
      .toLowerCase();
    const searchedRows = needle
      ? filteredData.filter((row) =>
          (searchFields || []).some((field) =>
            String(row[field] || '')
              .toLowerCase()
              .includes(needle)
          )
        )
      : filteredData;
    const sortedRows =
      sorter?.field && sorter?.order
        ? [...searchedRows].sort(
            (a, b) =>
              compareValue(a[sorter.field], b[sorter.field]) *
              (sorter.order === 'ascend' ? 1 : -1)
          )
        : searchedRows;
    const start = (pagination.current - 1) * pagination.pageSize;
    return {
      data: sortedRows.slice(start, start + pagination.pageSize),
      total: sortedRows.length,
    };
  };

  const hasActiveFilter = Object.values(pageFilters).some(
    (value) => value !== undefined && value !== null && value !== ''
  );

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
            สรุปข้อมูลวิสาหกิจชุมชน
          </span>
          <Tag color="green">
            {hasActiveFilter
              ? `แสดงผล ${filteredData.length} จาก ${chartData.length} แห่ง`
              : `รวมทั้งหมด ${chartData.length} แห่ง`}
          </Tag>
        </div>

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
          {filterConfig.map((filter) => (
            <div
              key={filter.key}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span style={{ fontSize: 13, color: '#656d76', fontWeight: 500 }}>
                {filter.label}:
              </span>
              <Select
                value={pageFilters[filter.key]}
                onChange={(value) => setFilter(filter.key, value)}
                options={filter.options.map((option) =>
                  typeof option === 'object'
                    ? option
                    : { label: String(option), value: option }
                )}
                placeholder="ทั้งหมด"
                allowClear
                showSearch
                style={{ minWidth: filter.key === 'subdistrict' ? 180 : 150 }}
                size="small"
              />
            </div>
          ))}
          {hasActiveFilter && (
            <a
              onClick={clearFilters}
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
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card
                title="สัดส่วนตามอำเภอ"
                size="small"
                bordered={false}
                style={{ background: '#fafbfc' }}
              >
                <div style={{ height: 300 }}>
                  <EChart
                    option={pieOption(pieData, {
                      colors: CHART_COLORS,
                      unit: 'แห่ง',
                    })}
                  />
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card
                title="วิสาหกิจชุมชนแยกตามอำเภอและประเภท"
                size="small"
                bordered={false}
                style={{ background: '#fafbfc' }}
              >
                <div style={{ height: 300 }}>
                  <EChart
                    option={barOption(
                      barData,
                      barGroups.map((type, index) => ({
                        key: type,
                        name: type,
                        color: CHART_COLORS[index % CHART_COLORS.length],
                        maxBarSize: 50,
                      })),
                      {
                        colors: CHART_COLORS,
                        unit: 'แห่ง',
                        stacked: true,
                        totalKey: 'total',
                      }
                    )}
                  />
                </div>
              </Card>
            </Col>
          </Row>
        )}
      </div>

      <CrudTable
        tableName="community_enterprises"
        title="วิสาหกิจชุมชน"
        columns={columns}
        formFields={formFields}
        searchField="enterprise_name"
        searchFields={['enterprise_name', 'district', 'subdistrict', 'address']}
        filterConfig={filterConfig}
        controlledFilters={pageFilters}
        onFiltersChange={setPageFilters}
        hideFilterBar
        fetchDataOverride={fetchTableData}
        fetchAllOverride={() => filteredData}
      />
    </div>
  );
}
