# Diverge: Budget-Led Quiet Compass

## Fixed product and copy contract

The divergence axis is composition, not product scope or offer wording.

Lead offer:

- `Control your spending`
- `Make a budget. Kwilt can pause selected spending apps until you check it.`
- Primary action: `Start with Money`

Other visible offers:

- `Set goals and manage to-dos`
- `Keep up with household chores`
- `Plan meals and groceries`

Quiet exit: `Look around Kwilt`

## UI contract

- Job: When a new user opens Kwilt without verified intent, they need to understand the clearest
  reason to start and still see the other practical capabilities, so they can enter the right
  first-value path without learning Kwilt's product taxonomy.
- Authority chain: Andrew's current decisions -> Money and Screen Time briefs -> Kwilt semantic
  color, icon, Button, Card, and onboarding contracts -> native iOS conventions.
- Three-second read: Kwilt recommends starting with spending control; three other useful starts are
  available now.
- Primary action: `Start with Money`.
- Primary information: the spending-control outcome and the budget-aware app-pause mechanism.
- Secondary information: the three other starter offers and `Look around Kwilt`.
- Reveal later: bank connection, budget setup details, Screen Time permission, app selection,
  rules, household setup, and the rest of the capability catalog.
- Scan order: lead promise -> primary action -> other visible offers -> quiet exit.
- Must not add: reflective questions, a capability carousel, `More`, hidden secondary offers,
  permission prompts, sample financial data presented as real, feature checklists, or equal-weight
  primary buttons.
- Reuse map: Parchment canvas and canonical Logo; Sumi text and primary Button; real `creditCard`,
  `shield`, `goals`, `navActivities`, `chores`, `cookingPot`, and `cart` icons; Card only where the
  lead offer needs one meaningful interaction boundary.
- Nearest precedent: capability onboarding's Parchment full-screen shell, changed from a
  one-capability story page to one lead offer plus directly visible alternatives.
- External exemplar ledger: N/A.
- Behavior sources: primary Money handoff from the capability onboarding contract; secondary
  capability handoffs from the accepted Quiet Compass architecture; direct selection from
  Andrew's current decision.
- Unresolved decisions: whether the lead promise needs a visual mechanism diagram to be understood.
- Required states: normal, enlarged text/scroll, unavailable Money path, resume-selected path, and
  direct contextual bypass.
- Proof path: first static mockups; then local iPhone 17 Pro Simulator through the actual first-run
  route; physical-device proof remains required for real Screen Time behavior.

## Alternative A: Featured offer card

One large, quiet white lead card contains the Credit Card + Shield icon pairing, lead offer,
one-sentence mechanism, and a single Sumi `Start with Money` button. A separate `Other ways to
start` list shows all three secondary offers as compact rows.

- Persona fit: High. The recommendation is obvious, and every alternative remains visible.
- Design-challenge answer: Strong lead hierarchy with the smallest departure from the current
  option-list concept.
- System fit: High. Uses one meaningful Card boundary, canonical Button hierarchy, and real icons.
- Best when: The lead offer needs clear containment without a tour.
- Fails when: The card becomes oversized marketing chrome or pushes secondary offers below the
  initial viewport.
- Four-object/capture-first stance: Goals and Activities remain one secondary entry; no capture or
  object creation is blocked.
- Anti-pattern check: Pass. No dashboard, streak, shame, forced permission, or hidden offers.

## Alternative B: Editorial lead

The lead offer is rendered directly on the Parchment canvas with larger type, one restrained
Credit Card + Shield mark, and a full-width Sumi action. The secondary offers follow as a compact
flat list without a containing card.

- Persona fit: High. It is the lightest and clearest composition.
- Design-challenge answer: Makes the recommendation feel like Kwilt's point of view rather than a
  promoted tile in a catalog.
- System fit: Medium-high. It uses fewer surfaces but creates a more bespoke onboarding
  composition.
- Best when: Copy alone makes the differentiated offer understandable.
- Fails when: The mechanism reads as generic budgeting because the visual relationship between
  budget and app pause is too quiet.
- Four-object/capture-first stance: Same as A; no new object or capture requirement.
- Anti-pattern check: Pass. No dashboard, urgency, or equal-weight actions.

## Alternative C: Mechanism strip

The lead region includes a small three-part visual sequence: `Budget` -> `App pauses` -> `You
choose`, followed by the same lead copy and primary action. The three secondary offers remain
visible below as compact rows.

- Persona fit: Medium-high. It explains what is unusual before asking for setup.
- Design-challenge answer: Best comprehension of the Money + Screen Time relationship.
- System fit: Medium. It introduces a new explanatory micro-diagram that would need an owned,
  accessible implementation.
- Best when: Usability testing shows that the plain sentence is not enough.
- Fails when: It starts to feel like a feature tour or makes the first screen too dense.
- Four-object/capture-first stance: Same as A; the strip explains a behavior and creates no object.
- Anti-pattern check: Pass only if the strip stays non-numeric, non-dashboard-like, and secondary
  to the plain offer.

## Divergence checkpoint

All three preserve the same visible capabilities and product truth. The next decision is whether
the differentiated mechanism needs visual explanation, or whether copy plus hierarchy is enough.
