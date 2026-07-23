export const RICE_TONS_PER_RAI = 0.8;

const THAI_MONTHS = [
  '\u0e21\u0e01\u0e23\u0e32\u0e04\u0e21',
  '\u0e01\u0e38\u0e21\u0e20\u0e32\u0e1e\u0e31\u0e19\u0e18\u0e4c',
  '\u0e21\u0e35\u0e19\u0e32\u0e04\u0e21',
  '\u0e40\u0e21\u0e29\u0e32\u0e22\u0e19',
  '\u0e1e\u0e24\u0e29\u0e20\u0e32\u0e04\u0e21',
  '\u0e21\u0e34\u0e16\u0e38\u0e19\u0e32\u0e22\u0e19',
  '\u0e01\u0e23\u0e01\u0e0e\u0e32\u0e04\u0e21',
  '\u0e2a\u0e34\u0e07\u0e2b\u0e32\u0e04\u0e21',
  '\u0e01\u0e31\u0e19\u0e22\u0e32\u0e22\u0e19',
  '\u0e15\u0e38\u0e25\u0e32\u0e04\u0e21',
  '\u0e1e\u0e24\u0e28\u0e08\u0e34\u0e01\u0e32\u0e22\u0e19',
  '\u0e18\u0e31\u0e19\u0e27\u0e32\u0e04\u0e21',
];

const NAKHON_PATHOM_DISTRICT_CODES = new Set([
  '2-730100',
  '2-730200',
  '2-730300',
  '2-730400',
  '2-730500',
  '2-730600',
  '2-730700',
]);

const THAI_DATE_MONTHS = new Map([
  ['ม.ค.', '01'],
  ['ก.พ.', '02'],
  ['มี.ค.', '03'],
  ['เม.ย.', '04'],
  ['พ.ค.', '05'],
  ['มิ.ย.', '06'],
  ['ก.ค.', '07'],
  ['ส.ค.', '08'],
  ['ก.ย.', '09'],
  ['ต.ค.', '10'],
  ['พ.ย.', '11'],
  ['ธ.ค.', '12'],
]);

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCells(rowHtml) {
  return [...rowHtml.matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(
    (match) => decodeHtml(match[2])
  );
}

function parseNumber(value) {
  const normalized = String(value ?? '')
    .replace(/,/g, '')
    .replace(/\u2212/g, '-')
    .trim();
  if (!normalized || normalized === '-' || normalized === '—') return 0;
  const number = Number(normalized.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? number : null;
}

function findMonthNumbers(html) {
  return THAI_MONTHS.map((month, index) => ({ month, number: index + 1 }))
    .filter(({ month }) => html.includes(month))
    .map(({ number }) => number);
}

function parseCutoffDate(html) {
  const match = html.match(
    /(?:ณ\s*วันที่|ข้อมูล\s*ณ\s*วันที่)\s*(\d{1,2})\s+([^\s]+)\s+(\d{4})/u
  );
  if (!match) return null;
  const month = THAI_DATE_MONTHS.get(match[2]);
  if (!month) return null;
  return `${Number(match[3]) - 543}-${month}-${String(match[1]).padStart(2, '0')}`;
}

export function estimateRiceTons(areaRai) {
  return Number((Number(areaRai) * RICE_TONS_PER_RAI).toFixed(6));
}

function parseHarvestRows(html, monthNumbers, cropYear) {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(
    (match) => parseCells(match[1])
  );
  const records = [];
  let provinceTotal = null;

  for (const cells of rows) {
    const districtCode = cells[0];
    if (!/^\d+-\d+$/.test(districtCode) || cells.length < 5) continue;
    const district = cells[1];
    const dataCells = cells.slice(2);
    const monthly = [];

    monthNumbers.forEach((harvestMonth, monthIndex) => {
      const offset = monthIndex * 3;
      if (dataCells.length < offset + 3) return;
      const householdCount = parseNumber(dataCells[offset]);
      const plotCount = parseNumber(dataCells[offset + 1]);
      const areaRai = parseNumber(dataCells[offset + 2]);
      if (householdCount === null || plotCount === null || areaRai === null) return;
      monthly.push({ householdCount, plotCount, areaRai, harvestMonth });
    });

    if (districtCode.endsWith('0000')) {
      provinceTotal = {
        cropYear,
        districtCode,
        district,
        areaRai: monthly.reduce((sum, row) => sum + row.areaRai, 0),
        byMonth: Object.fromEntries(
          monthly.map((row) => [row.harvestMonth, row.areaRai])
        ),
      };
      continue;
    }

    for (const row of monthly) {
      records.push({
        cropYear,
        districtCode,
        district,
        harvestMonth: row.harvestMonth,
        householdCount: row.householdCount,
        plotCount: row.plotCount,
        areaRai: row.areaRai,
        estimatedTons: estimateRiceTons(row.areaRai),
      });
    }
  }

  return { records, provinceTotal };
}

export function parseRiceHarvestTable(html, { cropYear = null } = {}) {
  const source = String(html ?? '');
  const monthNumbers = findMonthNumbers(source);
  if (!monthNumbers.length) {
    throw new Error('No harvest month columns found in rice report');
  }
  const parsed = parseHarvestRows(source, monthNumbers, cropYear);
  return {
    cropYear,
    cutoffDate: parseCutoffDate(decodeHtml(source)),
    ...parsed,
  };
}

export function validateRiceHarvestRecords(records, provinceTotal = null) {
  if (!Array.isArray(records) || records.length === 0) {
    return { ok: false, error: 'No valid rice harvest rows' };
  }

  const keys = new Set();
  const districtCodes = new Set();
  for (const row of records) {
    const key = `${row.districtCode}:${row.harvestMonth}`;
    if (keys.has(key)) return { ok: false, error: `Duplicate row: ${key}` };
    keys.add(key);
    districtCodes.add(row.districtCode);
    if (
      !NAKHON_PATHOM_DISTRICT_CODES.has(row.districtCode) ||
      !Number.isInteger(row.harvestMonth) ||
      row.harvestMonth < 1 ||
      row.harvestMonth > 12 ||
      !Number.isFinite(row.areaRai) ||
      row.areaRai < 0 ||
      !Number.isFinite(row.estimatedTons) ||
      row.estimatedTons < 0
    ) {
      return { ok: false, error: `Invalid rice harvest row: ${key}` };
    }
  }

  if (districtCodes.size !== NAKHON_PATHOM_DISTRICT_CODES.size) {
    return { ok: false, error: 'Rice report is missing one or more districts' };
  }

  if (provinceTotal?.byMonth) {
    for (const [month, provinceArea] of Object.entries(provinceTotal.byMonth)) {
      const districtArea = records
        .filter((row) => String(row.harvestMonth) === String(month))
        .reduce((sum, row) => sum + row.areaRai, 0);
      if (provinceArea > 0 && Math.abs(districtArea - provinceArea) / provinceArea > 0.05) {
        return { ok: false, error: `Rice district total differs from province total for month ${month}` };
      }
    }
  }

  return { ok: true, error: null };
}
