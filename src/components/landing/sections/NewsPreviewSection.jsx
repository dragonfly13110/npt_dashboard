import React, { Suspense, lazy } from 'react';
import NewsAccordion from '../../widgets/NewsAccordion';

const AgriGovNewsWidget = lazy(() => import('../../widgets/AgriGovNewsWidget'));
const AgriMediaNewsWidget = lazy(
  () => import('../../widgets/AgriMediaNewsWidget')
);

const WidgetSkeleton = () => (
  <div
    className="widget-skeleton"
    style={{
      padding: '20px',
      textAlign: 'center',
      background: '#f8fafc',
      borderRadius: '8px',
    }}
  >
    <span>กำลังโหลดข่าวสาร...</span>
  </div>
);

export default function NewsPreviewSection() {
  return (
    <section
      id="agri-news"
      className="landing-section news-section"
      aria-label="ข่าวสารล่าสุด"
    >
      <div className="section-header-compact">
        <h2>📰 ข่าวสารล่าสุด</h2>
        <span className="section-subtitle">
          ข่าวประชาสัมพันธ์และข่าวสารเกษตรจากหน่วยงานรัฐและสื่อมวลชน
        </span>
      </div>

      <NewsAccordion
        ariaLabel="ข่าวและประกาศด้านการเกษตร"
        sections={[
          {
            key: 'gov',
            title: 'ข่าวจากหน่วยงานภาครัฐ',
            description: 'กรมส่งเสริมการเกษตร • เกษตรจังหวัด • หน่วยงานวิชาการ',
            tone: 'gov',
            defaultOpen: true,
            renderContent: () => (
              <Suspense fallback={<WidgetSkeleton />}>
                <AgriGovNewsWidget />
              </Suspense>
            ),
          },
          {
            key: 'media',
            title: 'ข่าวเกษตรจากสื่อมวลชน',
            description: 'สำนักข่าวและสื่อเกษตรหลายแหล่ง',
            tone: 'media',
            renderContent: () => (
              <Suspense fallback={<WidgetSkeleton />}>
                <AgriMediaNewsWidget />
              </Suspense>
            ),
          },
        ]}
      />
    </section>
  );
}
