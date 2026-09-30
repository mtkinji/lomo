# Frame: explore-recovered-path

## What the user said
> Restore/fix the path that never became visible.

## Restated in user voice
When I deliberately record an outing, I need Kwilt to preserve the evidence it actually captured so one failed start does not erase the memory or make the map untrustworthy.

## Target audience
`audience-aspirational-family-organizers`: people who want family life to accumulate meaning without managing another system.

## Representative persona
Maya wants ordinary outings to remain recognizable and private. A missing path feels like lost history; an invented path would feel worse.

## Hero anchor
`jtbd-move-the-few-things-that-matter`

## Job flow step
`job-flow-maya-move-family-life-forward`, “Keep using the system,” delivery 3/5. A failed recording undermines the trust required for continued use.

## Active anchors
- `jtbd-capture-and-find-meaning` — retain the outing that actually happened.
- `jtbd-trust-this-app-with-my-life` — distinguish observation, recovery, and missing evidence.

## Friction we're addressing
The failed deliberate recording contains one point, while the automatic recorder captured sparse owner-only observations immediately afterward. Existing trust rules correctly refuse to display those samples as a normal dense recording.

## System alignment
Constraint posture: `Extend the system`

Current system facts:
- Existing surface: Explore map and recap review.
- Existing flow: deliberate paths are altitude-colored; automatic samples clear territory only.
- Existing model: owner-synced `ExploreSession` records retain raw points.
- Existing affordance: path geometry already splits on untrusted gaps.
- Existing convention: inferred geometry never overwrites observed evidence.

Constraints to preserve:
- No interpolation or road matching presented as observation.
- Automatic sessions do not become ordinary recorded paths.
- Long outages remain visible gaps.

Design implication: mark this exceptional session as recovered evidence, but keep one visual path language; physical gaps and recap disclosure carry the uncertainty without changing normal recording semantics.

## Aspirational design challenge
How might we help Maya recover a recognizable failed outing while preserving a legible boundary between observed, recovered, and missing location evidence?

## Out of scope
General automatic path creation, inferred roads, family sharing, and recovery of unrelated sessions.

## Open question
Whether recovered paths should later receive a dedicated history label beyond recap disclosure.
