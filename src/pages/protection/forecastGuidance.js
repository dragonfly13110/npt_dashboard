const RISK_WEIGHT = { สูง: 3, ปานกลาง: 2, ต่ำ: 1 };

export const getPriorityDetails = (details = []) =>
  [...details].sort(
    (a, b) =>
      (RISK_WEIGHT[b.risk_level] || 0) - (RISK_WEIGHT[a.risk_level] || 0)
  );

export const getForecastWindow = (dateStr) => {
  if (!dateStr) return [];
  const start = new Date(`${dateStr}T00:00:00+07:00`);
  if (Number.isNaN(start.getTime())) return [];

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date.toLocaleDateString('th-TH', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Bangkok',
    });
  });
};

export const getActionSummary = (text = '') => {
  const firstSentence = text.split(/[.!?\n]/).find((part) => part.trim()) || '';
  const action = firstSentence.trim();
  return action.length > 120 ? `${action.slice(0, 117)}...` : action;
};

export const hasChemicalAdvice = (text = '') =>
  /(สารเคมี|สารป้องกันกำจัด|พ่นสาร|คาสูกาไมซิน|ไตรไซคลาโซล|เมทาแลกซิล|ฟอสอีทิล|คอปเปอร์|ทองแดง)/i.test(
    text
  );
