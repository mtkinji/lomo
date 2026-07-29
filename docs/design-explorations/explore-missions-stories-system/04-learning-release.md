# Learning Release: A Story-Result Mission

## Learning goal

Test whether one accepted, place-linked invitation can move through Explore, To-dos, capture, Stories, and private return without making the system feel like task administration, surveillance, or media management.

## User promise

> Invite someone to explore one Place and bring back a small Story.

## Real end-to-end scenario

Maya sends Olive a Mission: **Photograph something surprising at the neighborhood park and tell me why you chose it.**

1. Maya creates the Mission from a Place sheet or Missions.
2. She selects Olive and previews exactly what the invitation contains.
3. Olive sees it in **For You** and chooses **Accept** or **Pass**.
4. Accepting creates Olive’s Active Mission and a linked To-do with an optional date/reminder.
5. At the park, Explore may surface the Mission from the authorized Place; it does not report Olive’s arrival.
6. Olive captures one photo and one sentence.
7. Kwilt prepares a private Story linked to the Place and Mission.
8. Olive reviews the Story and chooses **Complete & send back** or **Keep private**.
9. Maya can open the returned Story from the sent Mission. Olive can revisit it in Stories.

## Must be real

### Product

- Persistent Mission launcher and durable Mission inventory.
- Incoming invitation preview with Accept/Pass.
- One Place per Mission.
- One completion kind: `story`.
- Minimal Story: title or sentence plus at least one photo; text-only remains supported for accessibility and denied-photo cases.
- Linked To-do created only after acceptance.
- Story audience review before return.
- Completed Mission opens the same canonical Story from Missions, Stories, and the Place sheet.
- Places layer can be turned off without hiding the Mission inventory or Stories library.
- Fog reveals no unauthorized Place or Story indicator.

### Platform

- Canonical private `media_assets` storage model with derivative delivery.
- Explicit `story_assets`, `story_places`, `mission_story_results`, and `mission_activity_links` relationships.
- Server-authorized Mission invitation, acceptance, completion, sharing, revocation, and deletion mutations.
- Short-lived signed asset delivery through authorized Story or owner reference.
- Offline-resumable upload and idempotent completion.
- Reference-aware deletion and account export coverage.
- Negative authorization tests for non-recipient, passed, revoked, removed, and unrelated-Household users.

## Can be thin

- Mission templates are a small curated list plus custom text.
- Place selection uses existing Saved Place or map search; no multi-stop route.
- Story editing supports reorder, caption, and removal without rich layouts.
- Sent status is limited to `invited`, `accepted`, `completed`, `passed`, or `expired`.
- Shared derivative generation may initially support JPEG image output while video/audio use original-compatible protected delivery, provided metadata and access behavior are honest.
- Stories library may begin with one chronological inventory and simple owner/shared filters.

## Intentionally excluded

- Nearby algorithmic Mission recommendations.
- Scavenger hunts, multi-stop Missions, badges, streaks, scoring, or leaderboards.
- Live co-editing.
- Raw media library UI.
- Automatic Place creation from asset coordinates.
- Automatic completion from GPS, geofence, upload, or To-do state.
- Broad Household or Friends visibility.
- AI-generated Story facts, faces, or family relationships.
- Public links or web viewers.

## State contracts

### Mission

```text
draft → invited → accepted → in_progress → completed
                  ↘ passed
         ↘ expired / revoked
```

- Only recipient acceptance creates recipient work.
- Completion requires a valid result satisfying the Mission contract.
- Revocation before acceptance ends the invitation.
- After acceptance, sender cancellation stops the shared agreement but does not delete recipient-authored Story or assets.

### Story

```text
draft → saved → shared
          ↘ deleted
```

- Upload failure does not falsely mark the Story saved remotely.
- A locally durable draft remains recoverable while upload retries.
- Sharing is an explicit operation after or during save; save does not imply sharing.

### Linked To-do

```text
Mission accepted → To-do created
Mission completed → To-do completed with source receipt
To-do checked first → open Mission completion; no silent Mission completion
Mission cancelled → To-do cancelled or unlinked with explanatory receipt
```

## Instrumentation boundary

Allowed event facts:

`mission_invited`, `mission_previewed`, `mission_accepted`, `mission_passed`, `mission_todo_created`, `story_draft_started`, `story_saved`, `mission_completed`, `story_share_confirmed`, `story_opened_from_mission`, `story_opened_from_place`, `share_revoked`.

Allowed dimensions are coarse completion kind, entry surface, asset-kind count, direct-person versus Space audience, and error class.

Never collect Mission text, Story text, transcript text, filenames, media content, exact coordinates, Place names, recipient names, or relationship labels in analytics.

## Safety and trust proof

Before expansion:

- A sender cannot infer arrival, route, current location, capture time, or discarded media.
- A non-recipient cannot enumerate the invitation.
- A passed or revoked recipient loses invitation retrieval.
- A returned Story exposes only reviewed Story fields and derivatives.
- Removing an asset from one Story does not break another authorized reference.
- Deleting everywhere previews and removes every owned reference.
- A child cannot widen Story audience beyond capability policy.
- Disabling the Places layer or enabling fog does not alter authorization and does not leak hidden markers.

## Build sequence

1. Extract canonical media upload/download/deletion primitives behind the current Activity attachment path without migrating user data yet.
2. Add Story and typed relationship schema with owner-only creation and retrieval.
3. Build minimal Story capture and library; prove photo plus sentence first value.
4. Add Mission invitation and recipient lifecycle.
5. Add linked To-do projection and idempotent completion reconciliation.
6. Add Explore/Place entry and returned-Story surfaces.
7. Add sharing, revocation, child policy, export, negative RLS, and signed-device media proof.

Each step must leave the existing attachment and Explore behavior intact until its replacement path is proven.
