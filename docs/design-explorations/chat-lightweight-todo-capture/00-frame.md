# Frame: Chat Lightweight To-do Capture

## What the user said

> “Our whole deal is to make this an extremely lightweight interaction for the user. And I don't want to compete with the actual To-do detail page and potentially confuse users.”

> “When a user wants to create a to-do, they often just want to name it and have the system enrich everything else. After enrichment, they may want to review the triggers / notifications, etc.”

## Restated in user voice

When I name a To-do in Chat, I want Kwilt to capture and organize it with almost no ceremony, so I can keep moving and review consequential details only when they matter.

## Target audience

`audience-ai-native-life-operators` — people who expect AI to operate their life system, not merely describe what they could do themselves.

## Representative persona

Nina already delegates ordinary knowledge work to AI and expects a direct instruction such as “create a To-do” to do the work.

- Current situation: she names a small commitment while already in a Chat thread.
- What she's trying to do: get it safely out of her head without completing a form.
- Emotional state or tension: impatient with redundant confirmation, but unwilling to accept hidden or irreversible side effects.
- What would make this feel wrong: a schema table in Chat, a second To-do editor, or a hidden notification that later interrupts her.

## Hero anchor

`jtbd-trust-this-app-with-my-life` — trust here means both competent action and proportionate restraint.

## Job flow step

Steps 6–8 in `job-flow-nina-trust-ai-with-my-life-system`: review a next move, decide, and receive an authoritative result. They are currently scored 4 because the typed proposal/apply path is implemented but the signed journeys are incomplete. The newly observed gap is that the same review ceremony is being applied to a low-risk, explicitly requested, reversible creation.

## Active anchors

- `jtbd-capture-and-find-meaning` — capture must not become administrative work.
- `jtbd-stay-in-control-of-ai-actions` — consequential effects must remain visible and reversible.

## Friction we're addressing

The current proposal card exposes every Activity field and becomes a competing To-do detail form. It asks Nina to review AI enrichment at the moment she only wants capture. This makes Kwilt feel less capable while also obscuring which enrichments are harmless metadata and which can create an external effect.

## System alignment

Constraint posture: `Bend the system`

Current system facts:

- Existing surface: standalone Chat embeds a credential-free workbench inside native Kwilt.
- Existing user flow: a To-do action creates a durable typed proposal, waits for a decision, applies idempotently, then shows an authoritative receipt with Open and Undo.
- Existing domain/data model: Activities already default to `task`, `planned`, and no Goal; AI-created Activities can carry tags, priority, difficulty, estimate, date, reminder, recurrence, and location context.
- Existing technical affordances: the receipt-first mutation boundary, deterministic idempotency key, exact native return target, crash recovery, and undo already exist.
- Existing UX/copy conventions: capture never blocks; alignment is gentle and retroactive; full object editing belongs to the owning capability.
- Existing inventory grammar: `ActivityListItem` plus `buildActivityListMeta` is the canonical compact To-do presentation for title, timing, estimate, completion, and metadata tone.

Constraints to preserve:

- A direct create instruction must produce an authoritative Activity, not a chat-only placeholder.
- Chat must never become a second full To-do editor.
- Every automatically created To-do must remain directly openable in the real To-do detail page, with Back returning to the exact Chat thread and position.
- The created-object receipt should reuse the standard Activity inventory display model and visual grammar wherever the web/native boundary allows, rather than inventing a Chat-only card.
- Quick Add's existing trigger, location-permission, credit, and entitlement boundaries remain authoritative; Chat does not invent parallel controls.

Constraints we may challenge:

- “Every AI write requires a proposal confirmation” is too coarse. An explicit create instruction can itself be the authorization for a low-risk reversible write.

Design implication:

Separate capture from administration. Kwilt creates the Activity immediately when intent is clear, runs the same four Quick Add AI choices automatically (`steps`, `triggers`, `details`, and an entitled `cover_image`), then shows the created Activity using the standard compact inventory grammar. The row itself opens the authoritative native detail screen and preserves Chat as the exact Back destination. Swipe-left exposes the existing Delete action.

## Aspirational design challenge

How might we help Nina turn a natural-language commitment into an enriched, authoritative To-do in one beat, while preserving explicit control over anything that can interrupt, notify, spend, share, or otherwise act beyond the record itself?

## Out of scope

- Rebuilding the native To-do detail screen in Chat.
- New effect types outside the existing Quick Add Activity contract, including sharing, money movement, or Screen Time enforcement.
- Generalizing the low-risk auto-apply policy to Goals, money, Screen Time, or other capabilities in this slice.

## Resolved direction

An explicit phrase such as “create” or “add” counts as approval to create the reversible To-do immediately. Chat silently selects all available Quick Add AI enrichments. The inventory row opens the authoritative native detail page, Back returns exactly to Chat, and swipe-left deletes the To-do.
