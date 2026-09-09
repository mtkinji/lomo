# Focus seamless-loop acceptance

This sheet keeps source, transport, Simulator, signed-device, TestFlight, and production proof separate. A source-audit pass does not establish that a user cannot hear the loop.

## Automated gates

- `npm run audio:audit:soundscape-contract` — all visible soundscapes have immutable admitted bytes at 48 kHz stereo.
- `npm run audio:audit:loops -- --enforce <files...>` — source seam passes silence, level, endpoint, and derivative policy.
- `node --test scripts/audio/ios-pcm-cache.test.mjs` — the production Swift cache decodes an admitted MP3 through its exact final frame and reopens the finalized PCM CAF.
- `npm run audio:probe:rendered-loop -- <probe.json>` — at least three natively rendered boundaries, no underruns, and worst jump at or below -36 dBFS.
- `npm run verify:changed -- --run` — diff-routed TypeScript, Jest, product, architecture, and audio gates.

## Simulator

Record checkout, branch, commit, dirty state, Simulator model/OS, and build provenance.

- Start, pause, resume, switch tracks, disable audio, end Focus, and Fast Refresh leave only the current owner audible.
- Canyon Spring, Cedar Workshop, Deep Work Drift, and one additional remote track cross at least three boundaries.
- Background/foreground and an interruption recover without duplicated playback.
- Capture native diagnostics before and after: `completedBoundaries`, `queuedSegments`, `underrunCount`, and `lastErrorCode`.

Status: on 2026-09-07, an iPhone 17 Pro Simulator running iOS 26.5 was rebuilt from the normal `main` checkout at `88cb2b77` plus the working-tree PCM EOF fix. Canyon Spring decoded to a validated 48 kHz stereo PCM CAF with 13,977,600 frames, and the native transport reached `playing` without rollback. The checkout also contained unrelated Explore work. Audible Simulator boundary acceptance and rendered-probe capture remain pending.

## Signed physical iPhone gate

For every row, listen across at least three boundaries at normal Focus volume. Any click, dropout, doubled transient, level pulse, or rhythmic reset fails the row.

| Track | Built-in speaker | Bluetooth headphones | Lock/background | Interruption | Route change | Result |
|---|---|---|---|---|---|---|
| Deep Work Drift | Pending | Pending | Pending | Pending | Pending | Pending |
| Canyon Spring | Pending | Pending | Pending | Pending | Pending | Pending |
| Cedar Workshop | Pending | Pending | Pending | Pending | Pending | Pending |
| Remaining admitted tracks | Pending | Pending | Pending | Pending | Pending | Pending |

The native diagnostics requirement is `underrunCount = 0`, no `lastErrorCode`, and advancing `completedBoundaries`. Listening remains authoritative even when metrics pass.

## Android hardware gate

Compile with JDK 17, then repeat the physical matrix on at least one current Android device. Android parity remains pending until this gate passes. `EXPO_PUBLIC_FOCUS_LOOP_TRANSPORT=expo-only` remains a diagnostic escape hatch, but it is not an acceptable seamless-loop release configuration because end-of-file replay can be audible.

Status: Expo autolinking and `:kwilt-seamless-loop:compileDebugKotlin` passed against SDK 36/JDK 17 on 2026-08-13; Android hardware listening remains pending.

## TestFlight and production

- TestFlight: repeat Deep Work Drift, Canyon Spring, Cedar Workshop, background, interruption, and Bluetooth route-change checks from the signed distribution build.
- Production: promote only after TestFlight acceptance; monitor native error/underrun breadcrumbs by immutable `assetKey` and transport name.
- Playback policy: production defaults to `native-only`. If native PCM preparation fails, stop and capture the error instead of silently switching to the known-gapful Expo transport. `expo-only` is restricted to diagnosis and explicit emergency builds; it does not satisfy the seamless-loop acceptance gate.

Status: TestFlight and production proof pending.
