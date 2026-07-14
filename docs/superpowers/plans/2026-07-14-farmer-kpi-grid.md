# Farmer KPI Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render seven farmer-category KPI cards plus tourism in a balanced 3+3+2 landing grid.

**Architecture:** Reuse the existing farmer widget fetch and type catalog. Summary mode emits category cards; `LandingPage` stores the clicked category and passes it into the existing modal.

**Tech Stack:** React, CSS Grid, Vitest, Testing Library.

## Global Constraints

- No new API, query, dependency, or modal.
- Existing detail filters and tourism behavior stay unchanged.
- Desktop uses 3+3+2; mobile uses one column.

---

### Task 1: Category KPI summary

**Files:**

- Modify: `src/components/widgets/FarmerInstitutesV2Widget.jsx`
- Test: `src/components/widgets/__tests__/FarmerInstitutesV2Widget.test.jsx`

**Interfaces:**

- Consumes: existing cached farmer rows and `INSTITUTE_V2_TYPES`.
- Produces: `onOpen(typeKey)` from each summary card and `initialType` for detail mode.

- [ ] Add a focused test asserting seven summary buttons and `onOpen('large_plots')`.
- [ ] Run `pnpm vitest run src/components/widgets/__tests__/FarmerInstitutesV2Widget.test.jsx`; expect failure because one combined card exists.
- [ ] Map `INSTITUTE_V2_TYPES` to buttons, summarize rows per type, and initialize detail selection from `initialType`.
- [ ] Run the focused test; expect pass.

### Task 2: Landing grid integration

**Files:**

- Modify: `src/pages/LandingPage.jsx`
- Modify: `src/pages/LandingPage.css`

**Interfaces:**

- Consumes: `onOpen(typeKey)` and `initialType` from Task 1.
- Produces: six third-width farmer cards, then one half-width farmer card beside tourism.

- [ ] Store clicked farmer type before opening `liveFarmerDevelopment`.
- [ ] Pass the stored type to modal detail mode.
- [ ] Use one CSS grid; first six farmer cards span one column, final farmer and tourism cards span half-row.
- [ ] Add one-column mobile rule.
- [ ] Run focused widget tests and `pnpm eslint` on changed JSX files; expect pass.
- [ ] Commit changed implementation files.
