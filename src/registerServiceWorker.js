export function registerServiceWorker(enabled = import.meta.env.PROD) {
  if (!enabled || !('serviceWorker' in navigator)) return Promise.resolve();
  return navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then(() => undefined)
    .catch((error) => {
      console.warn('[PWA] Service worker registration failed', error);
    });
}
