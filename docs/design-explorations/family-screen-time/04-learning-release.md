# Learning Release: Family Access Rule

Detailed information architecture and journeys: [Navigation and Workflows](./navigation-and-workflows.md).

## Prerequisite correction

This concept originally assumed Kwilt already had a narrow path from a personal To-do to an assigned Activity. It does not. Activities are currently owner-scoped and have no assignment contract. The proposed family rule therefore depends on a preceding household-participation slice described in [Activity Assignment Dependency](./activity-assignment-dependency.md). In the proposed product model, adding another household member as the assignee is itself the sharing transition; families do not manage a separate personal/household scope.

The rule remains the Screen Time learning target, but its Activity criterion is not implementation-ready until Kwilt can assign one household Activity to a dependent child and synchronize the occurrence safely online and offline.

## Concept To Build

Build one real family rule that lets Andrew and Blaire say:

> **Games are available on school days from 4:00–7:00, after today's responsibilities are complete, for up to 30 minutes.**

Kwilt evaluates that rule on one child's physical iPhone or iPad, explains the current state to the child, and opens or shields the selected apps without a routine caregiver unlock.

## Capability Delta

### Today, the family cannot

- Assign a private Activity to a household member, thereby sharing that Activity with them.
- Show a dependent child an assigned Activity without exposing the creator's private To-dos.
- Link two independent caregiver accounts to one child Screen Time policy.
- Enroll a child device under Kwilt's parental Family Controls authorization.
- Combine an Activity occurrence, time window, and foreground-usage cap in one enforceable rule.
- Know whether a remote policy decision reached and changed the child device.

### After this release, the family can

- Assign one Activity to the dependent child, with the assignment acting as the explicit household privacy boundary.
- Create one private household with Andrew and Blaire as independently authenticated caregivers.
- Add one dependent child profile without requiring the child to have an email address.
- Enroll one physical child device using Apple's guardian-authorized `.child` Family Controls flow.
- Create and activate one Family Access Rule for one selected app/category group.
- Let the child complete today's required Activities, become eligible during the allowed window, and consume a real foreground-usage cap.
- Automatically re-shield the selected apps when the window closes or the usage cap is reached.
- See **Applied**, **Device offline**, or **Needs attention** rather than assuming a cloud decision took effect.
- Make a bounded caregiver exception that expires automatically.

### Still intentionally not supported

- Multiple children, multiple managed devices per child, or shared child devices.
- More than one active Family Access Rule for the learning household.
- General boolean logic, overlapping rules, reusable day templates, location conditions, or school-calendar integration.
- Chore points, earned-time wallets, borrowed time, rankings, streaks, or allowance.
- Photo proof, AI verification, or caregiver approval for every completion.
- Android enforcement.
- App Store Family Sharing as the billing mechanism for this family test.
- Public availability, production-default activation, or migration of existing `.individual` Screen Time setups.

## User Experience

### 1. Andrew creates the household

From **Settings > Household**, Andrew creates a private household and invites Blaire as a caregiver. Blaire accepts with her own Kwilt account. Both see the same child and Screen Time authority; neither shares credentials.

### 2. They add one child

Andrew or Blaire creates a dependent child profile with a first name/display name. The profile is a household participant, not a full authenticated adult account and not an Apple Account mirror.

### 3. They enroll the child device

On the child's physical device, Kwilt opens a short caregiver-present setup:

1. Choose the Kwilt child profile.
2. Confirm that this is the child's device.
3. Complete Apple's guardian-authenticated `.child` Family Controls authorization.
4. Choose the apps/categories to govern using Apple's privacy-preserving picker.
5. Wait for Kwilt to show **This device is ready** on both caregiver and child devices.

The child cannot unlink, sign out to disable enforcement, retire the device, or revoke authorization. The child can see which caregivers manage Screen Time and can ask them to release the device.

### 4. A caregiver creates the starter rule

The rule composer contains one readable sentence with four rows:

- **What:** the selected Games/Entertainment activity group from enrollment.
- **When:** school weekdays and one local-time window.
- **After:** one or two simple recurring household Activities assigned to the child.
- **How much:** one daily foreground-usage cap.

Entering a responsibility references a real household Activity occurrence created by the prerequisite participation slice. Screen Time does not create a parallel chore record or silently convert a caregiver's personal To-do. For the learning release, child completion is sufficient; configurable caregiver review is deferred.

Before activation, the caregiver previews the exact child explanations and shield state. Activation completes only when the child device acknowledges the policy version.

### 5. The child follows the rule

The child Screen Time home and Kwilt shield show one current truth:

- **Games open at 4:00 after homework.**
- **Finish feeding the dog to open Games.**
- **Games are available for 30 minutes.**
- **18 minutes left today.**
- **Games are finished for today.**

When the child marks the assigned Activity complete, Kwilt re-evaluates the rule. During the allowed window, the selected apps become available. Apple Device Activity counts foreground usage; switching away or putting down the device does not consume the cap. At the threshold, the local extension restores the shield without requiring Kwilt to be open.

The same normal-day loop works offline. The child device retains the last valid rule and seven days of required Activity occurrences for this learning release. An auto-approved Activity completed offline updates the local occurrence, re-evaluates access immediately, and enters a durable sync outbox. Reconnection uploads completion/receipts idempotently, sends a full enforcement snapshot, and fetches any newer rule version.

### 6. Either caregiver handles a real exception

The child may request **Use now**, **More time today**, or **Something is wrong**. Either caregiver can approve one fixed bounded exception, deny it, or leave the rule unchanged. The first caregiver decision closes the request for both. An approval is not presented as successful until the child device acknowledges it.

## Existing Product Relationship

- Enhances the existing Screen Time capability; it does not create a second parental-controls app.
- Preserves existing adult `.individual` protection as a separate mode.
- Reuses Family Activity Picker, the named Managed Settings store, shield configuration/action extensions, authentication, notifications, and existing Activity semantics where possible.
- Depends on an explicit household-Activity scope that supports one assigned recurring responsibility and current-occurrence completion. This is a first-class Activities capability, not Screen Time-owned plumbing. Activities remain the canonical record of doing.
- Introduces the minimum private Household relationship needed for two caregivers, one dependent child, and Screen Time scope. It does not merge broader-family Shared Goal membership into Household.
- Leaves Apple-native Screen Time, communication safety, content restrictions, and stricter third-party restrictions unchanged.

## Buildable Slice

### Must be real

#### Household and authority

- Andrew and Blaire use independent authenticated accounts.
- One private household, two active caregivers, one dependent child profile, and explicit Screen Time capability/child scope.
- Server authorization on every household, rule, request, exception, and device mutation.
- Child-visible caregiver list and caregiver-controlled release semantics.

#### Managed device

- One signed physical iOS/iPadOS device bound to one child profile and install ID.
- Real `.child` Family Controls authorization with the required Apple entitlements.
- Device-scoped push/check-in identity, policy version, authorization status, enforcement state, and last reconcile receipt.
- Device capability report covering OS/build, supported policy schema, Family Controls status, and required Screen Time extensions before policy activation.
- Device Activity monitor extension for the allowed window and usage threshold.
- Managed Settings shield apply/clear and local enforcement while the foreground app is closed.
- Safe offline behavior: retain the last valid policy, honor already-started bounded access, and restore the shield at local expiry/threshold.
- Normal offline-day behavior: preload the seven learning-release Activity occurrences, accept trusted child completion locally, evaluate the rule without cloud access, and sync through a durable idempotent outbox.
- Require automatic date and time while family management is active so clock-based windows cannot be bypassed by changing device time; disclose this during enrollment.

#### Rule and Activity truth

- One active versioned rule with target, one schedule window, one or two Activity criteria, and one usage cap.
- One daily occurrence per required Activity with child completion sufficient.
- Deterministic AND evaluation and explicit reason codes.
- Rule-to-device compilation that sends privacy-preserving selections only where required.
- Push as a reconcile hint; the device fetches authoritative desired state rather than trusting a push payload as policy.
- Immutable operation IDs, idempotent processing, monotonic policy versions, and explicit `deferred`, `applied`, `superseded`, and `failed` device results.
- Append-only decisions and incremental device receipts sufficient to diagnose decision versus delivery.
- Periodic full enforcement snapshots plus snapshots on enrollment, foreground launch, app upgrade, diagnostics, and cleanup so missed incremental receipts can be repaired.

#### Role-aware surfaces

- Household creation/invite/acceptance and child-profile creation.
- Child-device enrollment and readiness confirmation.
- One caregiver rule composer and rule detail.
- One caregiver child status with actionable device truth—not a KPI dashboard.
- One child Screen Time home and matching custom shield explanation.
- One exception request and one fixed-duration caregiver decision flow.
- Caregiver-authenticated device release that clears restrictions, stops monitoring, and confirms cleanup.

#### Reliability proof

- Signed physical-device evidence for authorization, installation protection, schedule transitions, Activity completion, threshold re-shielding, background behavior, notification/request delivery, offline expiry, caregiver failover, and cleanup.
- TestFlight bundle evidence remains distinct from simulator, archive, entitlement configuration, and App Store production evidence.
- Reliability tests include duplicate/out-of-order delivery, missed pushes, deferred application, stale policy versions, interrupted upgrades, and recovery from a missed status receipt.
- Offline tests cover a full rule day, trusted Activity completion, usage exhaustion, missed push, cloud outage, caregiver approval pending on an offline child device, reboot, reconnect/outbox replay, automatic-date/time enforcement, and release pending until cleanup.

### Can be thin or temporary

- The household is allowlisted to Andrew and Blaire rather than generally discoverable.
- Household invitations may use a simple authenticated link without a polished family onboarding campaign.
- The rule has one fixed structure and no advanced editor.
- Responsibility recurrence is school weekdays/daily only.
- Child completion is trusted automatically; per-Activity caregiver review is deferred.
- Exceptions may offer only **10 more minutes** or **Until the current window ends**.
- Internal operational diagnostics may be developer-only as long as user-facing state remains calm and truthful.
- Learning notes can be gathered manually rather than through an in-app survey.
- The household receives a server-side development entitlement; billing and App Store subscription sharing are outside the learning question.

### Intentionally excluded

- A generic chores home, chore marketplace, photo evidence, points, rewards, or money.
- Multiple active rules, conflicts, rule nesting, shared schedule templates, or cross-device pooled usage.
- Detailed app-usage reporting, content inspection, location, messages, browsing history, or surveillance feeds.
- AI-created rules or AI decisions about completion/access.
- Push notifications for normal rule transitions.
- Family-plan pricing, App Store Family Sharing activation, subscription migration, or paywall redesign.
- Broad household adoption by Money, Meals, Goals, or other capabilities during this release.
- Automatic conversion of a child profile into an authenticated child account.

## Release Channel

**TestFlight build**, restricted to Andrew, Blaire, and one family child device.

This cannot be truthfully evaluated in a simulator or visual prototype. The learning depends on Apple's guardian authorization, child-device anti-circumvention behavior, Device Activity background callbacks, real foreground usage, push delivery, offline expiry, and extension signing. The capability remains hidden for every non-allowlisted household.

The release sequence is:

1. Local/unit tests for rule evaluation, authority, versioning, sync, and receipt state machines.
2. Signed development-device proof for entitlement and extension behavior.
3. TestFlight build installed on both caregiver devices and one child device.
4. A short supervised setup/release drill before any multi-day household use.
5. A seven-day family-use window only after cleanup and emergency recovery are proven.

This plan does not authorize implementation, production migration, entitlement submission, or TestFlight submission. Each remains a distinct later gate.

## Brand-Goodwill Guardrails

- Call it **Family Screen Time** in the product; use “Family Access Rule” only when the rule needs a name.
- Tell the child what is true, why, and what happens next. Never imply misbehavior or deservingness.
- Show both caregiver names and the complete rule to the child.
- Keep Kwilt and safety/communication choices available.
- Never notify caregivers when a normal rule simply works.
- Do not present **Approved** as **Available** until the child device applies the change.
- Never fail open silently. Never leave a device irrecoverably shielded.
- Use no detailed activity feed, rankings, completion streaks, or child performance score.
- The child can request release or report a problem even though they cannot self-unlink.
- Make the family test feel like a complete small agreement, not an exposed engineering console.

## Reversibility

- All Household, rule, request, exception, and receipt schema changes are additive and capability-scoped.
- A server feature flag and household allowlist prevent activation for everyone else.
- Existing `.individual` Screen Time records are not migrated or reinterpreted.
- The caregiver release flow must work before the household begins the seven-day test: stop Device Activity monitoring, clear all Kwilt Managed Settings stores, revoke child authorization when appropriate, retire the install, and receive a cleanup receipt.
- Disabling the server flag does not itself remove local restrictions. It initiates or requires a deliberate safe-release path so rollback cannot create either an accidental bypass or a zombie shield.
- If the new app version must be withdrawn, the installed child build retains a local caregiver-authenticated recovery path.
- Family-use data can be deleted by household without affecting unrelated Goals, Activities, or existing individual Screen Time settings.

## Permanent Product Threshold

Promote the concept from family learning release to accepted Kwilt capability only if:

- The rule reliably governs one real week without incorrect or unrecoverable shielding.
- The child can explain current access and next action without caregiver interpretation.
- Routine unlock requests decrease enough that Andrew and Blaire notice the difference.
- Both caregivers can participate without shared credentials or conflicting decisions.
- Device receipts make failures understandable and recoverable.
- The one-rule sentence covers the family's recurring need without pressure for arbitrary automation logic.
- The family still experiences the system as a clear agreement rather than chore currency, surveillance, or household administration.

If those conditions hold, the next expansion should test multiple rules and children before App Store Family Sharing, advanced Activity review, day templates, or broader household capabilities.
