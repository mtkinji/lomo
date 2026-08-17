# Converge: On-device generative routing strategy

## Qualitative scoring

| Alternative | Nina / trust fit | System fit | Cost opportunity | Quality control | Blast radius | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Central job registry | Strong | Strong if it routes but does not own domain truth | High | Strong, consistent | Medium | Lead architecture |
| Capability-owned contracts | Strong within each domain | Strong philosophically | High | Strong locally, inconsistent globally | Medium | Preserve as the quality/validation boundary |
| Request-time adaptive router | Potentially strong | Weak for the first release | Highest theoretical | Hardest to explain and validate | High | Defer |
| Local intelligence sidecar | Moderate | Very strong | Medium | Lowest initial risk | Low | Use as the first cohort, not the final architecture |

## Chosen direction

Build a **governed generation job registry** with **capability-owned outcome contracts** and a **sidecar-first promotion sequence**.

The shared registry governs execution concerns:

- stable job id and version;
- deterministic, on-device, economy-cloud, and advanced-cloud provider ladder;
- input and privacy class;
- device and locale eligibility;
- context, token, latency, and cost budgets;
- fallback and transmission policy;
- evaluation corpus and promotion state;
- content-free telemetry;
- rollout cohort and remote rollback.

The owning capability continues to govern product meaning:

- typed input and output;
- prompt and schema;
- quality rubric and acceptance examples;
- evidence, freshness, and uncertainty requirements;
- validation and correction;
- permission, mutation, proposal, receipt, and undo behavior.

Provider selection is deterministic in the first release. Kwilt does not add a learned request-time router, routinely race local and cloud, or perform local preprocessing before a request that already requires cloud execution.

## Provider ladder

1. **Deterministic** — use ordinary code, cached output, templates, or statistical logic when generation adds no value.
2. **On-device** — preferred when the registered job, input shape, device, locale, privacy policy, and promoted quality cohort all qualify.
3. **Economy cloud** — use the least expensive cloud model proven to meet the job contract when local is unavailable, excluded, or below the quality bar.
4. **Advanced cloud** — use only for jobs whose context, reasoning, modality, tool use, or consequence requires it.

The ladder is an ordering of preference, not a sequence of attempts. The router should select one starting provider. It may fall back only under the job’s explicit policy.

## Capability delta

### Today

Kwilt can:

- select a cloud model from a named AI job;
- answer a tiny Chat response deterministically;
- run five explicit self-contained Chat writing tasks through Apple Foundation Models;
- fall back from those Chat tasks to cloud;
- record broad provider outcome telemetry.

Kwilt cannot:

- apply one local-default policy across all generative jobs;
- prove that a local provider meets a job-specific UX standard before promotion;
- distinguish local, economy-cloud, and advanced-cloud eligibility in one contract;
- govern private-context fallback and quota treatment consistently;
- roll back one local job cohort without changing unrelated routing code.

### After this concept ships

Kwilt can register a generative product job once, compare eligible providers against the same outcome contract, promote that job to on-device-default when it earns the role, avoid cloud quota and spend on successful local work, and fall back according to an explicit quality and privacy policy.

### Still intentionally impossible

- A model directly mutating capability-owned truth.
- A user choosing providers or accepting a lower-quality economy mode.
- A local model claiming current external facts without an authorized source.
- Silent cloud transmission of a job or context marked local-only.
- Runtime local/cloud racing as the normal path.

## First promotion cohorts

### Cohort 0: existing proof

- authored Chat acknowledgments;
- explicit self-contained rewrite, proofread, shorten, summarize, and small brainstorm requests.

### Cohort 1: invisible and reversible support jobs

- conversation and thread title generation;
- bounded conversation compaction or summary maintenance;
- narrow classification and structured extraction;
- tags, labels, and constrained enrichment that do not become authoritative truth;
- development-only local-versus-cloud evaluation capture with no production double-generation.

### Cohort 2: bounded user-visible generation

- Activity title or enrichment suggestions from explicit capture text;
- small creative game text where freshness and external facts are irrelevant;
- context-free drafting and ordinary bounded Chat responses;
- small grounded answers from an explicitly authorized local context package, only after privacy-aware fallback is implemented.

### Cohort 3: meaning-defining work

- Arc language;
- Goal generation;
- Chapter prose and interpretation;
- consequential recommendations or capability-intent judgments.

These are challengers, not presumed local candidates. Each remains cloud-default until physical-device evaluation shows that local output preserves identity language, factual grounding, usefulness, and correction burden.

### Cloud-first or cloud-only until capability changes

- current information and web research;
- broad or oversized context synthesis;
- attachment and unsupported-modality inspection;
- image generation;
- advanced planning and complex multi-tool orchestration.

## Accepted trade-offs

- A shared registry adds deliberate upfront definition work for each job.
- The initial cost reduction is smaller because low-risk supporting jobs promote before identity-defining generation.
- Apple-capable devices may receive local execution before Android has an equivalent provider, while the visible outcome contract remains platform-consistent.
- Some local failures will use cloud fallback and incur cost; reliability remains more important than maximizing local percentage.

## Rejected trade-offs

- Lowering the quality bar to increase local utilization.
- Adding a provider selector or visible local badge.
- Centralizing prompts, schemas, or capability truth inside infrastructure.
- Using a learned adaptive router before deterministic job rules are measured.
- Charging a cloud-generation quota for successful on-device work.
- Hiding cloud fallback when the job’s privacy class does not authorize transmission.

## Reductive design decisions

- Enhance existing generation calls; add no new user-facing surface.
- Reuse named AI jobs rather than inventing a second taxonomy.
- Replace duplicated client/server job unions with one shared contract where practical.
- Add one provider ladder and one promotion state per job, not feature flags scattered across screens.
- Refuse a universal on-device agent, provider settings, badges, dashboards, or “economy” copy.
- Keep the first production behavior deterministic by job and cohort.

## Activation path

Provider choice is discovered only through better product behavior: faster answers, offline-capable bounded work, fewer quota interruptions, and unchanged or improved output quality. No education is required for ordinary use.

Internal activation begins when an eligible physical device encounters a promoted job. Development and Andrew-only builds may expose content-free route diagnostics, but production UI remains provider-neutral.

Natural adoption means users continue completing the same jobs with equal or lower correction burden while local completion share rises and cloud spend per successful job falls.

## Stated bet

We’re betting that a meaningful portion of Kwilt’s recurring generative workload consists of bounded jobs that Apple’s on-device model can complete to the same product standard at lower marginal cost and with better resilience. If local challengers fail task-specific quality, latency, energy, or correction thresholds, we will keep those jobs cloud-default and concentrate local execution on the cohorts that genuinely earn it.

## Success signal

For every promoted job cohort:

- local quality meets the job’s predeclared acceptance floor and is not materially worse than the cloud champion;
- physical-device p95 latency meets the job budget;
- correction, retry, and fallback rates do not materially increase;
- successful local generations incur no cloud inference request or cloud-generation quota;
- energy, thermal, memory, and cancellation behavior remain acceptable under repeated use;
- one job can be rolled back independently without changing the visible product flow.
