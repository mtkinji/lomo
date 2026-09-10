# Connected Moments v2 implementation evidence

September 9, 2026. The canonical contract is [the v2 PRD](../../../docs/feature-briefs/kwilt-home-connected-moments.md). This records implementation evidence, not TestFlight or App Store availability.

## Source and runtime

- Checkout: `/Users/andrewwatanabe/Kwilt`, branch `main`, base HEAD `9db7bd690f63936641588a61e974d0d6f07db8b3`, dirty working tree. Existing Home and unrelated changes were preserved; no worktree or commit was created.
- Native: iPhone 17 Pro Simulator, iOS 26.5, UDID `D437E709-EF87-49B1-A6C1-7AE350C0BF8A`. Installed Kwilt development client 1.0.121, Expo runtime `exposdk:55.0.0`; JavaScript served from this checkout on Metro port 8081.
- Populated screenshots use the explicitly labeled local fictional preview. Its repository is in memory. No fictional personal post was published to a real household.

## Implemented scope

People/household catch-up and history; authorized appreciation and reply previews; mixed posts and a four-photo gallery; source actions and explicit private Explore copies; automatic household chore cards; private saves and optional collections; full-page composer, durable drafts and queued source offers; virtualized paging, queued new content and authorized reading-position restoration.

Design pass: neutral canonical actions and confirmation states, 32-point list-owned post separation, 16-point text gutters, constrained media frames, full-screen safe areas, compact keyboard-aware reply dock and a sole primary Post action.

## Backend evidence

Applied successfully to Kwilt project `sqxwjtorodqjdfnuvprf`:

- `20260909151958_home_connected_moments.sql`
- `20260909154905_home_photo_dimensions.sql`
- `20260909155733_home_saved_destinations.sql`

PGlite database suite: 20 tests passed. Includes audience and revocation boundaries, chore authority, seen/saves/collections, private Explore copies surviving source deletion without creating visits, and bounded paired photo dimensions.

Live verification used `scripts/shared-life/live-connected-verification.sql` in a rollback-only transaction. Passed private saves, collection deletion without unsaving, authorized preview, outsider and child boundaries, and explicit Explore-copy persistence. Fixtures were rolled back.

## Native checks

- Full-page composer respects the Dynamic Island and keyboard; actions are neutral.
- Four-photo gallery advances explicitly; closing a conversation retains the selected photo (2 of 4).
- A fictional reply was typed and sent; the compact reply control stays above the keyboard.
- Saving does not force organization. Post overflow offers Organize later; a fictional collection was created and selected.
- Mixed authored/place/chore content renders with the 32-point separation and truthful pending approval copy.
- Older moments appended from 30 to 60 posts. Opening Maps and returning retained the older-page reading position; compare the before/after captures.

## Screenshots

- [Home feed](feed-native.png)
- [Full-page composer](composer-native.png)
- [Conversation](conversation-native.png)

- [Mixed feed and post spacing](mixed-feed-spacing-native.png)
- [Reply with keyboard](reply-keyboard-native.png)
- [Private collections](collections-native.png)
- [Before Maps](before-source-return-native.png) / [after returning](after-source-return-native.png)

## Verification and release boundaries

Focused tests cover reaction serialization/refresh acknowledgements, background and account invalidation, foreground paging restoration, reading-anchor fallback, draft/source-offer behavior, uncertain publication reconciliation, native text rendering, and saved-post organization. Final `npm run verify:changed -- --run` exited 0 after the review fixes: app and test typechecks, code-health ratchet, 1,209 Jest suites (7,490 tests passed, 2 skipped), 145 Supabase function tests and function lint, product lint, agent-map regeneration, and architecture lint. Architecture reported 10 existing raw-Text warnings; code health reported non-blocking fixture/test typing warnings. No failed gates remain. The broad Jest run was selected by the diff-aware gate because the dirty baseline includes shared test/runtime changes.

The final review also fixed background empty-feed refresh, foreground restoration request ordering, and filtered-feed anchor calculations. History/Saved pages now retain loaded authorized posts and restore their offset after backgrounding. The focused background/history regressions passed (5 tests).

Logs: [completion gate](completion-verification.log), [database suite](database-tests.log), [background/history regressions](background-history-tests.log).

Remaining release acceptance: physical-device and TestFlight validation, VoiceOver traversal/focus restoration and largest Dynamic Type sizes, and an installed backend-connected photo upload/publish flow. Native fixture Save to Explore is not proof of a complete native import flow; the data behavior is covered by database and live rollback checks. No TestFlight build or app release was performed for this task.
