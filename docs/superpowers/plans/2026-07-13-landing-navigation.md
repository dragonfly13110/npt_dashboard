# Landing Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep every desktop floating shortcut reachable and retain the landing header at the top while scrolling.

**Architecture:** Change only the landing-page stylesheet. The existing floating links, including Manual Portal and website evaluation, remain unchanged; the sidebar is constrained to viewport height and scrolls internally when needed. The existing top navigation stays fixed above page content.

**Tech Stack:** React, CSS, Playwright.

## Global Constraints

- Reuse the existing links and components; add no dependencies.
- Keep the floating navigation hidden on mobile, where the existing bottom navigation is used.

---

### Task 1: Constrain the desktop floating navigation

**Files:**

- Modify: `src/pages/LandingPage.css:55-177`
- Modify: `tests/e2e/landingEnhancements.spec.js`

**Interfaces:**

- Consumes: `.landing-floating-system-tabs`, `.landing-system-tab`, existing `/manual` link and website-evaluation button in `src/pages/LandingPage.jsx`.
- Produces: a desktop sidebar that keeps all existing shortcuts reachable within the viewport.

- [ ] **Step 1: Write the failing end-to-end assertion**

```js
await page.setViewportSize({ width: 1440, height: 600 });
await expect(page.locator('.landing-floating-system-tabs')).toHaveCSS(
  'overflow-y',
  'auto'
);
await expect(page.locator('a[href="/manual"]')).toBeAttached();
```

- [ ] **Step 2: Run the landing enhancement test to verify it fails**

Run: `npm run test:e2e -- tests/e2e/landingEnhancements.spec.js`

Expected: FAIL because `.landing-floating-system-tabs` has no internal vertical scrolling.

- [ ] **Step 3: Add the minimal viewport-bound sidebar styles**

```css
.landing-floating-system-tabs {
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
}
```

Keep the existing `position: fixed`, `top: 50%`, `transform: translateY(-50%)`, mobile hide rule, and all existing shortcut markup unchanged.

- [ ] **Step 4: Run the landing enhancement test to verify it passes**

Run: `npm run test:e2e -- tests/e2e/landingEnhancements.spec.js`

Expected: PASS.

- [ ] **Step 5: Run static validation**

Run: `npm run lint:src && npm run build`

Expected: both commands exit 0.

- [ ] **Step 6: Commit the focused change**

```bash
git add src/pages/LandingPage.css tests/e2e/landingEnhancements.spec.js
git commit -m "fix: keep landing shortcuts reachable"
```

## Self-review

- Spec coverage: Task 1 preserves the existing Manual Portal and website-evaluation links, caps the sidebar within the viewport, and retains the pre-existing fixed top navigation.
- Placeholder scan: no placeholders or undefined interfaces.
- Type consistency: CSS selectors and Playwright locators correspond to the existing page markup.
