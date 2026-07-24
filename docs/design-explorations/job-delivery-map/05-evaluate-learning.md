# Evaluate Learning: job-delivery-map

## Learning Questions

1. Does the map make the app's promised outcome easier to assess than reading feature briefs and screens separately?
2. Does the review template produce a clear next action within a daily or ad hoc build loop?
3. Does the map correctly distinguish current workflow improvements from missing surface opportunities?
4. Does it launch useful design loops without turning every weak step into a feature commitment?
5. Does it stay small enough to maintain?
6. Does it reveal stale job-flow docs or weak evidence before they mislead planning?

## Assumptions To Validate

- A structured YAML map is easier for Codex to review repeatedly than prose-only job-flow docs.
- Manual scores are acceptable if evidence and assumptions are explicit.
- `surface_opportunities` will prevent over-polishing current screens.
- One mapped job is enough to prove the operating pattern.
- The map will complement, not duplicate, feature briefs and design explorations.

## Evidence That Supports The Bet

- A Job Delivery Review names a weakest step and a next action in under a page.
- Andrew accepts or refines a recommendation because it is grounded in job-step delivery.
- The review identifies a missing surface opportunity, such as iOS widget visibility, that would not be obvious from screen review alone.
- A later design loop or implementation links back to a mapped step.
- A shipped change can update the map's evidence or score without rewriting the whole taxonomy.

## Evidence That Disconfirms The Bet

- The report mostly repeats obvious screen critique.
- The map takes longer to maintain than the decisions it improves.
- Scores feel arbitrary or become arguments without evidence.
- Feature briefs and job-flow docs diverge because the map is not updated.
- The map becomes a backlog board rather than an outcome-delivery tool.

## Brand-Goodwill Evidence

Because this is internal, brand goodwill is protected if the process keeps user-facing work calmer and more job-centered. Negative signal would be product work becoming more process-heavy, more jargon-heavy, or more dashboard-like for Maya.

## Instrumentation And Notes

Track lightly:

- Date of each Job Delivery Review.
- Job reviewed.
- Weakest step.
- Recommended next action.
- Whether the action was implementation, verification, design loop, or no-op.
- Whether Andrew accepted, changed, or rejected the recommendation.
- Any later score/evidence update.

Do not track:

- Private financial details beyond already display-safe budget state.
- Transaction-level data in the map.
- Individual user behavior until a real analytics plan exists.
- Agent productivity metrics as a substitute for Maya's job delivery.

## Decision Rule

Proceed to a more formal runner or script when:

- three review cycles produce useful recommendations,
- one design loop or shipped improvement traces cleanly back to the map,
- and the map remains small enough to edit by hand.

Revise if:

- the map is useful but too verbose,
- the review output is too long,
- or the surface-opportunity fields are too vague to launch design loops.

Retire if:

- the map becomes stale after multiple loops,
- or the recommendations are no better than ordinary feature review.

## Expected Next Action

Create the docs-first map and review template, then run the first Job Delivery Review against the current Kwilt Money app. Use that review to decide whether the next improvement should be the app-gate rehearsal path, the iOS widget surface, or transaction-review persistence.
