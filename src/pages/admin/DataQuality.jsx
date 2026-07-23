import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Progress,
  Alert,
  Button,
  Spin,
  Statistic,
  Row,
  Col,
  Input,
  Tag,
} from 'antd';
import {
  ReloadOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  PieChartOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { supabase } from '../../supabaseClient';
import { rowsToCsv } from '../../utils/csv';
import EChart from '../../components/widgets/EChart';
import '../../styles/dashboard.css';

const TABLE_LABELS = {
  farmer_registry: 'ทะเบียนเกษตรกร',
  agricultural_areas: 'พื้นที่การเกษตร',
  learning_centers: 'ศูนย์เรียนรู้ (ศพก.)',
  gis_areas: 'พื้นที่ชลประทาน/แผนที่ GIS',
  disasters: 'ภัยพิบัติด้านการเกษตร',
  large_plots: 'แปลงใหญ่การเกษตร',
  certifications: 'มาตรฐาน GAP',
  crop_production: 'ผลผลิตพืชหลัก',
  production_costs: 'ต้นทุนการผลิตพืช',
  community_enterprises: 'วิสาหกิจชุมชน',
  smart_farmers: 'ข้อมูลเกษตรกรรวม',
  smart_farmer_sf: 'เกษตรกรปราดเปรื่อง (SF)',
  young_smart_farmer_ysf: 'เกษตรกรรุ่นใหม่ (YSF)',
  agricultural_career_groups: 'กลุ่มส่งเสริมอาชีพการเกษตร',
  farmer_groups: 'กลุ่มเกษตรกรรวม',
  housewife_farmer_groups: 'กลุ่มแม่บ้านเกษตรกร',
  young_farmer_groups: 'กลุ่มยุวเกษตรกรรวม',
  young_farmer_groups_detailed: 'กลุ่มยุวเกษตรกร (รายละเอียด)',
  agri_tourism: 'ท่องเที่ยวเชิงเกษตร',
  forecast_plots: 'แปลงพยากรณ์พืช',
  pest_outbreaks: 'การระบาดศัตรูพืช',
  pest_centers: 'ศูนย์จัดการศัตรูพืช (ศจช.)',
  plant_doctors: 'หมอพืชประจำตำบล',
  soil_fertilizer_centers: 'ศูนย์จัดการดินปุ๋ย (ศดปช.)',
  soil_series: 'ข้อมูลชุดดินรายตำบล',
  fire_hotspots: 'จุดเฝ้าระวังไฟป่า PM2.5',
  ai_disease_forecasts: 'พยากรณ์โรคพืชด้วย AI',
  budgets: 'งบประมาณโครงการพัฒนา',
  personnel: 'บุคลากรสำนักงานเกษตร',
};

export default function DataQuality() {
  const [stats, setStats] = useState([]);
  const [spatialStats, setSpatialStats] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const healthRequest = fetch('/api/health')
        .then((response) => response.json())
        .catch(() => ({
          status: 'unavailable',
          database: { status: 'unavailable' },
          datasets: [],
        }));
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error('ไม่พบ session สำหรับยืนยันสิทธิ์ผู้ดูแลระบบ');
      }

      const response = await fetch('/api/admin/data-quality-stats', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`ไม่สามารถดึงข้อมูลได้: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setHealth(await healthRequest);
      setStats(data.stats || []);
      setSpatialStats(data.spatialStats || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const filteredStats = stats.filter((item) => {
    const label = TABLE_LABELS[item.tableName] || item.tableName;
    return (
      label.toLowerCase().includes(searchText.toLowerCase()) ||
      item.tableName.toLowerCase().includes(searchText.toLowerCase())
    );
  });

  // Calculate totals
  const totalTables = stats.length;
  const validStats = stats.filter((s) => !s.error);
  const overallCompleteness =
    validStats.length > 0
      ? validStats.reduce((sum, item) => sum + item.completeness, 0) /
        validStats.length
      : 100;
  const totalRows = validStats.reduce((sum, item) => sum + item.totalRows, 0);
  const totalDuplicates = validStats.reduce(
    (sum, item) => sum + item.duplicateCount,
    0
  );

  // Warnings / Alerts for tables with duplicates or low completeness
  const issueTables = validStats.filter(
    (item) => item.duplicateCount > 0 || item.completeness < 95
  );

  // ECharts Option for Completeness Chart
  const chartOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '5%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%' },
    },
    yAxis: {
      type: 'category',
      data: validStats
        .slice(0, 10)
        .map((item) => TABLE_LABELS[item.tableName] || item.tableName)
        .reverse(),
      axisLabel: { interval: 0, width: 150, overflow: 'truncate' },
    },
    series: [
      {
        name: 'ความสมบูรณ์ของข้อมูล',
        type: 'bar',
        data: validStats
          .slice(0, 10)
          .map((item) => item.completeness)
          .reverse(),
        itemStyle: {
          color: function (params) {
            const val = params.value;
            if (val >= 98) return '#1a7f37'; // Green
            if (val >= 90) return '#d4b106'; // Orange/Yellow
            return '#cf222e'; // Red
          },
          borderRadius: [0, 4, 4, 0],
        },
      },
    ],
  };

  const columns = [
    {
      title: 'ชื่อตารางในระบบ',
      dataIndex: 'tableName',
      key: 'tableName',
      render: (text) => (
        <div>
          <div style={{ fontWeight: 'bold', color: '#1a7f37' }}>
            {TABLE_LABELS[text] || text}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#8c8c8c',
              fontFamily: 'monospace',
            }}
          >
            {text}
          </div>
        </div>
      ),
    },
    {
      title: 'จำนวนแถวทั้งหมด (Rows)',
      dataIndex: 'totalRows',
      key: 'totalRows',
      sorter: (a, b) => a.totalRows - b.totalRows,
      render: (num, record) => (record.error ? '-' : num.toLocaleString()),
    },
    {
      title: 'สัดส่วนความสมบูรณ์ (Completeness)',
      dataIndex: 'completeness',
      key: 'completeness',
      sorter: (a, b) => a.completeness - b.completeness,
      render: (val, record) => {
        if (record.error) return <Tag color="error">ข้อผิดพลาดในการโหลด</Tag>;
        let strokeColor = '#1a7f37';
        if (val < 90) strokeColor = '#cf222e';
        else if (val < 98) strokeColor = '#d4b106';
        return (
          <div style={{ width: '180px' }}>
            <Progress
              percent={val}
              size="small"
              strokeColor={strokeColor}
              status={val === 100 ? 'normal' : 'active'}
            />
          </div>
        );
      },
    },
    {
      title: 'แถวที่ซ้ำซ้อน (Duplicates)',
      dataIndex: 'duplicateCount',
      key: 'duplicateCount',
      sorter: (a, b) => a.duplicateCount - b.duplicateCount,
      render: (num, record) => {
        if (record.error) return '-';
        if (num === 0) {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              ไม่มีซ้ำ
            </Tag>
          );
        }
        return (
          <Tag color="warning" icon={<WarningOutlined />}>
            พบซ้ำ {num.toLocaleString()} แถว
          </Tag>
        );
      },
    },
    {
      title: 'อัปเดตล่าสุด',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      render: (val, record) => {
        if (record.error) return '-';
        if (!val)
          return <span style={{ color: '#bfbfbf' }}>ไม่มีข้อมูลเวลา</span>;
        return new Date(val).toLocaleString('th-TH', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      },
    },
  ];

  const spatialColumns = [
    { title: 'Layer', dataIndex: 'id', key: 'id' },
    {
      title: 'Usable',
      dataIndex: 'usablePercent',
      key: 'usablePercent',
      render: (value) => <Progress percent={value} size="small" />,
    },
    {
      title: 'Outside province',
      dataIndex: 'outsideProvinceCount',
      key: 'outsideProvinceCount',
    },
    {
      title: 'Duplicate coordinates',
      dataIndex: 'duplicateCoordinateCount',
      key: 'duplicateCoordinateCount',
    },
    {
      title: 'Invalid examples',
      dataIndex: 'invalidExamples',
      key: 'invalidExamples',
      render: (examples) =>
        examples?.length
          ? examples.map((item) => (
              <Tag key={item.id}>
                {item.id}: {item.state}
              </Tag>
            ))
          : '-',
    },
    {
      title: 'Layer status',
      dataIndex: 'availability',
      key: 'availability',
      render: (value) => (
        <Tag color={value === 'active' ? 'success' : 'warning'}>{value}</Tag>
      ),
    },
  ];

  const exportSpatialCsv = () => {
    const rows = [
      [
        'layer',
        'usable_percent',
        'outside_province',
        'duplicate_coordinates',
        'invalid_coordinates',
        'invalid_examples',
        'status',
      ],
      ...spatialStats.map((item) => [
        item.id,
        item.usablePercent,
        item.outsideProvinceCount,
        item.duplicateCoordinateCount,
        item.invalidCoordinateCount,
        item.invalidExamples
          ?.map(({ id, state }) => `${id}:${state}`)
          .join(';') || '',
        item.availability,
      ]),
    ];
    const csv = rowsToCsv(rows);
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'smart-map-spatial-quality.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="crud-container">
      <div className="crud-header">
        <div className="crud-header-left">
          <span className="crud-title">
            <PieChartOutlined style={{ marginRight: 8 }} />
            วิเคราะห์และตรวจสอบคุณภาพข้อมูล (Data Quality Dashboard)
          </span>
          <Tag className="crud-count">{totalTables} ตารางหลัก</Tag>
        </div>
        <div className="crud-header-right">
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={fetchStats}
            className="export-btn"
          >
            รีเฟรชสุขภาพข้อมูล
          </Button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin
            size="large"
            tip="กำลังคำนวณและประเมินผลการตรวจสอบคุณภาพข้อมูล..."
          />
        </div>
      ) : error ? (
        <Alert
          message="เกิดข้อผิดพลาด"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 20 }}
        />
      ) : (
        <div style={{ padding: '0 24px 24px 24px' }}>
          {health && (
            <Alert
              type={health.status === 'healthy' ? 'success' : 'warning'}
              showIcon
              message={`สถานะระบบ: ${health.status}`}
              description={
                <div>
                  <span>ฐานข้อมูล: {health.database?.status || '-'}</span>
                  {(health.datasets || [])
                    .filter((dataset) => dataset.status !== 'healthy')
                    .map((dataset) => (
                      <Tag
                        key={dataset.id}
                        color="warning"
                        style={{ marginLeft: 8 }}
                      >
                        {dataset.id}: {dataset.status}
                      </Tag>
                    ))}
                </div>
              }
              style={{ marginBottom: 20 }}
            />
          )}

          {/* Dashboard Summary Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={12} md={6}>
              <Card bordered={false} className="dashboard-summary-card">
                <Statistic
                  title="ตารางข้อมูลหลักที่วิเคราะห์"
                  value={totalTables}
                  prefix={<DatabaseOutlined style={{ color: '#1a7f37' }} />}
                  valueStyle={{ color: '#1a7f37' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card bordered={false} className="dashboard-summary-card">
                <Statistic
                  title="ดัชนีความสมบูรณ์ข้อมูลรวม"
                  value={overallCompleteness}
                  precision={2}
                  suffix="%"
                  valueStyle={{
                    color: overallCompleteness >= 95 ? '#1a7f37' : '#d4b106',
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card bordered={false} className="dashboard-summary-card">
                <Statistic
                  title="จำนวนแถวในระบบทั้งหมด"
                  value={totalRows}
                  valueStyle={{ color: '#096dd9' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card bordered={false} className="dashboard-summary-card">
                <Statistic
                  title="จำนวนข้อมูลซ้ำซ้อนรวม"
                  value={totalDuplicates}
                  valueStyle={{
                    color: totalDuplicates > 0 ? '#d43f3a' : '#1a7f37',
                  }}
                  suffix={totalDuplicates > 0 ? ' แถว' : ''}
                />
              </Card>
            </Col>
          </Row>

          {/* Warning Banner */}
          {issueTables.length > 0 && (
            <Alert
              message={
                <b>
                  พบประเด็นปัญหาคุณภาพข้อมูลที่ต้องตรวจสอบ ({issueTables.length}{' '}
                  ตาราง)
                </b>
              }
              description="ตารางเหล่านี้มีปริมาณข้อมูลที่ซ้ำซ้อนกันหรือมีระดับความสมบูรณ์ (Completeness) ต่ำกว่า 95% ผู้ดูแลระบบกรุณาพิจารณาการตรวจสอบทำความสะอาดข้อมูล (Data Cleaning) หรือแก้ไขการส่งออกข้อมูล"
              type="warning"
              showIcon
              closable
              style={{ marginBottom: 20, borderRadius: 8 }}
            />
          )}

          {/* Charts & Graphs */}
          <Card
            title="Smart Map coordinate quality"
            extra={
              <Button icon={<DownloadOutlined />} onClick={exportSpatialCsv}>
                Export CSV
              </Button>
            }
            bordered={false}
            style={{ marginBottom: 20, borderRadius: 8 }}
          >
            <Table
              dataSource={spatialStats}
              columns={spatialColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>

          {validStats.length > 0 && (
            <Card
              title="ภาพรวมความสมบูรณ์ของข้อมูล 10 ตารางแรก"
              bordered={false}
              style={{
                marginBottom: 20,
                borderRadius: 8,
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
              }}
            >
              <div style={{ height: 280 }}>
                <EChart option={chartOption} />
              </div>
            </Card>
          )}

          {/* Table list */}
          <Card
            bordered={false}
            style={{
              borderRadius: 8,
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <Input.Search
                placeholder="ค้นหาชื่อตาราง หรือคำอธิบายตาราง..."
                allowClear
                onChange={(e) => setSearchText(e.target.value)}
                style={{ maxWidth: 400 }}
              />
            </div>
            <Table
              dataSource={filteredStats}
              columns={columns}
              rowKey="tableName"
              pagination={{ pageSize: 10, showSizeChanger: true }}
              className="crud-table"
            />
          </Card>
        </div>
      )}
    </div>
  );
}
