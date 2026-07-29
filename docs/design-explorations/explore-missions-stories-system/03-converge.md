# Converge: Explore Missions and Stories System

## Chosen direction

Choose **Typed Object System with Invisible Media Infrastructure**, delivered first through a **Story-result Mission**.

The system is clean when every visible noun answers one question:

| Object | User question | Authoritative responsibility |
| --- | --- | --- |
| Place | Where did or could this happen? | Geographic identity and user-approved meaning |
| Mission | What am I being invited to do? | Invitation, objective, acceptance, progress, completion, result |
| To-do | When and how will I follow through? | Schedule, reminder, priority, responsible person |
| Story | What happened, and what is worth keeping? | Narrative, authorship, ordered media, audience |
| MediaAsset | How is the file stored safely? | Original, derivatives, metadata, upload state, technical owner |

`MediaAsset` is infrastructure, not a primary navigation concept. **Stories are the user-facing library.**

## Why this is better than the initial system

The original direction correctly connected Places, Missions, To-dos, media, and Stories. It became risky only where “everything links to assets” implied one generic graph and one sharing state.

The refinement adds four boundaries:

1. **Semantic links, not generic links.** A Story `happened_at` a Place; a Mission `resulted_in` a Story; a To-do `projects` an accepted Mission. Each link has a defined owner and access rule.
2. **Container-scoped access.** A private asset may appear through a shared Story without becoming globally shared through every other reference.
3. **One authoritative lifecycle.** Mission owns completion; To-do owns scheduling. Synchronization cannot create two competing status machines.
4. **Minimal Story as the default result.** One photo and one sentence are enough. Rich media and editing are progressive.

## Reductive product model

### Explore map

- Keep the Places search row fixed at the bottom.
- Use a fixed vertical **Here** pill above it: collect Place on top, recenter below.
- Use a separate persistent Mission button above the pill.
- Ordinary contextual offers appear in an inset bottom guide that covers controls temporarily; controls do not move.
- Places is an optional map layer. Story indicators ride with the Places layer initially; do not add a Stories layer before user evidence demands it.
- Fog hides unauthorized and unrevealed Places, Stories, Missions, markers, taps, search results, and accessibility elements.

### Mission destination

The persistent Mission button opens a durable inventory:

- **Active** — accepted Missions not yet completed.
- **For You** — recommendations and incoming invitations awaiting a decision.
- **Sent** — invitations Maya sent and their deliberately shared mission-level status.
- **Completed** — past Missions and their Story results.

No badge count is required unless there is a genuinely actionable incoming invitation. Avoid engagement-pressure counts.

### Acceptance and To-do projection

Sending creates an invitation, not an assignment. The recipient previews and chooses **Accept** or **Pass**.

Acceptance creates:

- the recipient’s Mission participation;
- an optional linked To-do projection if scheduling or reminders are useful; and
- no location stream or route visibility for the sender.

Mission remains authoritative for `accepted`, `in_progress`, `completed`, and result state. To-do remains authoritative for due date, reminder, priority, and responsibility. Completing the linked To-do opens or proposes Mission completion; it does not silently complete a media/story Mission. Completing the Mission resolves the linked To-do with an idempotent source receipt.

### Completion and return

The first completion contract is `story`:

1. Recipient arrives by any means; location may offer help but is not proof.
2. Recipient captures a photo, video, audio clip, or text.
3. Kwilt prepares a minimal Story using the Place and Mission context.
4. Recipient reviews title/text, Place, contributors, and exact audience.
5. Recipient completes the Mission and may share the Story back.
6. Sender sees only the mission-level state and Story content the recipient explicitly returned.

### Stories capability

Stories is the durable revisit surface:

- **Your Stories**
- **Shared with you**
- **Requests** only if Story requests become frequent enough to deserve a Stories-native view; the same requests remain Missions underneath.

Capture begins with four human choices: **Photo + sentence**, **Record audio**, **Video**, or **Write**. None requires setup unrelated to the chosen medium.

### Home and travel

- At home, Explore can surface family context: an old Story, a Place without a Story, or a request from someone trusted.
- While traveling, foreground region may scope nearby Mission candidates for the current session.
- Travel context never changes Saved Home identity, persists a route history, or selects “nearby” over a home Place without a user decision.

## Authorization model

- Personal capture is private by default.
- Friendship or Household participation alone grants no Story, Mission, Place, or asset access.
- Direct recipients and eligible Space participants receive access through explicit Story/Mission grants.
- Story author, asset technical owner, Place creator, Mission sender, and To-do responsible person are separate facts.
- Tagging or linking a person does not grant access.
- A Story audience may include direct people or one named Space; it does not expand transitively through their relationships.
- Children use capability-specific activation and age-appropriate participation rules; caregiver status alone does not create universal Story visibility.

## Media model

- Store one private original and generated derivatives.
- Strip precise EXIF location and device metadata from shared derivatives.
- Preserve original metadata privately only when needed and disclosed.
- Use short-lived signed delivery URLs.
- Uploads are offline-resumable and idempotent.
- Access is evaluated at download time through an authorized reference.
- Search indexes captions/transcripts only inside the viewer’s authorized scope.
- Analytics never include media contents, transcript text, Story text, or precise coordinates.

## Deletion model

Every destructive action names its scope:

- **Remove from this Story** deletes the relationship, not the file.
- **Delete this Story** deletes the Story and its relationships; unreferenced owned assets enter recoverable deletion.
- **Delete everywhere** is available only to an authorized asset owner and previews every reference affected.
- Revoking a share blocks future retrieval and invalidates newly requested signed URLs; clients must not promise remote erasure of already exported copies.
- Account deletion and export include owned Stories, assets, Mission participation/results, and explicit provenance.

## Accepted tradeoffs

- Explicit relationship tables add schema, but keep policies reviewable.
- The first Mission type is intentionally narrow.
- A raw asset browser is deferred even though the infrastructure supports one.
- Story collaboration starts with author/contributor and explicit audience rather than complex co-editing roles.

## Rejected tradeoffs

- No universal `visibility` field on MediaAsset.
- No generic `object_type/object_id` link table in the first release.
- No second attachment implementation copied into Stories.
- No automatic Story, Saved Place, or Space creation after repeated behavior.
- No sender-visible arrival, route, camera roll, or completion evidence before recipient review.
- No Mission streaks or social ranking.

## Stated bet

We are betting that one gentle loop—accept a place-linked invitation, capture a tiny Story, and return it deliberately—will feel more meaningful and more durable than either a map full of recommendations or a generic family media library.

We should reconsider if users want the media independently of Stories often enough to search and manage raw assets, or if Story-result Missions feel like unnecessary ceremony for ordinary Explore moments.
