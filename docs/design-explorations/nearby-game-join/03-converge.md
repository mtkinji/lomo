# Converge: Nearby Game Join

## Qualitative comparison

| Alternative | Maya and job fit | System fit | Trust | Setup cost | Verdict |
| --- | --- | --- | --- | --- | --- |
| The Table Comes Forward | Strong | Strong | Strong with clear state and table mark | Lowest | Choose |
| Find a Table | Medium | Medium | Strong | Medium | Reject as excess surface |
| Match at the Table | Medium | Weak | Strongest | High | Reserve for durable pairing |
| Host Sends a Nearby Nudge | Weak | Weak | Weak | High for host | Discard |

## Chosen alternative

**The Table Comes Forward**: enhance the current Join drawer so foreground discovery is visibly active, a remembered Games name makes a found table immediately joinable, and the discovered table becomes the obvious primary action. Keep code entry in the same sheet as the quiet fallback.

## Capability delta

Today, a player can:

- open Join and unknowingly start nearby browsing;
- join a discovered Bank or Slanguage table after entering a name;
- enter a code, scan a host QR, or follow a link.

Today, the player cannot do well enough:

- understand at a glance that Kwilt is actively looking nearby;
- act on a nearby result without first noticing and completing a separate name requirement;
- confidently distinguish multiple similar tables unless the current table mark proves sufficient in use.

After this concept ships, a returning player can:

- tap **Join**, see that nearby search is active, recognize the host's table, and join with one choice using their remembered Games name;
- fall back to the table code without leaving the sheet or diagnosing the radio state.

Still intentionally not possible:

- browsing nearby people, households, or child devices;
- background discovery or notification;
- joining without a valid open table claim;
- using proximity as identity, membership, or authorization;
- nearby joining for games without a remote open-table contract.

## Reductive design decisions

- Enhance `JoinTableDrawer`; do not add a scanner route or a Games setting.
- Discovery starts from the existing **Join** action; do not add a second **Nearby** button.
- Use the existing Games player profile when available; do not create a nearby identity.
- Use one compact state region that transitions from searching to result to fallback/error.
- Promote the result above the code field; do not hide or remove code entry.
- Do not show distance, signal strength, host/player names, device names, or an empty nearby list.
- Do not generalize the native module during the learning slice. Extract a shared nearby-session primitive only when the child-device implementation supplies a second real contract.

## Activation path

The readiness moment is exactly when a person taps **Join** while someone nearby has opened a table. Teach nothing beforehand. In the drawer:

1. Prefill the remembered Games name when one exists.
2. Show a calm, explicit **Looking nearby…** state.
3. When a table appears, replace the search row with a primary table card showing game and the same playful mark the host sees.
4. One tap claims the seat and opens the room.
5. If discovery is unavailable, delayed, or denied, keep the code form ready and explain that it still works.

Natural adoption means people begin tapping the nearby table without the host reading out a code or coaching them through the sheet.

## Accepted trade-offs

- iOS-first physical-device learning is acceptable because the current native affordance is Apple-only.
- Discovery may take a moment; honest state and immediate fallback are preferable to pretending it is instant.
- The first slice supports only the table kinds the existing advertisement and claim contracts support.

## Rejected trade-offs

- No background presence for faster discovery.
- No public nearby lobby inventory.
- No mutual confirmation ritual in the normal one-table case.
- No removal of QR/link/code reliability.
- No host-managed per-seat invitations.

## System implications

This is primarily presentation and activation work over an existing native module and server claim. The implementation must connect the existing remembered-player source to the drawer, model browsing states explicitly enough to avoid misleading copy, and verify that host and joiner display the same table mark. It must not infer that Family Screen Time's proposed pairing contract is already implemented or interchangeable.

## Bet

We're betting that nearby joining feels missing because the current automatic behavior is visually subordinate and still asks for avoidable identity input—not because people need a dedicated discovery surface. If real-device sessions still require host coaching, we would revisit table disambiguation and only then consider a more explicit finder.

## Success signal

In ordinary real-device gatherings, most eligible players recognize and use the nearby table without hearing or typing the code, while code/QR remain dependable when discovery is unavailable and nobody mistakes one table for another.
