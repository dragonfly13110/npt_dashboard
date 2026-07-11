import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import crypto from 'node:crypto';

import { getConfig } from '../../../netlify/functions/lib/line-ai/config.js';
import { createLineAiStore } from '../../../netlify/functions/lib/line-ai/store.js';
import { createKeyPool } from '../../../netlify/functions/lib/line-ai/key-pool.js';
import { createGeminiClient } from '../../../netlify/functions/lib/line-ai/gemini.js';
import { executeTools } from '../../../netlify/functions/lib/line-ai/tools.js';
import { renderAiReply } from '../../../netlify/functions/lib/line-ai/flex.js';
import { createLineAiOrchestrator } from '../../../netlify/functions/lib/line-ai/orchestrator.js';

import datasetCatalog from '../../../src/domain/datasetCatalog.json' with { type: 'json' };
const { TABLE_ROUTES } = datasetCatalog;

// Initialize Supabase Client
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const LINE_CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET') || '';
const LINE_CHANNEL_ACCESS_TOKEN =
  Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') || '';

let lineAiOrchestrator: any = null;

function getOrchestrator() {
  if (lineAiOrchestrator) return lineAiOrchestrator;
  try {
    const config = getConfig();
    if (!config.enabled || config.geminiApiKeys.size === 0) return null;
    const store = createLineAiStore(supabase);
    const keyPool = createKeyPool({ keys: config.geminiApiKeys, store });
    const gemini = createGeminiClient({
      model: config.model,
      fallbacks: config.fallbackModels,
      timeoutMs: config.geminiTimeoutMs,
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

// Verify signature of the incoming LINE webhook event
function verifySignature(
  body: string,
  signature: string | null,
  channelSecret: string
) {
  if (!signature || !channelSecret) return false;
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

// Send push message back to user via LINE Messaging API
async function sendLinePush(to: string, messages: any[]) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn('⚠️ LINE_CHANNEL_ACCESS_TOKEN is not configured.');
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
async function sendLineLoading(chatId: string, loadingSeconds = 20) {
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
async function sendLineReply(
  replyToken: string,
  messages: any[],
  userId: string | null = null
) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn('⚠️ LINE_CHANNEL_ACCESS_TOKEN is not configured.');
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

// Flex message template generators
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

function createWeatherMessage(weatherRecord: any) {
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

function createPersonnelCarousel(
  personnelList: any[],
  title = 'รายชื่อบุคลากร'
) {
  const cards = personnelList.slice(0, 10).map((person) => {
    const phoneClean = person.phone ? person.phone.replace(/[^0-9]/g, '') : '';
    const footerContents: any[] = [];

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

function createLargePlotsCarousel(plots: any[], title = 'ข้อมูลแปลงใหญ่') {
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

function createFireHotspotsMessage(hotspots: any[]) {
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

const TABLE_METADATA: Record<string, any> = {
  personnel: {
    label: 'บุคลากรเกษตร',
    icon: '👤',
    getDisplay: (row: any) => ({
      title: row.full_name,
      subtitle: `${row.position || 'ไม่ระบุตำแหน่ง'} • ${row.department || '-'}`,
      info: row.phone ? `📞 ${row.phone}` : '',
    }),
  },
  farmer_registry: {
    label: 'ทะเบียนเกษตรกร',
    icon: '📋',
    getDisplay: (row: any) => ({
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
    getDisplay: (row: any) => ({
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
    getDisplay: (row: any) => ({
      title: row.center_name,
      subtitle: `อ.${row.district || '-'} • ผู้จัดการ: ${row.manager || '-'}`,
      info: row.main_crop ? `พืชหลัก: ${row.main_crop}` : '',
    }),
  },
  daily_weather: {
    label: 'สภาพอากาศ/น้ำฝน',
    icon: '🌧️',
    getDisplay: (row: any) => ({
      title: `สภาพอากาศ อ.${row.district || '-'}`,
      subtitle: `อุณหภูมิ: ${row.temperature_c || '-'} °C • ฝน: ${row.rainfall_mm || 0} มม.`,
      info: row.record_date ? `วันที่: ${row.record_date}` : '',
    }),
  },
  large_plots: {
    label: 'แปลงใหญ่',
    icon: '🌿',
    getDisplay: (row: any) => ({
      title: row.plot_name || `แปลงใหญ่${row.commodity || ''}`,
      subtitle: `อ.${row.district || '-'} • สมาชิก: ${row.member_count || 0} ราย`,
      info: row.area_rai ? `พื้นที่: ${row.area_rai} ไร่` : '',
    }),
  },
  certifications: {
    label: 'มาตรฐาน GAP',
    icon: '✅',
    getDisplay: (row: any) => ({
      title: row.farm_name || 'สวนเกษตรมาตรฐาน GAP',
      subtitle: `อ.${row.district || '-'} • ${row.cert_type || ''} (${row.status || ''})`,
      info: row.commodity ? `พืช: ${row.commodity}` : '',
    }),
  },
  crop_production: {
    label: 'ผลผลิตพืช',
    icon: '🌽',
    getDisplay: (row: any) => ({
      title: `ผลผลิต${row.crop_name || ''}`,
      subtitle: `อ.${row.district || '-'} • ผลผลิต: ${row.production_ton || 0} ตัน`,
      info: row.planted_area ? `พื้นที่ปลูก: ${row.planted_area} ไร่` : '',
    }),
  },
  production_costs: {
    label: 'ต้นทุนการผลิต',
    icon: '💰',
    getDisplay: (row: any) => ({
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
    getDisplay: (row: any) => ({
      title: row.enterprise_name,
      subtitle: `อ.${row.district || '-'} • ${row.enterprise_type || ''}`,
      info: row.member_count ? `สมาชิก: ${row.member_count} คน` : '',
    }),
  },
  smart_farmers: {
    label: 'เกษตรกรรุ่นใหม่',
    icon: '👨‍🌾',
    getDisplay: (row: any) => ({
      title: row.full_name,
      subtitle: `อ.${row.district || '-'} • ประเภท: ${row.farmer_type || ''}`,
      info: row.main_product ? `พืชหลัก: ${row.main_product}` : '',
    }),
  },
  smart_farmer_sf: {
    label: 'เกษตรกรปราดเปรื่อง (SF)',
    icon: '🧑‍🌾',
    getDisplay: (row: any) => ({
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
    getDisplay: (row: any) => ({
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
    getDisplay: (row: any) => ({
      title: row.group_name,
      subtitle: `อ.${row.district || '-'} • กิจกรรมหลัก: ${row.main_activity || ''}`,
      info: row.member_count ? `สมาชิก: ${row.member_count} ราย` : '',
    }),
  },
  housewife_farmer_groups: {
    label: 'กลุ่มแม่บ้านเกษตรกร',
    icon: '👩‍🌾',
    getDisplay: (row: any) => ({
      title: row.group_name,
      subtitle: `อ.${row.district || '-'} • กิจกรรม: ${row.activity || ''}`,
      info: row.member_count ? `สมาชิก: ${row.member_count} ราย` : '',
    }),
  },
  young_farmer_groups_detailed: {
    label: 'กลุ่มยุวเกษตรกร',
    icon: '🌱',
    getDisplay: (row: any) => ({
      title: row.group_name,
      subtitle: `อ.${row.district || '-'} • กิจกรรม: ${row.activity || ''}`,
      info: row.member_count ? `สมาชิก: ${row.member_count} ราย` : '',
    }),
  },
  farmer_institutes: {
    label: 'สถาบันเกษตรกร',
    icon: '🤝',
    getDisplay: (row: any) => ({
      title: row.name || row.group_name || 'สถาบันเกษตรกร',
      subtitle: `อ.${row.district || '-'} • ประเภท: ${row.type || ''}`,
      info: row.member_count ? `สมาชิก: ${row.member_count} คน` : '',
    }),
  },
  agri_tourism: {
    label: 'ท่องเที่ยวเกษตร',
    icon: '🏕️',
    getDisplay: (row: any) => ({
      title: row.spot_name,
      subtitle: `อ.${row.district || '-'} • ประเภท: ${row.spot_type || ''}`,
      info: row.contact_person ? `ติดต่อ: ${row.contact_person}` : '',
    }),
  },
  disasters: {
    label: 'ภัยพิบัติ',
    icon: '⛈️',
    getDisplay: (row: any) => ({
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
    getDisplay: (row: any) => ({
      title: row.plot_name || 'แปลงพยากรณ์',
      subtitle: `อ.${row.district || '-'} • เจ้าของ: ${row.owner_name || ''}`,
      info: row.crop_type ? `พืช: ${row.crop_type} (${row.variety || ''})` : '',
    }),
  },
  ai_disease_forecasts: {
    label: 'พยากรณ์โรค & แมลง',
    icon: '🤖',
    getDisplay: (row: any) => ({
      title: row.name,
      subtitle: `พืชเป้าหมาย: ${row.target_crop || ''}`,
      info: `ระดับความเสี่ยง: ${row.risk_level || ''}`,
    }),
  },
  pest_centers: {
    label: 'ศจช. (ศัตรูพืชชุมชน)',
    icon: '🏥',
    getDisplay: (row: any) => ({
      title: row.center_name,
      subtitle: `อ.${row.district || '-'} • ประธาน: ${row.chairman || ''}`,
      info: row.main_crop_type ? `พืชหลัก: ${row.main_crop_type}` : '',
    }),
  },
  plant_doctors: {
    label: 'หมอพืช',
    icon: '🩺',
    getDisplay: (row: any) => ({
      title: row.full_name,
      subtitle: `อ.${row.district || '-'} ต.${row.subdistrict || '-'}`,
      info: 'หมอพืชชุมชนประจำจังหวัดนครปฐม',
    }),
  },
  soil_fertilizer_centers: {
    label: 'ศดปช. (ดินปุ๋ยชุมชน)',
    icon: '🧪',
    getDisplay: (row: any) => ({
      title: row.center_name,
      subtitle: `อ.${row.district || '-'} • ประธาน: ${row.chairman || ''}`,
      info: row.main_crop_type ? `พืชหลัก: ${row.main_crop_type}` : '',
    }),
  },
  fire_hotspots: {
    label: 'จุดเฝ้าระวัง PM2.5',
    icon: '🔥',
    getDisplay: (row: any) => ({
      title: row.spot_name || 'จุดความร้อนไฟป่า',
      subtitle: `อ.${row.district || '-'} • ระดับความเสี่ยง: ${row.risk_level || ''}`,
      info: row.year ? `ปี: ${row.year}` : '',
    }),
  },
  budgets: {
    label: 'งบประมาณ',
    icon: '💰',
    getDisplay: (row: any) => {
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

function filterCategoriesByQuery(categories: any[], queryText: string) {
  if (!queryText || !Array.isArray(categories)) return categories;
  const q = queryText.toLowerCase();

  let allowedTables: string[] | null = null;

  if (
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
    allowedTables = ['ai_disease_forecasts', 'pest_centers', 'plant_doctors'];
  }

  if (allowedTables) {
    const filtered = categories.filter((cat) =>
      allowedTables!.includes(cat.table)
    );
    if (filtered.length > 0) {
      return filtered;
    }
  }

  return categories;
}

function createGlobalSearchCarousel(categories: any[], searchTerm: string) {
  const bubbles = categories.slice(0, 10).map((cat) => {
    const meta = TABLE_METADATA[cat.table] || {
      label: cat.table,
      icon: '📂',
      getDisplay: (row: any) => ({
        title: JSON.stringify(row),
        subtitle: '',
        info: '',
      }),
    };

    const displayItems = cat.results
      .slice(0, 3)
      .map((row: any, idx: number) => {
        const display = meta.getDisplay(row);
        const contents: any[] = [
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
          spacing: 'xs',
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
              spacing: 'xs',
              contents: contents,
            },
          ];
        }

        return [itemBox];
      })
      .flat();

    const route = TABLE_ROUTES[cat.table as keyof typeof TABLE_ROUTES];
    const footerContents: any[] = [];
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

async function handleMessageEvent(event: any) {
  const replyToken = event.replyToken;
  if (event.message.type !== 'text') return;

  const text = event.message.text.trim();
  console.log('💬 Processing text message event');

  if (/^(สวัสดี|หวัดดี|hello|hi)(ครับ|ค่ะ|คะ)?/i.test(text)) {
    await sendLineReply(replyToken, [
      {
        type: 'text',
        text: 'สวัสดีค่ะ มีอะไรให้ช่วยค้นหาข้อมูลการเกษตรคะ 🌾',
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

  // AI-only for every free-text message; local handlers above are navigation only.
  if (text.length >= 2) {
    const orchestratorInstance = getOrchestrator();
    if (orchestratorInstance) {
      if (event.source?.type === 'user' && event.source?.userId) {
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
      console.warn(`⚠️ AI returned null after ${aiDurationMs}ms`);
    }
    await sendLineReply(replyToken, [
      {
        type: 'text',
        text: 'ระบบ AI ยังตอบไม่ได้ กรุณาลองใหม่อีกครั้งค่ะ',
      },
    ]);
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

  // Local Conversational Basics
  const lowercaseText = text.toLowerCase();

  // A. GREETINGS
  const greetingKeywords = [
    'สวัสดี',
    'หวัดดี',
    'ทักทาย',
    'hello',
    'hi',
    'เฮลโล',
    'ยินดีที่ได้รู้จัก',
    'sawatdee',
    'ดีจ้า',
    'ดีครับ',
    'ดีค่ะ',
  ];
  if (greetingKeywords.some((kw) => lowercaseText.includes(kw))) {
    const greetingText = `🌾 สวัสดีค่ะ! หนู "น้องข้าวหลาม" AI ผู้ช่วยข้อมูลเกษตรประจำจังหวัดนครปฐม ยินดีที่ได้คุยด้วยนะคะ! 😊

หนูสามารถช่วยสืบค้นข้อมูลการเกษตรของจังหวัดนครปฐมในทุกอำเภอ (เมืองนครปฐม, กำแพงแสน, นครชัยศรี, ดอนตูม, บางเลน, สามพราน, พุทธมณฑล) ได้ค่ะ เช่น:
• 📊 ค้นหาข้อมูลพื้นที่เกษตรกรรม หรือจำนวนครัวเรือนเกษตรกร
• 🌿 ค้นหากลุ่มแปลงใหญ่ พืชหลัก สมาชิก และพื้นที่แปลง
• ✅ ข้อมูลมาตรฐาน GAP ใบรับรอง และสถานะการผลิต
• 🏪 รายชื่อวิสาหกิจชุมชน และกลุ่มส่งเสริมอาชีพต่างๆ
• 🌧️ ตรวจสอบสภาพอากาศ อุณหภูมิ และปริมาณน้ำฝนล่าสุด
• 🔥 แจ้งเตือนจุดความร้อนไฟป่า และค่าฝุ่น PM 2.5
• 🔬 ตรวจสอบประวัติแปลงพยากรณ์โรคและแมลงศัตรูพืช

💡 คุณพี่อยากทราบข้อมูลส่วนไหน สามารถพิมพ์ถามหนูมาได้เลย หรือพิมพ์ 'เมนู' เพื่อเปิดดูคู่มือการสอบถามข้อมูลอย่างละเอียดได้ตลอดเวลาเลยนะคะ! 💚`;
    await sendLineReply(replyToken, [{ type: 'text', text: greetingText }]);
    return;
  }

  // B. VENTING / COMPLAINING
  const ventKeywords = [
    'เบื่อ',
    'เซ็ง',
    'ร้อน',
    'เหนื่อย',
    'ช้า',
    'แพง',
    'ยาก',
    'บ้า',
    'เครียด',
    'ท้อ',
    'ไม่ได้เรื่อง',
    'ห่วย',
    'พัง',
    'เศร้า',
    'โมโห',
    'หงุดหงิด',
  ];
  if (ventKeywords.some((kw) => lowercaseText.includes(kw))) {
    const ventText = `💚 น้องข้าวหลามรับทราบและเข้าใจความรู้สึกของคุณพี่เลยค่ะ... โอบกอดและส่งกำลังใจให้นะคะ! 🫂✨

การทำการเกษตรหรือการทำงานในแต่ละวันบางครั้งก็มีเรื่องให้เหน็ดเหนื่อย ทั้งเรื่องสภาพอากาศที่แปรปรวน ราคาสินค้า หรือความล่าช้าต่างๆ แต่อย่าเพิ่งท้อแท้นะคะ! หนูพร้อมอยู่เคียงข้างและช่วยหาข้อมูลสนับสนุนเพื่อช่วยแก้ปัญหาให้คุณพี่เสมอค่ะ

หากคุณพี่รู้สึกเหนื่อยล้าหรือกังวลเรื่องการเกษตรในพื้นที่ ลองตรวจสอบข้อมูลเหล่านี้ดูไหมคะเพื่อเตรียมรับมือล่วงหน้า:
1. 🌧️ พิมพ์ "สภาพอากาศ" เพื่อเช็คปริมาณฝนและอุณหภูมิวันนี้
2. 🔥 พิมพ์ "ไฟป่า" เพื่อเฝ้าระวังจุดความร้อนในพื้นที่นครปฐม
3. 🏥 พิมพ์ "ศจช" เพื่อติดต่อศูนย์จัดการศัตรูพืชชุมชนในพื้นที่หากพบแมลงระบาด

ถ้ามีอะไรที่หนูพอจะช่วยแบ่งเบาหรืออำนวยความสะดวกในการค้นหาข้อมูลได้ พิมพ์บอกหนูได้ทันทีเลยนะคะ ขอให้วันนี้เป็นวันที่ดีขึ้นและมีความสุขมากขึ้นค่ะ! 🌾🌸`;
    await sendLineReply(replyToken, [{ type: 'text', text: ventText }]);
    return;
  }

  // C. GOODBYES
  const goodbyeKeywords = [
    'ลาก่อน',
    'บาย',
    'บ๊ายบาย',
    'bye',
    'ขอบคุณ',
    'thanks',
    'ขอบใจ',
    'ไปละ',
    'ไปแล้ว',
    'โชคดี',
    'ขอบคุณครับ',
    'ขอบคุณค่ะ',
    'thank you',
    'แต๊งกิ้ว',
  ];
  if (goodbyeKeywords.some((kw) => lowercaseText.includes(kw))) {
    const goodbyeText = `🌾 ด้วยความยินดีเป็นอย่างยิ่งเลยค่ะ! ขอบคุณมากๆ ที่แวะมาร่วมพูดคุยและใช้งานบริการข้อมูลของน้องข้าวหลามในวันนี้ การดูแลคุณพี่ถือเป็นงานสำคัญที่สุดของหนูเลยค่ะ 😊

หากวันข้างหน้าคุณพี่ต้องการค้นหาข้อมูลแปลงใหญ่ ทะเบียนเกษตรกร มาตรฐาน GAP สภาพอากาศ หรือจุดความร้อน PM 2.5 อีกครั้ง สามารถแชทมาหาน้องข้าวหลามได้ตลอด 24 ชั่วโมงเลยนะคะ 

รักษาสุขภาพ พักผ่อนให้เต็มที่ และขอให้ผลผลิตงอกงาม ได้ราคาดีทุกฤดูกาลค่ะ! บ๊ายบายและขอให้เดินทางปลอดภัยในทุกเส้นทางนะคะ~ 👋💚`;
    await sendLineReply(replyToken, [{ type: 'text', text: goodbyeText }]);
    return;
  }

  // 6. GLOBAL SEARCH fallback (when no command prefix matches)
  if (text.length >= 2) {
    try {
      let searchTerm = text.trim();
      if (searchTerm.length > 10) {
        const districts = [
          'กำแพงแสน',
          'นครชัยศรี',
          'ดอนตูม',
          'บางเลน',
          'สามพราน',
          'พุทธมณฑล',
          'เมืองนครปฐม',
          'เมือง',
        ];
        let matchedDist = null;
        for (const dist of districts) {
          if (searchTerm.includes(dist)) {
            matchedDist = dist === 'เมืองนครปฐม' ? 'เมือง' : dist;
            break;
          }
        }

        const crops = [
          'ข้าว',
          'กล้วยไม้',
          'มะพร้าว',
          'มะนาว',
          'ส้มโอ',
          'กระชาย',
          'กุ้ง',
          'ผัก',
          'ผลไม้',
        ];
        let matchedCrop = null;
        for (const crop of crops) {
          if (searchTerm.includes(crop)) {
            matchedCrop = crop;
            break;
          }
        }

        if (matchedDist && matchedCrop) {
          searchTerm = `${matchedDist} ${matchedCrop}`;
        } else if (matchedDist) {
          searchTerm = matchedDist;
        } else if (matchedCrop) {
          searchTerm = matchedCrop;
        }
      }

      const [personnelRes, globalRes] = await Promise.all([
        supabase
          .from('personnel')
          .select('*')
          .or(
            `full_name.ilike.%${searchTerm}%,position.ilike.%${searchTerm}%,department.ilike.%${searchTerm}%`
          )
          .limit(3),
        supabase.rpc('global_search', {
          search_term: searchTerm,
          result_limit: 3,
        }),
      ]);

      const personnelData = personnelRes.data || [];
      const globalData = globalRes.data || [];

      const categories: any[] = [];

      if (personnelData.length > 0) {
        categories.push({
          table: 'personnel',
          totalCount: personnelData.length,
          results: personnelData,
        });
      }

      if (Array.isArray(globalData)) {
        for (const item of globalData) {
          if (item.results && item.results.length > 0) {
            categories.push(item);
          }
        }
      }

      let displayCategories = categories;
      try {
        displayCategories = filterCategoriesByQuery(categories, text);
      } catch (e) {
        console.error('Error filtering categories:', e);
      }

      if (displayCategories.length > 0) {
        try {
          const searchMessage = createGlobalSearchCarousel(
            displayCategories,
            text
          );
          const sent = await sendLineReply(replyToken, [searchMessage]);
          if (sent) return;
          console.warn('⚠️ Flex carousel failed, sending text fallback');
        } catch (flexErr) {
          console.error('❌ Error building Flex carousel:', flexErr);
        }

        const summaryLines = displayCategories.slice(0, 5).map((cat) => {
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

async function handlePostbackEvent(event: any) {
  const replyToken = event.replyToken;
  const dataStr = event.postback.data;
  console.log(`🎯 Postback event received: "${dataStr}"`);

  const params = Object.fromEntries(new URLSearchParams(dataStr));

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

  if (params.action === 'registration_summary') {
    const { data, error } = await supabase
      .from('farmer_registry')
      .select(
        'district,total_updated_households,household_count,target,data_year'
      )
      .order('data_year', { ascending: false })
      .limit(20);
    if (error) {
      console.error(error);
      await sendLineReply(replyToken, [
        { type: 'text', text: 'ไม่สามารถดึงข้อมูลทะเบียนเกษตรกรได้ในขณะนี้' },
      ]);
      return;
    }

    const rows = data || [];
    const province = rows.find((row: any) =>
      ['จังหวัดนครปฐม', 'นครปฐม'].includes(row.district)
    );
    const districtActual = rows
      .filter((row: any) => !['จังหวัดนครปฐม', 'นครปฐม'].includes(row.district))
      .reduce(
        (sum: number, row: any) =>
          sum +
          Number(row.total_updated_households || row.household_count || 0),
        0
      );
    const actual = Number(
      province?.total_updated_households ||
        province?.household_count ||
        districtActual
    );
    const target = Number(province?.target || 0);
    await sendLineReply(replyToken, [
      {
        type: 'text',
        text: [
          '📋 สรุปการขึ้นทะเบียนเกษตรกร จังหวัดนครปฐม',
          `ขึ้นทะเบียนแล้ว: ${actual.toLocaleString('th-TH')} ครัวเรือน`,
          target
            ? `เป้าหมายระดับจังหวัด: ${target.toLocaleString('th-TH')} ครัวเรือน`
            : 'ยังไม่พบข้อมูลเป้าหมายระดับจังหวัด',
          'หมายเหตุ: ไม่มีการกำหนดเป้าหมายระดับอำเภอ',
        ].join('\n'),
      },
    ]);
    return;
  }

  if (params.action === 'personnel_summary') {
    const { data, error } = await supabase
      .from('personnel')
      .select('district,office_type');
    if (error) {
      console.error(error);
      await sendLineReply(replyToken, [
        { type: 'text', text: 'ไม่สามารถดึงข้อมูลบุคลากรได้ในขณะนี้' },
      ]);
      return;
    }

    const rows = data || [];
    const byDistrict = rows.reduce(
      (counts: Record<string, number>, row: any) => {
        const district = row.district || 'สำนักงานเกษตรจังหวัด';
        counts[district] = (counts[district] || 0) + 1;
        return counts;
      },
      {}
    );
    const breakdown = Object.entries(byDistrict)
      .sort(([a], [b]) => a.localeCompare(b, 'th'))
      .map(([district, count]) => `• ${district}: ${count} คน`);
    await sendLineReply(replyToken, [
      {
        type: 'text',
        text: [
          `👥 บุคลากรทั้งหมด ${rows.length.toLocaleString('th-TH')} คน`,
          ...breakdown,
        ].join('\n'),
      },
    ]);
    return;
  }

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

// Background handler for executing processing async
async function processEvents(events: any[]) {
  for (const evt of events) {
    try {
      if (evt.type === 'message') {
        await handleMessageEvent(evt);
      } else if (evt.type === 'postback') {
        await handlePostbackEvent(evt);
      }
    } catch (eventErr) {
      console.error(`❌ Error processing individual event:`, eventErr);
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
        console.error('❌ Event fallback reply failed:', fallbackErr);
      }
    }
  }
}

// Main HTTP serve entrypoint
Deno.serve(async (req: Request) => {
  // Debug endpoint: GET /line-webhook
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        status: 'ok',
        supabase: !!supabase,
        hasChannelSecret: !!LINE_CHANNEL_SECRET,
        hasAccessToken: !!LINE_CHANNEL_ACCESS_TOKEN,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const signature = req.headers.get('x-line-signature') || '';
    const rawBody = await req.text();

    // Validate LINE Signature
    if (
      LINE_CHANNEL_SECRET &&
      !verifySignature(rawBody, signature, LINE_CHANNEL_SECRET)
    ) {
      console.error('Signature verification failed');
      return new Response(JSON.stringify({ error: 'Unauthorized signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(rawBody);
    const events = payload.events || [];

    // Schedule event processing in background
    if ((globalThis as any).EdgeRuntime?.waitUntil) {
      (globalThis as any).EdgeRuntime.waitUntil(processEvents(events));
    } else {
      processEvents(events);
    }

    // Instantly return 200 OK to LINE to prevent timeout/retries
    return new Response(JSON.stringify({ message: 'Success' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
