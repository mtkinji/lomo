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
