# Kwilt invitations, notifications, and activation strategy

Date: 2026-09-24
Status: proposed product strategy; source audit, not implemented or validated by a retention experiment.

First-release contract: [Coordinated engagement foundation and Plan pilot](../../feature-briefs/coordinated-engagement-plan-pilot.md). It specifies protection, a bounded relevance trigger, existing-notification coordination, outcome measurement, and rollout gates; status remains draft.

## Decision and revised frame

Keep proactive guidance as a core product capability. Coordinate it around meaningful progress, relevance, and the user's current task. Preserve a way for Plan and other capabilities to reach people who do not already visit them.

Andrew's evidence: he rarely taps the Plan guide but is glad of it when he does. That establishes occasional experienced value, not population conversion or causal retention. Removing the guide based on tap frequency would discard an unmeasured benefit. Equally, occasional usefulness does not establish that its present frequency is worthwhile.

This supersedes the earlier leaning toward Plan-only presentation. Capability ownership protects active work; it does not prohibit useful invitations across capabilities. Calmness should describe the quality of an invitation, not require that Kwilt wait passively for discovery.

The design challenge is now: How can Kwilt help people discover, experience, and return to useful life support through timely invitations, while making the app's combined demands on their attention feel coherent?

## Current evidence and gaps

Inspected source: normal checkout, `codex/onboarding-shoreline`, HEAD `59e8acff`, with unrelated uncommitted changes. No runtime or production analytics inspection in this review. No callable PostHog reporting tool was found in this session; past dashboard documentation is not a fresh measurement.

| Area | Observed in current source/documents | Strategic implication |
| --- | --- | --- |
| Plan kickoff | Global host; cadence/preferences and Screen Time checks; no Explore occupancy check | Preserve activation reach while changing eligibility and presentation ownership |
| Daily show-up | Existing notification tap opens Plan recommendations | Reconcile this with Plan kickoff before adding another planning notification type |
| System nudges | Constants specify two/day, six-hour spacing, and suppression near explicit reminders | Reuse existing rules; do not describe this as an app-wide enforced budget |
| Delivery ledger | Scheduling/open records and estimated firing support caps and backoff | Scheduled or estimated fired does not establish that a person saw a notification |
| Foreground notification handling | Base handler requests alert/banner/list presentation without route-specific discrimination | An OS banner can still interrupt even if bottom guides are coordinated |
| Moment orchestrator | Gates selected nudges/navigation using onboarding, toast suppression, celebration, paywall, and cooldown | Useful foundation, not a universal presentation owner; existing priority order needs review |
| Capability-specific surfaces | Explore recaps, onboarding flows, feedback guide, Money checks, shared-delivery and meal-attention routing, Focus/timer integrations | Every sender needs a declared purpose and eligibility contract |
| Older engagement documentation | Supports proactive motivation, but has stale Today references and historical checklists | Keep the proactive ambition; refresh contracts against current product and source |
| Activation brief | Existing strict Arc → Goal → Activity funnel and meaningful-action ambition | Expand measurement to capability-specific value paths; not every useful user must create an Arc |
| Copy | Current variants include streak-loss/return-pressure language | Audit pressure and promise accuracy, particularly for lapse recovery |

Primary source pointers: `src/services/NotificationService.ts`, `src/services/notifications/NotificationDeliveryLedger.ts`, `src/services/notifications/notificationBackgroundTask.ts`, `src/services/moments/orchestrator.ts`, `src/features/plan/PlanKickoffDrawerHost.tsx`, `src/capabilities/explore/screens/ExploreMapScreen.tsx`, `src/features/workflow-feedback/WorkflowFeedbackHost.tsx`, `docs/analytics-notifications.md`, `docs/engagement-and-motivation-system.md`, `docs/feature-briefs/activation-experiment-loop.md`.

Coverage is an architectural source audit and a proposed whole-app policy. Individual production senders, server delivery, email, SMS, and every destination have not been audited end to end.

## Product outcomes and audiences

Activation: experience a first useful outcome in the job that brought the person to Kwilt. Account creation, permission grants, and tutorial completion are prerequisites or diagnostics, not sufficient activation.

Retention: return to that useful job when it recurs. Daily frequency fits some jobs; weekly money review and occasional shared play should not be judged by daily opens.

- Marcus: decide the next honest action. The job-flow document scores this step 3/5. Plan invitations should convert uncertainty into a feasible action.
- Maya: know the next doable action (2/5 in the family-life flow) and keep using the system without configuration burden. Food, chores, Money, and coordination need their own entry paths.
- Elena: choose a small next step after drift (3/5) and let go of intentions that no longer fit (2/5). Return prompts should offer an easy restart or adjustment, not demand repayment of missed days.
- Other audiences: apply the same contract to identity reflection, private accountability, and AI help, with outcomes defined by the owning job flow.

These are existing document scores, not fresh measurements. No delivery score is increased by this strategy.

## Six kinds of engagement

| Kind | Purpose | Appropriate treatment | Success |
| --- | --- | --- | --- |
| Requested reminder | Honor a time/event the user chose | Predictable notification or timer; object-specific destination | Commitment supported or rescheduled |
| Task guidance and recovery | Unblock the current job | Contextual inline help or guide; explicit handoff owns attention | User continues the task |
| Activation invitation | Reveal a useful next step the user may not know exists | One contextual or cross-capability invitation at a safe moment | First value reached |
| Routine and return invitation | Bring someone back to an established benefit | Chosen schedule, meaningful change, or bounded lapse follow-up | Repeat value, including unprompted return |
| Result and relationship update | Deliver a requested result or another person's relevant action | In-place update, grouped receipt, notification when wanted | Result understood or coordination completed |
| Feedback and commercial offer | Learn from use or explain a relevant paid boundary | After value, within a strict optional budget; purchase flow only when initiated/relevant | Feedback useful or offer understood without losing the original job |

A family request is not interchangeable with a marketing nudge. A paywall or streak celebration does not automatically outrank unfinished work. Classification follows the actual purpose, not the component name or sender team.

## Lifecycle strategy

1. Arrival: preserve the acquisition/deep-link intent and help complete one useful job. Introduce only what unlocks that outcome.
2. First value: acknowledge the result in context. Offer a return mechanism only when its benefit is apparent—such as a reminder for an actual commitment.
3. Early repetition: invite the second useful action in the same job; avoid immediately advertising the full capability catalog.
4. Established use: support user-chosen routines and relevant changes. Regular successful use should reduce unnecessary teaching.
5. Adjacent discovery: offer another capability when it resolves a demonstrated need. A captured task without a feasible time can justify a Plan invitation. Simply having never opened Plan is insufficient.
6. Lapse and recovery: offer one easy way back to something still relevant, including pausing or changing it. Use a bounded sequence with long backoff; no backlog of missed prompts.

## Channel and presentation rules

Use the smallest surface that can communicate the value and support the decision. Stronger presentation is justified when a decision is consequential or a new workflow would otherwise remain undiscoverable.

- Inline guidance: teach or offer an action next to relevant content. It remains available without requiring dismissal.
- Bottom guide: one meaningful bounded decision, with enough context to explain why it appears. A cross-capability guide is allowed at a genuine stopping point when it offers stronger value than leaving the user alone.
- Receipt/toast: acknowledge completed work or offer a reversible next step; do not use it to hide required decisions.
- Quiet navigation indicator: identify real available content, without accumulated guilt counters.
- OS notification: a requested reminder, relevant event, or opted-in routine with a useful destination. Foreground handling checks whether the content is already visible and whether another task owns attention.
- Home: use its existing relationship/content contract for appropriate updates; do not turn it into a generic queue of promotional tasks.
- Email and SMS: separate permission and purpose; do not automatically escalate an ignored in-app invitation into another channel. Existing authorized phone-agent communications remain their own contract.
- Widgets/Live Activities: support glanceable information or an ongoing chosen activity; avoid replicating the same alert across all surfaces.

Apple recommends useful concise notifications, avoiding repeated notifications for the same event, and unobtrusive handling while the app is foregrounded. Those principles inform this design; they do not establish whether a Kwilt prompt improves retention. [Apple notifications guidance](https://developer.apple.com/design/human-interface-guidelines/notifications)

## Eligibility, ownership, and frequency

Each invitation declares: user job, trigger evidence, source object, destination, freshness, allowed surfaces, completion condition, opt-out scope, and expiry. Evaluate eligibility before ranking. A compelling invitation with a broken destination is ineligible.

Priority:

1. Required recovery or a user-initiated handoff relevant to the present task.
2. User-requested actions and reminders, preserving their timing contract.
3. Guidance needed to continue the active capability's job.
4. Relevant result/relationship updates and contextual activation opportunities.
5. Cross-capability discovery, routine invitations, surveys, and commercial discovery.

Priority determines presentation, not authorization for underlying actions. Screen Time exceptions retain normal authentication. A requested reminder can arrive without forcibly replacing an active editor. Mere presence in a capability does not make all its unsolicited prompts high priority.

At most one foreground guide; no automatic succession of deferred guides after dismissal. Re-evaluate the next opportunity at a meaningful navigation or task boundary. Typing, recording, cooking timers, active Focus, checkout, authentication, and unsaved editing are protected contexts for optional growth prompts. Explicit user requests can still open the needed controls.

Provisional pilot defaults, to validate rather than present as research-backed optima:

- At most one unsolicited foreground invitation per session and one per local day across capabilities.
- At most one proactive growth notification per local day initially, sharing the same opportunity identity with any in-app invitation. Compare against current frequency before broad rollout.
- Requested reminders, timers, and necessary coordination are exempt from the growth quota, but still deduplicated and grouped when appropriate.
- After two explicit dismissals of the same invitation family within 14 days, pause that family for seven days. A user-requested schedule is not silently disabled by this rule.
- Treat repeated nonresponse as uncertain evidence: reduce frequency experimentally, not as proof of dislike. A confirmed irrelevant/don't-show-again choice immediately controls eligibility.
- Quiet hours and chosen timing apply; delayed opportunities expire rather than forming a catch-up queue. Time zone changes, logout, and account switches must reconcile scheduled requests.

Prefer an explainable choice among eligible opportunities: relevance to current intent, concrete benefit, freshness, readiness, and recent attention burden. Do not start with an opaque numerical score or inferred emotions.

## What happens to Plan

Keep an intentional invitation outside Plan. First remove its unconditional foreground behavior and coordinate it with dailyShowUp, which already enters Plan recommendations.

| Situation | Proposed behavior |
| --- | --- |
| Explore recap or another active guide | That guide retains attention. Plan is not presented underneath or immediately after dismissal |
| Recording, editing, Focus, or explicit deep-link task | Finish/preserve the task; optional planning waits |
| Natural stopping point, relevant work to organize, no competing task | A bounded cross-capability Plan invitation may appear under the shared budget |
| Inside Plan | Show useful planning content or a contextual invitation; do not add an introductory guide over already-open recommendations |
| User taps a planning notification | Enter current useful planning state directly, bypassing another invitation |
| User wants a scheduled planning rhythm | Offer a chosen time/cadence through the existing notification system, coordinated with dailyShowUp |
| Notifications unavailable/declined | Retain an in-app discovery path; no repeated permission asks |
| Planning already occurred | Resolve the invitation using an explicit Plan outcome; an unrelated Activity completion alone does not prove planning is complete |

The promise should preview actual value: a feasible next step, an unresolved scheduling decision, or the user's chosen review routine. Calendar availability or recommendation counts must be based on current evidence. Empty recommendations should still offer an honest useful destination or make that invitation ineligible.

Do not migrate existing in-app-only preferences into new OS notification consent. Reconcile existing dailyShowUp preferences rather than silently enabling a second reminder.

## App-wide coverage and candidate value events

This table proposes what to invite and measure, not that every trigger is implemented or should launch at once.

| Capability/surface | Useful activation or return moment | Appropriate invitation | Outcome beyond a tap |
| --- | --- | --- | --- |
| Plan | Need to choose/fit a next action | Relevant stopping point or chosen planning time | Action committed/scheduled, then undertaken; repeated planning use |
| To-dos | First captured intention or chosen due reminder | Confirmation, contextual next step, requested reminder | Intention retrieved, advanced, completed, or deliberately rescheduled |
| Goals | Outcome named but next step missing | Concrete next-action help | Feasible activity created and advanced |
| Arcs | User wants direction or sees a relevant pattern | In-context reflection invitation | Meaningful direction chosen or revised; no forced capture classification |
| Chapters | A substantive reflection is ready | Quiet ready state or opted-in digest | Reflection reviewed and useful insight/next step recorded |
| Money | First understandable financial picture or saved review | Contextual setup help; chosen check reminder | Review resolves a question or informs a decision; no needless edit requirement |
| Recipes/Meal Plan | A meal choice can become a usable plan | Contextual shortlist/next-shop invitation | Meal selected and ingredients acted on |
| Groceries | Shopping intention ready to use | List continuity or requested shopping reminder | Items obtained/list used; edits alone are weak proof |
| Explore | Deliberate path completion or meaningful discovery | Immediate recording receipt; quiet automatic-history summary unless wanted | User understands/reviews saved outing; another chosen outing |
| Screen Time | Blocked-app handoff or selected setup intent | Relevant recovery guide; setup help tied to expressed need | Correct rule understood and authorized next step taken |
| Focus | Chosen session starts/ends | Status and completion notification | Intended session completed or consciously adjusted |
| Chores/household | Responsibility becomes actionable | Appropriate participant request/reminder | Chore performed/acknowledged; less coordination work |
| Home/shared goals | Invitation, check-in, or reply for this recipient | Grouped relevant relationship update | Participation or response; no implied blanket sharing |
| Games | Invited play or awaited turn | Invitation/turn update | Shared play starts or continues |
| Chat/Phone Agent | Requested result or review decision is ready | Result in existing conversation; external delivery only as authorized | Request resolved or reviewed action executed |
| Onboarding/account | A prerequisite blocks the chosen first job | Just-in-time help and resumable state | First useful capability outcome |
| Feedback/paywall | Value just experienced or genuine entitlement boundary | Bounded feedback or contextual offer | Learning/conversion with original task recoverable |

Automatic sensing is not by itself meaningful active use. Neither is opening a recap. Some outcomes require sampled self-report because the real-life result occurs outside Kwilt.

## Measurement and the low-click/high-value problem

Evaluate the whole eligible population, not only people who tapped. A reminder may help someone act later or outside the app; that is a hypothesis to measure, not automatic attribution. A small number of high-value uses may justify a low-frequency prompt. Frequent dismissals may reveal bad timing rather than bad capability value.

Instrument: eligible, suppressed/deferred with reason, actual in-app visible, scheduled, foreground received, estimated fired, opened, dismissed where observable, snoozed, opted out, destination reached, promised outcome, and subsequent repeat outcome. Record opportunity/family, variant, channel, coarse context, app build, and outcome timestamps. Avoid sensitive task titles, coordinates, balances, and message text in analytics.

Keep separate concepts:

- Scheduled is not delivered; estimated fired is not seen.
- Seen is not understood; opened is not value.
- Dismissed is not completed; silence is not refusal.
- Delivered via notification does not remove useful content from its owning capability. It prevents another interruptive invitation for the same opportunity.
- Completion, explicit opt-out, expiry, and changed source state cancel stale invitations and pending notifications.

Primary metrics: capability-specific first-value rate among eligible users, time to first value, repeat meaningful use at the job's cadence, and helpfulness on a small sampled cohort. Track 7/28-day meaningful return for frequent jobs with explicit cohort/window definitions; do not force monthly jobs into this window.

Guardrails: notification opt-outs, repeated dismissals, abandoned active tasks, broken destinations, overlapping surfaces, and reported annoyance. Notification opens and permission grants are diagnostics. Do not call notification_opened alone a meaningful action in the activation dashboard.

## First experiment and learning plan

First establish visible-impression and downstream-outcome measurement plus collision prevention. Both experiment arms receive collision protection; do not preserve a broken overlap as a control.

Then run one Plan experiment:

- Control: current generic invitation, collision-safe and within the same frequency budget.
- Treatment: invitation based on a concrete planning opportunity at a safe stopping point, with the same budget and destination quality.
- Stable random assignment by user; use household assignment when testing shared household workflows to reduce spillover.
- Primary outcome: a meaningful planning action within 24 hours of eligibility; secondary: a related action undertaken and meaningful return over 7/28 days. Inspect non-tappers too.
- Guardrails: opt-out/dismissal burden and interruption of existing tasks.
- Choose sample needs from baseline conversion and the minimum worthwhile improvement before launch. Review after four weeks or adequate enrollment, whichever permits a meaningful read; a calendar deadline alone does not establish a winner.
- For small cohorts: founder use plus recruited interviews can identify confusion and bad timing. Report directional evidence and intervals; do not announce causal retention gains.
- After establishing invitation quality, test a small no-unsolicited-Plan-invitation holdout to measure incremental value. Leave requested reminders intact. Test schedule/channel separately afterward to avoid changing everything at once.

Promote if meaningful outcomes improve without unacceptable burden; reduce frequency if useful but costly; repair the destination if taps rise without outcomes; retire only when a credible test or strong repeated qualitative evidence shows little benefit relative to cost.

Firebase's experiment guidance illustrates measuring retention and conversion alongside messaging performance; Kwilt can use its existing analytics and does not need to adopt Firebase for this strategy. [Messaging experiments](https://firebase.google.com/docs/ab-testing/abtest-with-console)

## Implementation direction and delivery order

Capabilities own candidate facts, destination, and outcome. A shared policy owns eligibility, attention budget, priority, and delivery choice. Surface components own rendering. Existing notification service, ledger, and moment guard are starting points.

Separate opportunity resolution from channel attempts. Store stable account-scoped opportunity keys, validity windows, explicit outcome state, and delivery attempts with honest evidence levels. Acquire a single presentation slot atomically before rendering a guide. Rank before acquiring so effect/mount order does not determine the winner. Release on close, navigation, account change, and unmount. Never acknowledge a deferred guide as seen.

Reserve scheduled growth slots when scheduling; do not rely only on retrospective fired estimates to prevent multiple future senders using the same slot. Reconcile actual pending requests, expiry, cancellations, and app foreground changes. Device-wide guarantees are distinct from account-wide coordination; multi-device delivery requires a separate deduplication contract before claiming one-per-person behavior.

1. Foundation: inventory each current sender and map it to a kind/outcome; correct Plan/Explore collision; route-sensitive foreground handling; instrument eligible/visible/outcome. This immediately preserves helpful prompts while making them testable.
2. Plan pilot: safe cross-capability timing, stronger evidence-based invitation, direct useful destination, coordination with existing dailyShowUp. Validate on device and small release before broad enablement.
3. Activation paths: apply the same contract to two priority jobs—family next-action and Food/Money as chosen from real entry cohorts. Use capability-specific first value; offer reminders after demonstrated benefit.
4. Coverage: integrate remaining capability senders, feedback, paywalls, result updates, and relationship updates. Audit external channels and multi-device behavior separately.
5. Learning: review one experiment at a time, comparing outcome benefit and burden. Add timing personalization only after deterministic rules and sufficient evidence justify it.

Andrew owns product priorities and accepted tradeoffs; implementation owners own source/delivery correctness; the product-learning review owns cohort definitions and conclusions. No new recurring automation is created by this document.

## Acceptance scenarios for implementation

- Explore recap and eligible Plan invitation never overlap; dismissal does not immediately reveal a queued Plan prompt.
- User who never enters Plan can still encounter a relevant invitation and reach useful planning in one tap.
- Notification tap bypasses redundant kickoff; organic entry to Plan still shows useful content.
- Requested timer/reminder is not lost because the optional growth quota is exhausted.
- Active editing/recording and explicit handoffs retain their context.
- Dismissal, expiry, completion, permissions, account changes, and time-zone shifts produce consistent scheduling.
- Stale or empty source material yields an honest destination or suppression.
- Event receipts distinguish actual visible guides from scheduled and estimated notifications.
- Meaningful downstream use and burden can be compared by randomized arm with internal/test users excluded.

## What this changes now

The strategy retains proactive activation as an essential hypothesis and preserves cross-capability discovery. It replaces the earlier Plan-only preference and strict delivery-equals-resolution language. No app behavior, notification schedule, experiment assignment, or production record has changed in this strategy update.
