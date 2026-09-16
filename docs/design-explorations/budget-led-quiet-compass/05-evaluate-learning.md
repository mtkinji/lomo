# Evaluate learning: first value before setup fatigue

## Status

Evaluation plan only, written 2026-09-15. No participants have been run and no conversion or
retention lift has been established by this planning task.

## What we need to learn

| Question | Observe | Failure signal | Response |
| --- | --- | --- | --- |
| Does the starter fit different arrivals? | Person identifies their intended capability without help | Meals/Chores arrival thinks the app is only for finance | Adjust hierarchy/row clarity, not another tour |
| Does the invitation explain the next step? | Person predicts what “Build my budget” starts | Expects immediate app blocking or a free paid bank service | Clarify the one supporting line and access transition |
| Is the first finding credible? | Person can explain it and inspect supporting evidence | Confuses connected-account data with complete household truth | Improve scope and evidence, not more confident copy |
| Does conversation visibly help? | Supplied context changes a relevant explanation or proposal | Generic response ignores what was said | Fix grounding; omit AI embellishment until it works |
| Does the action feel real? | Person can name the saved change and find it on landing | Thinks a proposed budget or rule was already applied | Fix proposal/commit/readiness distinction |
| Does the flow feel finished? | The promised app opens immediately, with useful content | Another mandatory prompt or an unrelated empty dashboard appears | Remove the interruption and repair landing continuity |
| Does it remain useful? | Person returns to the budget, decision, chore, or meal | Only revisits to finish required setup | Investigate the underlying job/value gap |

## Study

Use six moderated first-use participants as an initial qualitative round, including a non-Money
arrival, someone skeptical of permissions, and a sparse-data case. Use authorized test data or
properly consented live data; do not collect participant financial information in general study
notes or analytics. Observe unaided intent recognition, first-value explanation, evidence access,
actual action completion, and whether the person knows how to leave/resume.

Treat five-of-six comprehension/task-success targets as iteration signals, not a statistically
reliable estimate of conversion. Record total elapsed time, active Kwilt interaction time, and
external provider waits separately. The proposed 90-second post-authentication active-interaction
target is a design budget for ready-data cases, not a promised bank-import duration.

Do not optimize for number of “yes” taps. A shorter flow that fails to explain bank permission,
paid access, evidence scope, or an applied restriction is not a win.

## Analytics interpretation

- Starter choice, signup, purchase, and bank connection diagnose funnel progress.
- A grounded finding establishes early personal value.
- An owner-confirmed save establishes setup/action success.
- Preserve `MoneyFirstTrustedDecision` as the existing trusted-decision contract; do not rename
  advice viewing or onboarding completion to make activation look higher.
- Check meaningful job repetition during days 8–14, then continue longer-term retention analysis.
- Review the other capability paths with their own persisted-result events and return behavior.

## Decision rules

- If the visual sequence feels excellent but delays the first useful result, reduce required
  steps before adding further animation or personalization.
- If people skip context successfully, retain that successful path; do not punish them with an
  incomplete-profile badge or a subsequent mandatory interview.
- If a recurring-charge observation is inaccurate, remove that card until the detector meets its
  quality gate. Never use prose to conceal weak evidence.
- If controls require too much setup, keep a complete Money path and improve the contextual
  optional setup. Do not falsely report active protection.
- If another capability is hidden or cannot complete setup, the shared starter is not ready for
  production promotion.

## Reflection after delivery

After real delivery evidence, update the referenced Money job-flow scores and gaps. Retain
separate source, runtime, device, service, and release proof. Record what changed and what remains
unproven; do not preemptively upgrade scores based on this plan.
