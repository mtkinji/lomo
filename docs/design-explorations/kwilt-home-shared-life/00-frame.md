# Frame: Kwilt Home as shared life

Date: 2026-09-08. Status: design proposal for Andrew's review, not accepted implementation scope.

## What Andrew said

Home should hold encouragement, discoveries, ordinary life, progress, invitations, and things worth passing along, for a household and other people or households someone follows. Ordinary actions in other capabilities can receive offers to post at key moments. Run the design-thinking loop with emphasis on improvement and system fit rather than reduction.

## Restated in user voice

When something happens in my day, help me let my people into it. When they share something, help me feel included, respond meaningfully, and sometimes turn it into something we do together.

## Target audience and persona

Primary: `audience-aspirational-family-organizers`, represented by Maya. Here Maya wants family participation and connection, including ordinary moments that have no task or achievement attached. She should not have to become the household's content coordinator.

Secondary: `audience-private-accountability-seekers`, represented by David. He wants encouragement from selected people. His participation must remain possible without posting to a broader audience or adopting a social habit.

## Hero anchor and job-flow assessment

The current Maya taxonomy uses `jtbd-move-the-few-things-that-matter` as its hero. The matching [job flow](../../job-flows/maya-move-family-life-forward.md) documents family participation at 3/5 and continued use at 3/5. Existing offerings include Goal support, Games, and the Home receiving surface. The gap is sustained, voluntary participation across ordinary family life, beyond invitations and capability events. These are documented scores, not a fresh runtime assessment; this design does not change them.

Strongest existing matches:

- `jtbd-invite-the-right-people-in`: choose which people see which slice of life.
- `jtbd-help-us-enjoy-being-together`: shared discoveries and invitations create reasons to spend time together; its current body is specifically about Games, so this is a partial match.
- `jtbd-trust-this-app-with-my-life`: predictable audience and ownership, reliable posting and withdrawal.

`serves: [jtbd-move-the-few-things-that-matter, jtbd-invite-the-right-people-in, jtbd-help-us-enjoy-being-together, jtbd-trust-this-app-with-my-life]`

Taxonomy tension: David's persona and the sharing JTBD explicitly resist feed-style social. Respect that preference for David; do not treat it as a prohibition on Andrew's requested experience for everyone. The stronger new demand is "Help me stay part of my people's everyday lives." This is a candidate anchor, not an existing validated node. Proposed future flow: notice a moment → share it → catch up → respond → participate → revisit. Do not force ordinary photos under productivity or declare the taxonomy updated without review.

## System alignment

Posture: **Extend the system**, with deliberate changes to the old Home contract.

Source inspection: normal checkout `/Users/andrewwatanabe/Kwilt`, branch `main`, HEAD `9db7bd690f63936641588a61e974d0d6f07db8b3`, initially clean. Read-only source evidence; no build, Simulator, device, backend, or release verification was performed.

| Current evidence | Design implication |
| --- | --- |
| `src/features/shared-home/SharedHomeScreen.tsx` renders sender-led delivery cards, Needs you, and Shared with you. | Evolve the existing Home route and shell into rich authored moments; preserve actionable arrivals. |
| `sharedHomeTypes.ts` recognizes Goal invitations/check-ins, Game turns, and meal-choice rounds. | Not every capability event is a post. Keep action state distinct from authored content. |
| `sharedHomeRepository.ts` filters by recipient and retention, caps queries at 100; cache is account-scoped. | Durable posts need their own lifecycle and pagination. Reuse delivery and cache patterns, not expiring delivery rows as the post record. |
| Accepted `shared-home.md` forbids a generic composer and specifies a finite 30-day receiving model. | Direct posting, revisitable history, and Home-owned post content intentionally revise those constraints. The new draft does not silently overwrite the accepted brief. |
| `services/friendships.ts` has mutual friendships; household data has owner/caregiver/child roles. | Reuse identity and relationship selection. Following people or households is a new permission relationship, not a rename of friendship. |
| `services/reactions.ts` and `checkinReplies.ts` are Goal-context interactions. | Preserve the original audience/thread for Goal encouragement; post conversations need a separate audience-aware contract. |
| Explore has recorded-path recap and source-owned domain types. | Invite sharing after a saved moment; shared place detail must not grant access to private travel history. |
| Shared Home already has a report affordance; navigation retains `SharedHome` and typed links. | Extend existing interaction, safety, and navigation conventions instead of creating a second social destination. |

Sources above are repository-relative. The iOS Home Screen launcher brief concerns widgets, not this in-app Home.

Preserve: AppShell/canvas, explicit human authorship, capture before sharing, source authority, permanent account identity, bounded notifications, account isolation, contextual interactions.

Change intentionally: direct composition in Home, durable authored posts, in-feed responses, shared history, approved following, and rich previews that can be understood without source access.

## Aspirational design challenge

How might we help Maya and her people feel included in one another's everyday lives and turn shared moments into connection and participation, while preserving each person's voice and control over what they share?

## Scope and assumptions

Run through design artifacts and a draft brief in this turn; implementation and release are later work. Working recommendation: one combined Home stream with an optional household view. Andrew affirmed the moments and contextual offers; detailed follow semantics, child participation, and feed organization remain proposals. Improvement leads evaluation; simplicity is a usability quality, not a scope objective.
