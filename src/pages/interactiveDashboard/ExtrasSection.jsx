import { Alert, Button, Col, Row, Spin } from 'antd';
import { barOption } from '../../components/charts/echartOptions';
import {
  CategoryBentoCard,
  CategoryChartCard,
} from '../../components/widgets/SharedDashboardUI';
import EChart from '../../components/widgets/EChart';
import { useInteractiveExtrasData } from '../../hooks/useInteractiveExtrasData';

const UNAVAILABLE = 'ไม่พร้อมใช้งาน';
const LOAD_FAILED = 'โหลดไม่สำเร็จ';

function hasNumber(value) {
  return (
    value !== null && value !== undefined && Number.isFinite(Number(value))
  );
}

function formatMetric(value, unit, digits = 0) {
  return hasNumber(value)
    ? `${Number(value).toLocaleString('th-TH', {
        maximumFractionDigits: digits,
      })} ${unit}`
    : UNAVAILABLE;
}

function cardTitle(text) {
  return <h3 style={{ margin: 0, fontSize: 16 }}>{text}</h3>;
}

function SourceStatus({ children }) {
  return (
    <p className="module-status" style={{ margin: '0 0 8px' }}>
      {children}
    </p>
  );
}

export function ExtrasSection({ filters, enabled = true }) {
  const { loading, error, errors, refetch, tbk, rice, costs, forecast, soils } =
    useInteractiveExtrasData(filters, { enabled });
  const costSeries = [
    hasNumber(costs?.averageCostBaht) && {
      key: 'cost',
      name: 'ต้นทุนเฉลี่ย',
    },
    hasNumber(costs?.averageRevenueBahtPerRai) && {
      key: 'revenue',
      name: 'รายได้เฉลี่ย',
    },
  ].filter(Boolean);
  const soilCounts = soils
    ? [
        { name: 'ชุดดิน', value: soils.seriesCount },
        { name: 'กลุ่มดิน', value: soils.groupCount },
      ].filter((item) => hasNumber(item.value))
    : [];

  if (loading) {
    return (
      <div style={{ minHeight: 180, display: 'grid', placeItems: 'center' }}>
        <Spin tip="กำลังโหลดข้อมูลเพิ่มเติม..." />
      </div>
    );
  }

  return (
    <>
      {error && (
        <Alert
          type="warning"
          showIcon
          title="ข้อมูลบางส่วนไม่พร้อมใช้งาน"
          description={error.message}
          action={<Button onClick={refetch}>ลองใหม่</Button>}
          style={{ marginBottom: 16 }}
        />
      )}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={8}>
          <CategoryBentoCard
            title="พื้นที่ตาม ทบก."
            totalLabel={
              errors.tbk
                ? LOAD_FAILED
                : tbk
                  ? `ปี ${tbk.dataYear} · รอบ ${tbk.snapshotDate}`
                  : UNAVAILABLE
            }
            mainStatsTitle="สรุปพื้นที่เพาะปลูก"
            mainStats={
              tbk
                ? [
                    {
                      label: 'ครัวเรือน',
                      value: formatMetric(tbk.householdCount, 'ครัวเรือน'),
                    },
                    {
                      label: 'แปลง',
                      value: formatMetric(tbk.plotCount, 'แปลง'),
                    },
                    {
                      label: 'พื้นที่',
                      value: formatMetric(tbk.areaRai, 'ไร่', 2),
                      isTotal: true,
                    },
                  ]
                : []
            }
          />
        </Col>
        <Col xs={24} md={12} xl={8}>
          <CategoryBentoCard
            title="สถานการณ์เก็บเกี่ยวข้าว"
            totalLabel={
              errors.rice
                ? LOAD_FAILED
                : rice
                  ? `ปีเพาะปลูก ${rice.cropYear} · รอบ ${rice.snapshotDate}`
                  : UNAVAILABLE
            }
            mainStatsTitle="สรุปการเก็บเกี่ยว"
            mainStats={
              rice
                ? [
                    {
                      label: 'ครัวเรือน',
                      value: formatMetric(rice.householdCount, 'ครัวเรือน'),
                    },
                    {
                      label: 'แปลง',
                      value: formatMetric(rice.plotCount, 'แปลง'),
                    },
                    {
                      label: 'พื้นที่',
                      value: formatMetric(rice.areaRai, 'ไร่', 2),
                    },
                    {
                      label: 'ผลผลิตคาดการณ์',
                      value: formatMetric(rice.estimatedTons, 'ตัน', 2),
                      isTotal: true,
                    },
                  ]
                : []
            }
          />
        </Col>
        <Col xs={24} md={12} xl={8}>
          <CategoryChartCard title={cardTitle('ต้นทุนการผลิต')}>
            {costs ? (
              <>
                <SourceStatus>ปี {costs.dataYear}</SourceStatus>
                <EChart
                  style={{ height: 220 }}
                  option={barOption(
                    [
                      {
                        name: 'เฉลี่ยต่อไร่',
                        cost: costs.averageCostBaht,
                        revenue: costs.averageRevenueBahtPerRai,
                      },
                    ],
                    costSeries,
                    { unit: 'บาท/ไร่', digits: 0 }
                  )}
                />
                <div aria-label="ค่าต้นทุนการผลิตแบบข้อความ">
                  ต้นทุนเฉลี่ย {formatMetric(costs.averageCostBaht, 'บาท/ไร่')}{' '}
                  · รายได้เฉลี่ย{' '}
                  {formatMetric(costs.averageRevenueBahtPerRai, 'บาท/ไร่')} ·{' '}
                  {costs.cropCount.toLocaleString('th-TH')} ชนิดพืช
                </div>
              </>
            ) : (
              <SourceStatus>
                {errors.costs ? LOAD_FAILED : UNAVAILABLE}
              </SourceStatus>
            )}
          </CategoryChartCard>
        </Col>
        <Col xs={24} md={12} xl={8}>
          <CategoryBentoCard
            title="โรคและแมลง AI"
            totalLabel={
              errors.forecast
                ? LOAD_FAILED
                : forecast
                  ? `${forecast.status} · ${forecast.forecastDate}`
                  : UNAVAILABLE
            }
            mainStatsTitle="ระดับความเสี่ยง"
            mainStats={
              forecast
                ? [
                    {
                      label: 'ความเสี่ยงสูง',
                      value: formatMetric(forecast.high, 'รายการ'),
                      colorType: 'red',
                    },
                    {
                      label: 'ปานกลาง',
                      value: formatMetric(forecast.medium, 'รายการ'),
                    },
                    {
                      label: 'ต่ำ',
                      value: formatMetric(forecast.low, 'รายการ'),
                    },
                    {
                      label: 'ทั้งหมด',
                      value: formatMetric(forecast.total, 'รายการ'),
                      isTotal: true,
                    },
                  ]
                : []
            }
          />
        </Col>
        <Col xs={24} md={12} xl={8}>
          <CategoryChartCard title={cardTitle('ชุดดิน')}>
            {soils ? (
              <>
                <SourceStatus>{soils.status}</SourceStatus>
                <EChart
                  style={{ height: 220 }}
                  option={barOption(
                    soilCounts,
                    [{ key: 'value', name: 'จำนวน' }],
                    { unit: 'รายการ' }
                  )}
                />
                <div aria-label="ค่าชุดดินแบบข้อความ">
                  {formatMetric(soils.seriesCount, 'ชุดดิน')} ·{' '}
                  {formatMetric(soils.groupCount, 'กลุ่มดิน')} · พื้นที่{' '}
                  {formatMetric(soils.areaRai, 'ไร่', 2)}
                </div>
              </>
            ) : (
              <SourceStatus>
                {errors.soils ? LOAD_FAILED : UNAVAILABLE}
              </SourceStatus>
            )}
          </CategoryChartCard>
        </Col>
      </Row>
    </>
  );
}
