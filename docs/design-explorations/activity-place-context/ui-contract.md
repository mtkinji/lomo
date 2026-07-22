# Activity Place Context UI Contract

Job: When a to-do belongs somewhere, the user needs to attach or accept that place without also creating an alert, so the to-do carries useful context without unexpected tracking or interruption.

Primary action: Save the selected place.

Must show: The selected place, whether its alert is Off/Arrive/Leave, and a compact post-create receipt when Quick Add inferred a place.

Reveal later: Boundary radius only after an alert is enabled; full place review only after `Review` is tapped.

Must not add: A new screen, automatic geofence, automatic notification permission request, saved-place learning, background travel detection, or a required confirmation queue.

Reuse map: Existing Location drawer and map; existing DropdownMenu and design tokens; existing QuickAddDock floating surface; existing Activity Detail route for Review.

Behavior sources: Place-first and alert-off behavior from the approved Activity Place Context brief; compact dock receipt from the approved Quick Add refinement; existing arrive/leave permission path retained behind `Set alert`.

Unresolved decisions: `Nearby / My Costco / Any` requires real Saved Place candidates and is intentionally not fabricated in this first slice.

Required states: No place, context-only place, arrive alert, leave alert, inferred place receipt, dismissed receipt, permission denied, and persisted reopen.

Proof path: Create a location-related to-do through the real Quick Add dock; inspect the receipt; open Activity Detail; save a context-only place; close and reopen; then enable an alert and verify radius disclosure and persistence in the iOS simulator.
