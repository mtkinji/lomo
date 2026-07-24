# Unified Chat turn-pipeline proof — 2026-07-24

## Scope and source

- Product phase: Phase 2, decompose the turn orchestrator.
- Reviewed source: `1698d0321f8460dfc434a8309bf4073c38eb6513` on `codex/kwilt-chat-trust-program`.
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

A fresh signed-in simulator smoke was attempted after committing the exact source. The Mac was locked, Computer Use could not unlock it, and the app had disconnected from Metro; therefore no Phase 2 simulator claim is made yet.

Phase 2 remains open until the Mac is unlocked and a fresh signed-in simulator smoke proves one ordinary answer and one reviewable Kwilt proposal on `1698d0321f8460dfc434a8309bf4073c38eb6513`. No physical-device or deployed-host claim is implied by that future simulator pass.
