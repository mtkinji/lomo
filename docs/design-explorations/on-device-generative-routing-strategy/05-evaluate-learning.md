# Evaluate Learning: On-device generative routing strategy

## Learning questions

- Can a shared job contract govern mobile local eligibility and server cloud routing without absorbing capability-owned prompts or validation?
- Does on-device opening-title generation remove an extra cloud helper request while preserving useful, specific thread names?
- Are fallback, cancellation, and unsupported-device behavior indistinguishable from today’s visible Chat flow?
- Does local execution improve or preserve physical-device latency, memory, energy, thermal behavior, and responsiveness under repeated use?
- Are job-level quality rubrics sufficient to decide promotion without a learned adaptive router?

## Evidence plan

Supporting evidence:

- all registry, route, provider, title normalization, and cloud-fallback tests pass;
- mobile and Supabase routing resolve the same stable job ids and cloud tiers;
- representative title examples meet the existing title contract: short, specific, plain language, not a summary, date, quotation, or generic label;
- successful local title generation produces no `lightweight_helper` cloud request;
- unavailable or failed local title generation produces exactly one cloud helper request;
- writing-task behavior and fallback remain unchanged after migration to the registry;
- physical iPhone cold/warm and repeated-use observations stay within the declared budgets.

Disconfirming evidence:

- local titles are materially more generic, inaccurate, awkward, or correction-prone than cloud titles;
- registry use forces capability prompts, schemas, or domain validation into shared infrastructure;
- local-first title work delays the visible answer or causes duplicate title updates;
- failed local work routinely adds meaningful delay before cloud fallback;
- repeated use causes unacceptable thermal, energy, memory, cancellation, or frame behavior;
- successful local jobs are still charged against cloud quota or invoke the AI proxy.

## Instrumentation

Record only:

- stable job id and version;
- selected provider tier;
- local availability and outcome;
- content-free fallback reason;
- duration bucket and, in development evaluation, exact local duration;
- whether a cloud request followed;
- app version and coarse device capability.

Do not record prompts, generated titles, summaries, private context, or model transcripts in analytics. Quality evaluation examples belong in checked-in synthetic fixtures or explicit Andrew dogfood notes, not production telemetry.

## Decision rule

After at least 30 cold and 30 warm `thread_title` attempts on Andrew’s eligible physical iPhone, plus repeated-use observation:

- **Proceed** when title acceptance is not materially worse than the cloud champion, local success avoids cloud calls, p95 device behavior meets the job budget, and fallback is duplicate-free.
- **Revise** when quality is acceptable but latency, fallback delay, or lifecycle behavior misses the threshold.
- **Keep cloud-default** when local title quality or device health is materially worse.
- **Expand** to conversation compaction and narrow classification only after the registry itself remains capability-neutral and reversible.

## Current implementation evidence

On 2026-08-15, the iPhone 17 Pro Simulator on iOS 26.5 ran build 106 from
`/Users/andrewwatanabe/Kwilt` on `codex/ai-chat-dogfood` at `0abdf4a4`, with the
working tree intentionally dirty and Metro serving that checkout on port 8081.

- `Proofread: I can't make it tonite` completed as `I can't make it tonight.` through Apple Foundation Models.
- Simulator network logs showed no `ai-chat` request during that successful local turn.
- A punctuation-free `Proofread I can't make it tonite` initially missed the local classifier and used cloud. A regression test now covers that ordinary phrasing, and the classifier accepts it without relaxing the private-context, attachment, web, retry, or history-dependent exclusions.
- Automated tests prove unavailable, failed, invalid, and cancelled local outcomes retain the cloud or interruption behavior appropriate to the job without duplicate answers.
- Automated title tests prove successful local opening titles bypass the helper request and invalid or unavailable local titles make exactly one cloud fallback request.

Simulator proof establishes wiring and fallback logic, not production latency or device health. Fresh-thread title observation and the 30 cold / 30 warm title corpus remain open for Andrew's signed physical iPhone, along with energy, thermal, memory, and repeated-use observation.

## Expected next action

If the first cohort passes, add `conversation_summary` as the next challenger, then evaluate Activity enrichment and context-free drafting. Keep Arc, Goal, Chapter, private-context, and consequential judgment jobs cloud-default until their separate rubrics and corpora are accepted.
