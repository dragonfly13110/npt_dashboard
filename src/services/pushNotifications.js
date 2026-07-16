import { supabase } from '../supabaseClient';

export const eventKey = ({ type, sourceId, district = '' }) =>
  `${type}:${sourceId}:${district}`;

export const matchesPreference = (preference, event) =>
  Boolean(preference[event.type]) &&
  (!preference.districts?.length ||
    preference.districts.includes(event.district));

export function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export const isPushSupported = () =>
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export async function subscribeToPush({ outbreak, hotspot, districts }) {
  if (!isPushSupported()) throw new Error('อุปกรณ์นี้ไม่รองรับ Web Push');
  if (!import.meta.env.VITE_VAPID_PUBLIC_KEY)
    throw new Error('ยังไม่ได้ตั้งค่า VAPID public key');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('ไม่ได้รับอนุญาตให้แจ้งเตือน');
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      import.meta.env.VITE_VAPID_PUBLIC_KEY
    ),
  });
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: subscription.endpoint,
      subscription: subscription.toJSON(),
      outbreak,
      hotspot,
      districts,
    },
    { onConflict: 'user_id,endpoint' }
  );
  if (error) throw error;
  return subscription;
}

export async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', subscription.endpoint);
  if (error) throw error;
  await subscription.unsubscribe();
}
