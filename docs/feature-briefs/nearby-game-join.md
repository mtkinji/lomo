---
id: brief-nearby-game-join
title: Nearby-First Game Join
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-help-us-enjoy-being-together
job_flow: job-flow-maya-start-playing-together
serves: [jtbd-help-us-enjoy-being-together, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-kwilt-games-capability-integration]
owner: andrew
last_updated: 2026-07-30
---

# Nearby-First Game Join

## Context

The integrated Games Join drawer already starts foreground nearby-table browsing and can join discovered Bank or Slanguage tables through the same server claim as a code. The current composition still reads as a name-and-code form, so people may not notice the automatic behavior or may encounter a disabled result before entering a name. This brief makes the existing nearby path feel intentional and effortless without creating a public discovery product.

## Target audience

Aspirational family organizers want a small opening for play to become time together before setup and coordination consume it.

## Representative persona

Maya has tapped **Join** because someone in the room has already opened a Kwilt table. She wants to take her place, not learn networking language or ask the host to administer her seat.

## Aspirational design challenge

How might we help Maya take her place in the game already happening around her in one confident choice, while preserving private foreground discovery and a reliable no-radio fallback?

## Hero JTBD

`jtbd-help-us-enjoy-being-together` — joining is successful when it quickly disappears into the shared play, rather than becoming its own activity.

## Job flow step

`job-flow-maya-start-playing-together`, step 5: **Join or seat tonight's players**. Current source delivery is ahead of the flow's pre-integration score: a Join drawer, foreground discovery, and QR/link/code claims exist. The remaining gap is activation and comprehension in the integrated surface.

## JTBD framing

When a game is already opening nearby, let the player recognize the table and join it without hearing or typing a code, while revealing no nearby people or durable identity and preserving an immediate fallback.

## Design

- Keep the top-right **Join** action and existing bottom drawer.
- Start discovery only while that drawer is open and make its state visibly legible.
- Prefill the remembered Games player name when available; keep it editable.
- Promote a discovered table above the manual code form as the primary action.
- Show the game and the same transient table mark visible on the host.
- If a name is still required, make the result actionable by focusing the name field and explaining the requirement; do not leave a mysterious disabled card.
- Keep table code visible and usable throughout non-token joining.
- On discovery failure or denial, explain that the code still works without sending the person to settings.
- Retain the existing short-lived advertisement, capacity-bounded claim, membership, QR/link/code, canonical room state, and cleanup contracts.
- Do not show nearby player names, devices, households, exact distance, signal strength, location, or background presence.
- Do not reuse the proposed child-device matching ritual in Games. Durable household pairing and ephemeral game joining have different consent and authority requirements.

## Acceptance criteria

- Tapping **Join** visibly enters a nearby-search lifecycle without another discovery action.
- A remembered Games name is prefilled but can be changed before joining.
- A found table is presented before the code form with game and matching host table mark.
- With a known name, one press on a nearby result attempts the canonical table claim.
- Without a name, pressing the result focuses name entry and explains what is needed.
- Starting, empty, result, failure/denial, table disappearance, closed/full, and drawer-close states are coherent.
- Code entry remains usable whenever a token is not already resolving the table.
- Browsing stops and results clear when the drawer closes.
- Analytics contain no name, code, table mark, device/service identifier, location, distance, or raw nearby payload.
- Logic tests cover state transitions, prefill, result selection, missing-name behavior, failure fallback, and cleanup.
- Signed physical-device/TestFlight evidence covers two joiners, two advertised tables, permission denial, close/reopen, disappearance, code fallback, and canonical room convergence.

## Activation

Teach the behavior only at the moment of intent. The Join sheet says **Looking nearby…**, then brings a found table forward. No onboarding, setting, promotional card, or separate scanner is added.

## Learning release

Ship inside a TestFlight Games-capability build. Keep Bank and Slanguage as the supported table kinds, use manual observation plus privacy-safe method/state events, and defer any native abstraction until Household has a second implemented contract.

## Spec refinement

Before implementation, confirm the current Games player-profile source and whether its display name can be read without starting Games cloud/auth work. Verify on host and joiner that `tableMarkForCode` is the same recognition mark. Model browsing lifecycle explicitly rather than inferring every empty array is still searching. Treat the current Network framework Bonjour path as the implemented transport; do not describe or redesign it as direct CoreBluetooth without separate technical work.

## Success signal

At real gatherings, eligible players use the nearby table without host coaching or hearing the code; no one joins the wrong table; and code/QR continue to rescue every unavailable or failed discovery state.

## Open questions

- Does the current table mark distinguish two same-game tables well enough in practice?
- Which existing Games name source is the least surprising prefill when a person has both a personal profile and remembered local players?
