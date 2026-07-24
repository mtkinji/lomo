# Yes-And: summary-freshness-recovery

## Expansion check

The original feedback starts as an error-state layout and copy issue, but it points to a broader product contract: freshness is part of budget truth. Users need to know whether current-month data is fresh enough to act on, not merely whether a chart can render.

## Bigger opportunity

This could become a "freshness contract" for all live money surfaces:

- current month shows live connected status and retry affordance
- prior months show historical/saved scope without implying current freshness
- transaction review and budget detail use the same stale/fresh language
- app-gate review refuses to overstate confidence when the snapshot is stale

## Job elevation

The elevated job is not "recover from an API error." It is "help me know whether this money reality is current enough to guide my next action."

## Recommendation

Run the loop with the original frame, but name the bigger product direction as `Summary Freshness Recovery`. Build the smallest recovery slice now and let the full freshness contract remain a follow-up brief.
