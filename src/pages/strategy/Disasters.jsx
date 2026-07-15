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
} from 'antd';
import {
  DownloadOutlined,
  SearchOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import EChart from '../../components/widgets/EChart';
import FloodMap from '../../components/Map/FloodMap';
import { barOption, pieOption } from '../../components/charts/echartOptions';
import { PageHeader } from '../../components/widgets/SharedDashboardUI';
import rows from '../../data/disasters_by_village_seed.json';
import { groupSum, sumField, toFloodMapPoint } from '../../utils/floodData';
import { downloadCsv, rowsToCsv } from '../../utils/csv';

const formatNumber = (value, maximumFractionDigits = 2) =>
  Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits });

const compareText = (a, b, key) =>
  String(a[key] || '').localeCompare(String(b[key] || ''), 'th');

const numberColumn = (title, dataIndex, width = 130) => ({
  title,
  dataIndex,
  width,
  align: 'right',
  render: (value) =>
    value === '' || value == null ? '-' : formatNumber(value, 4),
  sorter: (a, b) => Number(a[dataIndex] || 0) - Number(b[dataIndex] || 0),
});

const columns = [
  {
    title: 'ลำดับ',
    dataIndex: 'id',
    width: 85,
    align: 'center',
    sorter: (a, b) => a.id - b.id,
  },
  {
    title: 'ปี',
    dataIndex: 'year',
    width: 85,
    align: 'center',
    sorter: (a, b) => a.year - b.year,
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
    title: 'หมู่',
    dataIndex: 'village_no',
    width: 80,
    align: 'center',
    sorter: (a, b) => a.village_no - b.village_no,
  },
  { title: 'UTM Zone', dataIndex: 'utm_zone', width: 100, align: 'center' },
  numberColumn('พิกัด UTM (X)', 'utm_x', 140),
  numberColumn('พิกัด UTM (Y)', 'utm_y', 145),
  {
    title: 'กลุ่มกิจกรรม',
    dataIndex: 'activity_group',
    width: 190,
    sorter: (a, b) => compareText(a, b, 'activity_group'),
  },
  {
    title: 'ชนิดพืช',
    dataIndex: 'crop_type',
    width: 220,
    sorter: (a, b) => compareText(a, b, 'crop_type'),
  },
  {
    title: 'พันธุ์',
    dataIndex: 'variety',
    width: 240,
    render: (value) => value || '-',
    sorter: (a, b) => compareText(a, b, 'variety'),
  },
  numberColumn('เนื้อที่ปลูก (ไร่)', 'planted_area_rai', 145),
  numberColumn('เนื้อที่ประสบภัย (ไร่)', 'affected_area_rai', 175),
];

const defaultColumnKeys = columns.map((column) => column.dataIndex);
const unique = (items, key) =>
  [
    ...new Set(
      items
        .map((row) => row[key])
        .filter((value) => value !== '' && value != null)
    ),
  ].sort((a, b) =>
    typeof a === 'number' ? a - b : String(a).localeCompare(String(b), 'th')
  );

export default function Disasters() {
  const [year, setYear] = useState(null);
  const [district, setDistrict] = useState(null);
  const [subdistrict, setSubdistrict] = useState(null);
  const [activityGroup, setActivityGroup] = useState(null);
  const [cropType, setCropType] = useState(null);
  const [search, setSearch] = useState('');
  const [searchText, setSearchText] = useState('');
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(defaultColumnKeys);

  useEffect(() => {
    document.title = 'ข้อมูลอุทกภัยจังหวัดนครปฐม | ศูนย์ข้อมูลการเกษตรนครปฐม';
  }, []);

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!year || row.year === year) &&
          (!district || row.district === district) &&
          (!subdistrict || row.subdistrict === subdistrict) &&
          (!activityGroup || row.activity_group === activityGroup) &&
          (!cropType || row.crop_type === cropType)
      ),
    [year, district, subdistrict, activityGroup, cropType]
  );

  const tableRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return filteredRows;
    return filteredRows.filter((row) =>
      [
        'year',
        'district',
        'subdistrict',
        'village_no',
        'activity_group',
        'crop_type',
        'variety',
      ].some((key) =>
        String(row[key] || '')
          .toLowerCase()
          .includes(needle)
      )
    );
  }, [filteredRows, search]);

  const districtRows = district
    ? rows.filter((row) => row.district === district)
    : rows;
  const activityRows = activityGroup
    ? districtRows.filter((row) => row.activity_group === activityGroup)
    : districtRows;
  const byYear = useMemo(
    () => groupSum(filteredRows, 'year', 'affected_area_rai'),
    [filteredRows]
  );
  const byDistrict = useMemo(
    () =>
      groupSum(filteredRows, 'district', 'affected_area_rai').sort(
        (a, b) => b.value - a.value
      ),
    [filteredRows]
  );
  const mapPoints = useMemo(
    () => filteredRows.map(toFloodMapPoint).filter(Boolean),
    [filteredRows]
  );
  const visibleColumns = columns.filter((column) =>
    visibleColumnKeys.includes(column.dataIndex)
  );

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

  const filters = [
    {
      label: 'ปี',
      value: year,
      onChange: setYear,
      options: unique(rows, 'year'),
    },
    {
      label: 'อำเภอ',
      value: district,
      options: unique(rows, 'district'),
      onChange: (value) => {
        setDistrict(value);
        setSubdistrict(null);
        setCropType(null);
      },
    },
    {
      label: 'ตำบล',
      value: subdistrict,
      onChange: setSubdistrict,
      options: unique(districtRows, 'subdistrict'),
    },
    {
      label: 'กลุ่มกิจกรรม',
      value: activityGroup,
      options: unique(districtRows, 'activity_group'),
      onChange: (value) => {
        setActivityGroup(value);
        setCropType(null);
      },
    },
    {
      label: 'ชนิดพืช',
      value: cropType,
      onChange: setCropType,
      options: unique(activityRows, 'crop_type'),
    },
  ];

  return (
    <div>
      <PageHeader
        title="ข้อมูลอุทกภัยจังหวัดนครปฐม ปี 2563–2568"
        subtitle="สรุปพื้นที่เพาะปลูกและพื้นที่ประสบภัยจากข้อมูลรายแปลง พร้อมกราฟและพิกัด UTM บนแผนที่"
        icon={ThunderboltOutlined}
      />

      <Card size="small" style={{ borderRadius: 8, marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          {filters.map((filter) => (
            <Col
              xs={24}
              sm={12}
              lg={8}
              xl={Math.floor(24 / filters.length)}
              key={filter.label}
            >
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
                options={filter.options.map((item) => ({
                  label: item,
                  value: item,
                }))}
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
            label: 'รายการข้อมูล',
            value: `${formatNumber(filteredRows.length, 0)} รายการ`,
          },
          {
            label: 'เนื้อที่ปลูก',
            value: `${formatNumber(sumField(filteredRows, 'planted_area_rai'))} ไร่`,
          },
          {
            label: 'เนื้อที่ประสบภัย',
            value: `${formatNumber(sumField(filteredRows, 'affected_area_rai'))} ไร่`,
          },
          {
            label: 'พิกัดใช้งานได้',
            value: `${formatNumber(mapPoints.length, 0)} จุด / ${formatNumber(filteredRows.length, 0)} รายการ`,
            note: `${formatNumber(filteredRows.length - mapPoints.length, 0)} รายการไม่มีพิกัดที่ใช้แสดงได้`,
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
              {item.note && (
                <div style={{ color: '#b45309', fontSize: 12, marginTop: 2 }}>
                  {item.note}
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} xl={12}>
          <Card
            title={
              <span>
                แผนที่พื้นที่ประสบอุทกภัย{' '}
                <Tag color="blue">{formatNumber(mapPoints.length, 0)} จุด</Tag>
                <Tag color="orange">
                  ไม่แสดง{' '}
                  {formatNumber(filteredRows.length - mapPoints.length, 0)}{' '}
                  รายการ
                </Tag>
              </span>
            }
            style={{ borderRadius: 8 }}
          >
            <FloodMap points={mapPoints} />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card title="พื้นที่ประสบภัยแยกตามปี" style={{ borderRadius: 8 }}>
                <div style={{ height: 280 }}>
                  <EChart
                    option={barOption(
                      byYear,
                      [
                        {
                          key: 'value',
                          name: 'พื้นที่ประสบภัย',
                          color: '#2563eb',
                        },
                      ],
                      {
                        unit: 'ไร่',
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
            <Col span={24}>
              <Card
                title="สัดส่วนพื้นที่ประสบภัยแยกตามอำเภอ"
                style={{ borderRadius: 8 }}
              >
                <div style={{ height: 280 }}>
                  <EChart
                    option={pieOption(byDistrict, {
                      unit: 'ไร่',
                      legend: 'right',
                    })}
                  />
                </div>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      <Card
        title={
          <span>
            ตารางข้อมูลอุทกภัย{' '}
            <Tag color="green">{formatNumber(tableRows.length, 0)} รายการ</Tag>
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
            placeholder="ค้นหาอำเภอ ตำบล พืช หรือพันธุ์..."
            prefix={<SearchOutlined />}
            style={{ width: 320 }}
          />
          <Space wrap>
            <Button
              icon={<DownloadOutlined />}
              onClick={() =>
                exportRows(tableRows, 'nakhon-pathom-flood-filtered.csv')
              }
            >
              Export CSV
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => exportRows(rows, 'nakhon-pathom-flood-all.csv')}
            >
              Export All CSV
            </Button>
            <Popover
              trigger="click"
              placement="bottomRight"
              content={
                <div style={{ width: 250 }}>
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
                  <Button
                    size="small"
                    style={{ marginTop: 12 }}
                    onClick={() => setVisibleColumnKeys(defaultColumnKeys)}
                  >
                    เลือกทั้งหมด
                  </Button>
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
          scroll={{ x: 1800 }}
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      </Card>
    </div>
  );
}
