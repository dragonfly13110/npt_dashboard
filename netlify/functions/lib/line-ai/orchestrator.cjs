'use strict';

const crypto = require('crypto');

const TABLE_ROUTES = {
  agricultural_areas: '/dashboard/strategy/agricultural-areas',
  learning_centers: '/dashboard/strategy/learning-centers',
  disasters: '/dashboard/development/disasters',
  farmer_registry: '/dashboard/strategy/farmer-registry',
  daily_weather: '/dashboard/strategy/daily-weather',
  large_plots: '/dashboard/production/large-plots',
  certifications: '/dashboard/production/certifications',
  crop_production: '/dashboard/production/crop-production',
  community_enterprises: '/dashboard/development/community-enterprises',
  smart_farmers: '/dashboard/development/smart-farmers',
  smart_farmer_sf: '/dashboard/development/smart-farmer-sf',
  young_smart_farmer_ysf: '/dashboard/development/young-smart-farmer-ysf',
  agricultural_career_groups:
    '/dashboard/development/agricultural-career-groups',
  farmer_groups: '/dashboard/development/farmer-groups',
  housewife_farmer_groups: '/dashboard/development/housewife-farmer-groups',
  young_farmer_groups_detailed: '/dashboard/development/young-farmer-groups',
  farmer_institutes: '/dashboard/development/farmer-institutes',
  agri_tourism: '/dashboard/development/agri-tourism',
  forecast_plots: '/dashboard/protection/pest-outbreaks',
  ai_disease_forecasts: '/dashboard/protection/disease-forecast',
  pest_centers: '/dashboard/protection/pest-centers',
  plant_doctors: '/dashboard/protection/plant-doctors',
  soil_fertilizer_centers: '/dashboard/protection/soil-fertilizer',
  fire_hotspots: '/dashboard/protection/fire-hotspots',
  budgets: '/dashboard/admin/budgets',
  personnel: '/dashboard/admin/personnel',
};

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
};

function formatDeterministicSummary(toolResults) {
  const records = [];
  for (const tr of toolResults || []) {
    if (tr.tool === 'global_search') {
      for (const cat of tr.data || []) {
        const table = cat.table;
        const route = TABLE_ROUTES[table] || '/dashboard';
        const meta = TABLE_METADATA[table];
        for (const row of cat.results || []) {
          const display = meta
            ? meta.getDisplay(row)
            : { title: JSON.stringify(row), subtitle: '', info: '' };
          records.push({
            title: display.title || 'ข้อมูล',
            subtitle: `${display.subtitle || ''} ${display.info || ''}`.trim(),
            url: `https://npt-dashboard.netlify.app${route}`,
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
      const normalized = text.trim().toLowerCase();
      const cacheKey = crypto
        .createHash('sha256')
        .update(`${normalized}|${config.model}|v1`)
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

      // 3. Claim AI Quota (Plan call)
      const isAdmin = config.adminUserIds?.has(userId);
      const aiLimits = {
        daily: config.aiDailyLimit,
        window: config.rollingLimit,
        seconds: config.rollingWindowSeconds,
      };

      if (!isAdmin) {
        const claim = await store.claimQuota(userId, 'ai', aiLimits);
        if (!claim.allowed) {
          return {
            messages: [
              {
                type: 'text',
                text: 'ขออภัยค่ะ โควต้า AI วันนี้หมดแล้ว กรุณาลองใหม่วันพรุ่งนี้นะคะ',
              },
            ],
            sourceType: 'quota_limit',
          };
        }
      }

      // 4. Run Planner
      const plan = await keyPool.execute(async ({ apiKey }) => {
        const resolvedModel = await gemini.resolveModel(apiKey);
        return gemini.plan(apiKey, resolvedModel, { question: text, history });
      });

      // 5. Append User message
      await store.appendMessage(userId, 'user', text, plan.intent);

      // Handle general / clarify / no database intents with non-empty answers immediately
      if (
        (plan.intent === 'general' || plan.intent === 'clarify') &&
        (plan.answer || plan.clarification)
      ) {
        const replyText = plan.answer || plan.clarification;
        const messages = renderAiReply({ text: replyText });
        await store.appendMessage(userId, 'assistant', replyText, plan.intent);

        // Cache if history is independent
        if (history.length === 0) {
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
        toolResults = await executeTools(
          supabase,
          plan.tools,
          plan.searchTerms
        );
      }

      // 7. Grounding quota if needed
      let useGrounding = plan.needsGrounding;
      if (useGrounding) {
        const groundingLimits = {
          daily: config.groundingDailyLimit,
          window: config.rollingLimit,
          seconds: config.rollingWindowSeconds,
        };
        const groundingClaim = await store.claimQuota(
          userId,
          'grounding',
          groundingLimits
        );
        if (!groundingClaim.allowed) {
          useGrounding = false;
        }
      }

      // 8. Claim second AI Quota (Synthesis call)
      if (!isAdmin) {
        const claim2 = await store.claimQuota(userId, 'ai', aiLimits);
        if (!claim2.allowed) {
          // Denied second call -> summarize retrieved records deterministically
          const records = formatDeterministicSummary(toolResults);
          const messages = renderAiReply({
            text: 'โควต้า AI สำหรับสรุปผลในวันนี้หมดแล้ว แต่นี่คือข้อมูลที่ค้นพบจากระบบคลังข้อมูล:',
            records,
          });
          // Append summary to history
          await store.appendMessage(
            userId,
            'assistant',
            'โควต้า AI หมดแล้ว แสดงข้อมูลดิบจากคลังความรู้',
            plan.intent
          );
          return { messages, sourceType: plan.intent };
        }
      }

      // 9. Synthesize through key pool
      const answerText = await keyPool.execute(async ({ apiKey }) => {
        const resolvedModel = await gemini.resolveModel(apiKey);
        return gemini.synthesize(apiKey, resolvedModel, {
          question: text,
          history,
          evidence: toolResults,
          grounding: useGrounding,
        });
      });

      const records = formatDeterministicSummary(toolResults);
      const messages = renderAiReply({ text: answerText, records });
      await store.appendMessage(userId, 'assistant', answerText, plan.intent);

      // Cache if history is independent
      if (history.length === 0) {
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

    // Timeout & Error safety: entire answer operation gets a 20-second deadline.
    // If it fails or times out, return null to continue with standard database search.
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Orchestrator timeout')),
        20000
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

module.exports = {
  createLineAiOrchestrator,
};
