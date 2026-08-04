# Frame: Chat Transcript Copy

## What the user said

> Give me an affordance in this menu to copy the entire chat, or get a link to it, so I can share the conversation with Codex and improve it.

## Restated in user voice

When a Chat conversation reveals something worth improving, I want to carry the visible exchange into my development workflow without reconstructing it turn by turn, so I can inspect and improve Kwilt while staying in control of private context.

## Target audience

`audience-ai-native-life-operators` — AI-native life operators who move between Kwilt and development or thinking tools.

## Representative persona

Nina, adapted here to Andrew's developer-dogfood situation: the conversation itself is useful product evidence, but it should not become public merely because it is portable.

## Hero anchor

`jtbd-trust-this-app-with-my-life` — portability should strengthen ownership without weakening privacy.

## Job flow step

`job-flow-nina-trust-ai-with-my-life-system`, step 10: resume, correct, retry, audit, or undo later. Current delivery is strong inside Kwilt but does not provide a lightweight way to inspect the visible conversation in another tool.

## Active anchors

- `jtbd-trust-this-app-with-my-life` — the person should be able to take a readable copy of their visible conversation.

## Friction we're addressing

The menu can rename or archive a chat, but the only way to move the conversation into Codex is manual turn-by-turn copying or screenshots.

## System alignment

Constraint posture: `Fit the system`

- Existing surface: the current conversation overflow menu.
- Existing data: the loaded owner-scoped thread aggregate already contains ordered visible user and assistant messages.
- Existing affordance: `expo-clipboard` is already used elsewhere in Kwilt.
- Privacy constraint: do not publish, upload, or create a durable sharing grant.

Design implication: add one local action to the existing menu and export only the visible conversational layer.

## Aspirational design challenge

How might we help Nina carry a useful Chat exchange into another trusted tool, while preserving private-by-default ownership and a calm existing menu?

## Out of scope

Public links, collaborator access, revocation, expiration, attachment-content export, and internal run/evidence records.

## Open question

None for the local learning release.
