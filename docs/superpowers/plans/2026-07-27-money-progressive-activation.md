# Money Progressive Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Money’s agreed GTM promise a truthful Guided Overture learning offer and codify the first-trusted-decision boundary.

**Architecture:** Guided Overture continues to own orientation and Agent context; Money owns activation truth. This slice updates the concept contract and durable product artifacts while keeping Money excluded from live mode until native decision evidence exists.

**Tech Stack:** React Native, TypeScript, Jest, Markdown product artifacts.

---

### Task 1: Lock the Money offer contract with tests

**Files:**
- Modify: `src/features/guidedOverture/guidedOvertureModel.test.ts`
- Modify: `src/features/guidedOverture/guidedOvertureModel.ts`

- [ ] Replace the bill-alert expectations with the canonical decision-shaped promise.
- [ ] Assert that Money remains `concept`, lacks a live destination, and cannot enter live mode.
- [ ] Run `npm test -- --runInBand src/features/guidedOverture/guidedOvertureModel.test.ts` and observe the initial failure.
- [ ] Implement the minimal offer and handoff-copy change.
- [ ] Rerun the focused test and confirm it passes.

### Task 2: Connect the operating artifacts

**Files:**
- Modify: `docs/job-flows/maya-review-budget-reality-before-spending.md`
- Modify: `docs/feature-briefs/guided-overture-onboarding.md`
- Modify: `src/features/guidedOverture/FEATURE.md`

- [ ] Add the acquisition/entry and first-trusted-decision steps to the Money flow.
- [ ] Record their evidence-based delivery scores and remaining gaps.
- [ ] Link Guided Overture and its manifest to `brief-money-progressive-activation` without changing production status.

### Task 3: Verify the learning release

- [ ] Run the focused Guided Overture test.
- [ ] Run `npm run product:lint`.
- [ ] Run `npm run verify:changed -- --run`.
- [ ] Inspect `git diff --check`, status, and the complete diff before handoff.

