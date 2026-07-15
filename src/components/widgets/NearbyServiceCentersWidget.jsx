import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import {
  DatabaseOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { supabase } from '../../supabaseClient';
import { useApiCache } from '../../hooks/useApiCache';
import './NearbyServiceCentersWidget.css';

const number = new Intl.NumberFormat('th-TH');
const SERVICE_TYPES = [
  {
    key: 'learning',
    label: 'ศูนย์เรียนรู้ (ศพก.)',
    shortLabel: 'ศพก.',
    icon: '🏫',
    tone: '#0f766e',
    route: '/dashboard/strategy/learning-centers',
  },
  {
    key: 'pest',
    label: 'ศูนย์จัดการศัตรูพืชชุมชน (ศจช.)',
    shortLabel: 'ศจช.',
    icon: '🐛',
    tone: '#d97706',
    route: '/dashboard/protection/pest-centers',
  },
  {
    key: 'soil',
    label: 'ศูนย์จัดการดินปุ๋ยชุมชน (ศดปช.)',
    shortLabel: 'ศดปช.',
    icon: '🌱',
    tone: '#2563eb',
    route: '/dashboard/protection/soil-fertilizer',
  },
];

async function fetchServiceCenters() {
  const [learning, pest, soil] = await Promise.all([
    supabase.from('learning_centers').select('*'),
    supabase.from('pest_centers').select('*'),
    supabase.from('soil_fertilizer_centers').select('*'),
  ]);
  const result = [learning, pest, soil];
  const failure = result.find(({ error }) => error);
  if (failure) throw failure.error;

  return result.flatMap(({ data = [] }, index) =>
    data.map((row) => ({
      id: `${SERVICE_TYPES[index].key}-${row.id}`,
      typeKey: SERVICE_TYPES[index].key,
      name: row.name || row.center_name || 'ไม่ระบุชื่อศูนย์',
      district: row.district || 'ไม่ระบุอำเภอ',
      subdistrict: row.subdistrict || '',
      focus:
        row.featured_product || row.main_crop_type || row.location_type || '-',
      grade: row.grade_level || '',
      phone: row.phone || row.contact_phone || '',
    }))
  );
}

export default function NearbyServiceCentersWidget() {
  const navigate = useNavigate();
  const {
    data: rows = [],
    isLoading,
    error,
    refetch,
  } = useApiCache('nearby-service-centers-v1', fetchServiceCenters, {
    staleMinutes: 15,
    cacheMinutes: 60,
  });
  const [selectedType, setSelectedType] = useState('learning');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [search, setSearch] = useState('');
  const activeType =
    SERVICE_TYPES.find((type) => type.key === selectedType) || SERVICE_TYPES[0];
  const typeRows = rows.filter((row) => row.typeKey === selectedType);
  const districts = [...new Set(typeRows.map((row) => row.district))].sort(
    (a, b) => a.localeCompare(b, 'th')
  );
  const filteredRows = typeRows.filter((row) => {
    const matchesDistrict =
      selectedDistrict === 'all' || row.district === selectedDistrict;
    const searchable =
      `${row.name} ${row.district} ${row.subdistrict} ${row.focus}`.toLowerCase();
    return matchesDistrict && searchable.includes(search.trim().toLowerCase());
  });
  const districtRows = useMemo(() => {
    const counts = new Map();
    filteredRows.forEach((row) =>
      counts.set(row.district, (counts.get(row.district) || 0) + 1)
    );
    return [...counts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRows]);
  const focusCount = new Set(
    filteredRows.map((row) => row.focus).filter((focus) => focus !== '-')
  ).size;
  const contactCount = filteredRows.filter((row) => row.phone).length;
  const maxDistrictCount = Math.max(
    ...districtRows.map((item) => item.count),
    1
  );

  return (
    <section
      className="nearby-centers-widget inst-v2-widget"
      aria-label="ศูนย์บริการเกษตรใกล้บ้าน"
    >
      <div className="inst-v2-head">
        <div>
          <div className="inst-v2-eyebrow">🏘️ ข้อมูลบริการเกษตรใกล้บ้าน</div>
          <p>ศพก. ศจช. และศดปช. พร้อมข้อมูลอำเภอ ตำบล และบริการเด่น</p>
        </div>
        <button
          type="button"
          className="inst-v2-refresh"
          onClick={() => refetch()}
          aria-label="โหลดข้อมูลใหม่"
        >
          <ReloadOutlined spin={isLoading} />
        </button>
      </div>

      {error ? (
        <div className="inst-v2-empty">โหลดข้อมูลไม่ได้: {error.message}</div>
      ) : (
        <>
          <div
            className="inst-v2-type-tabs"
            role="tablist"
            aria-label="ประเภทศูนย์บริการ"
          >
            {SERVICE_TYPES.map((type) => {
              const total = rows.filter(
                (row) => row.typeKey === type.key
              ).length;
              return (
                <button
                  key={type.key}
                  type="button"
                  role="tab"
                  aria-selected={selectedType === type.key}
                  className={selectedType === type.key ? 'is-active' : ''}
                  style={{ '--tone': type.tone }}
                  onClick={() => {
                    setSelectedType(type.key);
                    setSelectedDistrict('all');
                    setSearch('');
                  }}
                >
                  <span>
                    {type.icon} {type.shortLabel}
                  </span>
                  <strong>{number.format(total)}</strong>
                </button>
              );
            })}
          </div>

          <div
            className="inst-v2-active-title"
            style={{ '--tone': activeType.tone }}
          >
            <span>
              {activeType.icon} {activeType.label}
            </span>
            <Button
              type="primary"
              size="small"
              icon={<DatabaseOutlined />}
              onClick={() => navigate(activeType.route)}
              style={{
                background: activeType.tone,
                borderColor: activeType.tone,
              }}
            >
              ดูตารางข้อมูลเต็ม
            </Button>
          </div>

          <div className="nearby-centers-toolbar">
            <label>
              <span>อำเภอ</span>
              <select
                value={selectedDistrict}
                onChange={(event) => setSelectedDistrict(event.target.value)}
              >
                <option value="all">ทุกอำเภอ</option>
                {districts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>
            <label className="inst-v2-search">
              <span>ค้นหา</span>
              <div>
                <SearchOutlined />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ชื่อศูนย์ / ตำบล / บริการเด่น"
                />
              </div>
            </label>
          </div>

          <div className="inst-v2-stats">
            <Stat
              label="จำนวนศูนย์"
              value={`${number.format(filteredRows.length)} แห่ง`}
              tone={activeType.tone}
            />
            <Stat
              label="อำเภอที่มีข้อมูล"
              value={`${number.format(districtRows.length)} อำเภอ`}
              tone="#7c3aed"
            />
            <Stat
              label="พืช/บริการเด่น"
              value={`${number.format(focusCount)} รายการ`}
              tone="#16a34a"
            />
            <Stat
              label="มีเบอร์ติดต่อ"
              value={`${number.format(contactCount)} แห่ง`}
              tone="#ea580c"
            />
          </div>

          <div className="inst-v2-body">
            <div className="inst-v2-chart">
              <div className="inst-v2-section-title">
                📊 ศูนย์บริการตามอำเภอ
              </div>
              <div className="nearby-centers-bars">
                {districtRows.map((district) => (
                  <button
                    key={district.name}
                    type="button"
                    onClick={() =>
                      setSelectedDistrict(
                        selectedDistrict === district.name
                          ? 'all'
                          : district.name
                      )
                    }
                  >
                    <span>{district.name}</span>
                    <i>
                      <b
                        style={{
                          width: `${(district.count / maxDistrictCount) * 100}%`,
                          background: activeType.tone,
                        }}
                      />
                    </i>
                    <strong>{number.format(district.count)}</strong>
                  </button>
                ))}
              </div>
            </div>
            <div className="inst-v2-list">
              <div className="inst-v2-section-title">
                รายชื่อศูนย์ ({number.format(filteredRows.length)} แห่ง)
              </div>
              {isLoading ? (
                <div className="inst-v2-empty">กำลังโหลดข้อมูล...</div>
              ) : filteredRows.length ? (
                filteredRows.map((row) => (
                  <article
                    key={row.id}
                    className="inst-v2-item"
                    style={{ '--tone': activeType.tone }}
                  >
                    <div className="inst-v2-item-main">
                      <span>{activeType.shortLabel}</span>
                      <strong>{row.name}</strong>
                      <p>
                        {row.district}
                        {row.subdistrict ? ` / ${row.subdistrict}` : ''}
                        {row.focus !== '-' ? ` · ${row.focus}` : ''}
                      </p>
                    </div>
                    <div className="inst-v2-item-side">
                      <strong>{row.grade || '—'}</strong>
                      <span>{row.phone || 'ไม่มีเบอร์'}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="inst-v2-empty">ไม่พบข้อมูลตามตัวกรอง</div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="inst-v2-stat" style={{ '--tone': tone }}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
