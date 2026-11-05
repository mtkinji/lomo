# Rollover label alignment

The user reported the Rollover field looked misaligned in category settings.
The supplied screenshot and the native reproduction show the label above the
switch's vertical center. `rowTitle` used `flex: 1` inside a vertical `rowCopy`;
that expansion belongs only to titles directly inside horizontal SettingsRow.
The fix retains horizontal expansion there and lets nested titles size naturally.

UI contract: clearly associate the Rollover label with its on/off switch, preserving
the existing SettingsSurface group, typography, horizontal inset, whole-row touch
target, accessibility semantics and persistence behavior. This is an alignment
repair, not a new control or pattern. Kwilt's owned SettingsSurface/KwiltSwitch and
tokens remain the authority. No external exemplar or new dependency was used.

## Native evidence

- Source: `/Users/andrewwatanabe/Kwilt`, branch `codex/budget-category-identity-fix`,
  base `be1cd50a`; dirty shared SettingsSurface patch plus a temporary isolated fixture.
- Single runtime owner: Budget fixture at `scripts/money/native-harness`, Metro 8081.
- iOS 26.5 Simulator `Kwilt PR203 acceptance`, UUID
  `282D12B9-82BD-4D37-8DAF-A8A08F2EECAD`.
- Existing development host: `com.andrewwatanabe.kwilt`, version 2.0.2 (135),
  React Native 0.83.10; current source delivered through Metro, not TestFlight.
- [Before](before.png): default `large` content size, label visibly above switch.
- [After](after.png): same content size, off/on labels centered with their switches.
- [Larger text](after-large-text.png): `extra-extra-extra-large`; on/off rows,
  description rows, choice row and adjacent values remain readable and aligned.
- Synthetic fixture source: [fixture.tsx.txt](fixture.tsx.txt). It temporarily replaced
  the harness root through its existing network-isolated entry point. No backend
  was used. The normal entry point and content-size setting were restored afterward.

These captures exercise the production shared row components in isolation. The
adjacent date/balance rows are display controls in this fixture; no claim is made
about keyboard-open balance editing, a live settings save, or signed-device proof.
The actual MoneyRolloverSettings and shared SettingsSurface interaction tests also
pass. Physical-device confirmation remains pending for the next TestFlight build.
