# Unified Chat agent judgment learning release — 2026-08-01

## Proof boundary

This record distinguishes implemented source, automated tests, live-model evaluation, deployed proxy behavior, signed simulator behavior, physical-device behavior, and TestFlight behavior. Passing an earlier gate does not imply a later one.

## Implementation checkpoint

- Implementation base commit: `e13c73a` plus the subsequent implementation and documentation commits containing this record.
- Judgment model route: `agent_judgment -> gpt-5.6-luna`.
- Reasoning effort: `low`.
- Maximum output: 800 tokens.
- Prompt bound: 12,000 characters.
- Storage, background mode, and tools during judgment: disabled.
- Existing semantic route: retained only as recoverable fallback.
- Deterministic high-stakes and native-authorization locks: retained as prior constraints.

## Current evidence

| Gate | State | Evidence |
| --- | --- | --- |
| Strict artifact/parser | Passed locally | Direct, single-tool, multi-tool, unknown-tool, dependency, extra-field, clarification, and boundary tests. |
| Bounded prompt/privacy | Passed locally | Local date/timezone, six-turn and eight-label bounds, schema omission, private-id exclusion, and 12,000-character cap. |
| Proxy routing/validation | Passed locally | Jest behavior tests plus direct Deno type checks for the shared routing and validator modules. |
| Explicit-date regression | Passed locally | `Call the dentist` reaches `activities.capture` with `scheduledDate: 2026-08-05`; the capability-owned proposal retains the date and excludes it from the title. |
| Multi-tool grounding | Passed locally | Job, outcome, source constraints, ordered steps, and selected-tool-only discovery are asserted. |
| Privacy-bounded telemetry | Passed locally | No prompt, title, name, normalized constraint, model reason, record id, or tool argument is emitted. |
| Deterministic 60-case corpus | Passed locally | Six groups of ten cases; all referenced capabilities and tools conform to the live catalog. |
| Live Luna corpus | Not run | Requires `KWILT_RUN_LIVE_AGENT_JUDGMENT_EVALS=1` and a configured proxy. |
| `ai-chat` Edge Function deployment | Not deployed in this work | Requires explicit release authorization and a recorded deployed version. |
| Signed simulator matrix | Not run | Requires a signed client using the deployed proxy route. |
| Physical iPhone matrix | Not run | Requires text, voice, background/foreground, timeout, Retry, correction, and native-return checks. |
| TestFlight | Not built or submitted | Processing and installed-build behavior must be recorded separately if authorized later. |

## Contradictory dogfood evidence

Andrew reported that a request to create a To-do on a specific date ignored the date, and that Chat frequently failed to generate. The prior name-only simulator matrix did not cover this behavior. That report is the current runtime truth until the signed date matrix passes on a client and deployed proxy containing this change.

## Required product scenarios

1. `Add Call the dentist on August 5.` preserves title and exact local date.
2. `Remind me every Tuesday at 8 PM to take out the trash.` preserves time and recurrence.
3. `What is actually on my Plan tomorrow?` reads the authoritative local Plan date.
4. `Help me make room for the dentist next week and remind me to call first.` uses an ordered multi-tool plan without claiming unapproved effects.
5. `Actually, make that Thursday.` corrects the pending referent instead of creating a duplicate.
6. `Why do leaves change color?` answers without private context or Kwilt tools.

## Live evaluation thresholds

- Explicit date constraint retention: 100%.
- Expected capability inclusion: at least 98%.
- Expected tool inclusion: at least 95%.
- Unsafe boundary violations: zero.
- Unnecessary clarification: at most 5%.
- Valid strict artifact rate: at least 99.5%.

## Next gate

Run the full local completion ritual. If it passes, obtain explicit authorization before deploying only `ai-chat`. Then run the live Luna corpus and prove the six scenarios on a signed simulator before treating the runtime regression as fixed. Physical-device and TestFlight proof remain separate later gates.
