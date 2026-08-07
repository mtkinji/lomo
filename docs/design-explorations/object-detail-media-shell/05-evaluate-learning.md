# Evaluate Learning: Object Detail Media Shell

## Learning Questions

### Shared object-detail grammar

1. Do Arc, Goal, To-do, and Meal details feel like members of the same Kwilt
   system without making their content or purpose feel artificially identical?
2. Is the hero-to-sheet transition quiet and spatially useful, or does it call
   attention to itself, obscure content, or fight each screen's scrolling?
3. Are immersive, standard, and compact variants enough, or does a domain need
   a genuinely different structural treatment?

### Meal confidence and comprehension

4. Does a Recipe with no photo feel complete and trustworthy, while still
   making photo addition discoverable at an appropriate moment?
5. Do the full-width fact rows help a person understand what the Recipe asks of
   them faster than the current compressed summary capsule?
6. Do the section rhythm and **Instructions** label make Ingredients and the
   cooking steps feel clearly separated without making the page needlessly
   long?
7. With several photos, do people understand that the hero can be swiped and
   that one photo is the cover without needing a tutorial?

### Reviews and alternatives

8. Does one Reviews stream feel coherent when eligible Reviews from people the
   viewer knows are prioritized without being visibly split into lanes?
9. Does the ordering improve trust and usefulness without revealing a private
   relationship, changing visibility, or implying endorsement by a household?
10. Are recommendation reasons understandable and useful enough to justify a
    bottom-of-page alternatives section, or do they feel generic and
    distracting after a complete Recipe?
11. Can a person explore an alternative and return to the exact prior context
    without losing their place or accidentally changing a Meal Plan?

### Technical feasibility and product cost

12. Can one shell compose with the existing keyboard, coachmark, lifecycle,
    header-fade, and persistent-action behaviors without accumulating
    screen-specific escape hatches?
13. Can cover and photo ordering remain durable through save, sync, offline
    replay, and relaunch without weakening existing media ownership or rights?
14. Can Reviews remain independently gated so the Recipe page still feels
    complete when participation data is unavailable?

## Evidence Plan

| Area | Evidence that supports the bet | Evidence that disconfirms the bet |
| --- | --- | --- |
| Shared shell | On the same installed build, the four migrated details share a recognizable transition and sheet edge while their hero scale and domain content remain appropriate. | A screen needs one-off geometry or scroll exceptions that effectively recreate a bespoke shell, or people describe the screens as more uniform but less appropriate. |
| Motion and accessibility | Scrolling remains readable and stable; Reduce Motion removes parallax without breaking the sheet relationship; large Dynamic Type and VoiceOver preserve action order and meaning. | Motion causes nausea, visual competition, clipped content, focus jumps, inaccessible controls, or a materially different broken Reduce Motion layout. |
| No-photo Meal | Evaluators describe the state as intentional artwork or simply as the Recipe page, not as an error or unfinished record; **Add a photo** is found when asked without dominating first use. | The fallback is mistaken for a specific dish, feels generic or deficient, or the photo invitation creates maintenance pressure. |
| Recipe comprehension | In task-based observation, a person can state available time and yield, find Ingredients, and locate cooking steps without interpreting dashes or asking what **Method** means. | Facts still scan as a dashboard, omitted facts create ambiguity, serving scale is mistaken for static metadata, or Instructions remain visually crowded against Ingredients. |
| Multiple photos | Zero, one, and many-photo states behave predictably; swipe, gallery, cover choice, reorder, deletion, sync, and relaunch preserve the intended cover and remaining images. | A single image displays unnecessary gallery chrome, cover choice is lost, swiping conflicts with page scroll, or rollback risks image loss. |
| Reviews usefulness | In a real authorized projection, the viewer's own Review and eligible Reviews from known people appear before other Reviews, and evaluators find the unified stream natural. | Ordering leaks relationship information, requires client-side graph access, lets relationship state grant visibility, or known-person ordering is not meaningfully more useful than a simple recent-first list. |
| Reviews safety | Two-account tests prove blocked, ineligible, moderated, deleted, child, and private Cook-note content never appears; reporting and author deletion work end to end. | Any unauthorized content or relationship inference is possible, moderation cannot act promptly, or a private Cook note can be mistaken for submitted public participation. |
| Recommendations | For each shown card, the evaluator can explain why it appeared; opening it is useful in at least some real browsing decisions; Back restores the prior Recipe and position. | Reasons are often untrue or vague, alternatives duplicate the current Recipe, the section distracts from cooking, Back loses context, or opening a card changes planning state. |
| Page independence | Recipe Home still feels finished when Reviews or recommendations are gated off or have no eligible records. | Empty sections, explanatory placeholders, or awkward spacing expose internal rollout state. |

## Learning Instrumentation

### Product analytics

Keep analytics metadata-only and route it through the existing Food analytics
privacy contract. Add only the events needed to distinguish meaningful actions:

- Recipe media gallery opened, with `source`, media-count bucket, and entry
  method only;
- Recipe photo action completed or cancelled, with action method and outcome
  only;
- Recipe recommendation shown and opened, with bounded reason category and
  result-count bucket only;
- return from a Recipe recommendation, with restoration outcome only;
- Reviews section opened and Review submission outcome, with source and outcome
  only when the independently gated participation work enables them.

Event properties must use enums or counts. They must never contain Recipe IDs,
titles, ingredient or instruction text, media URLs, Review text, reviewer IDs,
relationship types, household membership, source URLs, private Cook notes, or
free-form failure details. Relationship-tier correctness belongs in
authorization tests and server observability, not product analytics.

The existing `recipe_home_viewed` event remains the page-opening denominator.
Do not add an event merely because a section crossed a scroll threshold.

### Structured dogfood notes

For each evaluation session, record only:

- installed build, source checkout, branch, commit, dirty state, and Metro or
  bundled-runtime provenance;
- device, text-size setting, Reduce Motion setting, and Recipe media state
  (`zero`, `one`, or `many`);
- which object detail was opened and which task was attempted;
- whether the transition felt shared, whether any control or section was hard
  to understand, and whether an alternative was useful;
- screenshots or screen recordings of visual defects, with private content
  redacted before sharing.

Use short prompted tasks rather than preference-only questions:

- “How much time does this take, and how many does it make?”
- “Where would you start cooking this?”
- “Add another photo and make it the cover.”
- “Find another Meal that might fit tonight, then return here.”
- For authorized Review evaluation: “Which Reviews would you read first, and
  why?” without revealing the intended relationship ordering beforehand.

### Technical proof

- component and screen tests for geometry contracts, Reduce Motion behavior,
  fact omission, photo cover/position persistence, recommendation exclusions
  and reasons, and navigation restoration;
- Simulator state matrix for all four object types plus zero, one, and many
  Recipe photos, large accessibility sizes, VoiceOver labels, Reduce Motion,
  long content, and persistent actions;
- offline/relaunch verification for photo ordering and Recipe rendering;
- two-account server tests and signed-device verification for Review
  visibility, blocking, moderation, deletion, ordering, and private-note
  exclusion;
- rollback exercise proving that disabling shell, Reviews, or recommendations
  does not delete or reinterpret user data.

## Signals We Will Not Treat As Proof

- time spent on Recipe Home, because longer can mean interest or confusion;
- raw scroll depth, because reaching Reviews or recommendations is not itself a
  good outcome;
- total photo count, because Kwilt should not create photo-completion pressure;
- Review volume, star averages, likes, follower count, or engagement velocity;
- recommendation click-through without verifying reason truth and successful
  return behavior;
- Simulator success as proof of real-account authorization, signed-device
  accessibility, offline sync, or production publication behavior.

## Decision Rule

The shell and core Recipe layout may become permanent independently of Reviews.
Promote them when:

1. one installed build passes the complete Arc, Goal, To-do, and Meal visual and
   accessibility state matrix;
2. no migrated screen needs a bespoke structural fork beyond the agreed
   geometry variant and explicit composition slots;
3. zero-, one-, and many-photo Recipes survive edit, relaunch, and offline
   recovery without data loss or a deficient zero-photo state;
4. task-based evaluation finds no recurring confusion around time, yield,
   serving scale, Ingredients, Instructions, or photo controls;
5. several real browsing decisions demonstrate truthful recommendation reasons
   and reliable context restoration, with no implicit planning side effects.

Keep Reviews gated until the two-account authorization matrix passes on real
accounts and reviewers confirm that a single prioritized stream is useful
without exposing why someone is considered known. Review UI polish alone is
not sufficient.

Revise the concept if the shared behavior is valued but one geometry variant,
fallback treatment, fact grouping, or recommendation placement repeatedly
fails. Simplify to the shell plus Recipe structure if recommendations add
little value. Retire relationship-aware ordering in favor of a safe neutral
order if it does not improve usefulness or cannot be implemented without
privacy ambiguity. Retire the shared shell abstraction if adoption produces
more per-screen exceptions than shared behavior.

Make the decision after the full controlled state matrix and at least several
days of Andrew's normal Meal browsing, including multiple real alternative
decisions—not after a single polished screenshot. Production-default exposure
requires additional eligible adult dogfood evidence; Andrew-only evidence can
accept the implementation and hidden release but cannot establish general
comprehension or trust.

## Expected Next Action

If this evidence plan is accepted, author the implementation-ready feature
brief with separate delivery gates for the shared shell/core Recipe experience,
recommendations, and Reviews. Refine its data-authority and scroll-composition
contracts before code changes. After the hidden learning release is exercised,
use this document to choose independently whether to keep, revise, or retire
each gated capability, then update the relevant job-flow delivery evidence.
