# Converge: Shared Phases With Ordered Cues

## Chosen alternative

Treat every existing instruction as a phase. A phase may carry explicit ordered cues; when none exist, it behaves as one legacy cue. The starter catalog compiler creates stable cues from its already authored and reviewed sentence boundaries. Recipe Home and Cook Mode use the same normalized phase projection.

## Capability delta

Today, one displayed and spoken “step” can contain several unrelated actions. After this change, Maya can scan the actions together on Recipe Home and advance through them individually in Cook Mode without losing their shared phase.

Still unsupported: automatic semantic titles, AI-authored boundaries, and editing cues independently.

## Reductive decisions

- No new card surface, mode selector, legend, setting, or onboarding.
- No 2a/2b chrome on Recipe Home; line grouping carries the relationship.
- Cook Mode adds only compact phase/action context around the existing dominant cue.
- Meaningful authored phase labels remain; generic “Cook” stays hidden.

## Bet

We're betting that phase grouping preserves recipe comprehension while atomic Cook Mode cues reduce rereading. If the detail list feels fragmented or Cook Mode progress feels more complex, revisit the line treatment and progress copy before changing the underlying structure.

