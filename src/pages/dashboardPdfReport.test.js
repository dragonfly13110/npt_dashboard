import { describe, expect, it } from 'vitest';
import { buildDashboardPdfReportHtml } from './dashboardPdfReport';

describe('buildDashboardPdfReportHtml', () => {
  it('builds a structured printable report from dashboard data', () => {
    const html = buildDashboardPdfReportHtml({
      stats: [
        {
          label: 'พื้นที่การเกษตร <ทดสอบ>',
          group: 'กลุ่มยุทธศาสตร์',
          count: 10,
        },
        { label: 'แปลงใหญ่', group: 'กลุ่มผลิต', count: 5 },
      ],
      groupConfig: [
        {
          group: 'กลุ่มยุทธศาสตร์',
          tables: [{ table: 'agricultural_areas', label: 'พื้นที่การเกษตร' }],
        },
      ],
      districtStats: {
        เมืองนครปฐม: {
          house: 12,
          area: 200,
          lp: 2,
          ce: 3,
          sfSfCount: 1,
          ysfCount: 1,
          certGap: 4,
          fireCount: 0,
        },
      },
      agriStats: { crop_area: 200, households: 12 },
      lpStats: { total: 2, members: 20, area: 50 },
      instituteStats: { total: 7 },
      tourism: { count: 1 },
      agriPie: [{ name: 'ข้าวนาปี', value: 100 }],
      lpPie: [{ name: 'ข้าว', value: 2 }],
      visits: 283,
      generatedAt: new Date('2026-06-10T12:00:00+07:00'),
    });

    expect(html).toContain('<table>');
    expect(html).toContain('รายงานแดชบอร์ดรวมข้อมูลเกษตรจังหวัดนครปฐม');
    expect(html).toContain('พื้นที่การเกษตร &lt;ทดสอบ&gt;');
    expect(html).toContain('เมืองนครปฐม');
    expect(html).not.toContain('<canvas');
    expect(html).not.toContain('data:image');
  });
});
