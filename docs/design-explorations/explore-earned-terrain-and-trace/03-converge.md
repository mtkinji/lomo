# Converge: Explore earned terrain and trustworthy trace

## Qualitative score

| Alternative | Persona and job fit | Truth and trust | System fit | Blast radius | Decision |
| --- | --- | --- | --- | --- | --- |
| Park-boundary reveal | High | Low until a provider is proven | Low | High | Later |
| Adventure-earned terrain | High | Medium; intent is not landscape meaning | High | Medium | Superseded |
| Movement-class terrain | Medium | Medium | Medium | Medium | Do not choose |
| User-painted claim | Low | High | Low | High | Reject |
| Place-earned familiarity | High | High | High | Low | Choose after field review |

## Chosen alternative

**Place-earned familiarity with a bounded evidence line.** Every trusted route renders as a dependable, high-contrast trace from bounded simplified geometry. Creating a Place adds a softer circular bloom with three times the normal reveal radius. The exact route remains fully clear; the wider bloom only thins Silver Mist. Automatically discovered Apple Maps Places and Adventure classification do not earn the bloom.

## Capability delta

Today, the user cannot reliably see a long route even when fog proves that observations were recorded, and an intentional backcountry outing clears only a narrow GPS corridor.

After this release, the user can:

- see one continuous, contrast-backed path for each trusted continuous trace;
- distinguish the exact path from a wider, softer terrain reveal;
- earn the wider reveal by explicitly creating a Place;
- retain gaps where evidence is discontinuous rather than receiving a fabricated bridge.

Still intentionally unsupported:

- whole-park or legal-boundary claims;
- an acreage score or completion mechanic;
- broader reveal from passive ambient movement;
- provider-matched or inferred routes establishing territory.

## Reductive design decisions

- Enhance the existing fog and My Path layers; add no screen, mode selector, toggle, legend, badge, or onboarding step.
- Derive the bloom from existing user-created Place records rather than creating a terrain object.
- Reuse one bounded topology for fog and route rendering instead of maintaining an unbounded polyline list.
- Keep altitude color as a continuously interpolated inner stroke and add a neutral contrast casing; the casing is the reliable evidence line.
- Do not claim park awareness in product copy.

## Activation path

The behavior activates when the person uses the existing **Name current Place** action. Saving the Place immediately produces the bloom on the map. No new prompt, reward counter, setting, or explanation interrupts the outing.

## Stated bet

We're betting that a soft bloom at three times the normal radius will feel like recognition for a meaningful Place, while the contrast-backed exact trace prevents the broader reveal from reading as a false route. If the bloom feels too arbitrary or encourages Place collection for its own sake, reduce or retire it before introducing richer landscape semantics.

## Success signal

After creating a Place, the route remains visible as a continuous evidence line and the named location receives one clearly softer bloom. Routes without a created Place remain narrow, automatically discovered Places do not trigger blooms, and no evidence line crosses a session or greater-than-60-meter gap.
