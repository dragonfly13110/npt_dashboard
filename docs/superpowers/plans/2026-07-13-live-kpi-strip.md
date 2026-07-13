# Live KPI Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำแถบ KPI หน้าแรกให้มีหัวข้อชัด อ่านตัวเลขง่าย ดูพรีเมียม และสื่อว่าคลิกเปิดข้อมูลเต็มได้

**Architecture:** คง data flow และ modal เดิมทั้งหมด เปลี่ยนเฉพาะ markup ส่วนหัวและ CSS ของ KPI strip โดยใช้ class ร่วมบนการ์ดทั้งห้า การทดสอบยืนยันหัวข้อ คำแนะนำ และการเปิด modal จากการ์ด

**Tech Stack:** React 19, Ant Design 6, CSS, Playwright

## Global Constraints

- ไม่เพิ่ม API หรือ dependency ใหม่
- KPI ใช้ query/cache เดียวกับ widget เต็ม
- Desktop 5 คอลัมน์, tablet 3 คอลัมน์, mobile 1–2 คอลัมน์
- รองรับ keyboard focus และ `prefers-reduced-motion`

---

### Task 1: Redesign live KPI strip

**Files:**

- Modify: `src/pages/LandingPage.jsx`
- Modify: `src/pages/LandingPage.css`
- Modify: `tests/e2e/landingEnhancements.spec.js`

**Interfaces:**

- Consumes: KPI buttons และ `activeInfoModal` ที่มีอยู่
- Produces: `live-kpi-section`, `live-kpi-heading`, `live-kpi-hint` สำหรับ layout และ test selectors

- [ ] **Step 1: Write failing interaction test**

เพิ่มใน test ของหน้าแรก:

```js
await expect(
  page.getByRole('heading', { name: 'ข้อมูลสดจากพื้นที่' })
).toBeVisible();
await expect(page.getByText('คลิกการ์ดเพื่อดูข้อมูลแบบเต็ม')).toBeVisible();
await page.getByRole('button', { name: /สภาพอากาศนครปฐม/ }).click();
await expect(page.getByRole('dialog')).toBeVisible();
```

- [ ] **Step 2: Run test and verify failure**

Run: `npx playwright test tests/e2e/landingEnhancements.spec.js`
Expected: FAIL เพราะยังไม่มี heading และข้อความแนะนำ

- [ ] **Step 3: Add section hierarchy**

ครอบ grid เดิมด้วย:

```jsx
<div className="live-kpi-section">
  <header className="live-kpi-heading">
    <div>
      <span className="live-kpi-status">
        <i /> ข้อมูลสดจากพื้นที่
      </span>
      <h2>ภาพรวมสถานการณ์วันนี้</h2>
    </div>
    <p className="live-kpi-hint">คลิกการ์ดเพื่อดูข้อมูลแบบเต็ม</p>
  </header>
  {/* existing KPI grid */}
</div>
```

- [ ] **Step 4: Apply approved visual system**

ปรับ CSS ให้ section เป็น mint surface, cards เกือบขาว, accent อยู่ที่ขอบบน/icon tile, value 28px, hover arrow, focus ring, responsive 5/3/2/1 columns และ reduced motion โดยไม่เปลี่ยน data logic

- [ ] **Step 5: Verify**

Run: `npx playwright test tests/e2e/landingEnhancements.spec.js`
Expected: PASS

Run: `npm run build`
Expected: production build สำเร็จ

- [ ] **Step 6: Commit**

```bash
git add src/pages/LandingPage.jsx src/pages/LandingPage.css tests/e2e/landingEnhancements.spec.js
git commit -m "feat: polish live KPI strip"
```
