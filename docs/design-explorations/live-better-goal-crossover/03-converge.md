# Converge: live-better-goal-crossover

## Qualitative Scoring

| Alternative | Persona fit | Anchor fit | System fit | Blast radius | Main trade-off |
| --- | --- | --- | --- | --- | --- |
| Advice Card In Budget | Medium | Medium | High | Low | Advice stays too shallow. |
| Goal Draft Bridge | High | High | Medium | Medium | Needs a clean cross-app handoff. |
| Ask Workspace Financial Coach | Medium | Medium | Medium | High | Too broad for first proof. |
| Weekly Money Pattern Review | High | High | Medium | Medium | Timing may be too slow for first advice demand. |
| App-Gate Reflection | High | High | Medium | Medium | Depends on proven native gate history. |

## Chosen Alternative

Choose **Goal Draft Bridge**.

Budget should surface one evidence-backed money insight and invite Blaire to turn it into an editable Kwilt goal. The goal draft is the crossover moment; Budget does not become the life-coaching product, and Kwilt does not need to own raw financial operations.

## Capability Delta

Today, the user cannot:

- Ask Budget what to do differently and get a clear next move.
- Turn a budget pattern into a Kwilt goal without doing the translation herself.
- Preserve the evidence behind financial advice.
- Distinguish a budget-rule fix from a behavior-change goal.

After this concept ships, the user can:

- See one calm, evidence-backed insight about a repeated spending pattern.
- Choose "Set a goal?" only when the insight needs ongoing follow-through.
- Review an editable goal draft before anything is created.
- Start with one small next action rather than a vague money aspiration.

Still intentionally not possible:

- Automatic goal creation.
- Broad financial advising.
- Debt, investment, tax, or credit recommendations.
- Hidden sharing of full transaction details into Kwilt.
- A required goal prompt before dismissing Budget advice.

## Reductive Design Pass

Smallest elegant version:

- One pattern insight.
- One optional Kwilt goal draft.
- One confirmation/handoff action.
- One fallback if Kwilt is not installed or the deep link is unavailable.

Enhance existing surfaces:

- Start in Budget Plan or Budget Detail, not a new tab.
- Reuse Ask later for explainability, not as the first activation surface.

Refuse to add:

- A financial health score.
- A generic advice feed.
- Multiple simultaneous recommendations.
- Streaks, guilt badges, red urgency, or "optimize your finances" copy.
- Auto-selected Arc.

Would feel like clutter if:

- Every hot budget gets a goal prompt.
- The app recommends goals before the meter is trusted.
- The prompt appears during every app-gate review.
- The advice reads like generic personal finance content.

## Activation Path

Best activation moment:

1. Budget has enough evidence to show a pattern, such as a budget running ahead of pace in two consecutive periods, repeated app-gate reviews for the same lane, or repeated transaction matches for the same discretionary lane.
2. The user is already in a reflective surface: Plan, Budget Detail, or a post-review receipt.
3. The prompt names the pattern and offers a user-owned goal draft.

Education posture:

- Teach contextually.
- Do not promote Kwilt as an upsell.
- Use the shared Kwilt voice rules: concrete, practical, warm, non-shaming.
- Use language like "This may be easier as a goal" rather than "Set a goal now."

Example copy:

```text
Shopping has run ahead of pace in 3 of the last 4 weeks.

This may be easier as a goal than another rule tweak:
"Pause before household extras this month."
```

## Accepted Trade-Offs

- Accept a small bridge payload before building a full shared account graph.
- Accept one insight type before building a broad advice engine.
- Accept a manual or shallow handoff in the first learning release if the goal draft value needs proof before deep integration.

## Rejected Trade-Offs

- Do not make Budget write goals directly without confirmation.
- Do not require a goal to continue app access.
- Do not move raw transaction details into Kwilt by default.
- Do not build a generic financial coach before proving one grounded pattern.

## System Implications

- Budget needs a `BudgetPatternInsight` concept or equivalent derived view.
- Budget needs a `GoalBridgeDraft` payload with title, why, suggested duration, and one optional starter Activity.
- Kwilt needs either an accepted deep-link/import surface or the first release needs a clear fallback.
- Events should distinguish `insight_seen`, `goal_bridge_opened`, `goal_draft_accepted`, `goal_draft_dismissed`, and `fallback_used`.

## Bet

We're betting that Blaire will trust and value financial advice more when Budget turns one real spending pattern into an optional Kwilt goal draft, rather than giving generic tips or keeping the whole change loop inside Budget. If it turns out not to be true, we'd revisit by keeping advice inside Budget as rule changes and delaying the Kwilt crossover until the app-gate or weekly-review loops are stronger.

## Success Signal

Blaire can say, in her own words: "Budget noticed the money pattern, and Kwilt helped me turn it into something I can actually do."
