---
id: brief-workflow-experience-pulse
title: Workflow Experience Pulse
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-put-intention-before-impulse, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-activation-experiment-loop, brief-rule-based-screen-time-contextual-unlock]
owner: andrew
last_updated: 2026-09-02
---

## Context

Kwilt can increasingly observe whether a customer completed a workflow, but successful completion alone does not reveal whether the experience was satisfying, easy, or understandable. A generic survey system would create interruption debt and ambiguous data. Kwilt instead needs a small, governed feedback utility that can ask one contextually registered categorical question after a meaningful workflow moment, while behavioral events remain the authority for whether the job actually succeeded.

V1 stores feedback as bounded analytics events in PostHog. It does not add a Supabase feedback table because no product behavior, support case, customer-visible history, or operational workflow depends on an individual response.

## Target audience

`audience-aspirational-family-organizers` is primary. This audience uses Kwilt to reduce the coordination and decision work of family life. Feedback must therefore be quick, situational, and respectful of attention rather than another recurring task to maintain.

## Representative persona

Maya has just adjusted a spending plan, finalized meals, corrected a transaction, or encountered a Screen Time restriction. She can answer one precise question about that experience, but should never have to interpret which workflow Kwilt means, type an essay, or dismiss repeated survey requests.

## Aspirational design challenge

How might we learn whether Maya can successfully accomplish each important workflow and feels good about how it worked, while preserving Kwilt's calm interface, privacy boundary, and behavioral source of truth?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — the pulse helps Kwilt improve the bounded workflows through which Maya turns household intentions into completed action. It is not a general sentiment survey or a substitute for observing completion.

## Job flow step

Primary flow: `job-flow-maya-move-family-life-forward`.

The utility primarily improves the learning loop around Maya's weak handoffs between deciding, acting, seeing a trustworthy receipt, and knowing what happens next. The pilot also attaches to these same-hero flows:

- `job-flow-maya-review-budget-reality-before-spending`
- `job-flow-maya-feed-household-with-less-work`
- `job-flow-maya-establish-family-screen-time`

The pulse does not directly raise a delivery score. It supplies explanatory evidence. A score changes only when shipped workflow behavior and the job flow's stated proof boundary improve.

## JTBD framing

When Maya completes or interprets a meaningful household workflow, she wants any request for feedback to clearly refer to what just happened and take only a moment, so she can help Kwilt improve without being pulled away from the action she came to finish. This serves `jtbd-carry-intentions-into-action` by examining action handoffs, `jtbd-put-intention-before-impulse` by measuring Screen Time clarity and clearing, and `jtbd-trust-this-app-with-my-life` by keeping completion evidence, perception, privacy, and native-device truth distinct.

## Design

### Product contract

The Workflow Experience Pulse is a shared, registry-driven utility with five rules:

1. Callers request a registered `prompt_id`; they cannot supply arbitrary question copy, categories, reasons, analytics dimensions, or cooldowns.
2. A behavioral event or UI state establishes eligibility. A rating never asserts that a workflow succeeded.
3. Only one feedback interaction may be active. Existing receipts, errors, paywalls, keyboards, modals, drawers, and guides take precedence.
4. Every visible presentation has one opaque `feedback_instance_id` and exactly one terminal event: submitted or dismissed.
5. Responses and optional reason codes go to PostHog. Local storage contains suppression metadata only.

### Pilot registry

| Prompt ID | Category and question | Eligible moment | Placement | Low or mixed follow-up reasons |
| --- | --- | --- | --- | --- |
| `money_rebalance_satisfaction_v1` | Satisfaction — “How satisfied are you with this spending plan?” | `money_rebalance_saved`, after the settings drawer is closed and the saved result is visible | Standalone bottom guide | `result_unclear`, `too_much_work`, `priorities_missed`, `result_not_trusted` |
| `meal_plan_finalized_satisfaction_v1` | Satisfaction — “How satisfied are you with the meal plan you just made?” | `meal_plan_finalized`, after any reminder offer closes and `NextMeals` is stable | Standalone bottom guide | `choices_didnt_fit`, `too_much_work`, `household_fit_unclear`, `next_step_unclear` |
| `money_transaction_correction_ease_v1` | Ease — “How easy was it to correct this transaction?” | Successful `money_mutation_completed` with `operation = transaction_category`, after any merchant-rule offer resolves and a stable Money surface is visible | Standalone bottom guide | `category_hard_to_find`, `too_many_steps`, `save_result_unclear`, `merchant_rule_distracting` |
| `screen_time_block_reason_clarity_v1` | Clarity — “How clear is why this app is blocked?” | A real `screen_time_guide_shown`, after the explanation is rendered | Inline in the existing Screen Time unlock guide | `reason_too_vague`, `reason_too_much_information`, `reason_unexpected_rule`, `reason_next_step_unclear` |
| `screen_time_block_clear_ease_v1` | Ease — “How easy was it to open the app temporarily?” | `screen_time_temporary_open_applied` with `outcome = opened` | Uses the same inline slot only if no question was already shown in that guide episode | `reason_action_hard_to_find`, `reason_too_many_steps`, `reason_result_unclear`, `reason_still_seemed_blocked` |

Question wording belongs to the registry and is versioned with the prompt. A wording, scale, checkpoint, or reason-set change creates a new prompt version rather than silently changing historical meaning.

### Categorical scales

All questions use five ordered, accessible choices and store a numeric `response_value` from 1 through 5 plus a bounded `response_band`.

- Satisfaction: Very dissatisfied, Dissatisfied, Neutral, Satisfied, Very satisfied.
- Ease: Very difficult, Difficult, Neutral, Easy, Very easy.
- Clarity: Not clear, Slightly clear, Moderately clear, Very clear, Completely clear.
- Values 1–2 are `negative`, 3 is `mixed`, and 4–5 are `positive`.

A 4–5 choice submits immediately, shows a brief acknowledgement, and closes. A 1–3 choice submits the rating first and then offers the registered reason chips with Done and Skip. The reason is optional. No free-text field or keyboard appears in V1.

### Presentation contract

The standalone surface uses the canonical `BottomGuide` with no scrim, floating layout, and dynamic sizing. It contains one short question, five categorical choices, an explicit close control, and no promotional or explanatory copy.

When the assessed UI is already the canonical Screen Time bottom guide, the shared question renderer appears as an inline slot after the rule explanation and before the final actions. It must not open or stack a second drawer. The first question to become visibly presented is immutable and consumes that guide episode's one-question budget. On a stable `opened` result, clearing Ease may claim the slot only if Clarity was suppressed or cancelled before becoming visible. An `applying`, denied, or failed result does not qualify as clearing success.

The host generates `feedback_instance_id` only when a standalone prompt is visibly presented or an inline slot becomes visible. A queued request that expires, is cancelled, or is suppressed emits no feedback event.

### Attention and suppression policy

Eligibility is evaluated against identity-scoped local suppression metadata and current UI state:

- Maximum one visible feedback interaction per in-memory app session.
- Default minimum encounter count is two; none of the pilots opts into first-use research.
- Fourteen-day global cooldown after a submitted rating.
- Thirty-day global cooldown after dismissal without a rating.
- Sixty-day cooldown for the same `prompt_id` and question version after a terminal response or dismissal.
- Seven-day global cooldown after a visible exposure with no terminal action.
- No percentage sampling in the client. PostHog feature flags decide whether the utility and Screen Time pilot are enabled.
- A pending standalone request expires after 30 seconds and must be cancelled when its qualifying context is no longer visible.
- An authenticated identity uses a user-scoped suppression namespace. Anonymous use falls back to the existing install ID. Reinstall and cross-device duplication are known V1 limits.

The main flag is `workflow-experience-pulse-v1`. Screen Time additionally requires `workflow-experience-pulse-screen-time-v1`, which remains disabled until signed physical-device proof satisfies the Screen Time release boundary.

### Runtime interface

Call sites request a registered moment rather than constructing a survey:

```ts
type WorkflowFeedbackRequest = {
  promptId: WorkflowFeedbackPromptId;
  sourceKey: string;
  placement: 'standalone' | 'inline';
};

type WorkflowFeedbackHandle = {
  cancel: () => void;
};

function requestWorkflowFeedback(
  request: WorkflowFeedbackRequest,
): WorkflowFeedbackHandle;
```

`sourceKey` is an ephemeral runtime arbitration key, not analytics data and not persisted. It lets a caller cancel an invalid context and lets the Screen Time inline slot enforce first-visible-wins arbitration for one guide episode. It must not be a user, household, transaction, plan, child, rule, or app-selection identifier.

### Local persistence

AsyncStorage keeps a versioned suppression envelope only:

```ts
type WorkflowFeedbackSuppressionState = {
  schemaVersion: 1;
  lastShownAt?: string;
  lastTerminalAt?: string;
  recentShownAt: string[];
  prompts: Record<string, {
    questionVersion: number;
    lastShownAt?: string;
    lastTerminalAt?: string;
  }>;
};
```

Do not persist ratings, reason codes, `feedback_instance_id`, `sourceKey`, workflow object IDs, or question copy locally. Corrupt or future-version state fails closed for the current request, is safely reset, and never crashes app startup.

### PostHog event contract

V1 adds four registered events:

- `workflow_feedback_shown`
- `workflow_feedback_submitted`
- `workflow_feedback_followup_submitted`
- `workflow_feedback_dismissed`

Their allowlisted properties are:

- `feedback_instance_id`
- `prompt_id`
- `question_category`
- `question_version`
- `capability_id`
- `workflow_id`
- `checkpoint_id`
- `invocation_kind`
- `response_value` and `response_band` where applicable
- `reason_code` for a follow-up only
- `sampling_policy_version`
- `outcome_class`

No event includes raw question text, free text, a domain object ID, a child or household identifier, app-selection data, merchant text, financial values, or error messages. `feedback_instance_id` is allowed only because it is random, opaque, presentation-scoped, and has no domain meaning.

Meal finalization also adds `meal_plan_finalize_failed` with a bounded `failure_class` of `version_conflict`, `validation`, `provider_unavailable`, or `unknown`. This separates technical failure from abandonment without recording the raw exception.

### PostHog persistence and HEART reporting

PostHog is the event store and analysis layer for V1. Saved insights or reproducible HogQL queries must separately report Satisfaction, Ease, and Clarity distributions; response and exposure health; and each behavioral workflow funnel. Every production read filters `app_env = production`, excludes founder, internal, and test identities, displays denominators, and returns `not measurable` below the defined sample floor.

The existing weekly HEART email remains the delivery mechanism. A later server-side aggregate adapter may query saved PostHog results and pass only counts, distributions, rates, prompt versions, and measurement status into the existing report builder. Raw feedback events and person-level responses must not be copied into Supabase for reporting convenience. Until that adapter is proven, the email explicitly labels the workflow pulse `not connected` or `not measurable` and preserves its existing Happiness proxy.

### Behavioral and perception interpretation

Each pilot is read as a pair:

- Healthy task success plus favorable perception: preserve and consider graduating the prompt.
- Healthy task success plus unfavorable perception: improve clarity, effort, timing, or UI without rewriting success events.
- Weak task success plus favorable perception: investigate successful-survivor bias and non-completers.
- Weak task success plus unfavorable perception: pause expansion and repair the workflow.

Satisfaction alone represents HEART Happiness. Ease and Clarity are diagnostic experience measures. No blended HEART score combines unlike workflows or question categories.

### Rollout and proof

1. Ship source behind both flags disabled by default.
2. Prove policy, persistence, rendering, first-visible-wins arbitration, accessibility, and event sequences with focused tests.
3. Prove the standalone prompts in Simulator or an appropriate local runtime with PostHog test-environment events.
4. Prove Screen Time clarity and clearing on a signed physical iPhone. Source tests and Simulator presentation do not prove native clearing.
5. Enable the main flag for an external production cohort only after event QA and conflict checks pass.
6. Enable the Screen Time flag separately only after its signed-device evidence passes.
7. Review after 60 production days or when each prompt reaches its evidence threshold, whichever is later enough to support an honest decision.

### Spec refinement

Resolved decisions:

- Screen Time uses an inline slot rather than a stacked feedback guide.
- Every visible presentation uses an opaque random instance ID.
- An unresolved exposure causes a seven-day global cooldown.
- Screen Time has an independent rollout flag and physical-device gate.
- PostHog stores responses; Supabase does not gain a V1 feedback table.
- Meal finalization gains a bounded failure event.
- A prompt graduates only from paired behavioral, perception, burden, and instrumentation evidence.

Implementation assumptions:

- “Session” means the current JavaScript process lifetime; reinstall and cross-device suppression are not solved in V1.
- Standalone pending requests expire after 30 seconds and callers cancel them when context changes.
- The weekly HEART adapter is a separate integration slice after PostHog data and a server-safe query credential exist.

Intentionally deferred:

- Free-text responses, contact permission, support-case creation, and customer-visible response history.
- Server-synchronized suppression.
- Remote percentage sampling in the client.
- Proof that an external target app reopened after Screen Time clearing; V1 proves only the Kwilt-owned clearing receipt.

## Success signal

The utility succeeds when every pilot workflow has an observable start, bounded authoritative success or failure, and a contextual experience distribution that can be interpreted without violating the interruption budget. The shared utility may graduate after all five registrations pass deterministic attachment and conflict tests, PostHog sequences contain no duplicate terminal events, exposure P95 is two or fewer per person over 28 days with a maximum of three, and at least two prompts become decision-ready without confirmed guide conflicts.

Workflow decisions use the thresholds and decision rules in [`05-evaluate-learning.md`](../design-explorations/outcome-happiness-pulse/05-evaluate-learning.md). Feedback does not by itself change a job-flow delivery score.

## Open questions

No question blocks source implementation. Before the weekly HEART adapter is built, choose and document the server-side PostHog query credential, saved-query ownership, timeout behavior, and explicit `not connected` fallback. Screen Time production enablement remains blocked on signed physical-device evidence.
