# Frame: Nearby Game Join

## What the user said

> When somebody hits Join in the top right of the Games inventory, make it easy to discover games near you and join without the current code-first friction.

## Restated in user voice

When a game is already opening in the room, Maya wants her phone to find the table and let her take a place immediately, so the small opening for play is not lost to codes, account setup, or one person administering everyone.

## Target audience

`audience-aspirational-family-organizers` — people who want ordinary family connection to begin easily without learning or maintaining a system.

## Representative persona

Maya is trying to turn a few unstructured minutes into shared play before coordination drains the moment.

- Current situation: someone nearby has opened a Kwilt table and Maya taps **Join** from Games.
- What she is trying to do: get herself into the same game with the least possible explanation.
- Emotional state or tension: willing and playful, but only briefly tolerant of setup.
- What would make this feel wrong: a radar of nearby people, account administration, ambiguous tables, background presence, or a permission detour with no clear payoff.

## Hero anchor

`jtbd-help-us-enjoy-being-together` — connection is the job; joining is setup that should disappear as quickly as trust allows.

## Job flow step

`job-flow-maya-start-playing-together`, step 5: **Join or seat tonight's players**. The recorded score is 1 from before Games integration and is stale relative to the current source. The integrated app now has a Join drawer, automatic foreground browsing, Bank and Slanguage advertisements, and QR/link/code paths, but the current empty-search composition still reads primarily as a manual code form.

## Active anchors

- `jtbd-help-us-enjoy-being-together` — nearby joining protects the fleeting opening for play.
- `jtbd-invite-the-right-people-in` — discovery must reveal only the open private tables involved, not nearby identities.
- `jtbd-trust-this-app-with-my-life` — the product must be explicit about when discovery is active, what it reveals, and what fallback still works.

## Friction we're addressing

The Join drawer already begins browsing, but its strongest visible controls are a blank player-name field and a large table-code field. A person can miss that discovery is happening, and a discovered-table card is disabled until a name is entered. The behavior exists; its activation, comprehension, and last-inch path are not yet as effortless as the job requires.

## System alignment

Constraint posture: `Fit the system`

Current system facts:

- Existing surface: the top-right **Join** action opens `JoinTableDrawer` over the Games shelf.
- Existing user flow: opening the drawer starts foreground nearby browsing; a found Bank or Slanguage table appears above the code fallback; selecting it makes the same backend table claim as entering its code.
- Existing domain/data model: one capacity-bounded, multi-use table pass; room membership and canonical game state stay server-authoritative.
- Existing technical affordances: the integrated app includes an iOS Expo module using Network framework peer-to-peer Bonjour for `_kwilt-table._tcp`. It is not a direct CoreBluetooth browser. QR, link, and short code remain required fallbacks.
- Existing UX/copy conventions: Games owns its cream, paper, felt, coral, turmeric, display type, playful table language, and bottom-drawer grammar.
- Adjacent work: Family Screen Time documents a future explicit two-sided nearby pairing flow with a matching phrase. No current source implementation of that flow was found in this checkout, and its consent semantics are intentionally stronger than joining an advertised game table.

Constraints to preserve:

- Discovery runs only while the Join surface is open.
- Do not expose player names, household identity, exact distance, location, durable account identifiers, or background presence.
- All transports converge on the same table claim; proximity is discovery, not authorization.
- Manual code, QR, and link joining remain usable when discovery is unavailable or denied.
- The host opens one reusable table; they do not invite each seat separately.

Constraints we may challenge:

- A blank player name should not block an otherwise one-tap nearby join when Kwilt already knows the person's Games name.
- The code field should not visually dominate while a trustworthy nearby result is available.

Design implication:

Do not add a Discover mode. Make nearby discovery the clearly visible default behavior of the existing Join sheet, prefill identity when available, promote a found table into the primary action, and let the code form recede into a dependable fallback.

## Aspirational design challenge

How might we help Maya take her place in the game already happening around her in one confident choice, while preserving private foreground discovery and a reliable no-radio fallback?

## Out of scope

Public player discovery, background scanning, proximity-based identity, automatic household pairing, remote invitations, Android parity, expanding remote play to games without an open-table contract, or replacing server membership checks.

## Open question

When multiple nearby tables advertise the same game, is the current host-visible table mark sufficient for a confident choice on real devices?
