# Job Delivery Implementation Plan: screen-time-rule-boundary

Date: 2026-07-09
Planner: Codex
Question: Which Screen Time/App Control state should be durable account data, and which must remain device-local?

## Recommendation

Persist app-control rule intent as account-backed product data, while keeping opaque Apple FamilyControls token selections device-local.

## Job Context

- Job: Maya uses budget state to slow down spending apps at the right moments.
- Promised outcome: app-control rules are understandable, durable, and honest about device setup.
- Persona: Maya, family organizer with iOS Screen Time controls.
- Job step: configure and maintain budget-linked app controls.
- User question: architecture feels strange; Screen Time controls are one of the cross-device/source-boundary risks.
- Current delivery score: not scored here; Screen Time UX has recent iteration.
- Recommended action type: persistence and privacy boundary stabilization.

## Why This Is Highest Leverage

- Strategic weight: app controls combine server budget truth, Apple device-local APIs, and household semantics.
- Current friction: `budgetScreenTimeStorage` stores settings in AsyncStorage, while category/rule identity is partly local and partly policy-derived.
- Evidence: selected apps/categories and policy overrides live in `src/services/budgetScreenTimeStorage.ts`; category settings renders rule rows from local policy detail.
- What gets easier for Maya: she can understand which rules exist for the category, and which devices still need app selection setup.

## Current Workflow Evidence

- Current path:
  - Category settings shows Screen Time Controls.
  - App/category token selections are saved locally.
  - Screen Time runtime reconciles restrictions from local settings.
- What works:
  - Apple token privacy is respected by keeping opaque selections local.
  - Settings UX has a concrete rule-builder pattern.
- What breaks or drags:
  - rule intent and selected tokens are not separated.
  - a household or second device cannot distinguish "rule exists" from "this device is configured."
  - category rename/plan changes can drift from local policy state.
- Source/runtime refs:
  - `app/app-control/[budgetId].tsx`
  - `src/services/budgetScreenTime.ts`
  - `src/services/budgetScreenTimeStorage.ts`
  - `src/services/budgetScreenTimeRuntime.ts`
  - `src/services/appleEcosystem/screenTimeProtection.ts`

## Chosen Change

Create server-backed app-control rules for intent:

- `category_id`
- `enabled`
- `conditions`
- `condition_operator`
- `threshold_percent`
- `unlock_window_minutes`
- `hard_stop_conditions`
- `mode` / future rule type

Keep local/device setup:

- selected app tokens
- selected category tokens
- authorization status
- local picker setup timestamp

## PM Decision Summary

| Decision | Recommended choice | Why it matters |
| --- | --- | --- |
| What follows the account | Rule intent: enabled, when to pause, threshold, unlock window, category relationship. | This is the product rule Maya expects to survive restart/device changes. |
| What stays on the phone | Apple app/category token selections and authorization status. | Apple selections are opaque/device-specific and should not be treated as portable account data. |
| Household behavior | Rule intent can be visible to household members; device setup remains per device. | A shared family budget can have a shared rule, but each phone still needs local Screen Time setup. |
| UI language | Show "rule configured" separately from "apps selected on this device." | Avoids making a second device look broken when it simply has not picked apps yet. |
| First release | Support one durable rule per category, with current conditions and threshold. | Matches current UX and avoids over-modeling advanced policy combinations. |

## Field Classification

| Field / concept | Store where | Product meaning |
| --- | --- | --- |
| category id | Supabase | The budget category this rule belongs to. |
| enabled | Supabase | Whether the rule should be considered active. |
| conditions | Supabase | The budget signals that should trigger a pause. |
| threshold percent | Supabase | The near-limit threshold, such as 95%. |
| unlock window | Supabase | How long access opens after review. |
| hard-stop conditions | Supabase | Conditions where access should stay blocked unless changed. |
| selected app tokens | Device local storage | The apps this specific device can pause. |
| selected category tokens | Device local storage | The app categories this specific device can pause. |
| authorization status | Device local storage/runtime | Whether this device can use Screen Time APIs. |
| local picker timestamp | Device local storage | Whether this device has completed setup recently. |

## User-Visible States

The UI should distinguish these states:

- No rule exists.
  - Copy direction: "Set up app pauses for this category."
- Rule exists and this device has selected apps.
  - Copy direction: "Pause selected apps when Shopping is near its limit."
- Rule exists but this device has not selected apps.
  - Copy direction: "Rule is saved. Choose apps on this device."
- Rule exists but Screen Time permission is missing.
  - Copy direction: "Allow Screen Time on this device to pause apps."
- Rule exists but this build cannot access Screen Time.
  - Copy direction: "Use a Screen Time-enabled build to choose apps."

This prevents the product from implying that Apple app selections sync across
devices when they do not.

## Data Model

Add `budget_app_control_rules`:

- `id uuid primary key`
- `user_id uuid not null`
- `household_id uuid null`
- `category_id uuid not null`
- `enabled boolean not null default true`
- `conditions text[] not null`
- `condition_operator text not null default 'any'`
- `trigger_threshold_percent integer not null default 95`
- `unlock_window_minutes integer not null default 15`
- `hard_stop_conditions text[] not null default '{}'`
- `mode text not null default 'review_gate'`
- `created_at`, `updated_at`

Local storage shape should reference `rule_id` and `category_id`, but store only
opaque Apple token payloads locally.

## Scope

In scope:

- Classify current Screen Time settings fields.
- Add `budget_app_control_rules` migration and repository.
- Update category settings to read/write rule intent through Supabase.
- Keep selected apps/categories in AsyncStorage keyed by rule/category/device.
- Show honest setup status: rule exists, this device configured/not configured.

Out of scope:

- Syncing Apple token selections across devices.
- Building family child-device management.
- Changing native Screen Time extensions beyond the minimum needed for rule reads.

## Implementation Tasks

1. Inventory all fields in `BudgetScreenTimeSettings` and classify them.
2. Add Supabase table and RLS for app-control rule intent.
3. Add typed repository functions for app-control rules.
4. Update local storage shape so device selections reference durable rule/category IDs.
5. Update category settings UI to edit server-backed rule intent and local app selections separately.
6. Update runtime reconciliation to combine server rule intent with local device token selections.
7. Add local storage migration for current policy overrides.
8. Add simulator/device verification steps for setup, restart, and rule edit.

## Acceptance Criteria

- [ ] Rule condition/threshold edits persist after app restart.
- [ ] Selected app/category tokens remain local and are not uploaded.
- [ ] A second device/session can see the rule intent but shows that local app selection setup is still needed.
- [ ] Reconciliation pauses/unpauses apps based on the durable rule plus local token selection.
- [ ] Category rename does not create stale policy copy.
- [ ] UI distinguishes rule saved, apps selected, permission missing, and unsupported build states.
- [ ] Local storage migration preserves existing selected app/category tokens for the current device.

## Verification

- [ ] `npm run lint`
- [ ] Screen Time settings normalization tests
- [ ] local storage migration test
- [ ] iOS simulator or device: configure selected apps, edit threshold, restart, verify rule and token behavior
- [ ] real Screen Time-enabled build verification before release
- [ ] code review confirms selected Apple token payloads are not written to Supabase

## Map Update Trigger

Update `docs/job-delivery-map.yaml` when app-control setup is demonstrably more reliable.

Fields likely to change:

- Screen Time setup and rule maintenance evidence.

Do not update the score until:

- a Screen Time-enabled build proves local token selection and server rule intent work together.

## Risks And Open Questions

- Local token selections should be keyed by both `rule_id` and `category_id` during migration so old local data can be recovered if one id changes.
- Rule intent ownership should start user-owned with household-readable semantics unless shared editing is explicitly chosen.
- The UI copy needs one live simulator review because "rule saved, choose apps on this device" is conceptually accurate but can still feel broken if overexplained.
