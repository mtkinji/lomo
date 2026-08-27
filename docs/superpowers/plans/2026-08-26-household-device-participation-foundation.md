# Household Device Participation Foundation Implementation Plan

**Goal:** Let an organizer set up a personal device for an existing dependent child
without creating a child login, and let a caregiver designate a signed-in iPad once as
a shared Household device.

**Canonical contract:** [Household device participation](../../architecture/household-device-participation.md)

## Slice 1: Device domain and server authority

- [x] Add setup-session, Household-device, and device-member-access schema with negative
  authorization tests and audit events.
- [x] Add caregiver RPCs to create/cancel a personal-device session, list/revoke devices,
  designate/release a shared device, and choose shared-device members.
- [x] Add a narrowly scoped unauthenticated claim Edge Function. It accepts only a
  short-lived opaque setup secret plus install identity, returns a managed-device
  credential once, stores only hashes, and reveals no Household details on failure.
- [x] Store the managed credential in iOS secure storage, restore it after relaunch, and
  make the corresponding server device revocable.

## Slice 2: Personal child-device setup

- [x] Add a **Devices** section to a dependent member page with **No personal devices
  connected** and **Connect Charlie's iPhone**.
- [x] Make that one invitation open directly to QR/manual pairing with expiry, cancel,
  claimed, and connected states. **Use an existing Kwilt account** remains secondary;
  there is no duplicate explanation or **Continue** screen.
- [x] Add the signed-out setup receiver and deep link. Resolve the session before normal
  sign-in, show **Set up Kwilt for Charlie**, claim managed access, and enter a bounded
  child shell.
- [x] Keep capability activation separate; device setup does not turn on Chores, Screen
  Time, or every future child capability.

## Slice 3: Shared Household iPad

- [x] Add **Settings > Household > Household devices** and **Set up this iPad**.
- [x] Use the current caregiver session to designate the install directly; no QR or
  per-child pairing.
- [x] Add eligible-member selection and a **Who's using Kwilt?** Household Mode entry.
- [x] Keep selected-child actor state distinct from the caregiver session and cover all
  caregiver-only routes.
- [x] Require caregiver-only reauthentication to leave Household Mode; do not accept a
  commonly known device passcode as sufficient caregiver proof.

## Slice 4: Screen Time continuation

- [x] Consume the personal managed-device identity from Household instead of requiring a
  child JWT.
- [ ] Prove Apple `.child` authorization and picker behavior on signed devices before
  completing native policy transport.
- [ ] Keep Ready/Applied gated by the exact device receipt and coherent snapshot.
- [x] Do not offer child-specific Screen Time enrollment for a shared Household iPad.

## Verification gates

- [x] Focused migration, Edge Function, contract, state, and navigation tests.
- Diff-aware completion verification once the slice is complete.
- Simulator proof for member-page, organizer, receiver, Settings, and Household Mode
  navigation and recovery states.
- Signed physical-device/TestFlight proof for secure relaunch, shared-iPad caregiver
  reauthentication, Apple `.child` authorization, receipt application, and release.

Source, Simulator, signed-device, TestFlight, and production evidence remain separate.
