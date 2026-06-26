# Frame: tag-vocabulary-system

## What the user said

> I think this works until you have a lot more tags than this. Also we don't have anywhere that we actually manage the tags, and our tag system doesn't allow you to easily find an existing tag when you're creating one, which is a real system gap.
>
> Research common tag system paradigms and run through a design loop to help Maya with her organization related JTBD

## Restated in user voice

When Maya is capturing or organizing ordinary family to-dos, she wants Kwilt to remember and surface the tags she already uses, so that "Groceries" and similar groups stay findable without making her maintain a productivity taxonomy.

## Target audience

`audience-aspirational-family-organizers` - Aspirational family organizers.

## Representative persona

Maya is using Kwilt because it helps her and her family keep track of real-life commitments. She is not a power user and does not want to learn a metadata system.

- Current situation: she has enough family to-dos that tags can help retrieval, but tag creation and filter selection can drift.
- What she is trying to do: keep errands, household follow-ups, appointments, and family commitments retrievable in the moment they can be acted on.
- Emotional tension: she wants to feel organized, not responsible for administrating Kwilt.
- What would make this feel wrong: a complex tag admin console, forced tag selection during capture, silent AI retagging, or a long taxonomy setup step.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few areas I most want to grow.

## Job flow step

`job-flow-maya-move-family-life-forward`

- Underserved step: Trust that the to-do will not disappear into a pile.
- Current product offering: Quick Add, Activities, views, tag filters, and lightweight tag groups.
- Delivery score: 3 for "Trust it won't disappear", 2 for "See what matters".
- Gap: tags are useful retrieval handles, but they are not yet treated as a durable vocabulary the user can reuse, find, and gently clean up.

## Active anchors

- `jtbd-move-the-few-things-that-matter` - the tag system exists to help ordinary commitments stay retrievable.
- `jtbd-carry-intentions-into-action` - a tag like Groceries should make the captured item actionable at the store.
- `jtbd-capture-and-find-meaning` - capture must stay unblocked and low-friction.
- `jtbd-trust-this-app-with-my-life` - AI and tag cleanup must be transparent enough that the user trusts the system with family commitments.

## Friction we're addressing

The current tag picker and tag group work help once the vocabulary is small. As the tag list grows, users need ranked search, reuse prompts at creation time, and a place to inspect or clean up tag drift. Without that, AI and manual entry can produce near-duplicates that make groups unreliable.

## System alignment

Constraint posture: `Extend the system`

Current system facts:
- Existing surface: Activities list, Tag Groups drawer, Filter drawer, Activity detail tags field, Quick Add defaults.
- Existing user flow: capture first, optionally add tags later, filter or open a tag group when needed.
- Existing domain/data model: `Activity.tags: string[]`, persisted `activityTagHistory`, activity views with tag filters.
- Existing technical affordances: tag history records label, use counts, recency, and recent examples; workspace snapshots already tell AI to reuse tag history.
- Existing UX/copy conventions: quiet controls, no power-user setup, no forced organization before capture.

Constraints to preserve:
- Never block capture on tag choice.
- Do not require a user-maintained taxonomy before tags become useful.
- Keep tags as retrieval handles, not identity categories.
- Do not silently rewrite existing Activity tags.

Constraints we may challenge:
- `activityTagHistory` is currently history, not a true inventory. If users need rename, merge, hide, or alias behavior, Kwilt needs a tag inventory object.
- The Activity detail tags field still behaves like a chip/free-text input more than an existing-tag finder.

Design implication:
Treat tag management as a vocabulary layer that appears at the moment of use: search while adding, select while filtering, open as a group, and lightly clean up from a tag list. Avoid making "Manage tags" the center of the experience.

## Aspirational design challenge

How might we help Maya keep family to-dos retrievable through familiar tags like Groceries, while preserving capture-first simplicity and avoiding a power-user taxonomy chore?

## Out of scope

- Shared family tag permissions.
- Nested tags or tag hierarchy.
- Required tags at capture.
- Automatic bulk retagging without review.

## Open question

Should Kwilt introduce a first-class tag inventory now, or first evolve `activityTagHistory` into an inventory-like local model?
