# Evaluate Learning: Nearby Game Join

## Learning questions

1. Do people notice that Kwilt is looking nearby without being taught?
2. Does remembered-name prefill make the nearby result feel safely one tap, or does it create identity surprise?
3. Can players choose the right table when more than one is present?
4. Does the code fallback remain obvious during slow, denied, and failed discovery?
5. Does the current foreground Bonjour implementation behave reliably enough on signed physical devices for this to be a product promise?
6. Does this surface reveal native lifecycle needs that should become a shared nearby-session primitive with Household, or are the two contracts better kept separate?

## Evidence plan

Use at least eight join attempts across three real-device gatherings, including:

- one host and one joiner;
- one host and at least two joiners;
- two simultaneously advertised tables;
- local-network permission allowed and denied;
- drawer close/reopen;
- table disappearance, full/closed table, and code fallback;
- disconnect/rejoin if the existing room contract supports it.

Supporting evidence:

- players tap a nearby table without the host reading the code or narrating the UI;
- returning players accept or edit the prefilled name without confusion;
- the host and joiner independently identify the same table mark;
- joining reaches the canonical room and player roster;
- discovery stops when the drawer closes.

Disconfirming evidence:

- people wait on the search state while ignoring the usable code;
- the host must explain that discovery is active;
- people repeatedly tap a disabled result without understanding the name requirement;
- multiple tables are indistinguishable;
- stale advertisements or lifecycle failures show closed tables;
- a permission prompt feels surprising or its denial produces a dead end;
- nearby success does not converge on canonical backend membership.

## Instrumentation

Record:

- Join drawer opened;
- nearby availability and coarse lifecycle state;
- whether any result appeared;
- join method: nearby, code, QR/link token;
- join attempted, succeeded, or failed with a coarse reason;
- whether a remembered name was available and whether it was edited.

Do not record:

- player names;
- table codes or marks;
- device/service identifiers;
- host identity;
- location, distance, signal strength, or a persistent nearby graph;
- raw discovery payloads.

Pair analytics with short observation notes: whether anyone asked what to do, whether the host spoke the code, and whether the chosen table was obvious.

## Decision rule

Proceed as permanent Games behavior when most eligible attempts across the matrix use the nearby result without explanation, no wrong-table join occurs, every failure state leaves a successful fallback, and signed-device lifecycle behavior is stable.

Revise the result card or table mark if discovery succeeds but choice is ambiguous. Revise activation/copy if people do not realize search is running. Retire only the presentation enhancement—not the underlying fallback paths—if discovery is too unreliable to promise.

Do not extract a cross-capability nearby framework from this release alone. Consider that work only after the Household implementation supplies a second tested contract and the shared lifecycle/permission behavior is clearer than the differing consent semantics.

## Expected next action

After Andrew accepts the frame, write the implementation plan for the existing Join drawer and run the physical-device TestFlight matrix before expanding supported games or transport scope.
