---
id: brief-coordinated-engagement-plan-pilot
title: Coordinated engagement foundation and Plan pilot
status: draft
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life]
related_briefs: []
owner: andrew
last_updated: 2026-09-24
---

# Coordinated engagement foundation and Plan pilot

## Context

Plan kickoff and Explore recap can independently present bottom guides. Andrew occasionally finds Plan's invitation valuable despite rarely tapping it. Preserve this discovery path while making presentation coherent and measuring useful outcomes. This is the first bounded release of the [app-wide engagement strategy](../design-explorations/contextual-plan-kickoff/03-app-wide-engagement-strategy.md), not an implementation or retention result.

## Target audience

Burned-out productivity power users need help deciding what matters without maintaining another system. The foundation must also support the distinct family, financial, food, reflection, and coordination jobs in the parent strategy; Plan is the first learning case, not a mandatory activation funnel.

## Representative persona

Marcus opens Explore to review an outing. He should finish that task. Later, after organizing to-dos, an invitation to fit an unresolved commitment into his day may be useful even if he never independently visits Plan.

## Aspirational design challenge

How might we help Marcus discover useful planning at a receptive moment while preserving his current intention and his willingness to hear from Kwilt again?

## Hero JTBD

`jtbd-move-the-few-things-that-matter`: reduce the decision burden between an intention and an honest next action.

## Job flow step

[Marcus's flow](../job-flows/marcus-move-the-few-things-that-matter.md), Decide next action, currently scores 3/5. Plan recommendations are the existing offering. This release improves access and protects ongoing work; it does not justify increasing the delivery score before observed use.

## JTBD framing

Help me notice when planning would make my next action easier, without covering what I came here to do. Respecting my attention supports `jtbd-trust-this-app-with-my-life`; entering and using a feasible plan supports the hero job.

## Design

### Release boundaries

**A — Protection and measurement:** coordinate Plan kickoff, Explore recap/first-place guidance, and workflow feedback; declare existing onboarding, handoff, editor, recording, Focus, and purchase contexts as blockers for unsolicited invitations. Audit all BottomGuide callers before calling exclusivity app-wide. Keep canonical components and current notification opt-ins. No new notification type, automatic permission request, or experiment activation.

**B — Plan learning pilot:** introduce relevant safe-boundary invitations behind a default-off experiment gate, reconcile with existing dailyShowUp, and verify the destination. A must pass before B enrolls anyone. Existing user-requested reminders remain enabled and outside growth quotas.

**Later:** migrate remaining senders to the same contract; add other capability-specific activation paths. Do not expand the first release into a generic inbox, new recommendation engine, streak redesign, or multi-device coordination backend.

### Attention contract

Capabilities supply candidate facts; shared policy decides eligibility and ownership; surfaces render. Do not let component mount order determine priority.

1. Snapshot navigation, active task, pending guides, preferences, account, source freshness, and budget before selecting a candidate. Unknown or not-yet-hydrated context suppresses optional invitations.
2. User-initiated work and required recovery win. Relevant local task guidance wins over Plan discovery. A merely local promotional prompt does not automatically win.
3. Grant one foreground guide a unique lease. Only its holder may render. Release safely on close, account change, route invalidation, or unmount; a stale release cannot clear a newer owner's lease.
4. If a stronger user-initiated flow starts while Plan is visible, hide Plan and preserve the flow. Record interruption separately from explicit dismissal; retain any impression already earned.
5. Closing a guide is not a new invitation opportunity. Do not drain deferred candidates, start a timer to reveal Plan, or mark unseen Explore content as seen.
6. Re-evaluate only on a named independent boundary. Returning from a notification, dismissing a sheet, animation completion, and foregrounding alone are not evidence of readiness.

### Concrete first-pilot trigger

Treatment starts narrowly: a successful user-initiated to-do capture or priority change followed by an explicit return to the to-do list, with at least one still-actionable unscheduled priority and a valid Plan destination. A save that continues editing is not a boundary. No invitation if the user immediately starts another action. Revalidate at grant time; pending navigation and input activity cancel the attempt.

This is a testable relevance hypothesis, not an assertion that every captured task needs scheduling. Do not infer urgency from titles, location, mood, or missing calendar permissions. If the existing recommendation engine cannot provide a useful feasible result, suppress this variant; do not compute a second scheduling engine in the prompt layer.

Inside Plan, show useful planning content directly. A planning-notification tap opens recommendations without kickoff. Explore remains independently usable; finishing or dismissing its recap is not the first pilot's Plan trigger.

### Budget and lifecycle

- One unsolicited foreground invitation per account on this installation per local day and per session. For this pilot, a session resets only after at least 30 minutes continuously backgrounded; process restart alone does not grant a fresh budget. This threshold is a declared product hypothesis.
- Persist actual impressions and dismissal history; an eligible candidate or attempted render does not consume an impression. Grant reserves the slot until visible acknowledgment or cancellation. Rehydration must complete before optional presentation.
- Two explicit family dismissals in 14 days pause unsolicited invitations from that family for seven days. Acceptance, interruption, expiry, and permission failure are different outcomes. Preserve existing stronger opt-outs and chosen routine schedules.
- Opportunities expire at the end of their local planning day or earlier when source facts cease to apply. Time-zone changes require re-evaluation; moving the clock or restarting must not bypass minimum spacing.
- Account switch clears leases and rehydrates only the new account's history. Do not advertise account-wide cross-device guarantees from installation-local storage.

### Existing notifications

dailyShowUp already routes into Plan recommendations. Preserve its settings and permission semantics. Do not create another planning notification or silently reinterpret an in-app preference as OS consent.

Model one planning opportunity with separate delivery attempts. If an existing scheduled dailyShowUp represents that opportunity, reserve its delivery channel so an in-app kickoff does not duplicate it. If it is canceled before presentation, release the reservation. A successful planning outcome cancels stale optional attempts; dismissing an invitation does not silently disable a requested daily routine. Useful Plan content remains available regardless of delivery state.

Before enabling this coordination, explicitly classify dailyShowUp's current preference as chosen routine versus default growth behavior. Legacy ambiguous consent retains its current scope; it is not permission for more channels. Foreground notification handling should suppress duplicate optional planning banners when Plan content is already visible or protected work is active, while preserving notification response routing and requested reminder/timer behavior. OS background delivery cannot be assumed controllable using foreground-only state.

### Measurement contract

Use existing `usePlanRecommendationFunnel` and `PlanRecommendationCommitted` as source anchors. The current hook records recommendation outcomes, but does not establish invitation attribution or coverage of manual planning.

New envelope: pseudonymous account/installation identity, opportunity ID, family, policy version, stable experiment assignment, coarse capability context, boundary kind, timestamp, and reason. No task text, coordinates, calendar titles, balances, or messages.

Record opportunity qualification before treatment-specific timing, then eligibility decision, suppression reason, lease grant, actual visible acknowledgment, explicit dismissal, CTA, destination reached, expiry, and meaningful outcome. Maintain schedule/estimated-fire/open distinctions from the notification ledger. Emit one visible event per attempt despite rerenders. Hidden, covered, backgrounded, or canceled-before-visible candidates do not earn an impression.

Primary pilot outcome: at least one successfully persisted recommendation commitment within 24 hours of the user's first qualifying opportunity. Count eligible assigned users, including non-tappers, rather than only exposed users. Report manual scheduling separately until its persisted-success instrumentation is verified. Never count CTA, destination arrival, or notification open as completed planning.

Secondary outcomes: the committed activity subsequently advanced/completed, useful repeat planning at 7/28 days, and sampled helpfulness. These are imperfect proxies for real-life benefit; interview occasional users like Andrew as well as frequent users. No individual causal attribution to a prompt based solely on temporal proximity.

### Experiment and rollout

1. Internal deterministic replay and device verification establish collision protection, routing, consent, and event integrity.
2. Release A observes baseline qualifying opportunities and outcomes with no randomized messaging change. This baseline informs enrollment and minimum worthwhile effect; it is not the experimental control.
3. For B, assign eligible users once before variant-specific presentation. Control receives generic invitation at an allowed safe boundary; treatment requires the concrete planning trigger above. Both share protection, caps, dismissal handling, and useful destination. This tests the combined relevance/timing policy, not copy in isolation.
4. Keep notification schedules identical between arms. Record channel reservations and suppressed opportunities, so channel competition does not disappear from analysis.
5. Determine sample size and numeric burden tolerances from baseline before enrollment. If too few users qualify, keep the pilot qualitative; do not declare a winner from taps or a four-week deadline.
6. Immediately disable the new invitation policy for duplicate guides, broken destinations, ignored opt-outs, cross-account leakage, or interference with requested reminders. A kill switch suppresses optional presentation while retaining collision protection, direct Plan access, and requested reminders. Never roll back to overlapping guides.

### Source touchpoints and regression obligations

Paths are current audit anchors, not proof these changes exist.

| Area | Existing source | Required evidence |
| --- | --- | --- |
| Shared presentation | `src/services/moments/orchestrator.ts`, `src/ui/BottomGuide.tsx` | Deterministic ranking, atomic lease, stale-release safety, no auto-drain |
| Plan host | `src/features/plan/PlanKickoffDrawerHost.tsx` | Foreground alone cannot open; preferences/cadence preserved; hidden is not dismissed |
| Explore | `src/capabilities/explore/screens/ExploreMapScreen.tsx` | Recap wins in either registration order; pending content not acknowledged by suppression |
| Feedback | `src/features/workflow-feedback/WorkflowFeedbackHost.tsx` | Cannot take the slot while another guide owns it |
| Root/navigation | `src/navigation/RootNavigator.tsx`, `src/navigation/CapabilityShellContext.tsx` | Hydration, route transitions, explicit handoffs, account switch |
| Notifications | `src/services/NotificationService.ts`, `src/services/notifications/NotificationDeliveryLedger.ts` | Reservation/cancellation, foreground duplicates, denied permission, timezone reconciliation |
| Destination/outcomes | `src/features/plan/PlanScreen.tsx`, `src/features/plan/usePlanRecommendationFunnel.ts`, `src/features/plan/PlanPager.tsx` | Notification bypass, persisted commit, failed commit not counted, outcome linked without requiring a tap |

Regression-first tests must reproduce Plan/Explore competition before changes. Policy, branching hooks, persistence, and scheduling require red/green tests. Include both registration orders, same-tick contenders, React rerenders/unmount, account swap, stale lease release, next-day rollover, background restart, two dismissals, cancellation before visibility, protected input/recording/Focus, and notification entry.

Run focused tests during implementation, scoped `verify:local` at handoff, and `verify:changed` at integration. Native review must include the original Explore scenario and a person who has never visited Plan reaching it through an invitation. Source tests alone do not prove physical notification delivery or visual non-overlap.

## Success signal

Users can finish their chosen task without competing guides, still discover Plan without visiting it first, and reach an actionable destination in one tap. The pilot increases useful planning among eligible users with acceptable interruption cost. Low tap rate alone neither disqualifies nor validates the invitation.

## Open questions

- Baseline eligible population, commitment rate, minimum worthwhile improvement, and numeric burden tolerances require fresh analytics; no live results were inspected.
- Confirm dailyShowUp consent/default semantics and full manual-planning outcome coverage before B enrollment.
- Audit all guide and modal producers before claiming global exclusivity. The bounded A adapters alone cannot establish it.
- Multi-device deduplication and additional capability pilots remain separately scoped follow-ons.

## Current proof boundary

Source inspection: normal checkout `codex/onboarding-shoreline`, HEAD `59e8acff`, with unrelated dirty changes. This brief changes documentation only. No policy implementation, notification migration, experiment enrollment, external Goal/Activity write, runtime verification, or release has occurred.
