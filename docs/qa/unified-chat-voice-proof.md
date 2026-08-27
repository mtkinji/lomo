# Unified Chat voice proof

Status: source-complete; hosted and signed-device proof pending

Owner: Unified Chat

Last updated: 2026-08-26

## Purpose

This record keeps source tests, hosted-function deployment, signed Simulator behavior, and signed physical-device behavior separate. A checked source contract does not prove microphone capture, WebRTC playback, Bluetooth routing, background survival, or a deployed provider session.

## Source checkpoint

| Field | Value |
|---|---|
| Checkout | `/Users/andrewwatanabe/Kwilt` |
| Branch | `feature/chat-enhancements` |
| Voice implementation commit | `77c08bf9` |
| Realtime model route | `gpt-realtime-2.1` |
| Input transcription route | `OPENAI_LIVE_TRANSCRIPTION_MODEL`, default `gpt-live-transcribe` |
| Realtime mutation surface | one `kwilt.run` tool; durable Chat remains authoritative |
| Separate speech fallback | retained pending signed-device equivalence proof |
| Completion gate | `npm run verify:changed -- --run` passed at `77c08bf9` |
| Jest evidence | 1,066 suites; 6,175 passed; 2 skipped |
| Deno evidence | 113 passed |
| Other gates | app/test/function typechecks, code-health ratchet, product/chat contracts, generated code map, architecture lint passed |

The completion checkout also contained unrelated, uncommitted Screen Time drawer changes in `docs/agent-code-map.md`, `src/features/account/ScreenTimeProtectionSettingsScreen.tsx`, and its test. Those files were excluded from the voice commit. A signed build must either wait for that work to be committed or removed by its owner, or record a different clean checkout explicitly authorized for runtime ownership.

## Hosted backend gate

The local Supabase CLI is linked to production project `sqxwjtorodqjdfnuvprf` (`Kwilt`). `supabase projects list` did not identify an authorized Kwilt staging project. Therefore no deployment was performed for this checkpoint.

Before hosted testing:

- Select and authorize a non-production Supabase project.
- Confirm that project has the required OpenAI and live-conversation safety secrets without exposing their values.
- Deploy `live-conversation-session` from commit `77c08bf9`.
- Record the project reference, deployed function version, deployment timestamp, source commit, Realtime model, transcription model, and rollback target.
- Smoke-test authenticated ephemeral-session creation and confirm that the returned credential cannot select another model or produce a locally executable tool outside `kwilt.run`.

## Signed runtime provenance

Record one row for every installed binary. Never overwrite a failed attempt.

| Attempt | Environment | Device / OS | App version / build | Git commit | Dirty state | Metro checkout / port | Backend project | Function version | Outcome |
|---|---|---|---|---|---|---|---|---|---|
| pending | — | — | — | `77c08bf9` target | clean checkout required | — | authorized non-production target required | — | not run |

## Scenario matrix

Use synthetic household content. Record run IDs and timestamps, but redact utterance text or object labels that could identify a real household member.

| Scenario | Required environments | Expected authoritative outcome | Evidence |
|---|---|---|---|
| Typed / dictated equivalence | signed Simulator + physical device | same normalized terminal run, target, effect, and receipt | pending |
| Background after acceptance | signed physical device | accepted durable run reaches a terminal state without keeping the app alive | pending |
| Network interruption and retry | signed physical device | visible interruption; stable IDs prevent duplicate effects | pending |
| Explicit spoken stop | signed physical device | active server-owned run transitions through the durable stop contract | pending |
| Steer an active run | signed physical device | first run is stopped or steered and the new instruction is durably correlated | pending |
| Ambiguous write | signed Simulator + physical device | `needs_input` or review; no mutation | pending |
| Confirmed reversible write | signed Simulator + physical device | one capability-owned apply and one authoritative receipt | pending |
| Device-only handoff | signed physical device | pending client action opens the exact native review; server does not claim completion | pending |
| Barge-in | signed physical device | current audio response stops; accepted durable mutation continues | pending |
| Bluetooth route change | signed physical device | input/output route changes do not duplicate or lose the accepted turn | pending |
| Reduced motion and screen reader | signed physical device | understandable state, controls, interruption, and terminal result | pending |
| Fallback transcription / speech | signed physical device | failure is visible and the retained fallback does not create a second business-action path | pending |

## Launch decision

Broad rollout remains blocked until the required physical-device scenarios meet the thresholds in the Unified Chat reliability scorecard, or an explicit waiver names the failed scenario, affected cohort, rollback plan, owner, and expiration date.
