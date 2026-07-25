# Unified Chat turn-pipeline proof — 2026-07-24

## Scope and source

- Product phase: Phase 2, decompose the turn orchestrator.
- Reviewed implementation source: `1698d0321f8460dfc434a8309bf4073c38eb6513` on `codex/kwilt-chat-trust-program`.
- Runtime checkout HEAD: `0db87a85a2adc20b3b8400ff22971c256fb83b59` (the implementation commit plus this evidence document's prior boundary note).
- App source version: `1.0.94 (94)`.

## What changed

`runUnifiedChatTurn` now coordinates six focused modules in causal order:

`persist → plan → authorize context → execute → materialize outcome → finalize`

The coordinator fell from 1,144 lines to 325. Persistence owns durable message insertion, retry validation, attachment validation, and typed cancellation. Planning owns deterministic/semantic request policy and follow-up referents. Context authorization owns private snapshot loading, evidence selection, visible scope events, and evidence persistence. Execution owns tool discovery, providers, prompt grounding, model validation, title maintenance, and visible response construction. Outcome materialization owns messages, proposals, client actions, tool events, Plan referents, and idempotency keys. Finalization owns complete, failed, stopped, and steered run transitions.

Planning failure now creates a durable failed run linked to the saved user message. Persistence failure returns a bounded error before a run exists. Later failures retain typed failure codes without exposing provider or database error details. Completion-looking action prose is rejected before assistant persistence when no authoritative proposal or native handoff exists.

## Automated proof

TDD red/green evidence included:

- the initial phase-interface test failed for all six missing modules and missing coordinator calls;
- planning failure initially leaked the router exception and left no failed run;
- persistence failure initially leaked the database exception;
- completion-looking action prose initially resolved without an authoritative artifact;
- each case passed after the bounded phase behavior was implemented.

Final observed results:

- focused phase, orchestrator, and app-control suites: 4 suites and 56 tests passed;
- diff-related verification: 4 suites and 83 tests passed;
- app typecheck and test typecheck: passed;
- code-health ratchet: passed with no findings;
- product lint: passed with seven unchanged unreferenced-brief warnings;
- Chat delivery lint: passed with all ten steps honestly retained at 4/5;
- Chat contract tests: 27/27 passed;
- cross-repository protocol conformance: current `kwilt-site` renderer, Giraffed adapter, and canonical fixture passed;
- architecture lint: passed with eleven unchanged raw-`Text` warnings outside Unified Chat;
- `npm run verify:changed -- --run`: passed.

Failure injection covers:

- user-message persistence failure before planning;
- semantic planning failure after user-message persistence;
- private-context authorization failure;
- model/provider execution failure;
- assistant outcome persistence failure;
- final completion-transition failure;
- stop and steer transitions;
- invalid action output without a proposal;
- completion-looking action prose without an authoritative artifact.

Existing suites continue to cover routing, title maintenance, proposal staging, Plan referents, receipts through the broader Chat contracts, retry, stop, steer, typed cancellation, and idempotent operation metadata.

## Runtime boundary

A fresh signed-in simulator smoke passed on iPhone 17 Pro, iOS 26.4, after loading the exact checkout through the development client and confirming the existing authenticated session. The local native bundle used port 8083 and the clean `kwilt-site` renderer checkout `8585014508bb8d61811ed4df207b477fc88fa716` on port 3012.

- Ordinary behavior: in a new thread, `Why do tides happen?` produced a direct explanatory answer without private Kwilt context or a proposal. Evidence: [`phase2-ordinary-answer.png`](phase2-ordinary-answer.png).
- Reviewable Kwilt behavior: `Create a goal called Phase Two Proposal Proof.` produced a Goal draft and a review card with `Not now`, `Change`, and `Create`. `Create` was not pressed; no Goal mutation or receipt was produced. Evidence: [`phase2-reviewable-goal-proposal.png`](phase2-reviewable-goal-proposal.png).
- Honest failure observation: a separate attempt to change the scheduled date of the known nonprivate `Phase One Fixture` first asked what should change, then ended as `Work interrupted`. It produced no proposal, receipt, or completion claim and is not counted as successful runtime proof.

This closes the Phase 2 simulator requirement. It does not prove physical-device behavior, TestFlight processing or installation, production workbench deployment, server-function deployment, migrations, or Phone Agent/provider behavior.
