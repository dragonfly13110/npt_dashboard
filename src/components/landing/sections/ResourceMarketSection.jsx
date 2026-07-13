import React from 'react';
import {
  DashboardOutlined,
  CloudOutlined,
  LineChartOutlined,
  CarOutlined,
} from '@ant-design/icons';
import LandingKpiGrid from '../kpi/LandingKpiGrid';
import LandingKpiCard from '../kpi/LandingKpiCard';
import {
  useSoilMoistureSummary,
  useReservoirSummary,
  useAgriPriceSummary,
  useOilPriceSummary,
} from '../../../hooks/landing/useLandingSummaries';

export default function ResourceMarketSection({ onOpenWidget }) {
  const soil = useSoilMoistureSummary();
  const reservoir = useReservoirSummary();
  const agriPrice = useAgriPriceSummary();
  const oilPrice = useOilPriceSummary();

  const handleCardClick = (key) => {
    if (onOpenWidget) {
      onOpenWidget(key);
    }
  };

  return (
    <section
      className="landing-section resource-market-section"
      aria-label="ดิน น้ำ ตลาด"
    >
      <div className="section-header-compact">
        <h2>🌍 ดิน น้ำ ตลาด</h2>
        <span className="section-subtitle">
          ทรัพยากรธรรมชาติและข้อมูลดัชนีราคาตลาดเศรษฐกิจ
        </span>
      </div>

      <LandingKpiGrid>
        <LandingKpiCard
          id="soilMoisture"
          title="ความชื้นดิน"
          value={soil.data?.value}
          unit={soil.data?.unit}
          status={soil.data?.status}
          statusLabel={soil.data?.statusLabel}
          secondaryText={soil.data?.secondaryText}
          updatedAt={soil.data?.updatedAt}
          sourceLabel={soil.data?.sourceLabel}
          icon={<DashboardOutlined />}
          loading={soil.isLoading}
          error={soil.error}
          onClick={() => handleCardClick('soilMoisture')}
        />

        <LandingKpiCard
          id="reservoir"
          title="สถานการณ์น้ำ"
          value={reservoir.data?.value}
          unit={reservoir.data?.unit}
          status={reservoir.data?.status}
          statusLabel={reservoir.data?.statusLabel}
          secondaryText={reservoir.data?.secondaryText}
          updatedAt={reservoir.data?.updatedAt}
          sourceLabel={reservoir.data?.sourceLabel}
          icon={<CloudOutlined />}
          loading={reservoir.isLoading}
          error={reservoir.error}
          onClick={() => handleCardClick('reservoir')}
        />

        <LandingKpiCard
          id="agriPrice"
          title="ราคาสินค้าเกษตร"
          value={agriPrice.data?.value}
          unit={agriPrice.data?.unit}
          status={agriPrice.data?.status}
          statusLabel={agriPrice.data?.statusLabel}
          secondaryText={agriPrice.data?.secondaryText}
          updatedAt={agriPrice.data?.updatedAt}
          sourceLabel={agriPrice.data?.sourceLabel}
          icon={<LineChartOutlined />}
          loading={agriPrice.isLoading}
          error={agriPrice.error}
          onClick={() => handleCardClick('prices')}
        />

        <LandingKpiCard
          id="oilPrice"
          title="ราคาพลังงาน"
          value={oilPrice.data?.value}
          unit={oilPrice.data?.unit}
          status={oilPrice.data?.status}
          statusLabel={oilPrice.data?.statusLabel}
          secondaryText={oilPrice.data?.secondaryText}
          updatedAt={oilPrice.data?.updatedAt}
          sourceLabel={oilPrice.data?.sourceLabel}
          icon={<CarOutlined />}
          loading={oilPrice.isLoading}
          error={oilPrice.error}
          onClick={() => handleCardClick('prices')}
        />
      </LandingKpiGrid>
    </section>
  );
}
