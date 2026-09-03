# Converge: Workflow Experience Pulse

## Alternatives scored

| Alternative | Persona and job fit | System fit | Learning quality | Data and migration risk | Decision |
| --- | --- | --- | --- | --- | --- |
| A. Kwilt guide, PostHog event store | Strong: calm native interaction and no customer administration | Strongest: reuses `BottomGuide` and the analytics boundary | Strong: feedback joins directly to workflow events | Low: analytics-only response with a clear graduation threshold | **Choose** |
| B. PostHog Survey control plane | Mixed: targeting is strong, native presentation fit is uncertain | Mixed: documented custom/headless support is Web-only | Strong if the supported survey surface is accepted | Medium vendor/runtime coupling | Reject for V1 |
| C. First-party feedback ledger | Strong interaction and strongest cross-device control | Strong only after accepting schema, RLS, export, and deletion work | Strongest individual history, unnecessary for aggregate learning | Highest data-lifecycle and dual-write risk | Defer until product use exists |

## Chosen alternative

Build a Kwilt-owned workflow-feedback utility that renders one registered categorical question in the canonical `BottomGuide`, applies one portfolio-wide attention policy, stores bounded response events in PostHog, and keeps only prompt-suppression metadata locally.

The utility is not itself the workflow measurement system. Each end-to-end workflow retains separate start, progress, completion, failure, and abandonment evidence. A feedback prompt may be associated with one of those moments, but a response never changes the behavioral outcome.

## Capability delta

Today, Andrew cannot:

- Attach one governed feedback interaction to selected workflow checkpoints without building bespoke UI and analytics each time.
- Compare satisfaction consistently across workflows while separately diagnosing ease, confidence, clarity, and perceived success.
- Enforce one interruption budget across feedback callers.

After this concept ships, Andrew can:

- Register an approved prompt at a specific workflow point and request it with a stable `prompt_id`.
- Know that one central policy decides whether the guide may actually appear.
- Read comparable satisfaction responses and category-specific drivers beside behavioral workflow funnels in PostHog.

Customers can:

- Give a one-tap categorical response at an occasional relevant moment.
- Dismiss the guide immediately without losing work, blocking navigation, or being asked to write a note.
- Optionally identify one bounded reason after a low or mixed response.

Still intentionally impossible:

- Arbitrary caller-authored survey copy.
- Open-text feedback, support escalation, quote collection, or AI personalization.
- Reading or editing prior feedback inside Kwilt.
- Treating feedback as authoritative completion or using completion as proof of satisfaction.
- Cross-device or reinstall-proof prompt suppression.

## Registered prompt contract

Callers provide only a registered `prompt_id`. The registry owns:

- Stable prompt and question version.
- Question category: `satisfaction`, `perceived_success`, `ease`, `confidence`, or `clarity`.
- Product-authored contextual question and scale labels.
- Capability, job-flow, workflow, and checkpoint identifiers.
- Invocation kind: `checkpoint_experience`, `workflow_completion_experience`, or `authoritative_outcome_experience`.
- Allowed diagnostic reason set.
- Minimum eligible encounter count, defaulting to 2. A prompt may explicitly use 1 only when first-use experience is the stated learning target.
- Same-prompt cooldown and any future deterministic sampling policy.

The registry must not accept runtime user content, object titles, values, names, or arbitrary question text.

## Portfolio attention policy

An otherwise eligible request is shown only when every applicable rule passes:

1. The prompt exists and the caller is still in its registered workflow context.
2. No workflow receipt, urgent error, recovery action, paywall, keyboard interaction, modal, drawer, or guide currently owns attention.
3. The prompt's minimum eligible encounter count has been reached.
4. No feedback guide has been shown in the current app session.
5. No feedback guide has been shown for the same account or anonymous install during the prior 14 rolling days.
6. The same prompt and version have not been shown during the prior 60 rolling days.
7. If the previous guide was dismissed without a response, at least 30 rolling days have passed before any guide is shown again.
8. The request is still timely when the host becomes safe. Requests do not survive navigation into an unrelated screen and are never queued for a surprising later appearance.

V1 uses no random sampling. Carefully chosen invocation points plus deterministic caps make exposure and response rates easier to interpret. A future registry version may add deterministic cohort sampling without changing the interaction contract.

Suppression state is account-scoped for authenticated use and install-scoped for anonymous use. It stores prompt/version identifiers, encounter counts, and exposure/dismissal/submission timestamps—not the rating or diagnostic reason. Switching accounts must switch suppression namespaces so one person's interaction does not suppress another person's guide.

Record `last_shown_at` as soon as the guide becomes visible. If the app is interrupted before submission or dismissal, apply a seven-day unresolved-exposure cooldown so a killed session cannot cause repeated prompting.

## Interaction

- Render a floating, scrimless `BottomGuide` after the owning workflow declares the surface safe and active animations/interactions have settled.
- When the assessed UI is already the canonical bottom guide, render the same registered question component as an inline slot inside that guide rather than stacking a second drawer. The portfolio arbiter and analytics contract remain the same.
- Show one concise question and one categorical scale. Do not introduce a survey title, progress count, or multi-question flow.
- Provide an explicit accessible close action and ordinary swipe-to-dismiss behavior.
- For a positive response, acknowledge briefly and close.
- For a low or middle response, replace the scale with an optional set of bounded reason chips plus `Done` and `Skip`.
- Never open the keyboard in V1.
- A rating submission counts even when the customer skips the diagnostic follow-up.
- Closing, swiping, or navigating away before rating records dismissal, not a neutral rating.

## Analytics contract

Events:

- `workflow_feedback_shown` — emitted when the guide becomes visibly available, not when a caller requests it.
- `workflow_feedback_dismissed` — emitted when an exposed guide closes without a rating.
- `workflow_feedback_submitted` — emitted once for the categorical rating.
- `workflow_feedback_followup_submitted` — emitted only when a bounded diagnostic reason is selected.

Bounded properties:

- `feedback_instance_id` — opaque random ID for one visible presentation; never a product object ID
- `prompt_id`
- `question_category`
- `question_version`
- `capability_id`
- `workflow_id`
- `checkpoint_id`
- `invocation_kind`
- `response_value`
- `response_band`
- `reason_code`
- `sampling_policy_version`
- `outcome_class` only when that bounded state already exists

Every string property must be explicitly allowed for these events by the analytics property schema. Rendered question text, object IDs, financial data, child/member identity, selected apps, prompts, messages, titles, notes, and raw errors remain prohibited.

Do not emit a production event for every suppressed request. Development diagnostics and pure-policy tests should explain suppression without creating a high-volume analytics shadow funnel.

## Reporting contract

- Satisfaction positive rate: ratings 4–5 divided by all submitted satisfaction ratings.
- Always display the full five-point distribution and response count beside the positive rate.
- Response rate: submitted rating divided by shown guides.
- Dismissal rate: dismissed guides divided by shown guides.
- Ease, confidence, and clarity are separate diagnostic distributions.
- Perceived success is reported as `No / Partly / Yes` and compared with behavioral completion where appropriate.
- Low/mixed reason codes are broken down only within their matching question category.
- Founder/test and environment exclusions remain mandatory.
- Sparse denominators remain `not measurable`; no composite score combines the question categories.

The current weekly HEART email may continue labeling Chapter feedback as its legacy Happiness proxy until PostHog ingestion and the workflow-satisfaction query are proven in TestFlight and production. A database table must not be created solely to preserve the existing report query.

## Reductive design decisions

- Enhance the existing `BottomGuide`; add no new screen, settings page, inbox, or customer-visible feedback history.
- Use one question at a time; do not build a general survey builder.
- Keep prompt definitions in a governed product registry; do not allow arbitrary screen-level strings.
- Keep ratings out of local storage and Supabase.
- Exclude open text, screenshots, contact permission, support routing, NPS, and App Store review solicitation.
- Exclude PostHog's rendered Survey UI from V1.

## Accepted trade-offs

- Reinstalling the app or using another device may reset suppression and cause an extra prompt.
- PostHog event delivery is analytics-grade rather than transactional; occasional loss is acceptable because no product behavior depends on the response.
- Question or policy changes normally require an app release, which preserves reviewability and version discipline.
- The weekly HEART email needs a later, separately verified PostHog aggregate path before these responses replace the legacy proxy.

## Rejected trade-offs

- Do not collect durable first-party sentiment merely to achieve perfect cross-device cooldowns.
- Do not let runtime remote copy changes make historical question versions ambiguous.
- Do not increase response volume by prompting every eligible completion.
- Do not follow a negative response with a large survey or immediate support request.

## Activation path

Customers do not need education or discovery. The utility activates only when registered product code requests it at a meaningful moment and the portfolio policy permits it. Natural adoption is a customer answering or dismissing it without the guide disrupting the workflow; the product-learning signal is useful response quality at a tolerable exposure and dismissal rate.

## Bet

We're betting that carefully registered contextual questions, guarded by one deterministic interruption budget, will produce interpretable experience signals without making Kwilt feel survey-driven. If dismissal is high, response volume is too sparse, or category wording cannot be compared honestly, we will revisit the invocation points, cadence, and question registry before adding more prompts or first-party persistence.

## Success signal

The first learning release succeeds when it proves that:

- An eligible workflow can request the guide without bespoke UI or analytics code.
- Ineligible or conflicting moments are deterministically suppressed.
- Customers can answer or dismiss with one calm interaction.
- PostHog receives only the intended bounded properties under the correct environment.
- Satisfaction remains comparable while the other categories remain diagnostically separate.
