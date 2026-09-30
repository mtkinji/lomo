# Screen Time exception authorization — evaluate learning

## Learning objective

Determine whether removing temporary opening makes the intervention meaningfully more trustworthy while preserving a clear, non-punitive recovery path for authorized adults across personal, Money, and family Screen Time rules.

The first release is Andrew-only and device-bound. A scenario matrix and direct self-use observation carry more weight than aggregate analytics at this stage.

## Learning questions

### 1. Does the guide explain the active boundary without the temporary-open action?

We need to learn whether Focus, real-step, Money, time-of-day, daily-usage, family, unresolved, and overlapping-rule states are understandable from the guide’s title, supporting sentence, and rule summaries.

### 2. Are rule-derived actions truthful?

We need to learn whether the primary action appears only when completing it could resolve the full blocking set, and whether its label predicts the destination. A Focus action must not imply access will return while an evening schedule still blocks the app.

### 3. Is management discoverable without becoming the recommended escape?

We need to learn whether an authorized adult can find **Manage rules ›** when the policy is genuinely wrong, while the link remains visually secondary during ordinary interventions.

### 4. Does fresh authentication protect weakening changes without causing lockout?

We need to observe successful device authentication, cancellation, failure/unavailability, and backend/native write failure. Only successful authentication followed by a successful versioned mutation may weaken a rule.

### 5. Do family authority boundaries hold?

We need to prove that a child and an unauthorized household member never see management, that a scoped caregiver reaches only the affected child’s management surface, and that a shared-device credential is not treated as caregiver identity.

### 6. Does the content-owned guide remain stable?

We need to observe compact states, multiple rules, long rule names/details, large text, scrolling, safe areas, and dismissal on the physical target. The guide should grow because content requires it, not because it guessed a fixed height.

### 7. Does the stronger boundary improve the felt contract?

The qualitative question is whether the intervention now feels like a commitment Marcus intentionally established rather than a suggestion, without feeling punitive or adversarial.

## Evidence plan

### Scenario matrix

Complete and record each case in the entitlement-enabled physical-iPhone build:

| Case | Expected evidence |
| --- | --- |
| Focus-only personal rule | **Return to Focus** opens Focus; no temporary opening; rule remains active |
| Real-step personal rule | The prerequisite action opens the exact owning Activity/Today context |
| Money-backed rule | The action opens the owning Money evidence, not generic Settings |
| Time-of-day rule | Release time is legible; no prerequisite button |
| Daily-usage rule | Used limit/reset timing is legible; no prerequisite button |
| Focus plus time-of-day overlap | The guide states both rules; no action implies Focus alone will restore access |
| Unresolved restriction | The guide stays dismissible and routes only to a truthful overview |
| Self-adult management | **Manage rules ›** reaches personal Screen Time management |
| Scoped caregiver management | The link reaches the affected child’s family Screen Time surface |
| Child/unauthorized actor | No management or temporary-open action is present |
| Authentication succeeds | The intended weakening mutation proceeds once and reconciles native enforcement |
| Authentication is cancelled | No rule, version, selection, or native restriction changes |
| Authentication is unavailable/fails | Calm explanation; no rule or native change |
| Backend/native write fails after auth | Failure is reported; prior rule remains authoritative |
| Large text and long overlapping rules | Content remains readable, scrollable, dismissible, and clear of the footer/safe area |

Capture for each case:

- source checkout, branch, commit, and dirty state;
- build/install provenance and device/iOS version;
- screenshot or short recording where it adds visual evidence;
- actor, rule-domain mix, and expected destination using fixture-safe labels;
- observed result and any discrepancy;
- whether the proof is Simulator, physical device, local source/test, or backend receipt.

### Natural-use observation

After the scenario matrix passes, use the build through at least three naturally occurring Screen Time interventions across two ordinary days. Record brief first-person notes:

- Did the guide’s explanation answer “why is this paused?” without opening Settings?
- Was the primary action helpful and truthful?
- Did **Manage rules ›** feel available but not tempting?
- Was there a legitimate moment where the removed temporary opening felt necessary?
- Did authentication occur at the expected moment and only then?

This is self-use evidence, not general user research.

## Supporting signals

Evidence supports the bet when:

- all authority and no-change cases pass;
- the guide’s wording correctly predicts the rule and destination in every scenario;
- ordinary time/usage interventions are understandable without a synthetic primary action;
- **Manage rules ›** is found when intentionally sought but does not dominate visual attention;
- natural use does not produce a legitimate unrecoverable situation;
- authentication cancellation feels safe and unsurprising;
- large text and overlap remain usable without large empty guide regions.

## Disconfirming signals

Evidence weakens or disproves the bet when:

- an authorized adult cannot identify or reach the relevant rule owner;
- an action opens a destination that cannot resolve the named rule;
- finishing one prerequisite is presented as sufficient while another rule still blocks access;
- the child or unauthorized actor sees a management affordance;
- any weakening mutation occurs without fresh authentication or after cancellation;
- failed authentication or a failed write leaves local, backend, or native state partially changed;
- users interpret dismissal as turning off protection;
- management feels visually promoted as the expected response;
- a legitimate urgent need repeatedly requires unsafe workarounds outside Kwilt;
- the content-owned guide clips, collides with other chrome, or expands excessively in ordinary states.

## Stop conditions

Do not proceed to TestFlight if any of these occur:

- child-accessible rule management;
- unauthorized or cancelled weakening mutation;
- clearing or weakening an unrelated rule/selection;
- disagreement between displayed rule state and authoritative backend/native state;
- an undismissable guide or a guide that obscures the only recovery route;
- family UI claiming **Applied** before a child-device receipt confirms it.

## Instrumentation

### Events to keep or add

- Keep `screen_time_guide_shown`, adding non-sensitive properties:
  - `resolution_kind`: `actionable`, `boundary`, `mixed`, or `unresolved`;
  - `rule_count`;
  - `domain_mix`: personal/family/money presence without rule IDs or app names;
  - `can_manage_rules`;
  - `has_requirement_action`.
- Keep `screen_time_guide_dismissed` with `resolution_kind` and `rule_count`.
- Keep `screen_time_guide_requirement_opened`, adding a typed destination class rather than a raw URL.
- Add `screen_time_guide_manage_rules_opened` with destination domain and rule-count bucket.
- Add one rule-change authentication outcome event or structured local log with:
  - domain;
  - mutation class: disable, delete, relax condition, or deactivate agreement;
  - outcome: succeeded, cancelled, unavailable, failed;
  - whether the subsequent mutation committed.

### Events to retire from this surface

- `screen_time_temporary_open_requested`
- `screen_time_temporary_open_applied`
- `screen_time_temporary_open_denied`
- `screen_time_temporary_open_failed`

These event constants may remain for historic data or other explicitly owned workflows, but the guide must no longer emit them.

### What not to collect

- selected app/category names;
- rule titles, Activity text, Goal text, Money category names, child names, or membership IDs;
- biometric type, passcode use, authentication error details that could reveal device security configuration;
- screenshots, recordings, or interaction telemetry without an explicit local QA purpose;
- a vanity “success rate” derived from the tiny Andrew-only sample.

## Decision rule

### Proceed to the implementation brief and local physical build

Proceed when the spec can encode all authority, destination, authentication, no-change, layout, and verification cases without unresolved product decisions.

### Proceed from local build to TestFlight

Proceed only after:

- every scenario-matrix case passes on the intended physical-device path;
- no stop condition occurs;
- at least three natural interventions across two ordinary days remain understandable and recoverable;
- any visual or copy issue found during natural use has been corrected and rechecked;
- the actual release candidate is verified again after the last relevant change.

### Revise before TestFlight

Revise the guide or routing when the boundary feels right but copy, destination specificity, content sizing, or management discovery fails. Prefer repairing those layers before reconsidering temporary opening.

### Reconsider the product bet

Reconsider management-only recovery only if repeated legitimate cases cannot be served by a clearer management destination and fresh-authenticated rule change. A single preference for convenience is insufficient evidence to restore a hot-path override.

## Expected next action

Create the permanent feature brief/spec, update the accepted Screen Time documentation, run a spec-refinement pass, then implement the local learning release with regression-first coverage for guide projection, authority, routing, authentication, and no-change outcomes.
