import React from 'react';
import {
  CloudOutlined,
  EnvironmentOutlined,
  FireOutlined,
  BugOutlined,
} from '@ant-design/icons';
import LandingKpiGrid from '../kpi/LandingKpiGrid';
import LandingKpiCard from '../kpi/LandingKpiCard';
import {
  useWeatherSummary,
  useAirQualitySummary,
  useHotspotSummary,
  useDiseaseForecastSummary,
} from '../../../hooks/landing/useLandingSummaries';

export default function SituationKpiSection({ onOpenWidget }) {
  const weather = useWeatherSummary();
  const airQuality = useAirQualitySummary();
  const hotspot = useHotspotSummary();
  const disease = useDiseaseForecastSummary();

  const handleCardClick = (key) => {
    if (onOpenWidget) {
      onOpenWidget(key);
    }
  };

  return (
    <section
      className="landing-section situation-section"
      aria-label="สถานการณ์วันนี้"
    >
      <div className="section-header-compact">
        <h2>⚡ สถานการณ์วันนี้</h2>
        <span className="section-subtitle">
          อัปเดตข้อมูลสดรายวันประเมินความเสี่ยงรายชั่วโมง
        </span>
      </div>

      <LandingKpiGrid>
        <LandingKpiCard
          id="weather"
          title="สภาพอากาศ"
          value={weather.data?.value}
          unit={weather.data?.unit}
          status={weather.data?.status}
          statusLabel={weather.data?.statusLabel}
          secondaryText={weather.data?.secondaryText}
          updatedAt={weather.data?.updatedAt}
          sourceLabel={weather.data?.sourceLabel}
          icon={<CloudOutlined />}
          loading={weather.isLoading}
          error={weather.error}
          onClick={() => handleCardClick('weather')}
        />

        <LandingKpiCard
          id="airQuality"
          title="คุณภาพอากาศ (PM2.5)"
          value={airQuality.data?.value}
          unit={airQuality.data?.unit}
          status={airQuality.data?.status}
          statusLabel={airQuality.data?.statusLabel}
          secondaryText={airQuality.data?.secondaryText}
          updatedAt={airQuality.data?.updatedAt}
          sourceLabel={airQuality.data?.sourceLabel}
          icon={<EnvironmentOutlined />}
          loading={airQuality.isLoading}
          error={airQuality.error}
          onClick={() => handleCardClick('airQuality')}
        />

        <LandingKpiCard
          id="hotspots"
          title="จุดความร้อน (24 ชม.)"
          value={hotspot.data?.value}
          unit={hotspot.data?.unit}
          status={hotspot.data?.status}
          statusLabel={hotspot.data?.statusLabel}
          secondaryText={hotspot.data?.secondaryText}
          updatedAt={hotspot.data?.updatedAt}
          sourceLabel={hotspot.data?.sourceLabel}
          icon={<FireOutlined />}
          loading={hotspot.isLoading}
          error={hotspot.error}
          onClick={() => handleCardClick('hotspots')}
        />

        <LandingKpiCard
          id="diseaseForecast"
          title="เฝ้าระวังโรคและแมลง"
          value={disease.data?.value}
          unit={disease.data?.unit}
          status={disease.data?.status}
          statusLabel={disease.data?.statusLabel}
          secondaryText={disease.data?.secondaryText}
          updatedAt={disease.data?.updatedAt}
          sourceLabel={disease.data?.sourceLabel}
          icon={<BugOutlined />}
          loading={disease.isLoading}
          error={disease.error}
          onClick={() => handleCardClick('diseaseForecast')}
        />
      </LandingKpiGrid>
    </section>
  );
}
