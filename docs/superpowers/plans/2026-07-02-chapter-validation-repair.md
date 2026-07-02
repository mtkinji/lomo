# Chapter Validation Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce failed weekly Chapter writes by making validation requirements match available evidence and making the retry prompt repair the exact validator failure.

**Architecture:** Keep the UI fallback unchanged. Fix the backend writer contract in shared chapter-output validation helpers plus the `chapters-generate` Edge Function prompt assembly. Do not loosen the factuality validator; instead, cap impossible citation counts and feed validation failures back into the retry prompt.

**Tech Stack:** TypeScript, Jest shared-function tests, Supabase Edge Function Deno TypeScript.

---

### Task 1: Evidence-Aware Citation Requirement

**Files:**
- Modify: `supabase/functions/_shared/chapterOutputValidation.ts`
- Modify: `supabase/functions/_shared/__tests__/chapterOutputValidation.test.ts`
- Modify: `supabase/functions/chapters-generate/index.ts`

- [x] **Step 1: Write failing tests**

Add tests proving `resolveCitedExampleRequirement` caps the required citations to available evidence and can return `0` for empty weeks.

- [x] **Step 2: Run tests to verify it fails**

Run:

```bash
npm test -- supabase/functions/_shared/__tests__/chapterOutputValidation.test.ts --runInBand
```

Observed: fails because `availableExampleCount` is not supported and weekly still requires `4`.

- [x] **Step 3: Implement minimal helper change**

Add `availableExampleCount?: number` to `resolveCitedExampleRequirement`, return `Math.min(base, available)` when provided, and update generator prompt + validator call sites to pass `allowedIds.size`.

- [x] **Step 4: Verify tests pass**

Run:

```bash
npm test -- supabase/functions/_shared/__tests__/chapterOutputValidation.test.ts --runInBand
```

Expected: pass.

### Task 2: Validator-Aware Retry Prompt

**Files:**
- Modify: `supabase/functions/_shared/chapterOutputValidation.ts`
- Modify: `supabase/functions/_shared/__tests__/chapterOutputValidation.test.ts`
- Modify: `supabase/functions/chapters-generate/index.ts`

- [x] **Step 1: Write failing tests**

Add tests for a helper that turns validator errors into targeted retry instructions, including the production health-keyword failure and caption-number failure.

- [x] **Step 2: Run tests to verify it fails**

Run:

```bash
npm test -- supabase/functions/_shared/__tests__/chapterOutputValidation.test.ts --runInBand
```

Observed: fails because the helper does not exist.

- [x] **Step 3: Implement minimal helper + prompt plumbing**

Export `buildValidationRepairInstruction(error)`. Pass the first validation error into the stricter retry call. Include the repair instruction in the system message and JSON prompt payload as `validation_repair`.

- [x] **Step 4: Verify focused tests pass**

Run:

```bash
npm test -- supabase/functions/_shared/__tests__/chapterOutputValidation.test.ts --runInBand
```

Expected: pass.

### Task 3: Final Verification

**Files:**
- Verify changed files only.

- [x] **Step 1: Run Chapter shared tests**

```bash
npm test -- supabase/functions/_shared/__tests__/chapterOutputValidation.test.ts supabase/functions/_shared/__tests__/chapterHealth.test.ts --runInBand
```

- [x] **Step 2: Run diff-aware verification**

```bash
npm run verify:changed -- --run
```

- [x] **Step 3: Inspect diff**

```bash
git diff --stat
git diff -- supabase/functions/_shared/chapterOutputValidation.ts supabase/functions/_shared/__tests__/chapterOutputValidation.test.ts supabase/functions/chapters-generate/index.ts
```
