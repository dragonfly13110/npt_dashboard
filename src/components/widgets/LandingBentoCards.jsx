import React, { useMemo, useState } from 'react';
import { Tooltip } from 'antd';
import {
  TeamOutlined,
  EnvironmentOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';

// =======================
// SKELETON COMPONENTS
// =======================
const BentoListSkeleton = () => (
  <div className="bento-list">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="bento-list-item"
        style={{ pointerEvents: 'none' }}
      >
        <div className="skeleton-box sk-avatar"></div>
        <div className="bento-item-content" style={{ flex: 1 }}>
          <div className="skeleton-box sk-text" style={{ width: '70%' }}></div>
          <div
            className="skeleton-box sk-text-short"
            style={{ width: '40%' }}
          ></div>
        </div>
      </div>
    ))}
  </div>
);

const BentoGridSkeleton = ({ count = 4, height = '40px' }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="skeleton-box"
        style={{ width: '100%', height, borderRadius: '6px' }}
      ></div>
    ))}
  </div>
);

// =======================
// CARDS COMPONENTS
// =======================

export const SmartFarmersCard = ({ stats, loading }) => {
  const sf = stats?.sf || 0;
  const ysf = stats?.ysf || 0;
  const total = sf + ysf;

  return (
    <div className="bento-card" style={{ gridArea: 'sf' }}>
      <div
        className="bento-card-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h3>🧑‍🌾 Smart Farmer</h3>
        </div>
        <div
          style={{
            background: '#f1f5f9',
            padding: '4px 8px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#475569',
          }}
        >
          ทั้งหมด {total.toLocaleString()} ราย
        </div>
      </div>
      <div
        className="bento-card-body"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '16px',
        }}
      >
        {loading ? (
          <BentoGridSkeleton count={2} height="50px" />
        ) : (
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: '#fff7ed',
                borderRadius: '8px',
                border: '1px solid #fed7aa',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <span style={{ fontSize: '20px' }}>🧑‍🌾</span>
                <span
                  style={{ fontSize: 14, color: '#c2410c', fontWeight: 600 }}
                >
                  Smart Farmer (SF)
                </span>
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#9a3412' }}>
                {sf.toLocaleString()}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: '#f0fdf4',
                borderRadius: '8px',
                border: '1px solid #bbf7d0',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <span style={{ fontSize: '20px' }}>🌱</span>
                <span
                  style={{ fontSize: 14, color: '#15803d', fontWeight: 600 }}
                >
                  Young Smart Farmer (YSF)
                </span>
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#166534' }}>
                {ysf.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
      <a
        href="/public/smart-farmers"
        style={{
          display: 'block',
          textAlign: 'center',
          padding: '10px 16px',
          background: '#fff7ed',
          color: '#c2410c',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          borderTop: '1px solid #fed7aa',
          borderRadius: '0 0 14px 14px',
        }}
      >
        📊 ดูรายละเอียดทั้งหมด →
      </a>
    </div>
  );
};

const formatThaiDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const countBy = (items, key) => {
  const map = {};
  items.forEach((item) => {
    const name = item[key] || 'ไม่ระบุ';
    map[name] = (map[name] || 0) + 1;
  });
  return map;
};

export const CommunityEnterprisesCard = ({
  count,
  districtStats,
  details = {},
  loading,
}) => {
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [search, setSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const typeOptions = useMemo(
    () => Object.entries(details.typeCounts || {}).sort((a, b) => b[1] - a[1]),
    [details.typeCounts]
  );
  const districtOptions = useMemo(
    () => Object.entries(districtStats || {}).sort((a, b) => b[1] - a[1]),
    [districtStats]
  );

  const filteredList = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (details.list || []).filter((item) => {
      if (
        selectedType !== 'all' &&
        (item.enterprise_type || 'ไม่ระบุประเภท') !== selectedType
      )
        return false;
      if (selectedDistrict !== 'all' && item.district !== selectedDistrict)
        return false;
      if (!query) return true;
      return [
        item.enterprise_name,
        item.enterprise_type,
        item.district,
        item.subdistrict,
        item.village_no,
      ].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(query)
      );
    });
  }, [details.list, search, selectedDistrict, selectedType]);

  const filteredDistricts = useMemo(
    () =>
      Object.entries(countBy(filteredList, 'district')).sort(
        (a, b) => b[1] - a[1]
      ),
    [filteredList]
  );
  const filteredTypes = useMemo(
    () =>
      Object.entries(countBy(filteredList, 'enterprise_type')).sort(
        (a, b) => b[1] - a[1]
      ),
    [filteredList]
  );
  const selectedTypeCount =
    selectedType === 'all'
      ? filteredList.length
      : filteredList.filter(
          (item) => (item.enterprise_type || 'ไม่ระบุประเภท') === selectedType
        ).length;
  const hasFilter =
    selectedType !== 'all' || selectedDistrict !== 'all' || search.trim();

  return (
    <div
      className={`bento-card community-enterprise-card ${!isExpanded ? 'is-collapsed' : ''}`}
      style={{ gridArea: 'ce' }}
    >
      <div
        className="bento-card-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3>🤝 วิสาหกิจชุมชน</h3>
          <span
            style={{
              fontSize: '14px',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isExpanded ? <UpOutlined /> : <DownOutlined />}
          </span>
        </div>
        <div
          style={{
            background: '#ecfdf5',
            padding: '4px 8px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#15803d',
          }}
        >
          ทั้งหมด {count} แห่ง
        </div>
      </div>
      <div className="bento-card-body ce-detail-body">
        {loading ? (
          <>
            <BentoGridSkeleton count={4} height="56px" />
            <BentoGridSkeleton count={8} height="34px" />
          </>
        ) : (
          <>
            <div className="ce-filter-row">
              <label>
                <span>ประเภท</span>
                <select
                  value={selectedType}
                  onChange={(event) => setSelectedType(event.target.value)}
                >
                  <option value="all">ทุกประเภท</option>
                  {typeOptions.map(([type]) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>อำเภอ</span>
                <select
                  value={selectedDistrict}
                  onChange={(event) => setSelectedDistrict(event.target.value)}
                >
                  <option value="all">ทุกอำเภอ</option>
                  {districtOptions.map(([district]) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ce-search">
                <span>ค้นหา</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ชื่อวิสาหกิจ / ตำบล / อำเภอ"
                />
              </label>
              {hasFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('all');
                    setSelectedDistrict('all');
                    setSearch('');
                  }}
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>

            <div className="ce-kpi-grid">
              <div className="ce-kpi">
                <span>แสดงผล</span>
                <strong>{filteredList.length.toLocaleString()}</strong>
                <small>แห่ง</small>
              </div>
              <div className="ce-kpi">
                <span>อำเภอที่มีข้อมูล</span>
                <strong>{filteredDistricts.length.toLocaleString()}</strong>
                <small>อำเภอ</small>
              </div>
              <div className="ce-kpi">
                <span>ประเภท</span>
                <strong>{filteredTypes.length.toLocaleString()}</strong>
                <small>ประเภท</small>
              </div>
              <div className="ce-kpi">
                <span>ทั้งหมด</span>
                <strong>{Number(count || 0).toLocaleString()}</strong>
                <small>แห่ง</small>
              </div>
            </div>

            <div className="ce-v2-body">
              <div className="ce-panel">
                <div className="ce-section-title">สรุปตามอำเภอ</div>
                <div className="ce-bars">
                  {filteredDistricts.slice(0, 8).map(([district, value]) => {
                    const max = filteredDistricts[0]?.[1] || 1;
                    return (
                      <button
                        type="button"
                        key={district}
                        className={
                          selectedDistrict === district ? 'is-active' : ''
                        }
                        onClick={() =>
                          setSelectedDistrict(
                            selectedDistrict === district ? 'all' : district
                          )
                        }
                      >
                        <span>{district}</span>
                        <div>
                          <i
                            style={{
                              width: `${Math.max(8, (value / max) * 100)}%`,
                            }}
                          />
                        </div>
                        <strong>{value.toLocaleString()}</strong>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ce-panel">
                <div className="ce-section-title">
                  รายละเอียด ({filteredList.length.toLocaleString()} รายการ)
                </div>
                <div className="ce-result-list">
                  {filteredList.slice(0, 8).map((item) => (
                    <article
                      key={item.id || item.enterprise_name}
                      className="ce-result-item"
                    >
                      <span>{item.enterprise_type || 'ไม่ระบุประเภท'}</span>
                      <strong>
                        {item.enterprise_name || 'ไม่ระบุชื่อวิสาหกิจ'}
                      </strong>
                      <p>
                        {item.district || '-'} / {item.subdistrict || '-'}
                        {item.approval_date
                          ? ` • อนุมัติ ${formatThaiDate(item.approval_date)}`
                          : ''}
                      </p>
                    </article>
                  ))}
                  {!filteredList.length && (
                    <div className="ce-empty">ไม่พบข้อมูลตามตัวกรอง</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <a
        href="/public/community-enterprises"
        style={{
          display: 'block',
          textAlign: 'center',
          padding: '10px 16px',
          background: '#ecfdf5',
          color: '#15803d',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          borderTop: '1px solid #bbf7d0',
          borderRadius: '0 0 14px 14px',
        }}
      >
        📊 ดูรายละเอียดทั้งหมด →
      </a>
    </div>
  );
};

export const LargePlotsCard = ({ largePlotsList = [], loading }) => {
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [search, setSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const groupOptions = useMemo(() => {
    const counts = {};
    largePlotsList.forEach((item) => {
      const g = item.commodity_group || 'ไม่ระบุ';
      counts[g] = (counts[g] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [largePlotsList]);

  const districtOptions = useMemo(() => {
    const counts = {};
    largePlotsList.forEach((item) => {
      const d = item.district || 'ไม่ระบุ';
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [largePlotsList]);

  const filteredList = useMemo(() => {
    const query = search.trim().toLowerCase();
    return largePlotsList.filter((item) => {
      if (
        selectedGroup !== 'all' &&
        (item.commodity_group || 'ไม่ระบุ') !== selectedGroup
      )
        return false;
      if (selectedDistrict !== 'all' && item.district !== selectedDistrict)
        return false;
      if (!query) return true;
      return [
        item.plot_name,
        item.commodity,
        item.district,
        item.subdistrict,
        item.commodity_group,
        item.year,
      ].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(query)
      );
    });
  }, [largePlotsList, search, selectedDistrict, selectedGroup]);

  const kpis = useMemo(() => {
    let members = 0;
    let area = 0;
    filteredList.forEach((item) => {
      members += Number(item.member_count) || 0;
      area += Number(item.area_rai) || 0;
    });
    return {
      members,
      area,
      count: filteredList.length,
    };
  }, [filteredList]);

  const filteredDistricts = useMemo(() => {
    const counts = countBy(filteredList, 'district');
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredList]);

  const hasFilter =
    selectedGroup !== 'all' || selectedDistrict !== 'all' || search.trim();

  return (
    <div
      className={`bento-card large-plots-card ${!isExpanded ? 'is-collapsed' : ''}`}
      style={{ gridArea: 'lp' }}
    >
      <div
        className="bento-card-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3>🌾 แปลงใหญ่</h3>
          <span
            style={{
              fontSize: '14px',
              color: '#0d9488',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isExpanded ? <UpOutlined /> : <DownOutlined />}
          </span>
        </div>
        <div
          className="lp-total-badge"
          style={{
            background: '#f0fdfa',
            padding: '4px 8px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#0d9488',
          }}
        >
          ทั้งหมด {largePlotsList.length.toLocaleString()} แปลง
        </div>
      </div>
      <div className="bento-card-body ce-detail-body">
        {loading ? (
          <>
            <BentoGridSkeleton count={4} height="56px" />
            <BentoGridSkeleton count={8} height="34px" />
          </>
        ) : (
          <>
            <div className="ce-filter-row">
              <label>
                <span>กลุ่มสินค้า</span>
                <select
                  value={selectedGroup}
                  onChange={(event) => setSelectedGroup(event.target.value)}
                >
                  <option value="all">ทุกกลุ่มสินค้า</option>
                  {groupOptions.map(([group]) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>อำเภอ</span>
                <select
                  value={selectedDistrict}
                  onChange={(event) => setSelectedDistrict(event.target.value)}
                >
                  <option value="all">ทุกอำเภอ</option>
                  {districtOptions.map(([district]) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ce-search">
                <span>ค้นหา</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ชื่อแปลง / ชนิดสินค้า / ตำบล / อำเภอ"
                />
              </label>
              {hasFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGroup('all');
                    setSelectedDistrict('all');
                    setSearch('');
                  }}
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>

            <div className="ce-kpi-grid">
              <div className="ce-kpi">
                <span>แปลงใหญ่ที่แสดง</span>
                <strong>{kpis.count.toLocaleString()}</strong>
                <small>แปลง</small>
              </div>
              <div className="ce-kpi">
                <span>สมาชิกรวม</span>
                <strong>{kpis.members.toLocaleString()}</strong>
                <small>ราย</small>
              </div>
              <div className="ce-kpi">
                <span>พื้นที่รวม</span>
                <strong>{kpis.area.toLocaleString()}</strong>
                <small>ไร่</small>
              </div>
              <div className="ce-kpi">
                <span>แปลงทั้งหมด</span>
                <strong>{largePlotsList.length.toLocaleString()}</strong>
                <small>แปลง</small>
              </div>
            </div>

            <div className="ce-v2-body">
              <div className="ce-panel">
                <div className="ce-section-title">สรุปตามอำเภอ</div>
                <div className="ce-bars">
                  {filteredDistricts.slice(0, 8).map(([district, value]) => {
                    const max = filteredDistricts[0]?.[1] || 1;
                    return (
                      <button
                        type="button"
                        key={district}
                        className={
                          selectedDistrict === district ? 'is-active' : ''
                        }
                        onClick={() =>
                          setSelectedDistrict(
                            selectedDistrict === district ? 'all' : district
                          )
                        }
                      >
                        <span>{district}</span>
                        <div>
                          <i
                            style={{
                              width: `${Math.max(8, (value / max) * 100)}%`,
                            }}
                          />
                        </div>
                        <strong>{value.toLocaleString()}</strong>
                      </button>
                    );
                  })}
                  {!filteredDistricts.length && (
                    <div
                      style={{
                        fontSize: 13,
                        color: '#64748b',
                        padding: '8px 0',
                      }}
                    >
                      ไม่มีข้อมูล
                    </div>
                  )}
                </div>
              </div>

              <div className="ce-panel">
                <div className="ce-section-title">
                  รายละเอียด ({filteredList.length.toLocaleString()} รายการ)
                </div>
                <div className="ce-result-list">
                  {filteredList.slice(0, 8).map((item) => (
                    <article
                      key={item.id || item.plot_name}
                      className="ce-result-item"
                    >
                      <span>
                        {item.commodity ||
                          item.commodity_group ||
                          'ไม่ระบุสินค้า'}
                      </span>
                      <strong>{item.plot_name || 'ไม่ระบุชื่อแปลง'}</strong>
                      <p>
                        อ.{item.district || '-'} / ต.{item.subdistrict || '-'}
                        {item.year ? ` • ปีจัดตั้ง ${item.year}` : ''}
                        {item.member_count
                          ? ` • สมาชิก ${Number(item.member_count).toLocaleString()} ราย`
                          : ''}
                        {item.area_rai
                          ? ` • พื้นที่ ${Number(item.area_rai).toLocaleString()} ไร่`
                          : ''}
                      </p>
                    </article>
                  ))}
                  {!filteredList.length && (
                    <div className="ce-empty">ไม่พบข้อมูลตามตัวกรอง</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <a
        href="/public/large-plots"
        style={{
          display: 'block',
          textAlign: 'center',
          padding: '10px 16px',
          background: '#f0fdfa',
          color: '#0d9488',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          borderTop: '1px solid #99f6e4',
          borderRadius: '0 0 14px 14px',
        }}
      >
        📊 ดูรายละเอียดทั้งหมด →
      </a>
    </div>
  );
};

export const AgriTourismCard = ({ data, loading }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div
      className={`bento-card agri-tourism-card ${!isExpanded ? 'is-collapsed' : ''}`}
      style={{ gridArea: 'at' }}
    >
      <div
        className="bento-card-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3>🌿 แหล่งท่องเที่ยว</h3>
          <span
            style={{
              fontSize: '14px',
              color: '#7e22ce',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isExpanded ? <UpOutlined /> : <DownOutlined />}
          </span>
        </div>
        <div
          style={{
            background: '#f3e8ff',
            padding: '4px 8px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#7e22ce',
          }}
        >
          ทั้งหมด {data.count} แห่ง
        </div>
      </div>
      {isExpanded && (
        <>
          <div className="bento-card-body">
            {loading ? (
              <BentoListSkeleton />
            ) : data.list.length === 0 ? (
              <div className="bento-empty">รอเพิ่มข้อมูล...</div>
            ) : (
              <div className="bento-list">
                {data.list.map((item) => (
                  <div key={item.id} className="bento-list-item">
                    <div className="bento-item-icon bg-purple-100 text-purple-600">
                      <EnvironmentOutlined />
                    </div>
                    <div className="bento-item-content">
                      <h4>{item.spot_name}</h4>
                      <p>
                        อ.{item.district || '-'} &bull;{' '}
                        {item.spot_type || 'ไม่ระบุ'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <a
            href="/public/agri-tourism"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '10px 16px',
              background: '#f3e8ff',
              color: '#7e22ce',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              borderTop: '1px solid #e9d5ff',
              borderRadius: '0 0 14px 14px',
            }}
          >
            📊 ดูรายละเอียดทั้งหมด →
          </a>
        </>
      )}
    </div>
  );
};

export const FarmerInstitutesCard = ({ stats, loading }) => {
  return (
    <div className="bento-card" style={{ gridArea: 'fi' }}>
      <div
        className="bento-card-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h3>👥 สถาบันเกษตรกร</h3>
        </div>
        <div
          style={{
            background: '#f1f5f9',
            padding: '4px 8px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#475569',
          }}
        >
          ทั้งหมด {stats.total} กลุ่ม
        </div>
      </div>
      <div
        className="bento-card-body"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '16px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#64748b',
              marginBottom: 8,
              paddingLeft: 2,
            }}
          >
            ประเภท (กลุ่ม)
          </div>
          {loading ? (
            <BentoGridSkeleton count={4} height="32px" />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: '#e0f2fe',
                  borderRadius: '6px',
                  border: '1px solid #bae6fd',
                }}
              >
                <span
                  style={{ fontSize: 12, color: '#0369a1', fontWeight: 500 }}
                >
                  วิสาหกิจฯ
                </span>
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}
                >
                  {stats.ce}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: '#dcfce3',
                  borderRadius: '6px',
                  border: '1px solid #bbf7d0',
                }}
              >
                <span
                  style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}
                >
                  แม่บ้านฯ
                </span>
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: '#1a7f37' }}
                >
                  {stats.housewives}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: '#fef3c7',
                  borderRadius: '6px',
                  border: '1px solid #fde68a',
                }}
              >
                <span
                  style={{ fontSize: 12, color: '#d97706', fontWeight: 500 }}
                >
                  ยุวเกษตรฯ
                </span>
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: '#b45309' }}
                >
                  {stats.young_grp}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: '#f3e8ff',
                  borderRadius: '6px',
                  border: '1px solid #e9d5ff',
                }}
              >
                <span
                  style={{ fontSize: 12, color: '#7e22ce', fontWeight: 500 }}
                >
                  ส่งเสริมอาชีพ
                </span>
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: '#6b21a8' }}
                >
                  {stats.career}
                </span>
              </div>
            </div>
          )}
        </div>
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#64748b',
              marginBottom: 8,
              paddingLeft: 2,
            }}
          >
            สมาชิก/เกษตรกร (ราย)
          </div>
          {loading ? (
            <BentoGridSkeleton count={3} height="32px" />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  gridColumn: 'span 2',
                }}
              >
                <span
                  style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}
                >
                  เกษตรกรทั่วไป (หมู่บ้าน)
                </span>
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}
                >
                  {stats.village}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <span
                  style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}
                >
                  Smart Farmer
                </span>
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}
                >
                  {stats.sf}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <span
                  style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}
                >
                  YSF
                </span>
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}
                >
                  {stats.ysf}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      <a
        href="/public/farmer-institutes"
        style={{
          display: 'block',
          textAlign: 'center',
          padding: '10px 16px',
          background: '#dcfce7',
          color: '#15803d',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          borderTop: '1px solid #bbf7d0',
          borderRadius: '0 0 14px 14px',
        }}
      >
        📊 ดูรายละเอียดทั้งหมด →
      </a>
    </div>
  );
};

export const AgriAreasCard = ({ stats, districtStats, loading }) => {
  const renderTooltip = (fieldKey, label, unit = 'ไร่') => {
    if (!districtStats)
      return <div style={{ fontSize: 12 }}>ไม่มีข้อมูลรายอำเภอ</div>;

    const sorted = Object.entries(districtStats)
      .map(([name, data]) => ({
        name,
        value: data[fieldKey] || 0,
      }))
      .sort((a, b) => b.value - a.value);

    return (
      <div style={{ padding: '4px' }}>
        <strong
          style={{
            display: 'block',
            marginBottom: '6px',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            paddingBottom: '4px',
            fontSize: '13px',
          }}
        >
          📍 {label} (รายอำเภอ)
        </strong>
        <table
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            minWidth: '180px',
          }}
        >
          <tbody>
            {sorted.map(({ name, value }) => (
              <tr
                key={name}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <td
                  style={{
                    padding: '3px 8px 3px 0',
                    fontSize: '12px',
                    color: '#e2e8f0',
                  }}
                >
                  {name}
                </td>
                <td
                  style={{
                    padding: '3px 0',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textAlign: 'right',
                    color: '#ffffff',
                  }}
                >
                  {value.toLocaleString()}{' '}
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 'normal',
                      color: '#cbd5e1',
                    }}
                  >
                    {unit}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="bento-card agri-areas-card" style={{ gridArea: 'ag' }}>
      <div
        className="bento-card-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          borderBottom: '1px solid #f8fafc',
          background: 'linear-gradient(to right, #f0fdf4, #ffffff)',
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: '#dcfce3',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            🪴
          </div>
          <h3 style={{ fontSize: 22, color: '#0f172a', margin: 0 }}>
            สรุปพื้นที่การเกษตร แยกตามชนิดพืช
          </h3>
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#16a34a',
            fontWeight: 600,
            background: '#f0fdf4',
            padding: '5px 12px',
            borderRadius: 8,
            border: '1px solid #bbf7d0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 6px rgba(22, 101, 52, 0.04)',
          }}
        >
          💡 คลิกที่กล่องเพื่อดูรายอำเภอ
        </div>
      </div>
      <div
        className="bento-card-body"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {loading ? (
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              <div
                className="skeleton-box"
                style={{ height: '42px', borderRadius: '8px' }}
              ></div>
              <div
                className="skeleton-box"
                style={{ height: '42px', borderRadius: '8px' }}
              ></div>
              <div
                className="skeleton-box"
                style={{ height: '42px', borderRadius: '8px' }}
              ></div>
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#16a34a',
                borderBottom: '2px solid #dcfce3',
                paddingBottom: 5,
                marginBottom: 10,
              }}
            >
              พื้นที่เพาะปลูกพืชหลัก (ไร่)
            </div>
            <BentoGridSkeleton count={8} height="38px" />
          </>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              <Tooltip
                trigger="click"
                title={renderTooltip('area', 'พื้นที่ด้านพืชรวม', 'ไร่')}
                color="rgba(15, 23, 42, 0.95)"
              >
                <div
                  className="agri-area-clickable-box"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: '#f8fafc',
                    borderLeft: '4px solid #16a34a',
                    borderRadius: '8px',
                    borderTop: '1px solid #e2e8f0',
                    borderRight: '1px solid #e2e8f0',
                    borderBottom: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span
                    style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}
                  >
                    พื้นที่ด้านพืชรวม
                  </span>
                  <span
                    style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}
                  >
                    {stats.crop_area.toLocaleString()}{' '}
                    <span style={{ fontSize: 11, fontWeight: 600 }}>ไร่</span>
                  </span>
                </div>
              </Tooltip>
              <Tooltip
                trigger="click"
                title={renderTooltip('house', 'ครัวเรือนเกษตรกร', 'ครัวเรือน')}
                color="rgba(15, 23, 42, 0.95)"
              >
                <div
                  className="agri-area-clickable-box"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: '#f8fafc',
                    borderLeft: '4px solid #84cc16',
                    borderRadius: '8px',
                    borderTop: '1px solid #e2e8f0',
                    borderRight: '1px solid #e2e8f0',
                    borderBottom: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span
                    style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}
                  >
                    ครัวเรือนเกษตรกร
                  </span>
                  <span
                    style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}
                  >
                    {stats.households.toLocaleString()}{' '}
                    <span style={{ fontSize: 11, fontWeight: 600 }}>ครัว.</span>
                  </span>
                </div>
              </Tooltip>
            </div>

            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#16a34a',
                borderBottom: '2px solid #dcfce3',
                paddingBottom: 5,
                marginBottom: 10,
              }}
            >
              พื้นที่เพาะปลูกพืชหลัก (ไร่)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                flex: 1,
              }}
            >
              <Tooltip
                trigger="click"
                title={renderTooltip('ricePi', 'ข้าวนาปี', 'ไร่')}
                color="rgba(15, 23, 42, 0.95)"
              >
                <div
                  className="agri-area-clickable-box"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span
                    style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}
                  >
                    ข้าวนาปี
                  </span>
                  <span
                    style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}
                  >
                    {stats.rice_pi.toLocaleString()}
                  </span>
                </div>
              </Tooltip>
              <Tooltip
                trigger="click"
                title={renderTooltip('ricePrung', 'ข้าวนาปรัง', 'ไร่')}
                color="rgba(15, 23, 42, 0.95)"
              >
                <div
                  className="agri-area-clickable-box"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span
                    style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}
                  >
                    ข้าวนาปรัง
                  </span>
                  <span
                    style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}
                  >
                    {stats.rice_prung.toLocaleString()}
                  </span>
                </div>
              </Tooltip>
              <Tooltip
                trigger="click"
                title={renderTooltip('field', 'พืชไร่', 'ไร่')}
                color="rgba(15, 23, 42, 0.95)"
              >
                <div
                  className="agri-area-clickable-box"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span
                    style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}
                  >
                    พืชไร่
                  </span>
                  <span
                    style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}
                  >
                    {stats.field_crops.toLocaleString()}
                  </span>
                </div>
              </Tooltip>
              <Tooltip
                trigger="click"
                title={renderTooltip('hort', 'พืชสวน', 'ไร่')}
                color="rgba(15, 23, 42, 0.95)"
              >
                <div
                  className="agri-area-clickable-box"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span
                    style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}
                  >
                    พืชสวน
                  </span>
                  <span
                    style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}
                  >
                    {stats.hort.toLocaleString()}
                  </span>
                </div>
              </Tooltip>
              <Tooltip
                trigger="click"
                title={renderTooltip('veg', 'พืชผัก', 'ไร่')}
                color="rgba(15, 23, 42, 0.95)"
              >
                <div
                  className="agri-area-clickable-box"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span
                    style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}
                  >
                    พืชผัก
                  </span>
                  <span
                    style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}
                  >
                    {stats.veg.toLocaleString()}
                  </span>
                </div>
              </Tooltip>
              <Tooltip
                trigger="click"
                title={renderTooltip('fruit', 'ไม้ผล/ยืนต้น', 'ไร่')}
                color="rgba(15, 23, 42, 0.95)"
              >
                <div
                  className="agri-area-clickable-box"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span
                    style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}
                  >
                    ไม้ผล/ยืนต้น
                  </span>
                  <span
                    style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}
                  >
                    {stats.fruit.toLocaleString()}
                  </span>
                </div>
              </Tooltip>
              <Tooltip
                trigger="click"
                title={renderTooltip('flow', 'ไม้ดอกฯ', 'ไร่')}
                color="rgba(15, 23, 42, 0.95)"
              >
                <div
                  className="agri-area-clickable-box"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span
                    style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}
                  >
                    ไม้ดอกฯ
                  </span>
                  <span
                    style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}
                  >
                    {stats.flow.toLocaleString()}
                  </span>
                </div>
              </Tooltip>
              <Tooltip
                trigger="click"
                title={renderTooltip('herb', 'สมุนไพร', 'ไร่')}
                color="rgba(15, 23, 42, 0.95)"
              >
                <div
                  className="agri-area-clickable-box"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span
                    style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}
                  >
                    สมุนไพร
                  </span>
                  <span
                    style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}
                  >
                    {stats.herb.toLocaleString()}
                  </span>
                </div>
              </Tooltip>
            </div>
          </>
        )}
      </div>
      <a
        href="/public/agricultural-areas"
        style={{
          display: 'block',
          textAlign: 'center',
          padding: '10px 16px',
          background: '#dcfce7',
          color: '#15803d',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          borderTop: '1px solid #bbf7d0',
          borderRadius: '0 0 14px 14px',
        }}
      >
        📊 ดูรายละเอียดทั้งหมด →
      </a>
    </div>
  );
};

export const DeptStatsOverview = ({ allStats, instituteStats, loading }) => {
  return (
    <section className="dept-stats-container">
      <div className="dept-stats-header">
        <h2>📊 ภาพรวมข้อมูล 5 ยุทธศาสตร์</h2>
        <p>สถิติข้อมูลล่าสุดแยกตามกลุ่มงานภายในสำนักงาน</p>
      </div>

      <div className="dept-grid">
        {/* Admin */}
        <div className="dept-card" style={{ '--theme': '#0ea5e9' }}>
          <div className="dept-icon">🏢</div>
          <h3>ฝ่ายบริหารทั่วไป</h3>
          <ul>
            <li>
              <span>บุคลากร</span>{' '}
              {loading ? (
                <div
                  className="skeleton-box"
                  style={{ width: 40, height: 20 }}
                />
              ) : (
                <strong>{allStats.personnel || 0}</strong>
              )}
            </li>
            <li>
              <span>พัสดุ/ครุภัณฑ์</span>{' '}
              {loading ? (
                <div
                  className="skeleton-box"
                  style={{ width: 40, height: 20 }}
                />
              ) : (
                <strong>{allStats.assets || 0}</strong>
              )}
            </li>
            <li>
              <span>โครงการงบประมาณ</span>{' '}
              {loading ? (
                <div
                  className="skeleton-box"
                  style={{ width: 40, height: 20 }}
                />
              ) : (
                <strong>{allStats.budgets || 0}</strong>
              )}
            </li>
          </ul>
        </div>

        {/* Strategy */}
        <div className="dept-card" style={{ '--theme': '#8b5cf6' }}>
          <div className="dept-icon">📋</div>
          <h3>ยุทธศาสตร์และสารสนเทศ</h3>
          <ul>
            <li>
              <span>พื้นที่การเกษตร (ข้อมูล)</span>{' '}
              {loading ? (
                <div
                  className="skeleton-box"
                  style={{ width: 60, height: 20 }}
                />
              ) : (
                <strong>{allStats.agricultural_areas || 0} แห่ง</strong>
              )}
            </li>
            <li>
              <span>ศูนย์ ศพก.</span>{' '}
              {loading ? (
                <div
                  className="skeleton-box"
                  style={{ width: 40, height: 20 }}
                />
              ) : (
                <strong>{allStats.learning_centers || 0}</strong>
              )}
            </li>
            <li>
              <span>รายงานภัยพิบัติ</span>{' '}
              {loading ? (
                <div
                  className="skeleton-box"
                  style={{ width: 40, height: 20 }}
                />
              ) : (
                <strong>{allStats.disasters || 0}</strong>
              )}
            </li>
          </ul>
        </div>

        {/* Production */}
        <div className="dept-card" style={{ '--theme': '#f59e0b' }}>
          <div className="dept-icon">🌾</div>
          <h3>ส่งเสริมและพัฒนาการผลิต</h3>
          <ul>
            <li>
              <span>แปลงใหญ่</span>{' '}
              {loading ? (
                <div
                  className="skeleton-box"
                  style={{ width: 40, height: 20 }}
                />
              ) : (
                <strong>{allStats.large_plots || 0}</strong>
              )}
            </li>
            <li>
              <span>มาตรฐาน GAP</span>{' '}
              {loading ? (
                <div
                  className="skeleton-box"
                  style={{ width: 40, height: 20 }}
                />
              ) : (
                <strong>{allStats.certifications || 0}</strong>
              )}
            </li>
            <li>
              <span>ผลผลิตพืช</span>{' '}
              {loading ? (
                <div
                  className="skeleton-box"
                  style={{ width: 40, height: 20 }}
                />
              ) : (
                <strong>{allStats.crop_production || 0}</strong>
              )}
            </li>
          </ul>
        </div>

        {/* Dev */}
        <div className="dept-card" style={{ '--theme': '#10b981' }}>
          <div className="dept-icon">🤝</div>
          <h3>ส่งเสริมและพัฒนาเกษตรกร</h3>
          <ul>
            <li>
              <span>วิสาหกิจชุมชน</span>{' '}
              {loading ? (
                <div
                  className="skeleton-box"
                  style={{ width: 40, height: 20 }}
                />
              ) : (
                <strong>{allStats.community_enterprises || 0}</strong>
              )}
            </li>
            <li>
              <span>Smart Farmer</span>{' '}
              {loading ? (
                <div
                  className="skeleton-box"
                  style={{ width: 40, height: 20 }}
                />
              ) : (
                <strong>{allStats.smart_farmers || 0}</strong>
              )}
            </li>
            <li>
              <span>กลุ่มสถาบันเกษตรกร</span>{' '}
              {loading ? (
                <div
                  className="skeleton-box"
                  style={{ width: 40, height: 20 }}
                />
              ) : (
                <strong>{instituteStats.total || 0}</strong>
              )}
            </li>
            <li>
              <span>ท่องเที่ยวเกษตร</span>{' '}
              {loading ? (
                <div
                  className="skeleton-box"
                  style={{ width: 40, height: 20 }}
                />
              ) : (
                <strong>{allStats.agri_tourism || 0}</strong>
              )}
            </li>
          </ul>
        </div>

        {/* Protection */}
        <div className="dept-card" style={{ '--theme': '#ef4444' }}>
          <div className="dept-icon">🔬</div>
          <h3>อารักขาพืชและจัดการดินปุ๋ย</h3>
          <ul>
            <li>
              <span>ระบาดศัตรูพืช</span>{' '}
              {loading ? (
                <div
                  className="skeleton-box"
                  style={{ width: 40, height: 20 }}
                />
              ) : (
                <strong>{allStats.forecast_plots || 0}</strong>
              )}
            </li>
            <li>
              <span>ศูนย์ ศจช.</span>{' '}
              {loading ? (
                <div
                  className="skeleton-box"
                  style={{ width: 40, height: 20 }}
                />
              ) : (
                <strong>{allStats.pest_centers || 0}</strong>
              )}
            </li>
            <li>
              <span>ศูนย์ ศดปช.</span>{' '}
              {loading ? (
                <div
                  className="skeleton-box"
                  style={{ width: 40, height: 20 }}
                />
              ) : (
                <strong>{allStats.soil_fertilizer_centers || 0}</strong>
              )}
            </li>
            <li>
              <span>จุดเฝ้าระวังไฟ/PM2.5</span>{' '}
              {loading ? (
                <div
                  className="skeleton-box"
                  style={{ width: 40, height: 20 }}
                />
              ) : (
                <strong>{allStats.fire_hotspots || 0}</strong>
              )}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};
