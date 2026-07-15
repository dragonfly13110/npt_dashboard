# Public GAP Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the existing GAP report at `/public/certifications` without exposing a person's name, phone number, or plot code.

**Architecture:** Reuse `Certifications` with a `publicMode` prop rather than duplicate its filters, charts, and table. The prop forces the existing public API, makes the table read-only, hides identifier columns, and changes person-count charts to record-count charts. The Netlify function is the privacy boundary and whitelists response fields.

**Tech Stack:** React 19, React Router 7, Ant Design, ECharts, Vitest, Netlify Functions, Supabase.

## Global Constraints

- No new dependencies or pages; reuse `src/pages/production/Certifications.jsx`.
- The public API must not select or return `farmer_name`, phone fields, or `plot_code`.
- Keep plot and farmer administrative location fields (หมู่/ตำบล/อำเภอ) public.
- Public tables are read-only even for a signed-in administrator.
- Public chart copy must say “จำนวนแปลง”, never “จำนวนเกษตรกร”.

---

### Task 1: Enforce the public API privacy contract

**Files:**

- Modify: `src/__tests__/public-privacy.test.js`
- Modify: `netlify/functions/public-certifications.js:14-61`

**Interfaces:**

- Consumes: the `certifications` Supabase table.
- Produces: `GET /api/public-certifications` rows containing only `id`, crop, plot type, area, production, certificate dates, administrative locations, and `created_at`.

- [ ] **Step 1: Write the failing privacy test**

Add this test to `src/__tests__/public-privacy.test.js`:

```js
it('keeps personal data and plot codes out of the public GAP API', () => {
  const fn = fs.readFileSync(
    path.join(root, 'netlify/functions/public-certifications.js'),
    'utf8'
  );

  expect(fn).not.toMatch(/farmer_name|phone|telephone|plot_code/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/__tests__/public-privacy.test.js`

Expected: FAIL because the function currently adds `farmer_name` and `plot_code` keys to its response.

- [ ] **Step 3: Minimize the public response**

Keep this exact Supabase select list:

```js
.select(
  'id,crop_name,plot_type,area_rai,production_volume_kg,cert_date,exp_date,plot_moo,plot_subdistrict,plot_district,farmer_moo,farmer_subdistrict,farmer_district,created_at'
)
```

Return the raw query result directly, replacing the mapping that creates identifier keys:

```js
return new Response(JSON.stringify({ data, count: count || 0 }), {
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/__tests__/public-privacy.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the privacy boundary**

Run: `git add src/__tests__/public-privacy.test.js netlify/functions/public-certifications.js`

Run: `git commit -m "fix: restrict public GAP fields"`

### Task 2: Expose the GAP report in read-only public mode

**Files:**

- Create: `src/__tests__/public-certifications-route.test.js`
- Modify: `src/pages/production/Certifications.jsx:255-822`
- Modify: `src/App.jsx:80-81,224-273`
- Modify: `src/pages/LandingPage.jsx:314-324`

**Interfaces:**

- Consumes: `/api/public-certifications` rows from Task 1.
- Produces: `/public/certifications`, rendered through `<Certifications publicMode />`, and the landing GAP card links to it.

- [ ] **Step 1: Write the failing public-route test**

Create `src/__tests__/public-certifications-route.test.js`:

```js
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('public GAP report', () => {
  it('registers a read-only public GAP route and links the landing card to it', () => {
    const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
    const landing = fs.readFileSync(
      path.join(root, 'src/pages/LandingPage.jsx'),
      'utf8'
    );

    expect(app).toContain("path: '/public/certifications'");
    expect(app).toContain('publicMode={publicMode}');
    expect(landing).toMatch(
      /title: 'พื้นที่รับรอง GAP',[\\s\\S]*href: '\/public\/certifications'/
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/__tests__/public-certifications-route.test.js`

Expected: FAIL because neither the public route nor the landing link exists.

- [ ] **Step 3: Add `publicMode` to the existing report**

Change the component signature and mode state:

```jsx
export default function Certifications({ publicMode = false }) {
  const { role } = useAuth();
  const isPublic = publicMode || role === 'guest';
```

Use `isPublic` for the public column filter, API fetch, cache key, table fetch overrides, and `readOnly`:

```jsx
<CrudTable
  readOnly={isPublic}
  fetchDataOverride={isPublic ? fetchPublicTableData : null}
  fetchAllOverride={isPublic ? async () => dashboardData : null}
/>
```

When `publicMode` is true, calculate the first two charts by row count instead of identity sets and render their titles with the exact phrase `จำนวนแปลง`. Preserve the internal-mode unique-farmer calculations and titles.

- [ ] **Step 4: Register the route and landing link**

Add the route descriptor and forward its mode:

```jsx
{ path: '/public/certifications', Component: Certifications, publicMode: true },
].map(({ path, Component, publicMode = false }) => (
  <Route key={path} path={path} element={<Component publicMode={publicMode} />} />
))}
```

Use the existing public-page wrapper around the component. Change only the GAP KPI card target in `src/pages/LandingPage.jsx`:

```js
href: '/public/certifications',
```

- [ ] **Step 5: Run the new test to verify it passes**

Run: `npm test -- src/__tests__/public-certifications-route.test.js`

Expected: PASS.

- [ ] **Step 6: Verify the complete change**

Run: `npm test -- src/__tests__/public-privacy.test.js src/__tests__/public-certifications-route.test.js && npm run build`

Expected: both Vitest files pass and Vite completes without a build error.

- [ ] **Step 7: Commit the public report**

Run: `git add src/__tests__/public-certifications-route.test.js src/pages/production/Certifications.jsx src/App.jsx src/pages/LandingPage.jsx`

Run: `git commit -m "feat: add public GAP report"`
