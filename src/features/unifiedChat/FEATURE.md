---
feature: unifiedChat
audiences: [audience-ai-native-life-operators]
personas: [Nina]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves:
  - jtbd-trust-this-app-with-my-life
  - jtbd-carry-intentions-into-action
  - jtbd-capture-and-find-meaning
briefs:
  - unified-chat-foundation
status: shipping
last_reviewed: 2026-07-21
---

# Unified Chat

Standalone, durable, multi-conversation Chat powered by the extracted shared agent workbench.

## Ownership

- Owns `kwilt_agent_threads`, `kwilt_agent_messages`, and `kwilt_agent_runs`.
- Native Kwilt owns auth, AI requests, persistence, navigation, and bridge validation.
- The hosted workbench receives credential-free snapshots and emits versioned commands.
- Existing `AiChatScreen`, `AgentWorkspace`, and `AiChatPane` remain the owners of onboarding, Arc/Goal creation, To-do management, and other contextual workflow chat.

## Current learning-release limits

- Text turns only.
- No existing-chat migration or automatic handoff.
- No capability mutations, evidence cards, proposals, attachments, or voice.
