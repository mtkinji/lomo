# Current-App Critique of the Monthly Household Plan Mockup

## Evidence Boundary

This critique compares revision one with:

- the current iPhone 17 Pro Simulator setup screen served from this checkout;
- `MoneySummaryScreen`, `MoneyPlanLimitAnswer`, and `MoneyScreenFrame`;
- `MoneyCategoryMeterTile`;
- `MoneyCategoryDetailScreen` and `MoneyDetailMeter`; and
- Andrew's direct reactions to the first mockup.

The Simulator was showing the current percentage-first setup, not an
authenticated Budget Summary. Summary and category comparisons therefore use
current source as the behavior and composition evidence. Revision two remains
a static concept, not native runtime proof.

## What Revision One Got Wrong

### It put a household total inside one of its parts

`Monthly plan · $8,000` appeared inside the Flexible spending card. That implies
the monthly plan describes flexible capacity, when it actually contains both
Flexible and Committed spending.

Correction: make `$8,000` a quiet month-level statement above both sections.
Flexible says `$624 left out of $2,780`; Committed uses its own planned amount,
`$5,220`.

### It added gray card chrome where state could do useful work

The current flexible answer is a large white Card and over-limit numerals become
bright red. Revision one changed the white to gray without giving the color a
meaning.

Correction: use a borderless state surface and keep the amount in normal dark
ink:

- pale pine for on track;
- pale turmeric when committed costs leave no flexible room;
- pale madder for over.

An unavailable calculation stays neutral. This first slice does not invent a
predictive `watch` threshold from spending pace; it uses only states the current
answer already knows truthfully.

The state word and accessible label must remain, so color is reinforcement—not
the only signal.

### It implied that rollover is an ordinary detail-screen control

The first Health mockup placed `Carry balance forward` in a prominent card on
the category page. The current application already has a Category settings
drawer with the monthly amount and rollover toggle. That is the correct control
boundary.

Correction: category detail explains `$400 − $100 = $300`; Category settings
owns rollover on/off, start month, and start-fresh actions. A visible `Change
plan` affordance leads there.

### It removed established surfaces without a product reason

Revision one replaced current category meter tiles with generic dollars-left
cards and reduced category detail to a ledger-like page. The current app has:

- two-column radial meter tiles;
- a category cover and hero treatment;
- a live spend/forecast meter and chart;
- Activity and month-scoped transactions; and
- supplemental month stats.

None of those is invalidated by the monthly-household-plan concept. Revision two
restores the meter-tile idea on Summary and treats the Health screen as a
focused illustration of where carry arithmetic enters—not as authority to
delete the hero, forecast, chart, or Activity.

### It made the setup visually generic

The current setup is illustration-led and gives one decision substantial calm
space. Revision one's evidence card made setup feel like a compact financial
dashboard.

Correction: reuse the current Money illustration and interstitial grammar. Put
the recommended amount first, one evidence sentence second, and `Use this plan`
third. Detailed evidence remains behind `Compare other amounts` or `How Kwilt
chose this`.

## Month Navigation Decision

The current Summary has two layers:

1. the capability header with menu, `Budget`, and overflow; and
2. a page-content month row with both arrows, `View`, Add category, and a
   horizontally paging month inventory.

Leave this structure unchanged. Moving the month controls into the capability
header creates header-fit, Dynamic Type, and action-redistribution questions
without helping the state-surface job. Both arrows, the month label, `View`, Add
category, and horizontal paging remain in the current page-content row.

## Explanation Affordance

Current Flexible spending has both:

- an info popover attached to the section label; and
- `What's included?`, which opens the substantive explanation drawer.

These are two entries into nearly the same question. Revision two keeps only
`What's included?`. The smaller uppercase section label orients; the one
affordance explains.

Committed spending should use the same quiet label treatment. If its aggregate
card opens a breakdown, the whole card can be the affordance; it does not need
another info icon.

## Three Placements for the Monthly Plan

### A. Inside Flexible spending

Compact, but semantically wrong because `$8,000` includes committed spending.
Rejected.

### B. Month-level statement above both sections

`Monthly plan $8,000 ›` may eventually sit beneath the existing month row and above Flexible
and Committed spending. It is subordinate to `$624 left` but correctly owns
both sections. Recommended and shown in revision two.

### C. Subtitle inside the month navigator

The header could read `August 2026` with `$8,000 plan` beneath it. This is even
more compact, but it overloads the already constrained header and weakens
accessibility-size resilience. Keep as a fallback only if native testing shows
the top-level statement creates excessive vertical space.

## Corrected Three-Second Read

```text
August 2026
Monthly plan $8,000

FLEXIBLE SPENDING
$624 left
out of $2,780

COMMITTED SPENDING
$4,860 spent
out of $5,220
```

The arithmetic is coherent: `$2,780 + $5,220 = $8,000`. Each section explains
its own boundary; neither has to stand in for the household total.

## Remaining Questions

1. Does Committed spending need a state color, or only a neutral differentiated
   surface until a committed item is actually at risk?
2. After removing the duplicate info affordance, is `What's included?`
   discovered often enough?
3. Should the Committed aggregate card remain above its category inventory, or
   should planned-versus-used live directly in the section heading?
4. Where does the current category chart make room for signed carry arithmetic
   without duplicating the existing meter and `This month` stats?

These questions can be answered with a native Summary/category prototype. They
do not require changing the accepted monthly-plan, signed-carry, or one-time
addition model.
