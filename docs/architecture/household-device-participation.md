# Household device participation

**Status:** Accepted product and implementation contract
**Date:** 2026-08-26
**Owner:** Household

This document is the canonical contract for allowing a device to participate in a
Kwilt Household. Screen Time, Chores, and other child-facing capabilities consume
this foundation; none of them owns Household membership or device enrollment.

## Product promise

An organizer can add Charlie to a Household before Charlie has an account or a
device. Charlie's member page remains complete and useful. When a device becomes
relevant, the organizer can choose **Connect Charlie's iPhone** and Kwilt carries Charlie's
existing Household identity into the setup.

Kwilt never searches for a child by name or email, never silently creates a second
Charlie, and never requires a conventional child login merely to use a
guardian-managed device.

## Two device kinds

| Device kind | Identity | Setup entry | Normal use | Screen Time |
|---|---|---|---|---|
| Personal child device | One exact child membership | Charlie's member page; QR or manual code transfers the guardian-approved setup session | Guardian-managed, device-bound child access | May continue into Apple's child authorization and applied-receipt flow |
| Shared Household device | The Household, plus an assigned caregiver | Caregiver signs in on the device and chooses **Set up for my household** | A bounded **Who's using Kwilt?** member session | Not treated as any one child's Screen Time device |

These are different branches of one device-participation foundation. A shared iPad
is designated once; it is not paired separately to Charlie, Olive, Wren, or Grant.

## Identity model

The implementation must keep these facts separate:

- **Household membership** identifies Charlie in the family and carries name,
  photo, role, and capability eligibility.
- **Optional account binding** connects an existing Kwilt login to Charlie. It is
  useful when Charlie already has an account, but it is not the prerequisite for
  guardian-managed device access.
- **Managed child access** is narrow authority created by a guardian for one child
  membership on one personal device.
- **Device credential** proves that the claimed install still holds that managed
  access. It is stored in secure device storage; the server stores only a hash.
- **Active member session** identifies who is using a shared device now. It never
  turns that child into the signed-in caregiver.
- **Capability activation** determines whether Charlie can use Chores, Screen Time,
  or another capability. Device setup does not activate every capability.
- **Native authorization** such as Apple Family Controls remains capability-owned.
  A successful Kwilt device claim is not proof that Apple applied Screen Time.

## Personal child device setup

1. The organizer opens Charlie and taps **Connect Charlie's iPhone**.
2. Kwilt immediately creates a short-lived, single-use setup session for Charlie's
   exact membership and opens **Connect Charlie's iPhone** with the QR code as the
   primary content and a six-digit manual code fallback. There is no intervening explanation
   or **Continue** screen.
3. The pairing surface quietly explains that Charlie does not need a separate Kwilt
   account. Native Share lives in the header; an existing-account choice belongs on
   the receiving device, where identity can be reviewed.
4. On Charlie's device, Kwilt opens the setup receiver before requiring a normal
   sign-in. The receiver resolves the setup session and says **Set up Kwilt for
   Charlie** with Household and guardian context.
5. After confirmation, the server creates guardian-managed, device-bound access
   and returns its credential once. The child device stores it securely.
6. The organizer sees the device attached to Charlie. Charlie's device enters the
   child experience allowed by Charlie's active capabilities.
7. While the caregiver receipt is visible, it checks the existing manager-authorized
   device-list RPC every three seconds. The exact child's new personal-device receipt
   automatically replaces the QR/code with a connected confirmation. This uses no
   direct table subscription and does not broaden RLS or Realtime publication.
8. If Screen Time is selected, setup continues into Apple authorization. Kwilt
   shows **Ready** only after the child device has returned an applied receipt that
   the server can reconcile to the current desired policy.

The code is a transport secret, not Charlie's identity. Expired, used, cancelled,
or revoked sessions cannot claim a device. Removing the device revokes its managed
access without deleting Charlie from the Household.

The caregiver receipt has no bottom action stack. Back cancels an active setup
session. A Kwilt-connected receipt is not an Apple authorization or policy-application
receipt.

### Existing account path

If Charlie already has a Kwilt account, **Sign in instead** allows an explicit,
guardian-approved attachment of that authenticated account to Charlie's exact
membership. Kwilt does not infer the connection from a matching name or email.
This path coexists with managed child access; it does not replace the default setup.

## Shared Household iPad setup

1. A caregiver signs in normally on the iPad.
2. Kwilt offers **Set up this iPad for your household** during welcome/setup.
3. The caregiver confirms the Household and becomes the device's assigned
   caregiver.
4. The caregiver chooses eligible members and child-facing capabilities.
5. Household Mode opens with **Who's using Kwilt?** and creates a bounded member
   session for the selected child.
6. Returning to full caregiver Kwilt requires caregiver-only reauthentication. An
   ordinary device passcode that children know is not sufficient.

If the caregiver skips the initial offer, the same action remains available at
**Settings > Household > Household devices > Set up this iPad**. No QR code or
per-child pairing is required because the authenticated caregiver is authorizing
the current install directly.

The first release does not make a shared iPad a child-specific Screen Time device.
Device-wide shared-iPad restrictions are a separate future capability.

## UI contract

The member page must pass this three-second read:

1. Charlie belongs to this Household.
2. Charlie has no personal device connected yet.
3. A device can be set up when it becomes useful.

On Charlie's page, use a neutral **Devices** section:

- empty state: **No iPhone connected** with a quiet phone icon;
- supporting copy inside the same card: Charlie can still participate in the
  household without one;
- secondary action: **Connect Charlie's iPhone**;
- connected rows show device name, state, and only relevant capability follow-ups.

Household settings owns a separate **Household devices** destination for shared
devices. Do not mix a shared iPad into Charlie's personal-device list.

The pairing surface preserves context across both devices: Charlie's name and photo,
the Household name, the authorizing caregiver, progress, recovery, and a manual
code fallback. It borrows the trust and continuity principles of Apple's paired
setup experiences without copying their visual treatment.

## First learning release

The first complete slice proves:

- one organizer can create and cancel a short-lived setup session for one child;
- one fresh iOS install can claim guardian-managed access without a standard child
  account;
- the device survives relaunch, can be listed, and can be revoked;
- one caregiver-signed-in iPad can be designated as a shared Household device and
  enter/exit a bounded member session;
- Screen Time can consume the personal-device identity and still requires its own
  Apple authorization and applied receipt.

Proximity transfer, multiple personal devices per child, remote caregiver approval,
and shared-iPad Screen Time are later slices. Simulator proof covers Kwilt state and
navigation only; Apple child-authorization proof requires a signed physical-device
or TestFlight build in the correct Apple family.
