import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Spin, Button, Result } from 'antd';
import { ArrowRightOutlined, PieChartOutlined } from '@ant-design/icons';
import { supabase } from '../../supabaseClient';
import {
  PageHeader,
  CategoryBentoCard,
  CategoryChartCard,
} from '../../components/widgets/SharedDashboardUI';
import EChart from '../../components/widgets/EChart';
import {
  barOption,
  pieOption,
  dualAxisOption,
  CROP_COLORS,
} from '../../components/charts/echartOptions';
import { useApiCache } from '../../hooks/useApiCache';
import { filterRows } from '../interactiveDashboard/filters';
const LEARN_COLORS = [
  '#0288d1',
  '#0097a7',
  '#388e3c',
  '#afb42b',
  '#fbc02d',
  '#f57c00',
  '#e64a19',
  '#d32f2f',
];
const REGISTRY_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b'];
const WEATHER_COLORS = ['#1890ff', '#cf222e'];

const CROP_FIELDS = [
  { key: 'rice_in_season_rai', label: 'ข้าวนาปี' },
  { key: 'rice_off_season_rai', label: 'ข้าวนาปรัง' },
  { key: 'field_crops_rai', label: 'พืชไร่' },
  { key: 'horticulture_rai', label: 'พืชสวน' },
  { key: 'fruit_trees_rai', label: 'ไม้ผล/ไม้ยืนต้น' },
  { key: 'vegetables_rai', label: 'พืชผัก' },
  { key: 'flowers_rai', label: 'ไม้ดอก/ไม้ประดับ' },
  { key: 'herbs_spices_rai', label: 'สมุนไพร/เครื่องเทศ' },
];

const formatNumber = (value, digits = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return number.toLocaleString('th-TH', { maximumFractionDigits: digits });
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

function EmptyChart({ label }) {
  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#656d76',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <span style={{ fontSize: 32 }}>📭</span>
      <span>ยังไม่มีข้อมูล{label}</span>
    </div>
  );
}

function LinkBentoCard({
  title,
  icon,
  description,
  stats,
  to,
  accent = '#1a7f37',
}) {
  return (
    <Card
      style={{
        height: '100%',
        borderRadius: 12,
        border: '1px solid #e8ecf0',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
      }}
      bodyStyle={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 18,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              color: '#0f172a',
              fontSize: 17,
              fontWeight: 800,
            }}
          >
            <span style={{ marginRight: 8 }}>{icon}</span>
            {title}
          </h3>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 13 }}>
            {description}
          </p>
        </div>
        <Link to={to} aria-label={`เปิดหน้า${title}`}>
          <Button shape="circle" icon={<ArrowRightOutlined />} />
        </Link>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 8,
          marginTop: 'auto',
        }}
      >
        {stats.map((item) => (
          <div
            key={item.label}
            style={{
              border: '1px solid #e8ecf0',
              borderRadius: 10,
              padding: '10px 12px',
              background: item.highlight ? `${accent}12` : '#f8fafc',
            }}
          >
            <div
              style={{
                color: item.highlight ? accent : '#64748b',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                color: '#0f172a',
                fontSize: 18,
                fontWeight: 800,
                marginTop: 4,
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function StrategyDashboard({ embedded = false, filters = {} }) {
  const fetchStrategyData = async () => {
    const [agri, learn, registry, weather, geoplots] = await Promise.all([
      supabase.from('agricultural_areas').select('*'),
      supabase.from('learning_centers').select('*'),
      supabase
        .from('farmer_registry')
        .select('*')
        .order('data_year', { ascending: false })
        .order('district'),
      supabase
        .from('daily_weather')
        .select('date, tavg, tmin, tmax, prcp, wspd')
        .order('date', { ascending: false })
        .limit(90),
      supabase
        .from('geoplots_parcel_progress')
        .select('*')
        .order('district_code'),
    ]);
    const error = [agri, learn, registry, weather, geoplots].find(
      (result) => result.error
    )?.error;
    if (error) throw error;

    return {
      agriData: agri.data || [],
      learningData: learn.data || [],
      registryData: registry.data || [],
      weatherData: weather.data || [],
      geoplotsData: geoplots.data || [],
    };
  };

  const {
    data,
    isLoading: loading,
    error,
    refetch,
  } = useApiCache('strategy-dashboard-data-v3', fetchStrategyData);

  const { agriData, learningData, registryData, weatherData, geoplotsData } =
    useMemo(() => {
      const geoplotsYearKey = data?.geoplotsData?.some(
        (row) => row.year != null
      )
        ? 'year'
        : null;
      return {
        agriData: filterRows(data?.agriData || [], filters, { yearKey: null }),
        learningData: filterRows(data?.learningData || [], filters, {
          yearKey: null,
        }),
        registryData: filterRows(data?.registryData || [], filters, {
          yearKey: 'data_year',
        }),
        weatherData: [
          ...filterRows(data?.weatherData || [], filters, {
            districtKey: null,
            yearKey: null,
          }),
        ].reverse(),
        geoplotsData: filterRows(data?.geoplotsData || [], filters, {
          yearKey: geoplotsYearKey,
        }),
      };
    }, [data, filters]);

  const agriPie = useMemo(() => {
    return CROP_FIELDS.map((field) => ({
      name: field.label,
      value: agriData.reduce(
        (sum, row) => sum + (Number(row[field.key]) || 0),
        0
      ),
      color: CROP_COLORS[field.label] || '#cbd5e1',
    }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [agriData]);

  const { agriBar, agriCrops } = useMemo(() => {
    const districtMap = {};
    agriData.forEach((item) => {
      const district = item.district || 'ไม่ระบุ';
      if (!districtMap[district])
        districtMap[district] = { name: district, totalArea: 0 };
      CROP_FIELDS.forEach((field) => {
        const area = Number(item[field.key]) || 0;
        districtMap[district][field.label] =
          (districtMap[district][field.label] || 0) + area;
        districtMap[district].totalArea += area;
      });
    });
    return {
      agriBar: Object.values(districtMap).sort(
        (a, b) => b.totalArea - a.totalArea
      ),
      agriCrops: CROP_FIELDS.map((field) => field.label),
    };
  }, [agriData]);

  const learnPie = useMemo(() => {
    const counts = {};
    learningData.forEach((item) => {
      const crop = item.featured_product || 'ไม่ระบุ';
      counts[crop] = (counts[crop] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [learningData]);

  const { learnBar, learnTypes } = useMemo(() => {
    const districtMap = {};
    const typeSet = new Set();
    learningData.forEach((item) => {
      const district = item.district || 'ไม่ระบุ';
      const crop = item.featured_product || 'ไม่ระบุ';
      if (!districtMap[district])
        districtMap[district] = { name: district, total: 0 };
      districtMap[district][crop] = (districtMap[district][crop] || 0) + 1;
      districtMap[district].total += 1;
      typeSet.add(crop);
    });
    return {
      learnBar: Object.values(districtMap).sort((a, b) => b.total - a.total),
      learnTypes: Array.from(typeSet).sort(),
    };
  }, [learningData]);

  const agriStats = useMemo(() => {
    const cropMap = {};
    agriData.forEach((row) => {
      CROP_FIELDS.forEach((field) => {
        const area = Number(row[field.key]) || 0;
        if (area > 0) cropMap[field.label] = (cropMap[field.label] || 0) + area;
      });
    });
    const topTypes = Object.entries(cropMap).sort((a, b) => b[1] - a[1]);
    const totalPlanted = topTypes.reduce((sum, [, value]) => sum + value, 0);
    return { topTypes, totalPlanted };
  }, [agriData]);

  const learnStats = useMemo(() => {
    const typeMap = {};
    learningData.forEach((row) => {
      const type = row.featured_product || 'ไม่ระบุ';
      typeMap[type] = (typeMap[type] || 0) + 1;
    });
    return {
      total: learningData.length,
      topTypes: Object.entries(typeMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4),
    };
  }, [learningData]);

  const registry = useMemo(() => {
    const years = registryData
      .map((row) => Number(row.data_year))
      .filter(Number.isFinite);
    const activeYear = years.length ? Math.max(...years) : null;
    const activeRows = activeYear
      ? registryData.filter((row) => Number(row.data_year) === activeYear)
      : registryData;
    const districtRows = activeRows.filter(
      (row) => !['จังหวัดนครปฐม', 'นครปฐม'].includes(row.district)
    );
    const provinceRow = activeRows.find((row) =>
      ['จังหวัดนครปฐม', 'นครปฐม'].includes(row.district)
    );

    const target =
      Number(provinceRow?.target) ||
      districtRows.reduce((sum, row) => sum + (Number(row.target) || 0), 0);
    const updated =
      Number(provinceRow?.total_updated_households) ||
      districtRows.reduce(
        (sum, row) => sum + (Number(row.total_updated_households) || 0),
        0
      );
    const area =
      Number(provinceRow?.total_updated_area_rai) ||
      districtRows.reduce(
        (sum, row) => sum + (Number(row.total_updated_area_rai) || 0),
        0
      );
    const percent = target > 0 ? Math.round((updated / target) * 100) : 0;
    const latestCutoff = activeRows
      .map((row) => row.cutoff_date)
      .filter(Boolean)
      .sort()
      .at(-1);

    return {
      activeYear,
      target,
      updated,
      area,
      percent,
      remaining: target > 0 ? target - updated : null,
      latestCutoff,
      districtRows: districtRows.sort(
        (a, b) => (Number(b.target) || 0) - (Number(a.target) || 0)
      ),
    };
  }, [registryData]);

  const weather = useMemo(() => {
    const latest = weatherData.at(-1);
    const last7 = weatherData.slice(-7);
    const last30 = weatherData.slice(-30);
    const rain7 = last7.reduce((sum, row) => sum + (Number(row.prcp) || 0), 0);
    const rain30 = last30.reduce(
      (sum, row) => sum + (Number(row.prcp) || 0),
      0
    );
    const heavyRainDays = last30.filter((row) => Number(row.prcp) > 35).length;
    const avgTemp = last7.length
      ? last7.reduce((sum, row) => sum + (Number(row.tavg) || 0), 0) /
        last7.length
      : 0;
    return { latest, rain7, rain30, heavyRainDays, avgTemp };
  }, [weatherData]);

  const registryBarData = useMemo(() => {
    return registry.districtRows.map((row) => ({
      name: row.district || 'ไม่ระบุ',
      target: Number(row.target) || 0,
      updated: Number(row.total_updated_households) || 0,
      remaining: Math.max(
        (Number(row.target) || 0) - (Number(row.total_updated_households) || 0),
        0
      ),
    }));
  }, [registry.districtRows]);

  const geoplots = useMemo(() => {
    const rows = geoplotsData.map((row) => ({
      name: row.district || 'ไม่ระบุ',
      target: Number(row.target_plots) || 0,
      drawn: Number(row.drawn_plots) || 0,
      remainingTarget: Number(row.remaining_target_plots) || 0,
      remaining68: Number(row.remaining_list_68) || 0,
      remaining67: Number(row.remaining_list_67) || 0,
      progress: Number(row.progress_percent) || 0,
      scrapedAt: row.scraped_at,
    }));
    const target = rows.reduce((sum, row) => sum + row.target, 0);
    const drawn = rows.reduce((sum, row) => sum + row.drawn, 0);
    const remainingTarget = rows.reduce(
      (sum, row) => sum + row.remainingTarget,
      0
    );
    const latestScrapedAt = rows
      .map((row) => row.scrapedAt)
      .filter(Boolean)
      .sort()
      .at(-1);
    const weakest = [...rows].sort((a, b) => a.progress - b.progress)[0];
    return {
      rows,
      target,
      drawn,
      remainingTarget,
      percent: target > 0 ? Math.round((drawn / target) * 100) : 0,
      latestScrapedAt,
      weakest,
    };
  }, [geoplotsData]);

  return (
    <div className={embedded ? 'embedded-dashboard' : undefined}>
      {!embedded && (
        <PageHeader
          title="ยุทธศาสตร์และสารสนเทศ"
          subtitle="ภาพรวมข้อมูลทะเบียนเกษตรกร พื้นที่การเกษตร ราคาสินค้าเกษตรและพลังงาน ศพก. และสภาพอากาศ/น้ำฝน"
          icon={PieChartOutlined}
        />
      )}

      {error ? (
        <Result
          status="warning"
          title="โหลดข้อมูลยุทธศาสตร์ไม่สำเร็จ"
          subTitle={error.message}
          extra={<Button onClick={refetch}>ลองใหม่</Button>}
        />
      ) : loading ? (
        <div
          style={{
            height: 400,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Spin size="large" tip="กำลังโหลดข้อมูล..." />
        </div>
      ) : (
        <>
          <section
            aria-label="สัญญาณภาพรวมกลุ่มยุทธศาสตร์"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              marginBottom: 20,
            }}
          >
            {[
              {
                label: 'ทะเบียนคืบหน้า',
                value: `${registry.percent}%`,
                note: `${formatNumber(registry.updated)} / ${formatNumber(registry.target)} ครัวเรือน`,
              },
              {
                label: 'วาดแปลง',
                value: `${geoplots.percent}%`,
                note: `${formatNumber(geoplots.drawn)} / ${formatNumber(geoplots.target)} แปลง`,
              },
              {
                label: 'พื้นที่เพาะปลูก',
                value: formatNumber(agriStats.totalPlanted),
                note: 'ไร่ รวมทุกชนิดพืช · ข้อมูลล่าสุด',
              },
              {
                label: 'ศพก.',
                value: formatNumber(learnStats.total),
                note: 'ศูนย์ในระบบ · ข้อมูลล่าสุด',
              },
              {
                label: 'ฝน 7 วัน',
                value: `${formatNumber(weather.rain7, 1)} mm`,
                note: `ล่าสุด ${formatDate(weather.latest?.date)}`,
              },
              {
                label: 'ราคาเกษตร',
                value: 'Live',
                note: 'ข้อมูลล่าสุดจากหน้าราคา',
              },
            ].map((item) => (
              <Card
                key={item.label}
                size="small"
                style={{ borderRadius: 12, border: '1px solid #e8ecf0' }}
                bodyStyle={{ padding: 14 }}
              >
                <div
                  style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    color: '#0f172a',
                    fontSize: 22,
                    fontWeight: 800,
                    marginTop: 2,
                  }}
                >
                  {item.value}
                </div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                  {item.note}
                </div>
              </Card>
            ))}
          </section>

          <section
            className="bento-container"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              display: 'grid',
              gap: 20,
              marginBottom: 24,
              gridTemplateAreas: 'none',
            }}
          >
            <CategoryBentoCard
              title="ทะเบียนเกษตรกร"
              icon="📋"
              totalLabel="ปีข้อมูล"
              totalCount={registry.activeYear || '-'}
              mainStatsTitle="ความคืบหน้าการปรับปรุงทะเบียน"
              mainStats={[
                {
                  label: 'เป้าหมาย',
                  value: formatNumber(registry.target),
                  colorType: 'blue',
                },
                {
                  label: 'ปรับปรุงแล้ว',
                  value: formatNumber(registry.updated),
                },
                {
                  label: 'คงเหลือ',
                  value:
                    registry.remaining === null
                      ? '-'
                      : formatNumber(registry.remaining),
                  colorType: registry.remaining > 0 ? 'red' : 'green',
                },
                {
                  label: 'พื้นที่ปรับปรุง',
                  value: `${formatNumber(registry.area, 1)} ไร่`,
                  colorType: 'blue',
                },
                {
                  label: 'ความคืบหน้ารวม',
                  value: `${registry.percent}%`,
                  isTotal: true,
                },
              ]}
            />

            <CategoryBentoCard
              title="การวาดผังแปลงเกษตรกรรมดิจิทัล"
              icon="🗺️"
              totalLabel="อัปเดตล่าสุด"
              totalCount={formatDate(geoplots.latestScrapedAt)}
              mainStatsTitle="ความก้าวหน้า GEOPLOTS รอบ 2/69"
              mainStats={[
                {
                  label: 'เป้าหมาย',
                  value: formatNumber(geoplots.target),
                  colorType: 'blue',
                },
                { label: 'วาดแล้ว', value: formatNumber(geoplots.drawn) },
                {
                  label: 'คงเหลือเป้า',
                  value: formatNumber(geoplots.remainingTarget),
                  colorType: geoplots.remainingTarget > 0 ? 'red' : 'green',
                },
                {
                  label: 'อำเภอช้าที่สุด',
                  value: geoplots.weakest
                    ? `${geoplots.weakest.name} ${formatNumber(geoplots.weakest.progress, 1)}%`
                    : '-',
                  colorType: 'red',
                },
                {
                  label: 'ความคืบหน้ารวม',
                  value: `${geoplots.percent}%`,
                  isTotal: true,
                },
              ]}
            />

            <CategoryBentoCard
              title="พื้นที่การเกษตร"
              icon="📍"
              mainStatsTitle="พื้นที่เพาะปลูกรายพืช (ไร่)"
              mainStats={[
                ...agriStats.topTypes.slice(0, 6).map(([label, value]) => ({
                  label,
                  value: formatNumber(value, 2),
                })),
                ...(agriStats.topTypes.length > 0
                  ? [
                      {
                        label: 'รวมพื้นที่เพาะปลูกทั้งหมด',
                        value: formatNumber(agriStats.totalPlanted, 2),
                        isTotal: true,
                      },
                    ]
                  : []),
              ]}
            />

            <LinkBentoCard
              title="ราคาสินค้าเกษตรและพลังงาน"
              icon="📈"
              description="ข้อมูลราคาจากกรมการค้าภายในและราคาน้ำมันบางจาก แยกไว้ที่หน้ารายละเอียดเพื่อให้ dashboard รวมโหลดไว"
              to="/dashboard/strategy/agricultural-prices"
              accent="#f57c00"
              stats={[
                { label: 'หมวดราคา', value: '5', highlight: true },
                { label: 'แหล่งข้อมูล', value: 'Live' },
                { label: 'น้ำมัน', value: 'บางจาก' },
                { label: 'สินค้า', value: 'MOC' },
              ]}
            />

            <CategoryBentoCard
              title="ศูนย์ ศพก."
              icon="🏫"
              totalLabel="ทั้งหมด"
              totalCount={`${learnStats.total} ศูนย์`}
              mainStatsTitle="เป้าหมาย/สินค้าหลัก (แห่ง)"
              mainStats={learnStats.topTypes.map(([label, value]) => ({
                label,
                value,
                colorType: 'blue',
              }))}
            />

            <CategoryBentoCard
              title="สภาพอากาศ/น้ำฝน"
              icon="🌧️"
              totalLabel="ล่าสุด"
              totalCount={formatDate(weather.latest?.date)}
              mainStatsTitle="สถานการณ์ฝนและอุณหภูมิ"
              mainStats={[
                {
                  label: 'ฝน 7 วัน',
                  value: `${formatNumber(weather.rain7, 1)} mm`,
                  colorType: 'blue',
                },
                {
                  label: 'ฝน 30 วัน',
                  value: `${formatNumber(weather.rain30, 1)} mm`,
                  colorType: 'blue',
                },
                {
                  label: 'วันฝนหนัก 30 วัน',
                  value: `${formatNumber(weather.heavyRainDays)} วัน`,
                  colorType: weather.heavyRainDays > 0 ? 'red' : 'green',
                },
                {
                  label: 'อุณหภูมิเฉลี่ย 7 วัน',
                  value: `${formatNumber(weather.avgTemp, 1)}°C`,
                  colorType: 'red',
                },
              ]}
            />
          </section>

          <Row gutter={[20, 20]}>
            <Col xs={24} lg={12}>
              <CategoryChartCard title="📋 ทะเบียนเกษตรกร: เป้าหมายเทียบกับผลปรับปรุงรายอำเภอ">
                {registryBarData.length > 0 ? (
                  <EChart
                    option={barOption(
                      registryBarData,
                      [
                        { key: 'target', name: 'เป้าหมาย' },
                        { key: 'updated', name: 'ปรับปรุงแล้ว' },
                        { key: 'remaining', name: 'คงเหลือ' },
                      ],
                      { unit: 'ครัวเรือน', compact: true }
                    )}
                  />
                ) : (
                  <EmptyChart label="ทะเบียนเกษตรกร" />
                )}
              </CategoryChartCard>
            </Col>

            <Col xs={24} lg={12}>
              <CategoryChartCard title="🗺️ การวาดผังแปลงเกษตรกรรมดิจิทัล: เป้าหมายเทียบวาดแล้วรายอำเภอ">
                {geoplots.rows.length > 0 ? (
                  <EChart
                    option={barOption(
                      geoplots.rows,
                      [
                        { key: 'target', name: 'เป้าหมาย' },
                        { key: 'drawn', name: 'วาดแล้ว' },
                        { key: 'remainingTarget', name: 'คงเหลือเป้า' },
                      ],
                      { unit: 'แปลง', compact: true }
                    )}
                  />
                ) : (
                  <EmptyChart label="การวาดผังแปลงเกษตรกรรมดิจิทัล" />
                )}
              </CategoryChartCard>
            </Col>

            <Col xs={24} lg={12}>
              <CategoryChartCard title="🌧️ น้ำฝนและอุณหภูมิย้อนหลัง 90 วัน">
                {weatherData.length > 0 ? (
                  <EChart
                    option={dualAxisOption(
                      weatherData,
                      [
                        {
                          key: 'prcp',
                          name: 'น้ำฝน',
                          color: WEATHER_COLORS[0],
                        },
                        {
                          key: 'tavg',
                          name: 'อุณหภูมิเฉลี่ย',
                          color: WEATHER_COLORS[1],
                        },
                      ],
                      { categoryKey: 'date' }
                    )}
                  />
                ) : (
                  <EmptyChart label="สภาพอากาศ/น้ำฝน" />
                )}
              </CategoryChartCard>
            </Col>

            <Col xs={24} lg={12}>
              <CategoryChartCard title="🌾 สัดส่วนพื้นที่การเกษตรตามชนิดพืช">
                {agriPie.length > 0 ? (
                  <EChart
                    option={pieOption(agriPie, {
                      unit: 'ไร่',
                      digits: 2,
                      center: ['42%', '50%'],
                      legend: 'right',
                    })}
                  />
                ) : (
                  <EmptyChart label="พื้นที่การเกษตร" />
                )}
              </CategoryChartCard>
            </Col>

            <Col xs={24} lg={12}>
              <CategoryChartCard title="🌾 พื้นที่การเกษตรรายอำเภอ (แยกชนิดพืช)">
                {agriBar.length > 0 ? (
                  <EChart
                    option={barOption(
                      agriBar,
                      agriCrops.map((crop) => ({
                        key: crop,
                        color: CROP_COLORS[crop] || '#cbd5e1',
                      })),
                      {
                        stacked: true,
                        unit: 'ไร่',
                        digits: 2,
                        totalKey: 'totalArea',
                        compact: true,
                      }
                    )}
                  />
                ) : (
                  <EmptyChart label="พื้นที่การเกษตร" />
                )}
              </CategoryChartCard>
            </Col>

            <Col xs={24} lg={12}>
              <CategoryChartCard title="🏫 สัดส่วน ศพก. แบ่งตามพืชหลัก">
                {learnPie.length > 0 ? (
                  <EChart
                    option={pieOption(learnPie, {
                      colors: LEARN_COLORS,
                      unit: 'ศูนย์',
                      center: ['42%', '50%'],
                      legend: 'right',
                    })}
                  />
                ) : (
                  <EmptyChart label="ศพก." />
                )}
              </CategoryChartCard>
            </Col>

            <Col xs={24} lg={12}>
              <CategoryChartCard title="🏫 จำนวนที่ตั้ง ศพก. แยกตามอำเภอ">
                {learnBar.length > 0 ? (
                  <EChart
                    option={barOption(
                      learnBar,
                      learnTypes.map((type, index) => ({
                        key: type,
                        color: LEARN_COLORS[index % LEARN_COLORS.length],
                      })),
                      {
                        stacked: true,
                        colors: LEARN_COLORS,
                        unit: 'ศูนย์',
                        totalKey: 'total',
                      }
                    )}
                  />
                ) : (
                  <EmptyChart label="ศพก." />
                )}
              </CategoryChartCard>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
