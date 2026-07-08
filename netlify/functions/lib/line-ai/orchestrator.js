import crypto from 'node:crypto';
import datasetCatalog from '../../../../src/domain/datasetCatalog.json' with { type: 'json' };
const { TABLE_ROUTES } = datasetCatalog;

const TABLE_METADATA = {
  personnel: {
    label: 'บุคลากรเกษตร',
    icon: '👤',
    getDisplay: (row) => ({
      title: row.full_name,
      subtitle: `${row.position || 'ไม่ระบุตำแหน่ง'} • ${row.department || '-'}`,
      info: row.phone ? `📞 ${row.phone}` : '',
    }),
  },
  farmer_registry: {
    label: 'ทะเบียนเกษตรกร',
    icon: '📋',
    getDisplay: (row) => ({
      title: row.main_crop
        ? `ทะเบียนเกษตรกรผู้ปลูก${row.main_crop}`
        : 'ทะเบียนเกษตรกร',
      subtitle: `อ.${row.district || '-'} • ${row.household_count || 0} ครัวเรือน`,
      info: row.farm_area_rai ? `พื้นที่: ${row.farm_area_rai} ไร่` : '',
    }),
  },
  agricultural_areas: {
    label: 'พื้นที่การเกษตร',
    icon: '🌾',
    getDisplay: (row) => ({
      title: row.area_name || row.area_type || 'พื้นที่การเกษตร',
      subtitle: `อ.${row.district || '-'} ต.${row.subdistrict || '-'}`,
      info: row.total_area_rai
        ? `พื้นที่ทั้งหมด: ${row.total_area_rai} ไร่`
        : '',
    }),
  },
  learning_centers: {
    label: 'ศูนย์เรียนรู้ (ศพก.)',
    icon: '🏫',
    getDisplay: (row) => ({
      title: row.center_name,
      subtitle: `อ.${row.district || '-'} • ผู้จัดการ: ${row.manager || '-'}`,
      info: row.main_crop ? `พืชหลัก: ${row.main_crop}` : '',
    }),
  },
  daily_weather: {
    label: 'สภาพอากาศ/น้ำฝน',
    icon: '🌧️',
    getDisplay: (row) => ({
      title: `สภาพอากาศ อ.${row.district || '-'}`,
      subtitle: `อุณหภูมิ: ${row.temperature_c || '-'} °C • ฝน: ${row.rainfall_mm || 0} มม.`,
      info: row.record_date ? `วันที่: ${row.record_date}` : '',
    }),
  },
  large_plots: {
    label: 'แปลงใหญ่',
    icon: '🌿',
    getDisplay: (row) => ({
      title: row.plot_name || `แปลงใหญ่${row.commodity || ''}`,
      subtitle: `อ.${row.district || '-'} • สมาชิก: ${row.member_count || 0} ราย`,
      info: row.area_rai ? `พื้นที่: ${row.area_rai} ไร่` : '',
    }),
  },
  certifications: {
    label: 'มาตรฐาน GAP',
    icon: '✅',
    getDisplay: (row) => ({
      title: row.farm_name || 'สวนเกษตรมาตรฐาน GAP',
      subtitle: `อ.${row.district || '-'} • ${row.cert_type || ''} (${row.status || ''})`,
      info: row.commodity ? `พืช: ${row.commodity}` : '',
    }),
  },
  crop_production: {
    label: 'ผลผลิตพืช',
    icon: '🌽',
    getDisplay: (row) => ({
      title: `ผลผลิต${row.crop_name || ''}`,
      subtitle: `อ.${row.district || '-'} • ผลผลิต: ${row.production_ton || 0} ตัน`,
      info: row.planted_area ? `พื้นที่ปลูก: ${row.planted_area} ไร่` : '',
    }),
  },
  production_costs: {
    label: 'ต้นทุนการผลิต',
    icon: '💰',
    getDisplay: (row) => ({
      title: `ต้นทุนการผลิต${row.crop_name || ''}`,
      subtitle: `ปี ${row.data_year || '-'} • ต้นทุน: ${row.total_cost_baht || 0} บาท/ไร่`,
      info: row.revenue_baht_per_rai
        ? `มูลค่าเฉลี่ย: ${row.revenue_baht_per_rai} บาท/ไร่`
        : '',
    }),
  },
  community_enterprises: {
    label: 'วิสาหกิจชุมชน',
    icon: '🏪',
    getDisplay: (row) => ({
      title: row.enterprise_name,
      subtitle: `อ.${row.district || '-'} • ${row.enterprise_type || ''}`,
      info: row.member_count ? `สมาชิก: ${row.member_count} คน` : '',
    }),
  },
  smart_farmers: {
    label: 'เกษตรกรรุ่นใหม่',
    icon: '👨‍🌾',
    getDisplay: (row) => ({
      title: row.full_name,
      subtitle: `อ.${row.district || '-'} • ประเภท: ${row.farmer_type || ''}`,
      info: row.main_product ? `พืชหลัก: ${row.main_product}` : '',
    }),
  },
  smart_farmer_sf: {
    label: 'เกษตรกรปราดเปรื่อง (SF)',
    icon: '🧑‍🌾',
    getDisplay: (row) => ({
      title: row.full_name,
      subtitle: `อ.${row.district || '-'} • สถานะ: ${row.farmer_status || ''}`,
      info: row.agricultural_activity
        ? `กิจกรรม: ${row.agricultural_activity}`
        : '',
    }),
  },
  young_smart_farmer_ysf: {
    label: 'เกษตรกรรุ่นใหม่ (YSF)',
    icon: '🌾',
    getDisplay: (row) => ({
      title: row.full_name,
      subtitle: `อ.${row.district || '-'} • สถานะ: ${row.farmer_status || ''}`,
      info: row.agricultural_activity
        ? `กิจกรรม: ${row.agricultural_activity}`
        : '',
    }),
  },
  agricultural_career_groups: {
    label: 'กลุ่มส่งเสริมอาชีพการเกษตร',
    icon: '🌿',
    getDisplay: (row) => ({
      title: row.group_name,
      subtitle: `อ.${row.district || '-'} • กิจกรรมหลัก: ${row.main_activity || ''}`,
      info: row.member_count ? `สมาชิก: ${row.member_count} ราย` : '',
    }),
  },
  housewife_farmer_groups: {
    label: 'กลุ่มแม่บ้านเกษตรกร',
    icon: '👩‍🌾',
    getDisplay: (row) => ({
      title: row.group_name,
      subtitle: `อ.${row.district || '-'} • กิจกรรม: ${row.activity || ''}`,
      info: row.member_count ? `สมาชิก: ${row.member_count} ราย` : '',
    }),
  },
  young_farmer_groups_detailed: {
    label: 'กลุ่มยุวเกษตรกร',
    icon: '🌱',
    getDisplay: (row) => ({
      title: row.group_name,
      subtitle: `อ.${row.district || '-'} • กิจกรรม: ${row.activity || ''}`,
      info: row.member_count ? `สมาชิก: ${row.member_count} ราย` : '',
    }),
  },
  farmer_institutes: {
    label: 'สถาบันเกษตรกร',
    icon: '🤝',
    getDisplay: (row) => ({
      title: row.name || row.group_name || 'สถาบันเกษตรกร',
      subtitle: `อ.${row.district || '-'} • ประเภท: ${row.type || ''}`,
      info: row.member_count ? `สมาชิก: ${row.member_count} คน` : '',
    }),
  },
  agri_tourism: {
    label: 'ท่องเที่ยวเกษตร',
    icon: '🏕️',
    getDisplay: (row) => ({
      title: row.spot_name,
      subtitle: `อ.${row.district || '-'} • ประเภท: ${row.spot_type || ''}`,
      info: row.contact_person ? `ติดต่อ: ${row.contact_person}` : '',
    }),
  },
  disasters: {
    label: 'ภัยพิบัติ',
    icon: '⛈️',
    getDisplay: (row) => ({
      title: row.disaster_type,
      subtitle: `อ.${row.district || '-'} ต.${row.subdistrict || '-'}`,
      info:
        row.affected_area_rai || row.damaged_area
          ? `เสียหาย: ${row.affected_area_rai || row.damaged_area} ไร่`
          : '',
    }),
  },
  forecast_plots: {
    label: 'แปลงพยากรณ์',
    icon: '🔬',
    getDisplay: (row) => ({
      title: row.plot_name || 'แปลงพยากรณ์',
      subtitle: `อ.${row.district || '-'} • เจ้าของ: ${row.owner_name || ''}`,
      info: row.crop_type ? `พืช: ${row.crop_type} (${row.variety || ''})` : '',
    }),
  },
  ai_disease_forecasts: {
    label: 'พยากรณ์โรค & แมลง',
    icon: '🤖',
    getDisplay: (row) => ({
      title: row.name,
      subtitle: `พืชเป้าหมาย: ${row.target_crop || ''}`,
      info: `ระดับความเสี่ยง: ${row.risk_level || ''}`,
    }),
  },
  pest_centers: {
    label: 'ศจช. (ศัตรูพืชชุมชน)',
    icon: '🏥',
    getDisplay: (row) => ({
      title: row.center_name,
      subtitle: `อ.${row.district || '-'} • ประธาน: ${row.chairman || ''}`,
      info: row.main_crop_type ? `พืชหลัก: ${row.main_crop_type}` : '',
    }),
  },
  plant_doctors: {
    label: 'หมอพืช',
    icon: '🩺',
    getDisplay: (row) => ({
      title: row.full_name,
      subtitle: `อ.${row.district || '-'} ต.${row.subdistrict || '-'}`,
      info: 'หมอพืชชุมชนประจำจังหวัดนครปฐม',
    }),
  },
  soil_fertilizer_centers: {
    label: 'ศดปช. (ดินปุ๋ยชุมชน)',
    icon: '🧪',
    getDisplay: (row) => ({
      title: row.center_name,
      subtitle: `อ.${row.district || '-'} • ประธาน: ${row.chairman || ''}`,
      info: row.main_crop_type ? `พืชหลัก: ${row.main_crop_type}` : '',
    }),
  },
  soil_series: {
    label: 'ชุดดิน',
    icon: '🧪',
    getDisplay: (row) => ({
      title: row.soil_series_name || 'ชุดดิน',
      subtitle: `อ.${row.district || '-'} • กลุ่มชุดดิน ${row.soil_group || '-'}`,
      info: row.area_rai
        ? `พื้นที่: ${Number(row.area_rai).toLocaleString('th-TH')} ไร่`
        : row.texture || '',
    }),
  },
  fire_hotspots: {
    label: 'จุดเฝ้าระวัง PM2.5',
    icon: '🔥',
    getDisplay: (row) => ({
      title: row.spot_name || 'จุดความร้อนไฟป่า',
      subtitle: `อ.${row.district || '-'} • ระดับความเสี่ยง: ${row.risk_level || ''}`,
      info: row.year ? `ปี: ${row.year}` : '',
    }),
  },
  budgets: {
    label: 'งบประมาณ',
    icon: '💰',
    getDisplay: (row) => {
      let projName = row.project_name;
      let budgetSource = row.budget_source;
      let budgetAmount = row.budget_amount;
      if (row.notes) {
        try {
          const parsed = JSON.parse(row.notes);
          if (parsed && typeof parsed === 'object') {
            projName =
              [parsed.project, parsed.activity].filter(Boolean).join(' / ') ||
              projName;
            budgetSource = parsed.plan || budgetSource;
            budgetAmount = parsed.budget || budgetAmount;
          }
        } catch (e) {}
      }
      return {
        title: projName || 'โครงการงบประมาณ',
        subtitle: `แหล่งงบ: ${budgetSource || ''} • สถานะ: ${row.status || ''}`,
        info: budgetAmount
          ? `งบประมาณ: ${Number(budgetAmount).toLocaleString('th-TH')} บาท`
          : '',
      };
    },
  },
  assets: {
    label: 'ครุภัณฑ์/ทรัพย์สิน',
    icon: '📦',
    getDisplay: (row) => ({
      title: row.name || row.kind || 'ครุภัณฑ์',
      subtitle: `หมวดหมู่: ${row.category || '-'} • ปีงบ: ${row.fiscal_year || row.fiscalYear || '-'} • หน่วยงาน: ${row.assigned_to || row.assignedTo || '-'}`,
      info: row.value
        ? `มูลค่า: ${Number(row.value).toLocaleString('th-TH')} บาท`
        : '',
    }),
  },
  geoplots_parcel_progress: {
    label: 'ความก้าวหน้าการวาดแปลงรายอำเภอ',
    icon: '🗺️',
    getDisplay: (row) => ({
      title: `ความก้าวหน้า อ.${row.district}`,
      subtitle: `วาดแล้ว: ${row.drawn_plots || 0} / เป้าหมาย: ${row.target_plots || 0} แปลง`,
      info: row.progress_percent ? `ความคืบหน้า: ${row.progress_percent}%` : '',
    }),
  },
  geoplots_parcel_subdistrict_progress: {
    label: 'ความก้าวหน้าการวาดแปลงรายตำบล',
    icon: '🗺️',
    getDisplay: (row) => ({
      title: `ความก้าวหน้า ต.${row.subdistrict} (อ.${row.district})`,
      subtitle: `วาดแล้ว: ${row.drawn_plots || 0} / เป้าหมาย: ${row.target_plots || 0} แปลง`,
      info: row.progress_percent ? `ความคืบหน้า: ${row.progress_percent}%` : '',
    }),
  },
};

function formatDeterministicSummary(toolResults, queryText = '') {
  const records = [];
  const q = (queryText || '').toLowerCase();

  for (const tr of toolResults || []) {
    if (tr.tool === 'global_search') {
      let categories = tr.data || [];

      // Filter categories by query keywords if queryText is provided
      if (q) {
        let allowedTables = null;
        if (
          q.includes('ชุดดิน') ||
          q.includes('กลุ่มชุดดิน') ||
          q.includes('เนื้อดิน') ||
          q.includes('ดินเหนียว') ||
          q.includes('ดินร่วน') ||
          q.includes('ความอุดมสมบูรณ์') ||
          q.includes('ph')
        ) {
          allowedTables = ['soil_series'];
        } else if (
          q.includes('พื้นที่') ||
          q.includes('ปลูก') ||
          q.includes('ขนาด') ||
          q.includes('ไร่') ||
          q.includes('ตารางเมตร')
        ) {
          allowedTables = [
            'agricultural_areas',
            'large_plots',
            'farmer_registry',
            'crop_production',
            'production_costs',
            'certifications',
            'forecast_plots',
            'disasters',
            'geoplots_parcel_progress',
            'geoplots_parcel_subdistrict_progress',
          ];
        } else if (
          q.includes('วิสาหกิจ') ||
          q.includes('กลุ่ม') ||
          q.includes('สมาคม') ||
          q.includes('สหกรณ์')
        ) {
          allowedTables = [
            'community_enterprises',
            'agricultural_career_groups',
            'housewife_farmer_groups',
            'young_farmer_groups_detailed',
            'farmer_institutes',
          ];
        } else if (
          q.includes('คน') ||
          q.includes('ติดต่อ') ||
          q.includes('เบอร์') ||
          q.includes('โทร') ||
          q.includes('เจ้าหน้าที่') ||
          q.includes('บุคลากร') ||
          q.includes('หัวหน้า') ||
          q.includes('ผู้จัดการ') ||
          q.includes('ประธาน')
        ) {
          allowedTables = [
            'personnel',
            'smart_farmers',
            'smart_farmer_sf',
            'young_smart_farmer_ysf',
            'plant_doctors',
          ];
        } else if (
          q.includes('โรค') ||
          q.includes('ศัตรูพืช') ||
          q.includes('แมลง') ||
          q.includes('หมอพืช') ||
          q.includes('ระบาด')
        ) {
          allowedTables = [
            'ai_disease_forecasts',
            'pest_centers',
            'plant_doctors',
          ];
        }

        if (allowedTables) {
          const filtered = categories.filter((cat) =>
            allowedTables.includes(cat.table)
          );
          if (filtered.length > 0) {
            categories = filtered;
          }
        }
      }

      for (const cat of categories) {
        const table = cat.table;
        const route = TABLE_ROUTES[table] || '/dashboard';
        const meta = TABLE_METADATA[table];
        for (const row of cat.results || []) {
          const display = meta
            ? meta.getDisplay(row)
            : { title: JSON.stringify(row), subtitle: '', info: '' };
          records.push({
            title: display.title || 'ข้อมูล',
            totalCount: cat.totalCount || (cat.results || []).length,
            subtitle: `${display.subtitle || ''} ${display.info || ''}`.trim(),
            url: `https://npt-dashboard.netlify.app${route}`,
          });
        }
      }
    } else if (tr.tool === 'area_summary') {
      const data = tr.data || {};
      const titleParts = [data.label || 'กลุ่มเกษตรกร'];
      if (data.subdistrict) titleParts.push(`ต.${data.subdistrict}`);
      if (data.district) titleParts.push(`อ.${data.district}`);
      const breakdown = (data.breakdown || [])
        .slice(0, 7)
        .map((item) => `${item.subdistrict || item.district}: ${item.count}`)
        .join(' / ');
      records.push({
        title: titleParts.join(' '),
        totalCount: data.total || 0,
        subtitle:
          breakdown ||
          `จำนวน ${Number(data.total || 0).toLocaleString('th-TH')} กลุ่ม`,
        url: data.url || 'https://npt-dashboard.netlify.app/dashboard',
      });
    } else if (tr.tool === 'area_search') {
      const data = tr.data || {};
      for (const cat of data.categories || []) {
        if ((cat.results || []).length === 0) {
          records.push({
            title: cat.label || 'กลุ่มเกษตรกร',
            totalCount: cat.totalCount || 0,
            subtitle: `พบ ${Number(cat.totalCount || 0).toLocaleString('th-TH')} รายการ`,
            url: cat.url || 'https://npt-dashboard.netlify.app/dashboard',
          });
          continue;
        }
        for (const row of cat.results || []) {
          records.push({
            title: row.title || cat.label || 'กลุ่มเกษตรกร',
            totalCount: cat.totalCount || (cat.results || []).length,
            subtitle: [cat.label, row.subtitle, row.info]
              .filter(Boolean)
              .join(' • '),
            url: cat.url || 'https://npt-dashboard.netlify.app/dashboard',
          });
        }
      }
    } else if (tr.tool === 'disease_forecast') {
      const risks = tr.data?.risks || [];
      if (risks.length > 2) {
        for (const risk of risks.slice(0, 3)) {
          records.push({
            title: risk.name || 'ความเสี่ยงโรคและแมลง',
            subtitle:
              (risk.target_crop || '-') +
              ' • ความเสี่ยง' +
              (risk.risk_level || '-'),
            totalCount: risks.length,
            url:
              'https://npt-dashboard.netlify.app/dashboard/protection/' +
              'disease-forecast',
          });
        }
      }
    } else if (tr.tool === 'latest_weather') {
      for (const row of tr.data || []) {
        records.push({
          title: `รายงานสภาพอากาศ อ.${row.district || 'นครปฐม'}`,
          subtitle: `อุณหภูมิ: ${row.tavg || row.temperature_c || '-'} °C • ฝน: ${row.prcp || row.rainfall_mm || 0} มม.`,
          url: 'https://npt-dashboard.netlify.app/dashboard/weather',
        });
      }
    } else if (tr.tool === 'fire_hotspots') {
      for (const row of tr.data || []) {
        records.push({
          title: `🔥 จุดความร้อน อ.${row.district || '-'} ต.${row.subdistrict || '-'}`,
          subtitle: `ประเภท: ${row.land_use || 'ไม่ระบุ'} / ความร้อน: ${row.frp || '-'} MW`,
          url: 'https://npt-dashboard.netlify.app/dashboard/smart-map',
        });
      }
    }
  }
  return records;
}

function buildAreaFallbackNote(toolResults) {
  const fallback = (toolResults || []).find(
    (tr) =>
      (tr.tool === 'area_summary' || tr.tool === 'area_search') &&
      tr.data?.coverage === 'district_fallback'
  );
  if (!fallback) return '';

  const data = fallback.data || {};
  const requested = data.requestedSubdistrict
    ? ` ต.${data.requestedSubdistrict}`
    : '';
  const district = data.district ? ` อ.${data.district}` : '';
  return `ข้อมูลระดับตำบลไม่พอสำหรับ${requested} จึงสรุปภาพรวม${district}แทน`;
}

function createLineAiOrchestrator({
  supabase,
  config,
  store,
  keyPool,
  gemini,
  executeTools,
  renderAiReply,
  clock = { now: () => new Date() },
}) {
  async function answer({ userId, text }) {
    if (
      !config.enabled ||
      !userId ||
      !text ||
      text.trim().length < 2 ||
      config.geminiApiKeys.size === 0
    ) {
      return null;
    }

    const processAnswer = async () => {
      let savedPreference = null;
      try {
        savedPreference = await store.getPreference(userId);
      } catch {
        console.error(JSON.stringify({ event: 'preference_load_failed' }));
      }

      const normalized = text.trim().toLowerCase();
      const preferenceKey = [
        savedPreference?.crop || '',
        savedPreference?.district || '',
      ].join('|');
      const cacheKey = crypto
        .createHash('sha256')
        .update([normalized, preferenceKey, config.model, 'v4'].join('|'))
        .digest('hex');

      // 1. Check Cache
      const cacheHit = await store.getCache(cacheKey);
      if (cacheHit && cacheHit.response) {
        return {
          messages: cacheHit.response.messages,
          sourceType: cacheHit.source_type || 'cache',
        };
      }

      // 2. Load History
      const history = await store.getHistory(userId, clock.now());

      // 3. Run Planner
      const plan = await keyPool.execute(async ({ apiKey }) => {
        const resolvedModel = await gemini.resolveModel(apiKey);
        return gemini.plan(apiKey, resolvedModel, {
          question: text,
          history,
          preferences: savedPreference,
        });
      });

      plan.preferenceAction ||= 'none';

      if (plan.preferenceAction === 'clear') {
        try {
          await store.clearPreference(userId);
          savedPreference = null;
        } catch {
          console.error(JSON.stringify({ event: 'preference_clear_failed' }));
          plan.answer = 'ยังลบข้อมูลที่จำไว้ไม่ได้ กรุณาลองใหม่อีกครั้งค่ะ';
        }
      }

      if (plan.preferenceAction === 'save') {
        const nextPreference = {
          crop: plan.crop || savedPreference?.crop || null,
          district: plan.district || savedPreference?.district || null,
        };
        try {
          savedPreference = await store.savePreference(userId, nextPreference);
        } catch {
          console.error(JSON.stringify({ event: 'preference_save_failed' }));
          plan.answer = 'ยังบันทึกข้อมูลไม่ได้ กรุณาลองใหม่อีกครั้งค่ะ';
        }
      }

      const effectivePreference = {
        crop: plan.crop || savedPreference?.crop || null,
        district: plan.district || savedPreference?.district || null,
      };
      // 5. Append User message
      await store.appendMessage(userId, 'user', text, plan.intent);

      if (
        plan.tools?.includes('disease_forecast') &&
        !effectivePreference.crop
      ) {
        const replyText =
          'กรุณาระบุพืชที่ปลูกก่อนนะคะ เช่น ข้าว กล้วยไม้ หรือพืชผัก';
        const messages = renderAiReply({ text: replyText });
        await store.appendMessage(userId, 'assistant', replyText, 'clarify');
        return { messages, sourceType: 'clarify' };
      }
      // Handle general / clarify / no database intents with non-empty answers immediately
      if (
        (plan.intent === 'general' || plan.intent === 'clarify') &&
        (plan.answer || plan.clarification)
      ) {
        const replyText = plan.answer || plan.clarification;
        const messages = renderAiReply({ text: replyText });
        await store.appendMessage(userId, 'assistant', replyText, plan.intent);

        // Cache if history is independent
        if (history.length === 0 && plan.preferenceAction === 'none') {
          await store.putCache({
            cache_key: cacheKey,
            response: { messages },
            source_type: plan.intent,
            model: config.model,
            expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          });
        }

        return { messages, sourceType: plan.intent };
      }

      // 6. Execute database tools
      let toolResults = [];
      if (plan.tools && plan.tools.length > 0) {
        const args = [supabase, plan.tools, plan.searchTerms, plan.tables];
        if (
          plan.tools.includes('area_summary') ||
          plan.tools.includes('area_search')
        ) {
          args.push({
            areaScope:
              plan.areaScope ||
              (plan.subdistrict
                ? 'subdistrict'
                : plan.district
                  ? 'district'
                  : 'province'),
            district: plan.district || null,
            subdistrict: plan.subdistrict || null,
            farmerGroupType: plan.farmerGroupType || 'all',
          });
        } else if (plan.tools.includes('disease_forecast')) {
          args.push(effectivePreference);
        } else if (plan.tools.includes('personnel_summary')) {
          args.push({
            personnelScope: plan.personnelScope,
            district: plan.district,
          });
        }
        toolResults = await executeTools(...args);
      }

      // 7. Synthesize through key pool
      const useGrounding = plan.needsGrounding && config.groundingEnabled;
      const trimmedEvidence = (toolResults || []).map((tr) => {
        if (tr.tool === 'global_search') {
          const trimmedData = (tr.data || []).slice(0, 3).map((cat) => ({
            table: cat.table,
            totalCount: cat.totalCount,
            results: (cat.results || []).slice(0, 3),
          }));
          return {
            tool: tr.tool,
            data: trimmedData,
          };
        }
        return tr;
      });

      const answerText = await keyPool.execute(async ({ apiKey }) => {
        const resolvedModel = await gemini.resolveModel(apiKey);
        return gemini.synthesize(apiKey, resolvedModel, {
          question: text,
          history,
          evidence: trimmedEvidence,
          grounding: useGrounding,
          preferences: effectivePreference,
        });
      });

      const records = formatDeterministicSummary(trimmedEvidence, text);
      const areaFallbackNote = buildAreaFallbackNote(trimmedEvidence);
      let finalAnswer = areaFallbackNote
        ? `${areaFallbackNote}\n${answerText}`
        : answerText;
      if (records && records.length > 0) {
        const uniqueUrls = [...new Set(records.map((r) => r.url))].filter(
          Boolean
        );
        if (uniqueUrls.length > 0) {
          finalAnswer +=
            '\n\nดูตัวอย่างเพิ่มเติมได้จากการ์ดด้านล่าง หรือเข้าชมหน้าระบบได้ที่นี่:\n' +
            uniqueUrls.join('\n');
        }
      }
      const messages = renderAiReply({ text: finalAnswer, records });
      await store.appendMessage(userId, 'assistant', finalAnswer, plan.intent);

      // Cache if history is independent
      if (history.length === 0 && plan.preferenceAction === 'none') {
        await store.putCache({
          cache_key: cacheKey,
          response: { messages },
          source_type: plan.intent,
          model: config.model,
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        });
      }

      return { messages, sourceType: plan.intent };
    };

    // Keep the full pipeline below LINE's reply-token window; Gemini requests have their own timeout.
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Orchestrator timeout')),
        config.timeoutMs || 6500
      );
    });

    try {
      const result = await Promise.race([processAnswer(), timeoutPromise]);
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      console.error(
        JSON.stringify({
          error: err.message || String(err),
          status: err.status,
          code: err.code,
        })
      );
      return null;
    }
  }

  return { answer };
}

export { createLineAiOrchestrator };
