# Family Screen Time Child-Device Enrollment and Reconciliation

**Status:** Accepted implementation contract
**Date:** 2026-08-26
**Implementation host:** `/Users/andrewwatanabe/Kwilt`
**Parent contract:** [Screen Time Control Plane](screen-time-control-plane.md)
**Product brief:** [Family Screen Time Controls](../feature-briefs/family-screen-time-controls.md)

This document is the canonical Screen Time continuation for turning one exact Kwilt
child membership and its guardian-managed personal-device access into one managed
physical iPhone or iPad, and for proving what policy that device actually applied. The
underlying identity and claim are owned by [Household device
participation](household-device-participation.md). This document consolidates the accepted family Screen Time feature brief,
the parent/child workflow, the MDM reference, and the learning-release proof boundary.

It does not reopen the family-rule model, navigation ownership, or Household authority
decisions. It specifies the missing bridge between **Set up Charlie's iPhone** and an
authoritative **Applied on Charlie's iPhone** receipt.

## User and product frame

When Maya and Charlie agree on Screen Time, Maya wants Charlie's actual phone to follow
that agreement and report what happened, so neither of them has to guess whether a saved
setting reached the device.

- Audience: `audience-aspirational-family-organizers`
- Persona: Maya
- Hero JTBD: `jtbd-move-the-few-things-that-matter`
- Active JTBDs: `jtbd-trust-this-app-with-my-life`,
  `jtbd-invite-the-right-people-in`, and `jtbd-put-intention-before-impulse`
- Job flow: `job-flow-maya-establish-family-screen-time`
- Constraint posture: fit the accepted Household and Screen Time control planes.

The design challenge is:

> How might we help Maya enroll Charlie's intended iPhone and know exactly when it is
> following the family agreement, while preserving separate identity, authority,
> privacy, and physical-device proof?

## Scope

The first real-device learning release supports:

- one active managed iOS or iPadOS device for one child membership;
- one owner or scoped caregiver initiating setup;
- a caregiver-present enrollment on the child's device;
- Apple Family Controls `.child` authorization;
- one child-scoped saved app/category selection;
- an empty bootstrap policy followed by the starter family agreement;
- versioned fetch, application receipts, enforcement snapshots, and safe release; and
- TestFlight access restricted to the learning household.

It intentionally excludes multiple active devices for one child, device-to-device usage
pooling, Android enforcement, silent device replacement, enterprise MDM, installed-app
inventory, and a general device-administration dashboard.

## Apple feasibility boundary

Apple's public Family Controls contract supports `.child` authorization on the device
signed in to the child's iCloud account; a parent or guardian in the same Family Sharing
group approves the system request. Distribution through TestFlight or the App Store also
requires Apple to grant the Family Controls distribution entitlement to the main app and
each Screen Time extension.

The exact picker placement remains a signed-device proof gate. Apple's documented
caregiver-device picker can show apps and websites from authorized child devices, while
Kwilt's privacy-minimal first choice is to present the picker on the enrolled child device
with the caregiver present so opaque tokens never leave that install. Before building the
full transport, a signed two-device spike must prove that the `.child`-authorized install
returns a usable local selection. If it does not, stop and revise this contract to use the
documented caregiver-device picker plus an end-to-end encrypted selection handoff; do not
upload raw or reversibly encoded Apple tokens to Supabase.

There is no documented public iOS API that lets Kwilt prove the person's **Set
Automatically** date-and-time setting. Device Activity owns system schedule evaluation,
so that setting is not a readiness requirement or reported capability. A missed push is
also not a readiness failure because push is only a reconcile hint.

## Four independent trust facts

A device becomes **Ready** only when all four facts hold and the bootstrap policy is
applied:

1. **Kwilt identity:** the install holds active guardian-managed access for the exact
   Kwilt child membership. A conventional child account binding is optional.
2. **Kwilt authority:** an owner or caregiver with the child's Screen Time grant created
   the enrollment session and the child's capability activation is `pending_setup`.
3. **Physical-device enrollment:** one install claimed that enrollment session and holds
   its server-issued device credential.
4. **Apple authorization:** the same install reports approved `.child` Family Controls
   authorization for an Apple Account in the guardian's Family Sharing group.

Household membership does not prove device enrollment. Possessing an enrollment link
does not create membership. Apple authorization does not grant Kwilt caregiver authority.
A paid entitlement does not activate Screen Time or prove policy application.

## Lifecycle

### Capability activation

```text
inactive
  -> pending_setup
  -> active
  -> pending_cleanup
  -> inactive

pending_setup | active | pending_cleanup
  -> blocked
  -> the prior recoverable state after the problem is corrected
```

- `pending_setup` begins when an authorized caregiver activates Screen Time for the
  named child.
- `active` begins only after the enrolled device applies the exact bootstrap desired
  version and sends a coherent enforcement snapshot.
- `pending_cleanup` begins when an authorized caregiver requests release or deactivation.
- `inactive` resumes only after the device acknowledges cleanup and its credential is
  retired.
- `blocked` is visible while a recoverable authorization, compatibility, or enforcement
  failure prevents the lifecycle from progressing.

### Enrollment session and managed device

```text
unbound
  -> claim_issued
  -> claimed
  -> authorizing
  -> reconciling
  -> ready

claimed | authorizing | reconciling | ready
  -> needs_attention
  -> the latest valid prior step after recovery

ready
  -> release_pending
  -> cleanup_applied
  -> released
```

Only `ready` may support an active family agreement. `received`, APNs delivery,
authorization approval, app selection, or a caregiver save are never aliases for
`ready`.

## Enrollment objects

### Enrollment session

An authorized caregiver creates one short-lived enrollment session:

```ts
type FamilyScreenTimeEnrollmentSession = {
  id: string;
  householdId: string;
  childMembershipId: string;
  createdByMembershipId: string;
  status: 'issued' | 'claimed' | 'completed' | 'cancelled' | 'expired';
  secretHash: string;
  manualCodeHash: string;
  expiresAt: string;
  claimedAt: string | null;
  claimedByDeviceId: string | null;
  claimedInstallId: string | null;
  operationId: string;
};
```

Contract:

- The server generates at least 256 bits of random link secret material plus a separate
  12-character Crockford Base32 manual code and stores only their hashes.
- The QR code and link transport the high-entropy secret. The manual code identifies the
  same session but is independently rate-limited by authenticated user, install, and
  network source.
- The link contains only an opaque token: `kwilt://screen-time/enroll?token=<secret>`.
- A session expires after 15 minutes, is single-use, and can be cancelled by an
  authorized caregiver before claim.
- Claim requires the unexpired guardian-issued secret for the exact child membership and
  a fresh install identity. Display name, email similarity, or Apple family membership
  cannot substitute for the server-authorized session.
- The first valid claim atomically binds the session to one `installId`. Replays from
  another install return `enrollment_session_already_claimed` without revealing the
  child or Household.

### Optional existing-account attachment

If Charlie already uses an independent Kwilt account, **Sign in instead** may explicitly
attach that authenticated account to Charlie's exact membership after guardian and
account-holder review. It preserves the membership id, activations, grants, and audit
history and never merges by display name or email similarity. This is a secondary
identity path; a dependent profile can claim guardian-managed personal-device access
without it.

### Managed device

The first release stores one non-released managed device per child subject:

```ts
type FamilyScreenTimeManagedDevice = {
  id: string;
  childMembershipId: string;
  installId: string;
  optionalBoundUserId: string | null;
  enrollmentSessionId: string;
  credentialHash: string;
  enrollmentState:
    | 'claimed'
    | 'authorizing'
    | 'reconciling'
    | 'ready'
    | 'needs_attention'
    | 'release_pending'
    | 'released';
  authorizationStatus: 'unknown' | 'pending' | 'authorized' | 'denied' | 'revoked';
  latestReceivedVersion: number;
  latestAppliedVersion: number;
  latestSnapshotAt: string | null;
  lastSeenAt: string | null;
  releaseRequestedAt: string | null;
  releasedAt: string | null;
};
```

On claim, the server returns one random 256-bit device credential. The child app stores
it in the iOS Keychain and the server stores only its hash. Every device-channel request
requires the device id, install id, and this credential. The credential is scoped to the
device and child membership; it is not a Kwilt account token and grants no caregiver
mutation authority.

The native extensions write local receipts to the shared App Group outbox. The main app
uploads them through the authenticated device channel. Opaque Family Activity tokens
never enter the enrollment session, general JavaScript state, analytics, routes, push
payloads, or Supabase.

## Server interfaces

### Caregiver RPCs

The existing Household authorization helpers remain authoritative. Add these
security-definer RPCs:

```text
create_kwilt_family_screen_time_enrollment_session(
  p_child_membership_id,
  p_expected_activation_version,
  p_operation_id
)

cancel_kwilt_family_screen_time_enrollment_session(
  p_session_id,
  p_operation_id
)

request_kwilt_family_screen_time_device_release(
  p_child_membership_id,
  p_device_id,
  p_expected_policy_version,
  p_operation_id
)
```

Every RPC checks active owner/caregiver membership, the exact child scope, the
Screen Time grant, optimistic version, and idempotent operation id. The create response
returns the plain link secret and manual code exactly once.

### Child-device channel

One `family-screen-time-device` Edge Function owns device-authenticated actions:

```text
POST action=claim-enrollment
POST action=report-authorization
POST action=report-capabilities
POST action=fetch-policy
POST action=record-receipts
POST action=record-snapshot
POST action=acknowledge-release
```

`claim-enrollment` declares `transport = link | manual_code`. Manual-code attempts are
rate-limited by install and network source, and wrong, expired, or
cross-child codes return the same public error. Link and manual-code hashes are compared
without returning timing- or identity-distinguishing detail.

All actions except `claim-enrollment` require `deviceId`, `installId`, and the device
credential. The function verifies the credential hash, exact device/child relationship,
and non-released state before invoking private database functions with service-role
access. Service-role access never replaces those checks.

Responses reveal only the named child's Screen Time state. A child device cannot create
or edit caregiver grants, agreements, overrides, Household membership, another child's
selection references, or desired policy versions.

## Native enrollment sequence

### Caregiver device

1. The caregiver opens **People > Household > Charlie > Screen Time**.
2. Kwilt verifies the Household role, child-specific grant, entitlement, and capability
   activation.
3. The caregiver starts device setup. The server creates the enrollment session.
4. Kwilt shows a QR code, short code, and share action plus the session expiry.
5. The caregiver keeps this screen open or returns later; realtime or foreground
   reconciliation updates each truthful setup state.

### Child device, with caregiver present

1. Charlie opens the enrollment link in Kwilt before ordinary sign-in.
2. Kwilt resolves the opaque session and shows **Set up Kwilt for Charlie** with the
   Household and authorizing-caregiver context.
3. After confirmation, the child device claims guardian-managed access and stores its
   device credential in Keychain.
4. Kwilt explains that a parent or guardian must approve Apple parental controls on this
   iPhone, then invokes `AuthorizationCenter.requestAuthorization(for: .child)`.
5. After Apple returns, Kwilt reports `authorized`, `denied`, or `revoked`; it never
   infers approval from the sheet being displayed.
6. The device reports capabilities.
7. The caregiver names the first selection on the caregiver device. The child device
   opens Apple's `FamilyActivityPicker`, stores the opaque selection locally under the
   server-issued `selectionRef`, and reports only selection presence and counts.
8. The server publishes bootstrap Policy v1 with no active restriction. It identifies
   the saved selection and requires the device to reconcile every Kwilt family store to
   a known empty state.
9. The child device fetches, validates, persists, applies, and receipts Policy v1, then
   sends a full enforcement snapshot.
10. The server derives **Ready**, moves the child capability activation to `active`, and
    both devices show **Charlie's iPhone is ready**.
11. The caregiver returns to the starter agreement composer. Saving the starter
    agreement publishes the next desired policy version; **Applied** waits for the
    matching device receipt.

The empty bootstrap proves identity, authorization, policy transport, native-store
access, monotonic application, receipt upload, and snapshot projection without briefly
blocking an app before the family reviews a rule.

## Capability report

The device reports this payload after authorization, on every app upgrade, and whenever
one value changes:

```ts
type FamilyScreenTimeCapabilityReport = {
  deviceId: string;
  platform: 'ios' | 'ipados';
  osVersion: string;
  appVersion: string;
  buildNumber: string;
  supportedPolicySchemaVersions: number[];
  authorizationMode: 'child';
  authorizationStatus: 'pending' | 'authorized' | 'denied' | 'revoked';
  familyActivitySelectionAvailable: boolean;
  deviceActivityMonitorAvailable: boolean;
  shieldConfigurationAvailable: boolean;
  shieldActionAvailable: boolean;
  remoteNotificationTokenPresent: boolean;
  localReceiptOutboxVersion: number;
  reportedAt: string;
};
```

The first release requires `.child` authorization, a proven picker path, the monitor and
both shield extensions, and a supported policy schema before publishing an active rule.
An APNs token improves reconcile latency but is not required for readiness. User-visible
notification permission is not required for enforcement; its absence may limit
child-request notifications and is reported separately in the full snapshot.

An incompatible report produces **Update Kwilt on Charlie's iPhone** or another exact
recovery action. The server never publishes a policy criterion the device cannot enforce.

## Selection choreography and privacy

- The caregiver supplies the semantic label, such as **Games**.
- The native picker is presented on the enrolled child device with the caregiver present.
- The child device stores the `FamilyActivitySelection` in the App Group container keyed
  by `selectionRef`.
- The server stores `selectionId`, `selectionRef`, child subject, label, lifecycle, and
  coarse counts only.
- A replacement selection uses a new version and remains **Applying** until acknowledged.
- Missing local tokens produce `selection_missing`; they never silently compile to an
  empty selection or a global clear.
- Kwilt never presents a readable installed-app inventory, raw token, browsing history,
  content, or detailed per-app usage to caregivers.

## Desired policy envelope

The device fetches one complete, authenticated and versioned projection rather than a sequence of
remote toggles:

```ts
type FamilyScreenTimeDevicePolicyEnvelope = {
  policyId: string;
  childMembershipId: string;
  deviceId: string;
  schemaVersion: number;
  desiredVersion: number;
  priorVersion: number;
  operationId: string;
  issuedAt: string;
  expiresAt: string | null;
  mode: 'bootstrap' | 'enforce' | 'release';
  selectionRefs: string[];
  claims: FamilyScreenTimeCompiledClaim[];
  digest: string;
};
```

The server calculates `digest` from canonical JSON using SHA-256. The device rejects a
different child/device, unsupported schema, invalid digest, version older than the last
applied version, a skipped version without a complete snapshot, or a policy that names a
missing selection. Fetching the same version is safe and returns the same digest.

Push contains only the device id and a reconcile hint. It never contains a policy,
selection, app label, rule reason, exception decision, or claim that application
succeeded.

## Receipt contract

Policy application and enforcement observation are different records.

### Application receipt

```ts
type FamilyScreenTimeApplicationReceipt = {
  receiptId: string;
  operationId: string;
  deviceId: string;
  childMembershipId: string;
  policyId: string;
  policyVersion: number;
  policyDigest: string;
  outcome:
    | 'received'
    | 'deferred'
    | 'applied'
    | 'failed'
    | 'superseded'
    | 'cleanup_applied';
  failureCode: FamilyScreenTimeFailureCode | null;
  occurredAtDevice: string;
  receivedAtServer: string;
};
```

Semantics:

- `received`: the device authenticated, validated, and durably persisted the exact
  envelope. It does not make the device ready.
- `deferred`: the device has the policy but a named temporary condition prevents safe
  application. The failure code states the condition and reconciliation retries it.
- `applied`: every compiled claim, monitor, and named Managed Settings store matches the
  exact desired version and digest.
- `failed`: a non-transient validation or native application error requires recovery.
- `superseded`: this operation was overtaken by a newer complete desired version and did
  not change final enforcement state.
- `cleanup_applied`: all Kwilt family monitors, stores, cached policies, selections, and
  receipt outbox entries are cleared for release.

Expiry of a schedule or override is an enforcement event, not a policy-application
outcome. `released` is server-derived only after `cleanup_applied`, the release snapshot,
and device-credential retirement.

The server accepts duplicate receipts by `receiptId` or `operationId + outcome` and
returns the original result. It rejects future versions, mismatched digests, mismatched
devices, impossible state regressions, and an `applied` version older than the stored
latest applied version. Server receipt time orders cloud projections; device time is
retained for diagnostics and local-rule evidence only.

### Full enforcement snapshot

```ts
type FamilyScreenTimeEnforcementSnapshot = {
  snapshotId: string;
  deviceId: string;
  policyVersion: number;
  policyDigest: string;
  authorizationStatus: 'authorized' | 'denied' | 'revoked';
  selectionStates: Array<{
    selectionRef: string;
    present: boolean;
    shieldedByKwilt: boolean;
  }>;
  activeMonitorIds: string[];
  activeStoreIds: string[];
  pendingReceiptCount: number;
  localEvaluationState: 'open' | 'blocked' | 'outside_window' | 'usage_exhausted';
  appVersion: string;
  buildNumber: string;
  capturedAtDevice: string;
};
```

Snapshots are sent after enrollment, foreground launch, app upgrade, authorization
change, policy application, caregiver-requested diagnostics, and cleanup, plus at least
once every 24 hours while managed. They contain identifiers and coarse enforcement
state, not Apple tokens or detailed usage history.

## Readiness and caregiver projection

The server derives `ready` only when:

```text
active child auth binding
+ capability activation is pending_setup or active
+ non-released device credential is valid
+ authorization status is authorized child mode
+ capability report satisfies the policy compiler
+ latestAppliedVersion == desiredPolicyVersion
+ latest application outcome for that version is applied
+ latest coherent snapshot has the same version and digest
= Ready
```

User-visible projections are:

- **Needs device setup** — no valid claimed device.
- **Finish setup on Charlie's iPhone** — claimed but authorization, selection, or
  capability reporting is incomplete.
- **Applying to Charlie's iPhone** — desired version is newer than applied version.
- **Applied on Charlie's iPhone** — the exact desired version and coherent snapshot
  match.
- **Charlie's iPhone needs attention** — a named recoverable failure blocks progress.
- **Release pending on Charlie's iPhone** — cleanup has not been acknowledged.
- **Released** — cleanup and credential retirement are complete.

The app does not expose policy versions, receipt ids, digests, tokens, or protocol state
names in ordinary family UI.

## Reconciliation

The child device reconciles on:

- enrollment claim and authorization completion;
- APNs reconcile hint;
- foreground launch;
- background opportunities supplied by iOS;
- app upgrade;
- local schedule, usage, selection, authorization, or Activity-input change;
- queued receipt retry; and
- caregiver-requested diagnostics or release.

The reconciliation loop is:

```text
authenticate device
  -> upload durable local receipts
  -> upload a required full snapshot
  -> fetch the complete latest desired envelope
  -> reject stale or incompatible state
  -> persist before applying
  -> reconcile named monitors and stores idempotently
  -> append receipt locally
  -> upload receipt
  -> upload coherent snapshot when state changed
```

The last valid bounded policy remains authoritative while offline. The device never
creates unbounded access because the cloud is unavailable. A missed push changes latency,
not truth. A newer server policy becomes device truth only after the child device fetches
and applies it.

## Recovery behavior

| Condition | Device behavior | Caregiver truth and action |
| --- | --- | --- |
| Existing-account attachment conflicts | Keep managed setup separate; refuse silent merge | **Use guardian-managed setup or review the account connection** |
| Enrollment link expired | Discard secret | **Create a new setup code** |
| Enrollment already claimed elsewhere | Refuse replay | **This code was already used. Start again.** |
| Apple Family Sharing is missing or wrong | Preserve claimed device; no policy | **Add Charlie to your Apple Family Sharing group, then try again** |
| Apple authorization denied | Record denied; no policy | **Approve parental controls on Charlie's iPhone** |
| Apple authorization later revoked | Stop claiming enforcement; retain diagnostic state | **Finish Apple authorization again** |
| Unsupported app/build/schema | Do not publish an unsupported policy | **Update Kwilt on Charlie's iPhone** |
| Selection missing locally | Do not compile the missing target as empty | **Choose the apps again on Charlie's iPhone** |
| Offline during setup | Keep the exact incomplete step locally | **Waiting for Charlie's iPhone to reconnect** |
| Policy received but deferred | Retain prior applied policy and retry | **Applying when Charlie's iPhone is ready** |
| Policy application failed | Retain the last coherent safe state; upload failure | **Charlie's iPhone needs attention** with one exact action |
| Reinstall or replacement | Treat as a new install; never auto-rebind | **Set up this iPhone as Charlie's replacement device** |
| Old/lost device cannot clean up | Keep old release pending and prevent false Released state | **Cleanup is still pending on the old iPhone** |

Internal diagnostics preserve reason codes, versions, digests, app/build, authorization,
capabilities, last successful reconcile, and latest snapshot. Family UI shows only the
truth and next action.

## Release and replacement

1. An authorized caregiver chooses **Release this device** and reauthenticates.
2. The server increments the desired version and publishes a complete `release` envelope.
3. Until the child device receives it, the prior bounded policy remains locally valid and
   the caregiver sees **Release pending on Charlie's iPhone**.
4. The child device stops every family Device Activity monitor, clears every family
   Managed Settings store, deletes cached policies and selections, and appends
   `cleanup_applied`.
5. If Apple requires guardian interaction to revoke `.child` authorization, Kwilt shows
   **Finish release on Charlie's iPhone** and does not pretend remote cleanup is complete.
6. The child device sends the cleanup receipt and a release snapshot.
7. The server retires the device credential, marks the device `released`, and moves the
   capability activation from `pending_cleanup` to `inactive` when no other managed
   device remains.

Replacing a phone creates a new enrollment session and device id. The old device record
is retained until released or explicitly classified as lost. The first release does not
pool usage or apply one policy to two active devices.

## Failure codes

The first contract uses a closed, versioned set:

```ts
type FamilyScreenTimeFailureCode =
  | 'authorization_required'
  | 'authorization_denied'
  | 'authorization_revoked'
  | 'family_sharing_required'
  | 'child_identity_mismatch'
  | 'device_credential_invalid'
  | 'device_not_bound'
  | 'unsupported_app_version'
  | 'unsupported_policy_schema'
  | 'extension_unavailable'
  | 'selection_missing'
  | 'policy_digest_mismatch'
  | 'policy_version_stale'
  | 'native_apply_failed'
  | 'offline'
  | 'release_requires_guardian';
```

Unknown codes map to **Charlie's iPhone needs attention** and internal diagnostics; they
never default to **Applied** or clear restrictions.

## Analytics and privacy

Allowed events use child membership id, device lifecycle, setup step, coarse outcome,
app/build, and duration. Do not record enrollment secrets, device credentials, Apple
tokens, app names derived from tokens, selection contents, detailed usage, rule reasons,
or the child's note text.

Minimum events:

```text
family_screen_time_device_setup_started
family_screen_time_enrollment_claimed
family_screen_time_authorization_completed
family_screen_time_capabilities_reported
family_screen_time_selection_saved
family_screen_time_bootstrap_applied
family_screen_time_device_ready
family_screen_time_device_needs_attention
family_screen_time_release_started
family_screen_time_device_released
```

Receipt and snapshot retention is operational, not behavioral surveillance. Retention
must be bounded by the Household data-retention policy before production expansion.

## Verification gates

### Source and Simulator

- State-machine, token expiry, claim, authorization, policy, receipt, snapshot, release,
  and RLS tests pass.
- Simulator proves only navigation, copy, state projection, and simulated native errors.
- Source and Simulator never satisfy `.child` authorization or enforcement proof.

### Signed physical device

- The archived build and every Screen Time extension carry Apple's granted Family
  Controls distribution entitlement.
- The exact child Apple Account and Kwilt auth binding claim one session.
- Guardian `.child` authorization succeeds.
- A two-device spike establishes the supported picker placement before the full transport
  is built; the native picker then stores a child-scoped selection without server token
  leakage.
- Bootstrap moves through received to applied and Ready only after a coherent snapshot.
- A real schedule applies and clears the named shield while Kwilt is closed.
- Duplicate and out-of-order receipts remain idempotent and monotonic.
- Missed push, offline launch, reboot, upgrade, revoked authorization, and stale schema
  recover truthfully.
- Release clears monitors/stores and does not say Released before cleanup proof.

### TestFlight learning household

- The caregiver and child install the same intended build lineage.
- One supervised setup/release drill succeeds before a live family rule is activated.
- Andrew and Blaire can both distinguish Saved, Applying, Applied, Needs attention, and
  Released without internal protocol language.
- The child can explain what is available, why, and what happens next.

## Implementation boundary

This document authorizes the bounded one-child/one-device learning path. It does not
authorize production-default rollout. The [implementation plan](../superpowers/plans/2026-08-26-family-screen-time-child-device-enrollment.md)
owns file-level execution order. The [copy contract](../product/family-screen-time-device-setup-copy.md)
owns the caregiver and child instructions.

## Apple references

- [Family Controls overview](https://developer.apple.com/documentation/familycontrols)
- [`requestAuthorization(for:)`](https://developer.apple.com/documentation/familycontrols/authorizationcenter/requestauthorization(for:))
- [`FamilyActivityPicker`](https://developer.apple.com/documentation/familycontrols/familyactivitypicker)
- [Configuring Family Controls](https://developer.apple.com/documentation/xcode/configuring-family-controls)
- [Requesting the Family Controls distribution entitlement](https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement)
