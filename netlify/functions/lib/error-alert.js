function getEnv(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || '';
}

function safeLabel(value, fallback) {
  return String(value || fallback)
    .replace(/[\r\n]/g, ' ')
    .slice(0, 120);
}

export async function reportCriticalError({ functionName, event, requestId }) {
  const record = {
    level: 'error',
    type: 'critical_function_error',
    function: safeLabel(functionName, 'unknown'),
    event: safeLabel(event, 'unexpected_failure'),
    request_id: safeLabel(requestId, 'unavailable'),
    timestamp: new Date().toISOString(),
  };
  console.error(JSON.stringify(record));

  const token = getEnv('LINE_CHANNEL_ACCESS_TOKEN');
  const recipients = getEnv('ERROR_ALERT_LINE_USER_IDS')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (!token || recipients.length === 0) return false;

  const text = [
    'NPT Dashboard critical error',
    `Function: ${record.function}`,
    `Event: ${record.event}`,
    `Time: ${record.timestamp}`,
    `Request: ${record.request_id}`,
  ].join('\n');

  try {
    const responses = await Promise.all(
      recipients.map((to) =>
        fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to,
            messages: [{ type: 'text', text }],
          }),
        })
      )
    );
    if (responses.some((response) => !response.ok)) {
      throw new Error('LINE rejected critical error alert');
    }
    return true;
  } catch {
    console.error(
      JSON.stringify({
        level: 'error',
        type: 'critical_alert_delivery_failed',
        function: record.function,
        request_id: record.request_id,
      })
    );
    return false;
  }
}
