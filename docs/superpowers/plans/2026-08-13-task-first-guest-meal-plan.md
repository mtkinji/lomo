# Task-First Guest Meal Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a guest immediately understand and complete Andrew's Meal Plan task, then offer Kwilt as an optional continuation after submission.

**Architecture:** Keep the existing expiring bearer-link and security-definer RPC boundary. Replace ambiguous per-meal emoji reactions with bounded candidate choices plus one suggestion, render those choices in a compact Plan-like list, and reveal the existing App Store CTA only in the successful submission receipt. Preserve organizer authority: guest input informs the Plan but never mutates candidates, Household membership, lifecycle, or Groceries.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS, Supabase Postgres RPCs, Expo/React Native Plan projection, Node test runner, Jest.

---

## UI contract

- **Job:** When Andrew asks Blaire what she would eat, she needs to mark fitting meals or suggest one missing idea so Andrew can finish the next grocery plan.
- **Authority chain:** user direction -> guest feedback brief -> native Kwilt Plan composition -> hosted site components.
- **Three-second read:** `Andrew's Meal Plan` -> `Which meals would you eat?` -> first meal choice.
- **Primary action:** `Send my choices`, enabled by at least one selected meal or a suggestion.
- **Primary information:** inviter, next-grocery-trip context, candidate image/title, selection state.
- **Secondary information:** private-response note, optional name.
- **Reveal later:** expiry and `Get Kwilt free` benefits appear in the submitted receipt.
- **Scan order:** task -> Plan rows -> suggestion -> send.
- **Must not add:** ranking, emoji interpretation, visible aggregate votes, Household membership, required install, guest Plan mutation, or pre-task promotional card.
- **Nearest precedent:** native Plan drawer compact meal rows; hosted page differs by adding guest choice controls and excluding organizer actions.
- **Required states:** active empty, active selected, suggestion entered, saving, error, submitted, unavailable.
- **Proof path:** live-shaped local `/meal-plan/[token]` route at iPhone width, choice plus suggestion submission, submitted receipt, full-page screenshot.

### Task 1: Restore the bounded choice contract

**Files:**
- Modify: `/Users/andrewwatanabe/kwilt-site/lib/guestMealFeedback.test.ts`
- Modify: `/Users/andrewwatanabe/kwilt-site/lib/guestMealFeedback.ts`
- Modify: `/Users/andrewwatanabe/kwilt-site/app/api/meal-plan-feedback/route.ts`

- [ ] Write tests that accept unique selected candidate IDs, an optional bounded suggestion, and reject reactions, duplicates, over-limit input, invalid UUIDs, or empty responses.
- [ ] Run `npm test -- --test-name-pattern='guest Meal Plan feedback boundary'` in `kwilt-site` and confirm the new assertions fail.
- [ ] Replace the public reaction submission shape with `selectedCandidateIds`, `suggestion`, and optional `displayName`; submit through `submit_kwilt_guest_meal_feedback`.
- [ ] Rerun the focused site test and confirm it passes.

### Task 2: Build the task-first hosted Plan

**Files:**
- Modify: `/Users/andrewwatanabe/kwilt-site/app/meal-plan/[token]/page.tsx`
- Modify: `/Users/andrewwatanabe/kwilt-site/app/meal-plan/[token]/GuestMealFeedbackForm.tsx`
- Modify: `/Users/andrewwatanabe/kwilt-site/lib/guestMealFeedback.test.ts`

- [ ] Add source-contract assertions for `Andrew's Meal Plan`, `Which meals would you eat?`, `Send my choices`, and a success-only `Get Kwilt free` invitation.
- [ ] Run the focused site test and confirm the new assertions fail.
- [ ] Render compact native-Plan-like rows with one `I'd eat this` checkbox, an inline `Suggest a meal` field, optional guest name, and a dynamic send label.
- [ ] Render a submitted receipt summarizing the sent choices and suggestion, with the existing install button and no install requirement before submission.
- [ ] Rerun site tests and `npm run build`.

### Task 3: Align the database and native organizer projection

**Files:**
- Modify: `/Users/andrewwatanabe/Kwilt/supabase/pending-migrations/20260813020931_unify_guest_plan_reactions.sql`
- Modify: `/Users/andrewwatanabe/Kwilt/src/capabilities/meal-planning/domain/guestMealFeedbackMigration.test.ts`
- Modify: `/Users/andrewwatanabe/Kwilt/docs/feature-briefs/guest-meal-plan-feedback.md`
- Modify: `/Users/andrewwatanabe/Kwilt/docs/design-explorations/guest-meal-plan-feedback/03-converge.md`
- Modify: `/Users/andrewwatanabe/Kwilt/docs/design-explorations/guest-meal-plan-feedback/04-learning-release.md`

- [ ] Change the migration test contract from emoji maps to existing bounded choices and suggestion fields projected into the regular Plan surface.
- [ ] Run the focused Jest migration test and confirm the new assertions fail.
- [ ] Rewrite the unshipped reaction migration as a forward-compatible choice/suggestion projection while preserving old response columns, RPC grants, RLS, expiry, revocation, capacity, and guest-label boundaries.
- [ ] Update the brief and convergence records to state the task-first choice contract and post-submit vitality invitation.
- [ ] Rerun the focused Jest test and product lint.

### Task 4: Verify and render

**Files:**
- No additional production files expected.

- [ ] Run focused site tests, site build, focused native Jest, and `npm run verify:changed -- --run`.
- [ ] Start the local site with production-shaped guest projection data without changing production state.
- [ ] Exercise selection, suggestion, submit, error-safe behavior, and the success-only install invitation at an iPhone viewport.
- [ ] Capture top, full-page, and submitted-receipt screenshots.
- [ ] Run `git diff --check` and report the exact code, browser, migration, and deployment proof boundaries.
