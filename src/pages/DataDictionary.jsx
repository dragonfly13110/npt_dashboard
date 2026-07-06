import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Input,
  Tag,
  Row,
  Col,
  Statistic,
  Button,
  Spin,
  Alert,
  Drawer,
  Tooltip,
  Segmented,
} from 'antd';
import {
  BookOutlined,
  DatabaseOutlined,
  SearchOutlined,
  LockOutlined,
  UnlockOutlined,
  RightOutlined,
  AppstoreOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { TABLE_CONFIG } from '../utils/chatbotConstants';
import { isPrivateColumn } from '../utils/dataPrivacy';
import '../styles/dashboard.css';

// HSL / Premium color schemes for each group
const GROUP_THEMES = {
  ฝ่ายบริหารทั่วไป: {
    color: 'default',
    border: '1px solid #d9d9d9',
    bg: '#f5f5f5',
    textColor: '#595959',
  },
  กลุ่มยุทธศาสตร์และสารสนเทศ: {
    color: 'processing',
    border: '1px solid #91d5ff',
    bg: '#e6f7ff',
    textColor: '#096dd9',
  },
  กลุ่มส่งเสริมและพัฒนาการผลิต: {
    color: 'success',
    border: '1px solid #b7eb8f',
    bg: '#f6ffed',
    textColor: '#389e0d',
  },
  กลุ่มส่งเสริมและพัฒนาเกษตรกร: {
    color: 'purple',
    border: '1px solid #d3adf7',
    bg: '#f9f0ff',
    textColor: '#531dab',
  },
  กลุ่มอารักขาพืช: {
    color: 'warning',
    border: '1px solid #ffe58f',
    bg: '#fffbe6',
    textColor: '#d4b106',
  },
};

// Common column translations to make it a user-friendly dictionary
const COLUMN_TRANSLATIONS = {
  id: 'ไอดีประจำรายการ (Primary Key)',
  created_at: 'วันที่และเวลาที่บันทึกข้อมูลเข้าสู่ระบบ',
  updated_at: 'วันที่และเวลาที่แก้ไขข้อมูลล่าสุด',
  district: 'อำเภอในจังหวัดนครปฐม',
  subdistrict: 'ตำบล',
  village_no: 'หมู่ที่',
  moo: 'หมู่ที่',
  address: 'ที่อยู่',
  address_no: 'บ้านเลขที่',
  phone: 'เบอร์โทรศัพท์ติดต่อ',
  mobile: 'เบอร์โทรศัพท์มือถือ',
  contact_phone: 'เบอร์โทรศัพท์ผู้ติดต่อ',
  email: 'อีเมล',
  facebook: 'บัญชี Facebook',
  line_id: 'บัญชี LINE ID',
  citizen_id: 'เลขประจำตัวประชาชน (13 หลัก)',
  title: 'คำนำหน้านาม (นาย/นาง/นางสาว)',
  first_name: 'ชื่อจริง',
  last_name: 'นามสกุล',
  full_name: 'ชื่อ-นามสกุลจริง',
  owner_name: 'ชื่อเจ้าของแปลง/เจ้าของข้อมูล',
  farmer_name: 'ชื่อเกษตรกร',
  contact_person: 'ชื่อผู้ประสานงาน/ผู้ติดต่อ',
  notes: 'หมายเหตุ/ข้อมูลเพิ่มเติม',
  household_count: 'จำนวนครัวเรือนเกษตรกร',
  member_count: 'จำนวนสมาชิกในกลุ่ม/หน่วยงาน',
  total_members: 'จำนวนสมาชิกทั้งหมด',
  farm_area_rai: 'พื้นที่ทำกรเกษตรรวม (ไร่)',
  total_area_rai: 'พื้นที่ภูมิศาสตร์/พื้นที่ทั้งหมด (ไร่)',
  agri_crop_area_rai: 'พื้นที่ทำการเกษตรด้านพืชทั้งหมด (ไร่)',
  rice_in_season_rai: 'พื้นที่เพาะปลูกข้าวนาปี (ไร่)',
  rice_off_season_rai: 'พื้นที่เพาะปลูกข้าวนาปรัง (ไร่)',
  field_crops_rai: 'พื้นที่เพาะปลูกพืชไร่ (ไร่)',
  horticulture_rai: 'พื้นที่เพาะปลูกพืชสวน (ไร่)',
  fruit_trees_rai: 'พื้นที่เพาะปลูกไม้ผล (ไร่)',
  vegetables_rai: 'พื้นที่เพาะปลูกพืชผัก (ไร่)',
  flowers_rai: 'พื้นที่เพาะปลูกไม้ดอกไม้ประดับ (ไร่)',
  herbs_spices_rai: 'พื้นที่เพาะปลูกสมุนไพรและเครื่องเทศ (ไร่)',
  main_crop: 'ชนิดพืชหลักที่เพาะปลูก',
  data_year: 'ปีงบประมาณ/ปีของข้อมูล (พ.ศ.)',
  year: 'ปีของข้อมูล (พ.ศ.)',
  custom_fields: 'ข้อมูลเฉพาะหรือฟิลด์พิเศษอื่นๆ (รูปแบบ JSON)',
  annual_agri_income: 'รายได้จากการประกอบอาชีพเกษตรกรรมต่อปี (บาท)',
  group_name: 'ชื่อกลุ่มส่งเสริมอาชีพ/กลุ่มยุวเกษตรกร',
  potential_level: 'ระดับศักยภาพของกลุ่ม (เช่น ดี, ปานกลาง, ต้องพัฒนา)',
  activity: 'กิจกรรมหลักที่กลุ่มดำเนินการ',
  income: 'รายได้เฉลี่ยรวมของกลุ่ม (บาทต่อปี)',
  fund_management: 'เงินกองทุนหมุนเวียนของกลุ่ม (บาท)',
  crop_name: 'ชื่อชนิดพืชหรือชนิดผลผลิต',
  planted_area_rai: 'พื้นที่เพาะปลูกรวม (ไร่)',
  harvested_area_rai: 'พื้นที่เก็บเกี่ยวผลผลิตรวม (ไร่)',
  yield_kg_per_rai: 'ปริมาณผลผลิตเฉลี่ยต่อไร่ (กิโลกรัม)',
  total_production_ton: 'ผลผลิตรวมทั้งหมดที่ได้ (ตัน)',
  revenue_baht_per_rai: 'รายได้เฉลี่ยที่ได้รับต่อไร่ (บาท)',
  total_cost_baht: 'ต้นทุนเฉลี่ยทั้งหมดต่อไร่ (บาท)',
  cert_status: 'สถานะการรับรองมาตรฐาน GAP',
  commodity: 'ชนิดสินค้าเกษตรหลัก',
  agency: 'หน่วยงานรับผิดชอบหลัก',
};

export default function DataDictionary() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ทั้งหมด');

  // Drawer state for column details
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTable, setActiveTable] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error('ไม่พบ session ของผู้ใช้ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      }

      const response = await fetch('/api/data-dictionary', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`ไม่สามารถเชื่อมต่อข้อมูลได้: ${response.statusText}`);
      }

      const resData = await response.json();
      if (resData.error) {
        throw new Error(resData.error);
      }
      setData(resData.dictionary || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดพจนานุกรมข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Merge database stats with frontend configurations
  const enrichedData = data.map((item) => {
    const config = TABLE_CONFIG[item.tableName] || {};
    return {
      ...item,
      label: config.label || item.tableName,
      icon: config.icon || '📊',
      group: config.group || 'อื่นๆ',
      descTh: config.descTh || 'ไม่มีรายละเอียดคำอธิบายสำหรับตารางนี้',
    };
  });

  // Filter based on Group & Search Text
  const filteredData = enrichedData.filter((item) => {
    const matchesGroup =
      selectedGroup === 'ทั้งหมด' || item.group === selectedGroup;

    const lowerSearch = searchText.toLowerCase();
    const matchesSearch =
      item.tableName.toLowerCase().includes(lowerSearch) ||
      item.label.toLowerCase().includes(lowerSearch) ||
      item.descTh.toLowerCase().includes(lowerSearch) ||
      item.columns.some((col) => {
        const colTrans = COLUMN_TRANSLATIONS[col.columnName] || '';
        return (
          col.columnName.toLowerCase().includes(lowerSearch) ||
          colTrans.toLowerCase().includes(lowerSearch)
        );
      });

    return matchesGroup && matchesSearch;
  });

  // Calculate Summary metrics
  const totalTables = enrichedData.length;
  const totalRows = enrichedData.reduce(
    (sum, item) => sum + (item.rowCount || 0),
    0
  );
  const totalColumns = enrichedData.reduce(
    (sum, item) => sum + (item.columns?.length || 0),
    0
  );

  // Group options for Segmented filter
  const groupsList = [
    'ทั้งหมด',
    ...new Set(enrichedData.map((item) => item.group).filter(Boolean)),
  ];

  const handleOpenDrawer = (record) => {
    setActiveTable(record);
    setDrawerOpen(true);
  };

  const columns = [
    {
      title: 'ชื่อตารางในระบบ',
      dataIndex: 'tableName',
      key: 'tableName',
      width: 250,
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '20px', marginRight: '10px' }}>
            {record.icon}
          </span>
          <div>
            <div
              style={{ fontWeight: 'bold', color: '#1a7f37', fontSize: '15px' }}
            >
              {record.label}
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
        </div>
      ),
    },
    {
      title: 'กลุ่มงาน / หมวดหมู่',
      dataIndex: 'group',
      key: 'group',
      width: 200,
      render: (group) => {
        const theme = GROUP_THEMES[group] || {
          color: 'default',
          textColor: '#595959',
          bg: '#f5f5f5',
        };
        return (
          <Tag
            bordered={false}
            color={theme.color}
            style={{
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: '4px',
              color: theme.textColor,
              backgroundColor: theme.bg,
              border: theme.border,
            }}
          >
            {group}
          </Tag>
        );
      },
    },
    {
      title: 'รายละเอียดคำอธิบายข้อมูล',
      dataIndex: 'descTh',
      key: 'descTh',
      render: (text) => <div style={{ color: '#434343' }}>{text}</div>,
    },
    {
      title: 'จำนวนฟิลด์ (คอลัมน์)',
      dataIndex: 'columns',
      key: 'columnsCount',
      width: 140,
      sorter: (a, b) => (a.columns?.length || 0) - (b.columns?.length || 0),
      render: (cols) => `${cols?.length || 0} คอลัมน์`,
    },
    {
      title: 'จำนวนแถวทั้งหมด (รายการ)',
      dataIndex: 'rowCount',
      key: 'rowCount',
      width: 180,
      sorter: (a, b) => (a.rowCount || 0) - (b.rowCount || 0),
      render: (num) =>
        num !== null ? (
          <b>{num.toLocaleString()} รายการ</b>
        ) : (
          <span style={{ color: '#bfbfbf' }}>-</span>
        ),
    },
    {
      title: 'ดูข้อมูล',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          icon={<RightOutlined />}
          onClick={() => handleOpenDrawer(record)}
          size="small"
          style={{ borderRadius: '4px' }}
        >
          โครงสร้าง
        </Button>
      ),
    },
  ];

  return (
    <div className="crud-container">
      <div className="crud-header">
        <div className="crud-header-left">
          <span className="crud-title">
            <BookOutlined style={{ marginRight: 8, color: '#1a7f37' }} />
            พจนานุกรมข้อมูล (Data Dictionary)
          </span>
          <Tag className="crud-count">{totalTables} ตารางข้อมูล</Tag>
        </div>
        <div className="crud-header-right">
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={fetchData}
            className="export-btn"
            style={{ borderRadius: '6px' }}
          >
            รีเฟรชสถิติข้อมูล
          </Button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin
            size="large"
            tip="กำลังโหลดสถิติและโครงสร้างพจนานุกรมข้อมูล..."
          />
        </div>
      ) : error ? (
        <Alert
          message="เกิดข้อผิดพลาด"
          description={error}
          type="error"
          showIcon
          style={{ margin: '0 24px 20px 24px', borderRadius: '8px' }}
        />
      ) : (
        <div style={{ padding: '0 24px 24px 24px' }}>
          {/* Summary Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={8}>
              <Card
                bordered={false}
                className="dashboard-summary-card"
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                }}
              >
                <Statistic
                  title="ตารางข้อมูลในระบบทั้งหมด"
                  value={totalTables}
                  prefix={<DatabaseOutlined style={{ color: '#1a7f37' }} />}
                  valueStyle={{ color: '#1a7f37', fontWeight: 700 }}
                  suffix="ตาราง"
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                bordered={false}
                className="dashboard-summary-card"
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                }}
              >
                <Statistic
                  title="จำนวนข้อมูลทั้งหมดสะสม"
                  value={totalRows}
                  prefix={<AppstoreOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff', fontWeight: 700 }}
                  suffix="รายการ"
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                bordered={false}
                className="dashboard-summary-card"
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                }}
              >
                <Statistic
                  title="จำนวนฟิลด์ข้อมูลรวม"
                  value={totalColumns}
                  prefix={<BookOutlined style={{ color: '#722ed1' }} />}
                  valueStyle={{ color: '#722ed1', fontWeight: 700 }}
                  suffix="คอลัมน์"
                />
              </Card>
            </Col>
          </Row>

          {/* Filters & Table */}
          <Card
            bordered={false}
            style={{
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
            }}
          >
            <Row
              gutter={[16, 16]}
              style={{ marginBottom: 16 }}
              align="middle"
              justify="space-between"
            >
              <Col xs={24} md={14}>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: 500, color: '#595959' }}>
                    กลุ่มข้อมูล:
                  </span>
                  <Segmented
                    options={groupsList}
                    value={selectedGroup}
                    onChange={setSelectedGroup}
                    style={{
                      background: '#f5f5f5',
                      borderRadius: '8px',
                      padding: '2px',
                    }}
                  />
                </div>
              </Col>
              <Col xs={24} md={10}>
                <Input
                  placeholder="ค้นหาตามชื่อตาราง, คำอธิบาย หรือชื่อคอลัมน์..."
                  prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                  style={{ width: '100%', borderRadius: '8px' }}
                />
              </Col>
            </Row>

            <Table
              dataSource={filteredData}
              columns={columns}
              rowKey="tableName"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `พบตารางทั้งหมด ${total} ตาราง`,
              }}
              className="crud-table"
              style={{ borderRadius: '8px', overflow: 'hidden' }}
            />
          </Card>

          {/* Drawer for column details */}
          <Drawer
            title={
              activeTable ? (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '24px', marginRight: '10px' }}>
                    {activeTable.icon}
                  </span>
                  <div>
                    <h3 style={{ margin: 0, color: '#1a7f37' }}>
                      โครงสร้างคอลัมน์: {activeTable.label}
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#8c8c8c',
                        fontFamily: 'monospace',
                      }}
                    >
                      public.{activeTable.tableName} (
                      {activeTable.rowCount?.toLocaleString()} รายการ)
                    </p>
                  </div>
                </div>
              ) : (
                'โครงสร้างคอลัมน์'
              )
            }
            placement="right"
            onClose={() => setDrawerOpen(false)}
            open={drawerOpen}
            width={720}
            bodyStyle={{ padding: '20px' }}
          >
            {activeTable && (
              <div>
                <Alert
                  message="คำชี้แจงด้านความเป็นส่วนตัว (Privacy Information)"
                  description="ฟิลด์ข้อมูลบางรายการที่เป็นข้อมูลส่วนบุคคลที่ระบุตัวตนได้ (PII) จะแสดงเป็น Private ซึ่งจะถูกปิดบังไม่ให้บุคคลภายนอก หรือผู้ใช้ทั่วไป/ผู้ช่วย AI เข้าถึงได้โดยตรงผ่านระบบหน้าบ้าน"
                  type="info"
                  showIcon
                  style={{ marginBottom: 20, borderRadius: '8px' }}
                />

                <h4 style={{ marginBottom: 12, fontWeight: 600 }}>
                  รายชื่อคอลัมน์ในตาราง
                </h4>

                <Table
                  dataSource={activeTable.columns}
                  rowKey="columnName"
                  pagination={false}
                  size="middle"
                  columns={[
                    {
                      title: 'ชื่อคอลัมน์ (Physical Name)',
                      dataIndex: 'columnName',
                      key: 'columnName',
                      render: (text) => (
                        <code style={{ color: '#096dd9', fontWeight: 600 }}>
                          {text}
                        </code>
                      ),
                    },
                    {
                      title: 'ประเภทข้อมูล (Data Type)',
                      dataIndex: 'dataType',
                      key: 'dataType',
                      render: (text) => <Tag color="blue">{text}</Tag>,
                    },
                    {
                      title: 'คำอธิบายความหมาย (Thai Label)',
                      key: 'translation',
                      render: (_, record) => (
                        <span style={{ color: '#262626' }}>
                          {COLUMN_TRANSLATIONS[record.columnName] || (
                            <span
                              style={{ color: '#bfbfbf', fontStyle: 'italic' }}
                            >
                              {record.columnName.replace(/_/g, ' ')}
                            </span>
                          )}
                        </span>
                      ),
                    },
                    {
                      title: 'สิทธิ์การเข้าถึง',
                      key: 'privacy',
                      width: 130,
                      render: (_, record) => {
                        const isPrivate = isPrivateColumn(
                          activeTable.tableName,
                          { dataIndex: record.columnName }
                        );
                        return isPrivate ? (
                          <Tooltip title="ข้อมูลส่วนบุคคล (PII) ถูกจำกัดการเข้าถึง">
                            <Tag icon={<LockOutlined />} color="error">
                              Private
                            </Tag>
                          </Tooltip>
                        ) : (
                          <Tooltip title="ข้อมูลเปิดเผยได้ / เข้าถึงได้ปกติ">
                            <Tag icon={<UnlockOutlined />} color="success">
                              Public-safe
                            </Tag>
                          </Tooltip>
                        );
                      },
                    },
                  ]}
                  style={{ border: '1px solid #f0f0f0', borderRadius: '8px' }}
                />
              </div>
            )}
          </Drawer>
        </div>
      )}
    </div>
  );
}
