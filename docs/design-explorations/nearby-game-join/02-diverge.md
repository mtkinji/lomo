# Diverge: Nearby Game Join

## Axis of variation

How explicitly should a player enter discovery: automatic inside the existing Join moment, a dedicated scanner, or a mutual-confirmation pairing ritual?

## Alternative A: The Table Comes Forward

Opening **Join** immediately and visibly searches. The sheet pre-fills the remembered Games name, shows a compact searching row, and replaces that row with the nearby table card as soon as one is found. The card becomes the primary action; table code remains below as a fallback.

- Audience/persona fit: strongest for Maya because it removes coordination without teaching a new feature.
- Design-challenge answer: a returning player joins in one confident choice.
- System fit: strongest; it refines the current drawer, browsing lifecycle, player identity, and table claim.
- Best when: most joins happen in the same room and the expected table is easy to recognize.
- Fails when: several identical tables are nearby or remembered identity is absent and the disabled card does not explain the next step.
- Four-object model: touches none of Arc, Goal, Activity, or Chapter; Games is an intentional capability outside that planning hierarchy.
- Capture-first: not applicable; no life capture is blocked.
- Anti-pattern check: passes. No dashboard, public sharing, streak, forced onboarding, or anthropomorphic system behavior.

## Alternative B: Find a Table

Tapping **Join** opens a dedicated scanner-like screen with animated discovery, a list of nearby games, permission help, and a separate **Use a code** path.

- Audience/persona fit: legible but too ceremonial for a fleeting family-play moment.
- Design-challenge answer: makes discovery unmistakable and can handle many nearby tables well.
- System fit: weaker; adds a route, visual mode, education, and back-stack state for behavior the current drawer already owns.
- Best when: discovery is itself a destination or many concurrent public tables are common.
- Fails when: the normal household case is one nearby table and the scanner makes setup feel technical.
- Four-object model: touches none of the four objects.
- Capture-first: not applicable.
- Anti-pattern check: technically passes, but risks a dashboard-like nearby inventory and attention-heavy radar theatrics. The fix would reduce it until it resembles Alternative A.

## Alternative C: Match at the Table

Both host and player explicitly enter nearby mode and confirm the same two-word phrase before the player can claim a seat. This borrows the stronger mutual-confirmation idea from child-device setup.

- Audience/persona fit: trustworthy but overdemanding for a private game advertisement whose host already chose to open the table.
- Design-challenge answer: maximizes confidence in crowded environments.
- System fit: medium-to-weak; requires a handshake state, two-sided confirmation, timeout behavior, and backend binding beyond the existing advertised table pass.
- Best when: the action creates a durable or high-authority relationship.
- Fails when: every extra tap consumes the opening for play.
- Four-object model: touches none of the four objects.
- Capture-first: not applicable.
- Anti-pattern check: passes on privacy, but forced confirmation is unjustified commitment for the ordinary single-table case.

## Alternative D: Host Sends a Nearby Nudge

The host sees nearby Kwilt devices and taps the people to invite; those devices receive an in-app or local notification.

- Audience/persona fit: poor. It recreates the host-as-administrator problem and makes people discoverable.
- Design-challenge answer: it does not; joining becomes host work.
- System fit: weak; requires player identity broadcasting, invitations, notification state, and consent rules.
- Best when: never for the current private-table job.
- Fails when: privacy and guest-first play matter.
- Four-object model: touches none of the four objects.
- Capture-first: not applicable.
- Anti-pattern check: fails default-public/discoverable sharing and attention-respecting notification principles. Discard.
