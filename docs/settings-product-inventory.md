# Kwilt Settings Product Inventory

**Status:** Phase 0 code inventory

**Observed:** 2026-07-21

This inventory describes the current Kwilt host before Money or Games import. It is not a
claim that every implemented route is production-visible.

| Domain | Current route or owner | Scope | Current visibility | Phase 1 treatment |
|---|---|---|---|---|
| Profile and avatar | `SettingsProfile`, `SettingsHomeScreen` | Global | Visible | Keep global |
| Appearance | `SettingsAppearance` | Global | Direct route, not primary list | Keep one owner |
| AI model | `SettingsAiModel` | Global Agent preference | Direct route | Keep global unless later model policy changes |
| Notifications | `SettingsNotifications` | Global | Visible | Keep global; capability-specific rows may deep-link here |
| Screen Time controls | `SettingsScreenTimeProtection` | Capability/platform boundary | Visible | Keep named configuration; no second settings home |
| Weekly Chapters | `SettingsWeeklyChapters` | Capability | Visible | Link from Chapters ellipsis and global search/settings |
| Phone Agent | `SettingsPhoneAgent` | Global Agent integration | Hidden | Remain hidden until complete |
| Connected tools | `SettingsConnectedTools` | Global integrations | Visible | Keep global |
| Sharing | `SettingsSharing` | Global/accountability | Visible | Keep global |
| Legal and privacy | `SettingsLegalPrivacy` | Global | Direct route | Keep global |
| Haptics | `SettingsHaptics` | Global | Hidden | Remain hidden until complete |
| Widgets | `SettingsWidgets` | Global platform integration | Hidden | Remain hidden until complete |
| Execution targets | `SettingsExecutionTargets` | Global integrations | Hidden | Remain hidden until complete |
| Activity Areas | `SettingsActivityAreas` | Goals and To-dos capability | Visible | Contextual contribution plus global discoverability |
| Plan availability | `SettingsPlanAvailability` | Plan capability | Visible | Link from Plan ellipsis |
| Plan calendars | `SettingsPlanCalendars` | Plan capability | Visible | Link from Plan ellipsis |
| Destination library/details | `SettingsDestinationsLibrary` and detail routes | Global integrations | Routed | Keep one global owner |
| Subscription and paywall | `SettingsManageSubscription`, `SettingsChangePlan`, `SettingsPaywall` | Global | Routed | Keep one RevenueCat owner |
| Super Admin tools | `SettingsSuperAdminTools` | Internal | Role/dev gated | Never contribute to public capability settings |

## Missing imported-capability inventory

Money and Games settings are intentionally not represented here. Their import plans must
inventory every standalone setting and classify it as global, capability, object, session,
or retired before code moves into the host.
