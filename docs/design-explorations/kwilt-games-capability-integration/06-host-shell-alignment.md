# Games host-shell alignment

## Diagnosis

The Games art direction is not the problem. The shelf and join flow still behave like a standalone app nested inside Kwilt: they repeat a Games lockup, account affordance, and full-screen navigation where the host already owns those jobs.

## Anchor

`jtbd-help-us-enjoy-being-together`: familiar Kwilt chrome should make the way into play feel effortless, then get out of the way once the table experience begins.

## Three sketches

1. **Kwilt shell, Games canvas.** Use Kwilt's standard capability header on the shelf, remove the duplicate Games avatar/lockup, and present joining as a canonical bottom drawer. Keep setup, lobbies, and gameplay immersive.
2. **Every setup in a drawer.** Also move each game's player setup into drawers. This maximizes shell consistency but compresses the established table-start experience and creates avoidable parity risk.
3. **Header-only correction.** Replace the shelf header but leave joining full-screen. This is smaller, but it leaves the clearest standalone-shell seam intact.

## Recommendation and UI contract

Choose sketch 1.

- The shelf is a Kwilt capability inventory: standard `PageHeader`, standard left navigation button, title `Games`, no local avatar, and no `Kwilt Games` lockup.
- Join-by-code and nearby discovery are transient setup: a dismissible `BottomDrawer` over the shelf with the canonical drawer header and Games typography, fields, color, and motion inside it.
- Global profile and settings remain owned by the Kwilt capability drawer. Games may still request sign-in or player-profile editing at the moment persistence is useful, but the shelf does not advertise a second account destination.
- Player setup, an open table lobby, and active gameplay remain full-screen. They are the playful shared experience rather than host administration.
- Gameplay back/close controls remain Games-native in this pass. Converting them to generic page headers would weaken game identity without improving orientation.

## Reduction pass

Remove the shelf's duplicate brand lockup, duplicate account control, custom menu-button surface, join screen lockup, and redundant `Back to games` footer. Preserve the game catalog, cards, backdrop, typography, saved-player behavior, remote join behavior, and gameplay surfaces.

## Player settings extension

Removing the shelf avatar also removes the only pre-game route to Games player customization. Kwilt Settings should own that durable configuration instead of restoring a second account affordance inside Games.

### UI contract

- **Job:** When someone wants Games to feel like their table, they need to manage their player identity and remembered players before play so setup stays quick.
- **Primary action:** Edit My player.
- **Must show:** Games sound default, signed-in player identity, and remembered players already stored by game setup.
- **Reveal later:** Color and win/fail sound choices remain inside the existing player editor drawer.
- **Must not add:** A Games avatar, a second account system, a dashboard, player statistics, or a second identity model.
- **Reuse map:** Settings root and grouped rows → `SettingsSurface`; player editing → `PlayerIdentityEditor` and `SavedPlayerEditor`; persistence → existing Games profile/roster hooks plus one capability-local sound preference.
- **Behavior sources:** Global Settings ownership is the approved host-shell decision; contextual setup pencils remain shortcuts; player identity and roster persistence remain unchanged.
- **Required states:** Signed in, signed out, loading, no remembered players, local/cloud sync warning, and editor open.
- **Proof path:** Capability drawer avatar → Settings → Games → edit My player / a saved player / game sound default; then enter Games setup and confirm the same data appears.
