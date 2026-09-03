# Diverge: Workflow Experience Pulse

## Axis of variation

The alternatives vary by who owns question configuration, display eligibility, and durable response storage: Kwilt plus PostHog events, PostHog Surveys, or Kwilt's first-party database.

## Shared measurement contract

Context may change the product-owned noun or outcome phrase, but it must not change the construct being measured. Each prompt has a stable `prompt_id`, `question_category`, and `question_version`; analytics stores those identifiers rather than arbitrary rendered question text.

### 1. Overall satisfaction

- Canonical stem: **“Overall, how satisfied are you with how Kwilt helped you [complete the workflow]?”**
- Use after: an end-to-end completion or authoritative outcome, once the result is visible and settled.
- Scale: five labeled points from **Very dissatisfied** to **Very satisfied**.
- HEART role: primary Happiness measure.
- Good contextual examples:
  - “Overall, how satisfied are you with how Kwilt helped you review your spending plan?”
  - “Overall, how satisfied are you with how Kwilt helped you set up this week’s meals?”
- Do not ask: “Are you happy?”, “Do you like Kwilt?”, or “Was this easy and helpful?” The first two lack a bounded experience; the third combines two constructs.

### 2. Perceived success

- Canonical stem: **“Did you get what you needed from [this workflow]?”**
- Use after: a terminal point where the customer's real-world outcome cannot be observed completely by Kwilt.
- Scale: **No / Partly / Yes**.
- HEART role: perception-based companion to Task Success; never authoritative completion proof.
- Good contextual example: “Did you get what you needed from this budget check-in?”
- Do not ask when: Kwilt already has an exact authoritative result and the real question is satisfaction or confidence.

### 3. Ease

- Canonical stem: **“How easy or difficult was it to [complete this step]?”**
- Use after: a deliberately evaluated setup, correction, handoff, or recovery step.
- Scale: five labeled points from **Very difficult** to **Very easy**.
- HEART role: diagnostic driver of Happiness and Adoption, not part of the satisfaction numerator.
- Good contextual example: “How easy or difficult was it to correct this transaction?”
- Do not ask: “Was that easy?” It is leading and loses useful negative gradation.

### 4. Confidence

- Canonical stem: **“How confident are you that [bounded result or state]?”**
- Use after: evidence-sensitive Money, AI, sync, receipt, or Screen Time moments.
- Scale: five labeled points from **Not at all confident** to **Completely confident**.
- HEART role: trust driver; report separately from satisfaction.
- Good contextual examples:
  - “How confident are you that this reflects your current spending plan?”
  - “How confident are you that this change was applied?” only when the UI truthfully represents the relevant application boundary.
- Do not ask: “Do you trust Kwilt?” Global trust is too broad for a specific workflow moment.

### 5. Clarity

- Canonical stem: **“How clear was [the result / what happened / what to do next]?”**
- Use after: a new explanation, receipt, transition, or recovery instruction.
- Scale: five labeled points from **Not at all clear** to **Completely clear**.
- HEART role: diagnostic driver of Happiness and Task Success.
- Good contextual example: “How clear was what changed in your plan?”
- Do not ask: “Did you understand?” It can feel like a test of the customer and tends to produce courtesy bias.

### Diagnostic follow-up

Only a low or mixed response may reveal an optional one-tap follow-up. The reason vocabulary is governed by the question category and remains bounded. Candidate families include:

- Satisfaction: `not_useful`, `too_much_work`, `confusing`, `did_not_trust`, `something_failed`, `something_else`.
- Ease: `could_not_find_next_step`, `too_many_steps`, `had_to_repeat`, `wording_unclear`, `took_too_long`, `technical_problem`.
- Confidence: `looked_stale`, `looked_incomplete`, `not_explained`, `could_not_verify`, `unclear_if_saved_or_applied`, `seemed_wrong`.
- Clarity: `status_unclear`, `next_step_unclear`, `wording_unclear`, `too_much_information`, `missing_information`.
- Perceived success: `did_not_finish`, `result_incomplete`, `wrong_result`, `needed_another_tool`, `something_failed`.

V1 should not collect open text. “Something else” is a complete response, not a disguised requirement to type. If Kwilt later needs user-authored narrative, support follow-up, or quote-ready research, that is a separate first-party data and consent decision.

### Aggregation rule

Do not normalize every category into one composite score. HEART Happiness uses only the standardized satisfaction question. Ease, confidence, and clarity explain why satisfaction may be high or low. Perceived success complements behavioral Task Success where Kwilt cannot observe the full real-world outcome.

## Alternative A: Kwilt guide, PostHog event store

Kwilt owns the `BottomGuide`, question registry, contextual copy, and portfolio-wide eligibility policy. It emits bounded `workflow_feedback_shown`, `workflow_feedback_dismissed`, `workflow_feedback_submitted`, and `workflow_feedback_followup_submitted` events to PostHog. Device-local state remembers recent exposures and responses for prompt suppression; PostHog owns aggregate response history.

- Audience/persona fit: strongest visual and attention fit for Maya because the interaction uses Kwilt's existing calm UI rather than a vendor-rendered survey.
- Design-challenge answer: pairs workflow funnels and experience events in one analytics system without creating customer-visible feedback records.
- System fit: reuses `BottomGuide`, the existing analytics boundary, identity reset, environment tagging, and event-specific property allowlists. It adds one pure eligibility policy and a small local suppression store.
- Data properties: bounded `prompt_id`, `question_category`, `question_version`, `capability_id`, `workflow_id`, `checkpoint_id`, `invocation_kind`, `response_value`, `response_band`, `reason_code`, `sampling_policy_version`, and an outcome class when already known. No rendered question text, object ID, financial value, child identity, app selection, or user-authored content.
- Best when: feedback exists only to support aggregate product decisions and joins to behavioral analytics.
- Fails when: the app must read a person's response later, suppression must survive reinstall and work across devices, feedback changes product behavior, support must follow up, or the response becomes user-visible/auditable product data.
- Primer check: pass. It touches no Arc, Goal, Activity, or Chapter state, never blocks capture, creates no dashboard in the customer experience, and makes no anthropomorphic learning claim.

## Alternative B: PostHog Survey as control plane and store

Create formal PostHog surveys and use PostHog targeting, response history, question configuration, and survey reporting. Invoke a matching survey at the chosen workflow point and accept the vendor's supported mobile presentation or adapt within its supported SDK surface.

- Audience/persona fit: weaker unless PostHog's presentation can meet Kwilt's bottom-guide geometry, copy, accessibility, and calm-dismissal standards.
- Design-challenge answer: gives Andrew runtime control over question text, conditions, response caps, and targeting without an app release.
- System fit: PostHog documents survey response events and targeting, and its React Native SDK supports many rendered-survey features. However, PostHog's documented headless/custom-survey flow is currently JavaScript Web SDK-only, so a fully custom React Native `BottomGuide` cannot safely assume the same survey fetching/display contract.
- Best when: remote question changes and PostHog-managed targeting matter more than exact native interaction ownership.
- Fails when: Kwilt needs the canonical guide component, deterministic app-owned suppression, offline-safe behavior, or strict compile-time question/property governance.
- Primer check: conditional pass. It avoids customer administration but fails if the vendor presentation feels like a generic popover or interrupts the primary workflow.

## Alternative C: First-party feedback ledger with PostHog projection

Persist each response in an owner-scoped Supabase table and emit a bounded PostHog event after the write succeeds. The database owns response history, cross-device exposure/cooldown, later correction or deletion, and any authorized downstream product use; PostHog owns aggregate analysis.

- Audience/persona fit: invisible when implemented well, but it creates more durable personal data than the initial analytic job requires.
- Design-challenge answer: gives the strongest cross-device suppression and long-term control while retaining funnel analysis.
- System fit: matches Kwilt's existing Chapter and Chat feedback persistence patterns, but requires schema, RLS, client repository, deletion/export coverage, server-side reporting, and dual-write reconciliation.
- Best when: feedback becomes user-visible, editable, support-actionable, personalization input, AI-learning guidance, or an authoritative research record.
- Fails when: there is no product use beyond aggregate analysis; the extra data lifecycle and duplicate truth become unjustified complexity.
- Primer check: pass only with explicit purpose limitation. It must not silently turn customer sentiment into AI-authored guidance or a permanent profile.

## Comparative read

| Criterion | A: PostHog events | B: PostHog Surveys | C: First-party ledger |
| --- | --- | --- | --- |
| Exact Kwilt `BottomGuide` experience | Strong | Uncertain on React Native | Strong |
| Runtime question changes | App release or remote config | Strong | App release or custom config |
| Funnel joins and HEART analysis | Strong | Strong | Requires PostHog projection or DB analysis |
| Cross-device/reinstall suppression | Weak without extra service state | Potentially strong through survey history/targeting | Strong |
| App can read/edit prior response | No | Not as product state | Yes |
| Open-text/support workflow | Poor fit | Analytics-oriented | Strong with explicit consent |
| Privacy/data-lifecycle burden | Lowest | Low to medium | Highest |
| Current Kwilt architecture fit | Strongest for bounded V1 | Mixed | Strong only if product use justifies it |

## Design read

Alternative A is the smallest coherent learning release. It treats responses as analytics, not product records, and preserves a clean graduation rule: move to Alternative C only when Kwilt needs to read, show, modify, act on, or retain an individual response outside aggregate product analysis. Alternative B is valuable as a reference for targeting and schema, but current official documentation does not establish a headless custom-survey contract for the React Native `BottomGuide` experience.
