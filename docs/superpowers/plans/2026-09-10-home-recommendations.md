# Home recommendations implementation

September 10, 2026. Andrew approved pursuing the inline continuation/discovery direction. Execute in the current normal checkout on main, starting at 9baf1a4; preserve unrelated dirty work. No release, backend mutation, or default-landing change.

## UI contract

- Personal Home keeps its edge-to-edge gray canvas, header and safe areas.
- A persistent inline region above the social stream owns one featured invitation and at most one complementary invitation of the other kind. It scrolls with Home; no on-load overlay, carousel, adoption percentage, or synthetic feed posts.
- Featured unfinished work does not exclude discovery. Each offer names a benefit and concrete owner destination. Unknown source state never means incomplete setup.
- Existing neutral Button, DropdownMenu, Text, Settings-style rows and SharedLifePage supply interactions. Spacing/type/color use theme tokens. Closest precedent: Home native feed header and existing first-cycle owner guides. This is a new composition, pending native visual acceptance.
- Home options exposes Your next steps even when suggestions are hidden. Detail view distinguishes accepted work, new possibilities, saved-for-later and declined offers. Later, Not for me and Hide persist per account; restoration is explicit.
- Money completion/checkpoints, actual meal-plan records, and Household membership come from their owners. Accepting an offer records only invitation acceptance. Neither taps nor visits imply successful setup. No rehearsal onboarding paths are promoted.
- No personalized recommendations for signed-out, Household mode, managed child access, child membership, failed membership verification, or preview repositories. Ignore stale asynchronous results after account/access changes.
- Keep suggestions stable while reading. Refresh evidence at focus/explicit retry, not social-feed refresh; retain the existing list header measurement and reading anchor.

## Bounded first implementation

1. Add a pure candidate projector and deterministic selection for Household, Money and Meals. Household is an optional invitation; Money setup continuation uses its owner checkpoint; Meals continuation uses an actual active saved plan. Generate discovery independently. Test unknown evidence, completed/solo/child states and complementary selection before implementation.
2. Add normalized, account-scoped durable presentation preferences and acceptance state, with tests for later/decline/hide/restart/account separation. This is device-local preference storage, not a new source of setup truth or cross-device sync claim.
3. Load read-only owner evidence with cancellation and per-source failure isolation. Household access is verified before reading private Money/Meals evidence. Hook tests cover account changes, child/privacy suppression, partial errors and focus refresh.
4. Build the inline region and user-opened Your next steps page. Integrate into the existing measured feed header and menu without changing feed filtering, composer or owner flows. Add actionable household prompting; simplify the empty social state when recommendations are visible.
5. Verify focused tests, inspect the scoped local completion gate, run it once on task files, and inspect native Home with the current checkout/Metro. Exercise navigation, later, restore, hide, a populated-feed rehearsal and large text. Record evidence and limitations; request bounded independent code review per the review skill.

## Follow-on boundaries

This first slice does not claim all-capability activation coverage. Screen Time needs its complete device/grant/authorization/policy projection before Home can promise readiness; it is not inferred from a child profile. Contextual offers can later reuse the same invitation identity. The universal first-run cohort gate remains independent. Discovery engagement and owner-confirmed first value must be measured separately before broad rollout decisions.
