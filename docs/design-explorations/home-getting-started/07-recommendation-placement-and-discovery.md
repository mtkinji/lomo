# Home recommendations: continuation and discovery

September 10, 2026. Andrew approved pursuing the inline region described below. The initial Household/Money/Meals slice is implemented; this document retains the broader comparison and learning rationale. See the [implementation plan](../../superpowers/plans/2026-09-10-home-recommendations.md).

## User correction

Home should help a person discover meaningful capabilities they have not used, alongside useful next steps within current capabilities. The previous ranking placed adjacent discovery after current payoff, which can indefinitely favor the familiar capability. “New capability” is an independent source of value, not only a reward for finishing setup.

## Two independent purposes

- **Continue:** resume or improve something the person already started. Existing owner checkpoints, prerequisites and short outcome sequences remain applicable.
- **Discover:** make a credible, unused capability understandable and invite a first useful action. It can be relevant to the person's broader stated needs or known authorized context without being a dependency of the last action.

Use these as design roles, not mandatory product tabs. No prescribed number of capabilities, no adoption completion percentage, no requirement to use everything.

## Placement alternatives

| Surface | Strength | Weakness | Recommendation |
| --- | --- | --- | --- |
| An ordinary item in chronological feed | Naturally encountered while scrolling | Disappears into history; personal recommendation may look like another person's post or promoted content | Avoid for durable setup/discovery; reserve feed for its existing social/source contracts |
| Persistent inline region above the feed | Findable on return, visible without interruption, can show both continue and discovery | Can consume Home if allowed to grow | Recommended Home anchor; compact by default once feed has content |
| Bottom guide automatically on Home/page load | Hard to miss and visually distinct | Obscures content; repetition can feel like an interruption; poor place to keep a resumable sequence | Do not make it the default recommendation delivery; compare in native rehearsal if needed |
| Contextual inline offer inside an owning capability | Can explain a relevant benefit at the moment it matters | User may never visit that page; purely local offers cannot expose the full suite | Complement Home, with shared offer identity and dismissal |
| Separate For you / Discover page or tab | More room for exploration | Requires discovery of the discovery surface; divides Home before relevance is demonstrated | Optional broader browse destination, not the only place new capabilities appear |

The same recommendation may travel between Home and a relevant native surface, but it has one identity and shared state. A bottom sheet opened by the user can explain the benefit, prerequisites and next action. Required native guidance follows its existing owner contract. Presentation changes do not change authority or silently execute anything.

## Recommended composition to prototype

One Home recommendation region above the feed, visually separate from posts. Use one featured offer and at most one quiet complementary row:

**If discovery leads:**
- Outcome headline for a meaningful unused capability.
- One concrete sentence explaining the benefit and, when relevant, prerequisite.
- Explicit action into the owner experience.
- Quiet “Continue your meal plan” row if unfinished work exists.

**If continuation leads:**
- Existing short sequence and recommended next step.
- Quiet but visible discovery invitation naming the unused capability's benefit and a concrete action.

The complementary row is not a vague “More” link that hides the actual idea. Do not require swiping a carousel to discover it. Render either role alone when the other has no useful candidate, and neither when both are dismissed/ineligible. An automatic bottom guide does not accompany the region.

Illustrative discovery-led Home:

> **Know where you stand before you spend**
> Set up Money for a clearer view of your income, spending and plan.
> **Explore Money**
> Continue your meal plan →
> — actual shared-life feed —

This example does not imply current bank access, personalized financial knowledge, a free connection entitlement or accepted final copy. The actual entry must explain any plan, price, permission and supported-data requirements before they become hidden blockers.

## Discovery eligibility and ordering

Generate continuation and discovery candidates independently. A completed current path is not a prerequisite for discovery. An unfinished optional path cannot suppress discovery forever. Role, grants, supported routes, owner evidence and rollout readiness still gate what can be truthfully offered.

Discovery can be grounded in:
- Explicit interests or household needs the person already supplied.
- Authorized context that makes a capability appropriate, such as a chosen household participation model.
- A broadly understandable supported benefit from the existing value-door registry when little context is known. Use general benefit copy; do not pretend it was personally inferred.

Unused alone is insufficient: rank expected user benefit, fit and ability to reach a credible first value, not commercial value or the count of unopened features. Do not infer financial stress from Meals use, a desire for child restrictions from a child profile, or a partner from Household absence.

Prefer explicit requested work or an actionable important owner recovery in the featured position. Otherwise compare current payoff with relevant new value. Preserve a visible discovery row when continuation leads and a discovery candidate exists. Early setup may foreground continuation more often; useful unused capabilities remain visible throughout ordinary use. No fixed alternation quota, forced capability tour, arbitrary score weights or claimed optimal frequency at the concept stage.

Within a visit, keep the recommendation stable. Unaccepted discovery can remain findable across visits; accepting, declining, parking or losing eligibility changes state. Reevaluate at meaningful transitions, not every refresh. Do not turn changing suggestions into a feed that continually demands attention.

## Lifecycle

Getting started remains the finite progress/detail view for accepted setup paths. Discovery remains a distinct ongoing responsibility of Home after setup is settled. Discovery is not added as incomplete setup until the user accepts the path. Cross-capability recommendations do not change earlier progress denominators.

A person can be fully settled in their current use and still receive one useful optional invitation to something new. They can also decline it and continue enjoying the app without being classified as unactivated.

## What to test before selecting final placement

Prototype the same continuation/discovery offers in the persistent inline region, a contextual native card, and an on-load bottom guide. Hold copy and eligibility constant so the comparison tests placement. Include a busy feed, empty Home, unfinished setup and an established Meals-only user.

Observe: can the user identify both unfinished work and a new useful capability; predict each next action; find the recommendation later; and read/respond to posts without interruption? Measure new-capability first value separately from ongoing-capability continuation. A sheet's click rate alone does not justify a more interruptive surface.
