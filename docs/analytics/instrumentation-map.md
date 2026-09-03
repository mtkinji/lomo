# Kwilt instrumentation map

Last updated: 2026-09-02

This map treats analytics as evidence about completed jobs, not a click inventory. Every client event is filtered at the shared collection boundary. Never attach user-authored text, financial amounts, merchant or transaction data, precise location, navigation parameters, deep links, invite tokens, or raw errors.

## Environment and identity contract

- Production dashboards must filter `app_env = production` unless they are explicitly QA dashboards.
- TestFlight emits the same bounded events with `app_env = test` so funnels can be checked before release without contaminating production.
- `Application Opened`, `Application Became Active`, and `Application Backgrounded` are emitted manually. PostHog automatic lifecycle capture is disabled because it may attach the raw initial URL.
- Screen events contain only the internal route name, `app_env`, and platform. Route parameters are never collected.
- PostHog identity resets on confirmed sign-out and before an account switch.

## Job and outcome coverage

| Job flow / step | Outcome evidence | Source | Current status / gap |
| --- | --- | --- | --- |
| Activation: finish a useful onboarding path | `capability_onboarding_path_completed` | App receipt accepted by the onboarding state machine | Active. `path_id` is a bounded product enum; receipt and user IDs are excluded. |
| Maya: move family life forward — enter focused action | `focus_session_started` → `focus_session_completed` or `focus_session_ended` | Shared Focus session store | Active for Activity and standalone Focus. Duration is bucketed. |
| Maya: move family life forward — create and complete household work | `chore_created` → `chore_completed` | Local Chores store or successful synced mutation | Active. Storage mode and outcome only; no chore/member identifiers or titles. |
| Maya: review budget reality before a decision | `money_budget_answer_viewed` / explanation / rebalance events → `money_trusted_decision_completed` | Successful authoritative Money mutation | Active in source. The first occurrence per person is the first-value measure; no amounts, accounts, merchants, or transaction IDs. |
| Maya: start playing together | `game_timer_started` → `game_timer_completed` | Games timer lifecycle | Active for the timer utility. A common completion/rematch event across all full games remains planned; game-family lifecycle contracts differ today. |
| Explore: preserve a meaningful outing | `explore_recording_started` → `explore_recording_completed` | Explore recorder | Active for manual/foreground recording. Only recording mode and outcome are collected; coordinates, paths, place IDs, and recap content are excluded. |
| Nina: trust AI with my life system — complete a live turn | `unified_chat_conversation_latency` with `outcome` | Unified Chat turn/conversation finalizer | Active. Use `outcome = completed`, `interrupted`, or `failed`; content is excluded. |
| Find and resume existing work | `global_search_result_opened` | Global Search navigation boundary | Active. Result kind and query-vs-recent state only; query text and object IDs are excluded. |
| Maya: establish family Screen Time | setup, agreement, policy, temporary-open, and chat-policy outcome events | Screen Time domain/action receipts | Active in source. Signed physical-device enforcement remains a separate proof gate. |
| Maya: feed household with less work | Recipe → planning → grocery/cart → cook completion events | Food contract builders and capability screens | Active in source; see `household-food-funnel.md`. Retailer handoff and purchase completion remain outside Kwilt's authoritative boundary. |
| David: invite the right people in | Share/join/check-in/reaction events | App plus server/site-owned events | Mixed. App events are active; events classified `server_only` require the companion service/site. Two-account delivery proof is separate. |

## Registry discipline

`eventRegistryCoverage.test.ts` scans app and Supabase source. Any registry event with no source reference must be explicitly classified in `eventDispositions.ts` as `planned`, `server_only`, or `deprecated`. This prevents aspirational event names from being mistaken for shipped instrumentation.

## Proof boundaries

Source and Jest coverage prove the collection contract, not ingestion. A release gate should separately verify a TestFlight session in PostHog under `app_env = test`, then confirm production dashboards filter `app_env = production`. Native Screen Time enforcement, location behavior, live voice behavior, purchase completion, and multi-account sharing still require their own device or backend evidence.
