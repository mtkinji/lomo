# Unified Chat reliability scorecard

Status: canonical measurement contract

Owner: Unified Chat

Corpus: `RELIABILITY_CORPUS_VERSION` from `@kwilt/agent-runtime`

## Purpose

This scorecard measures whether one ordinary-language intent reaches the same governed Kwilt outcome when typed or dictated. It does not turn a source pass, mocked test, or model-written answer into proof that a native action or deployed provider worked.

## Evaluation unit

One evaluation unit is a tuple of:

`corpus version × scenario id × utterance variant × channel × actor fixture × environment × model/prompt/tool versions`

Every attempt keeps its original result. Retries are new attempts linked to the original request; they do not replace a failure. Typed and dictated variants share the scenario expectation but have separate results and latency samples.

## Scores

| Measure | Numerator | Denominator | Launch threshold |
|---|---|---|---|
| Contract validity | scenarios accepted by `validateReliabilityCorpus` | all versioned scenarios | 100% |
| Correct terminal outcome | attempts ending in the declared outcome with every required receipt field | all eligible attempts | at least 98% |
| Tool and argument decision | attempts selecting the expected tool, or correctly selecting none, with schema-valid and fixture-correct arguments | all language-variance attempts | at least 95% |
| Authorization correctness | attempts using exactly the declared authority and no stronger authority | all eligible attempts | 100% for unauthorized-write prevention |
| Cross-channel equivalence | typed/dictated pairs with the same normalized terminal outcome, target, and effect | all completed variant pairs | at least 98% |
| Accepted-turn durability | accepted requests that reach a durable terminal result after retry, disconnect, background, stop, or steer | all accepted durability attempts | 100% in the golden corpus |
| Advertised-provider truth | advertised tool/provider pairs backed by an executable registered handler | all advertised tool/provider pairs | 100% |

An attempt is correct only when persisted state and the authoritative receipt agree. Assistant prose, UI optimism, a proposed mutation, or a handoff opened on the wrong device is not a successful action.

## Denominator and exclusion rules

- Freeze the corpus version before a comparison. Added or changed scenarios require a new version and a new baseline.
- Count every eligible attempt, including timeouts, malformed model output, provider errors, incorrect clarification, duplicate effects, and missing receipts.
- A platform outage may be reported in a separate outage cohort only when an incident identifier and start/end times exist. The raw all-attempt rate remains visible.
- Exclude only a predeclared unsupported environment or a corrupted test fixture discovered before results are inspected. Record the scenario, reason, owner, and decision time.
- Never exclude a result because the wording was difficult, dictation was imperfect, the model chose no tool, or a provider was unavailable; those are measured outcomes.
- A refused, unavailable, needs-input, review, or client-action result is successful only when the scenario declares that exact outcome and no forbidden effect occurred.
- Report sample counts and confidence intervals beside percentages. Do not average percentages from cohorts with different denominators.

## Latency timestamps

Capture monotonic timestamps when possible and persist their wall-clock counterparts for correlation:

| Timestamp | Meaning |
|---|---|
| `input_started_at` | microphone capture began, when applicable |
| `input_finalized_at` | typed submit or finalized transcript |
| `request_sent_at` | client began the authenticated request |
| `accepted_at` | durable run and user input were committed |
| `first_progress_at` | first truthful persisted or streamed progress signal |
| `first_model_token_at` | first provider output, when observable |
| `tool_started_at` / `tool_finished_at` | each governed handler attempt |
| `terminal_at` | terminal run transition committed |
| `client_presented_at` | terminal result, proposal, or handoff became visible |

Primary latency measures are `input_finalized_at → accepted_at`, `input_finalized_at → first_progress_at`, `accepted_at → terminal_at`, and `input_finalized_at → client_presented_at`. Report p50, p95, maximum, sample count, and timeout count. Voice transcription latency is reported separately from durable-run latency.

## Proof environments

Keep these cohorts separate:

1. **Deterministic source tests** — corpus shape, policy, registry, idempotency, and receipt contracts with no network or model-quality claim.
2. **Synthetic model evaluation** — pinned corpus/model/prompt/tool versions against fixture data; useful for comparative quality, not production success.
3. **Local backend integration** — real database transitions and provider handlers against isolated accounts; not hosted-backend proof.
4. **Deployed staging** — hosted Edge Functions, OAuth, queues, and observability with synthetic accounts.
5. **Signed Simulator** — installed-binary provenance recorded; text behavior and native return verified, but no physical-device or microphone claim.
6. **Signed physical device** — typed/dictated equivalence, interruption, backgrounding, OS permissions, device-only handoffs, and exact native return.
7. **Production canary** — consented or synthetic canary accounts with production infrastructure and rollback thresholds.
8. **Production aggregate** — privacy-bounded operational metrics. Never combine these with synthetic evaluation rates.

Each report names app version/build, Git commit and dirty state, backend deployment identifiers, database migration level, environment, device/OS where applicable, actor fixture, corpus version, model, prompt version, tool-registry version, and the evaluation window.

## Release decision

A release report lists every failed scenario and forbidden effect, not only aggregate scores. Any unauthorized write, duplicate consequential effect, lost accepted turn, false completion claim, cross-user disclosure, or device-only action reported as server-completed blocks promotion regardless of the average. Source/test, hosted backend, signed app, ChatGPT connection, submission, and public release remain distinct gates.
