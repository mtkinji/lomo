# Converge: Places System

## Scoring

| Alternative | Maya fit | Nina / trust fit | System fit | Learning value | Verdict |
| --- | --- | --- | --- | --- | --- |
| A: Activity-Attached Places | Strong near-term | Medium | Strong | Medium | Useful slice, not enough as the concept. |
| B: Evidence-Gated Places | Strong | Strong | Medium | Strong | Choose as the system concept. |
| C: Settings-Managed Places | Medium-strong after value | Strong | Medium | Medium | Include as durable memory management, not first value moment. |
| D: Phone-Agent-First Places | Medium | Strong | Medium-low today | Medium-high | Important surface, not the foundation alone. |
| E: Location-Offer-First Places | Medium-strong | Strong if explicit | Strong | Medium | Keep as concrete behavior inside the system. |

## Chosen Direction

Choose **Evidence-Gated Places**.

Places should be Kwilt's shared interpretation layer for place relationships around Activities. The system should distinguish place reference, place intent, place evidence, place context, and place memory, then surface only the useful result: a clearer Activity detail, a location-trigger offer, a smarter Recommended item, a Phone Agent proposal, or a Settings-managed durable Place.

## Capability Delta

Today, the user can sometimes attach a location to an Activity or receive a location-trigger offer, but Kwilt cannot consistently answer:

- What place was referenced?
- Why does that place matter?
- Who confirmed it?
- Is it relevant now?
- Is it durable memory or one-time context?
- Should it affect Recommended, a reminder, or an agent proposal?

After this concept ships, the user can capture or edit a place-bearing Activity and trust that Kwilt understands the difference between "this to-do mentions a place," "this to-do is assigned to this Place," "remind me there," "this is doable there," "a trigger fired," and "remember this place for later."

Still intentionally not supported:

- hidden place learning;
- automatic completion from location events;
- a primary-canvas Places tab;
- continuous location history;
- place automation without explicit approval.

## Reductive Design Decisions

- Enhance existing Activity, Recommended, Quick Add, Location Offer, and Phone Agent surfaces instead of adding a Places tab to the main canvas.
- Treat saved/learned places as earned Settings-managed memory, not the starting UI.
- Keep place signals confidence-gated; weak location metadata can help, but should not dominate actionability.
- Keep trigger events as offers or evidence, never automatic task completion.
- Keep all durable memory user-approved, editable, and deletable.
- Use the same proposal semantics for Quick Add and Phone Agent.

## Accepted Trade-Offs

- The first implementation may feel less magical because it refuses silent place learning.
- The domain model becomes more explicit than a single `Activity.location` field.
- Some future behavior remains deferred until the trust contract is clear.
- Recommended may sometimes stay generic when place evidence is weak.

## Rejected Trade-Offs

- Do not ask Maya to set up Places before she gets value.
- Do not make place context a broad category boost.
- Do not let Phone Agent silently create triggers or saved place memory.
- Do not use location permission as a prerequisite for capture.

## System Implications

The system needs a minimum shared model:

- `PlaceReference` - the place mentioned or attached.
- `PlaceAssignment` - the contextual link between an Activity and a Place, independent from notification delivery.
- `PlaceIntent` - why the place matters.
- `PlaceEvidence` - what supports the relationship.
- `PlaceContext` - whether the place is relevant now.
- `PlaceMemory` - durable, user-approved place understanding, managed from Settings rather than the primary Activity canvas.
- `PlaceSuggestion` - a proposed trigger, memory, or edit that needs user review.

Non-place modes such as `Errands`, `Away from home`, `At computer`, `At office`, or `Calls/messages` should stay in the To-Do Action Contexts model as `ActionContextAssignment` or an equivalent concept. They can interact with Places, but they should not be represented as fake Places.

`Activity.location` can remain as the compatibility surface, but implementation should avoid adding unrelated ad hoc fields when a place concept is really evidence, intent, context, or memory.

## Learning Model

Places should learn from evidence the user already creates:

- captured text or voice that names a place;
- AI enrichment that extracts a place reference and likely intent;
- accepted or rejected place suggestions;
- user edits such as changing Walgreens to CVS or choosing "not this place";
- repeated similar Activities with the same explicit place relationship;
- completion or trigger events when the user has already enabled place behavior.

The system can make lightweight task-level inferences before asking for setup. "Pick up prescription at Walgreens" can become an Activity assigned to a Walgreens place candidate with no modal and no Settings setup. Kwilt should ask only when the behavior crosses a trust boundary: enabling a geofence trigger, saving durable PlaceMemory, merging repeated candidates, or using current location.

Learning ladder:

1. Extract a candidate place reference.
2. Soft-assign it to the Activity when confidence is high.
3. Use it lightly in Recommended, Activity Detail, search, and context reasoning.
4. Ask at the value moment for stronger behavior.
5. Save durable memory only after approval.
6. Learn from corrections and rejection.

Place resolution should be lazy. A text reference such as `Walgreens` can remain a brand/chain candidate until the user asks for behavior that needs a specific store, such as geofencing, directions, nearby search, or a travel-scoped recommendation. "Any Walgreens" and "the Walgreens near my hotel" are different resolutions of the same reference, not separate user setup chores.

## Activation Path

Places should activate at natural value moments:

- Quick Add detects place-bearing language and creates the to-do first, then proposes place behavior if useful.
- Activity Detail lets the user inspect, edit, or remove the place assignment and any optional trigger behavior.
- Recommended uses place evidence only when it improves the next doable action.
- Location Offers ask for permission only after a user accepts a geofence trigger behavior; assignment alone never requires permission.
- Phone Agent turns place-bearing messages into previewable proposals.

## Stated Bet

We're betting that place awareness becomes trustworthy when it is evidence-gated and surfaced through existing Activity workflows, with durable Places managed quietly in Settings after they exist. If users cannot understand or benefit from place relationships without creating Places first, we would revisit whether Settings needs a stronger guided setup path.

## Success Signal

Qualitatively, users say Kwilt helped them remember the right thing in the right place without feeling tracked or forced into setup.

Behaviorally, place-aware Recommended items are opened or completed more often than generic place-bearing tasks, location-trigger offers are accepted when timely and rejected without broader distrust, and users can inspect or remove place relationships when needed.

Trust succeeds when permission prompts only follow explicit intent and place memory never feels like a hidden surveillance layer.
