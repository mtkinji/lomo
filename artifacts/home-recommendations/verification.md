# Home recommendations verification

September 10, 2026. Initial Household/Money/Meals implementation; broader all-capability readiness remains design work.

## Provenance

- Source checkout: `/Users/andrewwatanabe/Kwilt`.
- Branch: `main`; base HEAD: `9baf1a4a8e14b83e806c1df9e25ee4d3e66d0678`.
- Uncommitted task changes alongside unrelated work. No commit, push, release or deployment performed.
- Native runtime: existing iPhone 17 Pro, iOS 26.5 Simulator `D437E709-EF87-49B1-A6C1-7AE350C0BF8A`, installed development build, with current JS served from this checkout's Metro on port 8081. This is not TestFlight or signed-device proof.

## Automated checks

The scoped `npm run verify:local -- --run --files ...` passed all selected checks: whitespace, staged whitespace, app typecheck, test typecheck, code-health ratchets, product lint, architecture lint, and 9 related Jest suites / 35 tests. The final scope includes 22 files, including the repeatable Dev tools preview entry, listed in `local-verification.log`; other changed files were explicitly outside this task's approval scope, although shared type/static checks inspect their contracts.

Earlier runs found a test generic annotation issue and the two review findings below. Later intermediate runs passed checks but became stale while the shared checkout changed. A 26.14-second run passed before the final Dev tools entry adjustment; subsequent runs passed every check but were marked stale because inputs changed during execution. The final 27.06-second run again passed every check and all 35 tests, but was marked stale while the parallel Plan task changed its scroll viewport style. No Home source changed during that run. The copied final log records this status; a clean integration gate remains outstanding. The integration/release gate was not requested or run.

Coverage includes independent discovery alongside continuation; unknown/child evidence; owner completion; introduction-only Money state and existing plan suppression; acceptance versus progress; account isolation and hydration; Later/decline/hide restoration; stale async responses and stale actions; owner navigation targets; complementary-action wiring; and late-header/top/background/deeper-reading behavior.

## Independent review

Three findings were fixed with regressions:

1. Money introduction-only state could claim unfinished setup even though automatic owner entry bypasses setup. Home now reads current owner plan settings and only uses a real unfinished checkpoint for setup-resumption wording.
2. Parking an invitation could overwrite acceptance. Acceptance now persists independently from visibility preference and survives restoration.
3. Background restoration at the top required a post anchor that might not exist yet. Top restoration now works without posts or a reading anchor; deeper restoration retains the existing post anchor.

## Native observations

- Actual Home keeps its gray canvas through header and safe areas.
- The live Meals continuation opens the owning Meal Plan and displays the existing saved meals.
- Recommendation options open the native menu; Save for later removes the inline offer.
- Home options → Your next steps locates the saved offer; Show this on Home restores it as In progress.
- The first populated-feed rehearsal reproduced recommendations inserted above the viewport after an asynchronous header change. Native anchor configuration and explicit top handling were added with regression coverage. Final native confirmation passed: toggling from no recommendations to Meals inserted the entire recommendation region visibly at the top, while the catch-up controls and populated feed remained below it.
- The populated fictional preview shows one primary Meals continuation and one quieter Money discovery action. Tapping discovery invoked the isolated preview action. The Household scenario shows an explicit invitation and Explore Household action. See `continuation-and-discovery.png` and `household-invitation.png`; the white preview toolbar is development-only.
- Native large-text and a deeper-reading drag were not verified in this pass. Automated tests cover deeper-reading preservation.
- A few intermediate rehearsal attempts were interrupted by concurrent navigation on the shared Simulator. These are not treated as product failures or acceptance evidence. Home yielded all Simulator control when the other task requested coordination.

## Limits

This slice uses device-local, account-scoped preferences and current owner evidence. It does not claim cross-device preference synchronization, complete child-device/Screen Time readiness, all-capability discovery, a numeric global setup percentage, analytics outcomes, or a new default landing. No recommendation sends invitations, connects accounts or publishes content automatically.

## Placement correction — separate Home module

Andrew clarified that the invitation must read as a distinct Home region above the feed. The module now uses the owned Card with no elevation, one primary action and a quieter discovery row. A separate Your feed heading and larger inter-section spacing mark where social activity begins. Both regions retain one page scroll and the edge-to-edge gray canvas. The shared virtualized list header remains the technical scroll host, not a feed item.

Native iPhone 17 Pro preview verified the focal order: next-step card, Your feed heading, people/activity. One primary button; one intentional surface boundary; existing owner actions and menus retained. Screenshot: separate-home-module.png. The previous flat-region screenshots are superseded for placement. Scoped checks passed, but the runner marked the run stale because the shared checkout changed during execution; see module-verification.log. Large-text and physical-device proof are not claimed.

## Compact guide correction

Andrew rejected the card and approved a compact guide: short title, one supporting line, Continue arrow and a quieter Try Money arrow beside it. Removed Card, full-width primary button, eyebrow and Your feed heading. Existing owned link Buttons preserve full action accessibility labels, while wrapping on narrow widths. Spacing separates the guide from people/activity without another surface. Native iPhone 17 Pro preview showed this focal order with no clipping at default text size; The originally saved compact-home-guide.png captured a development reload rather than the observed guide and is invalid as visual evidence; replacement is pending coordinated Simulator access. A subsequent action check was interrupted by shared Simulator navigation and is not claimed as runtime interaction proof. Focused tests exercise the new discovery button and retained actions. Broader verification passed app typecheck but encountered an unrelated missing src/ui/SearchField module from SearchField.test.tsx during concurrent work. Large text remains unverified.

Replacement capture: compact-home-guide-verified.png was captured during coordinated exclusive Simulator access and opened from disk to verify the actual saved pixels. The original compact-home-guide.png was replaced with the same verified image to repair the earlier link.
