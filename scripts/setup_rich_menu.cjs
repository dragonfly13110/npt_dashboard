#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// Try to load .env manually
try {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value.trim();
      }
    }
  }
} catch (err) {
  console.warn(
    'Could not read .env file, relying on system env variables',
    err
  );
}

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!LINE_CHANNEL_ACCESS_TOKEN) {
  console.error(
    '❌ Error: LINE_CHANNEL_ACCESS_TOKEN is not configured in your environment or .env file.'
  );
  process.exit(1);
}

const richMenuPayload = {
  size: {
    width: 2500,
    height: 1686,
  },
  selected: true,
  name: 'Nong Khaolam Rich Menu',
  chatBarText: 'เมนูหลัก 🌾',
  areas: [
    // Area A (Row 1, Col 1): 🌤️ สภาพอากาศ
    {
      bounds: { x: 0, y: 0, width: 833, height: 843 },
      action: {
        type: 'postback',
        data: 'action=weather',
        displayText: '🌤️ เช็คสภาพอากาศล่าสุด',
      },
    },
    // Area B (Row 1, Col 2): 🔥 จุดความร้อน
    {
      bounds: { x: 833, y: 0, width: 833, height: 843 },
      action: {
        type: 'postback',
        data: 'action=fire',
        displayText: '🔥 สถิติจุดความร้อนสะสม',
      },
    },
    // Area C (Row 1, Col 3): 🌐 แดชบอร์ด
    {
      bounds: { x: 1666, y: 0, width: 834, height: 843 },
      action: {
        type: 'uri',
        uri: 'https://npt-dashboard.netlify.app/dashboard',
      },
    },
    // Area D (Row 2, Col 1): 🌾 สอบถามพื้นที่ปลูก
    {
      bounds: { x: 0, y: 843, width: 833, height: 843 },
      action: {
        type: 'postback',
        data: 'action=list_districts',
        displayText: '🌾 สอบถามพื้นที่ปลูกการเกษตร',
      },
    },
    // Area E (Row 2, Col 2): 🤝 กลุ่มเกษตรกร
    {
      bounds: { x: 833, y: 843, width: 833, height: 843 },
      action: {
        type: 'postback',
        data: 'action=farmer_groups_menu',
        displayText: '🤝 ข้อมูลกลุ่มเกษตรกร',
      },
    },
    // Area F (Row 2, Col 3): 💬 เมนู/ช่วยเหลือ
    {
      bounds: { x: 1666, y: 843, width: 834, height: 843 },
      action: {
        type: 'message',
        text: 'เมนู',
      },
    },
  ],
};

async function createRichMenu() {
  console.log('⏳ Creating rich menu structure on LINE...');
  const res = await fetch('https://api.line.me/v2/bot/richmenu', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(richMenuPayload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create rich menu: ${res.status} ${text}`);
  }

  const data = await res.json();
  console.log(`✅ Rich menu structure created successfully!`);
  console.log(`🆔 Rich Menu ID: ${data.richMenuId}`);
  return data.richMenuId;
}

async function uploadRichMenuImage(richMenuId, imagePath) {
  console.log(`⏳ Uploading rich menu background image from ${imagePath}...`);
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found at: ${imagePath}`);
  }

  const fileStats = fs.statSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  const fileBuffer = fs.readFileSync(imagePath);

  const res = await fetch(
    `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
    {
      method: 'POST',
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileStats.size,
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: fileBuffer,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to upload image: ${res.status} ${text}`);
  }

  console.log(`✅ Rich menu image uploaded successfully!`);
}

async function setDefaultRichMenu(richMenuId) {
  console.log(
    `⏳ Setting rich menu ${richMenuId} as the default for all users...`
  );
  const res = await fetch(
    `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to set default rich menu: ${res.status} ${text}`);
  }

  console.log(`✅ Rich menu is now set as the DEFAULT menu!`);
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0];

  if (!mode || (mode !== '--create-only' && mode !== '--activate')) {
    console.log(`
🤖 LINE Rich Menu Setup Helper

Usage:
  node scripts/setup_rich_menu.cjs --create-only
  node scripts/setup_rich_menu.cjs --activate <path_to_image_file>

Options:
  --create-only                 Creates the rich menu structure on LINE and prints the ID.
  --activate <image_path>       Creates the structure, uploads the background image, and sets it as the default menu.
    `);
    process.exit(1);
  }

  try {
    if (mode === '--create-only') {
      const id = await createRichMenu();
      console.log(
        `\n👉 Next step: Upload your background image (2500x1686 px) to this Rich Menu ID.`
      );
    } else if (mode === '--activate') {
      const imagePath = args[1];
      if (!imagePath) {
        console.error(
          '❌ Error: Please specify the path to your rich menu background image (PNG or JPG, 2500x1686 px).'
        );
        process.exit(1);
      }
      const absoluteImagePath = path.resolve(imagePath);
      const richMenuId = await createRichMenu();
      await uploadRichMenuImage(richMenuId, absoluteImagePath);
      await setDefaultRichMenu(richMenuId);
      console.log('\n🎉 Rich menu is active and ready to use on LINE!');
    }
  } catch (err) {
    console.error(`❌ Process failed:`, err.message);
    process.exit(1);
  }
}

main();
