# Learning release: Real moments between real people

## Concept to build

A person can post an ordinary photo or thought, share an Explore discovery, receive a Goal encouragement note, and respond to their people's moments in one durable Home.

## Capability delta

Today the receiving surface cannot supply this complete social loop. This release should make direct authorship, contextual sharing, actual delivery, meaningful responses, and later retrieval real. It should preserve existing invitations, Game turns, and meal-choice arrivals.

The complete direction includes people and household following. Begin household and selected-person validation first, then exercise following with a second household before declaring the broader concept validated. This sequence exposes permission dependencies; it does not remove following from the intended product.

## User experience

Maya finishes saving a place in Explore and sees "Share this place." She adds a photo and a sentence to a prepared preview, sees "Household," and publishes. Her spouse sees the post in Home, replies, and saves the shared place without receiving Maya's route history. Another day, the spouse posts a funny photo directly in Home. A Goal supporter writes an encouraging note; Maya receives it in her personal Home with its original audience and thread intact. A week later they can find both the post and the note.

In the next validation wave, a person in another household requests to follow Maya's household. An authorized adult approves. Maya deliberately shares an outward post. The follower receives it; the household's internal posts remain absent. Removal revokes the follower's applicable access.

## Buildable slice

Must be real in the first usable bundle:

- Home composition with text and photos, visible audience, preview, durable drafts, upload progress, failure recovery, and idempotent publishing.
- Durable posts, chronological pagination/history, account-scoped cached content, edit/delete, and retrieval by author or household.
- Household and selected-person delivery with explicit access enforcement, withdrawal, block/report integration, and consistent media access.
- In-feed reactions and a post conversation, with clear attribution and accessible image descriptions.
- Explore place/outing composition entry point after successful save, using a source-approved snapshot and a genuine save-place destination.
- Goal encouragement/check-in arrivals that open the existing Goal conversation, keep its audience, and avoid duplicate response systems.
- Pending-action continuity, truthful unavailable states, text-only posts, slow/offline draft recovery, and account switching.

Must be real before the connected-households wave:

- Requests, approvals, removal, person and household identities, outward audience selection, historical visibility explanation, and two-household verification.

Next capability adapters after the first loop works: recipes/meals, Games summaries and invitations, project/activity sharing, and Plan participation. For Meals, a scheduled recipe is not evidence it was cooked; use an actual user-confirmed moment. For Games, a result post never exposes private room credentials. For Plan, interest must be confirmed before creating anyone else's commitment.

Can be thin: deterministic previews, modest photo count (proposed limit four), manual recruitment/feedback, basic chronological history. No AI caption generation is needed to learn whether the experience works.

Intentionally excluded from this learning release: public discovery, automated route publication, automatic tagging of other people, cross-audience copying of private replies, algorithmic ranking, and automated memory summaries. Money and Screen Time offers need separate product decisions because routine activity there does not establish willingness to share it.

## Existing product relationship

Enhance the existing SharedHome route, shell, relationship selection, identity, reporting, and source navigation. Add Home-owned social records; retain source-owned capability records and actionable deliveries. Do not bulk-convert existing deliveries into posts. Existing source Goal threads remain authoritative.

## Release channel

First a local build with controlled permanent test accounts; then invitation-only TestFlight with adults in two households and at least one Goal supporter. Treat child accounts and shared-device profiles as a required separate participation design before enabling them: neither household membership nor an active device profile establishes publishing identity or outward-sharing authority.

The first adult cohort can validate adult household connection, not whole-family or child participation. This limitation must remain explicit.

## Brand-goodwill guardrails and reversibility

Present a complete posting/reading/responding experience to invited testers. Do not display enabled-looking following controls before the connected-households wave works. Photos and words never appear published while still only queued. Failure preserves the draft.

Gate composition, adapters, and following separately. Rollback can stop new publishing/offers while retaining read/delete/export access to already-authored posts. Do not erase user memories on rollback. Delivery cleanup cannot delete post content. Source actions recheck current access, and revoked users must not recover content from stale account caches or media links.

## Permanent product threshold

Advance when households naturally share and respond, audience understanding is reliable, source-to-post-to-participation works, and lifecycle verification passes. Wider following requires the second-household evidence; child use requires its own completed authority and runtime checks.
