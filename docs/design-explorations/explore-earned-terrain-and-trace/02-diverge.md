# Diverge: Explore earned terrain and trustworthy trace

Axis of variation: how broadly terrain is earned — semantic boundary, recording intent, or movement-derived corridor.

## Alternative A: Park-boundary reveal

Resolve the current location to a protected-area polygon and reveal that whole polygon after sufficient observed presence. This most directly matches the mental model of "I explored this park," but Kwilt has no trustworthy boundary provider today and a false match would overclaim dramatically.

- Persona fit: emotionally strong for Maya and her family.
- Design challenge: answers landscape recognition directly.
- System fit: bends the system with a new provider, cache, attribution, privacy, and confidence model.
- Best when: authoritative offline or privacy-reviewed boundaries exist.
- Fails when: a park is huge, loosely entered, misclassified, or only driven past.
- Four-object/capture stance: an Explore projection; capture remains unblocked.
- Anti-pattern check: pass only with conservative confidence; reject for this release.

## Alternative B: Adventure-earned terrain

A deliberate Adventure retains the exact observed route and also thins Silver Mist across a substantially wider corridor. The broad reveal is deliberately softer than the fully clear path, communicating experienced terrain rather than precise presence.

- Persona fit: strong; intentional family outings feel recognized with no extra setup.
- Design challenge: balances generosity and truth.
- System fit: extends existing session policy and native fog geometry; no new surface.
- Best when: the user explicitly started an outing, especially a hike, ride, or park visit.
- Fails when: every deliberate urban walk is expected to have literal park semantics.
- Four-object/capture stance: an Explore projection; capture remains unblocked.
- Anti-pattern check: pass.

## Alternative C: Movement-class terrain

Pedestrian or cycling movement automatically receives a wider reveal, while vehicle travel retains the narrow corridor. This adapts without user action, but movement class does not establish that the person is in meaningful backcountry terrain and could make ordinary errands appear specially earned.

- Persona fit: moderate; effortless but harder to explain.
- Design challenge: answers physical effort more than landscape experience.
- System fit: fits existing adaptive tracking, but movement is not retained as a stable session-level semantic.
- Best when: the product wants effort-sensitive reveal everywhere.
- Fails when: GPS classifies movement incorrectly or the place context matters more than speed.
- Four-object/capture stance: an Explore projection; capture remains unblocked.
- Anti-pattern check: pass if it never becomes an effort score.

## Alternative D: User-painted claim

After an outing, the person manually expands or paints the terrain they feel they explored. It is explicit and reversible, but turns the meaningful moment into map administration and makes every person's scale inconsistent.

- Persona fit: weak; too fussy for Maya.
- Design challenge: honest but burdensome.
- System fit: requires editing UI, persistence, and conflict semantics.
- Best when: precise personal cartography is the job.
- Fails when: the person just wants the map to remember the hike.
- Four-object/capture stance: post-capture editing; capture remains unblocked.
- Anti-pattern check: fails the calm, non-admin bar; reject.
