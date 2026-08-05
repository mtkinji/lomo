# Converge: Focus Widget

Choose **Standalone preset**.

It best fits Marcus's moment: the decision to focus has already been made, so Kwilt should not introduce another planning step. A configurable preset keeps the Home Screen surface quiet. The active countdown confirms that the tap worked, and the app remains the owner of pause, resume, soundscape, color, and end controls.

The bet is that a truthful unlinked session is more useful than either guessing the next to-do or requiring a setup sheet every time.

Trade-off: generic Focus contributes to the user's overall Focus/show-up history but not to an Activity or Goal. That is intentional.

## 2026-08-05 refinement: choose the in-app start drawer

Choose **In-app start drawer**. Before this refinement, duration and audio are
either hidden in Edit Widget or applied automatically. After it, tapping the widget
opens one focused decision surface: choose How long, choose Audio (including no
audio), then press Start. The active session still uses the same runtime and controls.

Accepted trade-off: Focus takes one more explicit tap to begin. Rejected trade-offs:
no widget configuration, no random audio, no automatic use of stale choices, and
no full navigation detour or new screen.

The bet is that these two choices increase ownership enough to justify the small
pause before starting. If the drawer feels like friction in real use, revisit a
single-tap repeat-last-session affordance as an optional secondary action rather
than removing the decision moment by default.

## 2026-08-05 containment correction: full-page interstitial

Choose a **full-page Focus interstitial** for the widget entry. The earlier
standalone drawer duplicated the existing Activity Focus controls and made the
To-dos canvas look like the owner of an explicitly unlinked session. The widget
now opens a top-level `focus` route that renders the same shared duration,
soundscape, and Start contents used by Activity Focus, but inside an opaque
full-page container. Activity Focus keeps its existing drawer container and
activity-specific context.

This is a containment change, not a new Focus capability or data model. Start
transitions in place to the existing active Focus experience. Closing returns
through navigation history. The bet is that a neutral, full-attention entry
preserves the deliberate choice without implying that generic Focus belongs to
To-dos.
