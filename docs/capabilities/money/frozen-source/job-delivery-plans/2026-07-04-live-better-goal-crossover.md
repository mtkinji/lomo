# Job Delivery Implementation Plan: live-better-goal-crossover

Date: 2026-07-04
Planner: Codex
Question: Should Kwilt Money use financial advice as a crossover moment that encourages Blaire to create a Kwilt goal to live better?

## Recommendation

Build a narrow Budget insight -> Kwilt goal practice bridge, not a broad financial advice engine or a generic app-install ad.

The value proposition should be:

> Budget helps you see the money pattern. Kwilt helps you practice the change.

The crossover should teach that the two apps are better together because Budget can ground a goal in real spending evidence and Kwilt can carry that goal into follow-through moments.

## Job Context

- Job: `review-budget-reality-before-spending`
- Promised outcome: when Maya/Blaire is near a spend-triggering app or purchase moment, Kwilt Money helps her see live budget reality first so the next action is intentional.
- Persona: Blaire as an early-user instance of `Maya`
- Job step: `sustain-household-pattern`
- User question: Is this helping me live the pattern I chose?
- Current delivery score: 1.5
- Recommended action type: implemented learning slice on Plan with share fallback.

## Why This Is Highest Leverage

- Strategic weight: long-term retention and Kwilt/Kwilt Money product relationship.
- Current friction: Budget can show budget reality but does not yet help the user turn repeated money patterns into durable behavior change.
- Evidence: Plan and Ask surfaces exist, but the job-delivery map says the durable household pattern loop is not proven.
- What gets easier for Blaire: she can move from "I should spend smarter" to one clear goal draft with a first action.

## Design-Loop Basis

- Exploration: `docs/design-explorations/live-better-goal-crossover`
- Frame: Budget notices the money pattern; Kwilt carries the follow-through.
- Converged concept: Goal Draft Bridge.
- Learning-release scope: one compact offer, one full-screen goal interstitial, one explicit handoff/fallback.
- Evidence plan: seen/opened/accepted/shared/dismissed/fallback events plus qualitative feedback.

## Current Workflow Evidence

- Current path: Budget home shows meters; Budget Plan shows a thin weekly review summary; Budget Detail shows meter/activity; Ask is a fixture workspace.
- What works: the app has enough budget evidence surfaces to place one insight.
- What breaks or drags: there is no advice object, no goal-bridge payload, and no confirmed Kwilt import/deep-link contract.
- Source/runtime refs:
  - `app/(tabs)/plan.tsx`
  - `app/budgets/[budgetId].tsx`
  - `app/(tabs)/ask.tsx`
  - `docs/job-delivery-map.yaml`

## Chosen Change

Add a compact contextual offer that appears on Budget home or Plan when one spending pattern is available. The banner invites the user to set a goal without naming Kwilt. Tapping it opens a full-screen interstitial that teaches the ecosystem relationship:

- Budget found the pattern.
- Kwilt can help the user turn it into a goal and first step.
- Budget shares the pattern summary, not raw transaction rows.

The interstitial then branches:

- If Kwilt is installed, offer to open a goal draft in Kwilt.
- If Kwilt is not installed, explain why Kwilt helps with goals like this and offer install/share fallback without making the moment feel like an ad.

## Scope

In scope:

- One pattern insight, likely for Shopping/Amazon household.
- `BudgetPatternInsight` or equivalent derived view.
- `GoalBridgeDraft` type.
- Compact offer UI.
- Full-screen ecosystem explanation and draft preview interstitial.
- Kwilt install detection through `Linking.canOpenURL('kwilt://plan')`.
- Installed-state CTA path: `Open in Kwilt`.
- Not-installed-state CTA path: `Get Kwilt` or `Share goal draft`.
- Handoff/fallback event tracking, including install-state branch.
- Privacy and non-shaming copy that follows `docs/copy-voice.md` and the shared Kwilt voice rules.

Out of scope:

- Generic financial advice.
- Ask-based agent coaching.
- Weekly review automation.
- Direct raw transaction export.
- Automatic Goal or Arc creation.
- Investment, debt, tax, or credit advice.
- Generic Kwilt promotion not tied to a real Budget pattern.

## Unique Ecosystem Value

A generic goal app can hold "spend less on shopping." Kwilt + Kwilt Money can make that goal evidence-aware, timing-aware, and reversible.

Differentiators to preserve:

- **Evidence-aware goal setup:** the goal starts from a real Budget signal, not a vague aspiration.
- **Moment-aware support:** the same Budget lane can later inform app-gate pauses, reminders, or review receipts.
- **Closed-loop learning:** Budget can later show whether the spending pattern improved after the goal was practiced.
- **Privacy boundary:** Kwilt receives a summary and draft, not raw transaction rows.
- **User-owned handoff:** Budget proposes; Kwilt is the place to shape and carry the goal after the user accepts the draft.

This is the reason to use both apps instead of storing a family spending goal in Notes, Reminders, or a generic task app.

## UX Flow

### Banner

Purpose: notice the money pattern and invite a goal, without pitching Kwilt yet.

Example:

```text
Shopping is running hot.
Set a goal?
```

### Interstitial Shared Frame

Purpose: teach the app relationship and show the draft without turning the screen into a form.

Preferred copy direction:

```text
Set a goal for Shopping?
Projected $1,489 against $100 planned

Want help changing this pattern?
Kwilt can turn Budget patterns into small goals and next steps.

Budget shares this summary, not your transaction rows.
```

Avoid copy that frames the handoff as Budget being insufficient. The interstitial should explain the positive ecosystem division of labor instead.

### If Kwilt Is Installed

The user already has the follow-through app, so this should feel like continuity.

Primary CTA:

```text
Open in Kwilt
```

Secondary CTAs:

```text
Share instead
Not now
```

Handoff behavior:

- Open Kwilt with a goal draft/import route when available.
- Include budget name, evidence summary, goal title, first step, and source app metadata.
- Do not include raw transaction rows.

### If Kwilt Is Not Installed

The user needs to understand why another app is relevant before being asked to download it.

Primary CTA:

```text
Get Kwilt
```

Secondary CTAs:

```text
Share goal draft
Not now
```

Support copy:

```text
Kwilt is our goal app. It helps carry patterns like this into small steps and follow-through.
```

Handoff behavior:

- Prefer an install/deferred-link path that can preserve the draft after onboarding.
- If deferred linking is not ready, keep the share-sheet fallback and make that limitation clear.
- Do not make download the only path out of the interstitial.

## Implementation Tasks

### Phase 1: Rewrite The Moment

1. Completed: Replace any "goal instead of rule tweak" copy with positive ecosystem teaching.
2. Completed: Update `buildLiveBetterGoalInsight` detail copy to avoid putting down Budget.
3. Completed: Update `LiveBetterGoalCard` interstitial body to explain:
   - Budget found the pattern.
   - Kwilt helps carry it into a small goal and first step.
   - Budget shares summary only.
4. Completed: Keep the banner short and Budget-native: pattern plus `Set a goal?` / `View`.
5. Completed: Add focused copy assertions in `scripts/budget-forecast-smoke.mjs`.

### Phase 2: Branch By Kwilt Install State

1. Completed: Preserve `Linking.canOpenURL('kwilt://plan')` as the installed-app signal.
2. Completed: When installed:
   - show `Open in Kwilt`,
   - keep `Share instead`,
   - record installed-state open/fallback events.
3. Completed: When not installed:
   - show `Get Kwilt`,
   - keep `Share goal draft`,
   - record not-installed install-intent/share/dismiss events.
4. Completed: Ensure the not-installed branch explains why Kwilt helps before the CTA.
5. Completed: Keep the draft visible in both branches without making the interstitial feel like an editing form.

### Phase 3: Define The Handoff Contract

1. Completed: Create a `GoalBridgeHandoffPayload` shape with:
   - source app,
   - source budget id/name,
   - evidence summary,
   - goal title,
   - goal why,
   - first step,
   - horizon label,
   - privacy marker that raw transactions were excluded.
2. Completed: Define the target Kwilt URL/import route. Current Budget-side implementation uses the known Plan route with source/draft query params:

```text
kwilt://plan?source=kwilt-budget
```

3. Completed: Keep share fallback because the exact Kwilt goal-import route is not yet confirmed.
4. Completed: Use `https://go.kwilt.app/open/plan?source=kwilt-budget...` for the not-installed handoff; treat deferred draft preservation as future work.

### Phase 4: Close The Loop Back To Budget

1. Add event names that distinguish:
   - insight seen,
   - interstitial opened,
   - draft shared,
   - Kwilt installed branch opened,
   - not-installed branch install tapped,
   - share fallback used,
   - dismissed.
2. Do not update `docs/job-delivery-map.yaml` score until a user can traverse the flow and the goal draft feels helpful.
3. Future iteration: when Kwilt can confirm a goal was created, show quiet Budget receipt copy such as:

```text
Goal started in Kwilt.
```

4. Future iteration: let Budget later compare the lane pattern after the goal period and summarize whether the pattern changed.

## Acceptance Criteria

- [x] The user sees the source budget evidence before the draft.
- [x] The user can dismiss without penalty.
- [x] The user can see the title and first action.
- [x] No raw transaction rows are included in the handoff/fallback.
- [x] The copy avoids shame, scoring, productivity language, self-help fog, and bank-warning voice.
- [x] Local events do not include sensitive transaction text.
- [x] The installed-Kwilt branch feels like continuity, not promotion.
- [x] The not-installed branch explains why Kwilt helps before asking for install.
- [x] The fallback path is understandable if Kwilt cannot open.
- [x] iOS declares the `kwilt` scheme so installed-app detection can work.

## Verification

- [x] `npm run job-delivery:check`
- [x] `npm run lint`
- [x] Focused tests for the insight/draft builder via `npm run test:forecast`.
- [ ] Simulator check of installed-state and not-installed-state interstitial copy.
- [x] Manual copy review against `docs/copy-voice.md` and the Kwilt copywriting guide.

## Map Update Trigger

Update `docs/job-delivery-map.yaml` when:

- the learning release exists in app,
- Blaire/Andrew can traverse insight -> draft -> handoff/fallback,
- qualitative feedback says the crossover feels helpful rather than noisy.

Fields likely to change:

- `sustain-household-pattern.current_ux_flows`
- `sustain-household-pattern.evidence`
- `sustain-household-pattern.surface_opportunities`
- `sustain-household-pattern.recommended_next_action`

Do not update the score until:

- runtime evidence shows the goal draft improves follow-through or at least creates a credible path to it.

## Risks And Open Questions

- The phrase "live better" may be too broad for user-facing copy.
- Deep linking/import into Kwilt may need work in the Kwilt repo.
- Deferred install handoff may require App Store/TestFlight routing that is not available in local dev.
- Budget advice can become noisy if more than one suggestion appears.
- The first insight must be grounded enough to avoid generic financial-coach vibes.
- We need to decide whether Budget should ever receive goal-created or goal-progress status back from Kwilt.
