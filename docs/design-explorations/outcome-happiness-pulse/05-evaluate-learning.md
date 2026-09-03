# Phase 5 — Evaluate Learning

## Decision this release must support

Decide whether the workflow-experience pulse should become a permanent shared Kwilt capability, which pilot prompts should remain registered, and which underlying workflows need improvement before feedback expands elsewhere.

The decision must never come from a single blended HEART score. Behavioral workflow evidence answers whether the job was accomplished; contextual feedback answers how the experience felt. The useful diagnosis comes from reading those signals together.

## Measurement unit and reporting windows

- **Audience:** External customers only. Exclude Andrew/founder identities, automated accounts, internal test accounts, and all events where `app_env != production` from production conclusions.
- **Behavioral unit:** A distinct person entering or completing a bounded workflow. Count events as activity, but use distinct people for adoption and retention.
- **Feedback unit:** One visibly presented feedback instance, identified by an opaque random `feedback_instance_id` generated when the guide is shown.
- **Weekly operating window:** Seven days, compared with the prior seven days. Used for anomaly detection, not final judgment.
- **Decision window:** Rolling 28 days for HEART health and 60 days for prompt graduation because same-prompt suppression is 60 days.
- **Incomplete periods:** Exclude workflow cohorts whose allowed conversion window has not elapsed and feedback instances shown in the most recent 24 hours from abandonment calculations.

`feedback_instance_id` has no product meaning and is never reused. It may connect `shown`, `dismissed`, `submitted`, and `followup_submitted` events for one presentation, but it must never contain or encode a user, household, child, Money, meal-plan, transaction, app-selection, rule, or other domain identifier.

## Learning questions

### Product and trust

1. Do customers answer an occasional contextual question without the interaction feeling like survey administration?
2. Is each question understood as referring to the intended workflow moment?
3. Does feedback reveal actionable differences between workflows or merely produce undifferentiated ratings?
4. Can Kwilt preserve a calm interruption budget across capabilities, accounts, sessions, and unresolved guide presentations?

### Behavioral success

5. Can people enter and successfully complete each pilot workflow at the rate implied by its job-flow promise?
6. Where behavioral success and perceived experience disagree, does the evidence clearly point to a workflow, explanation, timing, or question-design problem?
7. For Screen Time, can Kwilt distinguish encountering a blocker, understanding its explanation inside the existing unlock guide, requesting a clear, receiving a Kwilt-owned release receipt, and actually reopening the external target?

### Technical feasibility

8. Does PostHog receive one clean event sequence per visible guide with only the registered bounded properties?
9. Can a reproducible PostHog query produce founder-excluded aggregates for the weekly HEART report without copying raw feedback into Supabase?
10. Does local suppression remain reliable enough for V1 despite reinstall and cross-device limitations?

## HEART operating model

HEART is applied at two levels:

1. **Portfolio HEART:** Is Kwilt helping external people adopt, complete, and return to meaningful jobs while feeling satisfied?
2. **Workflow HEART:** What is true about one bounded workflow and the exact job-flow step it serves?

Not every workflow should optimize every HEART dimension. Repeating meal planning can be healthy engagement; repeatedly correcting transactions or repeatedly encountering blockers is not inherently desirable. A dimension that has no honest success interpretation is marked `not a target`, not forced into a favorable number.

### Job-flow evidence baseline

- **Money:** Correcting assumptions is currently scored 4/5, while trusting and repeating the pattern is 2/5. The pulse can help explain the trust gap, but it does not itself raise either score.
- **Meals:** Preparing a plausible short list is 2/5 and making the final call is 3/5. `meal_plan_finalized` measures the bounded planning workflow, not the entire feed-the-household cycle through shopping and cooking.
- **Family Screen Time:** Applying the starter agreement, understanding ordinary access, and recovery are each 1/5 because real child-device delivery is not implemented and physically proven. Personal Screen Time blocker evidence must not be used to raise the family-flow score; family outcomes require their own applied-device receipts.

These delivery scores change only after shipped behavior and the job flow's stated evidence boundary improve. Feedback is explanatory evidence, not delivery by itself.

### Portfolio scorecard

| Dimension | Primary measure | Companion evidence | Initial operating bands |
| --- | --- | --- | --- |
| Happiness | Satisfaction ratings 4–5 divided by all submitted Satisfaction ratings | Full five-point distribution, response count, prompt breakdown, low/mixed reasons | Not measurable below 5 responses; healthy at 70% or more; watch at 50–69%; concern below 50% |
| Engagement | Distinct external people completing at least one authoritative core-workflow outcome in 7 days | Successful outcomes by capability; repeat use on distinct days where recurrence is naturally useful | Compare with prior period until a stable external baseline exists; do not reward raw event volume |
| Adoption | Distinct external people reaching their first authoritative outcome after entering a capability workflow | Entry-to-first-success conversion and time to first success by workflow | Use workflow-specific bands; preserve the existing Arc → Goal → Activity adoption measure in the weekly report |
| Retention | People with a meaningful outcome 8–28 days ago who perform another meaningful outcome in the latest 7 days | Same-capability and cross-capability return, reported separately | Keep the existing report bands: not measurable below 3 eligible people; healthy at 40% or more; watch above 0% and below 40%; concern at 0% |
| Task Success | Workflow-specific successful outcomes divided by valid attempts or starts | Failure, cancellation, stale-state, unresolved, and time-to-success evidence | Never average incompatible workflows into one percentage; report every measurable pilot and the count below its floor |

Happiness uses only the Satisfaction category. Ease and Clarity remain diagnostic distributions even if they use the same five-point response shape.

## Pilot workflow scorecards

### Money: adjust a spending plan

**Job-flow mapping:** Maya reviews budget reality, redirects priorities, sees an authoritative result, and trusts the pattern enough to return.

- **Happiness:** `money_rebalance_satisfaction_v1` distribution and 4–5 positive rate.
- **Engagement:** Distinct people completing authoritative Money decisions in 28 days; repeat decisions on distinct days are descriptive, not a volume target.
- **Adoption:** First `money_rebalance_saved` after `money_rebalance_preview_viewed` within seven days.
- **Retention:** After a first saved rebalance, return to any `money_trusted_decision_completed` within 8–28 days.
- **Task Success:** Sequential `money_rebalance_preview_viewed` → `money_rebalance_saved`; report cancellation and stale rejection separately. Initial band: healthy at 70% or more, watch at 40–69%, concern below 40% after at least 10 mature starts.

Interpretation guardrail: a positive satisfaction response does not repair a failed, cancelled, or stale rebalance. The prompt is eligible only after the saved event.

### Meals: finalize a meal plan

**Job-flow mapping:** Maya moves from a chosen planning horizon to a durable plan that reduces the work of feeding the household.

- **Happiness:** `meal_plan_finalized_satisfaction_v1` distribution and 4–5 positive rate.
- **Engagement:** Distinct people finalizing meal plans in 28 days; repeat finalization across distinct weeks is the natural-use companion.
- **Adoption:** First `meal_plan_finalized` after `meal_plan_horizon_selected` within seven days.
- **Retention:** After a first finalization, return to `meal_plan_horizon_selected` or another `meal_plan_finalized` event 7–35 days later.
- **Task Success:** `meal_plan_horizon_selected` → `meal_plan_finalized` within seven days. Initial band: healthy at 50% or more, watch at 25–49%, concern below 25% after at least 10 mature starts.

Instrumentation gap: the current finalization path records a successful finalization but no bounded failure event. Add `meal_plan_finalize_failed` with a registered failure class so technical failure can be separated from abandonment without collecting raw errors.

### Money: correct a transaction category

**Job-flow mapping:** Maya corrects a wrong assumption only when it materially improves the Money decision.

- **Happiness:** Not measured by this prompt.
- **Ease:** `money_transaction_correction_ease_v1` distribution, 4–5 favorable rate, and bounded low/mixed reasons.
- **Engagement:** Successful corrections and correcting people are descriptive only. More corrections may indicate worse underlying classification and must not be treated as better engagement.
- **Adoption:** First successful `money_mutation_completed` where `operation = transaction_category` among people who attempt that operation.
- **Retention:** Return from a first successful correction to any `money_trusted_decision_completed` within 8–28 days; this asks whether correction restores trust in Money rather than whether the person keeps correcting.
- **Task Success:** Successful transaction-category mutations divided by all succeeded plus failed attempts. Initial band: healthy at 95% or more, watch at 85–94%, concern below 85% after at least 10 attempts. Continue showing duration-bucket distribution.

### Screen Time: understand and clear a Kwilt blocker

**Job-flow mapping:** The person understands ordinary access, sees one useful next action, and can clear or retain the Kwilt-owned restriction without confusing intent with device truth.

- **Happiness:** Not measured by these prompts.
- **Clarity:** `screen_time_block_reason_clarity_v1` distribution, 4–5 favorable rate, and reason breakdown.
- **Ease:** `screen_time_block_clear_ease_v1` distribution, 4–5 favorable rate, and reason breakdown.
- **Engagement:** Block frequency is not a success target. Report distinct people encountering a real shield handoff and the share taking an intentional action only as workflow diagnostics.
- **Adoption:** First `screen_time_guide_requirement_opened` or `screen_time_temporary_open_requested` after `screen_time_guide_shown`; dismissal may still represent a valid decision to remain blocked, so label this `action rate`, not success rate.
- **Retention:** Not a pilot target. Repeated blockers can mean the rule is working or that it is irritating; neither interpretation is safe from return frequency alone.
- **Task Success:** `screen_time_temporary_open_applied` with `outcome = opened` divided by `screen_time_temporary_open_requested`. Report `applying`, denied, and failed separately. Initial band: healthy at 90% or more, watch at 75–89%, concern below 75% after at least 10 requests.

Physical-device evidence is mandatory before production measurement. `opened` proves Kwilt cleared the restrictions it owns; `reason_still_seemed_blocked` is a discrepancy signal and does not mutate that receipt. Actual target-app reopening remains unmeasured unless a future privacy-safe Apple handoff can prove it.

## Feedback utility health

These measures evaluate whether the shared utility is respectful and technically trustworthy. They are not HEART Happiness.

| Measure | Definition | Initial operating rule |
| --- | --- | --- |
| Response rate | Mature feedback instances with `submitted` / mature instances with `shown` | Healthy at 40% or more; watch at 25–39%; concern below 25% after 20 mature exposures |
| Dismissal rate | Mature instances with `dismissed` / mature instances with `shown` | Diagnostic companion to response rate; break down by prompt rather than averaging away a bad caller |
| Unresolved rate | Instances shown more than 24 hours ago with neither submitted nor dismissed | Healthy at 10% or less; concern above 20%; investigate the 11–20% middle band |
| Duplicate terminal rate | Instances with more than one submitted event or both submitted and dismissed | Must be 0; any confirmed production case is an instrumentation defect |
| Follow-up completion | Low/mixed submissions with a reason / all low/mixed submissions | Descriptive; low completion should simplify or remove reasons, not force an answer |
| Exposure burden | Feedback guides shown per distinct person in a rolling 28-day window | P95 should be 2 or fewer and maximum 3; any higher count requires suppression investigation |
| Same-prompt repeat | Same person shown the same prompt/version inside 60 days | Investigate; cross-device or reinstall resets are known V1 exceptions, not proof the response is invalid |
| Conflict incidence | Confirmed feedback guide overlap with a receipt, error, paywall, keyboard, modal, drawer, reminder, merchant-rule offer, or Screen Time unlock guide | Must be 0; disable the affected registration on confirmation |

Record `last_shown_at` in local suppression state. If an exposure has no terminal action because the app was killed or interrupted, apply a seven-day unresolved-exposure cooldown before any feedback guide may appear again. This closes a gap left by submission- and dismissal-only cooldowns.

## PostHog persistence and query model

### Recommendation

Keep V1 feedback responses in PostHog rather than adding a Kwilt database table.

PostHog is appropriate because the response is analytics-grade aggregate learning: product behavior does not depend on delivery, customers do not need a feedback history, and no support or case-management workflow follows a response. PostHog supports event-property filtering and breakdowns, sequential funnels, conversion windows, first-occurrence analysis, and retention defined by start and return events.

### Event sequence

```text
workflow_feedback_shown
  feedback_instance_id = opaque presentation id
        ├─ workflow_feedback_submitted
        │     └─ workflow_feedback_followup_submitted (optional)
        └─ workflow_feedback_dismissed
```

- Generate the instance ID only when the guide becomes visibly available, not when a caller requests it.
- Include the same instance ID on every feedback event from that presentation.
- Emit exactly one terminal event: submitted or dismissed.
- A submitted rating remains terminal even when the optional reason is skipped.
- Do not add a workflow object ID. The registered `prompt_id`, `workflow_id`, and `checkpoint_id` are enough for aggregate attribution because eligibility already requires the underlying product fact.

### Reproducible aggregate views

Create saved PostHog insights or HogQL queries for:

1. Satisfaction distribution and positive rate by `prompt_id` and `question_version`.
2. Ease and Clarity distributions, never combined with Satisfaction.
3. Feedback response, dismissal, unresolved, duplicate-terminal, and exposure-burden health.
4. Each behavioral start-to-success funnel with an explicit conversion window.
5. First authoritative outcome by workflow for Adoption.
6. Meaningful outcome → meaningful return for Retention.
7. Behavioral × perception diagnostic quadrants using aggregate workflow and prompt/version buckets.

Every production query must filter `app_env = production`, apply the founder/test exclusion cohort, display its denominator, and return `not measurable` rather than zero when the sample floor is not met.

### Weekly HEART email

Preserve the existing Supabase Cron and single-recipient report. Add a server-side aggregate adapter that queries the saved PostHog/HogQL results and passes only counts, distributions, rates, prompt versions, and measurement status into the report builder. Do not copy raw feedback events or person-level rows into Supabase merely to make the email query convenient.

Until the adapter is proven through a TestFlight query and a production dry run:

- retain Chapter feedback as the explicitly labeled legacy Happiness proxy;
- add a `Workflow experience pulse: not connected` or `not measurable` note rather than substituting zero;
- do not change the existing overall HEART verdict from unverified PostHog results.

## Behavioral × perception interpretation

| Behavioral Task Success | Perceived experience | Interpretation | Next action |
| --- | --- | --- | --- |
| Healthy | Favorable | Workflow is a candidate for permanent instrumentation and broader registration | Preserve wording; continue monitoring retention and burden |
| Healthy | Unfavorable | People accomplish the task but the experience is confusing, effortful, or unpleasant | Use category reasons to revise UI/copy/timing; do not rewrite success events |
| Weak | Favorable | The prompt samples only successful survivors or asks too late to reveal drop-off | Fix the workflow funnel and investigate non-completers; do not celebrate the rating |
| Weak | Unfavorable | The underlying workflow and its experience both need attention | Pause expansion; prioritize the largest job-flow failure |
| Not measurable | Any | Evidence is insufficient | Preserve counts and wait or conduct bounded qualitative observation; do not assign a status |

## Sample and decision readiness

### Per-prompt evidence levels

- **Not measurable:** Fewer than 5 submitted responses or fewer than 10 mature exposures.
- **Directional:** At least 5 submitted responses from at least 5 distinct external people and at least 15 mature exposures.
- **Decision-ready:** At least 10 submitted responses from at least 10 distinct external people, or 60 elapsed production days with at least 5 distinct external responses and otherwise clean utility-health evidence.

Question-category operating bands use 4–5 favorable rate:

- Healthy: 70% or more.
- Watch: 50–69%.
- Concern: below 50%.

These are Kwilt's initial operating thresholds, not industry benchmarks. Show the full distribution and sample size every time, and recalibrate only by changing `sampling_policy_version` or a documented report-policy version—not by silently rewriting history.

## Decision rules

### Graduate the shared utility

Make the feedback utility a permanent shared capability when all are true:

1. All five pilot registrations have passed their deterministic attachment and conflict tests.
2. PostHog QA proves the bounded event schema and exact feedback-instance sequences.
3. No confirmed guide conflict or duplicate terminal event remains unresolved.
4. Portfolio response rate is at least 25% and unresolved rate is at most 20% after 20 mature exposures.
5. At least two prompt categories reach directional evidence and produce an interpretable workflow decision.
6. The weekly founder-only HEART report can consume verified aggregates or continues to label the pulse honestly as not connected.

Graduating the utility does not automatically graduate every prompt.

### Keep a prompt

Keep a registered prompt when it is decision-ready, its response rate is at least 25%, its wording is interpreted consistently, and the result changes or confirms a real workflow decision. A concerning rating may justify keeping the prompt while the workflow is improved.

### Revise a prompt or attachment point

Version and revise when:

- dismissal or unresolved exposure is concentrated at one checkpoint;
- low/mixed reasons show the question refers to the wrong moment;
- respondents appear to rate the outcome rather than the experience, or vice versa;
- repeated evidence shows the first-visible-wins rule consistently starves either Screen Time question of useful exposure;
- the distribution is implausibly uniform or extreme and contextual observation indicates leading wording.

Never change the meaning of an existing `question_version`.

### Pause or retire a prompt

Pause or retire when:

- a confirmed UI conflict or trust problem occurs;
- response rate remains below 20% after 30 mature exposures;
- 60 production days produce no actionable distinction despite adequate exposure;
- the workflow fact cannot be verified honestly;
- the same learning can be answered more accurately from behavioral evidence alone.

### Do not graduate to first-party persistence yet

Create a first-party feedback model only when feedback becomes an operational product record, such as:

- customers can view, correct, export, or delete their feedback in Kwilt;
- a response can—with explicit consent—create a support or research follow-up;
- product behavior depends on transactionally reliable delivery;
- cross-device suppression becomes important enough to justify authenticated sync;
- longitudinal research requires durable joins PostHog cannot provide within the privacy contract.

A SQL-friendly weekly email, dashboard convenience, or a desire for perfect event delivery is not sufficient justification.

## Qualitative evidence

During TestFlight and the first 60 production days, keep a brief founder observation log containing only:

- prompt ID and version;
- whether the timing felt contextually correct;
- whether another surface competed;
- whether the question was understood as intended;
- whether a bounded reason was missing.

Do not record customer identity, financial details, selected apps, child information, recipe/meal content, or free-text customer responses.

## Expected next action

If this evaluation plan is accepted, Phase 6 should produce one feature brief and implementation plan covering:

1. prompt registry and contextual question definitions;
2. pure eligibility, first-visible-wins arbitration, unresolved-exposure, and cooldown policy;
3. local suppression namespaces;
4. feedback host, shared registered-question renderer, canonical standalone `BottomGuide`, and Screen Time inline-guide slot;
5. analytics events, `feedback_instance_id`, property schemas, and registry coverage;
6. the five pilot attachment points and missing meal-plan failure event;
7. PostHog QA queries plus the aggregate weekly-report adapter contract;
8. signed physical-device Screen Time verification before production enablement.

## Product analytics references

- [PostHog funnels](https://posthog.com/docs/product-analytics/funnels) — sequential workflow steps, property filters, conversion windows, and first-occurrence analysis.
- [PostHog retention](https://posthog.com/docs/product-analytics/retention) — explicit start and return events, unique-user cohorts, and period-based retention.
