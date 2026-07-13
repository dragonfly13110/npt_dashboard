import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GlobalOutlined,
  UserOutlined,
  GroupOutlined,
  HomeOutlined,
  BankOutlined,
  CompassOutlined,
} from '@ant-design/icons';
import LandingKpiGrid from '../kpi/LandingKpiGrid';
import LandingKpiCard from '../kpi/LandingKpiCard';
import { useProvinceOverviewSummary } from '../../../hooks/landing/useLandingSummaries';

export default function ProvinceOverviewSection({ onOpenWidget }) {
  const { data, isLoading, error } = useProvinceOverviewSummary();
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    navigate(path);
  };

  const handleOpenWidget = (key) => {
    if (onOpenWidget) {
      onOpenWidget(key);
    }
  };

  return (
    <section
      className="landing-section province-overview-section"
      aria-label="ภาพรวมการเกษตรจังหวัดนครปฐม"
    >
      <div className="section-header-compact">
        <h2>📊 ภาพรวมการเกษตรจังหวัดนครปฐม</h2>
        <span className="section-subtitle">
          สถิติและข้อมูลสารสนเทศการเกษตรระดับจังหวัดปีล่าสุด
        </span>
      </div>

      <LandingKpiGrid>
        <LandingKpiCard
          id="agriArea"
          title="พื้นที่เกษตรกรรม"
          value={data?.agriArea?.value?.toLocaleString('th-TH')}
          unit={data?.agriArea?.unit}
          status="normal"
          secondaryText="พื้นที่เพาะปลูกพืชเศรษฐกิจรวม"
          sourceLabel="สำนักงานเกษตรจังหวัด"
          icon={<GlobalOutlined />}
          loading={isLoading}
          error={error}
          interactive={true}
          onClick={() => handleNavigate('/public/agricultural-areas')}
        />

        <LandingKpiCard
          id="farmerHouseholds"
          title="เกษตรกร/ครัวเรือน"
          value={data?.farmerHouseholds?.value?.toLocaleString('th-TH')}
          unit={data?.farmerHouseholds?.unit}
          status="normal"
          secondaryText="ครัวเรือนเกษตรกรที่ขึ้นทะเบียน"
          sourceLabel="กรมส่งเสริมการเกษตร"
          icon={<UserOutlined />}
          loading={isLoading}
          error={error}
          interactive={true}
          onClick={() => handleNavigate('/public/smart-farmers')}
        />

        <LandingKpiCard
          id="largePlots"
          title="กลุ่มแปลงใหญ่"
          value={data?.largePlots?.value?.toLocaleString('th-TH')}
          unit={data?.largePlots?.unit}
          status="normal"
          secondaryText="การรวมกลุ่มเกษตรกรแปลงใหญ่"
          sourceLabel="สำนักงานเกษตรจังหวัด"
          icon={<GroupOutlined />}
          loading={isLoading}
          error={error}
          interactive={true}
          onClick={() => handleNavigate('/public/large-plots')}
        />

        <LandingKpiCard
          id="communityEnterprises"
          title="วิสาหกิจชุมชน"
          value={data?.communityEnterprises?.value?.toLocaleString('th-TH')}
          unit={data?.communityEnterprises?.unit}
          status="normal"
          secondaryText="กลุ่มวิสาหกิจชุมชนจดทะเบียน"
          sourceLabel="กองส่งเสริมวิสาหกิจชุมชน"
          icon={<HomeOutlined />}
          loading={isLoading}
          error={error}
          interactive={true}
          onClick={() => handleNavigate('/public/community-enterprises')}
        />

        <LandingKpiCard
          id="farmerInstitutes"
          title="สถาบันเกษตรกร"
          value={data?.farmerInstitutes?.value?.toLocaleString('th-TH')}
          unit={data?.farmerInstitutes?.unit}
          status="normal"
          secondaryText="กลุ่มแม่บ้าน/กลุ่มอาชีพ/กลุ่มยุวเกษตรกร"
          sourceLabel="สำนักงานเกษตรจังหวัด"
          icon={<BankOutlined />}
          loading={isLoading}
          error={error}
          interactive={true}
          onClick={() => handleOpenWidget('farmerInstitutes')}
        />

        <LandingKpiCard
          id="agriTourism"
          title="แหล่งท่องเที่ยวเชิงเกษตร"
          value={data?.agriTourism?.value?.toLocaleString('th-TH')}
          unit={data?.agriTourism?.unit}
          status="normal"
          secondaryText="วิถีเกษตรและแหล่งเรียนรู้ชุมชน"
          sourceLabel="สำนักงานเกษตรจังหวัด"
          icon={<CompassOutlined />}
          loading={isLoading}
          error={error}
          interactive={true}
          onClick={() => handleNavigate('/public/agri-tourism')}
        />
      </LandingKpiGrid>
    </section>
  );
}
