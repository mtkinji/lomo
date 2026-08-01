# Converge: Explore earned terrain and trustworthy trace

## Qualitative score

| Alternative | Persona and job fit | Truth and trust | System fit | Blast radius | Decision |
| --- | --- | --- | --- | --- | --- |
| Park-boundary reveal | High | Low until a provider is proven | Low | High | Later |
| Adventure-earned terrain | High | High with distinct treatment | High | Medium | Choose |
| Movement-class terrain | Medium | Medium | Medium | Medium | Do not choose |
| User-painted claim | Low | High | Low | High | Reject |

## Chosen alternative

**Adventure-earned terrain with a bounded evidence line.** A deliberate Adventure renders one dependable, high-contrast trace from bounded simplified geometry. The same recorded evidence earns a 120-meter softer terrain corridor that thins Silver Mist but does not become fully clear. Automatic ambient recording retains the current narrow reveal.

## Capability delta

Today, the user cannot reliably see a long route even when fog proves that observations were recorded, and an intentional backcountry outing clears only a narrow GPS corridor.

After this release, the user can:

- see one continuous, contrast-backed path for each trusted continuous trace;
- distinguish the exact path from a wider, softer terrain reveal;
- earn the wider reveal by explicitly starting an Adventure;
- retain gaps where evidence is discontinuous rather than receiving a fabricated bridge.

Still intentionally unsupported:

- whole-park or legal-boundary claims;
- an acreage score or completion mechanic;
- broader reveal from passive ambient movement;
- provider-matched or inferred routes establishing territory.

## Reductive design decisions

- Enhance the existing fog and My Path layers; add no screen, mode selector, toggle, legend, badge, or onboarding step.
- Persist recording intent on the existing session rather than creating a new terrain object.
- Reuse one bounded topology for fog and route rendering instead of maintaining an unbounded polyline list.
- Keep altitude color as a bounded inner stroke and add a neutral contrast casing; the casing is the reliable evidence line.
- Do not claim park awareness in product copy.

## Activation path

The behavior activates when the person uses the existing **Start Exploring** action, which already creates an `adventure` session. It is learned organically on the map: the exact line remains visually crisp while nearby terrain becomes visibly lighter. No promotional education interrupts the hike.

## Stated bet

We're betting that a soft 120-meter Adventure corridor will feel like earned landscape while the contrast-backed exact trace prevents the broader reveal from reading as a false route. If the soft corridor feels too arbitrary or too literal, revisit its radius/treatment before introducing park-boundary data.

## Success signal

On a long deliberate hike, the route remains visible as a continuous evidence line, nearby terrain reads as broadly explored, ambient travel remains narrowly revealed, and neither layer crosses a session or greater-than-60-meter evidence gap.
