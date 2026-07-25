# Kwilt Chat trust-program baseline — 2026-07-24

## Scope

- Product goal: make Kwilt Chat the most trustworthy way for Kwilt customers to understand and act on their lives through Kwilt, while remaining a competent, honest general-purpose assistant for ordinary questions.
- Baseline source: `e5eb0a156ecdee6ef7f7d7ce19effef9d1becb08` (`main` at capture time).
- Review branch: `codex/kwilt-chat-trust-program` in `.worktrees/kwilt-chat-trust-program`.
- App source version: `1.0.94 (94)` in `app.json`, `app.config.ts`, and `package.json`.
- Phase 0 changes are documentation and evaluation-contract metadata only. They do not change request routing, prompt assembly, tool execution, persistence, rendering, or mutation behavior.

## Automated baseline

The following command ran from the clean baseline before Phase 0 edits:

```sh
npm run lint && npm run lint:tests && npm test -- --runInBand && npm run product:lint && npm run architecture:lint && npm run test:chat-contracts
```

Observed result:

- app typecheck: passed;
- test typecheck: passed;
- Jest: 270 suites and 1,907 tests passed, with a non-failing open-handle warning;
- product lint: passed with seven pre-existing unreferenced-brief warnings;
- Chat delivery lint: all ten steps remained 4/5 with no errors;
- architecture lint: passed with eleven pre-existing raw-`Text` warnings outside Unified Chat;
- Chat contract tests: 27/27 passed;
- protocol conformance: Kwilt fixture and the Giraffed compatibility adapter passed, but `kwilt-site` was skipped because the script derived a nonexistent companion lane.

This is automated local proof only. It does not prove mobile interaction, deployment, provider effects, or cross-channel continuity.

## Proof-class ledger

| Proof class | Current evidence | Proven | Unverified boundary |
| --- | --- | --- | --- |
| Automated | Baseline command above; standing routing, operation coverage, migration, delivery, and protocol suites. | Current source typechecks and all baseline suites pass. | Live-model quality and real external providers are not exercised. The real `kwilt-site` renderer is not currently required by conformance. |
| Signed simulator | `2026-07-22-simulator-global-entry.md`, `2026-07-22-simulator-ten-step-matrix.md`, `2026-07-23-natural-language-app-control.md`, and `2026-07-23-local-runtime-boundary.md`. | Prior signed-in simulator runs proved global entry, the earlier ten-step slice, natural-language app control, and a local Plan referent/proposal path at their recorded source versions. | No fresh 2026-07-24 run proves the trust-program baseline. Later code/test additions, current v2 causal rendering, apply/reload/undo, general-purpose behavior, search, and current source version remain unproven in a simulator. |
| Signed physical device | `2026-07-22-physical-device-attempt.md`. | A paired iPhone 16 was selected and compilation reached framework signing. | Signing failed because the login keychain was unavailable. No binary was installed or exercised; this is blocker evidence, not product proof. |
| TestFlight | Source files consistently declare `1.0.94 (94)`. | Version-source consistency only. | No build acceptance, App Store Connect processing, tester assignment, installation, launch, or Chat interaction proof is recorded for build 94. Each remains a separate required observation. |
| Hosted workbench | `2026-07-22-production-platform.md` records deployment `dpl_DzBJXu57uhbkh1qjT6jknLzcDr8n` and the then-served production workbench. | The recorded 2026-07-22 deployment was READY and served the documented earlier surface. | It is not evidence of the current renderer source. The active `kwilt-site` worktree at `.worktrees/unified-chat-run-plan` is at `bdff79e33b656d45759e920c9d146d68ae48d5d4` with uncommitted workbench/protocol changes. A clean canonical checkout, passing real-renderer conformance, deployment, and deployed source SHA are not yet established. |
| Database migrations | `2026-07-22-production-platform.md` records three trust migrations applied at that time. `2026-07-23-local-runtime-boundary.md` records later migrations as unapplied in that proof. | The three named 2026-07-22 migrations were observed applied in the recorded environment. | Remote state for the later Chat, channel, server-proposal, Profile, Phone, and relationship migrations is not confirmed. The last read-only migration-list attempt returned `401 Unauthorized`; no current remote state is inferred. |
| Edge Functions and workers | `2026-07-22-production-platform.md` records `unified-chat-transcribe` version 1 ACTIVE. Local source includes `agent-run`, `agent-channel-tick`, Phone functions, and related shared code. | Only the recorded transcription deployment is proven. Local automated tests cover later coordinator behavior. | Deployment source SHA and active versions for later functions/workers are not confirmed. Scheduler behavior and queued execution are not proven against the intended environment. |
| Real provider effects | Earlier simulator evidence records an exact pending Plan proposal without approval. | Proposal staging and capability contracts are proven locally. | Calendar creation, recovery, undo, notification delivery, Screen Time enforcement, and other provider/OS effects are not proven for current source. A staged proposal is not provider-effect evidence. |
| Phone Agent and cross-channel continuity | Local source and tests cover the canonical queued coordinator, staged proposals, relationship operations, and deterministic action truth. | Code/test behavior only. | Required migrations/functions, signed Twilio traffic, a phone-started run appearing in the same mobile thread, duplicate-free continuation, and mobile review/apply remain unproven. |

## Known baseline contradictions and risks

- The previous `docs/ai-chat-architecture.md` described Chat as a fixed-mode bottom-sheet workflow with no global thread inbox. That is legacy contextual-workflow architecture and contradicted the shipped standalone Unified Chat direction.
- The native host builds a canonical v2 `snapshot.timeline`, while the active hosted-workbench source still requires Phase 1 inspection and repair to prove that the real renderer consumes it rather than rebuilding chronology from artifact buckets.
- Cross-repository conformance can pass while silently skipping `kwilt-site`; Phase 1 must make missing, stale, or incompatible real renderer source fail.
- Existing 4/5 delivery scores correctly preserve the missing signed physical-device boundary.

## Phase 0 decision

The accepted feature brief, current architecture document, standing typed product outcomes, and this proof ledger are the baseline contract. Runtime behavior remains unchanged until Phase 1 begins.
