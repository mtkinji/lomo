# Frame: Household device pairing receipt

## What the user said

> Yes, and can the screen auto update when Charlie accepts?

## Restated in user voice

When I am connecting a child's phone, I want the setup screen to quietly confirm the exact device connection as soon as it happens, so I do not have to manage the pairing process or wonder whether it worked.

## Target audience

`audience-aspirational-family-organizers`: caregivers who want family participation without administering a workspace.

## Representative persona

Maya is holding the caregiver phone while a child completes setup on a second device. She wants one trustworthy handoff, not another family-technology checklist.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - family participation should make ordinary family life easier to move forward.

## Job flow step

`job-flow-maya-move-family-life-forward`, step 7, **Family participation** (3/5): the household boundary exists, but device participation still needs calm, truthful receipt behavior.

## Active anchors

- `jtbd-invite-the-right-people-in` - connect one exact child membership without widening access.
- `jtbd-trust-this-app-with-my-life` - make success visible without exposing private device tables.

## Friction we're addressing

The pairing screen presents three unlike actions as peers and makes the caregiver visually manage the process. Claim detection exists as an unverified polling detail rather than an explicit, tested interaction contract.

## System alignment

Constraint posture: `Fit the system`

- Existing surface: `HouseholdDeviceSetupScreen` already owns the caregiver pairing session and connected confirmation.
- Existing flow: the child device claims the one-time credential; the caregiver can list authorized Household devices through an authenticated RPC.
- Existing model: setup sessions become `claimed` and create a `personal_child` device row.
- Existing technical affordance: `list_kwilt_household_devices` returns only manager-authorized device receipts.
- Existing UX convention: `SettingsPage` owns back navigation and balanced header chrome.

Preserve the private-table boundary, the one-time credential, explicit child identity, and truthful server receipt. Do not add Realtime table exposure, a refresh control, or a new setup step.

## Aspirational design challenge

How might we help Maya see that Charlie's phone connected the moment it happens, while preserving a calm one-key pairing surface and the private Household boundary?

## Out of scope

Apple Screen Time authorization, account attachment, multiple personal devices per child, and push notifications.

## Open question

None for this bounded release.
