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
last_updated: 2026-08-15
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

## Spec refinement

- Source-controlled promotion state is sufficient for the first local build; remote policy delivery is intentionally deferred, but the contract must allow independent job rollback.
- `thread_title` is the only newly promoted job in this slice. `conversation_summary` remains the named next challenger.
- Existing cloud model assignments do not change as part of this implementation.
- The app’s current branch and checkout remain the sole simulator/runtime owner; no worktree is created.
- Simulator and source tests cannot satisfy physical-device quality, energy, thermal, or latency gates.
- No user-owned product decision remains for the first slice. Promotion beyond `thread_title` requires evidence review rather than an implementation assumption.

## Open questions

- Whether a later production control plane should deliver signed remote promotion policy or use ordinary release-config flags.
- Whether Android’s first provider can honor the same job contracts without platform-specific visible differences.
