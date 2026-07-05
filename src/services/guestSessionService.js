export async function createGuestSession() {
  const response = await fetch('/api/guest-session', { method: 'POST' });
  if (!response.ok) throw new Error('Guest session failed');
  return response.json();
}

export async function getGuestSession() {
  const response = await fetch('/api/guest-session');
  if (!response.ok) return null;
  const data = await response.json();
  return data.role === 'guest' ? data : null;
}

export async function clearGuestSession() {
  await fetch('/api/guest-session', { method: 'DELETE' }).catch(() => {});
}
