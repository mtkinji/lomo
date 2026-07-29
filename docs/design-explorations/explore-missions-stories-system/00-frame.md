# Frame: Explore Missions and Stories System

## What the user said

Explore should make room for nearby discoveries, durable Missions, friend-to-friend invitations, proof through photos or videos, and family Stories tied to Places. The underlying media should be reusable without turning Kwilt into a file manager.

## Restated in user voice

When a place matters—or might become meaningful—I want Kwilt to help me go there, notice what happened, and preserve or share the story with the right people, so family life gains memory and momentum without becoming a social feed, a location tracker, or another system to administer.

## Target audience

`audience-aspirational-family-organizers` — aspirational family organizers.

Maya is the primary audience because outings, family history, travel, ordinary errands, and “we should do that someday” moments frequently begin in a place and become meaningful through another person.

## Representative persona

Maya wants to create a richer family life and keep its meaning from disappearing.

- At home, she may want a small reason to rediscover the familiar.
- While traveling, she may want locally relevant invitations without overwriting what Home means.
- After an outing, she may have one photo and one sentence—not a polished production.
- She wants family participation, but never ambient location sharing or a performance feed.
- She will abandon the system if every moment requires classifying files, Places, audiences, and projects.

Olive is the simplicity stress test: a child should be able to save a photo and sentence or answer a story request without understanding the backend graph.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — the system should move a meaningful family intention into a real experience, not merely accumulate content.

## Job flow step

`job-flow-maya-move-family-life-forward`:

- **Know the next doable action:** 2/5. Explore can show where Maya has been, but has no durable invitation to go somewhere next.
- **Schedule or hand off:** 2/5. Existing sharing and To-do foundations do not yet express an accepted Mission.
- **Family participation:** 2/5. Kwilt lacks the full accept, do, return, preserve, and share-back loop.
- **Keep using the system:** 3/5. A playful loop could deepen return value, but only if it stays reductive and private.

## Active anchors

- `jtbd-capture-and-find-meaning` — preserve lived material with less effort than journaling.
- `jtbd-carry-intentions-into-action` — turn an invitation into a doable next step.
- `jtbd-invite-the-right-people-in` — share one bounded invitation or Story with chosen people.
- `jtbd-trust-this-app-with-my-life` — keep location, media, children, and family access explicit and reversible.

```yaml
serves: [jtbd-move-the-few-things-that-matter, jtbd-capture-and-find-meaning, jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
```

## System alignment

Constraint posture: `Extend the system`.

Existing foundations:

- Explore already owns private territorial discovery and place-aware map interaction.
- Places defines evidence-gated, user-correctable place identity without continuous location history.
- Activities owns scheduling, reminders, priority, and personal next-action surfaces.
- Household and participation Spaces separate relationship labels from effective access.
- Friend relationships may become reusable recipients, but a relationship alone reveals nothing.
- Activity attachments already prove private object storage, signed-download brokering, upload state, and account-deletion cleanup.
- Guided Overture already names a minimum Stories promise: photo plus sentence becomes a saved Story that can be revisited.

Constraints to preserve:

- No public feed, follower graph, live-location sharing, or automatic family visibility.
- No Mission assignment without recipient acceptance.
- No GPS-only Mission completion.
- No global current-Space switcher.
- No photo, microphone, or location permission before the related action.
- Explore fog must not leak Places, Story markers, Missions, or accessibility information from unrevealed territory.
- One canonical meaningful object; do not duplicate a Story or To-do merely because it participates in another capability.
- Capture remains valid with minimal input and can be enriched later.

Constraints to challenge:

- `ActivityAttachment` cannot become the cross-capability model because it is owned by one Activity and shares through one broad Goal-member boolean.
- A user-visible “asset library” is too infrastructural for first value.
- A generic polymorphic `object_links` table would make authorization, deletion, and indexing difficult to reason about.
- “Family” is not one permission scope; Household, a broader family Space, and a direct share may all be different.

## Aspirational design challenge

How might we help Maya turn a place into a private invitation, a doable experience, and a story worth revisiting or sharing—while keeping each object’s purpose, ownership, location use, and audience unmistakably clear?

## Out of scope

- A public discovery or family activity feed.
- Continuous route sharing or arrival reporting to a sender.
- A Dropbox-like top-level media browser.
- Automatic Story creation from every captured file.
- AI-generated family-history facts or inferred relationships.
- A universal cross-capability permission matrix.
- Competitive Mission leaderboards, streaks, or engagement pressure.

## Open question

Can the first release prove the full emotional loop with only one Mission completion kind—capture a small Story at one Place—before adding scavenger hunts, badges, multi-stop routes, and richer mission rules?
