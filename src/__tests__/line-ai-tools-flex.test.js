import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { executeTools } from '../../netlify/functions/lib/line-ai/tools.js';
import {
  renderAiReply,
  validateLineMessages,
} from '../../netlify/functions/lib/line-ai/flex.js';

describe('LINE AI tools and rendering', () => {
  it('requires every specific search term to match the same record', () => {
    const sql = readFileSync('supabase/global_search.sql', 'utf8');
    expect(sql).toMatch(
      /NOT EXISTS \(SELECT 1 FROM unnest\(\$1::text\[\]\).*WHERE NOT \(%s\)\)/
    );
  });

  it('rejects unknown tools before DB access', async () => {
    const supabase = { rpc: vi.fn(), from: vi.fn() };
    await expect(executeTools(supabase, ['raw_sql'], ['x'])).rejects.toThrow(
      'Tool not allowed'
    );
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('does not query internal tables even if passed directly', async () => {
    const supabase = { rpc: vi.fn(), from: vi.fn() };

    await expect(
      executeTools(supabase, ['global_search'], ['ข้อมูล'], ['audit_logs'])
    ).resolves.toEqual([{ tool: 'global_search', data: [] }]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
  it('runs allowlisted tools successfully', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: [
        {
          table: 'large_plots',
          totalCount: 1,
          results: [{ id: '1', plot_name: 'สวนส้มโอสมชาย' }],
        },
      ],
      error: null,
    });
    const mockLimit = vi
      .fn()
      .mockReturnValue({ data: ['weather'], error: null });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ order: mockOrder }),
    });

    const supabase = {
      rpc: mockRpc,
      from: mockFrom,
    };

    const results = await executeTools(
      supabase,
      ['global_search', 'latest_weather'],
      ['ส้มโอ', 'สามพราน'],
      ['large_plots']
    );
    expect(results).toHaveLength(2);
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('global_search_public', {
      search_terms: ['ส้มโอ', 'สามพราน'],
      table_names: ['large_plots'],
      result_limit: 3,
    });
    expect(mockFrom).toHaveBeenCalledWith('daily_weather');
  });

  it('runs global_search tool successfully with empty search terms (browse mode)', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: [
        {
          table: 'housewife_farmer_groups',
          totalCount: 2,
          results: [{ id: '1', group_name: 'กลุ่มแม่บ้านเกษตรกรบางเลน' }],
        },
      ],
      error: null,
    });
    const supabase = {
      rpc: mockRpc,
    };

    const results = await executeTools(
      supabase,
      ['global_search'],
      [],
      ['housewife_farmer_groups']
    );
    expect(results).toHaveLength(1);
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('global_search_public', {
      search_terms: [],
      table_names: ['housewife_farmer_groups'],
      result_limit: 3,
    });
    expect(results[0].data).toEqual([
      {
        table: 'housewife_farmer_groups',
        totalCount: 2,
        results: [{ id: '1', group_name: 'กลุ่มแม่บ้านเกษตรกรบางเลน' }],
      },
    ]);
  });

  it('counts personnel by province, district, or every district without returning arbitrary names', async () => {
    const rows = [
      { district: '-', office_type: 'Provincial', position: 'นักวิชาการ' },
      { district: '-', office_type: 'Provincial', position: 'สำนักงาน' },
      { district: 'สามพราน', office_type: 'District', position: 'นักวิชาการ' },
      { district: 'สามพราน', office_type: 'District', position: 'ธุรการ' },
      { district: 'สามพราน', office_type: 'District', position: 'สำนักงาน' },
      {
        district: 'เมืองนครปฐม',
        office_type: 'District',
        position: 'นักวิชาการ',
      },
    ];
    const neq = vi.fn().mockResolvedValue({ data: rows, error: null });
    const select = vi.fn().mockReturnValue({ neq });
    const supabase = { from: vi.fn().mockReturnValue({ select }) };

    const province = await executeTools(
      supabase,
      ['personnel_summary'],
      [],
      ['personnel'],
      { personnelScope: 'province' }
    );
    const district = await executeTools(
      supabase,
      ['personnel_summary'],
      [],
      ['personnel'],
      { personnelScope: 'district', district: 'สามพราน' }
    );
    const breakdown = await executeTools(
      supabase,
      ['personnel_summary'],
      [],
      ['personnel'],
      { personnelScope: 'district_breakdown' }
    );
    const provincialOffice = await executeTools(
      supabase,
      ['personnel_summary'],
      [],
      ['personnel'],
      { personnelScope: 'provincial_office' }
    );

    expect(province[0].data).toEqual({ scope: 'province', total: 4 });
    expect(provincialOffice[0].data).toEqual({
      scope: 'provincial_office',
      total: 1,
    });
    expect(district[0].data).toEqual({
      scope: 'district',
      district: 'สามพราน',
      total: 2,
    });
    expect(breakdown[0].data).toEqual({
      scope: 'district_breakdown',
      total: 3,
      breakdown: [
        { district: 'เมืองนครปฐม', count: 1 },
        { district: 'สามพราน', count: 2 },
      ],
    });
  });

  it('summarizes farmer groups by district and subdistrict with fallback metadata', async () => {
    const farmerRows = [
      {
        district: 'บางเลน',
        total_groups: 9,
        community_enterprise_groups: 4,
        housewives_groups: 2,
        young_farmer_groups: 3,
        career_promotion_groups: 0,
      },
    ];
    const youngRows = [
      {
        id: 'yfg-1',
        group_name: 'กลุ่มยุวเกษตรบางช้าง',
        district: 'บางเลน',
        subdistrict: 'บางช้าง',
        member_count: 20,
        data_year: 2568,
      },
      {
        id: 'yfg-2',
        group_name: 'กลุ่มยุวเกษตรบางปลา',
        district: 'บางเลน',
        subdistrict: 'บางปลา',
        member_count: 15,
        data_year: 2568,
      },
    ];
    const makeQuery = (rows) => ({
      eq: vi.fn(function (field, value) {
        return makeQuery(rows.filter((row) => row[field] === value));
      }),
      order: vi.fn(function () {
        return this;
      }),
      then(resolve) {
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      },
    });
    const supabase = {
      from: vi.fn((table) => ({
        select: vi.fn(() =>
          makeQuery(table === 'farmer_institutes' ? farmerRows : youngRows)
        ),
      })),
    };

    const district = await executeTools(
      supabase,
      ['area_summary'],
      [],
      ['young_farmer_groups_detailed'],
      {
        areaScope: 'district',
        district: 'บางเลน',
        farmerGroupType: 'young_farmer',
      }
    );
    const subdistrict = await executeTools(
      supabase,
      ['area_summary'],
      [],
      ['young_farmer_groups_detailed'],
      {
        areaScope: 'subdistrict',
        district: 'บางเลน',
        subdistrict: 'บางช้าง',
        farmerGroupType: 'young_farmer',
      }
    );
    const fallback = await executeTools(
      supabase,
      ['area_summary'],
      [],
      ['young_farmer_groups_detailed'],
      {
        areaScope: 'subdistrict',
        district: 'บางเลน',
        subdistrict: 'ไม่พบ',
        farmerGroupType: 'young_farmer',
      }
    );

    expect(district[0].data).toMatchObject({
      coverage: 'district',
      district: 'บางเลน',
      total: 3,
      url: 'https://npt-dashboard.netlify.app/dashboard/development/young-farmer-groups',
    });
    expect(subdistrict[0].data).toMatchObject({
      coverage: 'subdistrict',
      district: 'บางเลน',
      subdistrict: 'บางช้าง',
      total: 1,
    });
    expect(fallback[0].data).toMatchObject({
      coverage: 'district_fallback',
      district: 'บางเลน',
      requestedSubdistrict: 'ไม่พบ',
      total: 3,
    });
  });

  it('searches farmer group records by subdistrict and returns grouped dashboard links', async () => {
    const rowsByTable = {
      community_enterprises: [
        {
          id: 'ce-1',
          enterprise_name: 'วิสาหกิจชุมชนบางช้าง',
          district: 'บางเลน',
          subdistrict: 'บางช้าง',
          member_count: 12,
        },
      ],
      housewife_farmer_groups: [],
      young_farmer_groups_detailed: [
        {
          id: 'yfg-1',
          group_name: 'กลุ่มยุวเกษตรบางช้าง',
          district: 'บางเลน',
          subdistrict: 'บางช้าง',
          member_count: 20,
        },
      ],
      agricultural_career_groups: [],
    };
    const makeQuery = (rows) => ({
      eq: vi.fn(function (field, value) {
        return makeQuery(rows.filter((row) => row[field] === value));
      }),
      order: vi.fn(function () {
        return this;
      }),
      limit: vi.fn(function () {
        return this;
      }),
      then(resolve) {
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      },
    });
    const supabase = {
      from: vi.fn((table) => ({
        select: vi.fn(() => makeQuery(rowsByTable[table] || [])),
      })),
    };

    const result = await executeTools(supabase, ['area_search'], [], [], {
      areaScope: 'subdistrict',
      district: 'บางเลน',
      subdistrict: 'บางช้าง',
      farmerGroupType: 'all',
    });

    expect(result[0].data).toMatchObject({
      coverage: 'subdistrict',
      district: 'บางเลน',
      subdistrict: 'บางช้าง',
      total: 2,
    });
    expect(result[0].data.categories).toEqual([
      expect.objectContaining({
        table: 'community_enterprises',
        totalCount: 1,
        url: 'https://npt-dashboard.netlify.app/dashboard/development/community-enterprises',
      }),
      expect.objectContaining({
        table: 'young_farmer_groups_detailed',
        totalCount: 1,
        url: 'https://npt-dashboard.netlify.app/dashboard/development/young-farmer-groups',
      }),
    ]);
  });

  it('filters the latest disease forecast by effective crop', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        forecast_date: '2026-06-23',
        summary: 'จังหวัดมีฝนต่อเนื่อง',
        details: [
          {
            name: 'โรคไหม้ข้าว',
            type: 'โรคพืช',
            target_crop: 'ข้าว',
            risk_level: 'สูง',
            description: 'ความชื้นสูง',
            prevention: 'ตรวจแปลง',
          },
          {
            name: 'โรคเน่าดำกล้วยไม้',
            type: 'โรคพืช',
            target_crop: 'กล้วยไม้',
            risk_level: 'สูง',
          },
        ],
      },
      error: null,
    });
    const limit = vi.fn().mockReturnValue({ maybeSingle });
    const order = vi.fn().mockReturnValue({ limit });
    const select = vi.fn().mockReturnValue({ order });
    const supabase = { from: vi.fn().mockReturnValue({ select }) };

    const result = await executeTools(supabase, ['disease_forecast'], [], [], {
      crop: 'ข้าว',
      district: 'สามพราน',
    });

    expect(supabase.from).toHaveBeenCalledWith('ai_disease_forecasts');
    expect(select).toHaveBeenCalledWith('forecast_date,summary,details');
    expect(order).toHaveBeenCalledWith('forecast_date', { ascending: false });
    expect(result[0].data).toMatchObject({
      forecastDate: '2026-06-23',
      district: 'สามพราน',
      scope: 'province',
      risks: [
        expect.objectContaining({
          name: 'โรคไหม้ข้าว',
          target_crop: 'ข้าว',
          risk_level: 'สูง',
        }),
      ],
    });
    expect(result[0].data.risks).toHaveLength(1);
  });
  it('uses contents, never bubbles, for Flex carousel', () => {
    const messages = renderAiReply({
      text: 'พบข้อมูล',
      records: [
        {
          title: 'ส้มโอ',
          subtitle: 'สามพราน',
          url: 'https://npt-dashboard.netlify.app/dashboard',
        },
      ],
    });
    const message = messages.find((m) => m.type === 'flex');
    expect(message).toBeDefined();
    expect(message.contents).toEqual(
      expect.objectContaining({ type: 'carousel', contents: expect.any(Array) })
    );
    expect(message.contents).not.toHaveProperty('bubbles');
  });

  it('caps Flex preview at 3 cards and shows total count', () => {
    const messages = renderAiReply({
      text: 'พบแปลงใหญ่ 50 แห่ง',
      records: Array.from({ length: 5 }, (_, index) => ({
        title: 'แปลง ' + (index + 1),
        subtitle: 'นครปฐม',
        totalCount: 50,
        url: 'https://npt-dashboard.netlify.app/dashboard/production/large-plots',
      })),
    });

    const bubbles = messages.find((message) => message.type === 'flex').contents
      .contents;
    expect(bubbles).toHaveLength(3);
    expect(bubbles[0].footer.contents[0].action.label).toBe(
      'ดูทั้งหมด 50 รายการ'
    );
  });

  it('renders cited external source cards with safe HTTPS links', () => {
    const messages = renderAiReply({
      text: 'ไม่พบข้อมูลนี้ในระบบ คำตอบต่อไปนี้ค้นจากอินเทอร์เน็ต',
      sources: [{ title: 'แหล่งข้อมูล', url: 'https://example.com/source' }],
    });
    const carousel = messages.find((message) => message.type === 'flex');
    expect(carousel.contents.contents[0].footer.contents[0].action.uri).toBe(
      'https://example.com/source'
    );
    expect(carousel.contents.contents[0].footer.contents[0].action.label).toBe(
      'เปิดแหล่งข้อมูล'
    );
  });
  it('returns text reply when no records are provided', () => {
    const result = renderAiReply({ text: 'ไม่พบข้อมูล' });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: 'text',
      text: 'ไม่พบข้อมูล',
    });
  });

  it('validates correct LINE messages', () => {
    const valid = [
      { type: 'text', text: 'สวัสดี' },
      {
        type: 'flex',
        altText: 'พบข้อมูล',
        contents: {
          type: 'carousel',
          contents: [],
        },
      },
    ];
    expect(() => validateLineMessages(valid)).not.toThrow();
  });

  it('throws validation error on invalid message structures', () => {
    expect(() => validateLineMessages([])).toThrow(
      'LINE messages count must be between 1'
    );
    expect(() => validateLineMessages([{ type: 'invalid' }])).toThrow(
      'Unsupported message type'
    );
    expect(() =>
      validateLineMessages([{ type: 'flex', altText: 'x' }])
    ).toThrow('Flex message requires contents object');
    expect(() =>
      validateLineMessages([
        {
          type: 'flex',
          altText: 'x',
          contents: { type: 'carousel', bubbles: [] },
        },
      ])
    ).toThrow('Flex contents must not have a bubbles property');
    expect(() =>
      validateLineMessages([
        { type: 'flex', altText: 'x', contents: { type: 'carousel' } },
      ])
    ).toThrow('Carousel Flex message must have a contents array');
    expect(() =>
      validateLineMessages([
        { type: 'flex', bubbles: {}, altText: 'x', contents: {} },
      ])
    ).toThrow('Flex message must not have bubbles property on the top level');
  });
});
