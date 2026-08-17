# Frame: Kwilt Labs Explore

## What the user said

> Move Explore into a Kwilt Labs capability so that it is off by default and users can turn it on in Settings.

## Restated in user voice

When Kwilt includes an ambitious capability that still needs real-world proof, I want it to stay quiet until I deliberately opt in, so I can trust the core app without losing access to something I want to test.

## Target audience

`audience-aspirational-family-organizers`: people who want useful family tools without becoming product administrators.

## Representative persona

Maya wants Kwilt to feel dependable in ordinary life. She is willing to try a promising capability when the choice and consequences are clear, but she should not inherit location behavior merely because it shipped in the bundle.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - experimental capability management must not make the core system harder to use.

## Job flow step

`job-flow-maya-move-family-life-forward`, **Keep using the system because it feels helpful, not fussy**, currently 3/5. The gap is trust and restraint, not feature discovery.

## Active anchors

- `jtbd-trust-this-app-with-my-life` - location collection and background work must require an explicit, reversible choice.
- `jtbd-move-the-few-things-that-matter` - Labs should protect the calm core rather than add another system to manage.

## Friction we're addressing

Explore is currently controlled at the menu by a remote flag, while its routes and signed-in runtime hosts remain registered. That is not a complete opt-in boundary, and it gives unstable work too much default runtime ownership.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Settings already uses canonical `SettingsPage`, `SettingsGroup`, and `SettingsToggleRow` anatomy.
- The capability menu already accepts an Explore visibility decision.
- Explore owns local-first history, background recording, sync, settings, and deep links.
- Pixel Pet already establishes the product contract `Settings > Labs > capability`, off by default with state preserved when disabled.

Constraints to preserve:

- Disabling a Lab hides and stops it; it does not delete its data.
- Location behavior cannot continue merely because Explore was previously enabled.
- The Labs surface stays a short capability list, not a remote-config dashboard.

Design implication: introduce one persisted, local, reusable Labs catalog and make every Explore entry/runtime boundary consume the same decision.

## Aspirational design challenge

How might we let Maya deliberately try emerging Kwilt capabilities while keeping the default app calm, predictable, and free of unchosen background behavior?

## Out of scope

Diagnosing the earlier TestFlight crash, changing Explore's map experience, deleting Explore history, or adding Pet to the app in this release.

## Open question

None. The user explicitly chose default-off, Settings-owned activation.
