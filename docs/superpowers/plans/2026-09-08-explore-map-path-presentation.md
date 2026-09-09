# Explore Map Path Presentation Implementation Plan

> **For agentic workers:** Use the executing-plans skill to implement this plan task by task, inline in the existing checkout. Subagents require explicit user authorization. Steps use checkboxes for execution tracking. This document authorizes no commit, push, deployment, or worktree creation.

**Goal:** Make accumulated exploration read as a calm green history layer, with one accurate current or reviewed journey clearly emphasized and its recording gaps understandable.

**Architecture:** Preserve canonical session samples and the existing evidence-first geometry pipeline. Render completed history as a single native coverage layer with uniform compositing; retain separate, precision-bounded foreground traces for the active or reviewed journey. Keep map overlays mounted across viewport changes and preserve explicit native drawing order.

**Tech stack:** React Native/Expo, TypeScript/Zustand, react-native-maps 1.20.1 with Kwilt's native patch, MapKit/Core Graphics, Jest, native rendering probes, iOS Simulator.

**Status:** Implemented and rebuilt for local testing. The controlled locked replay and core presentation flows are verified; comparative performance, cold-start capture follow-up, and field acceptance remain open. See `docs/qa/explore-map-presentation.md` for measured evidence and remaining proof boundaries.

> **Later user decision:** The September 8 personal-path heatmap trial supersedes the uniform-history brightness choice below. Repeat outings now brighten line ink toward pale mint; fog clearing remains unchanged. See `docs/qa/explore-map-presentation.md` and the current feature brief for the implemented trial. The original plan below remains as decision history.

## Product decision

The default map should communicate “this is the world I have explored.” Recording or reviewing should communicate “this is this particular journey.” Individual historical trips should not all compete for attention at once.

Audience: aspirational family organizers; representative persona: Maya, revisiting a family outing without wanting to manage a GPS log. This extends the existing Explore framing in `docs/feature-briefs/explore-earned-terrain-and-trace.md`: `jtbd-move-the-few-things-that-matter`, supported by `jtbd-capture-and-find-meaning` and `jtbd-trust-this-app-with-my-life`. The relevant job flow is `docs/job-flows/maya-move-family-life-forward.md`, steps 7–8: participation without admin and continued use because the product feels helpful. This plan makes no delivery-score or shared-family-delivery claim.

Constraint posture: extend the existing map presentation, session review, and native patch. No new mode selector, new settings, onboarding, route editor, or activity feed.

### Learnings carried forward

1. High-contrast outlines on every recorded outing create parallel rails, repeated corners, and visual clutter.
2. Recovering the green stroke exposed the underlying history complexity; color order alone does not provide hierarchy.
3. Some endpoints represent actual recording boundaries or missing observations. Connecting them cosmetically would recreate the accuracy problem.
4. Current code requests round caps/joins, yet overlapping strokes and angular source geometry still look sharp. Inspect the actual native result rather than assuming a prop proves the result.
5. The native gradient renderer currently doubles requested stroke width. Outline and color widths therefore cannot be judged from their React values alone.
6. Viewport-driven overlay removal/reinsertion reproduced an AIRMap/Fabric crash. Keep that fix.
7. Native polyline refreshes can reorder overlays independently of React child order. Keep explicit layer ordering and its regression.
8. Existing sparse history cannot be made accurate by presentation work. Compare old history and controlled new recordings separately.

Evidence: `docs/qa/explore-path-fidelity.md`; local screenshots and replay fixtures under `/tmp/kwilt-path-fidelity/`. Do not turn precise historical coordinates into committed test fixtures.

### Reference decisions

- [Strava Personal Heatmaps](https://support.strava.com/en-us/articles/15402028-personal-heatmaps): borrow the separation between accumulated travel and individual activities. Do not copy frequency-driven saturation or add a heatmap settings surface.
- [Strava activity maps](https://support.strava.com/en-us/articles/15401981-viewing-activities): borrow the clarity of inspecting one outing. Do not import competition, segments, or performance dashboards.
- [Fog of World](https://fogofworld.app/en/): borrow the emphasis on explored territory. Do not add achievements or automatically fill missing routes.

The previous discussion considered unified history, one highlighted journey, and territory-first presentation. Choose unified history plus one highlighted journey. Territory-only remains the simplification fallback if even a restrained history layer still obscures the map.

## Visible experience

| State | History | Foreground | Endpoints and gaps |
| --- | --- | --- | --- |
| Browsing | Restrained green coverage, no per-trip white borders | None | No endpoint decorations on background trips |
| Recording deliberately | Completed history stays quiet | Active journey only, strong colored stroke and thin casing | Start marker and existing live location indicator; no invented finish |
| Reviewing one completed journey | Other completed journeys stay quiet | Reviewed journey remains highlighted even at playback progress 100% | One recording-start and one recording-end marker; genuine gaps remain visible |
| Scrubbing a review | Excludes the entire selected journey | Selected journey only up to playback cutoff | Cursor identifies progress; unseen remainder cannot leak through history |
| Multi-session or ambient recap | Quiet completed deliberate history | None | Existing recap remains; do not guess one journey to highlight |
| My Path disabled | Hidden | Hidden | Path-specific decorations hidden; existing location and Places behavior preserved |

Recording takes precedence over review. Ambient acquisition never becomes a foreground path. Closing review restores browsing. Starting recording clears transient review/playback state to avoid competing contexts.

First release selects a completed journey through the existing single-journey recap Review action. A browser for arbitrary old journeys is outside this slice; do not claim that every historical outing is selectable yet.

### Visual contract

Initial tuning values, measured in screen points rather than meters:

| Element | Initial treatment |
| --- | --- |
| Completed history | Existing altitude palette's green `#5F7E54`, 3 pt stroke, uniform 0.55 opacity, round caps/joins, no white casing |
| History during recording/review | Same geometry and width, opacity 0.30 |
| Foreground journey | Existing elevation colors, actual 4.5 pt width, round caps/joins |
| Foreground casing | Actual 6.5 pt width, white at 0.85 opacity, round caps/joins |
| Start/end | Two small, visually distinct markers for the selected recording; no markers for every internal fragment |

Tune these constants together in the Simulator after the native width discrepancy is resolved. Record accepted values in the QA document. Do not change stored elevation values to obtain more green.

History is a visual combination of covered pixels, not a merged geographic route. Drawing the same exact trace twenty times must not increase its opacity or create twenty borders. Nearby distinct tracks may remain visibly separate when the screen resolution supports it. No proximity snapping, centerline averaging, morphology that fills gaps, or road matching.

## Accuracy and stability invariants

- Preserve the one-meter simplification bound, dense deliberate sampling, continuity checks, serialized background writes, and foreground/background handoff fixes.
- No connection across sessions, rejected samples, missing observations, or privacy boundaries.
- No interpolation through houses and no forced road snapping of walking passages.
- Round the stroke at a vertex, not the geographic trajectory. Curve fitting and corner cutting are excluded.
- Raw session samples, recording timestamps, reconstructed estimates, and persistence schema are untouched.
- Synthetic polyline chunk boundaries are not journey endpoints or recording gaps.
- Preserve Silver Mist's independent ambient coverage and Place blooms; the new history layer does not clear fog.
- Ordinary pan/zoom changes do not mount/unmount path views or resend path geometry.
- Layer order is: basemap, history, foreground casing, foreground color, relevant markers; Silver Mist keeps its existing privacy composition.
- This learning release is iOS first. Keep the current Android path renderer intact until equivalent native coverage rendering is implemented and verified there.

## File map

Repository root for all paths below: `/Users/andrewwatanabe/Kwilt`.

| File | Responsibility |
| --- | --- |
| Create `src/capabilities/explore/domain/explorePathPresentation.ts` | Choose history and foreground evidence; identify genuine gap metadata before chunking |
| Create `src/capabilities/explore/domain/explorePathPresentation.test.ts` | Pure selection, privacy, playback, and gap regressions |
| Modify `src/capabilities/explore/screens/ExploreMapScreen.tsx` | Connect presentation policy to native history props and existing review/recording state |
| Modify `src/capabilities/explore/screens/ExploreMapScreen.test.tsx` | Screen state transitions and stable native child identity |
| Modify `patches/react-native-maps+1.20.1.patch` | Persist history renderer and stroke-width/order fixes; preserve Silver Mist changes |
| Native patch files `ios/AirMaps/AIRMap.h`, `AIRMap.m`, `AIRMapManager.m` | Receive history geometry/style; own exactly one history overlay; preserve drawing order |
| New native patch files `ios/AirMaps/AIRMapHistoryOverlay.h/.m`, `AIRMapHistoryRenderer.h/.m` | Disconnected history geometry and one uniformly composited coverage stroke |
| Native patch file `ios/AirMaps/AIRMapPolylineRenderer.m` | Verify/correct actual width and cap/join behavior of foreground gradients |
| Extend `scripts/maps/overlay-order.test.mjs` | History below casing below color through all refresh orders |
| Create `scripts/maps/history-rendering.test.mjs` | Native raster regression harness, including compositing, gaps, joins, and width |
| Modify `src/capabilities/explore/FEATURE.md`, `docs/feature-briefs/explore-earned-terrain-and-trace.md` | Reconcile old “outline every trace” and fog-simplification contracts with current evidence and chosen presentation |
| Create `docs/qa/explore-map-presentation.md` | Before/after evidence, review feedback, performance and runtime provenance |

Native paths in the table are relative to `node_modules/react-native-maps`; persist them through the existing patch. Do not edit only node_modules and lose the change on installation.

## Task 1: Capture a trustworthy comparison baseline

- [ ] Inspect branch, HEAD, status, affected files, installed app, and Metro owner. Use the normal checkout; preserve unrelated dirty work. Baseline at planning time: branch `codex/plaid-production-completion`, HEAD `88cb2b77`, dirty checkout, rebuilt Simulator shell build 118.
- [ ] Capture the same neighborhood at neighborhood and street zooms, with fog both visible and hidden. Capture a new controlled driving route and a walking passage separately from legacy history.
- [ ] Add synthetic, non-private fixture cases: twenty identical outings; slightly offset parallel travel; a road beside a footpath; a 90-degree turn; a hairpin; a timestamp outage; a trace longer than 512 displayed vertices; and an interrupted recording.
- [ ] Record baseline app memory after warm-up and pan responsiveness under the same data/build mode. Later measurements must use the same device, zooms, data, and instrumentation.

Output: `docs/qa/explore-map-presentation.md` begins with baseline evidence and the visual acceptance matrix below. Historical raw coordinates remain local.

## Task 2: Define and test history/foreground ownership

- [x] Introduce this pure interface in `explorePathPresentation.ts`:

```ts
import type { ExplorePoint, ExploreSession } from './types';

export type PathPresentationInput = {
  sessions: readonly ExploreSession[];
  activeSession: ExploreSession | null;
  reviewedSessionId: string | null;
  playbackVisiblePointCount: number | null;
  showMyPath: boolean;
};

export type PathPresentation = {
  historyGroups: readonly (readonly ExplorePoint[])[];
  foreground: {
    sessionId: string;
    kind: 'recording' | 'review';
    points: readonly ExplorePoint[];
    recordingStart: ExplorePoint | null;
    recordingEnd: ExplorePoint | null;
    hasMissingObservations: boolean;
  } | null;
};

export function buildPathPresentation(input: PathPresentationInput): PathPresentation;
```

This API is implemented. Implement selection with this exact decision order: hidden preference => empty output; active adventure => active foreground; otherwise valid reviewed adventure => review foreground; otherwise no foreground. History contains completed adventure sessions except the entire foreground session. Never include reconstructed estimates. During review, clamp the supplied visible point count to `[0, points.length]`; null means the full recorded journey. During active recording, ignore review/playback cutoff inputs.

- [x] Write failing tests for the complete state table. Include: selected journey still highlighted at progress 1; selected future samples absent from history during playback; active ambient not highlighted; missing reviewed ID leaves browsing; recording overrides review; source arrays unchanged.
- [x] Derive missing-observation metadata from canonical adjacent points using `isRecordedPathContinuous` before simplification/chunking. A one-point session has no drawable foreground line. Markers use valid first/last observed samples; an interrupted recording is described as “recording ended,” not a completed destination.
- [x] Run `npx jest --runInBand src/capabilities/explore/domain/explorePathPresentation.test.ts`; observe failures, implement the policy, then require a pass.
- [x] Add a long continuous trace regression proving that 512-vertex chunk boundaries do not add gap messages or endpoint markers.

## Task 3: Render completed history as one coverage layer

- [ ] Add native map props with this boundary contract:

```ts
// Flattened *validated* history traces, not raw session points.
type NativeHistoryProps = {
  historyEnabled: boolean;
  historyCoordinates: readonly { latitude: number; longitude: number }[];
  historySegmentStarts: readonly number[];
  historyStrokeColor: string;
  historyStrokeWidth: number;
  historyOpacity: number;
};
```

Each segment start begins a new subpath. Never close a subpath or draw a line from the end of one trace to the start of another. Ignore invalid segment indexes and segments with fewer than two valid points. Feed these arrays from `buildRecordedPathTraces`, preserving its existing evidence boundaries and fixed precision.

- [ ] Write a native raster regression before implementation. Render twenty identical traces and one trace to equal-sized transparent bitmaps; require equal coverage and opacity within antialiasing tolerance. Assert uncovered pixels between distinct paths stay uncovered outside the declared stroke footprint.
- [ ] Implement one `AIRMapHistoryOverlay` owned by `AIRMap`, with renderer data replaced only when history changes. Keep it mounted during camera movement. Style changes invalidate drawing without replacing the overlay.
- [ ] Build an opaque coverage mask from the compound stroked path; composite that mask into the destination exactly once using the chosen green and opacity. Use round caps and joins. Overlapping subpaths contribute coverage, never repeated alpha accumulation. Clip to the requested map tile plus a stroke-sized work margin, then composite within the original tile clip.
- [ ] Verify duplicate traces, crossings, disconnected segments, empty history, tile edges, parallel walking/road evidence, and a large history. Cap the working bitmap to the tile/render target; never allocate a bitmap covering the geographic extent of all journeys.
- [ ] Insert history below all foreground path overlays on initial mount and every native refresh. Extend the existing production-method ordering harness to exercise history replacement and casing/color updates in different orders.
- [ ] Run `node --test scripts/maps/history-rendering.test.mjs scripts/maps/overlay-order.test.mjs`; require all supported-host tests to pass. On non-macOS hosts report native tests skipped, not verified.

Proof target: repeated visits form one quiet footprint at the same location; distinct spatial evidence is retained. This task does not geographically deduplicate routes.

## Task 4: Make foreground strokes and boundaries intentional

- [ ] Add native pixel tests for a single straight colored stroke, a 90-degree elbow, an acute turn, and a hairpin, both alone and with casing. Measure at two display scales and two map zooms.
- [ ] Resolve the gradient renderer's `lineWidth * 2.0` behavior so requested screen-point widths are predictable. Proposed corrected calculation:

```objc
CGFloat lineWidth = self.lineWidth / zoomScale;
CGContextSetLineWidth(context, lineWidth);
CGContextSetLineCap(context, kCGLineCapRound);
CGContextSetLineJoin(context, kCGLineJoinRound);
```

Confirm the actual pixel result before accepting this calculation: the harness must prove the requested width, casing margin, and rounded corners. Preserve configurable cap/join behavior for other map consumers; the explicit round settings belong to Explore's styles, not a global override. If the existing gradient renderer cannot satisfy those tests, use MapKit's native gradient renderer in this same task with equivalent color stops and measured widths. Do not ship a visual workaround that drops elevation colors.

- [ ] Keep the foreground casing below color using the established zIndex support. Test the native refresh sequence that previously covered green with white.
- [ ] Show at most one start marker and one recorded-end marker for a reviewed session. While recording, show the start and existing user-location indicator. No markers for rendering chunks or every missing-observation segment.
- [ ] For a selected journey with missing observations, add the brief review explanation: “Some parts of this path weren’t recorded.” Place it in the existing review container; do not add a modal or decorate background history with warning icons.
- [ ] Preserve actual corner coordinates. No spline fitting, invented joining edges, or repaired historical samples.

## Task 5: Integrate with existing recording and review

- [ ] Replace the iOS “draw every outing with casing and gradient” branch with native history props plus foreground-only polylines. Keep Android's existing branch unchanged in this first slice.
- [ ] Derive selection from `reviewAdventureSession`, independent of `playbackActive`. The latter currently becomes false at playback progress 1; it must not control whether review is highlighted.
- [ ] Fit the map to the selected journey when Review opens, using existing map fitting and drawer insets. Respect manual pan afterward. Do not refit on every playback tick or location sample.
- [ ] Clear review/playback when deliberate recording starts; restore quiet browsing when review closes. No new history list or mode toggle.
- [ ] Keep `showMyPath` as the existing visibility control for both layers. Keep fog visibility, Places, and location-centering behavior independent.
- [ ] Add screen regressions for browse → record → stop → review → scrub → full review → close, invalid/multi-session review, hidden paths, and platform fallback.
- [ ] Preserve the existing pan regression: native foreground instances and coordinate references remain unchanged when only the viewport changes. Also assert one history overlay, not one native history child per session.
- [ ] Run `npx jest --runInBand src/capabilities/explore/screens/ExploreMapScreen.test.tsx src/capabilities/explore/domain/explorePathPresentation.test.ts src/capabilities/explore/domain/exploreRecordedPath.test.ts` and the native rendering/order harnesses.

## Task 6: Rebuild, compare, and evaluate the learning release

- [x] Regenerate the existing Maps patch. Apply it to a fresh official 1.20.1 package in an isolated temporary directory with `patch-package --error-on-fail`; compare the resulting native files with the sources being built.
- [x] Build and install one local iOS Simulator app from the owning checkout. Verify Metro's IPv4 endpoint before reconnecting: `curl http://127.0.0.1:8081/status`. A Metro update alone is insufficient for native changes.
- [ ] Execute the matrix below. Record screenshots at identical coordinates/zoom before and after, counts of native overlays, memory after warm-up, and any log exceptions.
- [ ] Run `npm run verify:changed -- --run` once the slice is complete. Report relevant passes separately from unrelated repository failures; the current known baseline contains three missing-migration test failures.
- [x] Update the existing Explore brief and FEATURE manifest to describe overview versus foreground semantics. Remove stale claims that recorded paths use fog's simplification budget. Keep release proof distinct from source and Simulator proof.
- [ ] Present the local comparison to Andrew. Commit/push only if requested. Do not mark physical-device or production readiness from Simulator evidence.

## Acceptance matrix

| Check | Required result |
| --- | --- |
| Twenty identical outings | Same footprint/opacity as one background trace; no interior white seams |
| Slightly offset historical outings | Reduced visual competition; no forced shared centerline |
| Road and adjacent walking passage | Both observations preserved; no invented connector |
| Overview | Streets and Places readable; no highlighted journey implied |
| Selected recording | Immediately distinguishable; other history visually subordinate |
| Round joins/caps | No miter spikes; actual route vertices unchanged; measured widths consistent |
| Genuine outage | No connecting line; selected review explains missing observations |
| Rendering chunk boundary | No visible false endpoint and no gap explanation |
| Playback | No future selected-route samples visible through background history |
| Pan/zoom/recenter, 5 minutes | No crash, overlay churn, disappearing green, or outline-over-color regression |
| Native location updates | Stable layer order while incoming samples refresh paths |
| Screen lock/resume while recording | Dense recording retained; current background/handoff regressions still pass |
| Privacy/visibility | My Path off hides both path layers; Silver Mist and Places retain independent behavior |
| Performance | One history overlay independent of session count; warmed memory no more than 20% above comparable baseline; p95 pan/frame timing no more than 10% worse under identical instrumentation |
| Data integrity | Raw points, timestamps, elevation, and session count unchanged by display-only transitions |

Performance thresholds are acceptance targets, not current measurements. If a target fails, profile and reduce drawing/data churn before release; do not compensate by loosening accuracy or restoring aggressive path simplification.

## Learning and decision rule

First channel: local build for Andrew. The smallest coherent release includes the unified history layer, one foreground journey, truthful gaps, and verified stroke rendering together.

The bet: equal emphasis across every outing is the dominant source of clutter. Success means Andrew can immediately identify the active/reviewed journey and recognizes the same explored streets without seeing a stack of unrelated outlined tracks. Compare the known dense neighborhood plus one driving and one walking outing. Collect qualitative feedback in the existing task and local screenshots; no new analytics or location upload is needed.

If the overview still feels busy, remove background path ink and let existing Silver Mist coverage carry the overview while keeping selected paths. If individual selected journeys remain jagged or disconnected, investigate capture/evidence quality separately; do not hide that with cosmetic connections.

A subsequent signed-iPhone drive/walk and extended locked recording are required before broader release. Full recap redesign, arbitrary-history selection, map matching, automatic legacy cleanup, density heatmaps, sharing, and Android parity remain separate work.

## Spec refinement and handoff

Decisions made for this plan: uniform history green; opacity does not encode visit frequency; active recording wins over review; selected playback excludes that whole journey from history; no geometry smoothing or inferred connections; existing Review is the initial selection entry point.

Implementation must settle the native pixel-width/round-join behavior through the specified raster tests and Simulator comparison. The implementation may choose the existing gradient renderer or MapKit's gradient renderer based on that evidence, while meeting the same product contract. No further user decision is needed to begin the planned local slice once implementation is requested.

Review checkpoint: the completed local experience and matched screenshots. No new production rollout or recap information architecture is implied by acceptance of this plan.

Implementation refinement: the history renderer converts the compound stroke into one nonzero-filled coverage shape and applies opacity once in MapKit's clipped tile context. The native duplicate-opacity raster test passes, so a separate world-extent bitmap or extra mask allocation is unnecessary. Performance targets still require matched measurement.
