# Money Experience Refinement Program

This program addresses the four observations added after the Money trust-and-responsiveness branch was first verified. It deliberately separates three independently testable lanes:

1. [Mature loading system](2026-07-27-mature-loading-system.md) — app launch, Money first load/refresh, and Chat progress.
2. [Money category ordering](2026-07-27-money-category-ordering.md) — the accepted design-thinking result and atomic persisted order.
3. [Money detail restoration](2026-07-27-money-detail-restoration.md) — single-header drawers, the 12-month average ghost line, and working category cover imagery.

## UI diagnosis

### What I see

- Loading is presented as a destination: blank canvas, spinner, and generic prose. The user loses the structure they were navigating toward.
- Startup can stack a timed branded launch screen, auth restoration, entitlement resolution, and navigation restoration even when no step needs to block the first usable shell.
- Chat mixes mature streaming/delayed skeleton behavior with generic spinners and static loading messages.
- The category drawer repeats hierarchy with `CATEGORY` plus `Where does this belong?`; the eyebrow contributes no additional meaning.
- Summary's fixed order hides a real household preference behind backend `sort_order`.
- Category detail lost the retired app's historical comparison. Its current cover is only four hard-coded name checks; Housing has no match and therefore cannot show an image.

### Anchor in play

Money and Chat should preserve useful context while work continues. Waiting should feel like the current surface becoming ready—not like the app replacing the user's intent with a loading screen.

### References worth knowing

- Apple Loading: show something as soon as possible and replace placeholders as content arrives.
- Apple Progress Indicators: avoid vague labels and keep indicators local and consistent.
- Apple Launching: get to an interactive restored surface quickly; a launch screen is not a timed branding interstitial.
- Kwilt's own `AiChatScreen`: delay skeletons to avoid flashes and stream real assistant output into the existing timeline.
- Kwilt's own `PlanCalendarLensPage`: retain the destination structure and use lightweight skeleton blocks only where external content is missing.

### Three loading directions

1. **Unified spinner treatment:** standardize colors, copy, and placement. Consistent, but it preserves blank waiting surfaces.
2. **Content-first readiness — chosen:** restore cached/local structure immediately, use shape-matched skeletons only for missing content, keep refresh in place, and make long agent work progress through its real timeline.
3. **Full optimistic shell:** fabricate most destination content immediately. Fast-looking, but dangerous for Money because placeholders can be mistaken for financial truth.

### Recommendation and bet

Choose content-first readiness. We're betting that the dominant maturity problem is loss of context, not the spinner artwork. If a surface still feels slow after retaining structure and cached truth, the next move is measuring and shortening its actual critical path, not adding more loading copy.

## Shared loading contract

| Duration/state | Treatment |
| --- | --- |
| Under 150 ms | No loading UI; preserve the pressed/selected state. |
| 150 ms–2 s, no usable content | Render destination chrome plus shape-matched placeholders; no generic sentence. |
| Any duration, cached/last-success content exists | Keep content visible; show local refresh state and freshness, never blank the surface. |
| Over 2 s | Add concise task-specific status only if it tells the user something actionable or truthful. |
| Long agent work | Append/replace a typed progress item in the existing timeline, then stream the result; never show a detached full-screen spinner. |
| Failure | Preserve usable content, state what remains visible, and provide one recovery action at the failed boundary. |

Determinate progress is reserved for operations with real measurable units. Haptics acknowledge user input and confirmed outcomes; they are not used as a timer or substitute for visible state.

## Recommended execution order

1. Establish the loading policy/primitives and remove the timed launch hold.
2. Apply the policy to Money, then Chat; measure first-surface usable time and Money first-content time.
3. Implement category ordering behind the existing Summary options menu.
4. Restore detail graph/image behavior and simplify the affected drawer headers.
5. Run the normal diff-aware gate, focused unit tests, authenticated simulator flows, and then physical-device/TestFlight checks as separate proof.
