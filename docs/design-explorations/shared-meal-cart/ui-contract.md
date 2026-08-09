# UI Contract: Shared Meal Cart Drawer

Job: When household members are considering the next few meals, they need to add
and support possibilities in one shared place so Maya can settle dinner without
polling everyone again.

Authority chain: Andrew's accepted shared-cart decisions -> shared-meal-cart
feature brief and convergence -> iOS/Android/accessibility behavior -> Kwilt UI
Constitution and semantic tokens -> Canonical `BottomDrawer` and `Button` ->
Candidate inventory/list and persistent-decision-region atlas patterns ->
feature-local meal rows.

Three-second read: This is our shared Plan; its familiar meal icon and count
recover the whole collection; the drawer distinguishes decided meals from ideas.

Primary action: Organizer: **Use these meals**, but only after entering explicit
selection. Before that commitment boundary, **Choose next meals** is a quiet
neutral continuation. Participant: no global primary action; the local
reversible **Sounds good** control is secondary to the shared content.

Primary information: Meal artwork/title, contributor, and visible positive
support.

Secondary information: Current count, insertion order, permission-specific
withdraw/remove control, cached or refreshing state.

Reveal later: Temporary settlement selection, contextual diner/serving
exceptions, Recipe detail, and Groceries.

Scan order before commitment: Plan identity/count -> meal possibilities and
contributors -> named support -> one organizer continuation. After commitment:
decided Recipe list -> truthful Grocery action -> any new ideas waiting.

Must not add: Vote totals as the visual center, popularity sorting, downvotes,
comments, activity-feed chronology, response progress, planning steps, horizon
configuration, budget/pantry/price controls, or multiple dominant actions.

Reuse map:

- Overlay mechanics, snap points, safe areas, scroll coordination -> Canonical
  `BottomDrawer` and `BottomDrawerScrollView`.
- Selection entry -> Canonical `Button` with the neutral `secondary` variant.
- Settlement commitment -> Canonical `Button` with the charcoal `primary`
  variant. Brand-green `cta` buttons are excluded from this workflow.
- Meal media -> existing `RecipeArtwork`.
- Named support -> existing `OverlappingAvatarStack` or compact feature-local
  initial treatment if its current API cannot truthfully render the projection.
- Selection semantics -> accessible `Pressable` checkbox rows using existing
  typography and semantic tokens; do not introduce a second picker component.
- Pending/failure explanation -> inline `Text` or existing `Toast` only when the
  mutation result is not otherwise clear.

Nearest precedent: Current `MealPlanDrawer` in `RecipeLibraryDrawers.tsx`. Keep
its 88-percent drawer, close path, scroll surface, and one footer decision.
Remove the 124-point peek and duplicate header thumbnails: the persistent
top-right Plan count already owns recovery, while the drawer owns review and
settlement.

External exemplar ledger: Apple Music's Playing Next queue and AnyList's Meal
Plan Queue support a durable entry point that opens the complete queue. Preserve
immediate add/remove, visible item count, and durable recovery. Translate queue
contents into contributor, support, and organizer settlement. Reject a
partially exposed queue, commerce styling, price rows, urgency/scarcity,
cross-sell, badges, and checkout theater.

Behavior sources:

- Anyone eligible can add -> accepted user decision and `03-converge.md`.
- Adding implies contributor support -> accepted user decision and
  `03-converge.md`.
- Named positive-only reactions -> accepted user decision and `00-frame.md`.
- No ranking or automatic selection -> `03-converge.md`.
- Organizer-only settlement -> household food capability boundary and
  `03-converge.md`.
- Existing top-right count -> accepted persistent affordance and sole drawer
  entry point.
- No drawer peek -> Andrew's 2026-08-07 correction that the partial sheet did no
  particular job well.
- No green cart actions -> Andrew's explicit brand-color rule; controls use
  neutral or charcoal semantic variants.
- Stable Plan affordance -> its label and generic meal icon never change by
  lifecycle state. The counter is the number of meal items recoverable in the
  drawer: committed meals plus open-cart ideas.
- Committed-first drawer -> a plainly spaced Recipe list and the Grocery
  continuation lead the resting drawer. Rows show title, timing, household
  coverage, and servings when known. They must not overlap or imply a card stack.
  Open-cart ideas remain below as a separate section; settlement phases
  temporarily take over the drawer as one focused job.
- Drawer hierarchy -> **Ready when you are** is the sole content title. Do not
  place an eyebrow such as **Meals decided** above it.
- Truthful Grocery language -> **Make grocery list** when none exists, **Review
  grocery list** while compiled ingredients need review, **Open groceries** for
  a current ready list, and **Review grocery changes** when a plan revision made
  an older list stale. **Buy groceries** is reserved for a real retailer handoff.
- No setup before adding -> job-flow capture/continuity principle.

Unresolved decisions: None that change the learning-release behavior. Exact
avatar compression and long-name truncation are implementation details governed
by accessibility and rendered proof.

Required states: No cart, empty cart, first add pending, one/many candidates,
own/other contribution, reacted/unreacted, mutation pending/failure, cached and
refreshing, permission revoked, organizer settlement with zero/one/many selected,
contextual exception, settled result, and relaunch recovery.

Proof path: iPhone 17 Pro Simulator and smallest supported iPhone viewport through
Meals -> add from card without opening or peeking the drawer -> top-right Plan ->
full drawer -> second-account add and reaction -> organizer selection -> settle
-> Groceries. Check ordinary and accessibility text sizes. Treat two-account
physical-device, VoiceOver, Android, signed build, and TestFlight as separate
gates.
