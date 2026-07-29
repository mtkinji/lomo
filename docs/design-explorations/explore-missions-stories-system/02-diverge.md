# Diverge: Explore Missions and Stories System

## Fixed design challenge

How might we help Maya turn a place into a private invitation, a doable experience, and a story worth revisiting or sharing—while keeping each object’s purpose, ownership, location use, and audience unmistakably clear?

## Alternative A — Asset Graph First

Create one universal media library and a generic relationship graph linking any asset to any Place, Mission, Story, Activity, Goal, person, or Space.

The UI can reuse media everywhere and eventually expose a library or graph browser.

### Strengths

- Maximum theoretical reuse.
- Easy to describe as one platform substrate.
- Supports future AI retrieval across many object types.

### Failure modes

- The file becomes the center of the product instead of the meaning.
- Generic target tables produce complex RLS, deletion, search, and lifecycle behavior.
- One global visibility field cannot express a private To-do reference and shared Story reference to the same file.
- Users must understand assets and links to correct ordinary privacy outcomes.

### Verdict

Reject as the product and V1 schema. Retain only the canonical-file insight.

## Alternative B — Capability Silos

Let Stories, Missions, Explore, and Activities each own their uploads, sharing rules, and Place fields. Copy media whenever it crosses a capability.

### Strengths

- Fastest local implementation.
- Each capability can ship independently.
- Authorization is initially easy to explain.

### Failure modes

- Duplicate uploads and storage cost.
- Conflicting metadata, deletion, and audience state.
- A Mission return, Story, and Activity attachment drift into three versions.
- Every capability reinvents upload, thumbnail, export, and safety handling.

### Verdict

Reject. This optimizes the first implementation at the cost of a permanently fragmented life record.

## Alternative C — Story-Centered Keepsakes

Make Story the only durable meaningful output. Media always belongs to a Story. Missions can request or complete a Story; Places and To-dos link to it.

### Strengths

- Very clear user model.
- Strong library and revisit destination.
- Sharing, authorship, and presentation have one owner.

### Failure modes

- A receipt photo or planning document that is not a Story gets forced into Story semantics.
- Mission progress media may exist before the Story is ready.
- Activity attachments cannot migrate cleanly without fake Stories.

### Verdict

Strong product center, insufficient technical model by itself.

## Alternative D — Typed Object System with Invisible Media Infrastructure

Keep four user-legible objects with distinct jobs:

- **Place** — where.
- **Mission** — invitation, objective, state, and completion contract.
- **To-do** — when and how accepted work becomes doable.
- **Story** — what happened and why it matters.

Store each underlying file once as a private **MediaAsset**. Use explicit typed relationship tables—such as Story assets, Story Places, Mission result, and Activity support—instead of a universal link graph. Resolve access from the authorized container/reference. Present Stories, not assets, as the library.

### Strengths

- Clean mental model and bounded capability ownership.
- Reuse without global asset visibility.
- Explicit lifecycle, authorization, and deletion rules.
- Accommodates small Stories and non-Story attachments.
- Supports incremental extraction from current Activity attachment machinery.

### Failure modes

- More schema than a capability silo.
- Cross-object creation needs idempotent orchestration.
- Every new relationship type requires a deliberate policy rather than a free-form link.

### Verdict

Choose. The deliberate friction is valuable: a new link exists only when its semantics and access rule are clear.

## Alternative E — Mission-First Explore Game

Focus V1 on the map launcher, nearby Missions, scavenger hunts, badges, and friend challenges. Save completion media directly on Missions; defer Stories.

### Strengths

- Fastest path to a visibly fun Explore loop.
- Mission UI and map affordances receive focused learning.
- Easy to demonstrate.

### Failure modes

- Completed evidence becomes trapped in a task archive.
- The system optimizes engagement rather than family meaning.
- Stories later require migration or duplicate media.
- Home and family-history value remains underdeveloped.

### Verdict

Use Mission capture as the first learning slice, but make its result a minimal Story so the system begins with the right durable object.
