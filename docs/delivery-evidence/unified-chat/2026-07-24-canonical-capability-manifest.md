# Unified Chat canonical capability manifest — 2026-07-24

## Scope and source

- Product phase: Phase 3, create one canonical capability manifest.
- Implementation base: `1f9bc352b9924ab91c0946835509f6c6b0a24a04` on `codex/kwilt-chat-trust-program`.
- Local-only change: no migration, Edge Function, workbench, or provider deployment was performed.

## What changed

`packages/kwilt-agent-runtime` now owns one portable manifest for all 60 user-meaningful Kwilt operations. Each resolved operation records its owner, purpose, input and output schema, effect, consequence, reversibility, confirmation policy, eligible providers, mobile and Phone state, expected outcomes, proof paths, source references, and return behavior.

The 49 versioned tool contracts and their schemas now exist once in the portable package. Forty-eight currently implemented tools are projected into mobile and server catalogs. The remaining `channel.phone.continue_run` contract is explicitly pending rather than advertised as implemented.

The former product operation registry, mobile Chat catalog, server catalog, and Chat coverage table are now small projections:

- `src/capabilities/operations.ts` projects product identity and owner;
- `src/features/unifiedChat/toolCatalog.ts` projects mobile definitions from mobile implementation declarations;
- `supabase/functions/_shared/serverAgentCatalog.ts` projects server definitions from server implementation declarations;
- `src/features/unifiedChat/chatCapabilityCoverage.ts` projects mobile and Phone coverage;
- legacy MCP and agent assets remain accounted for through manifest source references.

No mobile or server schema remains handwritten outside the portable tool-contract source. Provider modules declare tool availability and provider mode without copying operation semantics.

## TDD and drift findings

The red tests first proved that the canonical module and provider declarations did not exist and that the old registries could not be mechanically reproduced. Subsequent red/green slices proved:

- one operation can project into eligible mobile and server runtimes;
- a multi-tool operation projects every required tool without duplicating the operation;
- provider declaration order preserves a stable model-tool catalog;
- duplicate operation ids fail registration;
- consequential operations with no confirmation fail registration;
- missing providers resolve unavailable and device-deferred work resolves pending-client-action;
- product, mobile, server, and coverage projections equal the canonical source.

The first real projection also exposed one existing drift: grouped Plan scheduling was implemented by the server catalog while coverage claimed connector-only eligibility. `plan.schedule_chunks` now truthfully declares both connector and server eligibility.

## Automated proof

- canonical manifest unit suite: 7/7 passed;
- operation, mobile catalog, server catalog, Phone coverage, legacy inventory, request-eval, provider, and coordinator suites: 16 suites and 185 tests passed;
- app typecheck, test typecheck, and portable package typecheck: passed;
- portable package ESM, CJS, and declaration build: passed;
- Supabase Edge Function Deno check: passed for all functions, including the generated server catalog imports;
- Unified Chat migration contract: 21/21 passed.

- final diff-aware gate: `npm run verify:changed -- --run` passed, including 31 related Jest suites / 275 tests, 14 Deno tests, app and test typechecks, Supabase function lint, product and delivery lint, 27 Chat contracts, cross-repository protocol conformance, code-health ratchets, generated code-map refresh, and architecture lint with eleven unchanged warnings.

## Proof boundary

This phase changes catalog ownership and projection, not deployed capability behavior. No fresh physical-device, TestFlight, production workbench, migration, deployed-function, signed Phone, or real-provider claim is made. The latest signed-in simulator behavior remains the Phase 2 smoke recorded in `2026-07-24-turn-pipeline.md`.
