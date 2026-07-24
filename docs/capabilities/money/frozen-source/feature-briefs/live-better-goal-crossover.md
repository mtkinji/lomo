---
id: brief-live-better-goal-crossover
title: Live Better Goal Crossover
status: implemented-learning-slice
audiences: [audience-aspirational-family-organizers]
personas: [Maya, Blaire]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: sustain-household-pattern
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-put-intention-before-impulse, jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending]
related_briefs: [brief-budget-reality-gate, brief-screen-time-controls]
exploration: docs/design-explorations/live-better-goal-crossover
copy_voice: docs/copy-voice.md
owner: andrew
last_updated: 2026-07-04
---

# Live Better Goal Crossover

## Summary

Kwilt Money should test a narrow crossover with Kwilt: when Budget has one evidence-backed money pattern, it can invite the user to preview a Kwilt goal draft.

The product bet is that Budget is the right place to notice the spending pattern, while Kwilt is the right place to sustain the behavior change.

## Job Delivery

- Job: `review-budget-reality-before-spending`
- Step: `sustain-household-pattern`
- Current score: 1.5
- Expected delivery change: 1.5 -> 2.5 if Blaire can understand a Budget insight, open a Kwilt goal draft preview, and leave with a concrete next Activity.
- Evidence required: compact Budget offer -> full-screen goal interstitial -> explicit accept/dismiss/share -> confirmed handoff or fallback -> qualitative feedback.
- Map update trigger: after a local or TestFlight learning release proves the handoff creates useful follow-through without making Budget feel noisy.

## User Problem

Blaire wants advice about what she can do to improve her finances and spend smarter. A budget meter can show what happened, and an app gate can slow a purchase, but neither necessarily helps her become the kind of person who spends with more intention.

If Budget tries to solve that by becoming a broad financial coach, it will drift away from its clearest wedge. If Kwilt receives a grounded goal draft from Budget, the two products can reinforce each other without blurring their jobs.

## Chosen Concept

Show one evidence-backed Budget insight and offer one optional action: `Set a goal?`.

The draft includes:

- a plain-language pattern,
- a goal title,
- a short why,
- a suggested 30-day or month-end horizon,
- one starter Activity,
- a source evidence summary,
- explicit confirmation before any handoff.

Example:

```text
Shopping has run ahead of pace in 3 of the last 4 weeks.

Kwilt helps carry Budget patterns into small goals and next steps:
"Pause before household extras this month."
```

## Product Principles

- Evidence first, advice second.
- Use the same voice rules as Kwilt: clear, warm, practical, concrete, non-shaming.
- One suggestion at a time.
- Budget owns spending truth; Kwilt owns follow-through.
- The crossover teaches why the apps work together; it does not imply Budget is insufficient.
- The banner names the user action first: set a goal.
- The interstitial introduces Kwilt only after the user asks to view the idea.
- The user chooses, shares, or dismisses the draft.
- No automatic goal creation.
- No raw transaction sharing in V1.
- No shame copy or financial-health scoring.
- No self-help fog, productivity hype, bank-warning voice, or parental-control language.

## Learning Release

Release channel: local build, then TestFlight if the handoff is reliable.

Must be real:

- Compact contextual offer on Budget home or Plan.
- One deterministic or fixture-backed pattern insight.
- `GoalBridgeDraft` data shape.
- Full-screen goal draft interstitial UI.
- Explicit accept/share/dismiss actions.
- Handoff attempt or fallback path.
- Local learning events for the learning questions.

Can be thin:

- Pattern detector can start with one lane, such as Shopping/Amazon household.
- Draft copy can be template-driven.
- Handoff can start as clipboard/share/deep-link fallback until Kwilt's import contract is confirmed.

Excluded:

- Broad financial advice engine.
- Ask-based open-ended coaching.
- Weekly review automation.
- Investment, debt, tax, or credit advice.
- Automatic Arc selection.

## Spec Refinement

Clear enough to build:

- The core user moment is narrow: one Budget insight becomes one Kwilt goal draft.
- The target job step is `sustain-household-pattern`.
- The first UI can reuse Budget home or Plan.
- The first draft can be deterministic.

Implemented first learning slice:

- Budget home and Plan show the first evidence-backed money-pattern offer.
- `src/domain/budget-goal-bridge.ts` builds the `GoalBridgeDraft`.
- `src/domain/budget-goal-bridge.ts` builds a privacy-preserving `GoalBridgeHandoffPayload`.
- The full-screen interstitial previews the goal and first step without turning the handoff into a form.
- Budget checks whether the `kwilt://` scheme can open; if so, the interstitial can offer `Open in Kwilt`.
- If Kwilt is not installed, the interstitial explains that Kwilt is the goal app and offers `Get Kwilt` plus a share fallback.
- The first installed-app handoff opens Kwilt's known Plan route with source/draft query params while the exact goal-import route remains unconfirmed.
- The share sheet remains the fallback and includes only the summary and draft, not raw transaction rows.
- `src/platform/goal-bridge-events.ts` records local, non-sensitive learning events.

Needs product decision before implementation:

- Whether the next surface should be Budget Detail or post-review receipt.
- Whether "live better" should ever appear in user-facing copy or stay as internal framing.
- What exact Kwilt deep-link/import route should receive a goal draft instead of opening generic Plan.

Assumptions made:

- Blaire maps to the `Maya` persona/audience for this app.
- The first release should not require mature Screen Time history.
- Kwilt already has enough Goal proposal/import grammar to receive or shape a draft, but the exact URL/import contract still needs confirmation.

Acceptance criteria:

- User can see the source Budget evidence before opening the draft.
- User can dismiss the suggestion without penalty.
- User can see the title and first action before handoff.
- The handoff/fallback does not include raw transaction rows.
- Copy passes `docs/copy-voice.md` and the shared `kwilt-copywriting` voice rules.
- Local learning events are recorded without sensitive transaction text.

## Open Questions

- Is "live better" the right outward phrase, or should user-facing copy say "make this a goal" / "spend with more intention"?
- Should the first draft include an Activity, or only a Goal?
- Should Budget ever receive status back from Kwilt, or is one-way handoff enough for V1?
