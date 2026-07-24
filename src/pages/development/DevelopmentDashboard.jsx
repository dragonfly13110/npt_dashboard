import { Link } from 'react-router-dom';
import { Row, Col, Spin, Card, Button, Result } from 'antd';
import { ArrowRightOutlined, PieChartOutlined } from '@ant-design/icons';
import EChart from '../../components/widgets/EChart';
import { barOption, pieOption } from '../../components/charts/echartOptions';
import { useDevelopmentData } from '../../hooks/useDevelopmentData';
import { LATEST_YEAR } from '../interactiveDashboard/filters';
import {
  PageHeader,
  CategoryBentoCard,
  CategoryChartCard,
} from '../../components/widgets/SharedDashboardUI';

const GROUP_COLORS = [
  '#0969da',
  '#8250df',
  '#1a7f37',
  '#bf8700',
  '#0ea5e9',
  '#cf222e',
];
const PEOPLE_COLORS = ['#10b981', '#f59e0b'];

const districtSeries = [
  { key: 'community', name: 'วิสาหกิจชุมชน', color: '#0969da' },
  { key: 'career', name: 'ส่งเสริมอาชีพ', color: '#8250df' },
  { key: 'housewife', name: 'แม่บ้าน', color: '#1a7f37' },
  { key: 'young', name: 'ยุวเกษตรกร', color: '#bf8700' },
  { key: 'tourism', name: 'ท่องเที่ยว', color: '#0ea5e9' },
  { key: 'disasters', name: 'ภัยพิบัติ', color: '#cf222e' },
];

const peopleSeries = [
  { key: 'sf', name: 'SF', color: PEOPLE_COLORS[0] },
  { key: 'ysf', name: 'YSF', color: PEOPLE_COLORS[1] },
];

const formatNumber = (value, digits = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return number.toLocaleString('th-TH', { maximumFractionDigits: digits });
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
  accent = '#0969da',
  showAction = true,
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
        {showAction && (
          <Link to={to} aria-label={`เปิดหน้า${title}`}>
            <Button shape="circle" icon={<ArrowRightOutlined />} />
          </Link>
        )}
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

export default function DevelopmentDashboard({
  embedded = false,
  filters = {},
  sharedRows = null,
}) {
  const {
    loading,
    error,
    refetch,
    yearSupported,
    ceStats,
    peopleStats,
    groupStats,
    fiStats,
    tourismStats,
    disasterStats,
    fiPie,
    groupComposition,
    districtStack,
    peopleDistrictStack,
    farmerInstTypes,
  } = useDevelopmentData(filters, { sharedRows });
  const latestOnly = (supported) =>
    filters.year && filters.year !== LATEST_YEAR && !supported
      ? ' · ข้อมูลล่าสุด'
      : '';
  const communityStatus = latestOnly(yearSupported.community_enterprises);
  const instituteStatus = latestOnly(yearSupported.farmer_institutes);
  const tourismStatus = latestOnly(yearSupported.agri_tourism);

  return (
    <div className={embedded ? 'embedded-dashboard' : undefined}>
      {!embedded && (
        <PageHeader
          title="กลุ่มส่งเสริมและพัฒนาเกษตรกร"
          subtitle="ภาพรวมวิสาหกิจชุมชน SF/YSF กลุ่มอาชีพ แม่บ้าน ยุวเกษตรกร สถาบันเกษตรกร ท่องเที่ยวเกษตร และภัยพิบัติ"
          icon={PieChartOutlined}
        />
      )}

      {error ? (
        <Result
          status="warning"
          title="โหลดข้อมูลกลุ่มพัฒนาไม่สำเร็จ"
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
            aria-label="สัญญาณภาพรวมกลุ่มส่งเสริมและพัฒนา"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              marginBottom: 20,
            }}
          >
            {[
              {
                label: `วิสาหกิจชุมชน${communityStatus}`,
                value: formatNumber(ceStats.total),
                note: 'แห่งในระบบ',
              },
              {
                label: 'SF / YSF',
                value: `${formatNumber(peopleStats.sfTotal)} / ${formatNumber(peopleStats.ysfTotal)}`,
                note: `ปี ${peopleStats.sfYear || '-'} / ${peopleStats.ysfYear || '-'}`,
              },
              {
                label: 'กลุ่มเกษตรกร',
                value: formatNumber(groupStats.totalGroups),
                note: `${formatNumber(groupStats.totalMembers)} สมาชิก`,
              },
              {
                label: `ท่องเที่ยวเกษตร${tourismStatus}`,
                value: formatNumber(tourismStats.total),
                note: 'แหล่งท่องเที่ยว',
              },
              {
                label: 'ภัยพิบัติ',
                value: formatNumber(disasterStats.total),
                note: `${formatNumber(disasterStats.damagedArea, 1)} ไร่เสียหาย`,
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
              title={`วิสาหกิจชุมชน${communityStatus}`}
              icon="🤝"
              totalLabel="ทั้งหมด"
              totalCount={`${formatNumber(ceStats.total)} แห่ง`}
              mainStatsTitle="จำนวนตามอำเภอ (แห่ง)"
              mainStats={ceStats.districts.map(([district, count]) => ({
                label: district,
                value: count,
                colorType: 'blue',
              }))}
            />

            <LinkBentoCard
              title="SF / YSF"
              icon="🧑‍🌾"
              description="เกษตรกรปราดเปรื่องและเกษตรกรรุ่นใหม่ แยกทะเบียนรายปี"
              to="/dashboard/development/smart-farmer-sf"
              accent="#10b981"
              showAction={!embedded}
              stats={[
                {
                  label: 'SF',
                  value: formatNumber(peopleStats.sfTotal),
                  highlight: true,
                },
                {
                  label: 'YSF',
                  value: formatNumber(peopleStats.ysfTotal),
                  highlight: true,
                },
                { label: 'ปี SF', value: peopleStats.sfYear || '-' },
                { label: 'ปี YSF', value: peopleStats.ysfYear || '-' },
              ]}
            />

            <CategoryBentoCard
              title={`สถาบันเกษตรกร${instituteStatus}`}
              icon="👥"
              totalLabel="ทั้งหมด"
              totalCount={`${formatNumber(fiStats.total)} กลุ่ม`}
              mainStatsTitle="ข้อมูลสมาชิก และประเภทกลุ่ม"
              mainStats={[
                {
                  label: 'วิสาหกิจฯ (กลุ่ม)',
                  value: formatNumber(fiStats.ce),
                  colorType: 'blue',
                },
                {
                  label: 'แม่บ้านฯ (กลุ่ม)',
                  value: formatNumber(fiStats.housewives),
                  colorType: 'green',
                },
                {
                  label: 'ยุวเกษตรฯ (กลุ่ม)',
                  value: formatNumber(fiStats.young_grp),
                  colorType: 'red',
                },
                {
                  label: 'ส่งเสริมอาชีพ (กลุ่ม)',
                  value: formatNumber(fiStats.career),
                  colorType: 'blue',
                },
                {
                  label: 'เกษตรกรทั่วไป (ราย)',
                  value: formatNumber(fiStats.village),
                  isTotal: true,
                },
                {
                  label: 'Smart Farmer (ราย)',
                  value: formatNumber(fiStats.sf),
                  isTotal: true,
                },
                {
                  label: 'YSF (ราย)',
                  value: formatNumber(fiStats.ysf),
                  isTotal: true,
                },
              ]}
            />

            <LinkBentoCard
              title="กลุ่มเกษตรกร"
              icon="🌱"
              description="กลุ่มส่งเสริมอาชีพ กลุ่มแม่บ้าน และกลุ่มยุวเกษตรกร"
              to="/dashboard/development/agricultural-career-groups"
              accent="#8250df"
              showAction={!embedded}
              stats={[
                {
                  label: 'ส่งเสริมอาชีพ',
                  value: formatNumber(groupStats.careerTotal),
                  highlight: true,
                },
                {
                  label: 'แม่บ้าน',
                  value: formatNumber(groupStats.housewifeTotal),
                },
                {
                  label: 'ยุวเกษตรกร',
                  value: formatNumber(groupStats.youngTotal),
                },
                {
                  label: 'สมาชิก',
                  value: formatNumber(groupStats.totalMembers),
                },
              ]}
            />

            <CategoryBentoCard
              title={
                tourismStatus
                  ? 'ท่องเที่ยวและภัยพิบัติ (ท่องเที่ยว: ข้อมูลล่าสุด)'
                  : 'ท่องเที่ยวและภัยพิบัติ'
              }
              icon="🗺️"
              totalLabel="ปีภัย"
              totalCount={disasterStats.year || '-'}
              mainStatsTitle="ข้อมูลเสริมในกลุ่มพัฒนา"
              mainStats={[
                {
                  label: 'แหล่งท่องเที่ยวเกษตร',
                  value: formatNumber(tourismStats.total),
                  colorType: 'blue',
                },
                {
                  label: 'เหตุภัยพิบัติ',
                  value: formatNumber(disasterStats.total),
                  colorType: disasterStats.total > 0 ? 'red' : 'green',
                },
                {
                  label: 'พื้นที่เสียหาย',
                  value: `${formatNumber(disasterStats.damagedArea, 1)} ไร่`,
                  colorType: 'red',
                },
                {
                  label: 'เกษตรกรกระทบ',
                  value: `${formatNumber(disasterStats.affectedFarmers)} ราย`,
                  colorType: 'red',
                },
              ]}
            />
          </section>

          <Row gutter={[20, 20]}>
            <Col xs={24} lg={12}>
              <CategoryChartCard
                title={
                  communityStatus || tourismStatus
                    ? 'ภาพรวมประเภทข้อมูลในกลุ่มพัฒนา (วิสาหกิจ/ท่องเที่ยว: ข้อมูลล่าสุด)'
                    : 'ภาพรวมประเภทข้อมูลในกลุ่มพัฒนา'
                }
              >
                {groupComposition.length > 0 ? (
                  <EChart
                    option={pieOption(groupComposition, {
                      colors: GROUP_COLORS,
                      unit: 'รายการ',
                      center: ['42%', '50%'],
                      legend: 'right',
                    })}
                  />
                ) : (
                  <EmptyChart label="ภาพรวมกลุ่มพัฒนา" />
                )}
              </CategoryChartCard>
            </Col>

            <Col xs={24} lg={12}>
              <CategoryChartCard
                title={
                  communityStatus || tourismStatus
                    ? 'ข้อมูลกลุ่มและเหตุการณ์แยกตามอำเภอ (วิสาหกิจ/ท่องเที่ยว: ข้อมูลล่าสุด)'
                    : 'ข้อมูลกลุ่มและเหตุการณ์แยกตามอำเภอ'
                }
              >
                {districtStack.length > 0 ? (
                  <EChart
                    option={barOption(districtStack, districtSeries, {
                      stacked: true,
                      colors: GROUP_COLORS,
                      unit: 'รายการ',
                      totalKey: 'total',
                    })}
                  />
                ) : (
                  <EmptyChart label="รายอำเภอ" />
                )}
              </CategoryChartCard>
            </Col>

            <Col xs={24} lg={12}>
              <CategoryChartCard title="SF / YSF แยกตามอำเภอ">
                {peopleDistrictStack.length > 0 ? (
                  <EChart
                    option={barOption(peopleDistrictStack, peopleSeries, {
                      stacked: false,
                      colors: PEOPLE_COLORS,
                      unit: 'ราย',
                      totalKey: 'total',
                    })}
                  />
                ) : (
                  <EmptyChart label="SF / YSF" />
                )}
              </CategoryChartCard>
            </Col>

            <Col xs={24} lg={12}>
              <CategoryChartCard
                title={`สัดส่วนประเภทกลุ่มสถาบันเกษตรกร${instituteStatus}`}
              >
                {fiPie.length > 0 ? (
                  <EChart
                    option={pieOption(fiPie, {
                      colors: farmerInstTypes.map((type) => type.color),
                      unit: 'กลุ่ม',
                      center: ['42%', '50%'],
                      legend: 'right',
                    })}
                  />
                ) : (
                  <EmptyChart label="สถาบันเกษตรกร" />
                )}
              </CategoryChartCard>
            </Col>

            <Col xs={24} lg={12}>
              <CategoryChartCard
                title={`แหล่งท่องเที่ยวเกษตรแยกตามอำเภอ${tourismStatus}`}
              >
                {tourismStats.byDistrict.length > 0 ? (
                  <EChart
                    option={barOption(
                      tourismStats.byDistrict,
                      [{ key: 'value', name: 'จำนวน', color: '#0ea5e9' }],
                      { colors: ['#0ea5e9'], unit: 'แห่ง' }
                    )}
                  />
                ) : (
                  <EmptyChart label="ท่องเที่ยวเกษตร" />
                )}
              </CategoryChartCard>
            </Col>

            <Col xs={24} lg={12}>
              <CategoryChartCard title="ภัยพิบัติแยกตามประเภท">
                {disasterStats.byType.length > 0 ? (
                  <EChart
                    option={barOption(
                      disasterStats.byType,
                      [{ key: 'value', name: 'จำนวน', color: '#cf222e' }],
                      { colors: ['#cf222e'], unit: 'เหตุการณ์' }
                    )}
                  />
                ) : (
                  <EmptyChart label="ภัยพิบัติ" />
                )}
              </CategoryChartCard>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
