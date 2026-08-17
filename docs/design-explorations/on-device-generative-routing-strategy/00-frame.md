# Frame: On-device generative routing strategy

## What the user said

> I’m looking for a broader strategy around preferring on device generative actions to reduce costs when UX outcomes can be held to a high standard, then using cloud generation only when on device is ill suited or would perform poorly.

## Restated in user voice

When Kwilt generates something for me, I want it to use the fastest, most private, least costly capable option without making me choose a model or accept a worse result, so that intelligence feels like a dependable part of the product rather than a metered external service.

## Target audience

`audience-ai-native-life-operators` — people who expect AI to help throughout a life system but will only trust it when the product, not the user, manages complexity and preserves quality.

The strategy is cross-cutting and should benefit every Kwilt audience; Nina is the representative stress case because she notices both AI usefulness and hidden compromises.

## Representative persona

**Nina** wants Kwilt to choose the right execution layer for each job without exposing implementation machinery.

- Current situation: generative actions appear across Chat, capture, onboarding, summaries, planning, reflection, and playful experiences, while most production routing currently chooses only among cloud models.
- What she is trying to do: receive high-quality generated help wherever it naturally belongs in Kwilt.
- Emotional state or tension: comfortable relying on AI, but unwilling to supervise providers, repeat context, or trade correctness for invisible cost savings.
- What would make this feel wrong: a model picker, inconsistent quality between devices, a slow local attempt followed by cloud duplication, or consequential output produced by a model that is not fit for the job.

## Hero anchor

`jtbd-trust-this-app-with-my-life` — execution cost can be optimized only inside a product contract that preserves reliability, calmness, transparency, and user control.

## Job flow step

Nina’s primary underserved step is **2. Express a practical job in ordinary language**, currently scored **3/5** because interpretation and generation remain unreliable in dogfood. The strategy also protects step 3, **Establish the bounded private context the request may use**, and step 5, **Understand the result, its inferences, and its limits**, both currently scored **4/5** with physical-device proof still outstanding.

## Active anchors

- `jtbd-trust-this-app-with-my-life` — local-default routing must preserve product quality and predictable behavior across devices.
- `jtbd-get-help-without-retelling-my-life` — a capable on-device job may use the minimum already-authorized local context instead of requiring repeated explanation or unnecessary third-party inference.
- `jtbd-understand-why-ai-suggested-this` — provider choice must not erase evidence, freshness, uncertainty, or coverage limits where those matter to the result.
- `jtbd-stay-in-control-of-ai-actions` — generative interpretation may propose, while capability-owned deterministic code continues to validate and apply.

## Friction we’re addressing

Kwilt already assigns named AI jobs to different cloud models and has begun a Chat-specific authored/on-device/cloud route. It does not yet have one product-wide contract that decides whether each generative job should be deterministic, on-device, fast-cloud, or advanced-cloud based on task fitness and measured UX quality. As a result, bounded jobs can incur avoidable inference cost and network dependency, while local capability risks growing as isolated surface-specific exceptions.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surfaces: generative work appears in Unified Chat, Arc and Goal creation, Activity enrichment, conversation summaries, planning, Chapters, games, current-information requests, attachment work, and image generation.
- Existing user flow: each surface initiates a named or implicit generation job; most jobs pass through the AI proxy, where server-authoritative routing chooses a cloud model.
- Existing domain/data model: generated output remains subordinate to capability-owned validation, durable records, proposals, receipts, and native destinations.
- Existing technical affordances: `KwiltAiJob` and server-side cloud model routing already form a partial job registry; Unified Chat adds the first tested local eligibility boundary and Apple Foundation Models provider.
- Existing UX/copy conventions: provider identity is normally invisible. Users encounter generated outcomes, evidence, review, and recovery rather than model controls.

Constraints to preserve:

- UX quality is a promotion gate, not an aspiration. A job becomes local-default only when representative evaluation shows the local result meets its task-specific acceptance bar.
- Do not expose provider or model selection to ordinary users.
- Never make local inference a mandatory preprocessing hop for a job that still requires cloud execution.
- Models interpret and generate; deterministic capability owners validate permissions, dates, amounts, eligibility, mutations, and receipts.
- Current information, broad research, unsupported modalities, oversized context, and frontier reasoning remain cloud work unless device capability later proves otherwise.
- Unsupported devices and Android retain a high-quality cloud or deterministic route.
- Privacy-aware fallback rules must govern whether a locally admitted input may later be transmitted to a cloud provider.
- Physical-device latency, quality, memory, energy, thermal, cancellation, and repeated-use evidence are required before broad promotion.

Constraints we may challenge:

- Cloud as the assumed default for every named generative job.
- Surface-owned routing rules that cannot be evaluated or changed consistently across Kwilt.
- A single binary local/cloud decision without distinct deterministic, local, fast-cloud, and advanced-cloud execution tiers.
- Generation quotas that charge or constrain users for work completed entirely on their own device.

Design implication:

Treat every generative action as a typed product job with an explicit quality bar, input/privacy class, local eligibility rule, provider ladder, fallback policy, latency and cost budget, evaluation corpus, observability contract, and rollback control. Prefer local only after that job earns local-default status; otherwise choose the least expensive cloud tier that still meets the required outcome.

## Aspirational design challenge

How might we make on-device generation Kwilt’s preferred execution layer wherever it can meet a high task-specific UX bar, while preserving seamless cloud capability for jobs the device cannot perform well?

## Out of scope

- Declaring all AI local-first regardless of task fitness.
- Replacing current web research, image generation, attachment inspection, large-context synthesis, or complex multi-tool reasoning without evidence.
- Direct generative writes to capability-owned truth.
- A user-facing provider setting, model badge, or lower-quality economy mode.
- App-launch prewarming, ambient generation, or globally retained model sessions without a task-specific activation signal.

## Open question

What evidence threshold should a generative job meet before it is promoted from cloud-default experiment to on-device-default behavior?
