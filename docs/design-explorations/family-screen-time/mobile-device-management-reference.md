# Adjacent System Review: What Family Screen Time Can Learn from MDM

Research refreshed July 23, 2026. This is an architecture reference, not a recommendation that Kwilt enroll family devices in enterprise Mobile Device Management.

## Executive read

Mobile Device Management has spent years solving a problem adjacent to Kwilt's:

> A person with authority defines policy remotely; the device may be asleep, offline, outdated, or unable to comply; the product must distinguish intent from actual device state and eventually recover without ambiguity.

The most valuable lesson is to replace **remote commands as truth** with **versioned desired state plus device-owned reconciliation and status**.

Kwilt should borrow:

- explicit enrollment and device identity;
- scoped, versioned policy declarations;
- push as a wake-up hint rather than proof of delivery;
- idempotent commands and receipts;
- pending/deferred/failed/applied states;
- device-local autonomous enforcement;
- incremental status plus periodic full safety reconciliation;
- capability reporting;
- staged rollout and supersession;
- transactional unenrollment and cleanup.

Kwilt should not borrow:

- organization ownership of a person's device;
- remote wipe, passcode clearing, Lost Mode, location, app inventory, silent installs, or broad device queries;
- employee-compliance dashboards;
- opaque administrator power or corporate language;
- MDM enrollment as a prerequisite for a family-owned phone.

Apple's Family Controls, Managed Settings, and Device Activity remain the enforcement substrate. MDM contributes a mature control-plane pattern, not the API Kwilt should use.

## Established MDM patterns and their Kwilt translation

### 1. Enrollment is a trust ceremony, not a login flag

MDM creates a durable enrollment relationship for a specific device and management scope. User enrollment, device enrollment, and supervised enrollment confer different powers; the server does not treat “this person has an account” as proof that a particular device is managed.

**Kwilt translation**

- Household membership says who the people are.
- Screen Time scope says which caregiver may govern which child.
- Device enrollment says which physical install represents that child.
- Apple `.child` Family Controls authorization says a guardian approved enforcement on that device.

These are four separate facts. The child device becomes **Ready** only after all four hold and the first policy round-trip succeeds.

Source: [Apple enrollment profiles and removal](https://support.apple.com/guide/deployment/intro-to-device-management-profiles-depc0aadd3fe/web)

### 2. Desired state is safer than a sequence of remote toggles

Apple's declarative device management lets a server publish configurations and activations that the device applies and maintains. Version/server tokens let the device detect new, changed, and removed declarations. The device can apply configurations autonomously based on local predicates rather than waiting for a fresh imperative command. [Apple declarative management overview](https://support.apple.com/guide/deployment/declarative-device-management-manage-apple-depc30268577/web), [synchronization model](https://developer.apple.com/documentation/devicemanagement/integrating-declarative-management)

**Kwilt translation**

Do not model the primary operation as:

```text
caregiver taps Unlock
  -> server sends clearRestrictions()
```

Model it as:

```text
Family Access Rule v17
  -> compiled Device Policy v17 for Riley's iPad
  -> device fetches, validates, stores, evaluates, and applies v17
  -> device reports v17 active with its current reason and shield state
```

Chore completion, the clock, a usage threshold, and a bounded exception change inputs to the local policy evaluator. They do not create unrelated one-off shield commands.

### 3. Push wakes the device; it is not the policy or the receipt

In MDM, a push notification prompts the device to contact the management service and request current work. Declarative synchronization then compares tokens and fetches what changed. A successful APNs send does not mean that a command ran. [Apple declarative synchronization](https://developer.apple.com/documentation/devicemanagement/integrating-declarative-management)

**Kwilt translation**

- A push means **check for a newer policy/request**, not **the child is unlocked**.
- The child device fetches the latest authorized version over its authenticated device channel.
- Missed or duplicate pushes are harmless because foreground launch, background opportunities, and periodic check-in reconcile the same desired state.
- The caregiver UI never promotes **Sent** to **Applied** without a device receipt.

### 4. Every operation needs identity, version, and an idempotent result

Traditional MDM commands carry a unique `CommandUUID`. Apple says not to consider a command executed until the device returns `Acknowledged` or `Error` for that UUID, and warns that status may be delivered more than once. Devices can cache results across disconnects. [Apple command queue and response contract](https://developer.apple.com/documentation/devicemanagement/sending-mdm-commands-to-a-device)

**Kwilt translation**

Every policy, exception, release, and cleanup operation needs:

- immutable operation ID;
- target child and device;
- expected prior version;
- new desired version;
- actor and authority scope;
- creation and expiry time;
- idempotency key;
- device result tied to the operation/version.

Duplicate delivery must not grant time twice, re-complete an Activity, or extend an exception.

### 5. “Not now” is a first-class result

MDM distinguishes `Acknowledged`, `Error`, `CommandFormatError`, `Idle`, and `NotNow`. `NotNow` means the device received work but current conditions prevent execution; retry may later succeed. [Apple response states](https://developer.apple.com/documentation/devicemanagement/declarativemanagementresponse), [handling NotNow](https://developer.apple.com/documentation/devicemanagement/handling-notnow-status-responses)

**Kwilt translation**

Kwilt needs more than success/failure:

```text
draft
published
device_notified
device_fetched
deferred
applied
superseded
failed
released
```

User-facing language should stay smaller:

- **Updating this device**
- **Applied**
- **Device offline — last updated 3:42 PM**
- **Needs caregiver attention**
- **Released**

Internal reason codes carry the diagnostic detail. A temporary inability to apply is not silently treated as rejection or success.

### 6. Devices enforce locally and report state changes

Declarative management moves work onto the device so configurations can activate from local criteria without constant server commands. Devices send incremental status when subscribed values change. [Apple declarative activation predicates](https://support.apple.com/guide/deployment/declarative-device-management-manage-apple-depc30268577/web), [status subscriptions](https://developer.apple.com/documentation/devicemanagement/managementstatussubscriptions)

**Kwilt translation**

- The cloud owns authorized family intent.
- The child device owns current clock, foreground usage, Apple authorization, opaque tokens, Device Activity schedules, and actual Managed Settings state.
- The local evaluator keeps working when the server or caregivers are unavailable.
- Already-issued access expires locally; a lost network connection cannot create endless access.
- A server outage cannot strand the rule in a half-applied remote-command sequence.

### 7. Incremental reports need a periodic full safety sync

Apple devices normally send only changed subscribed status items, but declarative management also sends a periodic full report so a server can recover from a missed incremental update and replace its derived state. Apple describes this safety sync as typically occurring about daily. [Apple status reports](https://developer.apple.com/documentation/devicemanagement/statusreport)

**Kwilt translation**

The child device should emit:

- incremental receipts when policy, authorization, schedule, criterion, usage, shield, exception, or cleanup state changes; and
- a periodic complete enforcement snapshot plus one on foreground launch, enrollment completion, app upgrade, and caregiver-requested diagnostics.

The server derives caregiver status from the latest coherent snapshot and receipts. It does not assume that the absence of an error means health.

### 8. Report capabilities before sending policy

Declarative management includes server/device capabilities and makes configuration availability depend on enrollment type, platform, OS, and scope. MDM services cannot assume every enrolled device supports every declaration or command.

**Kwilt translation**

A managed-device record should report at least:

- platform and OS version;
- Kwilt build/schema version;
- supported rule/policy version;
- Family Controls authorization mode/status;
- opaque target selection present/missing;
- Device Activity monitor extension available;
- Shield Configuration/Action extensions available;
- notification permission/token health;
- last full snapshot and reconcile timestamps.

Policy compilation must reject or degrade explicitly when the device cannot support a criterion. Do not publish a rule that the child UI can explain but the installed build cannot enforce.

### 9. Multiple policy sources merge; the strictest may win

Apple notes that when profiles and declarative configurations both deliver compatible restrictions, the system merges them and may enforce the strictest setting. [Apple declarative management behavior](https://support.apple.com/guide/deployment/declarative-device-management-manage-apple-depc30268577/web)

**Kwilt translation**

Kwilt is not the only authority on the phone. Apple's native Screen Time or another parental-control app may still block an app after Kwilt permits it.

The child-facing result must distinguish:

- **Kwilt rule is not satisfied**;
- **Kwilt rule permits access, but another device restriction still applies**; and
- **Kwilt has not confirmed its own policy state**.

Kwilt should never promise that approving an exception overrides all device controls.

### 10. Removal is a managed transaction

In MDM, unenrollment removes management state and the profiles/settings/apps that derive from that enrollment. Declarative state is removed on unenrollment. This is a defined lifecycle, not deleting a row and hoping devices notice. [Apple profile removal](https://support.apple.com/guide/deployment/intro-to-device-management-profiles-depc0aadd3fe/web), [declarative unenrollment](https://developer.apple.com/documentation/devicemanagement/integrating-declarative-management)

**Kwilt translation**

Releasing a child device is a multi-step transaction:

1. Authorized caregiver records release intent.
2. Server publishes an empty/release policy that supersedes active policy.
3. Child device stops Device Activity monitors.
4. Child device clears every Kwilt Managed Settings store.
5. Child device records authorization/release state and retires its device credential.
6. Server receives the full cleanup snapshot.
7. Only then does the caregiver UI say **Released**.

If the device is offline, show **Release pending on device**. Do not delete the record that tells the family cleanup is incomplete.

### 11. Migrations should transfer ownership without disruptive removal

Apple's declarative-management transition can take ownership of existing profiles rather than removing and reinstalling them, reducing user disruption. [Apple declarative transition](https://support.apple.com/guide/deployment/declarative-device-management-manage-apple-depc30268577/web)

**Kwilt translation**

- Existing `.individual` Screen Time must never silently become family-managed.
- A deliberate migration can reuse the selected opaque targets only when Apple authorization and data-container rules permit it and the adult/guardian explicitly confirms.
- Policy-schema upgrades should supersede old versions atomically on the child device.
- App upgrades must retain enough backward-compatible local logic to clear or expire previously installed policy safely.

## Recommended Kwilt control plane

```text
Household intent
  Family Access Rule v17
        |
        v
Policy compiler
  Riley iPad Device Policy v17
        |
        | push = "check in"
        v
Child device reconciler
  fetch -> validate -> persist -> schedule -> evaluate -> apply
        |
        v
Device status
  incremental receipts + periodic full enforcement snapshot
        |
        v
Caregiver projection
  "Applied on Riley's iPad" / "Updating" / "Offline" / "Needs attention"
```

### Cloud owns

- household authority and child scope;
- canonical rule and Activity references;
- policy versions and supersession;
- exception authorization and expiry;
- immutable operation/audit records;
- latest derived device projection.

### Child device owns

- Apple authorization and opaque selection material;
- current local time and Device Activity usage;
- persisted last-valid policy;
- local criterion evaluation inputs available to the device;
- actual Managed Settings and monitor state;
- offline expiry and safe cleanup execution.

### Push owns

- nothing durable;
- only a request for the target device to reconcile sooner.

## What Kwilt must deliberately refuse

MDM products often expose device inventory, installed apps, security posture, location, remote lock/wipe, and compliance reporting because an organization owns or governs work devices. That posture is wrong for Kwilt.

Kwilt should refuse to add:

- remote device wipe, passcode reset, Lost Mode, location, or camera/microphone control;
- general installed-app inventory outside Apple's privacy-preserving picker/report surfaces;
- browsing, message, photo, or content inspection;
- a child compliance score or caregiver monitoring dashboard;
- silent family expansion based on an Apple family roster;
- authority beyond the Screen Time capability and named child scope;
- enterprise MDM enrollment, supervision, certificates, or organization ownership language.

The family framing remains:

> Parents set a clear agreement. The child's device follows it. Kwilt tells everyone what actually happened.

## Changes to carry into the learning release

1. Treat the rule as desired state and the child device as a reconciler—not a remote-command target.
2. Add immutable operation IDs and idempotent device receipts.
3. Add `deferred`/`offline`/`superseded` states rather than success/failure only.
4. Make push a hint to fetch current policy.
5. Require device capability reporting before policy activation.
6. Add incremental receipts and periodic full enforcement snapshots.
7. Keep a pending release record until the device confirms cleanup.
8. Test duplicate delivery, out-of-order policy versions, missed pushes, stale devices, app upgrade, and offline cleanup recovery.
9. Show only calm, actionable device truth to caregivers; keep protocol detail in internal diagnostics.

