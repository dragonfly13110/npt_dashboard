const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase Client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

let lineAiOrchestrator = null;

function getOrchestrator() {
  if (lineAiOrchestrator) return lineAiOrchestrator;
  if (!supabase) return null;
  try {
    const { getConfig } = require('./lib/line-ai/config.cjs');
    const { createLineAiStore } = require('./lib/line-ai/store.cjs');
    const { createKeyPool } = require('./lib/line-ai/key-pool.cjs');
    const { createGeminiClient } = require('./lib/line-ai/gemini.cjs');
    const { executeTools } = require('./lib/line-ai/tools.cjs');
    const { renderAiReply } = require('./lib/line-ai/flex.cjs');
    const {
      createLineAiOrchestrator,
    } = require('./lib/line-ai/orchestrator.cjs');

    const config = getConfig();
    if (!config.enabled || config.geminiApiKeys.size === 0) return null;
    const store = createLineAiStore(supabase);
    const keyPool = createKeyPool({ keys: config.geminiApiKeys, store });
    const gemini = createGeminiClient({
      model: config.model,
      fallbacks: config.fallbackModels,
      timeoutMs: config.timeoutMs,
    });
    lineAiOrchestrator = createLineAiOrchestrator({
      supabase,
      config,
      store,
      keyPool,
      gemini,
      executeTools,
      renderAiReply,
    });
    return lineAiOrchestrator;
  } catch (err) {
    console.error('Failed to initialize LINE AI orchestrator:', err);
    return null;
  }
}

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// Verify signature of the incoming LINE webhook event
function verifySignature(body, signature, channelSecret) {
  if (!signature || !channelSecret) return false;
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

// Send push message back to user via LINE Messaging API
async function sendLinePush(to, messages) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn(
      '⚠️ LINE_CHANNEL_ACCESS_TOKEN is not configured. Push Payload:',
      JSON.stringify({ to, messages }, null, 2)
    );
    return false;
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to,
        messages,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`❌ Failed to send LINE push: ${response.status} ${text}`);
      return false;
    }
    console.log(`✅ LINE push message sent successfully to ${to}`);
    return true;
  } catch (err) {
    console.error('❌ Exception sending LINE push:', err);
    return false;
  }
}

// Start chat loading animation via LINE Messaging API
async function sendLineLoading(chatId, loadingSeconds = 20) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn(
      '⚠️ LINE_CHANNEL_ACCESS_TOKEN is not configured for loading animation.'
    );
    return false;
  }
  try {
    const response = await fetch(
      'https://api.line.me/v2/bot/chat/loading/start',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          chatId,
          loadingSeconds,
        }),
      }
    );
    if (!response.ok) {
      const text = await response.text();
      console.error(
        `❌ Failed to start LINE loading: ${response.status} ${text}`
      );
      return false;
    }
    console.log(`✅ Started LINE chat loading for ${chatId}`);
    return true;
  } catch (err) {
    console.error('❌ Exception starting LINE loading:', err);
    return false;
  }
}

// Send reply message back to user via LINE Messaging API with push fallback
async function sendLineReply(replyToken, messages, userId = null) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn(
      '⚠️ LINE_CHANNEL_ACCESS_TOKEN is not configured. Reply Payload:',
      JSON.stringify({ replyToken, messages }, null, 2)
    );
    return false;
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`❌ Failed to send LINE reply: ${response.status} ${text}`);

      // Fallback to push message if userId is available
      if (userId) {
        console.log(
          `⚠️ Reply token failed/expired. Attempting push message fallback to: ${userId}`
        );
        return await sendLinePush(userId, messages);
      }
      return false;
    }
    return true;
  } catch (err) {
    console.error('❌ Exception sending LINE reply:', err);
    if (userId) {
      console.log(
        `⚠️ Reply exception. Attempting push message fallback to: ${userId}`
      );
      return await sendLinePush(userId, messages);
    }
    return false;
  }
}

// ----------------------------------------------------
// FLEX MESSAGE TEMPLATES generators
// ----------------------------------------------------

// 1. HELP / MENU Flex Message
function createHelpMessage() {
  return {
    type: 'flex',
    altText: 'เมนูหลัก น้องข้าวหลาม',
    contents: {
      type: 'bubble',
      hero: {
        type: 'image',
        url: 'https://res.cloudinary.com/dxfq3iotg/image/upload/v1561668612/agriculture.jpg',
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🌾 น้องข้าวหลาม ยินดีบริการค่ะ',
            weight: 'bold',
            size: 'xl',
            color: '#166534',
          },
          {
            type: 'text',
            text: 'ศูนย์ข้อมูลเกษตรอัจฉริยะนครปฐม',
            size: 'sm',
            color: '#64748b',
            margin: 'sm',
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'text',
            text: 'เลือกหัวข้อที่ต้องการสอบถาม หรือพิมพ์คำค้นหาด้านล่างได้เลยค่ะ:',
            size: 'sm',
            color: '#334155',
            wrap: true,
            margin: 'md',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#15803d',
            action: {
              type: 'postback',
              label: '👤 ค้นหาบุคลากร (แยกตามอำเภอ)',
              data: 'action=list_districts',
            },
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'postback',
              label: '🌾 ข้อมูลเกษตรกรแปลงใหญ่',
              data: 'action=large_plots_menu',
            },
          },
          {
            type: 'button',
            style: 'link',
            color: '#0369a1',
            action: {
              type: 'postback',
              label: '🌤️ รายงานสภาพอากาศล่าสุด',
              data: 'action=weather',
            },
          },
          {
            type: 'button',
            style: 'link',
            color: '#b91c1c',
            action: {
              type: 'postback',
              label: '🔥 จุดความร้อนไฟป่า (Hotspot)',
              data: 'action=fire',
            },
          },
          {
            type: 'text',
            text: "💡 คุณสามารถพิมพ์ค้นหาโดยตรงได้ เช่น:\n• 'ค้นหา: สมชาย' (ค้นหาข้าราชการ)\n• 'แปลงใหญ่: กล้วยไม้' (ค้นหาแปลงใหญ่พืช)",
            size: 'xs',
            color: '#64748b',
            margin: 'md',
            wrap: true,
          },
        ],
      },
    },
  };
}

// 2. WEATHER Flex Message
function createWeatherMessage(weatherRecord) {
  const dateStr = weatherRecord.date
    ? new Date(weatherRecord.date).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'วันนี้';

  let rainDesc = 'ไม่มีข้อมูล';
  const prcp = parseFloat(weatherRecord.prcp || 0);
  if (prcp > 35) rainDesc = `${prcp} mm (ฝนตกหนัก 🌧️)`;
  else if (prcp > 10) rainDesc = `${prcp} mm (ฝนตกปานกลาง 🌦️)`;
  else if (prcp > 0) rainDesc = `${prcp} mm (ฝนตกปรอยๆ 💧)`;
  else rainDesc = '0 mm (ฝนไม่ตก ☀️)';

  return {
    type: 'flex',
    altText: 'รายงานสภาพอากาศนครปฐม',
    contents: {
      type: 'bubble',
      styles: {
        header: {
          backgroundColor: '#f0f9ff',
        },
      },
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🌤️ รายงานสภาพอากาศ',
            weight: 'bold',
            size: 'md',
            color: '#0369a1',
          },
          {
            type: 'text',
            text: `ประจำวันที่ ${dateStr}`,
            size: 'sm',
            color: '#64748b',
            margin: 'xs',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'อุณหภูมิเฉลี่ย',
                color: '#64748b',
                size: 'sm',
                flex: 2,
              },
              {
                type: 'text',
                text: weatherRecord.tavg ? `${weatherRecord.tavg} °C` : '-',
                weight: 'bold',
                color: '#1e293b',
                size: 'sm',
                flex: 3,
              },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'อุณหภูมิ ต่ำสุด-สูงสุด',
                color: '#64748b',
                size: 'sm',
                flex: 2,
              },
              {
                type: 'text',
                text:
                  weatherRecord.tmin && weatherRecord.tmax
                    ? `${weatherRecord.tmin} - ${weatherRecord.tmax} °C`
                    : '-',
                weight: 'bold',
                color: '#1e293b',
                size: 'sm',
                flex: 3,
              },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'ปริมาณน้ำฝน',
                color: '#64748b',
                size: 'sm',
                flex: 2,
              },
              {
                type: 'text',
                text: rainDesc,
                weight: 'bold',
                color: '#0284c7',
                size: 'sm',
                flex: 3,
              },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'ความเร็วลมเฉลี่ย',
                color: '#64748b',
                size: 'sm',
                flex: 2,
              },
              {
                type: 'text',
                text: weatherRecord.wspd ? `${weatherRecord.wspd} km/h` : '-',
                weight: 'bold',
                color: '#1e293b',
                size: 'sm',
                flex: 3,
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'link',
            height: 'sm',
            action: {
              type: 'uri',
              label: 'ดูแดชบอร์ดสภาพอากาศ',
              uri: 'https://npt-dashboard.netlify.app/dashboard/weather',
            },
          },
        ],
      },
    },
  };
}

// 3. PERSONNEL Flex Message (Carousel of cards)
function createPersonnelCarousel(personnelList, title = 'รายชื่อบุคลากร') {
  const cards = personnelList.slice(0, 10).map((person) => {
    const phoneClean = person.phone ? person.phone.replace(/[^0-9]/g, '') : '';
    const footerContents = [];

    if (phoneClean) {
      footerContents.push({
        type: 'button',
        style: 'primary',
        color: '#166534',
        height: 'sm',
        action: {
          type: 'uri',
          label: `📞 โทร ${person.phone}`,
          uri: `tel:${phoneClean}`,
        },
      });
    } else {
      footerContents.push({
        type: 'button',
        style: 'secondary',
        height: 'sm',
        disabled: true,
        action: {
          type: 'uri',
          label: 'ไม่มีเบอร์ติดต่อ',
          uri: 'tel:',
        },
      });
    }

    return {
      type: 'bubble',
      size: 'micro',
      styles: {
        header: {
          backgroundColor:
            person.office_type === 'Provincial' ? '#e0f2fe' : '#f0fdf4',
        },
      },
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text:
              person.office_type === 'Provincial'
                ? 'ระดับจังหวัด'
                : `ระดับอำเภอ (${person.district || '-'})`,
            size: 'xxs',
            weight: 'bold',
            color: person.office_type === 'Provincial' ? '#0369a1' : '#15803d',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        contents: [
          {
            type: 'text',
            text: person.full_name,
            weight: 'bold',
            size: 'sm',
            wrap: true,
            color: '#1e293b',
          },
          {
            type: 'text',
            text: person.position || 'ไม่ระบุตำแหน่ง',
            size: 'xs',
            color: '#64748b',
            wrap: true,
          },
          {
            type: 'text',
            text: person.department || '-',
            size: 'xxs',
            color: '#94a3b8',
            wrap: true,
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: footerContents,
      },
    };
  });

  return {
    type: 'flex',
    altText: title,
    contents: {
      type: 'carousel',
      contents: cards,
    },
  };
}

// 4. LARGE PLOTS Flex Message (Carousel of cards)
function createLargePlotsCarousel(plots, title = 'ข้อมูลแปลงใหญ่') {
  const cards = plots.slice(0, 10).map((plot) => {
    return {
      type: 'bubble',
      size: 'kilo',
      styles: {
        header: {
          backgroundColor: '#fef3c7',
        },
      },
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `🌾 แปลงใหญ่${plot.crop_name || 'พืช'}`,
            size: 'xs',
            weight: 'bold',
            color: '#b45309',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: plot.group_name || 'ไม่ระบุชื่อกลุ่ม',
            weight: 'bold',
            size: 'sm',
            wrap: true,
            color: '#1e293b',
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            contents: [
              {
                type: 'text',
                text: `📍 อำเภอ: ${plot.district || '-'}`,
                size: 'xs',
                color: '#64748b',
              },
              {
                type: 'text',
                text: `👥 สมาชิก: ${plot.member_count || '-'} ราย`,
                size: 'xs',
                color: '#64748b',
              },
              {
                type: 'text',
                text: `📐 เนื้อที่: ${plot.area_rai || '-'} ไร่`,
                size: 'xs',
                color: '#64748b',
              },
              {
                type: 'text',
                text: `🏆 มาตรฐาน: ${plot.production_standard || 'ไม่มีข้อมูล'}`,
                size: 'xs',
                color: '#166534',
                wrap: true,
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'link',
            height: 'sm',
            action: {
              type: 'uri',
              label: 'เปิดแผนที่แปลงใหญ่',
              uri: 'https://npt-dashboard.netlify.app/dashboard/smart-map',
            },
          },
        ],
      },
    };
  });

  return {
    type: 'flex',
    altText: title,
    contents: {
      type: 'carousel',
      contents: cards,
    },
  };
}

// 5. FIRE HOTSPOTS Flex Message
function createFireHotspotsMessage(hotspots) {
  const listItems = hotspots.slice(0, 5).map((spot, i) => {
    return {
      type: 'box',
      layout: 'vertical',
      margin: i > 0 ? 'md' : 'none',
      contents: [
        {
          type: 'text',
          text: `🔥 อ.${spot.district || '-'} ต.${spot.subdistrict || '-'}`,
          weight: 'bold',
          size: 'sm',
          color: '#b91c1c',
        },
        {
          type: 'text',
          text: `เวลาพบ: ${spot.acq_date || '-'} (${spot.acq_time ? spot.acq_time.substring(0, 2) + ':' + spot.acq_time.substring(2) + ' น.' : '-'})`,
          size: 'xs',
          color: '#475569',
        },
        {
          type: 'text',
          text: `ประเภทพื้นที่: ${spot.land_use || 'ไม่ระบุ'} / ความร้อน: ${spot.frp || '-'} MW`,
          size: 'xs',
          color: '#64748b',
        },
      ],
    };
  });

  return {
    type: 'flex',
    altText: 'สถิติจุดความร้อนสะสม',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🔥 รายงานจุดความร้อนล่าสุด (GISTDA)',
            weight: 'bold',
            size: 'md',
            color: '#991b1b',
          },
          {
            type: 'text',
            text: 'จุดระวังไฟป่าและการเผาไหม้ในจังหวัดนครปฐม',
            size: 'xs',
            color: '#64748b',
            margin: 'xs',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents:
          listItems.length > 0
            ? listItems
            : [
                {
                  type: 'text',
                  text: '✅ ไม่พบจุดความร้อนสะสมในพื้นที่ในช่วงนี้ค่ะ',
                  size: 'sm',
                  color: '#166534',
                },
              ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'link',
            action: {
              type: 'uri',
              label: 'ดูแผนที่จุดความร้อน',
              uri: 'https://npt-dashboard.netlify.app/dashboard/smart-map',
            },
          },
        ],
      },
    },
  };
}

// Mapping: table name -> dashboard route path
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

// Metadata for formatting results of each table
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

// Generates a LINE Flex Message Carousel for global search results
function createGlobalSearchCarousel(categories, searchTerm) {
  const bubbles = categories.slice(0, 10).map((cat) => {
    const meta = TABLE_METADATA[cat.table] || {
      label: cat.table,
      icon: '📂',
      getDisplay: (row) => ({
        title: JSON.stringify(row),
        subtitle: '',
        info: '',
      }),
    };

    const displayItems = cat.results
      .slice(0, 3)
      .map((row, idx) => {
        const display = meta.getDisplay(row);
        const contents = [
          {
            type: 'text',
            text: display.title || '-',
            weight: 'bold',
            size: 'sm',
            wrap: true,
            color: '#1e293b',
          },
          {
            type: 'text',
            text: display.subtitle || '-',
            size: 'xs',
            color: '#475569',
            wrap: true,
          },
        ];

        if (display.info) {
          contents.push({
            type: 'text',
            text: display.info,
            size: 'xs',
            color: '#166534',
            wrap: true,
          });
        }

        const itemBox = {
          type: 'box',
          layout: 'vertical',
          spacing: 'xxs',
          contents: contents,
        };

        if (idx > 0) {
          return [
            {
              type: 'separator',
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              spacing: 'xxs',
              contents: contents,
            },
          ];
        }

        return [itemBox];
      })
      .flat();

    const route = TABLE_ROUTES[cat.table];
    const footerContents = [];
    if (route) {
      footerContents.push({
        type: 'button',
        style: 'link',
        height: 'sm',
        action: {
          type: 'uri',
          label: '🌐 เปิดดูบนแดชบอร์ด',
          uri: `https://npt-dashboard.netlify.app${route}`,
        },
      });
    } else {
      footerContents.push({
        type: 'button',
        style: 'link',
        height: 'sm',
        action: {
          type: 'uri',
          label: '🌐 เปิดระบบแดชบอร์ด',
          uri: 'https://npt-dashboard.netlify.app/dashboard',
        },
      });
    }

    return {
      type: 'bubble',
      size: 'kilo',
      styles: {
        header: {
          backgroundColor: '#f0fdf4',
        },
      },
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `${meta.icon} ${meta.label} (พบ ${Math.max(cat.totalCount || 0, cat.results.length)} รายการ)`,
            weight: 'bold',
            size: 'sm',
            color: '#166534',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents:
          displayItems.length > 0
            ? displayItems
            : [
                {
                  type: 'text',
                  text: 'ไม่พบรายละเอียด',
                  size: 'sm',
                  color: '#64748b',
                },
              ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: footerContents,
      },
    };
  });

  return {
    type: 'flex',
    altText: `ผลการค้นหาข้อมูลสำหรับ "${searchTerm}"`,
    contents: {
      type: 'carousel',
      contents: bubbles,
    },
  };
}

// ----------------------------------------------------
// EVENT HANDLERS
// ----------------------------------------------------

async function handleMessageEvent(event) {
  const replyToken = event.replyToken;
  if (event.message.type !== 'text') return;

  const text = event.message.text.trim();
  console.log('💬 Processing text message event');

  if (!supabase) {
    await sendLineReply(replyToken, [
      {
        type: 'text',
        text: '⚠️ ขออภัยค่ะ ตอนนี้ระบบไม่ได้เชื่อมต่อฐานข้อมูล กรุณาตั้งค่าเซิร์ฟเวอร์ก่อนนะคะ',
      },
    ]);
    return;
  }

  // 1. HELP / MENU commands
  if (
    text.toLowerCase() === 'help' ||
    text === 'เมนู' ||
    text === 'เริ่ม' ||
    text === 'เริ่มต้น'
  ) {
    await sendLineReply(replyToken, [createHelpMessage()]);
    return;
  }

  // 2. WEATHER command
  if (text === 'สภาพอากาศ' || text === 'เช็คสภาพอากาศ') {
    const { data } = await supabase
      .from('daily_weather')
      .select('*')
      .order('date', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      await sendLineReply(replyToken, [createWeatherMessage(data[0])]);
    } else {
      await sendLineReply(replyToken, [
        { type: 'text', text: '❌ ขออภัยค่ะ ไม่พบข้อมูลสภาพอากาศในขณะนี้' },
      ]);
    }
    return;
  }

  // 3. FIRE HOTSPOT command
  if (text === 'ไฟป่า' || text === 'จุดความร้อน' || text === 'hotspot') {
    const { data } = await supabase
      .from('fire_hotspots')
      .select('*')
      .order('acq_date', { ascending: false })
      .order('acq_time', { ascending: false })
      .limit(5);

    await sendLineReply(replyToken, [createFireHotspotsMessage(data || [])]);
    return;
  }

  // 4. PERSONNEL search command: "ค้นหา: สมชาย"
  if (text.startsWith('ค้นหา:')) {
    const searchVal = text.replace('ค้นหา:', '').trim();
    if (!searchVal) {
      await sendLineReply(replyToken, [
        {
          type: 'text',
          text: "💡 กรุณาระบุชื่อที่ต้องการค้นหา เช่น 'ค้นหา: สมชาย'",
        },
      ]);
      return;
    }

    const { data, error } = await supabase
      .from('personnel')
      .select('*')
      .or(
        `full_name.ilike.%${searchVal}%,position.ilike.%${searchVal}%,department.ilike.%${searchVal}%`
      )
      .limit(10);

    if (error) {
      console.error(error);
      await sendLineReply(replyToken, [
        {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาดในการสืบค้นข้อมูล กรุณาลองใหม่ภายหลัง',
        },
      ]);
    } else if (data && data.length > 0) {
      await sendLineReply(replyToken, [
        createPersonnelCarousel(data, `ผลการค้นหาบุคลากร "${searchVal}"`),
      ]);
    } else {
      await sendLineReply(replyToken, [
        {
          type: 'text',
          text: `🔍 ไม่พบรายชื่อบุคลากรที่มีชื่อหรือตำแหน่งเกี่ยวข้องกับ "${searchVal}" ค่ะ`,
        },
      ]);
    }
    return;
  }

  // 5. LARGE PLOTS search command: "แปลงใหญ่: ข้าว"
  if (text.startsWith('แปลงใหญ่:')) {
    const cropName = text.replace('แปลงใหญ่:', '').trim();
    if (!cropName) {
      await sendLineReply(replyToken, [
        { type: 'text', text: "💡 กรุณาระบุชื่อพืช เช่น 'แปลงใหญ่: ส้มโอ'" },
      ]);
      return;
    }

    const { data, error } = await supabase
      .from('large_plots')
      .select('*')
      .or(
        `crop_name.ilike.%${cropName}%,agricultural_activity.ilike.%${cropName}%`
      )
      .limit(10);

    if (error) {
      console.error(error);
      await sendLineReply(replyToken, [
        { type: 'text', text: '❌ เกิดข้อผิดพลาดในการสืบค้นข้อมูลแปลงใหญ่' },
      ]);
    } else if (data && data.length > 0) {
      await sendLineReply(replyToken, [
        createLargePlotsCarousel(data, `ผลการค้นหาแปลงใหญ่ "${cropName}"`),
      ]);
    } else {
      await sendLineReply(replyToken, [
        {
          type: 'text',
          text: `🔍 ไม่พบข้อมูลแปลงใหญ่ของพืช "${cropName}" ในจังหวัดนครปฐมค่ะ`,
        },
      ]);
    }
    return;
  }

  // 6. GLOBAL SEARCH fallback (when no command prefix matches)
  if (text.length >= 2) {
    const orchestratorInstance = getOrchestrator();
    if (orchestratorInstance) {
      // Start LINE loading animation (skip in test environment to avoid breaking mocks)
      if (
        process.env.NODE_ENV !== 'test' &&
        event.source?.type === 'user' &&
        event.source?.userId
      ) {
        await sendLineLoading(event.source.userId, 40);
      }
      const aiStart = Date.now();
      const aiResult = await orchestratorInstance.answer({
        userId: event.source?.userId,
        text,
      });
      const aiDurationMs = Date.now() - aiStart;
      if (aiResult && aiResult.messages && aiResult.messages.length > 0) {
        console.log(
          `✅ AI replied in ${aiDurationMs}ms (${aiResult.sourceType})`
        );
        await sendLineReply(
          replyToken,
          aiResult.messages,
          event.source?.userId
        );
        return;
      }
      console.warn(
        `⚠️ AI returned null after ${aiDurationMs}ms, falling back to legacy search`
      );
    }

    try {
      // Parallel fetch from personnel and global_search RPC
      const [personnelRes, globalRes] = await Promise.all([
        supabase
          .from('personnel')
          .select('*')
          .or(
            `full_name.ilike.%${text}%,position.ilike.%${text}%,department.ilike.%${text}%`
          )
          .limit(3),
        supabase.rpc('global_search', {
          search_term: text,
          result_limit: 3,
        }),
      ]);

      const personnelData = personnelRes.data || [];
      const globalData = globalRes.data || [];

      // Combine them into a list of categories
      const categories = [];

      // Add personnel as a category if found
      if (personnelData.length > 0) {
        categories.push({
          table: 'personnel',
          totalCount: personnelData.length,
          results: personnelData,
        });
      }

      // Add other tables returned from global_search RPC
      if (Array.isArray(globalData)) {
        for (const item of globalData) {
          if (item.results && item.results.length > 0) {
            categories.push(item);
          }
        }
      }

      if (categories.length > 0) {
        // Build Carousel of Flex Message bubbles for each matching category
        try {
          const searchMessage = createGlobalSearchCarousel(categories, text);
          const sent = await sendLineReply(replyToken, [searchMessage]);
          if (sent) return;
          // If Flex message failed, fall back to plain text summary
          console.warn('⚠️ Flex carousel failed, sending text fallback');
        } catch (flexErr) {
          console.error('❌ Error building Flex carousel:', flexErr);
        }

        // Fallback: send plain text summary of results
        const summaryLines = categories.slice(0, 5).map((cat) => {
          const meta = TABLE_METADATA[cat.table] || {
            label: cat.table,
            icon: '📂',
          };
          return `${meta.icon} ${meta.label}: พบ ${cat.totalCount || cat.results.length} รายการ`;
        });
        const fallbackText = `🔍 ผลการค้นหา "${text}"\n\n${summaryLines.join('\n')}\n\n🌐 ดูรายละเอียดเพิ่มเติมที่:\nhttps://npt-dashboard.netlify.app/dashboard`;
        await sendLineReply(replyToken, [{ type: 'text', text: fallbackText }]);
        return;
      }
    } catch (err) {
      console.error('❌ Error executing global search:', err);
    }
  }

  // DEFAULT REPLY if keyword doesn't match and no search results found
  await sendLineReply(replyToken, [
    {
      type: 'text',
      text: `สวัสดีค่ะ น้องข้าวหลามยินดีให้บริการค่ะ 🌾\n\nหนูไม่พบข้อมูลที่เกี่ยวข้องกับ "${text}" ในระบบค่ะ\nพิมพ์ 'เมนู' หรือ 'Help' เพื่อดูคู่มือสอบถามข้อมูลนะคะ`,
    },
  ]);
}

async function handlePostbackEvent(event) {
  const replyToken = event.replyToken;
  const dataStr = event.postback.data;
  console.log(`🎯 Postback event received: "${dataStr}"`);

  const params = Object.fromEntries(new URLSearchParams(dataStr));

  if (!supabase) return;

  // Case: User requested list of districts for personnel
  if (params.action === 'list_districts') {
    const districts = [
      'เมืองนครปฐม',
      'กำแพงแสน',
      'นครชัยศรี',
      'ดอนตูม',
      'บางเลน',
      'สามพราน',
      'พุทธมณฑล',
    ];
    const quickReplyItems = districts.map((dist) => ({
      type: 'action',
      action: {
        type: 'postback',
        data: `action=agri_areas_by_district&district=${dist}`,
        label: dist,
        displayText: `สอบถามพื้นที่ปลูก อ.${dist}`,
      },
    }));

    await sendLineReply(
      replyToken,
      [
        {
          type: 'text',
          text: '🌾 เลือกอำเภอที่ต้องการสอบถามพื้นที่ปลูกการเกษตรค่ะ:',
          quickReply: {
            items: quickReplyItems,
          },
        },
      ],
      event.source?.userId
    );
    return;
  }

  // Case: User requested agricultural areas for a specific district
  if (params.action === 'agri_areas_by_district') {
    const district = params.district;
    const queryDistrict = district === 'เมืองนครปฐม' ? 'เมือง' : district;
    const { data, error } = await supabase
      .from('agricultural_areas')
      .select('*')
      .eq('district', queryDistrict)
      .limit(10);

    if (error) {
      console.error(error);
      await sendLineReply(
        replyToken,
        [
          {
            type: 'text',
            text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูลพื้นที่การเกษตร',
          },
        ],
        event.source?.userId
      );
      return;
    }

    if (data && data.length > 0) {
      // Generate bubbles for agricultural_areas category search results
      const categories = [
        {
          table: 'agricultural_areas',
          totalCount: data.length,
          results: data,
        },
      ];
      const searchMessage = createGlobalSearchCarousel(
        categories,
        `พื้นที่เกษตร อ.${district}`
      );
      await sendLineReply(replyToken, [searchMessage], event.source?.userId);
    } else {
      await sendLineReply(
        replyToken,
        [
          {
            type: 'text',
            text: `ไม่พบข้อมูลพื้นที่ปลูกการเกษตรใน อ.${district} ในขณะนี้ค่ะ`,
          },
        ],
        event.source?.userId
      );
    }
    return;
  }

  // Case: User requested personnel for a specific district
  if (params.action === 'personnel_by_district') {
    const district = params.district;
    const { data } = await supabase
      .from('personnel')
      .select('*')
      .eq('district', district)
      .limit(10);

    if (data && data.length > 0) {
      await sendLineReply(
        replyToken,
        [createPersonnelCarousel(data, `รายชื่อข้าราชการ อ.${district}`)],
        event.source?.userId
      );
    } else {
      await sendLineReply(
        replyToken,
        [
          {
            type: 'text',
            text: `ไม่พบรายชื่อบุคลากรเกษตรอำเภอ ${district} ในขณะนี้ค่ะ`,
          },
        ],
        event.source?.userId
      );
    }
    return;
  }

  // Case: User requested provincial personnel
  if (params.action === 'personnel_provincial') {
    const { data } = await supabase
      .from('personnel')
      .select('*')
      .eq('office_type', 'Provincial')
      .limit(10);

    if (data && data.length > 0) {
      await sendLineReply(replyToken, [
        createPersonnelCarousel(data, 'รายชื่อบุคลากรระดับจังหวัด'),
      ]);
    } else {
      await sendLineReply(replyToken, [
        { type: 'text', text: 'ไม่พบรายชื่อบุคลากรระดับจังหวัดในขณะนี้ค่ะ' },
      ]);
    }
    return;
  }

  // Case: User clicked Large Plots main menu
  if (params.action === 'large_plots_menu') {
    const crops = ['ส้มโอ', 'กล้วยไม้', 'ข้าว', 'มะพร้าวน้ำหอม', 'มะนาว'];
    const quickReplies = crops.map((crop) => ({
      type: 'action',
      action: {
        type: 'message',
        label: crop,
        text: `แปลงใหญ่: ${crop}`,
      },
    }));

    await sendLineReply(replyToken, [
      {
        type: 'text',
        text: "🌾 เลือกพืชแปลงใหญ่ยอดนิยม หรือพิมพ์ 'แปลงใหญ่: [ชื่อพืช]' เพื่อค้นหาพืชชนิดอื่นได้ค่ะ:",
        quickReply: {
          items: quickReplies,
        },
      },
    ]);
    return;
  }

  // Case: User clicked Farmer Groups main menu
  if (params.action === 'farmer_groups_menu') {
    const groupTypes = [
      { label: 'กลุ่มแม่บ้านเกษตรกร', text: 'กลุ่มแม่บ้านเกษตรกร' },
      { label: 'กลุ่มยุวเกษตรกร', text: 'กลุ่มยุวเกษตรกร' },
      { label: 'กลุ่มส่งเสริมอาชีพ', text: 'กลุ่มส่งเสริมอาชีพการเกษตร' },
      { label: 'สถาบันเกษตรกร', text: 'สถาบันเกษตรกร' },
    ];
    const quickReplies = groupTypes.map((type) => ({
      type: 'action',
      action: {
        type: 'message',
        label: type.label,
        text: type.text,
      },
    }));

    await sendLineReply(
      replyToken,
      [
        {
          type: 'text',
          text: '🤝 เลือกประเภทกลุ่มเกษตรกรที่ต้องการสืบค้นข้อมูลค่ะ:',
          quickReply: {
            items: quickReplies,
          },
        },
      ],
      event.source?.userId
    );
    return;
  }

  // Case: Weather postback
  if (params.action === 'weather') {
    const { data } = await supabase
      .from('daily_weather')
      .select('*')
      .order('date', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      await sendLineReply(replyToken, [createWeatherMessage(data[0])]);
    } else {
      await sendLineReply(replyToken, [
        { type: 'text', text: '❌ ขออภัยค่ะ ไม่พบข้อมูลสภาพอากาศในขณะนี้' },
      ]);
    }
    return;
  }

  // Case: Fire hotspots postback
  if (params.action === 'fire') {
    const { data } = await supabase
      .from('fire_hotspots')
      .select('*')
      .order('acq_date', { ascending: false })
      .order('acq_time', { ascending: false })
      .limit(5);

    await sendLineReply(replyToken, [createFireHotspotsMessage(data || [])]);
    return;
  }
}

// ----------------------------------------------------
// MAIN WEBHOOK EXPORT
// ----------------------------------------------------
exports.handler = async function (event, context) {
  const startTime = Date.now();
  const requestId =
    event.headers?.['x-nf-request-id'] || crypto.randomBytes(8).toString('hex');

  // Debug endpoint: GET /.netlify/functions/line-webhook?debug=1
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ok',
        supabase: !!supabase,
        hasChannelSecret: !!LINE_CHANNEL_SECRET,
        hasAccessToken: !!LINE_CHANNEL_ACCESS_TOKEN,
        supabaseUrl: SUPABASE_URL
          ? SUPABASE_URL.substring(0, 30) + '...'
          : null,
        timestamp: new Date().toISOString(),
      }),
    };
  }

  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const signature =
    event.headers['x-line-signature'] ||
    event.headers['X-Line-Signature'] ||
    event.headers['X-LINE-SIGNATURE'];
  const rawBody =
    event.isBase64Encoded && event.body
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;

  // Log debug information without exposing sensitive raw request parameters
  console.log(JSON.stringify({ requestId, httpMethod: event.httpMethod }));

  // Validate LINE Signature
  if (
    LINE_CHANNEL_SECRET &&
    !verifySignature(rawBody, signature, LINE_CHANNEL_SECRET)
  ) {
    console.error(
      JSON.stringify({ requestId, error: 'Signature verification failed' })
    );
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized signature' }),
    };
  }

  const isBackground =
    process.env.NODE_ENV === 'test' ||
    event.queryStringParameters?.background === 'true' ||
    event.headers['x-local-background'] === 'true';

  if (!isBackground) {
    try {
      const host = event.headers.host || event.headers.Host;
      const isHttps =
        event.headers['x-forwarded-proto'] === 'https' ||
        !host.includes('localhost');
      const protocol = isHttps ? 'https' : 'http';
      const bgFunctionUrl = `${protocol}://${host}/.netlify/functions/line-webhook-background?background=true`;

      console.log(
        `[Proxy] Forwarding webhook to background function: ${bgFunctionUrl}`
      );

      // We await the fetch to ensure Netlify has accepted and queued the task.
      // Background functions return a 202 Accepted response almost immediately.
      await fetch(bgFunctionUrl, {
        method: 'POST',
        headers: {
          ...event.headers,
          'x-local-background': 'true',
        },
        body: rawBody,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Accepted (queued)' }),
      };
    } catch (err) {
      console.error('[Proxy] Failed to trigger background function:', err);
      console.log('[Proxy] Falling back to synchronous processing...');
    }
  }

  try {
    const payload = JSON.parse(rawBody);
    const events = payload.events || [];

    console.log(JSON.stringify({ requestId, eventCount: events.length }));

    for (const evt of events) {
      try {
        if (evt.type === 'message') {
          console.log(
            JSON.stringify({
              requestId,
              eventType: evt.type,
              messageType: evt.message?.type,
            })
          );
          await handleMessageEvent(evt);
          console.log(
            JSON.stringify({
              requestId,
              status: 'success',
              durationMs: Date.now() - startTime,
            })
          );
        } else if (evt.type === 'postback') {
          await handlePostbackEvent(evt);
        }
      } catch (eventErr) {
        console.error(`❌ Error processing individual event:`, eventErr);
        // Try to send a fallback error message to the user
        try {
          await sendLineReply(
            evt.replyToken,
            [
              {
                type: 'text',
                text: '⚠️ ขออภัยค่ะ เกิดข้อผิดพลาดในการประมวลผลค่ะ กรุณาลองใหม่อีกครั้งนะคะ',
              },
            ],
            evt.source?.userId
          );
        } catch (fallbackErr) {
          console.error('❌ Even fallback reply failed:', fallbackErr);
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success' }),
    };
  } catch (err) {
    console.error('Webhook processing error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

// Export helper for testing to override supabase client
if (process.env.NODE_ENV === 'test') {
  exports.setSupabase = (client) => {
    supabase = client;
  };
  exports.setLineAiOrchestrator = (orchestrator) => {
    lineAiOrchestrator = orchestrator;
  };
}
