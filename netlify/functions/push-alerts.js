import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export function collectAlertEvents({ outbreaks = [], hotspots = [] }) {
  return [
    ...outbreaks.map((row) => ({
      eventKey: `outbreak:${row.id}`,
      type: 'outbreak',
      district: row.district || '',
      title: 'แจ้งเตือนการระบาด',
      body: `พบ${row.pest_name || 'ศัตรูพืช'}${row.affected_crop ? `ใน${row.affected_crop}` : ''}${row.district ? ` อ.${row.district}` : ''}`,
      url: '/dashboard/protection/pest-outbreaks',
      source: row,
    })),
    ...hotspots.map((row) => ({
      eventKey: `hotspot:${row.id}`,
      type: 'hotspot',
      district: row.district || '',
      title: 'แจ้งเตือนจุดเผาใหม่',
      body: `พบจุดความร้อน${row.district ? ` อ.${row.district}` : 'ในนครปฐม'}`,
      url: '/dashboard/protection/fire-hotspots',
      source: row,
    })),
  ];
}

const matches = (subscription, event) =>
  Boolean(subscription[event.type]) &&
  (!subscription.districts?.length ||
    subscription.districts.includes(event.district));

export async function deliverAlerts({
  subscriptions,
  events,
  sentKeys,
  send,
  remove,
  markSent,
}) {
  let sent = 0;
  let expired = 0;
  for (const event of events) {
    if (sentKeys.has(event.eventKey)) continue;
    const targets = subscriptions.filter((item) => matches(item, event));
    let handled = false;
    for (const target of targets) {
      try {
        await send(target.subscription, JSON.stringify(event));
        sent += 1;
        handled = true;
      } catch (error) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await remove(target.endpoint);
          expired += 1;
          handled = true;
        } else {
          console.error('[push-alerts] send failed', error);
        }
      }
    }
    if (handled) await markSent(event);
  }
  return { sent, expired };
}

export async function runPushAlerts() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@npt.go.th';
  if (!url || !key || !publicKey || !privateKey) {
    throw new Error('Missing Supabase service role or VAPID configuration');
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  webpush.setVapidDetails(subject, publicKey, privateKey);
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const [outbreaks, hotspots, subscriptions, sentEvents] = await Promise.all([
    supabase.from('pest_outbreaks').select('*').gte('created_at', since),
    supabase.from('fire_hotspots').select('*').gte('created_at', since),
    supabase.from('push_subscriptions').select('*'),
    supabase
      .from('push_alert_events')
      .select('event_key')
      .gte('created_at', since),
  ]);
  for (const result of [outbreaks, hotspots, subscriptions, sentEvents]) {
    if (result.error) throw result.error;
  }

  return deliverAlerts({
    subscriptions: subscriptions.data || [],
    events: collectAlertEvents({
      outbreaks: outbreaks.data,
      hotspots: hotspots.data,
    }),
    sentKeys: new Set((sentEvents.data || []).map((row) => row.event_key)),
    send: webpush.sendNotification,
    remove: async (endpoint) => {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);
      if (error) throw error;
    },
    markSent: async (event) => {
      const { error } = await supabase.from('push_alert_events').insert({
        event_key: event.eventKey,
        event_type: event.type,
        district: event.district || null,
        payload: event.source,
      });
      if (error && error.code !== '23505') throw error;
    },
  });
}

const scheduledHandler = async () => {
  const result = await runPushAlerts();
  console.log('[push-alerts]', result);
  return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = schedule('*/15 * * * *', scheduledHandler);
