# Converge: A shared-life stream with useful context

## Evaluation

Qualitative design judgments, not measured results. Improvement and system fit carry the most weight.

| Criterion | A: Stream | B: Rooms | C: Shared experiences |
| --- | --- | --- | --- |
| Ordinary moments feel welcome | Strong | Strong | Moderate; may imply an occasion |
| Easy catch-up across people and capabilities | Strong | Moderate | Moderate |
| Clear belonging and audience | Strong with visible audience | Strong | Requires careful participation rules |
| Turns interest into participation | Strong with attachments/actions | Strong within rooms | Very strong |
| Fits current Home and capabilities | Strong extension | Larger navigation change | Larger domain change |
| Can learn from a coherent real release | Strong | Strong but room setup matters | Harder to separate grouping from demand |

## Recommended direction

Choose A. Make Home a continuous, human-authored shared-life stream. Borrow household-focused browsing from B and contextual actions from C. Do not introduce an experience-grouping system yet; revisit it if people naturally post several perspectives on the same event.

This is a recommendation for review, not a user-accepted build decision.

## Experience

Home shows a composer, a compact pending-action area when needed, and posts from your household and approved connections in chronological order. "All" and "Household" are proposed views. Author history and household history make older posts retrievable; loading older history is explicit, and recent catch-up can end naturally.

A card leads with the person and audience, then their words and/or photos. A source attachment supplies useful context without dominating the story. People can respond in place or open the conversation. A contextual action appears where it has a real destination: save the shared place, open the shareable recipe, or review an invitation. Posts without attachments are complete experiences too.

## Capability delta

Today, Home receives a closed set of capability deliveries. After this concept, someone can share a spontaneous photo or an authored slice of a Kwilt moment, choose who receives it, respond without losing the context, and revisit it later. The workaround of separately screenshotting, explaining, and sending a private capability detail goes away for supported attachments.

Viewing a post still does not grant Goal membership, access to private routes, edit rights, or consent to a plan. Posting remains separate from completing an ordinary action.

## System decisions

- Home owns authored posts, post media, and post conversations. Capabilities own their records and allowed share representations. Delivery infrastructure handles arrivals and pending actions.
- A source attachment is an explicitly published snapshot with a typed reference and allowed actions. Private source edits do not silently add information to an existing post.
- A Goal cheer or reply can appear as a personal arrival in Home, referencing its original thread and audience. It is not automatically converted into an outward post. An emoji response stays aggregated; a written note remains readable. Distinct check-ins remain distinct moments; repeated delivery of one event does not create copies.
- A direct post conversation is independent from a private Goal thread. Sharing a Goal-related post to a different audience never merges the conversations or carries private replies along.
- People author posts. Following a person and following a household are new approved subscriptions; existing friendship is not silently converted. Household followers see only deliberately outward posts, with the individual author still identified.
- Post audiences are reviewed at publish. Proposed first-release rule: resolve approved audience members at publication; later followers do not automatically receive older posts. Removed/blocked relationships lose applicable access. Historical access needs explicit explanation in the profile experience.
- Posts and their owned media persist until withdrawal/deletion; they do not inherit the old delivery retention window. If source access disappears, the reader may retain the intentionally published snapshot but loses source actions. Removing the attachment or deleting the post withdraws the published representation too. A place author should see exactly which location detail is being published.
- Preserve current pending invitations, turns, and meal-choice actions. Use capability-specific presentation; the current screen helpers' Goals/Games-only labels need expansion as part of implementation.

## Improvement and activation

Sharing from Explore is offered after the source save succeeds, in the saved-place confirmation or recorded-outing recap. The composer previews exactly what will be shared. When a named place is uncertain, use a user-selected place or generic outing context rather than asserting an unverified visit.

An offer is a visible secondary action, not a modal interruption. Opening it creates a durable draft; cancel returns to the original completion state. Dismissal does not undo the activity. One successful source moment has one offer identity; reopening the recap does not repeatedly prompt. Manual sharing remains available. Proposed learning policy: at most one proactive offer per app session, with per-capability dismissal controls; tune from observation, not as a permanent product law.

Teach through the moment itself: "Share this place" or "Add a photo from dinner." A received post demonstrates the value to the next person. A recipient who saves a place or replies has participated even if they never post.

## Quality and trade-offs

Preserve richness: standalone posts, photos, contextual offers, comments, cheers, history, people, and household connections all belong in the vision. Remove repeated form entry, duplicate arrivals, surprise audience changes, and prompts that interrupt success. These are experience improvements, not a mandate to minimize features.

Accept additional social-content ownership, media lifecycle, permissions, and account-aware recovery work. Reject forcing every moment into a Goal, automatically extracting private activity, and postponing direct posting until after a capability-only feed has already defined the product.

## Bet and success signal

We are betting that spontaneous posts plus contextual offers help people feel included and give them useful ways to participate. If usage becomes primarily a log of completions, revisit prompts and card composition. If household connection is diluted, revisit the default view or room model. Success is reciprocal connection and shared action, not maximum scroll time or posting volume.
