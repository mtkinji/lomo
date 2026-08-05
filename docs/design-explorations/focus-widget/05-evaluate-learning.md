# Evaluate Learning: Focus Widget

Status: local implementation learning release complete; device/TestFlight learning remains pending.

## Local evidence

- The generated WidgetKit extension builds and its App Intent metadata extracts successfully.
- The containing Simulator app builds with the extension embedded, and iOS registers `com.andrewwatanabe.kwilt.widgets` version `1.0.99`.
- A widget-equivalent deep link starts a 10-minute standalone session in the installed app and presents the shared full-screen timer with end, pause, and soundscape controls.
- Focused lifecycle, route, notification, controller, runtime-host, and generator contracts pass.

This proves the source, generated native target, installed binary, and in-app handoff locally. It does not yet prove Home Screen placement/tapping on a signed device or TestFlight.

The first question is whether the widget reliably converts a moment of readiness into an active Focus session with no ambiguity about what started. The second is whether users understand that generic Focus is not attached to a to-do.

Evidence to collect after dogfooding:

- Starts from the widget versus abandoned opens.
- Sessions ended immediately because the wrong duration was configured.
- Whether users seek an Activity link before or after focusing.
- Whether active-widget countdown and in-app controls feel continuous.

Do not raise the job-flow delivery score until this is proven on a signed device or TestFlight build.

## 2026-08-05 deliberate-start learning

Learn whether choosing duration and audio at tap time feels intentional rather than
administrative. Supporting evidence is repeated widget use where the user makes or
confirms both choices and starts without backing out. Disconfirming evidence is
frequent abandonment at the drawer or a repeated desire to bypass it. Dogfood
observations are sufficient for this refinement; do not add track-level analytics.
Revisit the interaction only after several real starts, not from generator or
Simulator rendering alone.
