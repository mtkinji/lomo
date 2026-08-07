# Meals Use-Case Catalog

## Purpose

This catalog maps the situations Kwilt's connected Recipes, Meal Planning, and
Groceries capabilities may need to serve. It is broader than one release and
does not imply that every use case belongs in the editorial Collections system.

The shared outcome is:

> Help a household move from food knowledge or present reality to meals it can
> plausibly enjoy, afford, prepare, and carry through shopping and cooking with
> less repeated work.

## Decision

Accepted on August 6, 2026: all 37 use cases belong in the Meals system
horizon. They are not 37 separate features or top-level navigation
destinations. The horizon labels below determine sequencing, while the system
overview defines the small set of shared objects and capability handoffs that
serve them.

See [Meals System Overview](system-overview.md).

## Ownership and horizons

- **Meals / Recipes** owns food discovery, reusable recipe knowledge,
  provenance, readiness, and cooking guidance.
- **Meal Planning** owns candidate choice, prepared proposals, family input,
  servings, optional placement, and finalization.
- **Groceries** owns ingredient compilation, stock review, products, price
  evidence, savings, and retailer handoff.
- **Food loop** means the use case requires more than one owner but still needs
  to feel continuous to the household.

Horizon labels:

- **Core** — central to the initial household feeding loop.
- **Expand** — valuable after the core path is trustworthy.
- **Later** — plausible, but needs stronger evidence or another system.

Editorial-fit labels:

- **Primary** — editorial Collections and ready-made plans directly serve it.
- **Supporting** — the concept can help, but another capability owns completion.
- **Outside** — important to Meals generally but not a reason to expand the
  editorial system.

## Discover something worth making

| ID | Use case in user voice | Desired progress | Owner | Horizon | Editorial fit |
| --- | --- | --- | --- | --- | --- |
| M-01 | Show me delicious food I believe I can actually make. | Appetite and confidence arrive together before dense recipe detail. | Meals / Recipes | Core | Primary |
| M-02 | Help me get out of the rotation without making dinner a risky project. | A bounded set contains calibrated novelty rather than random unfamiliarity. | Meals / Recipes | Core | Primary |
| M-03 | Pick some good possibilities for me so I do not face an infinite catalog. | Editorial judgment removes search and ranking work while leaving the final choice open. | Meals / Recipes | Core | Primary |
| M-04 | Let me explore a cuisine with enough context to understand what I am cooking. | A coherent, respectfully sourced point of view replaces a flat cuisine filter. | Meals / Recipes | Expand | Primary |
| M-05 | Give me food that fits this season, occasion, or kind of evening. | The inventory becomes relevant to the present moment without requiring configuration. | Meals / Recipes | Core | Primary |
| M-06 | Tell me why this is achievable for me tonight. | Time, active effort, equipment, special ingredients, and difficult techniques are legible without a reductive difficulty score. | Meals / Recipes | Core | Primary |
| M-07 | Help me find one realistic meal quickly when I already know the constraint. | Search/filter resolves a direct need such as thirty minutes, vegetarian, or soup. | Meals / Recipes | Core | Supporting |
| M-08 | Surprise me a little, but keep one foot in food I already like. | The user explicitly chooses a novelty posture and can see the familiar bridge. | Meals / Recipes | Expand | Primary |

## Preserve and return to food knowledge

| ID | Use case in user voice | Desired progress | Owner | Horizon | Editorial fit |
| --- | --- | --- | --- | --- | --- |
| M-09 | Save this paper card, URL, photo, or spoken recipe without retyping it. | Source evidence becomes a reviewed, private, attributable Recipe. | Meals / Recipes | Core | Outside |
| M-10 | Help me return to meals that worked. | Favorites, cook history, and household-owned plans preserve continuity. | Meals / Recipes | Core | Supporting |
| M-11 | Preserve the family version, including what we changed. | A new immutable Recipe version or private note retains authored household knowledge. | Meals / Recipes | Expand | Outside |
| M-12 | Let me reuse our successful variation of a plan. | The household starts from its own prior copy, not a newly changed editorial template. | Meal Planning | Expand | Supporting |
| M-13 | Share one meaningful recipe without exposing my library. | An attributed independent copy or explicit grant crosses the boundary. | Meals / Recipes | Expand | Outside |
| M-38 | Stop showing me a catalog meal that is not for us, and let me get it back later. | Personal discovery hides the meal immediately with Undo and a quiet recovery list; no Recipe or household plan is deleted. | Meals / Recipes | Core | Supporting |

## Choose and shape the next meals

| ID | Use case in user voice | Desired progress | Owner | Horizon | Editorial fit |
| --- | --- | --- | --- | --- | --- |
| M-14 | Let me choose some, but not all, meals from this appealing set. | A temporary selection remains visible while browsing and enters Meal Planning only after review. | Meals + Meal Planning | Core | Primary |
| M-15 | Give me a complete starting plan when I do not want to build one. | A prepared proposal carries meal sequence and rationale into an editable household draft. | Meal Planning | Core | Primary |
| M-16 | Let me choose the real horizon: three dinners, next shop, or a date range. | Planning fits household cadence rather than enforcing a calendar week. | Meal Planning | Core | Primary |
| M-17 | Shape the plan around how much time and energy we actually have. | The plan combines quick anchors, longer meals, and flexible nights honestly. | Meal Planning | Core | Primary |
| M-18 | Help me feed the household within a real spending boundary. | Budget-minded curation or current price evidence informs the plan without inventing savings. | Meal Planning + Groceries + Money | Core | Primary |
| M-19 | Use what is already here or needs using soon. | Confirmed relevant stock reduces meal gaps and waste without requiring a pantry database. | Meal Planning + Groceries | Expand | Supporting |
| M-20 | Make the meals work together as one basket. | Shared ingredients, package reuse, prep bridges, and intentional leftovers reduce total work. | Meal Planning + Groceries | Core | Primary |
| M-21 | Adjust the idea for our servings and explicit dietary constraints. | The proposal recalculates before adoption and never silently asserts safety. | Meal Planning | Core | Primary |
| M-22 | Let the people eating weigh in without making me run a poll. | Selected participants react privately to a bounded candidate set; the organizer decides. | Meal Planning | Core | Supporting |
| M-23 | Help me make the final call and understand what changed. | One reviewed version becomes the household commitment with clear provenance. | Meal Planning | Core | Supporting |
| M-39 | Record a food someone must avoid without suppressing it for everyone else. | A private, person-specific need is checked only against intended diners and never becomes a safety guarantee. | Household Food + Meal Planning | Core | Supporting |
| M-40 | Make one dinner even when different people need different dishes. | One meal occasion groups diner-assigned dishes, including an explicit alternate or a one-time not-eating choice. | Meal Planning | Core | Primary |
| M-41 | Help me make enough without deciding whether someone counts as an adult or child serving. | Intended diners set the quiet starting quantity; each dish supports direct adjustment and one extra. | Meal Planning | Core | Supporting |

## Turn the decision into groceries

| ID | Use case in user voice | Desired progress | Owner | Horizon | Editorial fit |
| --- | --- | --- | --- | --- | --- |
| M-24 | Turn the chosen meals into one correct list. | Ingredients combine conservatively with recipe and serving provenance. | Groceries | Core | Supporting |
| M-25 | Let me quickly mark what we already have. | A focused review removes duplicates without turning stock into ongoing administration. | Groceries | Core | Supporting |
| M-26 | Show whether a different meal would materially improve the basket. | A reviewable scenario compares the baseline with cost, waste, and grocery gaps. | Groceries + Meal Planning | Expand | Supporting |
| M-27 | Make a genuinely good store deal useful rather than impulsive. | A temporary price observation proposes the smallest plan/list change and can recommend doing nothing. | Groceries + Meal Planning | Expand | Outside |
| M-28 | Carry the reviewed list into pickup, delivery, or an in-store list. | Provider-supported work transfers while retailer-owned verification remains explicit. | Groceries | Core | Outside |

## Prepare and cook with confidence

| ID | Use case in user voice | Desired progress | Owner | Horizon | Editorial fit |
| --- | --- | --- | --- | --- | --- |
| M-29 | Before I commit, help me understand what this meal will ask of me. | Recipe Home exposes human time, key equipment, unusual ingredients, technique risk, yield, and the next action. | Meals / Recipes | Core | Primary |
| M-30 | Before I begin, help me get set up. | Readiness covers missing ingredients, equipment, preheating, prep, and locked servings. | Meals / Recipes | Core | Supporting |
| M-31 | Guide me one cue at a time while I cook. | Cook Mode preserves exact position, quantities, timers, and touch controls. | Meals / Recipes | Core | Outside |
| M-32 | Let me stay hands-free when my attention is occupied. | Foreground voice supports bounded recipe-grounded commands with obvious listening state and touch fallback. | Meals / Recipes | Expand | Outside |
| M-33 | Help me learn a new technique without making dinner feel like a course. | Editorial framing and Cook Mode explain the one or two decisions that make the dish work. | Meals / Recipes | Expand | Primary |

## Learn and begin again with less work

| ID | Use case in user voice | Desired progress | Owner | Horizon | Editorial fit |
| --- | --- | --- | --- | --- | --- |
| M-34 | Remember whether this was worth repeating and what we changed. | A two-tap cook finish captures only useful household truth. | Food loop | Expand | Supporting |
| M-35 | Let explicit likes, passes, swaps, and repeats improve the next choices. | Recommendations use inspectable signals without inferring a hidden taste identity. | Food loop | Expand | Supporting |
| M-36 | Prepare the next cycle without making me manage a recurring system. | A calm contextual invitation resumes prior knowledge and offers an editable starting point. | Food loop | Expand | Primary |
| M-37 | Help a changing household reset its food rhythm. | A new season, schedule, budget, or dietary reality can begin from relevant Collections and editable plans without treating drift as failure. | Food loop | Later | Primary |
| M-42 | Remind me to plan again only after I know this is useful. | After a first successful plan, an optional one-time or weekly Activity returns to current Meal Planning authority. | Meal Planning + Activities | Expand | Supporting |

## Meal-kit job decomposition

Meal kits do not serve only “find recipes.” They combine six pieces of progress:

1. **Appetite:** the food looks worth eating.
2. **Attainability:** time, equipment, ingredients, and technique feel manageable.
3. **Bounded choice:** someone has already reduced the universe to a good set.
4. **Beneficial surprise:** the set includes meals the person would not have
   searched for independently.
5. **Reduced execution risk:** ingredients, quantities, and method have already
   been reconciled.
6. **Momentum:** one choice advances toward a basket and a cooking experience.

Kwilt cannot reproduce physical portioning without a fulfillment partner, but
it can reproduce much of the decision and confidence value: authored curation,
honest makeability evidence, a persistent choose-some flow, an optional prepared
plan, reviewed groceries, and grounded cooking guidance.

## Candidate feature-level JTBD

The current taxonomy can provisionally place this demand beneath
`jtbd-carry-intentions-into-action`, but it lacks a food-specific leaf:

> When dinner has become repetitive but trying something new feels risky, help
> me find food that looks genuinely exciting and show me why I can pull it off,
> so I can bring novelty into ordinary family life without adding stress or
> waste.

Candidate id: `jtbd-discover-meals-i-can-actually-make`.

Do not add the taxonomy node until repeated interviews or household use show
that this is durable demand rather than one attractive solution frame.

## Priority for editorial Collections

The concept should be designed first around these use cases:

1. **M-01** — delicious and believable.
2. **M-02/M-03** — bounded, calibrated discovery.
3. **M-14** — choose some from the set.
4. **M-15** — adopt a complete starting plan.
5. **M-20** — benefit from a plan designed as one basket.
6. **M-29** — understand the commitment before saying yes.

If those six work, Collections can later support culture, season, budget,
pantry, learning, and re-entry without needing a different product model.
