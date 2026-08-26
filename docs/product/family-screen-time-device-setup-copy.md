# Family Screen Time Device Setup Copy Contract

**Status:** Accepted product-copy contract
**Date:** 2026-08-26
**Architecture:** [Child-device enrollment and reconciliation](../architecture/family-screen-time-device-enrollment-and-reconciliation.md)
**Job flow:** [Maya establishes family Screen Time](../job-flows/maya-establish-family-screen-time.md)

This document owns the parent- and child-facing instructions for the first real-device
family Screen Time setup. It uses plain language in the product while the architecture
owns protocol names and state.

## Voice and hierarchy

Every setup state answers, in order:

1. What is true?
2. Which phone needs attention?
3. What should this person do next?
4. What will happen after that?

Use **parent or guardian**, **Charlie's iPhone**, **Apple Family Sharing**, and **apps and
categories**. Do not use *managed endpoint*, *receipt*, *desired version*, *reconcile*,
*policy digest*, *opaque token*, *compliance*, or *device control plane* in family UI.

Do not say **Connected**, **Ready**, **Applied**, or **Released** before the corresponding
authoritative state exists.

## Caregiver setup entry

### Three-second read

> **Finish setup on Charlie's iPhone**

### Body

> You'll need Charlie's iPhone nearby. Charlie must be signed in to Kwilt and be in your
> Apple Family Sharing group.

### Primary action

> **Start device setup**

### Quiet disclosure

Label:

> **What you'll do**

Expanded content:

> 1. Open Kwilt on Charlie's iPhone.
> 2. Confirm this is Charlie's device.
> 3. Approve Apple's parental-controls permission.
> 4. Choose the apps and categories for the agreement.
> 5. Wait while Kwilt checks that the agreement reached this iPhone.

Do not lead with a paragraph about Apple APIs or background enforcement. The user needs
the other phone, prerequisites, and one next action.

## Enrollment transport

### Caregiver device

Title:

> **Open this on Charlie's iPhone**

Body:

> Scan this code with Charlie's iPhone, or enter the short code in Kwilt.

Expiry:

> **This code expires in 15 minutes.**

Actions:

- **Share link**
- **Create a new code** — shown after expiry
- **Cancel setup** — quiet secondary action

Do not say that scanning connects the phone. It opens the exact child-device review; the
authenticated claim and Apple approval still have to happen.

## Optional existing-account path

### Caregiver device

Title:

> **Charlie already has a Kwilt account?**

Body:

> You can connect that account to Charlie's existing Household profile. This is optional;
> you can also set up this iPhone with guardian-managed access.

Primary action:

> **Sign in instead**

### Child device

Title:

> **Connect your account to Charlie?**

Body:

> Andrew invited this account to take Charlie's place in the Household. This connects
> the existing child profile and Screen Time setup; it does not share your private Goals,
> chats, Activities, or Money.

Primary action:

> **Connect my account**

Secondary action:

> **Decline**

Do not infer this connection from the account name or email address. Do not create a
second Charlie membership when the intended dependent profile already exists.

## Child-device setup

### Review guardian-managed setup

Title:

> **Set up Kwilt for Charlie**

Body:

> Andrew approved this iPhone for Charlie in the Watanabe Household. Charlie will only
> see the Household features set up for him.

Primary action:

> **Set up this iPhone**

Secondary action:

> **Not now**

### Confirm the physical device

Title:

> **Set up Screen Time on this iPhone?**

Body:

> Kwilt will use this iPhone for Charlie's family Screen Time agreement. A parent or
> guardian needs to stay nearby.

Primary action:

> **Continue with this iPhone**

Secondary action:

> **This isn't Charlie's iPhone**

### Before Apple authorization

Title:

> **A parent or guardian needs to approve this**

Body:

> Apple will ask for approval on this iPhone. This lets Kwilt apply the family Screen Time
> agreement even when Kwilt is closed.

Primary action:

> **Continue to Apple**

Privacy note:

> Kwilt does not receive Charlie's messages, browsing history, photos, or location.

### Select apps and categories

Title:

> **Choose apps for the agreement**

Body:

> A parent or guardian chooses which apps or categories this agreement covers. Apple
> keeps the selection private on this iPhone.

Primary action:

> **Choose apps**

After a valid selection:

> **Apps selected**

Do not list app names by reading Apple tokens or imply Kwilt can see an installed-app
inventory.

### Bootstrap application

Title:

> **Checking this iPhone**

Body progression:

- **Saving the device setup…**
- **Checking Apple authorization…**
- **Checking Screen Time support…**
- **Applying the setup…**

Persistent helper:

> Keep Kwilt open until this check finishes.

Do not say **Ready** when the device merely receives the policy.

### Child-device success

Title:

> **This iPhone is ready**

Body:

> Charlie's family Screen Time agreement can now be applied to this iPhone.

Primary action:

> **Done**

## Caregiver progress and success

Progress states:

- **Waiting for Charlie to open Kwilt**
- **Waiting for Apple approval on Charlie's iPhone**
- **Waiting for apps to be selected on Charlie's iPhone**
- **Checking Charlie's iPhone**
- **Applying to Charlie's iPhone**

Success:

> **Charlie's iPhone is ready**
> You can set the first family agreement.

Primary action:

> **Set the first agreement**

After a rule is saved:

- **Saved** — the family decision exists.
- **Applying to Charlie's iPhone** — the desired version is newer than the applied
  version.
- **Applied on Charlie's iPhone** — the exact desired version and coherent snapshot
  match.

Never replace **Saved** with **Applied** optimistically.

## Recovery copy

| Condition | Title | Body | Primary action |
| --- | --- | --- | --- |
| Expired session | **This setup code expired** | Create a new code from your phone and try again. | **Create a new code** |
| Code already claimed | **This setup code was already used** | Start again from Charlie's Screen Time settings. | **Start again** |
| Account attachment conflict | **This account cannot be connected automatically** | Continue with guardian-managed setup or ask the caregiver to review Charlie's account connection. | **Use guardian-managed setup** |
| Apple family mismatch | **Charlie needs to be in your Apple Family Sharing group** | Add Charlie in Apple Settings, then return to Kwilt. | **Try again** |
| Authorization denied | **Apple approval is still needed** | A parent or guardian must approve parental controls on Charlie's iPhone. | **Ask again** |
| Authorization revoked | **Finish Apple authorization again** | Kwilt cannot confirm the family agreement on this iPhone. | **Continue to Apple** |
| App update required | **Update Kwilt on Charlie's iPhone** | This version cannot apply the current family agreement. | **Open the App Store** |
| Selection missing | **Choose the apps again** | Kwilt no longer has the saved selection on Charlie's iPhone. | **Choose apps** |
| Offline during setup | **Waiting for Charlie's iPhone to reconnect** | Keep Kwilt installed. Setup will continue when this iPhone is online. | **Try now** |
| Temporary application delay | **Applying when Charlie's iPhone is ready** | The current family agreement stays in place while Kwilt retries. | **Try now** |
| Unclassified failure | **Charlie's iPhone needs attention** | Open Kwilt on Charlie's iPhone to finish the current step. | **Show the step** |

Never tell the caregiver to “contact support” before showing the exact local recovery
action available. Support is secondary after the in-product action fails.

## Child-facing ordinary state

The child sees the current truth, not enrollment protocol:

- **Games open at 4:00 PM.**
- **Use Gospel Library for 5 minutes first.**
- **Games are available for 30 minutes.**
- **Games are finished for today.**
- **Waiting for Andrew or Blaire.**
- **Approved — waiting for this iPhone.**
- **Kwilt's agreement is complete. Another Screen Time restriction may still apply.**

Avoid behavior judgments, deservingness, compliance language, rankings, or detailed
usage surveillance.

## Release copy

### Caregiver confirmation

Title:

> **Release Charlie's iPhone?**

Body:

> Kwilt will stop its Screen Time monitors and remove its restrictions from this iPhone.
> The release is not complete until Charlie's iPhone confirms cleanup.

Primary action:

> **Release this iPhone**

Cancel:

> **Keep it connected**

### Pending

> **Release pending on Charlie's iPhone**
> Open Kwilt on Charlie's iPhone to finish removing its Screen Time settings.

If Apple requires guardian approval:

> **Finish release on Charlie's iPhone**
> A parent or guardian needs to approve the final Apple step.

### Complete

> **Charlie's iPhone was released**
> Kwilt removed its Screen Time settings from this iPhone.

Do not hide a pending device or say **Released** because the caregiver tapped the button.

## Accessibility and localization notes

- Device names and child display names must support long localized text without
  truncating the required action.
- Setup progress uses a polite live region; failures move focus to the title.
- QR setup always has short-code and share-link alternatives.
- Buttons name the action, not **Continue**, when the destination or consequence matters.
- Dynamic Type may scroll the content, but the one current action remains available in
  the canonical capability-onboarding action region.
