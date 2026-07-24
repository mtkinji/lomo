# Converge: budget-unlock-bottom-guide

## Scoring
| Alternative | Persona fit | System fit | Reductive strength | Learning value | Decision |
| --- | --- | --- | --- | --- | --- |
| Chart Companion Guide | High | Medium-high | High | High | Winner |
| Meter-Header Action Strip | Medium | High | Medium | Medium | Keep as fallback |
| Full Review Sheet | Medium-low | Medium | Low | Medium | Reject |
| Floating Action Pill | Medium | Medium | Medium | Medium | Reject for first slice |

## Chosen Alternative
**Chart Companion Guide.**

Use a Kwilt-style bottom guide for the active app-pause choice. The guide appears only when Budget Detail is serving an unlock task. The meter and chart remain normal page content; the guide holds the choice.

## Capability Delta
Today, the user cannot:
- see the chart cleanly while the pause choice is active,
- experience `Keep blocked` as a first-class positive choice in a compact guide,
- distinguish the budget evidence from the unlock controls.

After this concept ships, the user can:
- land on Shopping with the chart still visually primary,
- see a small bottom guide: `Amazon is paused`, `Shopping at 90%`,
- choose `Open Amazon` or `Keep blocked`,
- dismiss the guide without losing access to the page,
- receive a quiet outcome receipt.

Still intentionally not possible:
- arbitrary recovery coaching,
- multiple stacked guides,
- opening the app without a recorded outcome,
- treating the guide as a generic education prompt.

## Reductive Design Pass
Smallest elegant version:
- One non-blocking bottom guide, one reason, two actions, one quiet receipt.

Enhance instead of create:
- Enhance Budget Detail. Do not create a separate review page for this moment.

Replace/collapse:
- Replace the inline unlock card/item when an active unlock task exists.
- Keep setup and advanced policy editing elsewhere.

Refuse to add:
- no new "pause center",
- no chart annotations for the pause,
- no rule chips,
- no generic Screen Time explanation,
- no reward or celebration.

What would make this clutter:
- guide plus inline card both visible,
- guide plus toast plus drawer stacked together,
- long reason copy,
- `Keep blocked` hidden behind an unlabeled close icon.

## Activation Path
Best activation moment: a blocked-app deep link or app-pause rehearsal route into Budget Detail.

Teaching posture: contextual and almost silent. The guide itself teaches the pattern: budget first, choice second.

Natural adoption signal: Maya looks at the chart, sometimes taps `Keep blocked`, and can describe the feature as "Kwilt makes Amazon wait until I check Shopping."

## Accepted Trade-Offs
- The guide is an overlay, so it must reserve enough bottom padding and avoid covering key content.
- Money needs a local guide primitive or an extension to `BottomDrawer`.
- `Keep blocked` should stay textual in the first version, even if a later compact state uses an icon.

## Rejected Trade-Offs
- Do not use the existing Money `BottomDrawer` as-is; its modal scrim and height make the moment too heavy.
- Do not hide the reason in a collapsed pill for the first learning slice.
- Do not make dismissal silently mean `Keep blocked`; that is too ambiguous for a trust surface.

## System Implications
- Add a `BudgetBottomGuide` or extend `BottomDrawer` with non-blocking inline/dynamic behavior.
- Budget Detail should render either the bottom guide or no unlock UI; not both the inline dock and guide.
- The bottom guide needs safe-area-aware bottom padding in the scroll content so chart/activity are not hidden.
- `Open for now` continues to record `opened_for_now`; `Keep blocked` continues to record `left_blocked`.
- Closing the guide without choosing should hide the guide for the current page visit or show a quiet minimized affordance, not record a review event.

## Bet
We're betting that moving the unlock choice into a bottom guide will make app pauses feel like calm decision support instead of another warning card. If the guide feels too promotional or hides too much evidence, revisit the meter-header action strip.

## Success Signal
In simulator review, the first viewport shows Shopping's meter and chart clearly while the guide offers the app-pause choice. Andrew can decide from the screenshot whether the pause feels calmer than the inline item.
