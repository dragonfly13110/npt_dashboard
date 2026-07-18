import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Input,
  Card,
  Tag,
  Empty,
  Spin,
  Table,
  Typography,
  Badge,
  Button,
} from 'antd';
import {
  SearchOutlined,
  DatabaseOutlined,
  RightOutlined,
  ReloadOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { globalSearch } from '../services/globalSearchService';
import { useAuth } from '../contexts/AuthContext';
import { isPrivateColumn } from '../utils/dataPrivacy';

const { Text, Title } = Typography;

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const GROUP_COLORS = {
  กลุ่มยุทธศาสตร์และสารสนเทศ: '#0969da',
  กลุ่มส่งเสริมและพัฒนาการผลิต: '#1a7f37',
  กลุ่มส่งเสริมและพัฒนาเกษตรกร: '#8250df',
  กลุ่มอารักขาพืช: '#cf222e',
};

const MATCH_LABELS = {
  exact: 'ตรงคำ',
  prefix: 'ขึ้นต้น',
  substring: 'มีคำนี้',
  trigram: 'ใกล้เคียง',
};

function getMatchText(item) {
  if (!item.matchValue) return null;
  return `${MATCH_LABELS[item.matchType] || 'พบคำ'}: ${item.matchValue}`;
}

// ========== Thai column name mapping ==========
const COLUMN_LABELS = {
  district: 'อำเภอ',
  subdistrict: 'ตำบล',
  name: 'ชื่อ',
  full_name: 'ชื่อ-นามสกุล',
  farmer_name: 'ชื่อเกษตรกร',
  chairman_name: 'ประธาน',
  chairman: 'ประธาน',
  contact_person: 'ผู้ติดต่อ',
  owner_name: 'เจ้าของ',
  plot_name: 'ชื่อแปลง',
  plot_code: 'รหัสแปลง',
  plot_district: 'อำเภอ',
  enterprise_name: 'ชื่อวิสาหกิจ',
  enterprise_type: 'ประเภทวิสาหกิจ',
  group_name: 'ชื่อกลุ่ม',
  group_type: 'ประเภทกลุ่ม',
  center_name: 'ชื่อศูนย์',
  spot_name: 'ชื่อจุด/แหล่ง',
  spot_type: 'ประเภท',
  area_name: 'ชื่อพื้นที่',
  area_type: 'ประเภทพื้นที่',
  crop_name: 'ชื่อพืช',
  crop_type: 'ประเภทพืช',
  commodity: 'สินค้า',
  secondary_commodity: 'สินค้ารอง',
  main_product: 'ผลผลิตหลัก',
  main_crop: 'พืชหลัก',
  main_crop_type: 'ประเภทพืชหลัก',
  featured_product: 'สินค้าเด่น',
  variety: 'พันธุ์',
  farmer_type: 'ประเภทเกษตรกร',
  agency: 'หน่วยงาน',
  disaster_type: 'ประเภทภัย',
  project_name: 'โครงการ',
  activity: 'กิจกรรม',
  budget_amount: 'งบประมาณ',
  spent_amount: 'เบิกแล้ว',
  budget_source: 'แหล่งงบประมาณ',
  fiscal_year: 'ปีงบประมาณ',
  budget_round: 'รอบ',
  total_area_rai: 'พื้นที่ (ไร่)',
  agri_crop_area_rai: 'พื้นที่เพาะปลูก (ไร่)',
  farmer_households: 'ครัวเรือนเกษตรกร',
  member_count: 'จำนวนสมาชิก',
  capital_baht: 'ทุน (บาท)',
  certified_area_rai: 'พื้นที่รับรอง (ไร่)',
  planted_area_rai: 'พื้นที่ปลูก (ไร่)',
  harvested_area_rai: 'พื้นที่เก็บเกี่ยว (ไร่)',
  yield_kg_per_rai: 'ผลผลิต (กก./ไร่)',
  total_production_ton: 'ผลผลิตรวม (ตัน)',
  affected_area_rai: 'พื้นที่เสียหาย (ไร่)',
  affected_households: 'ครัวเรือนที่ได้รับผลกระทบ',
  damage_baht: 'มูลค่าเสียหาย (บาท)',
  households_count: 'จำนวนครัวเรือน',
  total_members: 'สมาชิกทั้งหมด',
  group_count: 'จำนวนกลุ่ม',
  sf_count: 'จำนวน SF',
  ysf_count: 'จำนวน YSF',
  rice_in_season_rai: 'ข้าวนาปี (ไร่)',
  rice_off_season_rai: 'ข้าวนาปรัง (ไร่)',
  field_crops_rai: 'พืชไร่ (ไร่)',
  horticulture_rai: 'ไม้ผล (ไร่)',
  fruit_trees_rai: 'ไม้ผลยืนต้น (ไร่)',
  vegetables_rai: 'ผัก (ไร่)',
  flowers_rai: 'ไม้ดอก (ไร่)',
  herbs_spices_rai: 'สมุนไพร (ไร่)',
  status: 'สถานะ',
  year: 'ปี',
  phone: 'โทรศัพท์',
  address: 'ที่อยู่',
  lat: 'ละติจูด',
  lng: 'ลองจิจูด',
  latitude: 'ละติจูด',
  longitude: 'ลองจิจูด',
  description: 'รายละเอียด',
  note: 'หมายเหตุ',
  notes: 'หมายเหตุ',
  remark: 'หมายเหตุ',
};

function getThaiColumnName(key) {
  if (COLUMN_LABELS[key]) return COLUMN_LABELS[key];
  // Titlecase fallback
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCellValue(key, value) {
  if (
    ['budget_amount', 'spent_amount', 'damage_baht', 'capital_baht'].includes(
      key
    )
  ) {
    const amount = Number(value);
    if (!Number.isNaN(amount)) {
      return `${amount.toLocaleString('th-TH')} บาท`;
    }
  }

  // Format JSON notes (like in assets or budgets table)
  if (
    typeof value === 'string' &&
    value.trim().startsWith('{') &&
    value.trim().endsWith('}')
  ) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        const parts = [];

        // Handle assets fields
        if (parsed.fiscalYear) parts.push(`ปีงบประมาณ ${parsed.fiscalYear}`);
        if (parsed.acceptedDateThai)
          parts.push(`ตรวจรับ: ${parsed.acceptedDateThai}`);
        if (parsed.assetCode) parts.push(`รหัสสินทรัพย์: ${parsed.assetCode}`);
        if (parsed.equipmentCode)
          parts.push(`รหัสครุภัณฑ์: ${parsed.equipmentCode}`);
        if (parsed.model) parts.push(`รุ่น: ${parsed.model}`);

        // Handle budgets fields
        if (parsed.project) parts.push(`โครงการ: ${parsed.project}`);
        if (parsed.activity) parts.push(`กิจกรรม: ${parsed.activity}`);
        if (parsed.plan) parts.push(`แผน: ${parsed.plan}`);
        if (parsed.budget) {
          const bAmt = Number(parsed.budget);
          parts.push(
            `งบประมาณ: ${Number.isFinite(bAmt) ? bAmt.toLocaleString('th-TH') + ' บาท' : parsed.budget}`
          );
        }

        // Generic key-value format for any other fields
        Object.entries(parsed).forEach(([k, v]) => {
          // Skip keys already handled or internal mapping helpers
          if (
            [
              'fiscalYear',
              'acceptedDateThai',
              'assetCode',
              'equipmentCode',
              'model',
              'project',
              'activity',
              'plan',
              'budget',
              'oldEquipmentCode',
              'kind',
              'agency',
              'assignedTo',
              'status',
            ].includes(k)
          ) {
            return;
          }
          if (v !== null && v !== undefined && v !== '') {
            parts.push(`${k}: ${v}`);
          }
        });

        if (parts.length > 0) {
          return parts.join(' • ');
        }
      }
    } catch {
      // fallback to original string if not valid JSON
    }
  }

  return String(value);
}

const getTopDistrict = (items) => {
  const counts = {};
  items.forEach((item) => {
    const d =
      item.raw?.district ||
      item.raw?.plot_district ||
      item.raw?.farmer_district;
    if (d && d !== '-' && d !== 'ไม่ระบุ') {
      counts[d] = (counts[d] || 0) + 1;
    }
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0] ? sorted[0][0] : null;
};

const getTopActivity = (items) => {
  const counts = {};
  items.forEach((item) => {
    const act =
      item.raw?.activity ||
      item.raw?.agricultural_activity ||
      item.raw?.main_activity ||
      item.raw?.commodity ||
      item.raw?.crop_name ||
      item.raw?.spot_type ||
      item.raw?.main_crop_type;
    if (act && act !== '-' && act !== 'ไม่ระบุ') {
      counts[act] = (counts[act] || 0) + 1;
    }
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0] ? sorted[0][0] : null;
};

const getLatestUpdateText = (items) => {
  let latestDate = null;
  let latestYear = null;
  items.forEach((item) => {
    const y = item.raw?.year || item.raw?.data_year || item.raw?.forecast_year;
    if (y && (!latestYear || y > latestYear)) {
      latestYear = y;
    }
    const d =
      item.raw?.updated_at || item.raw?.created_at || item.raw?.approval_date;
    if (d) {
      const parsed = new Date(d);
      if (
        !Number.isNaN(parsed.getTime()) &&
        (!latestDate || parsed > latestDate)
      ) {
        latestDate = parsed;
      }
    }
  });

  if (latestDate) {
    return latestDate.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  if (latestYear) {
    return `ปี ${latestYear}`;
  }
  return null;
};

// Suggested searches for empty state
const SUGGESTIONS = [
  { icon: '🏠', text: 'กำแพงแสน', desc: 'ค้นหาข้อมูลอำเภอ' },
  { icon: '🌾', text: 'ข้าว', desc: 'ข้อมูลพืชข้าว' },
  { icon: '✅', text: 'GAP', desc: 'มาตรฐาน GAP' },
  { icon: '🌿', text: 'แปลงใหญ่', desc: 'ข้อมูลแปลงใหญ่' },
  { icon: '🏪', text: 'วิสาหกิจ', desc: 'วิสาหกิจชุมชน' },
  { icon: '👨‍🌾', text: 'Smart Farmer', desc: 'เกษตรกรรุ่นใหม่' },
];

export default function SearchResults({ publicMode = false }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const searchRole = publicMode ? 'guest' : role;
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedTables, setExpandedTables] = useState(new Set());
  const [visibleTables, setVisibleTables] = useState(new Set());

  const performSearch = useCallback(
    async (searchTerm) => {
      if (!searchTerm || searchTerm.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const data = await globalSearch(searchTerm, 50, searchRole);
        setResults(data);
        if (data.length > 0) {
          setExpandedTables(new Set([data[0].table]));
          setVisibleTables(new Set([data[0].table]));
        } else {
          setExpandedTables(new Set());
          setVisibleTables(new Set());
        }
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [searchRole]
  );

  useEffect(() => {
    setQuery(initialQuery);
    if (initialQuery && initialQuery.trim().length >= 2) {
      performSearch(initialQuery);
    } else {
      setResults([]);
    }
  }, [initialQuery, performSearch]);

  const handleSearch = (value) => {
    const trimmed = value ? value.trim() : '';
    if (trimmed.length >= 2) {
      navigate(
        `${publicMode ? '/public/search' : '/dashboard/search'}?q=${encodeURIComponent(trimmed)}`,
        { replace: true }
      );
    } else {
      navigate(publicMode ? '/public/search' : '/dashboard/search', {
        replace: true,
      });
    }
  };

  const totalResults = results.reduce((sum, r) => sum + r.totalCount, 0);
  const allVisible =
    results.length > 0 && visibleTables.size === results.length;

  const toggleTable = (table) => {
    setVisibleTables((current) => {
      const next = new Set(current);
      if (next.has(table)) {
        next.delete(table);
        setExpandedTables((expanded) => {
          const nextExpanded = new Set(expanded);
          nextExpanded.delete(table);
          return nextExpanded;
        });
      } else {
        next.add(table);
        setExpandedTables((expanded) => new Set(expanded).add(table));
      }
      return next;
    });
  };

  const toggleAllTables = () => {
    if (allVisible) {
      setVisibleTables(new Set());
      setExpandedTables(new Set());
    } else {
      const tableNames = results.map((result) => result.table);
      setVisibleTables(new Set(tableNames));
      setExpandedTables(new Set(tableNames));
    }
  };

  const expandTable = (table) => {
    setVisibleTables((current) => new Set(current).add(table));
    setExpandedTables((current) => new Set(current).add(table));
  };

  useEffect(() => {
    document.title = 'ค้นหาข้อมูล | ศูนย์ข้อมูลการเกษตรนครปฐม';
    const meta = document.querySelector('meta[name="description"]');
    if (meta)
      meta.setAttribute(
        'content',
        'ค้นหาข้อมูลเกษตรกร พื้นที่เพาะปลูก วิสาหกิจชุมชน Smart Farmer แปลงใหญ่ และข้อมูลเกษตรอื่นๆ ในระบบ'
      );
  }, []);

  // Build columns with Thai names
  const buildColumns = (tableResult) => {
    if (!tableResult.results || tableResult.results.length === 0) return [];
    const sampleRow = tableResult.results[0].raw;
    const keys = Object.keys(sampleRow).filter(
      (k) =>
        ![
          'id',
          'created_at',
          'updated_at',
          'score',
          'match_value',
          'match_type',
          'match_column',
          'matchValue',
          'matchType',
          'matchColumn',
        ].includes(k) &&
        !(
          role === 'guest' &&
          isPrivateColumn(tableResult.table, { dataIndex: k })
        ) &&
        !k.includes('image') &&
        !k.includes('url') &&
        !k.includes('file') &&
        !k.includes('path')
    );

    // Prioritize columns that contain the search query so they are not hidden
    const q = query.toLowerCase();
    const priorityKeys = keys.filter((k) =>
      tableResult.results.some(
        (r) => r.raw && r.raw[k] && String(r.raw[k]).toLowerCase().includes(q)
      )
    );
    const otherKeys = keys.filter((k) => !priorityKeys.includes(k));
    const finalKeys = [...priorityKeys, ...otherKeys].slice(0, 6);

    return finalKeys.map((key) => {
      const shouldFreeze = [
        'record_code',
        'group_name',
        'enterprise_name',
        'spot_name',
        'farmer_name',
        'full_name',
        'district',
      ].includes(key);

      return {
        title: getThaiColumnName(key),
        dataIndex: ['raw', key],
        key,
        ellipsis: true,
        width: 160,
        fixed: shouldFreeze ? 'left' : undefined,
        render: (val) => {
          if (val === null || val === undefined)
            return <Text type="secondary">-</Text>;
          const str = formatCellValue(key, val);
          if (str.length > 60) return str.substring(0, 60) + '...';
          return highlightText(str, query);
        },
      };
    });
  };

  const getMatchedKeys = (item) => {
    const q = query.trim().toLowerCase();
    if (!q || !item.raw) return [];
    return Object.entries(item.raw)
      .filter(([, value]) =>
        String(value ?? '')
          .toLowerCase()
          .includes(q)
      )
      .map(([key]) => key)
      .filter(
        (key) =>
          ![
            'id',
            'created_at',
            'updated_at',
            'score',
            'match_value',
            'match_type',
            'match_column',
            'matchValue',
            'matchType',
            'matchColumn',
          ].includes(key) &&
          !key.includes('image') &&
          !key.includes('url') &&
          !key.includes('file') &&
          !key.includes('path')
      );
  };

  const getRelevanceTags = (tableResult) => {
    const labels = new Map();
    tableResult.results.forEach((item) => {
      getMatchedKeys(item).forEach((key) =>
        labels.set(key, getThaiColumnName(key))
      );
    });
    return Array.from(labels.values()).slice(0, 3);
  };

  return (
    <div style={{ maxWidth: 1200 }}>
      <div className="md-page-header">
        <h2>🔍 ค้นหาข้อมูลทั้งระบบ</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#656d76' }}>
          <DatabaseOutlined /> ค้นหาข้ามทุกตารางในฐานข้อมูลสำนักงานเกษตร • กด{' '}
          <kbd
            style={{
              background: '#e8ecf0',
              padding: '1px 5px',
              borderRadius: 3,
              fontSize: 11,
            }}
          >
            Ctrl+K
          </kbd>{' '}
          เพื่อเปิดค้นหาเร็ว
        </p>
      </div>

      <Card
        variant="outlined"
        style={{ borderRadius: 12, marginBottom: 20 }}
        styles={{ body: { padding: '16px 20px' } }}
      >
        <Input.Search
          size="large"
          placeholder="พิมพ์ชื่อ, อำเภอ, สินค้า, กลุ่ม, หรือคำค้นหาอะไรก็ได้..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSearch={handleSearch}
          enterButton={
            <span>
              <SearchOutlined /> ค้นหา
            </span>
          }
          loading={loading}
          allowClear
          style={{ borderRadius: 12 }}
        />
      </Card>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#656d76' }}>
            กำลังค้นหาจากฐานข้อมูล...
          </div>
        </div>
      ) : results.length === 0 && query ? (
        /* ===== Enhanced Empty State ===== */
        <Card variant="outlined" style={{ borderRadius: 12 }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <div style={{ fontSize: 16, marginBottom: 4 }}>
                  ไม่พบข้อมูลสำหรับ &quot;{query}&quot;
                </div>
                <Text type="secondary">
                  ลองเปลี่ยนคำค้นหา หรือใช้คำสั้นๆ ดูครับ
                </Text>
              </div>
            }
          />
          <div
            style={{
              marginTop: 20,
              padding: '16px 20px',
              background: '#f6f8fa',
              borderRadius: 10,
            }}
          >
            <Text style={{ fontSize: 13, marginBottom: 12, display: 'block' }}>
              <BulbOutlined style={{ color: '#bf8700' }} /> ลองค้นหาคำเหล่านี้:
            </Text>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SUGGESTIONS.map((s) => (
                <Tag
                  key={s.text}
                  style={{
                    cursor: 'pointer',
                    fontSize: 13,
                    padding: '4px 12px',
                    borderRadius: 16,
                  }}
                  onClick={() => handleSearch(s.text)}
                >
                  {s.icon} {s.text}
                </Tag>
              ))}
            </div>
          </div>
        </Card>
      ) : results.length === 0 && !query ? (
        /* ===== Initial State with Suggestions ===== */
        <Card variant="outlined" style={{ borderRadius: 12 }}>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <Title level={4} style={{ margin: 0 }}>
              เริ่มค้นหาข้อมูลได้เลย
            </Title>
            <Text
              type="secondary"
              style={{ display: 'block', marginBottom: 24 }}
            >
              พิมพ์ชื่ออำเภอ ชื่อพืช ชื่อเกษตรกร หรือคำค้นหาอะไรก็ได้
            </Text>
            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {SUGGESTIONS.map((s) => (
                <Card
                  key={s.text}
                  variant="outlined"
                  hoverable
                  style={{ borderRadius: 12, width: 160, textAlign: 'center' }}
                  styles={{ body: { padding: '16px 12px' } }}
                  onClick={() => handleSearch(s.text)}
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{s.text}</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {s.desc}
                  </Text>
                </Card>
              ))}
            </div>
          </div>
        </Card>
      ) : results.length > 0 ? (
        <>
          {/* Summary bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
              padding: '10px 16px',
              background: '#f6f8fa',
              borderRadius: 10,
              border: '1px solid #d0d7de',
              flexWrap: 'wrap',
            }}
          >
            <SearchOutlined style={{ color: '#656d76' }} />
            <Text>
              พบ <Text strong>{totalResults.toLocaleString()}</Text> รายการ จาก{' '}
              <Text strong>{results.length}</Text> ตาราง สำหรับ &quot;
              <Text strong>{query}</Text>&quot;
            </Text>
            <div style={{ flex: 1 }} />
            <Button size="small" onClick={toggleAllTables}>
              {allVisible ? 'ยุบทั้งหมด' : 'ขยายทั้งหมด'}
            </Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <ReloadOutlined /> ข้อมูลแบบ Real-time จาก Database
            </Text>
          </div>

          {/* Results grouped by table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {results.map((tableResult) => {
              const isExpanded = expandedTables.has(tableResult.table);
              const isVisible = visibleTables.has(tableResult.table);
              const columns = buildColumns(tableResult);
              const topDistrict = getTopDistrict(tableResult.results);
              const topActivity = getTopActivity(tableResult.results);
              const latestUpdate = getLatestUpdateText(tableResult.results);
              const relevanceTags = getRelevanceTags(tableResult);
              const previewItems = tableResult.results.slice(0, 3);

              return (
                <Card
                  key={tableResult.table}
                  variant="outlined"
                  style={{
                    borderRadius: 12,
                    border: isExpanded
                      ? `2px solid ${GROUP_COLORS[tableResult.group] || '#d0d7de'}`
                      : '1px solid #d0d7de',
                    transition: 'all 0.2s ease',
                  }}
                  styles={{ body: { padding: 0 } }}
                >
                  <div
                    onClick={() => toggleTable(tableResult.table)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 20px',
                      cursor: 'pointer',
                      background: isExpanded ? '#f6f8fa' : 'transparent',
                      borderBottom: isExpanded ? '1px solid #d0d7de' : 'none',
                      borderRadius: isExpanded ? '12px 12px 0 0' : 12,
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                    >
                      <span style={{ fontSize: 22 }}>{tableResult.icon}</span>
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <Title level={5} style={{ margin: 0, fontSize: 15 }}>
                            {tableResult.label}
                          </Title>
                          <Badge
                            count={tableResult.totalCount}
                            style={{
                              backgroundColor:
                                GROUP_COLORS[tableResult.group] || '#8b949e',
                              fontSize: 11,
                            }}
                          />
                          {relevanceTags.map((tag) => (
                            <Tag
                              key={tag}
                              color="blue"
                              style={{ marginInlineEnd: 0 }}
                            >
                              ตรง{tag}
                            </Tag>
                          ))}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            gap: 12,
                            marginTop: 4,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {tableResult.group}
                          </Text>
                          {(topDistrict || topActivity || latestUpdate) && (
                            <div
                              style={{
                                display: 'flex',
                                gap: 12,
                                fontSize: 11,
                                color: '#656d76',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                              }}
                            >
                              <span style={{ color: '#d0d7de' }}>|</span>
                              {topDistrict && (
                                <span>
                                  📍 อำเภอเด่น:{' '}
                                  <strong style={{ color: '#24292f' }}>
                                    {topDistrict}
                                  </strong>
                                </span>
                              )}
                              {topActivity && (
                                <span>
                                  🌾 สินค้าเด่น:{' '}
                                  <strong style={{ color: '#24292f' }}>
                                    {topActivity}
                                  </strong>
                                </span>
                              )}
                              {latestUpdate && (
                                <span>
                                  📅 ล่าสุด:{' '}
                                  <strong style={{ color: '#24292f' }}>
                                    {latestUpdate}
                                  </strong>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <Button
                        type={isVisible ? 'default' : 'primary'}
                        size="small"
                        icon={<SearchOutlined />}
                        style={{
                          borderColor:
                            GROUP_COLORS[tableResult.group] || '#0969da',
                          color: isVisible
                            ? GROUP_COLORS[tableResult.group] || '#0969da'
                            : undefined,
                          background: isVisible
                            ? undefined
                            : GROUP_COLORS[tableResult.group] || '#0969da',
                          fontWeight: 600,
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTable(tableResult.table);
                        }}
                      >
                        {isVisible ? 'ยุบผลลัพธ์' : 'ดูผลลัพธ์'}
                      </Button>
                      {!publicMode && (
                        <Button
                          type="default"
                          size="small"
                          icon={<DatabaseOutlined />}
                          style={{
                            borderColor:
                              GROUP_COLORS[tableResult.group] || '#0969da',
                            color:
                              GROUP_COLORS[tableResult.group] || '#0969da',
                            fontWeight: 600,
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(tableResult.route);
                          }}
                        >
                          ตารางเต็ม
                        </Button>
                      )}
                      <RightOutlined
                        style={{
                          fontSize: 11,
                          color: '#8b949e',
                          transform: isVisible ? 'rotate(90deg)' : 'none',
                          transition: 'transform 0.2s',
                        }}
                      />
                    </div>
                  </div>

                  {isVisible && !isExpanded && previewItems.length > 0 && (
                    <div
                      style={{
                        padding: '0 20px 14px 52px',
                        display: 'grid',
                        gap: 6,
                      }}
                    >
                      {previewItems.map((item, index) => (
                        <div
                          key={item.id || index}
                          onClick={() => expandTable(tableResult.table)}
                          style={{
                            cursor: 'pointer',
                            padding: '8px 10px',
                            borderRadius: 8,
                            background: '#f6f8fa',
                            border: '1px solid #e8ecf0',
                          }}
                        >
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#24292f',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {highlightText(item.title, query)}
                          </div>
                          {getMatchText(item) && (
                            <div
                              style={{
                                marginTop: 2,
                                fontSize: 11,
                                color: '#57606a',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {highlightText(getMatchText(item), query)}
                            </div>
                          )}
                          {item.subtitle && (
                            <div
                              style={{
                                marginTop: 2,
                                fontSize: 12,
                                color: '#656d76',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {highlightText(item.subtitle, query)}
                            </div>
                          )}
                        </div>
                      ))}
                      {tableResult.totalCount > previewItems.length && (
                        <button
                          type="button"
                          onClick={() => expandTable(tableResult.table)}
                          style={{
                            justifySelf: 'start',
                            border: 'none',
                            background: 'transparent',
                            color: GROUP_COLORS[tableResult.group] || '#0969da',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          +{tableResult.totalCount - previewItems.length}{' '}
                          รายการเพิ่มเติม
                        </button>
                      )}
                    </div>
                  )}

                  {isVisible && isExpanded && (
                    <div style={{ padding: '0 4px 4px' }}>
                      <Table
                        dataSource={tableResult.results}
                        columns={columns}
                        rowKey={(r) => r.id || Math.random()}
                        size="small"
                        pagination={
                          tableResult.results.length > 10
                            ? { pageSize: 10, size: 'small' }
                            : false
                        }
                        scroll={{ x: 'max-content' }}
                        style={{ fontSize: 13 }}
                        onRow={() => ({
                          onClick: () => undefined,
                          style: { cursor: 'default' },
                        })}
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

function highlightText(text, query) {
  if (!text || !query) return text;
  const str = String(text);
  const escapedQuery = escapeRegex(query);

  // Split by query case-insensitive
  const parts = str.split(new RegExp(`(${escapedQuery})`, 'gi'));
  if (parts.length === 1) return str;

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            style={{
              backgroundColor: '#ffec3d',
              color: '#000',
              padding: '0 4px',
              borderRadius: '4px',
              fontWeight: 600,
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
