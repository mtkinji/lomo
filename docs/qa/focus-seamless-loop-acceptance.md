# Focus seamless-loop acceptance

This sheet keeps source, transport, Simulator, signed-device, TestFlight, and production proof separate. A source-audit pass does not establish that a user cannot hear the loop.

## Automated gates

- `npm run audio:audit:soundscape-contract` — all visible soundscapes have immutable admitted bytes at 48 kHz stereo.
- `npm run audio:audit:loops -- --enforce <files...>` — source seam passes silence, level, endpoint, and derivative policy.
- `npm run audio:probe:rendered-loop -- <probe.json>` — at least three natively rendered boundaries, no underruns, and worst jump at or below -36 dBFS.
- `npm run verify:changed -- --run` — diff-routed TypeScript, Jest, product, architecture, and audio gates.

## Simulator

Record checkout, branch, commit, dirty state, Simulator model/OS, and build provenance.

- Start, pause, resume, switch tracks, disable audio, end Focus, and Fast Refresh leave only the current owner audible.
- Canyon Spring, Cedar Workshop, Deep Work Drift, and one additional remote track cross at least three boundaries.
- Background/foreground and an interruption recover without duplicated playback.
- Capture native diagnostics before and after: `completedBoundaries`, `queuedSegments`, `underrunCount`, and `lastErrorCode`.

Status: native iOS compile/link passed on 2026-08-13; audible Simulator acceptance and rendered-probe capture pending.

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

Compile with JDK 17, then repeat the physical matrix on at least one current Android device. Android parity remains pending until this gate passes; the Expo rollback transport remains available through `EXPO_PUBLIC_FOCUS_LOOP_TRANSPORT=expo-only`.

## TestFlight and production

- TestFlight: repeat Deep Work Drift, Canyon Spring, Cedar Workshop, background, interruption, and Bluetooth route-change checks from the signed distribution build.
- Production: promote only after TestFlight acceptance; monitor native error/underrun breadcrumbs by immutable `assetKey` and transport name.
- Rollback: set `EXPO_PUBLIC_FOCUS_LOOP_TRANSPORT=expo-only` in the next update if native transport regressions appear. `native-only` is a diagnostic mode, not the default rollout.

Status: TestFlight and production proof pending.
