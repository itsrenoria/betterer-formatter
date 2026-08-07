# Contextual Language Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Distinguish preferred-language markers from detected-language filename matching everywhere the Detection UI names the language carrier.

**Architecture:** Add one pure label function to the UI state module, then consume it from the existing detection map, reason list, and Custom modal. Keep all internal selection values and generated URLs unchanged.

**Tech Stack:** Browser-native JavaScript modules, HTML, Node test runner.

## Global Constraints

- Display choices are **Preferred**, **Detected**, and **Hide**.
- Carrier labels are **Languages (Preferred)** and **Languages (Detected)**.
- Keep `uLanguages`, `languages`, and `off` unchanged.
- Preserve the existing two-commit branch history by amending the serverless commit.

---

### Task 1: Contextual language copy

**Files:**
- Modify: `src/ui-state.mjs`
- Modify: `index.html`
- Modify: `tests/ui-state.test.mjs`
- Modify: `tests/index.test.mjs`

**Interfaces:**
- Produces: `detectionCategoryLabel(category, languageMode) -> string`
- Consumes: current UI state `languageMode` values.

- [ ] **Step 1: Write failing tests**

Assert that `detectionCategoryLabel('languages', 'uLanguages')` returns `Languages (Preferred)`, `detectionCategoryLabel('languages', 'languages')` returns `Languages (Detected)`, and non-language categories retain their existing labels. Assert that the HTML uses `Preferred`, `Detected`, and `Hide` for the display controls.

- [ ] **Step 2: Run focused tests and verify failure**

Run `node --test tests/ui-state.test.mjs tests/index.test.mjs`. Expected: failure because the contextual helper and new copy do not exist.

- [ ] **Step 3: Add the shared helper and consume it**

Export the pure helper from `src/ui-state.mjs`. Import it in `index.html` and use it for detection chips, reason headings, and carrier rows. Rename the two visible language controls and their explanatory copy without changing `data-v` attributes.

- [ ] **Step 4: Run focused and complete verification**

Run `node --test tests/ui-state.test.mjs tests/index.test.mjs`, then `npm run verify`. Expected: all tests and generated-export checks pass.

- [ ] **Step 5: Verify and publish the copy-only change**

Amend `ddd03c9`, force-with-lease update `origin/serverless` and `origin/ghostwire`, wait for GitHub Pages, then inspect Preferred and Detected modes on the published site.
