---
id: brief-unified-chat-foundation
title: Unified Chat Foundation
status: accepted
audiences: [audience-ai-native-life-operators]
personas: [Nina]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves: [jtbd-trust-this-app-with-my-life, jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning]
related_briefs: []
owner: andrew
last_updated: 2026-07-21
---

# Unified Chat Foundation

## Context

Kwilt's existing workflow chat is load-bearing product infrastructure. It powers initial onboarding, Arc and Goal creation, To-do creation and management, and other contextual flows. Those experiences must remain stable while Kwilt learns from a substantially more capable, Giraffed-derived Chat surface. The immediate need is therefore coexistence: add a separate, durable Chat capability that Andrew can exercise in TestFlight without migrating or replacing any existing workflow chat.

The long-term intent is convergence, but the convergence boundary is deliberately deferred until both systems can be compared through real use.

## Target audience

AI-native life operators want a trustworthy place to ask questions across their life system, resume prior thinking, and eventually turn grounded recommendations into inspectable actions. They already understand conversational AI, so the differentiator is continuity, evidence, and control rather than chatbot novelty.

## Representative persona

Nina has accumulated Arcs, Goals, To-dos, and Chapters and wants to ask cross-cutting questions without restating her situation every time. She needs multiple durable conversations and will reject a system that loses history, silently changes existing workflows, or exposes opaque actions.

## Aspirational design challenge

How might we let Nina begin and resume durable conversations across her life system, while preserving every existing Kwilt workflow chat and keeping durable capability changes native, inspectable, and reversible?

## Hero JTBD

`jtbd-trust-this-app-with-my-life` — the foundation must preserve continuity and ownership before it earns broader retrieval or action authority.

## Job flow step

`job-flow-nina-trust-ai-with-my-life-system`, especially the underserved steps where Nina asks across her life, evaluates suggestions, and needs to understand what the system will change. The foundation does not raise those steps to full delivery yet; it creates the durable surface needed to test them honestly.

## JTBD framing

When I open Chat, I want to start a distinct conversation or return to one I already began, so I can think with Kwilt over time without disturbing the focused coach experiences I already rely on.

## Design

### Coexistence contract

- Existing `AiChatScreen`, `AgentWorkspace`, `AiChatPane`, workflow definitions, prompts, draft behavior, and contextual entry points remain unchanged.
- A new `UnifiedChat` route and feature directory own the new capability.
- No existing chat transcript is migrated into unified Chat.
- No automatic handoff exists in the learning release.
- Future convergence remains possible through explicit adapters and contracts, not by treating either system as disposable now.

### TestFlight learning release

The new capability provides:

- a hidden or internally gated Chat entry;
- create, list, open, rename, and archive for multiple conversations;
- server-backed thread, message, and run records owned by the authenticated Kwilt user;
- the extracted Giraffed workbench hosted in a restricted WebView;
- a versioned, runtime-validated bridge that sends only snapshots and commands;
- text turns powered by Kwilt's existing authenticated AI proxy;
- leave-and-return continuity across app launches and devices.

The workbench never receives Supabase or AI credentials. Native Kwilt code owns authentication, persistence, AI requests, navigation, and any future capability action.

### Data model

- `kwilt_agent_threads`: title, status, timestamps, and user ownership.
- `kwilt_agent_messages`: ordered visible user/assistant content scoped to a thread.
- `kwilt_agent_runs`: request lifecycle and failure state scoped to a thread.

Evidence, proposals, operations, receipts, attachments, voice, and capability mutations remain valid future contract concepts but are not required to make the first TestFlight learning count.

### Failure and rollback behavior

- If the workbench URL is missing or cannot load, the new capability shows a contained retry/error state; existing Kwilt chat remains available and unaffected.
- If a send fails, the user message and failed run remain durable and inspectable.
- A feature gate can remove the new entry without deleting thread data or changing navigation for existing workflows.

## Success signal

Andrew can create at least three distinct chats in a TestFlight build, leave and relaunch Kwilt, reopen each chat with the correct transcript, send another turn, and observe no behavioral change in onboarding, Arc creation, Goal creation, or To-do management chat.

## Spec refinement

- The first release uses the remote extracted workbench because the goal is to test its actual interaction quality rather than reimplement it in React Native.
- Thread persistence is server-backed from the beginning; device-only AsyncStorage is not sufficient evidence for the eventual multi-client system.
- Only visible user and assistant messages are persisted in the first slice. Internal chain-of-thought is never stored or bridged.
- The first TestFlight slice is text-only. Existing voice and attachment capabilities remain unchanged elsewhere and can be added after the bridge passes device proof.
- The new route is independently named `UnifiedChat` in code so it cannot accidentally resolve to the existing hidden `Agent` route.

## Open questions

- After real TestFlight use, which contextual workflows should eventually open, hand off to, or merge with durable Chat—and which should remain purpose-built?
