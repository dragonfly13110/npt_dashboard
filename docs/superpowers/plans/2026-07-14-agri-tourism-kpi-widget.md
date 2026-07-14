# Agri-tourism KPI Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the expandable landing-page tourism card with a compact KPI summary that opens a filterable detail modal.

**Architecture:** A focused `AgriTourismWidget` receives the already-loaded tourism data and renders either summary or detail mode. `LandingPage` owns modal state, matching the existing farmer-institutes pattern; existing public and CRUD routes remain unchanged.

**Tech Stack:** React, Ant Design, Vitest, Testing Library, existing `LandingPage.css` styles.

## Global Constraints

- Use existing `agri_tourism` records; add no API, table, or dependency.
- Preserve `/public/agri-tourism` and admin CRUD behavior.
- Keep missing-value normalization inside display/filter logic.
- Reuse existing landing-page and modal patterns where practical.

---

### Task 1: Build the tourism summary/detail widget

**Files:**
- Create: `src/components/widgets/AgriTourismWidget.jsx`
- Create: `src/components/widgets/__tests__/AgriTourismWidget.test.jsx`
- Modify: `src/pages/LandingPage.css`

**Interfaces:**
- Consumes: `data: { count?: number, list?: Array<TourismRecord> }`, `loading?: boolean`, `summary?: boolean`, `onOpen?: () => void`.
- Produces: default `AgriTourismWidget`; summary mode calls `onOpen`, detail mode owns district/query filters and links to `/public/agri-tourism`.

- [ ] **Step 1: Write the failing component tests**

Create records with `spot_name`, `district`, `subdistrict`, `spot_type`, `contact_person`, and `phone`. Assert summary values `3 แห่ง`, `2 อำเภอ`, and `2 ประเภท`; click the summary and assert `onOpen`; render detail mode, search for one place, filter one district, clear filters, and assert the full-table link.

```jsx
const tourism = {
  count: 3,
  list: [
    { id: 1, spot_name: 'สวน A', district: 'สามพราน', subdistrict: 'ไร่ขิง', spot_type: 'สวนเกษตร' },
    { id: 2, spot_name: 'ฟาร์ม B', district: 'เมืองนครปฐม', spot_type: 'ฟาร์มสเตย์' },
    { id: 3, spot_name: 'สวน C', district: 'สามพราน', spot_type: 'สวนเกษตร' },
  ],
};
```

- [ ] **Step 2: Run the focused test and verify red**

Run: `pnpm vitest run src/components/widgets/__tests__/AgriTourismWidget.test.jsx`

Expected: FAIL because `AgriTourismWidget.jsx` does not exist.

- [ ] **Step 3: Implement the minimum widget**

Implement normalized unique counts with `useMemo`, summary as a native button, and detail filters as native `select`/`input`. Keep filtering case-insensitive across name, district, subdistrict, and type.

```jsx
export default function AgriTourismWidget({ data = {}, loading = false, summary = false, onOpen }) {
  const rows = data.list || [];
  const districts = [...new Set(rows.map((row) => row.district?.trim()).filter(Boolean))];
  const types = [...new Set(rows.map((row) => row.spot_type?.trim()).filter(Boolean))];
  // summary: accessible button with three KPI values and onClick={onOpen}
  // detail: district/query state, filtered rows, reset button, and full-table link
}
```

Add only tourism-specific CSS needed for the KPI strip, toolbar, stats grid, result list, focus state, and mobile stacking. Reuse colors, radii, spacing, and modal classes already used by `.farmer-kpi-card` and `.inst-v2-*`.

- [ ] **Step 4: Run the focused test and verify green**

Run: `pnpm vitest run src/components/widgets/__tests__/AgriTourismWidget.test.jsx`

Expected: PASS.

- [ ] **Step 5: Commit the independently testable widget**

```bash
git add src/components/widgets/AgriTourismWidget.jsx src/components/widgets/__tests__/AgriTourismWidget.test.jsx src/pages/LandingPage.css
git commit -m "feat: add tourism KPI widget"
```

### Task 2: Integrate summary and modal on the landing page

**Files:**
- Modify: `src/pages/LandingPage.jsx`
- Modify: `src/pages/LandingPage.css`
- Test: `src/components/widgets/__tests__/AgriTourismWidget.test.jsx`

**Interfaces:**
- Consumes: `AgriTourismWidget({ data, loading, summary, onOpen })` from Task 1 and existing `activeInfoModal` state.
- Produces: modal key `liveAgriTourism`; removes the old inline `AgriTourismCard` rendering.

- [ ] **Step 1: Extend the test with the landing integration contract**

Assert the summary button's callback contract and detail heading independently so `LandingPage` only wires state and props; no new full-page fixture is needed.

```jsx
render(<AgriTourismWidget data={tourism} summary onOpen={onOpen} />);
await user.click(screen.getByRole('button', { name: /แหล่งท่องเที่ยว/ }));
expect(onOpen).toHaveBeenCalledOnce();
```

- [ ] **Step 2: Replace the old lazy import and inline card**

Lazy-load the new default component, render summary below the farmer KPI strip, and delete the obsolete `AgriTourismCard` block from the bento grid.

```jsx
const AgriTourismWidget = lazy(() => import('../components/widgets/AgriTourismWidget'));

<AgriTourismWidget
  data={tourism}
  loading={loading}
  summary
  onOpen={() => setActiveInfoModal('liveAgriTourism')}
/>
```

- [ ] **Step 3: Add the tourism modal**

Use the existing modal shell and pass the same data into detail mode.

```jsx
<Modal
  className="live-widget-modal live-tourism-modal"
  open={activeInfoModal === 'liveAgriTourism'}
  onCancel={() => setActiveInfoModal(null)}
  footer={null}
  width={1180}
  destroyOnHidden
  centered
  title="แหล่งท่องเที่ยวเชิงเกษตร"
>
  <div className="live-widget-modal-body">
    <Suspense fallback={<WidgetSkeleton />}>
      <AgriTourismWidget data={tourism} loading={loading} />
    </Suspense>
  </div>
</Modal>
```

- [ ] **Step 4: Run focused verification**

Run: `pnpm vitest run src/components/widgets/__tests__/AgriTourismWidget.test.jsx`

Expected: PASS.

Run: `pnpm eslint src/pages/LandingPage.jsx src/components/widgets/AgriTourismWidget.jsx src/components/widgets/__tests__/AgriTourismWidget.test.jsx`

Expected: exit 0.

Run: `pnpm build`

Expected: Vite build succeeds. The known unrelated Smart Map test failure for the missing `/Tourism/` label is not part of this change.

- [ ] **Step 5: Commit integration**

```bash
git add src/pages/LandingPage.jsx src/pages/LandingPage.css src/components/widgets/__tests__/AgriTourismWidget.test.jsx
git commit -m "feat: open tourism details from landing KPI"
```

