export function registerServiceWorker(enabled = import.meta.env.PROD) {
  if (!enabled || !('serviceWorker' in navigator)) return Promise.resolve();
  return new Promise((resolve) => {
    window.addEventListener(
      'load',
      () =>
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then(resolve),
      { once: true }
    );
  });
}
