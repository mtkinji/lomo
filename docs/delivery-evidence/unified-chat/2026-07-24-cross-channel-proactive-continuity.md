# Unified Chat Phase 7 — cross-channel and proactive continuity

Date: 2026-07-24 (America/Denver)

## Goal

Make Kwilt Chat one trustworthy coordination surface across mobile Chat, Phone Agent, and scheduled/background work while preserving capability authority and refusing completion until the authoritative provider has produced the matching receipt or delivery checkpoint.

## Architecture delivered

- `kwilt_agent_threads` and `kwilt_agent_runs` remain the canonical causal history.
- Runs now persist `initiator`, `trigger_kind`, stable `trigger_id`, and optional `parent_run_id` alongside `origin_channel`.
- Trigger kinds are deliberately finite: user message, reminder, recurring Kwilt action, monitor, background analysis, and native-device enforcement.
- Channel retries keep the original external request id. A completed/partial replay loads its already-persisted assistant message and does not call the model or tools again.
- `kwilt_agent_work_items` is the durable occurrence ledger for proactive work. It is owner-readable under RLS and service-write-only.
- Work completion is kind-specific:
  - reminders require a delivery checkpoint;
  - recurring Kwilt actions require an applied capability receipt;
  - monitors require both a persisted observation and delivery;
  - background analysis requires a completed/partial canonical run;
  - native enforcement requires a completed native client action.
- Scheduled Phone prompts now enqueue and claim a reminder work item, persist its Twilio delivery checkpoint, and link the prompt back to that occurrence. A delivered reminder is not treated as an Activity, Plan, or other capability mutation.
- Mobile thread hydration retains origin/trigger provenance and projects calm causal labels such as `Started by Phone Agent` and `Prepared in the background`.
- Shared runtime package imports use explicit `.ts` specifiers so the same capability manifest and policy code bundles in Expo/TypeScript and Supabase Edge Functions instead of being copied into a server-only catalog.

## Automated proof

- Seven focused Jest suites passed: 65 tests covering provenance normalization, invalid trigger combinations, terminal replay, stable retry identity, every proactive completion policy, SQL security/lease/owner contracts, Phone reminder ledger usage, and mobile timeline projection.
- App and test TypeScript checks passed.
- Targeted Deno checks passed for `agent-run`, `agent-channel-tick`, `phone-agent-tick`, and their shared coordination modules.
- The Supabase migration dry-run isolated exactly the ten July 23 Chat prerequisites plus Phase 7. No older migration or history repair was included.
- Final `npm run verify:changed -- --run` passed: 279 Jest suites / 2,015 tests, 14 Deno tests, 27 Chat contract tests, app/test typechecking, Deno function checks, code-health ratchets, product/delivery lint, protocol conformance, and architecture lint. The only warnings were the standing seven unreferenced feature briefs and eleven legacy raw-Text files.

## Production deployment proof

- The July 23 Chat prerequisite migrations are recorded remotely through `20260723194500`.
- Phase 7 migration `20260725032643_agent_work_continuity.sql` is recorded remotely.
- The first Phase 7 attempt stopped safely on a legacy backfill collision: historical user messages can legitimately have more than one run. The migration transaction rolled back. The backfill was corrected to give legacy runs unique ids while keeping stable ids for all new triggers, and the second application succeeded without deleting or repairing history.
- Active Edge Function versions after deployment:
  - `agent-run` version 1;
  - `agent-channel-tick` version 1;
  - `phone-agent-tick` version 21 (the final deployment also requires a non-empty Twilio SID before checkpointing delivery).
- Anonymous production probes were denied with HTTP 401 for the work-item table/RPC and all three affected endpoints. This proves the unauthenticated boundary, not owner-level RLS behavior.
- The linked database lint still reports two pre-existing errors in `public.kwilt_is_member` and `public.accept_budget_household_invite`. Neither references the Phase 7 tables or functions. The Management API advisor request returned 401 for the locally available access token, so no separate Security/Performance Advisor success is claimed.

## Honest unverified boundary

- No real proactive work item was inserted merely for proof; production verification was non-mutating.
- Authenticated owner RLS, service-role completion RPC behavior, and a live Twilio delivery were not exercised with production user/provider credentials.
- No signed Phone-to-mobile request, mobile continuation, native pending-action completion, or receipt return was exercised while the user was away.
- No physical-device, TestFlight processing/install, or outbound voice evidence is claimed.
- Phase 6 multimodal attachments/artifacts remains paused.
- Weekly Options remains a separate draft product. Phase 7 supplies its coordination substrate but does not ship its schedule setup or review UI.

## Next runtime proof

When device/provider access is available, use one linked Phone Agent account and one clean Chat thread to prove:

1. a Phone request creates one run, then a forced delivery retry reuses that run and persisted answer;
2. mobile Chat opens the same thread and shows the Phone source plus the same proposal or pending native action;
3. a native-only action stays pending until the device reports completion;
4. one scheduled Phone reminder creates one work item and one Twilio SID without implying a capability mutation;
5. a real recurring action cannot reach `completed` before its capability receipt is `applied`.
