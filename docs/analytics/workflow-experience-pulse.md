# Workflow Experience Pulse — PostHog QA and reporting

This runbook covers the PostHog work that follows the source implementation in
[`workflow-experience-pulse.md`](../feature-briefs/workflow-experience-pulse.md).
It defines the remote proof contract; it does not claim that flags, cohorts,
insights, or production data are currently configured.

## Feature flags and release order

| Flag | Source fallback | Intended first cohort | Enablement gate |
| --- | --- | --- | --- |
| `workflow-experience-pulse-v1` | `false` | Internal/TestFlight accounts in `app_env = test` | Focused source tests, rendered standalone-guide QA, and valid PostHog event sequences |
| `workflow-experience-pulse-screen-time-v1` | `false` | Signed physical-device Screen Time testers only | Main flag gate plus a fresh entitlement-enabled iPhone run proving shield handoff and an `opened` Kwilt clearing receipt |

The Screen Time flag requires the main flag. Do not enable it from Simulator,
Metro, source tests, successful compilation, upload, or TestFlight availability
alone. None of those proves native restriction clearing.

No client-side percentage sampler exists. Cohort allocation belongs to PostHog
feature-flag configuration so exposure rules remain inspectable and reversible.

## Event contract

Valid sequences for one opaque `feedback_instance_id` are:

```text
workflow_feedback_shown -> workflow_feedback_submitted
workflow_feedback_shown -> workflow_feedback_submitted -> workflow_feedback_followup_submitted
workflow_feedback_shown -> workflow_feedback_dismissed
workflow_feedback_shown -> no terminal event
```

The last sequence means the app or context ended before a terminal action. It
activates the seven-day unresolved-exposure cooldown; it is not a dismissal or a
neutral rating.

Invalid sequences are:

- submitted or dismissed without shown;
- more than one shown for an instance;
- submitted and dismissed for the same instance;
- duplicate submitted events;
- follow-up without a submitted rating from 1 through 3;
- more than one follow-up;
- a changed `prompt_id` or `question_version` inside one instance;
- any domain object ID, customer-authored content, child or household identity,
  selected-app evidence, merchant text, financial value, raw question copy, or
  error message.

The property sanitizer permits only the registry dimensions documented in the
feature brief. `feedback_instance_id` is random and presentation-scoped; it is
not a user or workflow identifier.

## Test-environment QA

For each prompt, use an eligible second encounter in `app_env = test` and record:

1. Checkout, branch, commit, dirty state, build/install provenance, and Metro
   port.
2. Prompt ID and version.
3. Qualifying behavioral event or visible checkpoint.
4. Whether another drawer, guide, receipt, error, paywall, or keyboard competed.
5. The full event sequence for the one feedback instance.
6. Confirmation that rating and reason values match the registry.
7. Confirmation that a third qualifying encounter in the same process does not
   present another question.

Test standalone Money and Meals prompts in an appropriate development runtime.
Test Screen Time Clarity and clearing Ease on a signed physical iPhone. An
`applying` family result is not eligible for clearing Ease.

## Saved PostHog views

Every production view must apply:

- `app_env = production`;
- the canonical founder, internal, automated, and test-account exclusion cohort;
- explicit date and conversion windows;
- distinct external people for adoption and retention;
- visible numerator, denominator, prompt ID, and question version;
- `not measurable` below the sample floor rather than a zero value.

Create these saved views with the exact names below.

### `Workflow pulse — Satisfaction distribution`

- Event: `workflow_feedback_submitted`.
- Filter: `question_category = satisfaction`.
- Breakdown: `prompt_id`, `question_version`, then `response_value`.
- Output: count of submissions, distinct respondents, full 1–5 distribution,
  and 4–5 positive rate.
- Measurement floor: at least five submissions and ten mature exposures.

### `Workflow pulse — Ease distribution`

- Event and breakdowns match the Satisfaction view.
- Filter: `question_category = ease`.
- Never merge this result into HEART Happiness.

### `Workflow pulse — Clarity distribution`

- Event and breakdowns match the Satisfaction view.
- Filter: `question_category = clarity`.
- Never merge this result into HEART Happiness.

### `Workflow pulse — Follow-up reasons`

- Event: `workflow_feedback_followup_submitted`.
- Breakdown: `prompt_id`, `question_version`, `reason_code`.
- Companion denominator: submitted ratings with `response_value <= 3` for the
  same prompt/version and window.

### `Workflow pulse — Utility health`

Use `feedback_instance_id` to calculate:

- response rate: mature instances with submitted / mature shown;
- dismissal rate: mature instances with dismissed / mature shown;
- unresolved rate: shown more than 24 hours ago with no terminal event;
- duplicate-terminal rate: more than one submitted, or submitted plus dismissed;
- follow-up completion: reason / submitted values 1–3;
- exposure burden: shown per distinct external person over rolling 28 days,
  reporting P50, P95, and maximum;
- same-prompt repeats inside 60 days.

Exclude shown events from the most recent 24 hours from unresolved and response
denominators. Duplicate-terminal rate must remain zero. Confirmed surface
conflict or duplicate-terminal evidence disables the affected registration.

## Behavioral funnel views

### `Workflow pulse — Money rebalance task success`

- Sequential events: `money_rebalance_preview_viewed` then
  `money_rebalance_saved`.
- Conversion window: seven days.
- Report `money_rebalance_cancelled` and `money_rebalance_stale_rejected`
  separately.
- Mature-start floor: ten.

### `Workflow pulse — Meal finalization task success`

- Sequential events: `meal_plan_horizon_selected` then `meal_plan_finalized`.
- Conversion window: seven days.
- Report `meal_plan_finalize_failed` by `failure_class` separately so technical
  failure is not counted as abandonment.
- Mature-start floor: ten.

### `Workflow pulse — Transaction correction task success`

- Event: `money_mutation_completed`.
- Filter: `operation = transaction_category`.
- Success: `outcome_class = success`; denominator is success plus failed.
- Report the existing duration bucket distribution.
- Attempt floor: ten.

### `Workflow pulse — Screen Time temporary open task success`

- Sequential events: `screen_time_temporary_open_requested` then
  `screen_time_temporary_open_applied` with `outcome = opened`.
- Report `applying`, denied, and failed separately.
- Request floor: ten.
- This proves Kwilt's clearing receipt, not that an external target app reopened.

## Behavioral × perception review

Join only at aggregate workflow and prompt/version buckets. Do not export or copy
person-level rows to Supabase.

| Task success | Perception | Operating interpretation |
| --- | --- | --- |
| Healthy | Favorable | Preserve and consider graduating the prompt |
| Healthy | Unfavorable | Improve clarity, effort, timing, or UI |
| Weak | Favorable | Investigate successful-survivor bias and non-completers |
| Weak | Unfavorable | Pause expansion and repair the workflow |
| Not measurable | Any | Preserve counts and wait for bounded evidence |

## Weekly HEART aggregate adapter contract

The existing Supabase Cron and single-recipient HEART email remain authoritative
for delivery. A future server-side adapter may read saved PostHog results only
after server-safe credential ownership is decided.

The adapter input is limited to:

```ts
type WorkflowPulseAggregate = {
  measurementStatus: 'measurable' | 'not_measurable' | 'not_connected';
  windowStart: string;
  windowEnd: string;
  promptId: string;
  questionVersion: number;
  category: 'satisfaction' | 'ease' | 'clarity';
  responseCount: number;
  exposureCount: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
  favorableRate: number | null;
};
```

The adapter must:

- use a server-side PostHog credential with read-only access to the named saved
  queries;
- apply a bounded timeout and return `not_connected` on credential, query, or
  transport failure;
- return `not_measurable` below the stated floors;
- pass only aggregates, windows, versions, and measurement status to the email
  builder;
- never substitute zero for disconnected or insufficient data;
- never alter the overall HEART verdict from unverified pulse data;
- never persist raw feedback events, `feedback_instance_id`, distinct IDs, or
  person-level rows in Supabase.

Until this adapter is implemented and proven through a TestFlight query and a
production dry run, the email must retain its existing legacy Happiness proxy
and label the workflow pulse `not connected` or `not measurable`.

## Open remote work

Source completion does not perform these external mutations:

- create or enable either PostHog feature flag;
- create the founder/internal exclusion cohort;
- create the saved views above;
- choose or provision the server-side read credential;
- connect the weekly aggregate adapter;
- enable production cohorts.

Each requires separate remote evidence and an explicit release decision.
