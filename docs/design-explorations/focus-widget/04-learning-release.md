# Learning Release: Focus Widget

## Release slice

- Small configurable WidgetKit widget with 10, 25, and 50 minute presets.
- Resting state has one Start action.
- Active state shows the shared Focus countdown and opens Kwilt controls.
- Standalone route starts the existing runtime with an explicit non-Activity identity.
- In-app overlay supports pause, resume, soundscape, color, and end.
- Shortcuts' Start Focus fallback uses the same standalone route.

## Evidence gates

- Generator contract tests prove the generated native source and bundle registration.
- TypeScript tests prove route parsing and standalone session identity.
- Focused Jest, app/test typecheck, product/architecture lint, and diff-aware verification pass.
- Generated Swift typechecks and the Widget extension builds.
- Simulator proof confirms widget gallery presence, configuration, start, countdown, and return to controls.

TestFlight and physical-device proof remain separate release gates.

## 2026-08-05 deliberate-start slice

- Make the native Focus widget a static launcher with no Edit Widget parameters.
- Open the existing Activities destination directly into one Focus setup drawer.
- Present two explicit sections: How long (10, 25, or 50 minutes) and Audio (the
  existing seven soundscapes plus No audio).
- Seed the drawer from the user's last duration and current audio choice, while
  requiring an explicit Start each time.
- Start through the existing entitlement-aware standalone controller and keep the
  active timer, audio controls, Live Activity, notification, and Screen Time paths.
- Do not add track previews, favorites, recommendations, random selection, a new
  screen, or new persistent state.

Release first as a local Simulator build, then carry it through the established
TestFlight widget lane only after widget tap, drawer choices, Start, countdown, and
return-to-controls are exercised. The change has no migration and is source-only
reversible.
