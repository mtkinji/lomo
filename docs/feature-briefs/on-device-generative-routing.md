---
id: brief-on-device-generative-routing
title: On-Device Generative Routing
status: accepted
audiences: [audience-ai-native-life-operators]
personas: [Nina]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves: [jtbd-trust-this-app-with-my-life, jtbd-get-help-without-retelling-my-life, jtbd-understand-why-ai-suggested-this, jtbd-stay-in-control-of-ai-actions]
related_briefs: [brief-unified-chat, brief-ai-proxy-and-quotas, brief-model-strategy-and-tradeoffs]
owner: andrew
last_updated: 2026-08-16
---

# On-Device Generative Routing

## Context

Kwilt already routes named AI jobs to different cloud models and now has a Chat-specific Apple Foundation Models path for five bounded writing tasks. The product needs one governed strategy that prefers on-device execution wherever it meets the job’s UX standard, while preserving cloud capability for unsupported devices and jobs that require broader context, modalities, tools, current information, or stronger reasoning.

## Target audience

The primary audience is `audience-ai-native-life-operators`. They expect intelligence throughout a life system, but do not want to supervise providers, accept unpredictable quality, or wonder whether private data moved because a local attempt failed.

## Representative persona

Nina uses AI naturally and notices when a product exposes infrastructure or silently lowers its standard. She wants Kwilt to choose the least costly capable provider while preserving the same visible outcome and action safeguards.

## Aspirational design challenge

How might we make on-device generation Kwilt’s preferred execution layer wherever it can meet a high task-specific UX bar, while preserving seamless cloud capability for jobs the device cannot perform well?

## Hero JTBD

`jtbd-trust-this-app-with-my-life` — execution cost can be optimized only within a calm, reliable product contract that keeps generated outcomes useful and consequential changes controlled.

## Job flow step

In `job-flow-nina-trust-ai-with-my-life-system`, step 2, expressing a practical job in ordinary language, remains at 3/5 because interpretation and generation have been unreliable in dogfood. Steps 3 and 5 establish the bounded-context and inspectability constraints this routing strategy must preserve.

## JTBD framing

When Kwilt generates something, Nina wants it to use the fastest, most private, least costly capable option without requiring her to choose a model or accept a worse result. This serves the hero trust job while helping her avoid retelling context, understand bounded output, and retain control over actions.

## Design

### Governed job contract

Each registered generation job defines:

- a stable id, owner, and version;
- typed input and output ownership;
- input/privacy class and cloud-transmission policy;
- deterministic, on-device, economy-cloud, and advanced-cloud eligibility;
- input, output-token, latency, and cost budgets;
- local promotion state and supported platform requirements;
- fallback behavior;
- evaluation corpus and quality rubric;
- content-free telemetry and independent rollback.

Shared infrastructure owns provider selection and lifecycle. Capabilities own prompts, schemas, evidence, output meaning, validation, correction, permissions, mutations, proposals, receipts, and undo.

### Provider ladder

The router selects one starting provider in this preference order:

1. deterministic;
2. on-device when promoted and eligible;
3. economy cloud;
4. advanced cloud.

The ladder is not a sequence of speculative attempts. Local and cloud are not routinely raced, and local processing is not added before a cloud request that is already required.

### First learning slice

The first slice:

- introduces the portable registry;
- migrates existing Chat writing eligibility to registered job contracts;
- adds an on-device-first `thread_title` job;
- preserves cloud title fallback and title normalization;
- keeps provider selection invisible;
- records content-free operational evidence;
- does not count successful local work against cloud-generation quota.

### Measured response-latency slice

The first comparative Simulator run narrowed the default local cohort instead of promoting every syntactically eligible task:

- `chat_rewrite` and `chat_proofread` remain on-device-default and publish cumulative snapshots into the existing assistant response position;
- `chat_summarize` remains on-device-default but publishes only its validated final result because a premature partial summary cannot be safely replaced after it is read;
- `chat_shorten` and `chat_brainstorm` return to challenger status after the measured outputs missed their task-specific quality bars;
- local results pass deterministic output validation before persistence, with an invisible single cloud fallback on rejection or unavailability;
- the Apple model is prewarmed once when Chat mounts, while each generation still receives a fresh isolated session;
- plain cloud text responses use end-to-end SSE through the AI proxy and the same transient assistant projection. Tool calls, structured output, web search, and attachment inspection remain buffered.

Provider choice stays invisible. Progressive output changes timing, not the visual hierarchy, durable thread contract, or action authority.

Progressive rewrite/proofread snapshots are withheld until they contain a meaningful source-word match and pass the no-preface guard. Each local job declares separate first-useful-output and total-duration measurement targets, but missing a target does not cancel otherwise healthy local work. Cloud is used only when local processing is unavailable, errors, or produces a final result rejected by the task quality gate.

When an attempted local job falls back, Chat shows a dismissible processing notice stating that on-device processing could not complete the request and the response is using cloud processing. The notice is separate from generated answer text and does not ask the user to choose a provider.

Bundled promotion remains authoritative. A cached PostHog boolean may demote an individual on-device-default job with `kwilt-on-device-generation-<job-id>`; it cannot promote a challenger. Missing, invalid, or unreachable remote config preserves the bundled state. This control is operational and invisible in ordinary Chat.

### Resilience and privacy

Unsupported hardware, OS versions, locales, disabled Apple Intelligence, model-not-ready states, and local failures use the job’s declared fallback. `cloud_allowed` jobs may use the cloud provider; `cloud_allowed_with_reduced_context` jobs must deterministically reduce input first; `local_only` jobs never transmit the input and must defer or use a deterministic fallback.

### Promotion order

1. Existing self-contained Chat writing tasks.
2. Titles, compaction, classification, extraction, tags, and constrained enrichment.
3. Bounded visible drafting, game text, Activity suggestions, and later authorized local-context answers.
4. Arc, Goal, Chapter, and consequential judgments only after separate quality proof.
5. Current information, broad research, large attachments, images, and complex tool orchestration remain cloud.

## Success signal

A job can move to on-device-default without a visible product fork, without increased correction or fallback burden, and without a cloud request on successful local execution. Unsupported users retain the same capable experience. The first `thread_title` cohort passes its source tests and 30 cold/30 warm eligible-device evaluation with acceptable latency and device health.

For ordinary text Chat, the perceived target is useful response text within roughly one second when the selected provider supports streaming. Exact content-free first-output, total, warm-state, and cloud-fallback timing are measured separately. Dev Tools can export either a quick full corpus or a 30-cold/30-prewarmed physical-device title gate through the native benchmark runner.

## Spec refinement

- Source-controlled promotion state remains the only promotion authority. Cached remote flags provide independent demotion-only rollback.
- `thread_title` is the only newly promoted job in this slice. `conversation_summary` remains the named next challenger.
- Existing cloud model assignments do not change as part of this implementation.
- The app’s current branch and checkout remain the sole simulator/runtime owner; no worktree is created.
- Simulator and source tests cannot satisfy physical-device quality, energy, thermal, or latency gates.
- No user-owned product decision remains for the first slice. Promotion beyond `thread_title` requires evidence review rather than an implementation assumption.
- Automatic app-root benchmark execution is intentionally absent. Explicit development actions run and share native benchmark artifacts so normal launches cannot accidentally generate a full evaluation corpus.

## Open questions

- Whether a later production control plane needs signed policy beyond the current PostHog demotion-only rollback.
- Whether Android’s first provider can honor the same job contracts without platform-specific visible differences.
