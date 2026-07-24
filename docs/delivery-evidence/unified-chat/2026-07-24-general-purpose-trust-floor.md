# General-purpose trust floor — 2026-07-24

## Objective

Answer ordinary questions competently without weakening Kwilt's capability-first behavior, least-privilege context boundary, or action truth. Requests that depend on fresh external facts must use source-backed search and expose inspectable citations.

Base app commit: `607e0b3` (`refactor: centralize capability manifest`).

## What changed

- The top-level prompt is layered as competent general assistant, Kwilt voice, privacy and action truth, discovered capabilities, then coaching only when the request activates a Kwilt job.
- Harmless requests with action verbs now fall back to useful general assistance instead of asking which Kwilt capability owns them.
- Specialist, immediate-safety, unsupported financial-effect, native-authorization, and false-success boundaries have deterministic fences.
- Semantic routing declares stable knowledge or current verification. Deterministic routing protects obvious current-information cases and rejects semantic routes that drop required capability scope.
- Current-information execution uses an OpenAI Responses API request with hosted `web_search`. Citation-free, malformed, duplicate, or non-HTTPS sources are rejected.
- The AI proxy accepts `/v1/responses` only for `current_information`, allows only hosted `web_search`, forces `store: false`, clamps output, and records Responses token usage.
- The workbench renders source links through `source.open`; native code opens only HTTPS URLs present in a persisted assistant message in the current thread.
- `npm run chat:live-eval` runs the standing routing matrix and answer/safety cases against the hosted provider. `--answers-only` resumes the answer slice without repeating route calls after a rate-limited run.

## Regression-first evidence

Red tests and live runs exposed: missing search contracts; prompt layers in the wrong order; harmless concrete `make` requests becoming Kwilt action clarifications; ambiguous `change it` requests being allowed to claim false completion; ordinary recipes and current weather being routed as specialist boundaries; scheduling actions losing either their To-do mutation contract or Plan scope; money transfer being assigned to Account; short day follow-ups losing Plan; cross-capability review omitting Plan; and native-effect prose that denied access without naming native authorization. Each now has a deterministic regression fence or standing live case.

## Proven

- Focused prompt, routing, search-response, execution, proxy-model, and protocol tests pass: 10 suites and 201 tests.
- App TypeScript, test TypeScript, and every Supabase Edge Function Deno check pass.
- The hosted workbench passes 86 tests, lint with one pre-existing Hook warning outside Chat, and a production build. Its exact source commit is `7dc7f951a6377cd4a8549604b9d0e0e0b80e1446`.
- Cross-repository protocol conformance accepts the credential-free source command against that exact workbench commit, the Giraffed adapter, and the canonical v2 fixture.
- The diff-derived completion gate passes: 275 Jest suites / 1,963 tests, 14 Deno tests, 27 durable Chat contracts, app and test typechecks, Supabase typechecks, code-health ratchets, product and delivery lint, protocol conformance, code-map generation, and architecture lint. The only warnings are pre-existing repository-wide feature-brief registration and raw-`Text` notices outside this change.
- `phase4-live-model-eval.json` passes 39/39 cases and 25/25 safety-critical cases. It covers all 30 standing routes plus ordinary, context-visible, medical, self-harm, legal, financial, native-effect, and money-effect answers.
- A direct hosted-provider smoke returned a useful two-sentence tides answer without Kwilt workflow forcing.
- The deployed proxy returned `404 not_found` for `/v1/responses`, proving source implementation is not deployment evidence.

## Unverified and blocked proof

- The changed `ai-chat` Edge Function has not been deployed. Deployment requires explicit authorization.
- No hosted or signed-simulator current-information answer with working citations has been proven.
- The signed simulator matrix is pending because the Mac re-locked. Required rows remain Kwilt-native, context-enhanced, ordinary general, and current-information.
- No physical-device, TestFlight, Phone Agent, or production cross-channel claim is made.

Phase 4 is not complete until the current-information provider path and all four signed-simulator rows are proven, followed by `npm run verify:changed -- --run` against the final phase diff.
