---
id: brief-chat-transcript-copy
title: Copy a Unified Chat transcript
status: accepted
audiences: [audience-ai-native-life-operators]
personas: [Nina]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves: [jtbd-trust-this-app-with-my-life]
related_briefs: [unified-chat-foundation]
owner: andrew
last_updated: 2026-08-04
---

# Copy a Unified Chat Transcript

## Context

Developer dogfooding often produces the exact conversational evidence needed to improve Chat, but the current menu only renames or archives the thread. Moving the exchange into Codex requires screenshots or manual turn-by-turn copying.

## Target audience

AI-native life operators need useful conversation history to remain portable without becoming public by default.

## Representative persona

Nina is operating across trusted AI tools and wants to carry a conversation into another working context while retaining control over what leaves Kwilt.

## Aspirational design challenge

How might we help Nina carry a useful Chat exchange into another trusted tool, while preserving private-by-default ownership and a calm existing menu?

## Hero JTBD

`jtbd-trust-this-app-with-my-life` — local, inspectable portability strengthens ownership while avoiding a premature public-sharing surface.

## Job flow step

`job-flow-nina-trust-ai-with-my-life-system`, step 10: audit and correct later. Kwilt preserves durable history internally, but has no whole-conversation handoff for external inspection.

## JTBD framing

When a Chat exchange teaches me something about the product, I want to take a readable copy into my development workflow, so I can improve Kwilt without reconstructing the conversation or publishing private context.

## Design

- Add `Copy chat` between Rename and Archive in the current three-dot menu.
- Copy a Markdown document containing the one-line title and ordered visible User/Kwilt messages with stable timestamps.
- Include attachment names, but exclude attachment contents.
- Exclude context refs, evidence, proposals, receipts, client actions, artifacts, run events, credentials, and internal reasoning.
- Confirm success; show a contained error when the device clipboard write fails.
- Do not create a hosted link or network request.

## Success signal

Andrew can copy several real conversations and paste them directly into Codex with enough context to critique the interaction and no manual turn reconstruction.

## Spec refinement

- "Entire chat" means the visible conversational transcript, not every durable internal record associated with the thread.
- Markdown is the single export format because it preserves long-form text and role boundaries while remaining pasteable.
- ISO timestamps are stable and developer-readable across locales.
- A share sheet is the next smallest extension if clipboard handoff proves insufficient; hosted links require a separate private-sharing design.

## Open questions

None for the local learning release.
