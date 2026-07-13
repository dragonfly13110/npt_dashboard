# Premium Responsive Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ปรับหน้าแรกเป็นศูนย์ข้อมูลการเกษตรอัจฉริยะที่พรีเมียม น่าเชื่อถือ ใช้งานชัดเจนบน desktop, tablet และ mobile โดยคง data logic และ widget เดิม

**Architecture:** ปรับเฉพาะ presentation layer ของ `LandingPage` และ reuse component เดิมทั้งหมด จัดข้อมูลใหม่เป็น 5 ชั้น: navigation, hero/search, situation strip, map/KPI, dataset explorer แล้วใช้ CSS grid responsive เปลี่ยนโครงตามพื้นที่ ไม่ซ่อนสาระสำคัญ

**Tech Stack:** React 19, React Router, Ant Design icons, CSS, Playwright

## Global Constraints

- ห้ามเพิ่ม dependency
- ห้ามเปลี่ยน `useDashboardData`, Supabase query, route หรือ business logic
- ใช้ icon ที่ติดตั้งแล้ว ห้ามใช้ emoji เป็น UI icon
- Breakpoints: mobile `< 768px`, tablet `768–1199px`, desktop `>= 1200px`
- Touch target ขั้นต่ำ `44px`; body text ขั้นต่ำ `14px`; contrast WCAG AA
- รองรับ `prefers-reduced-motion`; animation ใช้เฉพาะ loading/live status/hover เบาๆ
- แสดง source และเวลาอัปเดตใกล้ข้อมูล ห้ามสร้างตัวเลขหรือ freshness ปลอม
- Mobile priority: search → alerts/situation → KPI → map → dataset categories → news
- Desktop target: hero ไม่เกินประมาณ `520px`; content width `1440px`
- รักษา modal, chatbot, footer และ public links เดิม

---

## File Map

- Modify: `src/pages/LandingPage.jsx` — semantic layout และ navigation ใหม่
- Create: `src/pages/LandingPage.premium.css` — theme/layout ใหม่ scoped ใต้ `.landing-page`
- Modify: `src/pages/LandingPage.css` — ลบเฉพาะ rule เก่าที่ชนหลัง rollout ผ่าน ห้าม rewrite ทั้งไฟล์ใน commit แรก
- Modify: `tests/e2e/landingEnhancements.spec.js` — behavior/navigation/search เดิม
- Create: `tests/e2e/landingResponsive.spec.js` — responsive hierarchy, overflow, touch targets

## Responsive Contract

| Area      | Desktop                       | Tablet                                | Mobile                                 |
| --------- | ----------------------------- | ------------------------------------- | -------------------------------------- |
| Nav       | logo + 5 links + search/login | logo + 3 links + menu                 | logo + menu; login ใน drawer           |
| Hero      | copy 5 cols + visual 7 cols   | copy/search เต็มแถว; visual ลดความสูง | copy/search/CTA แนวตั้ง; ไม่ใช้ภาพใหญ่ |
| Situation | 5 cards แถวเดียว              | horizontal scroll/snap                | horizontal scroll/snap; alert ก่อน     |
| Main      | map 8 cols + KPI 4 cols       | map เต็มแถว + KPI 2x2                 | KPI ก่อน; map สูง 320px                |
| Datasets  | 6 cards                       | 3x2                                   | list/card 1 column                     |
| News      | 2 columns                     | 1 column                              | accordion 1 column                     |

---

### Task 1: Lock responsive behavior with failing E2E tests

**Files:**

- Modify: `tests/e2e/landingEnhancements.spec.js`
- Create: `tests/e2e/landingResponsive.spec.js`

**Interfaces:**

- Consumes: route `/`, existing search navigation `/dashboard/search?q=...`
- Produces: stable selectors `data-testid="landing-nav"`, `landing-search`, `situation-strip`, `landing-map`, `kpi-grid`, `dataset-explorer`

- [ ] **Step 1: Replace obsolete quick-nav assertions with new landmark assertions**

```js
await expect(page.getByTestId('landing-nav')).toBeVisible();
await expect(
  page.getByRole('heading', {
    name: 'ศูนย์ข้อมูลการเกษตรอัจฉริยะ จังหวัดนครปฐม',
  })
).toBeVisible();
await expect(page.getByTestId('landing-search')).toBeVisible();
await expect(page.getByTestId('situation-strip')).toBeVisible();
await expect(page.getByTestId('landing-map')).toBeVisible();
await expect(page.getByTestId('dataset-explorer')).toBeVisible();
```

- [ ] **Step 2: Add viewport and overflow tests**

```js
import { test, expect } from '@playwright/test';

for (const viewport of [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1440, height: 1000 },
]) {
  test(`${viewport.name} keeps landing content inside viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByTestId('landing-search')).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });
}
```

- [ ] **Step 3: Add mobile priority and touch-target checks**

```js
test('mobile prioritizes search, situation and KPI before map', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const y = async (id) => (await page.getByTestId(id).boundingBox()).y;
  expect(await y('landing-search')).toBeLessThan(await y('situation-strip'));
  expect(await y('situation-strip')).toBeLessThan(await y('kpi-grid'));
  expect(await y('kpi-grid')).toBeLessThan(await y('landing-map'));
  const menu = page.getByRole('button', { name: 'เปิดเมนู' });
  const box = await menu.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
});
```

- [ ] **Step 4: Run tests and confirm failure**

Run: `pnpm exec playwright test tests/e2e/landingEnhancements.spec.js tests/e2e/landingResponsive.spec.js`

Expected: FAIL because new landmarks/test IDs do not exist.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/landingEnhancements.spec.js tests/e2e/landingResponsive.spec.js
git commit -m "test: define responsive landing contract"
```

---

### Task 2: Build unified navigation and compact hero

**Files:**

- Modify: `src/pages/LandingPage.jsx`
- Create: `src/pages/LandingPage.premium.css`

**Interfaces:**

- Consumes: `landingQuery`, `setLandingQuery`, `handleLandingSearchSubmit`, existing modal setters/routes
- Produces: `landing-nav`, `landing-search`; mobile menu state local to `LandingPage`

- [ ] **Step 1: Import new stylesheet last and add menu state**

```jsx
import './LandingPage.premium.css';

const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
```

- [ ] **Step 2: Replace floating tabs + quick nav + old hero with one header**

```jsx
<header className="premium-landing-header">
  <nav className="premium-nav" data-testid="landing-nav" aria-label="เมนูหลัก">
    <a className="premium-brand" href="/">
      ศูนย์ข้อมูลการเกษตรอัจฉริยะ
      <br />
      จังหวัดนครปฐม
    </a>
    <div className={`premium-nav-links ${mobileMenuOpen ? 'is-open' : ''}`}>
      <a href="#agri-overview">ภาพรวม</a>
      <a href="/smart-map">แผนที่</a>
      <a href="#dataset-explorer">ชุดข้อมูล</a>
      <a href="#agri-news">ข่าว</a>
      <a href="/manual">คู่มือ</a>
      <a href="/login" className="premium-login">
        เข้าสู่ระบบ
      </a>
    </div>
    <button
      className="premium-menu-button"
      aria-label="เปิดเมนู"
      aria-expanded={mobileMenuOpen}
      onClick={() => setMobileMenuOpen((open) => !open)}
    >
      <AppstoreOutlined />
    </button>
  </nav>

  <div className="premium-hero">
    <div className="premium-hero-copy">
      <p className="premium-eyebrow">Nakhon Pathom Agri Intelligence</p>
      <h1>ศูนย์ข้อมูลการเกษตรอัจฉริยะ จังหวัดนครปฐม</h1>
      <p>
        รวมข้อมูลพื้นที่ เกษตรกร ผลผลิต ดิน น้ำ ภัย และมาตรฐาน
        เพื่อการตัดสินใจจากข้อมูลเดียวกัน
      </p>
      <form
        data-testid="landing-search"
        onSubmit={handleLandingSearchSubmit}
        className="premium-search"
      >
        <SearchOutlined aria-hidden="true" />
        <input
          value={landingQuery}
          onChange={(e) => setLandingQuery(e.target.value)}
          placeholder="ค้นหาแปลง เกษตรกร พืช ดิน น้ำ หรือมาตรฐาน…"
        />
        <button type="submit">ค้นหา</button>
      </form>
      <div className="premium-hero-actions">
        <a href="#dataset-explorer">สำรวจฐานข้อมูล</a>
        <a href="/smart-map">เปิดแผนที่อัจฉริยะ</a>
      </div>
    </div>
    <div className="premium-hero-visual" aria-hidden="true" />
  </div>
</header>
```

- [ ] **Step 3: Add only layout-critical CSS**

```css
.landing-page {
  --agri-green: #174a35;
  --data-navy: #173b57;
  --rice-gold: #c99a3d;
  --canvas: #f7f8f3;
  background: var(--canvas);
  color: #17211b;
}
.premium-nav {
  min-height: 72px;
  max-width: 1440px;
  margin: auto;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
.premium-nav-links {
  display: flex;
  align-items: center;
  gap: 24px;
}
.premium-menu-button {
  display: none;
  width: 44px;
  height: 44px;
}
.premium-hero {
  max-width: 1440px;
  min-height: 440px;
  margin: auto;
  padding: 48px 32px;
  display: grid;
  grid-template-columns: 5fr 7fr;
  align-items: center;
}
.premium-search {
  min-height: 58px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #dce3dc;
  border-radius: 14px;
  padding: 6px 6px 6px 18px;
}
@media (max-width: 1199px) {
  .premium-hero {
    grid-template-columns: 1fr;
  }
  .premium-hero-visual {
    min-height: 220px;
  }
}
@media (max-width: 767px) {
  .premium-nav {
    min-height: 64px;
    padding: 0 16px;
  }
  .premium-menu-button {
    display: grid;
    place-items: center;
  }
  .premium-nav-links {
    display: none;
    position: absolute;
    inset: 64px 12px auto;
    background: #fff;
    padding: 12px;
    border: 1px solid #dce3dc;
    border-radius: 14px;
  }
  .premium-nav-links.is-open {
    display: grid;
  }
  .premium-hero {
    min-height: auto;
    padding: 28px 16px;
  }
  .premium-hero-visual {
    display: none;
  }
  .premium-search {
    grid-template-columns: auto 1fr;
  }
  .premium-search button {
    grid-column: 1 / -1;
    min-height: 44px;
  }
}
```

- [ ] **Step 4: Run focused tests**

Run: `pnpm exec playwright test tests/e2e/landingEnhancements.spec.js tests/e2e/landingResponsive.spec.js`

Expected: navigation/search assertions PASS; later section assertions may still FAIL.

- [ ] **Step 5: Commit**

```bash
git add src/pages/LandingPage.jsx src/pages/LandingPage.premium.css
git commit -m "feat: add responsive landing hero and navigation"
```

---

### Task 3: Recompose live widgets into situation strip

**Files:**

- Modify: `src/pages/LandingPage.jsx`
- Modify: `src/pages/LandingPage.premium.css`

**Interfaces:**

- Consumes: existing `WeatherWidget`, `AirQualityWidget`, `HotspotWidget`, `DamReservoirWidget`, forecast state
- Produces: `situation-strip`; no new fetches

- [ ] **Step 1: Wrap existing widgets in one semantic strip**

```jsx
<section
  className="premium-situation"
  data-testid="situation-strip"
  aria-labelledby="situation-title"
>
  <div className="premium-section-title">
    <div>
      <small>LIVE SITUATION</small>
      <h2 id="situation-title">สถานการณ์เกษตรวันนี้</h2>
    </div>
    <span className="premium-live">
      <i /> ข้อมูลล่าสุด
    </span>
  </div>
  <div className="premium-situation-scroll">
    <Suspense fallback={<WidgetSkeleton />}>
      <WeatherWidget />
    </Suspense>
    <Suspense fallback={<WidgetSkeleton />}>
      <AirQualityWidget />
    </Suspense>
    <Suspense fallback={<WidgetSkeleton />}>
      <HotspotWidget />
    </Suspense>
    <Suspense fallback={<WidgetSkeleton />}>
      <DamReservoirWidget defaultExpanded={false} />
    </Suspense>
  </div>
</section>
```

- [ ] **Step 2: Make tablet/mobile strip scrollable, not squeezed**

```css
.premium-situation {
  max-width: 1440px;
  margin: 0 auto;
  padding: 20px 32px 32px;
}
.premium-situation-scroll {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
@media (max-width: 1199px) {
  .premium-situation-scroll {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding-bottom: 8px;
  }
  .premium-situation-scroll > * {
    flex: 0 0 min(300px, 82vw);
    scroll-snap-align: start;
  }
}
@media (max-width: 767px) {
  .premium-situation {
    padding: 16px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .landing-page *,
  .landing-page *::before,
  .landing-page *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3: Run responsive tests**

Run: `pnpm exec playwright test tests/e2e/landingResponsive.spec.js`

Expected: strip visible; page has no horizontal document overflow.

- [ ] **Step 4: Commit**

```bash
git add src/pages/LandingPage.jsx src/pages/LandingPage.premium.css
git commit -m "feat: unify landing situation widgets"
```

---

### Task 4: Build map-first intelligence grid and dataset explorer

**Files:**

- Modify: `src/pages/LandingPage.jsx`
- Modify: `src/pages/LandingPage.premium.css`

**Interfaces:**

- Consumes: existing `LandingMap`, `AgriAreasCard`, `FarmerInstitutesV2Widget`, public routes
- Produces: `landing-map`, `kpi-grid`, `dataset-explorer`

- [ ] **Step 1: Place existing map and summary components in responsive grid**

```jsx
<section id="agri-overview" className="premium-intelligence">
  <div className="premium-map" data-testid="landing-map">
    <Suspense fallback={<WidgetSkeleton />}>
      <LandingMap mapData={mapData} districtStats={districtStats} />
    </Suspense>
  </div>
  <div className="premium-kpis" data-testid="kpi-grid">
    <Suspense fallback={<WidgetSkeleton />}>
      <AgriAreasCard
        stats={agriStats}
        districtStats={districtStats}
        loading={loading}
      />
    </Suspense>
    <Suspense fallback={<WidgetSkeleton />}>
      <FarmerInstitutesV2Widget />
    </Suspense>
  </div>
</section>
```

- [ ] **Step 2: Add six route-backed dataset categories**

```jsx
const datasetLinks = [
  ['พื้นที่และแปลง', '/public/agricultural-areas'],
  ['เกษตรกรและสถาบัน', '/public/smart-farmers'],
  ['ดินและน้ำ', '#soil-water'],
  ['ผลผลิตและราคา', '/public/agricultural-prices'],
  ['ภัยและโรคพืช', '/public/disease-forecast'],
  ['มาตรฐานการเกษตร', '/dashboard/production/certifications'],
];

<section
  id="dataset-explorer"
  data-testid="dataset-explorer"
  className="premium-datasets"
>
  <h2>สำรวจชุดข้อมูลสำคัญ</h2>
  <div>
    {datasetLinks.map(([label, href]) => (
      <a key={label} href={href}>
        {label}
        <span>ดูข้อมูล →</span>
      </a>
    ))}
  </div>
</section>;
```

The certification destination is an existing protected route; unauthenticated users follow existing auth behavior. Do not create a duplicate public route in this redesign.

- [ ] **Step 3: Add responsive ordering**

```css
.premium-intelligence {
  max-width: 1440px;
  margin: auto;
  padding: 24px 32px;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}
.premium-map {
  min-height: 520px;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid #dce3dc;
  background: #fff;
}
.premium-kpis {
  display: grid;
  gap: 16px;
}
.premium-datasets {
  max-width: 1440px;
  margin: auto;
  padding: 40px 32px;
}
.premium-datasets > div {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
@media (max-width: 1199px) {
  .premium-intelligence {
    grid-template-columns: 1fr;
  }
  .premium-kpis {
    grid-template-columns: repeat(2, 1fr);
  }
  .premium-datasets > div {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 767px) {
  .premium-intelligence {
    padding: 16px;
    display: flex;
    flex-direction: column;
  }
  .premium-kpis {
    order: 1;
    grid-template-columns: 1fr;
  }
  .premium-map {
    order: 2;
    min-height: 320px;
  }
  .premium-datasets {
    padding: 32px 16px;
  }
  .premium-datasets > div {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run all landing E2E tests**

Run: `pnpm exec playwright test tests/e2e/landingEnhancements.spec.js tests/e2e/landingResponsive.spec.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/LandingPage.jsx src/pages/LandingPage.premium.css tests/e2e/landingResponsive.spec.js
git commit -m "feat: add responsive map and dataset explorer"
```

---

### Task 5: Remove visual conflicts and verify production quality

**Files:**

- Modify: `src/pages/LandingPage.css`
- Modify: `src/pages/SaastyTheme.css`
- Modify: `src/pages/LandingPage.premium.css`
- Test: `tests/e2e/landingEnhancements.spec.js`
- Test: `tests/e2e/landingResponsive.spec.js`

**Interfaces:**

- Consumes: completed premium layout
- Produces: one active landing theme without obsolete floating navigation overrides

- [ ] **Step 1: Find conflicting selectors before deleting**

Run: `rg -n "landing-floating-system-tabs|landing-quick-nav|bento-header|hero-actions|SaastyTheme" src/pages/LandingPage.jsx src/pages/LandingPage.css src/pages/SaastyTheme.css`

Expected: old selectors no longer referenced by `LandingPage.jsx`; shared selectors used by `Dashboard.jsx` must remain.

- [ ] **Step 2: Delete only unreferenced landing rules**

Remove obsolete floating tabs, quick nav, old hero, duplicated animations and inline hero styles. Do not delete `.bento-card` rules because `Dashboard.jsx` imports `LandingPage.css`.

- [ ] **Step 3: Run formatter, lint, tests and build**

```bash
pnpm exec prettier --write src/pages/LandingPage.jsx src/pages/LandingPage.premium.css tests/e2e/landingEnhancements.spec.js tests/e2e/landingResponsive.spec.js
pnpm run lint:src
pnpm run test
pnpm exec playwright test tests/e2e/landingEnhancements.spec.js tests/e2e/landingResponsive.spec.js
pnpm run build
```

Expected: all commands exit `0`.

- [ ] **Step 4: Capture visual checks at exact viewports**

Run Playwright screenshots at `390x844`, `820x1180`, `1440x1000`. Check:

- no clipped Thai text
- no document-level horizontal scroll
- mobile first screen contains title, search and start of situation strip
- tablet map controls remain usable by touch
- chatbot does not cover CTA, map controls or bottom navigation
- loading/error/empty states preserve layout
- focus outline visible on links, buttons and search

- [ ] **Step 5: Commit**

```bash
git add src/pages/LandingPage.jsx src/pages/LandingPage.css src/pages/SaastyTheme.css src/pages/LandingPage.premium.css tests/e2e/landingEnhancements.spec.js tests/e2e/landingResponsive.spec.js
git commit -m "refactor: finish premium responsive landing"
```

## Definition of Done

- E2E passes at all 3 viewport classes
- Existing search, modal, map, public links, chatbot and footer still work
- No new dependency, fetch or fake metric
- Desktop resembles approved mockup; tablet/mobile preserve same information hierarchy
- CSS conflict removed only after tests pass; shared dashboard styles remain intact
