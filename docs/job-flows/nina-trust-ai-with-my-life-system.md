---
id: job-flow-nina-trust-ai-with-my-life-system
audience: audience-ai-native-life-operators
persona: Nina
hero_jtbd: jtbd-trust-this-app-with-my-life
last_updated: 2026-07-22
---

# Nina: Trust AI With My Life System

## Audience / Persona

Audience: `audience-ai-native-life-operators`  
Persona: Nina

Nina wants AI and desktop tools to help operate her life system, but only if the system stays inspectable, permissioned, and reversible.

## Hero JTBD

`jtbd-trust-this-app-with-my-life` - Help me trust this place enough to keep coming back.

## Job Flow

1. Arrive with visible scope and an exact return destination.
2. Express intent in ordinary language, voice, or an explicit text document.
3. Establish the bounded private context the request may use.
4. Retrieve inspectable, capability-owned evidence.
5. Understand the result, its inferences, and its limits.
6. Let an explicit low-risk To-do create instruction apply directly; review at most one typed proposal for updates or higher-risk changes.
7. Open, correct, delete, decline, defer, or approve in proportion to the operation's risk without duplicating the owning capability's editor.
8. Apply idempotently and receive an authoritative receipt.
9. Return to the exact native destination.
10. Resume, correct, retry, audit, or undo later.

## Current Kwilt Flow

1. Standalone Unified Chat opens globally or from a Goal, To-do, or Chapter with visible removable scope and an exact native return target.
2. Nina can type, dictate, add Kwilt context, or attach up to three bounded text documents; general questions do not silently pull private Kwilt context.
3. Goals, To-dos, and Chapters provide bounded evidence with provenance, freshness, selection reason, and coverage limits.
4. An explicit To-do create instruction auto-applies through the durable decision path, runs all available Quick Add AI enrichments, and projects the authoritative result as the standard inventory row; update operations retain reviewed proposals.
5. Row tap opens native detail, Back returns to the same Chat thread, and swipe-left exposes Delete. Apply still uses an atomic decision and receipt-first idempotent path with crash recovery behind the surface.
6. Threads, runs, evidence, decisions, receipts, feedback, and text-document attachments are durable and owner-scoped in production.
7. The credential-free hosted workbench projects those records and emits versioned commands; Kwilt retains auth, data access, capability policy, mutation, and navigation.
8. Giraffed remains the interaction donor and compatibility consumer, not a shared product shell.

## Offerings

- Mobile capture.
- Phone Agent / Kwilt Keep.
- Desktop command center.
- External AI connector.
- MCP / tool access.
- AI operator workflows.
- Permission, preview, and undo requirements.
- Durable standalone Chat threads, messages, runs, and response feedback.
- A Kwilt-hosted shared-workbench surface with a credential-free typed bridge.
- The step-level evidence ledger at [`docs/delivery-evidence/unified-chat.yml`](../delivery-evidence/unified-chat.yml).

## Delivery Score

| Step | Score | Rationale |
| --- | --- | --- |
| Arrive with visible scope and exact return | 4 | Implemented, automated, and simulator-proven; physical-device proof remains. |
| Express intent in ordinary language | 4 | Text, name-only capture, and bounded documents are simulator-proven; physical voice and device interaction proof remain. |
| Establish bounded request scope | 4 | Explicit context and least-privilege routing are implemented and simulator-proven; physical-device proof remains. |
| Retrieve inspectable evidence | 4 | Bounded Goals, To-dos, and Chapters evidence is durable; inspectable Goals evidence is simulator-proven and physical-device proof remains. |
| Understand result and limits | 4 | Facts, inference, uncertainty, provenance, freshness, and coverage are visible and simulator-proven; physical-device proof remains. |
| Review a typed capability proposal | 4 | Low-risk creates reduce to an enriched inventory row and exact-match updates review only changed fields; physical-device proof remains. |
| Correct, decline, defer, or approve | 4 | Explicit create approval and compact versioned update decisions are simulator-proven; physical-device proof remains. |
| Apply with authoritative receipt | 4 | Receipt-first idempotent apply preserves enrichment and is simulator plus production-data proven; physical-device proof remains. |
| Return to the exact destination | 4 | Row-to-native-detail and exact Chat return are simulator-proven; physical-device proof remains. |
| Resume, correct, and undo | 4 | Durable resume, duplicate-free retry, and receipt-backed swipe Delete are simulator-proven; stop, steer, correction editing, lifecycle, and physical-device proof remain. |

## Gaps

- All ten steps now have mapped signed-in simulator evidence. Scores remain at 4 until the separate signed physical-iPhone pass is complete; stop, steer, correction editing, background/foreground, and microphone interaction also remain explicit runtime checks.
- Goals and Chapters remain read-only in this slice; To-dos prove the reviewed mutation contract.
- Binary and image attachments remain unsupported until Chat can inspect their contents truthfully.
- Existing legacy workflow chats are not automatically migrated into standalone Unified Chat.

## Aspirational Design Challenge

How might we help Nina let AI operate near her life system, without giving up inspection, permission, or control?
