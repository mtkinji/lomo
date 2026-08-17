# Learning Release: On-device generative routing strategy

## Concept To Build

Kwilt routes registered generative jobs through the lowest-cost provider that has earned the job’s UX standard, beginning with the existing local Chat writing tasks and on-device opening-thread titles.

## Capability Delta

Today, the user cannot:

- rely on one consistent local/cloud execution contract across Kwilt’s named generation jobs;
- receive an automatically generated opening Chat title without an additional cloud helper request;
- trust that local eligibility, cloud fallback, quota treatment, and rollback are governed by the same job policy.

After this release, the user can:

- use the same Chat experience while eligible writing tasks and opening-thread titles prefer on-device execution automatically;
- receive a capable cloud fallback on devices without Apple Foundation Models;
- keep ordinary Chat available when local generation fails or is unsupported.

Still intentionally not supported:

- local Arc, Goal, Chapter, planning, attachment, current-information, image, or tool-orchestration generation;
- bounded private-context local answers;
- learned request-time routing or routine local/cloud racing;
- user-facing model or provider controls.

## User Experience

The user continues using the existing Unified Chat composer and timeline. Provider choice is invisible. On an eligible device, admitted writing tasks and opening-thread titles use Apple Foundation Models. On unsupported devices, cloud behavior remains available. Title generation stays background maintenance and can never delay or fail the answer.

## Existing Product Relationship

This release extends the existing local-first Chat implementation and the existing `KwiltAiJob` cloud model map. It does not create a new surface, conversation store, AI mode, entitlement, or visible setting.

## Buildable Slice

Must be real:

- one portable, typed generation-job registry used by mobile and server cloud routing;
- deterministic provider ladders, privacy/fallback policy, local promotion state, token/input budgets, and cloud tier for registered jobs;
- existing Chat rewrite, proofread, shorten, summarize, and brainstorm eligibility derived from registered job contracts;
- one new `thread_title` job promoted to on-device-first for eligible Apple devices;
- cloud fallback for an unavailable or failed local title generation;
- successful local titles avoid the extra cloud helper request and cloud-generation quota;
- content-free job/provider/outcome/fallback/latency telemetry;
- independent disablement of the local title job through job policy;
- focused tests and physical-device release gates.

Can be thin or temporary:

- promotion status can begin as source-controlled policy rather than a remotely managed service;
- development diagnostics can use existing logs and telemetry rather than a new dashboard;
- the first evaluation corpus can be a checked-in representative set plus Andrew’s dogfood threads.

Intentionally excluded:

- moving every existing AI call through a new runtime in one change;
- on-device conversation compaction, classification, Activity enrichment, or private context;
- production shadow generation that pays for both local and cloud output;
- global model prewarming or session retention;
- changing cloud models merely as part of the local-routing refactor.

## Release Channel

**Local build**, followed by an Andrew-only TestFlight build after source and Simulator verification. The first acceptance claim requires an eligible physical iPhone because Simulator behavior cannot establish latency, energy, thermal, or repeated-use performance.

## Brand-Goodwill Guardrails

- No visible beta badge, provider language, or model selector.
- Title generation remains optional background metadata; failure preserves the existing title.
- A local title must pass the same normalization and safety checks as a cloud title.
- No local-default promotion based only on cost or one favorable example.
- Unsupported devices retain the normal cloud experience.

## Reversibility

Each job has a local promotion state. Disabling local execution for `thread_title` returns that job to the existing cloud helper without changing persisted data, visible UI, or the native module. The portable registry can retain the job contract even when every local provider is disabled.

## Permanent Product Threshold

Promote the registry as Kwilt’s accepted generation-routing architecture when the existing writing jobs and `thread_title` show stable fallback, no cloud request on successful local execution, acceptable repeated-use device health, and local quality that meets the declared task rubric without increased correction burden.
