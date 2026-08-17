# Converge: Capability-Owned Kwilt Labs

## Decision

Choose **Capability-Owned Labs Catalog**.

| Alternative | Persona fit | Trust | System fit | Reversibility | Result |
| --- | --- | --- | --- | --- | --- |
| Master Labs Mode | Medium | Medium | Medium | Medium | Reject |
| Capability-Owned Catalog | High | High | High | High | Choose |
| Remote Cohort Only | Low | Low | Existing but incomplete | Low | Reject |

## Capability delta

Today, a user cannot explicitly decide whether Explore belongs in their app, and hiding its menu row does not stop its signed-in runtime hosts.

After this release, a user can turn Explore on or off in Settings > Kwilt Labs. The choice controls menu visibility, route access, sync, and location runtime. Turning it off preserves private Explore history.

Still intentionally unsupported: a master Labs switch, remote cohort overrides, automatic promotion, Labs analytics dashboards, and data deletion through the activation toggle.

## Reductive decisions

- One Settings destination and one capability row.
- No Labs home card, badge, explainer carousel, confirmation dialog, or restart requirement.
- Remove Explore from the root Personalization list; its detailed settings remain capability-owned after activation.
- Reuse canonical Settings components and the existing capability menu.

## Activation

Organic discovery in Settings. A disabled Explore deep link lands at Kwilt Labs rather than opening the map. Enabling takes effect immediately.

## Bet

We're betting that an explicit per-capability switch makes ambitious location behavior feel safer and keeps the core app calmer. If users cannot understand why Explore disappeared or cannot reliably stop its runtime, revisit the access and migration contract before adding another Lab.

## Success signal

Explore is absent and inactive on a fresh/default state, appears immediately after opt-in, becomes inaccessible and stops background services after opt-out, and retains its stored history throughout.
