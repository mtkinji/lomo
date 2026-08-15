# Diverge: On-device generative routing strategy

## Fixed design challenge

How might we make on-device generation Kwilt’s preferred execution layer wherever it can meet a high task-specific UX bar, while preserving seamless cloud capability for jobs the device cannot perform well?

## Axis of variation

Where should provider choice and quality authority live: in one central job registry, within each capability, or in a request-time adaptive router?

## Alternative A: Central Generation Job Registry

Kwilt defines one provider-neutral registry of typed generative jobs. Each entry owns its input/privacy class, output contract, deterministic/local/cloud eligibility, provider ladder, fallback permission, token and latency budgets, evaluation corpus, promotion status, rollout cohort, and rollback switch. Product surfaces request a job and supply typed input; they do not choose a model. A job is promoted to local-default only after its local challenger meets the recorded quality bar on physical devices.

- Audience/persona fit: strong for Nina because execution complexity stays invisible and behavior is consistent across surfaces.
- Design-challenge answer: local preference is explicit, measurable, and reversible for every admitted job.
- System fit: extends the existing `KwiltAiJob` cloud routing map and the first Unified Chat local route into a shared client/server contract.
- Four-object stance: neutral infrastructure; Arc, Goal, Activity, and Chapter semantics remain owned by their capabilities.
- Capture-first stance: generation failure never blocks capture; each job must declare a deterministic, deferred, or cloud fallback.
- Best when: Kwilt wants disciplined cost and quality governance with a small number of well-named jobs.
- Fails when: the registry becomes a giant central switch statement containing capability-specific prompts, validation, or domain truth.
- Primer anti-pattern check: pass if the registry routes execution only and never becomes a universal life-scoring or action-owning agent.

## Alternative B: Capability-Owned Provider Contracts

Each capability owns its generative jobs and provider ladder alongside its prompts, validators, evidence, and mutation rules. Activities decide how enrichment runs; Chapters decide how reflection is generated; Games decide how story twists are produced; Chat decides how replies route. A small shared runtime provides Apple/cloud adapters, availability, cancellation, telemetry, and cost reporting, but there is no global job catalog beyond discovery metadata.

- Audience/persona fit: medium-strong because outputs remain close to the domain owner most capable of judging quality.
- Design-challenge answer: each capability can define “high quality” precisely and adopt local execution at its own pace.
- System fit: aligns with Kwilt’s capability-owned authority and avoids moving domain contracts into infrastructure.
- Four-object stance: strongest preservation of Arc, Goal, Activity, and Chapter ownership.
- Capture-first stance: each capability must retain its own non-blocking fallback, creating some risk of inconsistency.
- Best when: generative jobs differ substantially and capability teams need independent evolution.
- Fails when: routing, privacy fallback, telemetry, quotas, and promotion logic drift across surfaces; local capability becomes a collection of special cases.
- Primer anti-pattern check: pass, but repeated infrastructure can create inconsistent user trust even if each capability is locally correct.

## Alternative C: Request-Time Adaptive Router

Kwilt evaluates every request at runtime using device capability, input length, privacy class, task classification, current thermal/load state, network quality, and predicted local quality. The router chooses deterministic, local, fast-cloud, or advanced-cloud execution dynamically. For uncertain cohorts, it can collect opt-in or internal shadow comparisons, confidence signals, and outcome feedback to improve later routing decisions.

- Audience/persona fit: potentially strongest because Nina receives the best route for the exact situation rather than a coarse job-wide default.
- Design-challenge answer: local use can expand aggressively without assuming one provider is always best for a job.
- System fit: bends the current system by adding a prediction layer whose own quality and latency must be governed.
- Four-object stance: safe only if the adaptive layer cannot alter capability scope, evidence permission, or action authority.
- Capture-first stance: safe when routing is fast and non-blocking; unsafe if classification or provider racing delays the original job.
- Best when: real-world variance inside a job is large enough that static cohorts leave meaningful cost or quality on the table.
- Fails when: the router becomes an opaque model-before-the-model, local and cloud are raced routinely, or misprediction creates inconsistent answers and surprise transmission.
- Primer anti-pattern check: conditional pass — no anthropomorphic behavior or new UI, but hidden adaptivity can violate calm trust unless policy and fallback remain deterministic and inspectable.

## Alternative D: Local Intelligence Sidecar

Kwilt treats the device model as a shared sidecar for supporting work rather than as the primary generator of final product output. It handles classification, title generation, context selection, compaction, tags, structured extraction, and draft candidates. Cloud models continue to own most user-visible prose and complex reasoning until local evidence becomes overwhelming. Capabilities consume typed sidecar results but retain their existing cloud generation paths.

- Audience/persona fit: medium because Nina benefits from cost, privacy, and speed improvements but sees less offline or local-first final output.
- Design-challenge answer: reduces cloud tokens and helper calls with the lowest initial quality risk.
- System fit: fits current architecture with a small blast radius and supplies evidence for broader adoption.
- Four-object stance: preserves all current object ownership and keeps local output subordinate.
- Capture-first stance: strong; sidecar work can be skipped or deferred without blocking the user.
- Best when: Kwilt wants a conservative first portfolio with measurable savings and minimal visible-quality exposure.
- Fails when: local preprocessing is added before cloud calls indiscriminately, increasing total latency and device work, or when the strategy never graduates to final local outputs that already perform well.
- Primer anti-pattern check: pass if sidecar results remain bounded signals rather than hidden auto-anchoring or universal scoring.

## Comparative view

| Alternative | Quality governance | Cost-saving ceiling | Consistency | Initial risk | Main failure mode |
| --- | --- | --- | --- | --- | --- |
| Central registry | Shared job-level evidence | High | High | Medium | Central domain monolith |
| Capability-owned contracts | Domain-specific evidence | High | Medium-low | Medium | Policy and telemetry drift |
| Adaptive router | Per-request prediction | Highest | Medium | High | Opaque router and double work |
| Local sidecar | Supporting-task evidence | Medium | High | Low | Permanent underuse or added preprocessing |

## Divergence takeaway

The alternatives reveal a useful separation: Kwilt needs centralized execution governance, capability-owned outcome truth, and a conservative first cohort. Request-time adaptivity may eventually improve routing, but it should not be required to establish the strategy and must never routinely run local generation before a cloud request that was already necessary.
