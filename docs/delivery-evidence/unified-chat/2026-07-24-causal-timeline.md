# Unified Chat causal timeline proof — 2026-07-24

## Scope and source

- Product phase: Phase 1, make conversation causality trustworthy.
- Native host and trust-contract commit: `7658e1c54160121a80e9ab3334a775ce40b1d236` on `codex/kwilt-chat-trust-program` (base `e5eb0a156ecdee6ef7f7d7ce19effef9d1becb08`).
- Renderer: `8585014508bb8d61811ed4df207b477fc88fa716` on the clean `codex/kwilt-chat-trust-program` worktree in `kwilt-site`.
- Giraffed compatibility fixture: `9549e5036d528424110196db521da5aeaf8bb0f2`.
- App source version: `1.0.94 (94)`.
- Runtime: signed-in iPhone 17 Pro simulator on iOS 26.4, native development client connected to Metro on port 8083 and the exact local renderer on port 3012.

## What changed

- The web workbench resolves the native host's canonical `snapshot.timeline` instead of globally rendering messages, evidence, proposals, and receipts in separate artifact buckets.
- A receipt remains attached to the proposal turn that caused it. When a later turn already exists, an appended correction communicates the late apply or undo without rewriting history.
- Generic mutation receipts expose the authoritative Undo action, not only inventory-specific receipt variants.
- Missing timelines and dangling references fail explicitly.
- Cross-repository protocol conformance now requires and inspects the real `kwilt-site` renderer instead of silently skipping it.

## Automated proof

Observed before this evidence note was written:

- `kwilt-site` Jest: 85/85 tests passed.
- `kwilt-site` production build: passed. It retained one pre-existing `KeepHeroPreview.tsx` hook warning and outdated `caniuse-lite` notices.
- Giraffed compatibility adapter: 1/1 targeted test passed.
- Kwilt Chat contracts: 27/27 passed.
- Protocol conformance: native fixture, Giraffed adapter, and real `kwilt-site` renderer passed.

The final diff-aware Kwilt verification is rerun after this note and recorded in the phase handoff.

## Signed-simulator proof

The deterministic fixture names `Phase One Fixture` and the ordinary question about lunar phases contain no customer data.

The recording proves this sequence:

1. A proposed date update exists in its originating turn.
2. A later, unrelated general-purpose question and answer are appended after it.
3. Applying the earlier proposal updates the original proposal and inserts its authoritative receipt beside that proposal rather than at the end of the later turn.
4. Reload preserves the causal placement and appends `Applied an earlier change` after the later turn.
5. Undo changes the original proposal and receipt to undone/restored state.
6. A second reload preserves that state and appends `Undid an earlier change` after the later turn.

Artifacts:

- [Sanitized causal timeline recording](phase1-causal-timeline-sanitized.mov)
- [Undone timeline after second reload](phase1-causal-timeline-undone-after-reload.png)

An earlier attempted recording was deleted because the context picker exposed customer object titles. It is not part of the evidence bundle.

## Proven and unverified boundaries

Proven:

- The clean real renderer consumes canonical host order.
- Two-turn proposal, general-answer, late-apply, reload, undo, and second-reload behavior is causally stable in a signed-in simulator.
- Apply and undo reached the authoritative native mutation path for the deterministic To-do.
- The ordinary question was answered as a normal general-purpose turn without forced Kwilt context.

Still unverified:

- These renderer commits are not deployed to `www.kwilt.app`; production still needs an explicit deployment and source-SHA check.
- No signed physical-device run has exercised this renderer.
- This phase does not prove current-information search, attachment handling, provider effects, Phone continuity, or queued/background runs.
- The simulator logged that `kwilt_agent_profile_projections` is missing from the connected PostgREST schema cache. Profile projection remains an undeployed-server boundary, not a Phase 1 renderer failure.
- The deterministic proof left test To-do fixtures in the signed-in account. Deleting them through Chat would create additional mutation history; cleanup remains explicit follow-up rather than an unrecorded backend edit.
