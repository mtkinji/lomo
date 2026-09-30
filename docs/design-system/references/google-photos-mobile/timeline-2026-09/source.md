# Google Photos chronological mosaic

Reference ID: REF-2026-09-28-google-photos-timeline
Source: user-supplied Google Photos iPhone screenshot, supplied September 26, 2026; cataloged September 28. Exact capture date, app version, and active gesture unknown. Original: [original.png](original.png). Private research only; do not publish or use the photograph pixels in product assets.

User preference: "Google photos does this version which is quite good." Current request: pull it back up and use the design system skill. Existing Biographer decisions: white canvas, larger rounded cards, no redundant Timeline heading, one shared inventory, Begin a conversation, distinct quiet entry canvas.

Mode: capture + bounded composition comparison + proposed trial. No app implementation or Canonical promotion authorized by this study alone.
Levels: page, group, flow. Tags: chronology, media-mosaic, floating-navigation, density, date-index, Biographer.

## Observed
Photographs cover nearly the whole available surface, separated by narrow seams. Larger and smaller rectangles coexist. Month pill and year labels sit above the imagery. A selected July 2017 label is visually stronger and a right-edge handle is visible. Year spacing is not uniform. No permanent content-free sidebar is visible.

## Additional captures and owner clarification — September 28
[Resting view](resting.png) and [scrolling handle](scrolling-handle.png) supplied by Andrew. These private originals supplement, rather than replace, the expanded timeline capture. Exact capture date/version remain unknown.

Andrew clarifies that Biographer is not image-centric. Transfer the temporal navigation interaction; do not let the reference's imagery dictate our content model or composition. This supersedes the earlier recommendation to combine a photo-led mosaic redesign with the rail trial.

Evidence distinction: the first image shows no handle; the second shows a compact right-edge up/down handle without expanded dates. Andrew reports that the affordance reveals during scrolling and that pressing the draggable handle exposes the timeline. The earlier original shows the expanded date index. The reveal trigger is owner-reported behavior, not inferred from pixels.

## Unknown
Exact fade delay, dismissal timing, drag-to-date mapping, haptics, zoom behavior and date tracking across gestures are not verified. Release-to-land followed by collapse is a proposed Biographer treatment, not independently verified Google behavior.

## Preserve / Translate / Reject
- Preserve: content dominates, floating temporal orientation, stronger current period, one chronological field; scroll-revealed handle and press/drag expansion as reported by Andrew.
- Translate: text-first entries with optional supporting photos; preserve readable type, white canvas and approved rounded cards. Separate resting, ordinary scrolling and active time-scrubbing states. No permanent date-sidebar width reservation.
- Reject: borrowed photographs, exact screenshot pixels, Google bottom tabs, unsupported date precision for Memories, a permanent narrow content gutter occupied by dates, and arbitrarily calling large tiles more important.

## Candidate scope
Returning user browsing a substantial Biographer inventory to recognize and reopen a day or memory. Exclude blank journal canvas, active recording, permissions, forms, and small/empty inventories. Principles belong at page/group level, not a universal Card rule. Native implementation is SwiftUI; React Native component APIs do not transfer directly. Authority remains explicit user decisions, platform accessibility, then Kwilt constitution/token/component/atlas contracts where applicable. Current native hardcoded type/radius/spacing are local implementations, not newly Canonical tokens.

## Bounded findings
Source checkout: /Users/andrewwatanabe/Kwilt, codex/onboarding-shoreline, HEAD 59e8acff, dirty with unrelated changes. Capture adds only this study and a catalog link. Implementation reviewed: /Users/andrewwatanabe/kwilt-biographer/App/JournalTimelineView.swift (non-Git folder); artifact reviewed: evidence/journal-timeline/september.png. One route's source and existing screenshot inspected; no fresh runtime exercise in this study, no app-wide review.

| ID | Disposition | Evidence | Recommendation / owner | Closure proof |
| --- | --- | --- | --- | --- |
| GP-01 | candidate opportunity | JournalTimelineView equal flexible columns and TimelineTile minHeight 195; same-scale excerpt cards in screenshot | Defer mosaic changes; retain text-first browsing and test navigation independently | Render with mixed media, text-only, long excerpts and large type |
| GP-02 | candidate opportunity | trailing padding 48 and always-visible month index reserve content width | Trial collapsed edge handle plus expanded floating time overlay owned by timeline | Demonstrate browse, engage, jump, dismiss and return-position states |
| GP-03 | candidate opportunity | Month index has no current-period distinction | Selected-period emphasis; label follows actual visible position, not last tap | Verify manual scroll and jumps across year boundaries |
| GP-04 | conforms within explicit user direction | White background, rounded tiles, no Timeline heading, retained conversation action | Preserve these accepted qualities while changing composition | Rerender together with trial |
| GP-05 | unreviewed | Photo area exists in code, current 48-entry demo has no photo tiles | Optional photo coverage remains useful, but is not a prerequisite for this text-first navigation trial | Observe mixed photos/text and permission-limited fallback |

Missing accepted rules are design gaps, not Canonical violations. Proposed changes do not replace accepted card radii or the blank entry canvas.

## Smallest proposed trial
Use the existing 48-entry text-first dataset. Show (A) resting inventory with no expanded date rail, (B) ordinary scrolling revealing a compact up/down handle at the right edge, (C) press/drag expanding a floating date index with a clear current period, and (D) the blank entry canvas unchanged as an excluded context. Preserve content width across states. Release lands at the chosen period; collapse/fade timing needs trial. No photo-first redesign, invented content ranking, or persistence changes.

Selection conditions: substantial chronological inventory, returning browsing. Exclusions: writing canvas, active recording, forms, empty/small inventories. Semantic owners: JournalTimelineView owns scroll/index state; entry tile owns excerpt presentation; date grouping owns chronological mapping. Use existing native controls and app tokens where available; screenshot pixels do not set token values.

Accessibility: provide a named date-navigation action with tap/adjustable alternatives so access does not depend on a precise drag or a briefly visible control. Preserve reading order and focus; respect Reduce Motion and large text. Normal, scrolling, dragging, cancelled drag, interrupted gesture, return-from-entry and unknown-memory-period states need proof.

Do: prioritize readable words, use photos as supporting context, keep content width stable, expose precise date navigation only when needed. Don't: make every entry an image tile, force a masonry redesign, reserve a permanent rail gutter, shrink text to resemble photo density, or invent exact dates for memories.

Status: owner direction clarified and captured; implementation unchanged. Rail trial and its timing remain to be rendered and reviewed. No global pattern adoption or Canonical promotion.

## Authorized trial — September 28
Andrew answered Yes to trying the scroll-revealed handle and expandable date rail with the 48 text-first entries unchanged. This authorizes a trial, not adoption.

Artifact: `/Users/andrewwatanabe/.codex/visualizations/2026/09/24/01a0d372-23bb-7a13-b8eb-2814912e6282/time-rail-trial/index.html`; local preview http://127.0.0.1:8773. Separate self-contained web interaction study; native Biographer and previously hosted prototype unchanged. Only this preview server owns the current runtime verification; no new simulator build. Main Kwilt checkout remains codex/onboarding-shoreline at 59e8acff with unrelated dirty work; no commit/push.

Pattern under trial: returning inventory browsing, full available content width, same excerpt/card family, no persistent sidebar. Resting hides the handle; scroll reveals it; pointer press expands an overlay; vertical drag steps through months; release lands then collapses. Tap offers explicit month buttons. Keyboard users have Browse dates, month buttons, arrows and Escape. The entry canvas is excluded and demonstrated separately.

Trial constants, not adopted tokens: 1.5s post-scroll handle visibility; 550ms after drag release before date overlay collapse; 48px drag movement per month. Accessible focus keeps handle available. Six-month navigation only; years/uncertain life periods remain future cases.

Runtime evidence at 393×852 in Codex browser: resting screenshot, scroll-revealed handle, press-expanded rail, September-to-June drag, automatic collapse, keyboard Browse dates, tap selection of May, entry open and Back retaining exact scroll offset (3854), blank canvas exclusion. Screenshots resting.png, scrolling.png, expanded.png and canvas.png beside artifact. This is browser evidence, not iPhone Safari or native gesture proof. No recording, real photos, persistence or remote upload. User refinement/adoption decision pending. Review handle discoverability and timing first.

## Revision 2 — continuous scrollbar trial
Andrew clarified that the Google Photos reference is an advanced scrollbar that continuously traverses the list. The earlier month-step overlay/menu interpretation and its 48px-per-month and 550ms-collapse constants are superseded. Andrew authorized revising this browser trial; adoption and native implementation remain pending.

The compact thumb now tracks proportional scroll position. Drag displacement maps continuously to the full scroll range, retaining the grab offset and clamping at either endpoint. A single month/year label appears beside the thumb during dragging; it is orientation, not a selectable date menu. Release immediately hides the label and preserves the reached position. Scroll reveals the handle for 1.5 seconds, with keyboard focus retaining access. Arrow/Page/Home/End keys offer continuous keyboard navigation. Cards and entry canvas remain unchanged.

Evidence: two focused scroll-mapping tests passed after the initial missing-module failure. Browser verification at 393×852 showed a 300px drag reaching scroll offset 2678, date visible while held, and release retaining 2678 with date hidden. Home/End reached both endpoints; opening the conversation canvas and returning retained offset 682. Current screenshot: continuous-drag.png beside the trial. Earlier expanded.png depicts the superseded menu. Browser proof only; iPhone touch feel, multi-year scale, large text and uncertain memory periods remain unverified. Local preview remains http://127.0.0.1:8773; no native build, deployment or Canonical promotion. Next review: drag sensitivity and whether the transient handle communicates fast continuous browsing.

## Revision 3 — motion and haptic refinement
Andrew confirmed continuous browsing feels right and requested smooth entrance/exit and haptics. Scope remains this inventory interaction. Browser trial adds a 16px handle slide with 240ms opacity / 320ms ease-out movement; date label uses an 8px slide, subtle .94-to-1 scale and 180ms opacity / 260ms movement. Only presentation animates; scroll mapping remains direct. Exit can reverse seamlessly if scrolling resumes. Existing Reduce Motion rule removes transitions.

Haptic intent: quiet selection tick on month changes during active dragging, not ordinary scrolling or every pixel. Browser trial calls an 8ms vibration where available, capped at one per 70ms; unsupported browsers silently retain visual feedback. iPhone native selection feedback remains pending (UISelectionFeedbackGenerator); browser vibration is not proof of iPhone haptics. See Apple selection feedback documentation and WebKit standards-positions issue 267.

Verification: both existing continuous-mapping tests pass. Browser drag again reached 2678 with the visible July label, release retained 2678 and initiated label exit; no captured browser errors. Screenshot motion-drag.png beside trial. Physical haptic feel and perceptual motion review remain owner/device checks. No native implementation or deployment in this refinement. Next: review motion and decide whether to adopt this treatment for the Biographer inventory.

## Owner adoption — September 28
Andrew answered Yes to making the refined treatment the default for the entry inventory. Accepted direction is recorded in the pattern atlas as Local to Biographer: continuous scrollbar, reversible smooth entrance/exit, contextual date label and light month-boundary haptics while dragging. This supersedes pending-adoption statements above; native implementation, physical haptics and outstanding device/state coverage remain pending. No broader Canonical promotion or release is implied.

## Native implementation — September 28
Andrew requested applying the accepted design to the native app. Implemented in /Users/andrewwatanabe/kwilt-biographer/App/JournalTimelineView.swift with tested mapping/haptic gating in Core/TimelineScrub.swift. Native selection haptics are wired on iOS. Full package has 19 passing tests; iOS simulator and macOS Debug builds pass. Runtime visual verification is blocked because computer-use access to Simulator was not approved. No native screenshot, physical haptic verification, TestFlight upload or release claimed. Evidence: /Users/andrewwatanabe/kwilt-biographer/evidence/timeline-scrubber/verification.md. The atlas's native-implementation-pending statement is superseded by build-verified implementation; device/rendered proof remains pending.
