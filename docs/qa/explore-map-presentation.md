# Explore map presentation — local test checkpoint

## Scope and provenance

Implementation runs in `/Users/andrewwatanabe/Kwilt`, branch `codex/plaid-production-completion`, base `88cb2b77a700c9da59f482a0e2a30f2df781ccd2`, with uncommitted Explore work and unrelated Money, Plan, and Focus work preserved. No commit, push, migration, or release was performed.

The iPhone 17 Pro Simulator (iOS 26.5, `D437E709-EF87-49B1-A6C1-7AE350C0BF8A`) received a rebuilt native Debug shell, build 118. Build log: `/tmp/kwilt-path-fidelity/presentation-native-build.log`. Metro belongs to this checkout on port 8081; its IPv4 status endpoint was verified after restarting the stalled prior server. Log: `/tmp/kwilt-path-fidelity/metro-presentation.log`.

## Implemented behavior

- Completed deliberate paths use one native green history overlay, without individual white casings. Repeated coincident traces do not accumulate opacity.
- Only the active deliberate recording or one reviewed completed recording receives elevation colors and a thin casing. Recording takes precedence.
- Review remains highlighted at full playback progress. The whole reviewed session stays out of history while scrubbing; unseen points cannot leak through it.
- Round stroke caps/joins preserve geographic vertices. Native gradient width no longer doubles the requested value.
- At most one recording-start and recorded-end marker is shown; genuine gaps remain unconnected and are explained in review. Rendering chunks do not create gap metadata.
- Pan/zoom does not replace path geometry. History geometry also remains independent of new foreground samples.
- My Path controls both layers. Silver Mist and Places remain separate. Android retains the existing renderer.

Initial tuning remains history `#5F7E54`, 3 points at 0.55 opacity (0.30 with foreground); foreground 4.5 points, white casing 6.5 points at 0.85 opacity. This is an initial local visual checkpoint, not Andrew's final visual acceptance.

## Source and native verification

- Policy, recorded-geometry, and screen tests: 56 passing tests across three suites, including full review, scrubbing, close, recording precedence, gap metadata, long chunks, and stable pan references.
- Native raster/order probes: three passing tests on macOS. Twenty identical compound traces match one trace within one alpha level, disconnected pixels stay uncovered, round caps preserve the declared footprint, and the native gradient width calculation rasterizes to the requested 4.5 points at two scales and zoom factors. These probes do not substitute for a full MapKit tile/performance test.
- Production insertion-method probe verifies history below casing below color through refresh permutations.
- The Maps patch applied to a fresh official 1.20.1 package with `patch-package --error-on-fail`; the resulting AirMaps sources exactly matched the built sources.
- Final completion verification (rerun after the drawer-fit and active-recap corrections): app/test typechecks and native probes passed; 1,191 Jest suites and 7,438 tests passed. Three unrelated suites failed because their migration SQL files are absent: contextual UGC safety, individual-first meal plan authority, and legacy planned-recipe scale repair.

## Runtime evidence and open checks

Local screenshots (precise location data remains outside the repository):

- `/tmp/kwilt-path-fidelity/presentation-baseline.png`: earlier outlined-history rendering before the native change.
- `/tmp/kwilt-path-fidelity/presentation-overview.png`: new neighborhood overview.
- `/tmp/kwilt-path-fidelity/presentation-street.png`: new street-level overview.

Native inspection confirmed exactly one `AIRMapHistoryOverlay` in browsing, at opacity 0.55 and the intended green. Evidence: `/tmp/kwilt-path-fidelity/presentation-native-inspect.log`.

The first controlled drive after native installation retained 22 observations and exposed a 20-second gap around lock, plus an initial deliberate wait before movement. Review correctly left gaps unconnected. This run does not prove dense capture and remains a caution for cold-start/handoff follow-up. Sampling during that run found busy JavaScript serialization rather than a history drawing stack. This is diagnostic evidence, not a confirmed root cause.

A second warmed replay retained 36 observations across screen lock/resume, producing one continuous five-vertex trace. Production geometry measured a maximum reference-to-line deviation of 2.515 meters, endpoint error zero, and maximum observation interval 5.4 seconds. Evidence: `/tmp/kwilt-path-fidelity/presentation-locked-drive.json`. This is controlled Simulator evidence, not field accuracy proof.

The review map fit was corrected after visual inspection to reserve the drawer's height, including when Replay starts. Runtime review shows both markers above the drawer and no gap warning for the continuous replay. At 83% scrub, the recording-end marker disappears and only the foreground prefix remains. Screenshot: `/tmp/kwilt-path-fidelity/presentation-review.png`.

An older pending recap is now suppressed while deliberately recording, preventing it from covering the live path. A regression reproduces the previous obstruction.

Completed-session integrity was checked before and after review, scrubbing, closing, fog changes, and panning: all 73,292 raw points across 40 completed sessions retained identical hashes. Local digest files: `presentation-before-interaction.json` and `presentation-after-interaction.json` under `/tmp/kwilt-path-fidelity/`.

The app remained in the same process through pan away from history, recenter, zoom, two recordings, screen lock/resume, and review. This supports the local checkpoint; a controlled five-minute continuous gesture/performance benchmark has not been claimed.

### Proof boundaries

A matched warmed memory/frame baseline was not captured before the source transition. RSS snapshots from differently warmed/instrumented development processes cannot establish the plan's +20% memory / +10% p95 frame targets. Those comparative performance targets, extended physical-device recording, and production readiness remain open. No geographic smoothing, legacy repair, arbitrary history browser, recap redesign, or Android parity is claimed.


## Personal path heatmap trial — September 8 follow-up

Andrew requested a legibility trial inspired by Strava's personal heatmap, explicitly applying only to path lines. This supersedes the earlier uniform-history color decision; previous screenshots and measurements above describe the prior version.

The current trial keeps one native history overlay but preserves each outing's ownership across continuity gaps and rendering chunks. It draws a combined dark edge once, a clearly visible green core, then blends each outing's compound footprint once toward pale mint. Identical samples, retracing, and chunk overlap within one outing cannot increase its heat. Separate outings brighten progressively toward a color ceiling. Stroke width does not grow with frequency. Fog data, clearing radii, Places, capture, raw storage, and foreground selection are unchanged.

Initial trial: core `#4CA77F`, width 4 points; combined edge width 6 points; pale-mint blend 16% per outing; overall opacity 0.94 in browsing and 0.62 with a foreground path. Existing My Path remains the visibility control; no new controls or dependencies.

Reference: Strava Help Center's heatmap guide, consulted September 8 in the preceding discussion. Preserve: accumulated personal travel and higher contrast on satellite. Translate: restrained green-to-mint frequency within Kwilt's existing line layer. Reject: community heat, competitive metrics, additional settings, or changes to fog coverage. The current user decision and Kwilt's owned MapKit adapter govern this trial; generic component-system replacement is unnecessary.

Verification: three pure ownership/geometry tests and 39 screen tests pass. Four native probes pass, including the new raster regression: 20 overlapping copies in one outing equal one copy; four separate outings brighten more than one; 100 outings saturate without increasing the stroke footprint or filling a genuine gap. Native Debug build succeeded. Runtime screenshot and completion-check results follow below.


Heatmap trial runtime: installed and inspected on the same iPhone 17 Pro Simulator with build 118, native process 14127, Metro on 8081. Native inspection reports one history overlay with 14 outing footprints at opacity 0.94. Neighborhood and street zooms plus pan/recenter were checked. Fog retains its prior footprint. Screenshots: `/tmp/kwilt-path-fidelity/heat-overview.png` and `/tmp/kwilt-path-fidelity/heat-street.png`. Legacy irregular geometry remains visible at street zoom; it was not rewritten.

The regenerated patch applies to fresh official Maps 1.20.1 and matches built AirMaps sources. Completion verification reports 1,192 passing suites and 7,441 passing tests; the same three missing-migration suites remain failing. Logs: `heat-verify.log`, `heat-native-tests.log`, `heat-native-build.log`, and `heat-inspect.log` under `/tmp/kwilt-path-fidelity/`. No commit or push was performed.
