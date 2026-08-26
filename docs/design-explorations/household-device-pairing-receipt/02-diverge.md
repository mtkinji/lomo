# Diverge: Household device pairing receipt

Axis: server-pushed immediacy versus bounded client verification.

## Private Realtime subscription

Publish device changes and subscribe to the exact Household. This is immediate, but it expands replication and row-authorization surface area for a single short-lived screen. Best when many long-lived screens need the same stream; fails the current reduction and privacy test.

## Authorized receipt polling

While the pairing receipt is visible, call the existing manager-authorized device-list RPC every three seconds and transition when the exact child device appears. It reuses the current authority boundary, requires no schema change, and is fast enough for a human handoff. Best for this short-lived setup moment; fails only if near-instant sub-second response becomes essential.

## Manual confirmation

Show a **Check connection** action that reruns the authorized RPC. It is technically simple and explicit, but makes the caregiver responsible for detecting success and adds another control to the surface. Best for unreliable or expensive networks; fails the calm automatic-receipt job.

All options preserve the one-time credential and avoid productivity, urgency, public-sharing, and forced-commitment patterns.
