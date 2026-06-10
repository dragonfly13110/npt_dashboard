function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNumber(value, fractionDigits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return number.toLocaleString('th-TH', {
    maximumFractionDigits: fractionDigits,
  });
}

function percent(value, total) {
  const number = Number(value);
  const base = Number(total);
  if (!Number.isFinite(number) || !Number.isFinite(base) || base <= 0) {
    return '-';
  }
  return `${((number / base) * 100).toLocaleString('th-TH', {
    maximumFractionDigits: 1,
  })}%`;
}

function table(headers, rows, { emptyText = 'ไม่มีข้อมูล' } = {}) {
  const body =
    rows.length > 0
      ? rows
          .map(
            (row) => `
              <tr>
                ${row.map((cell) => `<td>${cell}</td>`).join('')}
              </tr>`
          )
          .join('')
      : `<tr><td colspan="${headers.length}" class="empty-cell">${escapeHtml(
          emptyText
        )}</td></tr>`;

  return `
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
}

function statCard(label, value, hint = '') {
  return `
    <div class="stat-card">
      <div class="stat-label">${escapeHtml(label)}</div>
      <div class="stat-value">${escapeHtml(value)}</div>
      ${hint ? `<div class="stat-hint">${escapeHtml(hint)}</div>` : ''}
    </div>`;
}

function buildDatasetRows(stats, totalRecords) {
  return [...stats]
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .map((item, index) => [
      formatNumber(index + 1),
      escapeHtml(item.label),
      escapeHtml(item.group),
      formatNumber(item.count),
      percent(item.count, totalRecords),
    ]);
}

function buildGroupRows(groupConfig, stats) {
  return groupConfig.map((group) => {
    const groupStats = stats.filter((item) => item.group === group.group);
    const total = groupStats.reduce(
      (sum, item) => sum + (Number(item.count) || 0),
      0
    );
    return [
      escapeHtml(group.group),
      formatNumber(group.tables.length),
      formatNumber(total),
      escapeHtml(
        groupStats
          .map((item) => `${item.label} (${formatNumber(item.count)})`)
          .join(', ')
      ),
    ];
  });
}

function buildDistrictRows(districtStats) {
  return Object.entries(districtStats || {}).map(([district, item]) => [
    escapeHtml(district),
    formatNumber(item.house),
    formatNumber(item.area),
    formatNumber(item.lp),
    formatNumber(item.ce),
    formatNumber((item.sfSfCount || 0) + (item.ysfCount || 0)),
    formatNumber(item.certGap),
    formatNumber(item.fireCount),
  ]);
}

function buildValueRows(items, totalValue) {
  return items.map((item) => [
    escapeHtml(item.name),
    formatNumber(item.value, 2),
    percent(item.value, totalValue),
  ]);
}

export function buildDashboardPdfReportHtml({
  stats = [],
  groupConfig = [],
  districtStats = {},
  tourism = { count: 0 },
  instituteStats = {},
  lpStats = {},
  agriStats = {},
  agriPie = [],
  lpPie = [],
  visits = 0,
  generatedAt = new Date(),
} = {}) {
  const totalRecords = stats.reduce(
    (sum, item) => sum + (Number(item.count) || 0),
    0
  );
  const agriPieTotal = agriPie.reduce(
    (sum, item) => sum + (Number(item.value) || 0),
    0
  );
  const lpPieTotal = lpPie.reduce(
    (sum, item) => sum + (Number(item.value) || 0),
    0
  );
  const generatedText = generatedAt.toLocaleString('th-TH', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>รายงานแดชบอร์ดรวม</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #0f172a;
      font-family: "IBM Plex Sans Thai", "Noto Sans Thai", "Tahoma", sans-serif;
      font-size: 11px;
      line-height: 1.45;
      background: #fff;
    }
    .report-header {
      border-bottom: 3px solid #15803d;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    h1 { margin: 0 0 4px; font-size: 22px; color: #14532d; }
    .subtitle { color: #475569; font-size: 12px; }
    .meta { display: flex; justify-content: space-between; gap: 12px; margin-top: 8px; color: #64748b; }
    .section { break-inside: avoid; margin: 14px 0 18px; }
    .section h2 {
      margin: 0 0 8px;
      padding: 7px 10px;
      font-size: 14px;
      color: #14532d;
      background: #ecfdf5;
      border-left: 4px solid #16a34a;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin: 10px 0 4px;
    }
    .stat-card {
      border: 1px solid #d9e6dd;
      border-radius: 6px;
      padding: 8px;
      background: #fbfffc;
      min-height: 58px;
    }
    .stat-label { color: #475569; font-size: 10px; }
    .stat-value { margin-top: 3px; font-size: 16px; font-weight: 800; color: #14532d; }
    .stat-hint { margin-top: 3px; color: #64748b; font-size: 9px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; break-inside: auto; }
    th, td { border: 1px solid #dbe3dc; padding: 5px 6px; vertical-align: top; }
    th { background: #f1f5f9; color: #334155; font-weight: 700; text-align: left; }
    tr { break-inside: avoid; }
    td:nth-child(n+2), th:nth-child(n+2) { text-align: right; }
    .wide-text td:last-child, .wide-text th:last-child { text-align: left; }
    .empty-cell { text-align: center !important; color: #64748b; padding: 12px; }
    .note {
      color: #475569;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      margin-top: 8px;
    }
    .page-break { break-before: page; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <header class="report-header">
    <h1>รายงานแดชบอร์ดรวมข้อมูลเกษตรจังหวัดนครปฐม</h1>
    <div class="subtitle">สรุปข้อมูลจากระบบ NPT Agri Dashboard ในรูปแบบรายงาน ไม่ใช่ภาพแคปหน้าจอ</div>
    <div class="meta">
      <span>จัดทำเมื่อ: ${escapeHtml(generatedText)}</span>
      <span>จำนวนผู้เข้าชมเว็บไซต์: ${formatNumber(visits)} ครั้ง</span>
    </div>
  </header>

  <section class="section">
    <h2>1. สรุปภาพรวม</h2>
    <div class="stats-grid">
      ${statCard('รายการข้อมูลทั้งหมด', formatNumber(totalRecords), 'รวมจากทุกชุดข้อมูลหลัก')}
      ${statCard('จำนวนชุดข้อมูล', formatNumber(stats.length), 'ชุดข้อมูลในแดชบอร์ด')}
      ${statCard('พื้นที่เกษตร', `${formatNumber(agriStats.crop_area)} ไร่`, 'พื้นที่ทำการเกษตรด้านพืช')}
      ${statCard('ครัวเรือนเกษตรกร', formatNumber(agriStats.households), 'จากข้อมูลพื้นที่การเกษตร')}
      ${statCard('แปลงใหญ่', formatNumber(lpStats.total), `${formatNumber(lpStats.members)} สมาชิก`)}
      ${statCard('พื้นที่แปลงใหญ่', `${formatNumber(lpStats.area)} ไร่`)}
      ${statCard('สถาบันเกษตรกร', formatNumber(instituteStats.total), 'รวมกลุ่มทุกประเภท')}
      ${statCard('ท่องเที่ยวเชิงเกษตร', formatNumber(tourism.count), 'แหล่ง/รายการ')}
    </div>
  </section>

  <section class="section">
    <h2>2. สรุปตามกลุ่มงาน</h2>
    <div class="wide-text">
      ${table(
        ['กลุ่มงาน', 'จำนวนหมวด', 'จำนวนรายการรวม', 'ชุดข้อมูลในกลุ่ม'],
        buildGroupRows(groupConfig, stats)
      )}
    </div>
  </section>

  <section class="section page-break">
    <h2>3. จำนวนรายการรายชุดข้อมูล</h2>
    ${table(
      ['ลำดับ', 'ชุดข้อมูล', 'กลุ่มงาน', 'จำนวนรายการ', 'สัดส่วน'],
      buildDatasetRows(stats, totalRecords)
    )}
  </section>

  <section class="section page-break">
    <h2>4. ภาพรวมรายอำเภอ</h2>
    ${table(
      [
        'อำเภอ',
        'ครัวเรือน',
        'พื้นที่เกษตร (ไร่)',
        'แปลงใหญ่',
        'วิสาหกิจฯ',
        'SF/YSF',
        'GAP',
        'จุดความร้อน',
      ],
      buildDistrictRows(districtStats)
    )}
  </section>

  <section class="section">
    <h2>5. รายละเอียดพื้นที่เกษตรและแปลงใหญ่</h2>
    <div class="stats-grid">
      ${statCard('พื้นที่ทั้งหมด', `${formatNumber(agriStats.total_area)} ไร่`)}
      ${statCard('พื้นที่เกษตรด้านพืช', `${formatNumber(agriStats.crop_area)} ไร่`)}
      ${statCard('ข้าวนาปี', `${formatNumber(agriStats.rice_pi)} ไร่`)}
      ${statCard('ข้าวนาปรัง', `${formatNumber(agriStats.rice_prung)} ไร่`)}
      ${statCard('พืชไร่', `${formatNumber(agriStats.field_crops)} ไร่`)}
      ${statCard('ไม้ผล', `${formatNumber(agriStats.fruit)} ไร่`)}
      ${statCard('พืชผัก', `${formatNumber(agriStats.veg)} ไร่`)}
      ${statCard('สมุนไพร', `${formatNumber(agriStats.herb)} ไร่`)}
    </div>
    ${table(
      ['ประเภทพื้นที่เกษตร', 'พื้นที่/จำนวน', 'สัดส่วน'],
      buildValueRows(agriPie, agriPieTotal)
    )}
    ${table(
      ['กลุ่มสินค้าแปลงใหญ่', 'จำนวนแปลง', 'สัดส่วน'],
      buildValueRows(lpPie, lpPieTotal)
    )}
  </section>

  <section class="section">
    <h2>6. หมายเหตุการจัดทำรายงาน</h2>
    <div class="note">
      รายงานนี้สร้างจากข้อมูลที่โหลดอยู่ในหน้าแดชบอร์ดขณะกดพิมพ์ PDF จัดวางเป็นข้อความ ตาราง และตัวเลขสรุปเพื่อให้อ่าน ค้นหา และพิมพ์เป็น PDF ได้เป็นระบบมากกว่าการแคปหน้าจอ
    </div>
  </section>
</body>
</html>`;
}
