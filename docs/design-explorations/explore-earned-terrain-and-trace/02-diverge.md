# Diverge: Explore earned terrain and trustworthy trace

Axis of variation: how broadly terrain is earned — semantic boundary, recording intent, or movement-derived corridor.

## Alternative E: Place-earned familiarity

Creating a Place is an explicit statement that the person did more than pass through: this area is worth remembering. Keep the exact route narrow and fully clear, then thin Silver Mist in a larger bloom around only user-created Places. Automatically discovered map Places do not earn the bloom.

- Persona fit: strong; meaning comes from a calm existing action rather than classification or setup.
- Design challenge: recognizes experienced landscape without guessing whether an outing was a hike.
- System fit: extends the existing Place relationship and native fog layers with one bounded coordinate set.
- Best when: the person names a campsite, overlook, trail destination, neighborhood spot, or other meaningful location.
- Fails when: the person never creates Places; their normal route still remains truthfully and narrowly revealed.
- Four-object/capture stance: an Explore projection activated by an existing Place action.
- Anti-pattern check: pass if it remains a visual acknowledgment rather than points, acreage, or collection pressure.

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
