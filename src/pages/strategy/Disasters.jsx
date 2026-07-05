import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Col,
  Input,
  Popover,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import EChart from '../../components/widgets/EChart';
import { barOption, pieOption } from '../../components/charts/echartOptions';
import { PageHeader } from '../../components/widgets/SharedDashboardUI';
import { supabase } from '../../supabaseClient';
import seedRows from '../../data/disasters_by_village_seed.json';
import { downloadCsv, rowsToCsv } from '../../utils/csv';

const formatNumber = (value) =>
  Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 });

const compareText = (a, b, key) =>
  String(a[key] || '').localeCompare(String(b[key] || ''), 'th');

const columns = [
  {
    title: 'ปี',
    dataIndex: 'year',
    width: 80,
    align: 'center',
    sorter: (a, b) => a.year - b.year,
  },
  {
    title: 'ประเภทภัย',
    dataIndex: 'disaster_type',
    width: 130,
    sorter: (a, b) => compareText(a, b, 'disaster_type'),
  },
  {
    title: 'อำเภอ',
    dataIndex: 'district',
    width: 140,
    sorter: (a, b) => compareText(a, b, 'district'),
  },
  {
    title: 'ตำบล',
    dataIndex: 'subdistrict',
    width: 150,
    sorter: (a, b) => compareText(a, b, 'subdistrict'),
  },
  {
    title: 'หมู่ที่',
    dataIndex: 'village_no',
    width: 90,
    align: 'center',
    sorter: (a, b) => Number(a.village_no || 0) - Number(b.village_no || 0),
  },
  {
    title: 'พื้นที่เสียหาย (ไร่)',
    dataIndex: 'affected_area_rai',
    width: 150,
    align: 'right',
    render: (value) => (value ? formatNumber(value) : ''),
    sorter: (a, b) =>
      Number(a.affected_area_rai || 0) - Number(b.affected_area_rai || 0),
  },
  {
    title: 'เกษตรกรได้รับผลกระทบ',
    dataIndex: 'affected_farmers',
    width: 170,
    align: 'right',
    render: (value) => (value ? formatNumber(value) : ''),
    sorter: (a, b) =>
      Number(a.affected_farmers || 0) - Number(b.affected_farmers || 0),
  },
  {
    title: 'หมายเหตุ',
    dataIndex: 'notes',
    width: 220,
    ellipsis: true,
    sorter: (a, b) => compareText(a, b, 'notes'),
  },
];

const defaultColumnKeys = columns.map((column) => column.dataIndex);

const countBy = (rows, key) =>
  Object.entries(
    rows.reduce((acc, row) => {
      const name = row[key] || 'ไม่ระบุ';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

const unique = (rows, key) =>
  [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), 'th')
  );

function normalizeDbRows(rows) {
  return rows.map((row, index) => ({
    id: row.id || `db-${index}`,
    year: Number(row.year) || null,
    disaster_type: row.disaster_type || '',
    district: row.district || '',
    subdistrict: row.subdistrict || '',
    village_no: row.village_no || '',
    affected_area_rai: row.affected_area_rai ?? row.damaged_area ?? null,
    affected_farmers: row.affected_farmers ?? null,
    notes: row.notes || '',
  }));
}

async function getRows() {
  const { data, error } = await supabase
    .from('disasters')
    .select('*')
    .order('year', { ascending: false });

  if (!error && data?.length) return normalizeDbRows(data);
  return seedRows;
}

export default function Disasters() {
  const [rows, setRows] = useState(seedRows);
  const [year, setYear] = useState(null);
  const [district, setDistrict] = useState(null);
  const [subdistrict, setSubdistrict] = useState(null);
  const [disasterType, setDisasterType] = useState(null);
  const [search, setSearch] = useState('');
  const [searchText, setSearchText] = useState('');
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(defaultColumnKeys);

  useEffect(() => {
    document.title = 'ภัยพิบัติทางการเกษตรนครปฐม | ศูนย์ข้อมูลการเกษตรนครปฐม';
    getRows().then(setRows);
  }, []);

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!year || row.year === year) &&
          (!district || row.district === district) &&
          (!subdistrict || row.subdistrict === subdistrict) &&
          (!disasterType || row.disaster_type === disasterType)
      ),
    [rows, year, district, subdistrict, disasterType]
  );

  const tableRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return filteredRows;
    return filteredRows.filter((row) =>
      [
        'year',
        'disaster_type',
        'district',
        'subdistrict',
        'village_no',
        'notes',
      ].some((key) =>
        String(row[key] || '')
          .toLowerCase()
          .includes(needle)
      )
    );
  }, [filteredRows, search]);

  const visibleColumns = useMemo(
    () =>
      columns.filter((column) => visibleColumnKeys.includes(column.dataIndex)),
    [visibleColumnKeys]
  );

  const reloadRows = async () => {
    setRows(await getRows());
  };

  const exportRows = (targetRows, filename) => {
    const exportColumns = columns.filter((column) =>
      visibleColumnKeys.includes(column.dataIndex)
    );
    downloadCsv(
      filename,
      rowsToCsv([
        exportColumns.map((column) => column.title),
        ...targetRows.map((row) =>
          exportColumns.map((column) => row[column.dataIndex] ?? '')
        ),
      ])
    );
  };

  const districtOptions = useMemo(() => unique(rows, 'district'), [rows]);
  const subdistrictOptions = useMemo(
    () =>
      unique(
        district ? rows.filter((row) => row.district === district) : rows,
        'subdistrict'
      ),
    [rows, district]
  );

  const byYear = useMemo(
    () =>
      countBy(filteredRows, 'year').sort(
        (a, b) => Number(a.name) - Number(b.name)
      ),
    [filteredRows]
  );
  const byDistrict = useMemo(
    () => countBy(filteredRows, 'district'),
    [filteredRows]
  );

  const totalVillages = useMemo(
    () =>
      new Set(
        filteredRows.map(
          (row) =>
            `${row.year}-${row.district}-${row.subdistrict}-${row.village_no}`
        )
      ).size,
    [filteredRows]
  );
  const latestYear = Math.max(...rows.map((row) => row.year).filter(Boolean));
  const topDistrict = byDistrict[0];

  return (
    <div>
      <PageHeader
        title="ข้อมูลภัยพิบัติทางการเกษตร"
        subtitle="สรุปข้อมูลภัยพิบัติรายปี รายอำเภอ รายตำบล และรายหมู่บ้านจากไฟล์รวมข้อมูลภัยแยกหมู่"
        icon={ThunderboltOutlined}
      />

      <Card size="small" style={{ borderRadius: 8, marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          {[
            {
              label: 'ปี',
              value: year,
              onChange: setYear,
              options: unique(rows, 'year').map((item) => ({
                label: item,
                value: item,
              })),
            },
            {
              label: 'อำเภอ',
              value: district,
              onChange: (value) => {
                setDistrict(value);
                setSubdistrict(null);
              },
              options: districtOptions.map((item) => ({
                label: item,
                value: item,
              })),
            },
            {
              label: 'ตำบล',
              value: subdistrict,
              onChange: setSubdistrict,
              options: subdistrictOptions.map((item) => ({
                label: item,
                value: item,
              })),
            },
            {
              label: 'ประเภทภัย',
              value: disasterType,
              onChange: setDisasterType,
              options: unique(rows, 'disaster_type').map((item) => ({
                label: item,
                value: item,
              })),
            },
          ].map((filter) => (
            <Col xs={24} sm={12} lg={6} key={filter.label}>
              <div
                style={{ fontWeight: 700, color: '#475569', marginBottom: 6 }}
              >
                {filter.label}
              </div>
              <Select
                allowClear
                showSearch
                value={filter.value}
                onChange={filter.onChange}
                options={filter.options}
                placeholder={`เลือก${filter.label}`}
                style={{ width: '100%' }}
              />
            </Col>
          ))}
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          {
            label: 'รายการทั้งหมด',
            value: `${formatNumber(filteredRows.length)} รายการ`,
          },
          {
            label: 'หมู่บ้าน/เหตุการณ์',
            value: `${formatNumber(totalVillages)} รายการ`,
          },
          {
            label: 'ปีล่าสุดในชุดข้อมูล',
            value: latestYear || '-',
          },
          {
            label: 'อำเภอพบมากสุด',
            value: topDistrict
              ? `${topDistrict.name} ${formatNumber(topDistrict.value)}`
              : '-',
          },
        ].map((item) => (
          <Col xs={24} sm={12} lg={6} key={item.label}>
            <Card size="small" style={{ borderRadius: 8, height: '100%' }}>
              <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>
                {item.label}
              </div>
              <div
                style={{
                  color: '#0f172a',
                  fontSize: 22,
                  fontWeight: 800,
                  marginTop: 4,
                }}
              >
                {item.value}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="จำนวนเหตุภัยพิบัติแยกตามปี" style={{ borderRadius: 8 }}>
            <div style={{ height: 340 }}>
              <EChart
                option={barOption(
                  byYear,
                  [
                    {
                      key: 'value',
                      name: 'จำนวนรายการ',
                      color: '#2563eb',
                    },
                  ],
                  {
                    unit: 'รายการ',
                    layout: 'horizontal',
                    compact: true,
                    rotate: 0,
                    grid: { bottom: 48 },
                  }
                )}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="สัดส่วนภัยพิบัติแยกตามอำเภอ" style={{ borderRadius: 8 }}>
            <div style={{ height: 340 }}>
              <EChart
                option={pieOption(byDistrict.slice(0, 8), {
                  unit: 'รายการ',
                  legend: 'right',
                })}
              />
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <span>
            ตารางข้อมูลภัยพิบัติ{' '}
            <Tag color="green">
              ทั้งหมด {formatNumber(tableRows.length)} รายการ
            </Tag>
          </span>
        }
        style={{ borderRadius: 8 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          <Input.Search
            allowClear
            value={searchText}
            onChange={(event) => {
              setSearchText(event.target.value);
              if (!event.target.value) setSearch('');
            }}
            onSearch={setSearch}
            placeholder="ค้นหา..."
            prefix={<SearchOutlined />}
            style={{ width: 260 }}
          />
          <Space wrap>
            <Tooltip title="รีเฟรช">
              <Button icon={<ReloadOutlined />} onClick={reloadRows} />
            </Tooltip>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => exportRows(tableRows, 'disasters-filtered.csv')}
            >
              Export CSV
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => exportRows(rows, 'disasters-all.csv')}
            >
              Export All CSV
            </Button>
            <Popover
              trigger="click"
              placement="bottomRight"
              content={
                <div style={{ width: 240 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>
                    เลือกคอลัมน์ที่แสดง
                  </div>
                  <Space direction="vertical">
                    {columns.map((column) => (
                      <Checkbox
                        key={column.dataIndex}
                        checked={visibleColumnKeys.includes(column.dataIndex)}
                        onChange={(event) =>
                          setVisibleColumnKeys((current) =>
                            event.target.checked
                              ? [...current, column.dataIndex]
                              : current.filter(
                                  (key) => key !== column.dataIndex
                                )
                          )
                        }
                      >
                        {column.title}
                      </Checkbox>
                    ))}
                  </Space>
                  <Space style={{ marginTop: 12 }}>
                    <Button
                      size="small"
                      onClick={() => setVisibleColumnKeys(defaultColumnKeys)}
                    >
                      เลือกทั้งหมด
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setVisibleColumnKeys(defaultColumnKeys)}
                    >
                      ค่าเริ่มต้น
                    </Button>
                  </Space>
                </div>
              }
            >
              <Button icon={<SettingOutlined />}>
                คอลัมน์ {visibleColumnKeys.length}/{columns.length}
              </Button>
            </Popover>
          </Space>
        </div>
        <Table
          rowKey="id"
          columns={visibleColumns}
          dataSource={tableRows}
          size="middle"
          scroll={{ x: 1230 }}
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      </Card>
    </div>
  );
}
