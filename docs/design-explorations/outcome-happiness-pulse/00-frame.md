# Frame: Workflow Experience Pulse

## What the user said
> I think I would like a way to assess happiness by popping a bottom guide feedback moment after key workflow moments, but obviously not all the time.
>
> I don't necessarily want it to only appear after authoritative paid outcomes. I want to make sure that every end-to-end workflow can be successfully accomplished and that customers are happy with the way it is accomplished. Sometimes I may use this as a utility at specific points in the UI; other times I might use it to gauge authoritative paid outcomes.

## Restated in user voice
When I reach a meaningful point in something I came to Kwilt to accomplish, I want a quick, optional way to say how the experience is going or how it felt, so that Kwilt can improve the whole workflow without making feedback another task for me.

## Target audience
Portfolio-wide across Kwilt's target audiences. `audience-aspirational-family-organizers` remains the primary design lens because a feedback utility must work for a busy, non-power-user customer before it is generalized across the product.

## Representative persona
Maya is moving through ordinary family, Money, Food, Plan, and Screen Time workflows without wanting to become a product administrator. Nina is a secondary lens for advanced AI workflows because trust and control are central to that experience.

- Current situation: Maya has reached a deliberately selected checkpoint or completion point in a Kwilt workflow and wants either to continue or move on.
- What she's trying to become/do: Keep family life intentional and organized with less administrative work.
- Emotional state or tension: She may feel relieved, uncertain, or frustrated; asking for feedback must not steal the relief or compound the frustration.
- What would make this feel wrong to her: Frequent prompts, asking at an arbitrary screen boundary, vague smiley-only controls, forced comments, or treating her opinion as proof that the underlying system completed the job.

## Hero anchor
`jtbd-move-the-few-things-that-matter` — Maya cares because every workflow should help her make real progress, not merely complete screens.

## Job flow step

- Every documented end-to-end job flow needs separate behavioral evidence for start, meaningful progress, successful completion, failure, and abandonment where those states are knowable.
- Selected workflow checkpoints may additionally ask how the experience is going; selected completion points may ask how the completed experience felt.
- Money step 9 remains an example of an authoritative completion point. Family Screen Time's applied-policy receipt is another future example, but caregiver-side intent is not equivalent to successful device application.
- Unified Chat message feedback remains a capability-specific example. It measures an individual answer and should not automatically stand in for satisfaction with the whole end-to-end workflow.

## Active anchors

- `jtbd-trust-this-app-with-my-life` — the prompt should measure whether the experience felt trustworthy while itself remaining calm, transparent, and privacy-bounded.
- `jtbd-carry-intentions-into-action` — end-to-end measurement should reveal whether Kwilt helped the user carry an intention through the whole workflow.
- `jtbd-capture-and-find-meaning` — offering feedback must remain lightweight enough that it does not become administration.
- Capability-specific leaf jobs remain attached to each invocation so the signal can be interpreted in the context of the workflow being assessed.

## Friction we're addressing
Kwilt's instrumentation can increasingly show that discrete actions occurred, while the weekly HEART report still uses Chapter feedback as its broad Happiness proxy. Neither alone answers both questions Andrew cares about: whether a customer successfully accomplished an end-to-end workflow, and whether they were happy with how Kwilt helped them accomplish it. A reusable UI utility can gather the second signal at deliberately chosen points, but it must remain distinct from behavioral proof of the first.

## System alignment
Constraint posture: `Extend the system`

Current system facts:

- Existing surface: `BottomGuide` already provides a compact, dismissible, bottom-anchored interaction that suppresses competing toasts while visible.
- Existing user flow: the instrumentation map already names outcome evidence across Activation, Focus, Chores, Money, Games, Explore, Chat, Search, Screen Time, Food, and sharing, with explicit gaps and proof boundaries.
- Existing domain/data model: the weekly HEART report already expects bounded positive and total Happiness counts, currently sourced from Chapter feedback.
- Existing technical affordances: analytics has an event registry, event-specific property schemas, privacy sanitization, environment gating, and founder/test exclusion. Supabase can hold the authoritative response record used by the weekly report.
- Existing UX/copy conventions: guides should be calm, concise, dismissible, non-celebratory, and should not compete with receipts or recovery guidance.

Constraints to preserve:

- Keep workflow completion instrumentation and customer-perception feedback as two separate signals joined by a bounded workflow and checkpoint identifier.
- Let product code deliberately request the utility at a meaningful checkpoint, a completion point, or an authoritative outcome. Do not infer that every route change, tap, save, purchase, or technical success deserves a prompt.
- Every invocation must declare what is being assessed: `checkpoint_experience`, `workflow_completion_experience`, or `authoritative_outcome_experience`.
- Never interrupt a receipt, urgent error, recovery action, paywall, keyboard interaction, or another drawer/guide. A checkpoint prompt may follow setup or onboarding only when that exact experience is intentionally under evaluation.
- One global frequency and suppression policy must arbitrate all callers so adding more invocation points cannot increase interruption beyond the portfolio cap.
- Dismissal must be effortless and must not immediately requeue the prompt.
- Store only bounded capability, job-flow, workflow, checkpoint, invocation kind, outcome class when known, rating, reason code, and timing metadata. Do not send Money values, app selections, child identity, prompts, messages, titles, notes, or object IDs to PostHog.
- Do not use response volume as a success metric without also reporting prompt exposure and dismissal/nonresponse.
- Keep founder/test exclusions in the HEART readout.

Constraints we may challenge:

- Chapter feedback should stop being the portfolio-wide Happiness proxy once enough comparable workflow-experience responses exist; it can remain a separate reflection-quality signal.
- Existing capability-owned feedback can feed a shared Happiness model only when its question and scale are comparable.

Design implication:
Build a reusable workflow-feedback utility with two layers. The caller deliberately registers the workflow point, question context, and invocation kind; one portfolio-level policy decides whether it may actually appear. The feedback moment should be a single-tap pulse first, with an optional bounded diagnostic follow-up. Reporting must pair the perception signal with the separate workflow funnel rather than claiming the prompt itself proves success.

## Aspirational design challenge
How might we give every important Kwilt workflow both trustworthy completion evidence and a sparse, reusable way for Maya to say how the experience felt, while preserving her momentum and privacy?

## Out of scope

- NPS, app-store review prompts, open-ended research surveys, feature voting, support intake, or a user-facing analytics dashboard.
- Automatically prompting on every completion, mounting the guide on every screen, or using random presentation without deterministic global caps.
- Treating Screen Time policy intent or caregiver approval as an applied child-device outcome.
- Replacing capability-specific correction and recovery controls with a satisfaction prompt.
- Treating a positive rating as proof that the workflow completed, or a completed event as proof that the customer was satisfied.

## Open question
None for framing. V1 accepts account- or install-scoped local suppression; cross-device and reinstall-proof suppression is a graduation trigger for first-party persistence.
