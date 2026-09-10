---
id: brief-kwilt-home-shared-life
title: Kwilt Home — Shared Life
status: accepted
audiences: [audience-aspirational-family-organizers, audience-private-accountability-seekers]
personas: [Maya, David]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-move-the-few-things-that-matter, jtbd-invite-the-right-people-in, jtbd-help-us-enjoy-being-together, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-shared-home]
owner: andrew
last_updated: 2026-09-08
---

# Kwilt Home — Shared Life

## Implementation state — 2026-09-08

Andrew authorized implementation after the design loop. The first learning slice now has source for direct text/photo posts, chosen audiences, approved person/household follows, replies and cheers, history, saved places, Explore share offers, and Goal encouragement arrivals. It is gated by `shared-life-v1` in release builds and available in development. Existing Home remains the release fallback.

The Home migrations and account-delete storage update are deployed to Kwilt Supabase with Andrew's approval. Isolated PostgreSQL scenarios, Jest checks, and dedicated live multi-account posting/Storage tests pass. The installed Simulator build loads Home and its composer; text entry, audience selection, draft restoration, and discard were verified. Native photo selection, published conversations, large text, and signed-device proof remain release acceptance gates. See the [implementation plan and evidence](../superpowers/plans/2026-09-08-kwilt-home-shared-life.md). Broader capability adapters remain subsequent slices.

## Context

Andrew envisions Home as a place for encouragement, discoveries, everyday life, progress, invitations, and things worth passing along, across households and followed connections. People can post directly or accept an offer to share at a natural moment in another capability. The existing receiving surface supplies a useful base but not this complete experience.

## Target audience

Aspirational family organizers are primary; chosen supporters are secondary. Connection should be possible without making one person manage everyone else's participation.

## Representative persona

Maya wants to know about the ordinary moments in her people's lives, share some of her own, and find reasons to do things together. David wants a narrower support context with no expectation of broader posting.

## Aspirational design challenge

How might we help Maya and her people feel included in one another's everyday lives and turn shared moments into connection and participation, while preserving each person's voice and control over what they share?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` is the current audience hero and manifest alignment. This concept primarily develops family participation. It also reveals a candidate everyday-connection anchor; ordinary stories must not be presented as productivity merely to fit the existing taxonomy.

## Job flow step

[Maya's family-life flow](../job-flows/maya-move-family-life-forward.md), family participation and continued use, are both documented at 3/5. Home currently receives capability content; it lacks a coherent direct-posting and everyday social loop. Scores remain unchanged until shipped evidence supports a revision.

## JTBD framing

When something happens in my day, help me let my people into it; when they share, help me respond and participate. Chosen audiences serve `jtbd-invite-the-right-people-in`, joint activities partly serve `jtbd-help-us-enjoy-being-together`, and reliable, bounded sharing serves `jtbd-trust-this-app-with-my-life`.

## Design

Recommend one chronological stream with direct composition, optional household view, sender-led text/photo posts, in-place responses, contextual attachments/actions, and revisitable history. Keep pending invitations and turns recognizable. Use existing SharedHome navigation and AppShell conventions.

Home owns authored posts and their conversations. Capabilities own underlying records and approved share snapshots. Arrival records are projections, not the durable post store. Sharing a snapshot does not share the entire source object. Goal support arrivals retain their original thread and audience; private cheers never become outward posts automatically.

Posting from another capability occurs only after the original action succeeds. A full-screen celebration offers Share this moment or Continue; Share opens the same composer with a preview and audience. People may edit, remove attachments, add photos, save a draft, cancel, or publish. Use one offer identity per source moment and keep manual sharing available. A new goal completion is never suppressed by an earlier capability offer. Do not infer cooking from meal planning or a named place visit from uncertain location evidence.

People remain the authors of household posts. Propose approved following for people and households, distinct from friendship and membership. Internal household posts and outward posts have different explicit audiences. Proposed initial audience rule: resolve recipients at publish, do not automatically expose old posts to future followers, and revoke applicable access when relationships are removed or blocked.

Posts persist until withdrawn/deleted. Source edits cannot silently broaden a published snapshot. Lost source access disables source actions; published snapshot withdrawal is a post/attachment operation. Media and cache access must match current post authorization.

Full decision detail: [convergence](../design-explorations/kwilt-home-shared-life/03-converge.md). Alternatives: [divergence](../design-explorations/kwilt-home-shared-life/02-diverge.md).

## Improvement and system fit

Preserve the richness of the proposed experience. Focus simplification on repeated entry, confusing permissions, duplicate cards, and interruptions. Explicitly revise the old generic-composer prohibition and expiring-content assumption if this brief is accepted. Do not silently replace the accepted [Shared Home brief](shared-home.md) before review.

## Learning release

Build the complete loop of direct text/photo posting, Explore sharing, Goal support arrivals, responses, durable history, and household/selected-person delivery. Validate adults in a local build then invited TestFlight. Add approved person/household following in a second connected-household wave. Recipes, Games summaries, project/activity offers, and Plan participation follow on the same contract. They remain part of the direction, not deleted scope.

The initial cohort excludes child publishing until identity and caregiver authority are designed and proven. Rollback must retain access to authored memories. Full scope and release controls: [learning release](../design-explorations/kwilt-home-shared-life/04-learning-release.md).

## Success signal

People voluntarily share ordinary moments and respond across multiple days, can explain the audience, revisit something meaningful, and sometimes act on a shared discovery. Neither posting volume nor scroll time is the objective. Validate external household value separately. See [learning evaluation](../design-explorations/kwilt-home-shared-life/05-evaluate-learning.md).

## Acceptance criteria for implementation

- Direct and contextual posting share one coherent preview/draft/publish flow; original capability actions succeed independently.
- Authorized people can read/respond/revisit; unauthorized and revoked accounts cannot recover content or media.
- Publish retries create one post; failed uploads preserve drafts and never claim a completed post.
- Source attachments reveal only reviewed content and route to actions the recipient may actually take.
- Goal support arrivals retain source conversation authority; same-event duplicates are suppressed without hiding distinct authored moments.
- Existing invitations, Game turns, and meal-choice actions still work with correct labels and state.
- Historical access, edit/delete, unavailable sources, following changes, and account switching behave according to the reviewed contract.
- Focused logic/permission regression coverage, completion checks, and multi-account native verification precede release claims.

## Spec refinement

Confirmed by Andrew: all six moment families, people/household social direction, and ordinary capability actions receiving offers at key moments. Improvement and system fit should guide the loop.

Adopted implementation defaults under Andrew's build instruction: combined stream plus household view; approved following; publication-time historical visibility; adult-only first cohort; four-photo initial limit; a consistent full-screen offer at each selected meaningful source moment. These remain design bets to evaluate. Following is implemented behind the same release gate so the later connected-household cohort can exercise it.

The implementation plan specifies the audience, draft, publication, media, and compatibility contract. Source implementation and isolated checks are complete; deployment and live/native acceptance remain open as recorded above.

## Questions for the learning cohort

1. Should newly approved followers see selected older outward posts, or only posts published after approval as proposed?
2. Should the default opening view be combined Home or household-first?
3. What should children be able to author, see, and share outward, and which actions require caregiver involvement?

## Design record

[Frame](../design-explorations/kwilt-home-shared-life/00-frame.md) · [Yes-and](../design-explorations/kwilt-home-shared-life/01-yes-and.md) · [Alternatives](../design-explorations/kwilt-home-shared-life/02-diverge.md) · [Recommendation](../design-explorations/kwilt-home-shared-life/03-converge.md) · [Learning release](../design-explorations/kwilt-home-shared-life/04-learning-release.md) · [Evaluation](../design-explorations/kwilt-home-shared-life/05-evaluate-learning.md).


## Shared celebration offers — September 9 follow-up

Andrew identified the participation gap: if the offer does not appear when a goal finishes, people are unlikely to post later. The shared pattern serves Maya's everyday connection and David's chosen support without requiring a separate trip to Home. We considered a toast (easy to miss), another drawer after celebration (two interruptions), and extending the existing full-screen celebration. The third approach preserves one moment of recognition and one explicit choice, while reusing Kwilt's celebration host.

Goal completion and a newly saved Explore place now use the same Share this moment / Continue layout. The display is manual-dismiss, and no global once-per-session quota consumes another capability's milestone. Turning celebration media off shows the text/action version. Share closes the interstitial before opening the composer. Continue publishes nothing. The source operation is already complete. A completed-goal attachment contains only a reviewed title snapshot; no Goal ID, private notes, or Goal permissions move into the post. The chosen Home audience governs the new story. Existing Goal progress signals and check-in drafts are retained; a second automatic check-in popup does not compete with the new offer.

The initial adapters use `offerHomeMoment`; future capabilities supply the same moment snapshot and source-event identity rather than inventing their own prompt. The bet is that recognizing an actual moment makes participation timely while leaving the decision to post explicit. Measure acceptance and voluntary dismissal per source event, with goal completion unaffected by either choice. Live Goal attachment validation is deployed; native visual acceptance remains blocked by the locked Mac.

## Automatic household chore updates — accepted September 9

Chore completion produces a factual household update without asking the completer to post. This deliberately extends the authored-only rule: personal moments still invite sharing, while a household contribution may be projected automatically for its existing household. Children are credited by household membership; these updates do not impersonate the caregiver or grant a child access to the adult personal feed.

Home combines up to twelve completions by the same member within thirty minutes, shows pending approval honestly, and provides Thanks, comments, and expandable chore titles. Approval retains the same conversation; reopening, return for another pass, deletion, or a rejected earlier-day report removes the affected item. Chores remains authoritative. Household recipients are snapshotted for the update and reauthorized on read; no follower sharing or historical backfill. Proof photos, review notes, and rewards remain in Chores. No posting prompt or push notification is added.

See [implementation and acceptance](../superpowers/plans/2026-09-09-home-chore-updates.md). Broader automatic capability updates remain a separate product decision.
