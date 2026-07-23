function cleanCell(value) {
  return String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCells(rowHtml) {
  return [...rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) =>
    cleanCell(match[1])
  );
}

export function parseTbkNumber(value) {
  const normalized = String(value ?? '')
    .replace(/,/g, '')
    .trim();
  if (!normalized || normalized === '-' || normalized === '—') return 0;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function hasTbkTableShape(html) {
  const text = cleanCell(html);
  return (
    text.includes('จังหวัด/อำเภอ/ตำบล/หมู่') &&
    text.includes('พืช/พันธ์พืช') &&
    text.includes('ภัยธรรมชาติ') &&
    text.includes('คงเหลือ')
  );
}

export function parseTbkCultivationTable(
  html,
  { dataYear, groupCode, groupName }
) {
  const records = [];
  for (const match of String(html ?? '').matchAll(
    /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi
  )) {
    const cells = parseCells(match[1]);
    if (cells.length !== 10 || !/^2-\d+/.test(cells[0])) continue;
    const numbers = cells.slice(3).map(parseTbkNumber);
    if (numbers.some((value) => value === null)) continue;
    records.push({
      dataYear,
      groupCode,
      groupName,
      locationCode: cells[0],
      locationName: cells[1],
      itemBreed: cells[2],
      householdCount: numbers[0],
      plotCount: numbers[1],
      areaRai: numbers[2],
      disasterHouseholdCount: numbers[3],
      disasterPlotCount: numbers[4],
      disasterAreaRai: numbers[5],
      remainingAreaRai: numbers[6],
    });
  }
  return records;
}

export function validateTbkCultivationRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: 'No valid TBK cultivation rows' };
  }

  const keys = new Set();
  for (const row of rows) {
    const key = `${row.groupCode}:${row.locationCode}:${row.itemBreed}`;
    if (keys.has(key)) return { ok: false, error: `Duplicate TBK row: ${key}` };
    keys.add(key);
    if (
      !row.groupCode ||
      !/^2-\d+/.test(row.locationCode) ||
      !row.itemBreed ||
      !Number.isInteger(row.householdCount) ||
      !Number.isInteger(row.plotCount) ||
      !Number.isInteger(row.disasterHouseholdCount) ||
      !Number.isInteger(row.disasterPlotCount) ||
      [
        row.householdCount,
        row.plotCount,
        row.areaRai,
        row.disasterHouseholdCount,
        row.disasterPlotCount,
        row.disasterAreaRai,
        row.remainingAreaRai,
      ].some((value) => !Number.isFinite(value) || value < 0)
    ) {
      return { ok: false, error: `Invalid TBK row: ${key}` };
    }
  }
  return { ok: true, error: null };
}

export function filterTbkCultivationRows(
  rows,
  { groupCode = '', search = '' } = {}
) {
  const query = search.trim().toLocaleLowerCase('th-TH');
  return rows.filter(
    (row) =>
      (!groupCode || row.groupCode === groupCode) &&
      (!query ||
        `${row.locationName} ${row.itemBreed}`
          .toLocaleLowerCase('th-TH')
          .includes(query))
  );
}

export function summarizeTbkCultivationRows(rows) {
  return rows.reduce(
    (sum, row) => ({
      rowCount: sum.rowCount + 1,
      householdCount: sum.householdCount + row.householdCount,
      plotCount: sum.plotCount + row.plotCount,
      areaRai: sum.areaRai + row.areaRai,
      disasterAreaRai: sum.disasterAreaRai + row.disasterAreaRai,
      remainingAreaRai: sum.remainingAreaRai + row.remainingAreaRai,
    }),
    {
      rowCount: 0,
      householdCount: 0,
      plotCount: 0,
      areaRai: 0,
      disasterAreaRai: 0,
      remainingAreaRai: 0,
    }
  );
}
