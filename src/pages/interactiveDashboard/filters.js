export const ALL_DISTRICTS = '\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14';
export const LATEST_YEAR = 'latest';

export function latestYearRows(rows, yearKey) {
  const years = rows.map((row) => Number(row[yearKey])).filter(Number.isFinite);
  if (!years.length) return rows;
  const latestYear = Math.max(...years);
  return rows.filter((row) => Number(row[yearKey]) === latestYear);
}

export function normalizeYear(value) {
  if (value === LATEST_YEAR) return value;
  const year = Number(value);
  return Number.isInteger(year) && year > 2400 && year < 2700
    ? String(year)
    : LATEST_YEAR;
}

export function cropYears(label) {
  if (label === null || label === undefined || String(label).trim() === '') {
    return [];
  }
  const [startText, endText] = String(label).split(/[/-]/);
  const start = Number(startText);
  const shortEnd = Number(endText);
  if (!Number.isFinite(start)) return [];
  if (!Number.isFinite(shortEnd)) return [start];
  let end =
    endText.length < 4 ? Math.floor(start / 100) * 100 + shortEnd : shortEnd;
  if (end < start) end += 100;
  return [start, end];
}

export function filterRows(
  rows,
  { district = ALL_DISTRICTS, year = LATEST_YEAR } = {},
  { districtKey = 'district', yearKey = 'data_year' } = {}
) {
  return rows.filter((row) => {
    if (
      district !== ALL_DISTRICTS &&
      districtKey &&
      row[districtKey] !== district
    ) {
      return false;
    }
    if (year === LATEST_YEAR || !yearKey) return true;
    return Number(row[yearKey]) === Number(year);
  });
}

export function collectYears(sources) {
  return [
    ...new Set(
      sources.flatMap(({ rows, yearKey, parseYear }) =>
        yearKey
          ? rows
              .flatMap((row) =>
                parseYear ? parseYear(row[yearKey]) : [Number(row[yearKey])]
              )
              .filter(Number.isFinite)
          : []
      )
    ),
  ].sort((a, b) => b - a);
}

export function yearStatus(selectedYear, yearKey) {
  return yearKey
    ? { supported: true, label: selectedYear }
    : {
        supported: false,
        label:
          '\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e25\u0e48\u0e32\u0e2a\u0e38\u0e14',
      };
}
