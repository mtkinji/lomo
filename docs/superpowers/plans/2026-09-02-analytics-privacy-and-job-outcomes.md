# Analytics Privacy and Job Outcomes Implementation Plan

> **For Andrew:** Execute this plan in the current checkout, preserving unrelated concurrent Money work. Use focused regression tests during implementation and `npm run verify:changed -- --run` once at completion.

**Goal:** Make Kwilt's product analytics safe at the collection boundary, preserve useful bounded dimensions, and cover the most important first-value and outcome moments introduced by recent features.

**Architecture:** All client analytics flow through one event-aware sanitizer. Screen and lifecycle collection use explicit wrappers that never receive navigation parameters or URLs. Authentication transitions reset PostHog identity before a new user is identified. A catalog test keeps every declared event classified, and the instrumentation map records which job outcomes are active versus planned or server-owned.

**Tech Stack:** React Native, TypeScript, PostHog React Native, Jest, EAS.

---

### Task 1: Lock down the collection boundary

- [x] Add regressions in `src/services/analytics/analytics.test.ts` for safe screens, lifecycle events, and identity reset.
- [x] Disable PostHog automatic lifecycle URL collection in `src/services/analytics/posthogClient.ts`.
- [x] Add manual lifecycle tracking in `src/services/analytics/appLifecycleAnalytics.ts` and mount it from `App.tsx`.
- [x] Remove route parameters from screen capture in `src/navigation/RootNavigator.tsx`.
- [x] Reset PostHog on confirmed sign-out and before account switches in `App.tsx`.

### Task 2: Make event payloads explicit

- [x] Add typed, event-specific property schemas in `src/services/analytics/eventPropertySchemas.ts`.
- [x] Change `sanitizeAnalyticsProps` to require an event name and retain only that event's bounded dimensions.
- [x] Keep identity properties on a separate, minimal schema.
- [x] Add integration regressions for Food, Screen Time, Unified Chat, notifications, and Money dimensions that were previously stripped.

### Task 3: Add first-value and outcome coverage

- [x] Emit capability-onboarding path completion from `App.tsx` using only bounded path metadata.
- [x] Add Focus session start/completion/end events at the shared session lifecycle boundaries.
- [x] Add bounded outcome events at confirmed boundaries for Explore, Games' timer, Chores, live conversation, and global search; record full-game completion as a planned gap rather than inferring it from navigation.
- [x] Add a Money trusted-decision completion event at the successful mutation boundary without amounts, merchant data, or transaction identifiers.

### Task 4: Make coverage operable

- [x] Add lifecycle/disposition metadata for active, planned, server-only, and deprecated events.
- [x] Add a Jest registry check that fails when an event is declared without a disposition.
- [x] Add `docs/analytics/instrumentation-map.md` linking job-flow steps to events, data sources, environment filters, and known gaps.
- [x] Enable bounded PostHog collection in TestFlight via `POSTHOG_ENABLED=true` while retaining `KWILT_APP_ENV=test`.

### Task 5: Verify and hand off

- [x] Run focused analytics, onboarding, and Focus tests.
- [ ] Run `npm run verify:changed -- --run` once after the intended slice is complete.
- [x] Record any live-dashboard or physical TestFlight checks as separate proof gates.
