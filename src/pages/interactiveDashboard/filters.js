export const ALL_DISTRICTS = 'เธ—เธฑเนเธเธซเธกเธ”';
export const LATEST_YEAR = 'latest';

export function normalizeYear(value) {
  if (value === LATEST_YEAR) return value;
  const year = Number(value);
  return Number.isInteger(year) && year > 2400 && year < 2700
    ? String(year)
    : LATEST_YEAR;
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
      sources.flatMap(({ rows, yearKey }) =>
        yearKey
          ? rows.map((row) => Number(row[yearKey])).filter(Number.isFinite)
          : []
      )
    ),
  ].sort((a, b) => b - a);
}

export function yearStatus(selectedYear, yearKey) {
  return yearKey
    ? { supported: true, label: selectedYear }
    : { supported: false, label: 'เธเนเธญเธกเธนเธฅเธฅเนเธฒเธชเธธเธ”' };
}
