'use strict';

function isValidDashboardUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.origin === 'https://npt-dashboard.netlify.app';
  } catch {
    return false;
  }
}

function renderAiReply({ text, records }) {
  const messages = [];

  if (text) {
    messages.push({
      type: 'text',
      text: text,
    });
  }

  if (records && Array.isArray(records) && records.length > 0) {
    const bubbles = records.slice(0, 3).map((record) => {
      const title = String(record.title || 'ข้อมูล').slice(0, 40);
      const subtitle = String(record.subtitle || '-').slice(0, 60);
      const rawUrl = record.url;
      const url = isValidDashboardUrl(rawUrl)
        ? rawUrl
        : 'https://npt-dashboard.netlify.app/dashboard';

      return {
        type: 'bubble',
        size: 'micro',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: title,
              weight: 'bold',
              size: 'sm',
              wrap: true,
            },
            {
              type: 'text',
              text: subtitle,
              size: 'xs',
              color: '#64748b',
              wrap: true,
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
                label: record.totalCount
                  ? `ดูทั้งหมด ${record.totalCount} รายการ`
                  : 'เปิดดูรายละเอียด',
                uri: url,
              },
            },
          ],
        },
      };
    });

    if (bubbles.length > 0) {
      messages.push({
        type: 'flex',
        altText: (text || 'พบข้อมูลจากระบบ').slice(0, 400),
        contents: {
          type: 'carousel',
          contents: bubbles,
        },
      });
    }
  }

  if (messages.length === 0) {
    messages.push({
      type: 'text',
      text: '',
    });
  }

  return messages;
}

function validateLineMessages(messages) {
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 5) {
    throw new Error('LINE messages count must be between 1 and 5');
  }

  const allowedTypes = [
    'text',
    'flex',
    'image',
    'video',
    'audio',
    'location',
    'sticker',
    'template',
  ];

  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') {
      throw new Error('Invalid message format');
    }
    if (!allowedTypes.includes(msg.type)) {
      throw new Error(`Unsupported message type: ${msg.type}`);
    }
    if (msg.bubbles !== undefined) {
      throw new Error(
        'Flex message must not have bubbles property on the top level'
      );
    }

    if (msg.type === 'text') {
      if (typeof msg.text !== 'string' || msg.text.trim() === '') {
        throw new Error('Text message must have a non-empty text property');
      }
    }

    if (msg.type === 'flex') {
      if (!msg.altText || typeof msg.altText !== 'string') {
        throw new Error('Flex message requires altText');
      }
      if (!msg.contents || typeof msg.contents !== 'object') {
        throw new Error('Flex message requires contents object');
      }
      if (msg.contents.bubbles !== undefined) {
        throw new Error('Flex contents must not have a bubbles property');
      }
      if (msg.contents.type === 'carousel') {
        if (!Array.isArray(msg.contents.contents)) {
          throw new Error('Carousel Flex message must have a contents array');
        }
      }
    }
  }
}

module.exports = {
  renderAiReply,
  validateLineMessages,
};
