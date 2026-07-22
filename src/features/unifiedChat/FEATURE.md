---
feature: unifiedChat
audiences: [audience-ai-native-life-operators, audience-burned-out-productivity-power-users]
personas: [Nina, Marcus]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves:
  - jtbd-trust-this-app-with-my-life
  - jtbd-carry-intentions-into-action
  - jtbd-capture-and-find-meaning
  - jtbd-get-help-without-retelling-my-life
  - jtbd-understand-why-ai-suggested-this
  - jtbd-stay-in-control-of-ai-actions
briefs:
  - unified-chat-foundation
  - unified-chat
status: shipping
last_reviewed: 2026-07-21
---

# Unified Chat

Standalone, durable, multi-conversation Chat powered by the extracted shared agent workbench.

## Delivery state

The standalone foundation and the first complete trust path are implemented and production-backed: authenticated durable threads, visible removable and user-addable context, bounded evidence, structured answer limits, typed To-do proposals, explicit-create auto-apply through Quick Add enrichment, authoritative inventory rows, atomic decisions, receipt-first recoverable apply, exact return, correction, stop, steer, retry, safe deletion, native voice transcription, and bounded text-document attachments all coexist with legacy workflow Chat. The broader `unified-chat` brief remains active delivery work until signed simulator and physical-device evidence are complete.

## Ownership

- Owns `kwilt_agent_threads`, `kwilt_agent_messages`, and `kwilt_agent_runs`.
- Native Kwilt owns auth, AI requests, persistence, navigation, and bridge validation.
- The hosted workbench receives credential-free snapshots and emits versioned commands.
- Existing `AiChatScreen`, `AgentWorkspace`, and `AiChatPane` remain the owners of onboarding, Arc/Goal creation, To-do management, and other contextual workflow chat.
- `docs/delivery-evidence/unified-chat.yml` is the authoritative step-level implementation scorecard.

## Current learning-release limits

- Text, native voice, explicit Kwilt-object context, and up to three durable text-document attachments are complete. Binary and image attachments remain intentionally unsupported until Chat can inspect their contents truthfully.
- No existing-chat migration or automatic handoff.
- Goals and Chapters are read-only; To-dos are the only mutation path in this slice.
- Delivery scores remain evidence-gated in `docs/delivery-evidence/unified-chat.yml` and cannot reach 5 without simulator plus physical-device proof.
