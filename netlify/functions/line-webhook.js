import { createClient } from '@supabase/supabase-js';
import {
  setSupabase,
  setLineAiOrchestrator,
  processEvents,
} from './lib/line-ai/webhook-core.js';
import crypto from 'node:crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

if (supabase) {
  setSupabase(supabase);
}

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;

function verifySignature(body, signature, channelSecret) {
  if (!signature || !channelSecret) return false;
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

export async function handler(event) {
  const requestId =
    event.headers?.['x-nf-request-id'] ||
    Math.random().toString(36).substring(7);

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

  try {
    const payload = JSON.parse(rawBody);
    const events = payload.events || [];

    console.log(JSON.stringify({ requestId, eventCount: events.length }));

    await processEvents(events);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success' }),
    };
  } catch (err) {
    console.error('Webhook processing error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook unavailable' }),
    };
  }
}

export { setSupabase, setLineAiOrchestrator };
