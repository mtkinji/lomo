# Pattern extraction: Airbnb mobile listing detail

## Observed job and reading model

The surface helps a guest decide whether a place is credible and suitable,
understand increasingly detailed evidence, and retain access to the booking
decision throughout a long scroll.

- Three-second read: identify the place, its strongest proof, price context,
  and the action that advances the decision.
- Scan order: identity and media -> decision-critical summary -> proof and
  practical details -> deeper supporting sections.
- Surface depth: primarily a flat canvas; cards are reserved for meaningful
  identity or decision boundaries.
- Color role: one brand-colored decision action; most hierarchy is carried by
  type, placement, spacing, imagery, and neutral surfaces.

## Preserve / Translate / Reject

| Pattern | Preserve | Translate for Kwilt | Reject |
| --- | --- | --- | --- |
| Narrative object detail | Identity-first pacing and progressively deeper evidence. | Use the object's Kwilt job, vocabulary, `ObjectPageHeader`, and domain sections. | Reproducing the exact listing order or Airbnb's rounded media-to-sheet silhouette. |
| Iconographic facts list | One recognizable semantic icon aligned with one concise fact. | Use Kwilt's licensed icon source, optical sizing, tokens, Dynamic Type, and absent/disabled semantics. | Tracing Airbnb glyphs, mixing decorative emojis into system facts, or adding icons without immediate meaning. |
| Compact evidence summary | Compress decision-relevant proof into a few comparable signals. | Choose only signals the Kwilt user actually needs and state their provenance. | Decorative scores, badges, or social proof that Kwilt cannot truthfully substantiate. |
| Progressive reveal | Show representative content, then offer a specific show-all action. | Use when hidden detail is optional after orientation and the count/state is truthful. | Hiding information required for the current decision or using “Show more” to repair weak hierarchy. |
| Horizontal evidence rail | Keep supporting peer items browsable without dominating the vertical read. | Use only when items are independently understandable, accessibility order is clear, and partial-next-item affordance is intentional. | Carousels for required sequential content or clipped cards that conceal essential meaning. |
| Persistent decision region | Keep decision context and one next action available across a long surface. | Rebuild through a Kwilt dock/footer pattern with safe-area, keyboard, tab-bar, scrolling, and accessibility proof. | Adding persistence because the reference has it, stacking it over existing navigation, or repeating a primary action already visible nearby. |
| Person/contributor summary | Treat identity and trust as a real object boundary. | Use truthful Kwilt relationship, authorship, or provenance fields and a flat fallback when the data is sparse. | Copying the host-card composition, reputation language, verification badge, shadow, or metric layout. |
| Section pacing | Use generous whitespace and restrained separators to make a long page legible. | Derive rhythm from Kwilt spacing and type tokens and test real content lengths. | Measuring screenshot pixels and turning them into new raw spacing values. |

## Iconography observations

- Icons are functional nouns, not decoration.
- A consistent visual family and optical weight makes heterogeneous facts read
  as one list.
- Text remains the authoritative label; the icon accelerates scanning.
- Unavailable content uses more than color alone.
- Large identity or status marks are exceptional emphasis, not the default icon
  scale.

Kwilt must use its approved icon sources and semantic icon mapping. A useful
Airbnb semantic does not authorize copying Airbnb's drawing.

## Candidate Kwilt applications

The evidence may inform, but does not pre-approve:

- Recipe, Goal, Arc, Activity, and Money object-detail pacing;
- recipe facts, activity metadata, and other compact fact lists;
- truthful provenance or contributor summaries;
- reviewable evidence rails where peer items are optional supporting material;
- long-form decision surfaces that genuinely need one persistent action.

Each application still writes its own job, three-second read, behavior sources,
and exclusions. If the Airbnb reference disappeared, the result must remain
recognizably Kwilt and fully justified by the local product contract.
