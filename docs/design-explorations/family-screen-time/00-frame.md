# Frame: Family Screen Time

## What the user said

> Blaire and I need a better way to handle our kids constantly asking us to unlock their devices for screen time. Each device could have Kwilt, with a parent/owner account controlling a child account and the child's device through the app.

## Restated in user voice

When one of our kids runs out of access or wants to use a blocked app, we want Kwilt to apply the family rules, show the child what they can do next, and let either caregiver respond from their own device only when judgment is actually needed, so that screen time stops producing constant interruptions and negotiations without becoming opaque or punitive.

## Target audience

`audience-aspirational-family-organizers` — Parents who want family systems that everyone can actually use, without turning home life into administration.

## Representative persona

Maya represents Andrew and Blaire in this situation: a parent coordinating ordinary family life who needs a shared rhythm more than another productivity system.

- Current situation: Her children repeatedly ask her or another caregiver to unlock their devices because the native controls do not express the family's real rules or handle exceptions gracefully.
- What she's trying to become/do: Keep family expectations predictable, let children act with growing independence, and reserve caregiver attention for real exceptions.
- Emotional state or tension: Interrupted and worn down by repetitive decisions, but unwilling to solve the problem with surveillance, arbitrary lockouts, or a brittle rules dashboard.
- What would make this feel wrong: One parent becoming the permanent gatekeeper; children not knowing why access is blocked; unsafe fail-open behavior; excessive alerts; chores-as-currency becoming the entire family relationship; or settings that require constant tuning.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — The family wants everyday responsibilities and intentions to turn into trusted follow-through.

## Job flow step

The closest current job flow is `job-flow-maya-move-family-life-forward`, especially:

- Step 5, **Schedule or hand off work** — score 2; sharing foundations exist, but the flow is not cohesive.
- Step 6, **Let family members participate without turning life into admin** — score 2; ordinary household participation is still early.
- Step 7, **Keep using the system because it feels helpful, not fussy** — score 3; too much configuration would make adoption fragile.

The taxonomy does not yet have a Screen Time-specific family job flow. This concept should initially extend Maya's family-participation flow rather than create a disconnected parental-controls taxonomy.

## Active anchors

- `jtbd-carry-intentions-into-action` — Real-life expectations should lead to predictable device access without repeated parental prompting.
- `jtbd-invite-the-right-people-in` — Both caregivers and each child need an explicit role without exposing unrelated household information.
- `jtbd-trust-this-app-with-my-life` — A family will rely on enforcement only if status, reasons, approvals, expiration, and delivery are transparent and reliable.
- `jtbd-put-intention-before-impulse` — Access can follow an agreed responsibility, routine, or intentional choice rather than a reflexive unlock.

```yaml
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life, jtbd-put-intention-before-impulse]
```

## Friction we're addressing

Apple's native controls can impose schedules and limits, but they do not encode all of this family's situational rules. When a limit is reached, the current fallback is a child interrupting a parent, the parent reconstructing context, and somebody manually granting access. The recurring decision and the uncertainty around which caregiver should respond are the real burden—not merely the number of taps required to unlock a device.

## System alignment

Constraint posture: `Extend the system`

### Current product facts

- Existing surface: **Settings > Screen Time Controls** is the canonical management surface. Contextual setup offers can lead into it from Focus, Today, Plan, activity detail, scheduled activity, or a notification.
- Existing user flow: A single user authorizes Screen Time, selects opaque app/category tokens, and enables local rules such as Focus protection or **Until I take a real step**.
- Existing domain/data model: `ScreenTimeProtectionSettings` is locally persisted and belongs to one app user/device. It contains authorization, selections, Focus protection, meaningful-first rules, bypass state, and setup-offer state. It has no household member, caregiver role, child role, managed device, remote request, approval, balance, or delivery record.
- Existing native affordances: Kwilt has the Family Controls entitlement path, a `FamilyActivityPicker`, a named `ManagedSettingsStore`, native apply/clear calls, and custom Shield Configuration and Shield Action extensions. The current authorization request is explicitly `.individual`, and enforcement is reconciled from the foreground app. There is no Device Activity monitor extension in the current implementation.
- Existing platform direction: Unified Kwilt already names authentication, household context, Screen Time, and capability-specific settings as shared platform concerns. Household roles and policy boundaries are not yet implemented in this repo.
- Existing UX/copy convention: Screen Time is framed as calm, optional help to **do what matters first**, not as punishment or a productivity dashboard. The system should say what is blocked, why, what happens next, and when access will change.

### Apple platform facts

- Family Controls authorization for a child requires approval from a parent or guardian in the same Apple Family Sharing group.
- A parent-side `FamilyActivityPicker` can show applications and websites from authorized child devices in that Family Sharing group. Selections are privacy-preserving opaque values.
- Managed Settings applies restrictions, while Device Activity can run scheduled/threshold logic even when the child does not open the app.
- Family Controls authorization also protects against simple circumvention, including preventing a child from deleting the authorized parental-control app.
- Distribution requires Apple approval for the Family Controls entitlement for the main app and relevant Screen Time extensions.

### Corrected control model

The product needs two relationships, not one overloaded `isChild` flag:

1. **Kwilt household relationship** — who belongs to this household and what they may do: owner, caregiver, or child participant.
2. **Apple device authorization** — which physical child device is actually authorized for Kwilt parental controls through Apple Family Sharing.

The likely topology is:

```text
Caregiver Kwilt app
  -> defines household policy / handles true exceptions
  -> syncs authoritative policy and grants through Kwilt

Child Kwilt app on each managed device
  -> is enrolled to one child household member
  -> receives/reconciles policy locally
  -> uses Apple's Family Controls + Managed Settings + Device Activity
  -> explains the current state and offers the next valid action
```

Installing Kwilt on both devices is therefore necessary for the proposed experience, but the child device is not controlled merely because its Kwilt account is flagged as a child. It must also be enrolled and authorized through Apple's family-control flow. Conversely, Apple Family Sharing should not silently determine all Kwilt household permissions: caregiver rights, family data access, and billing remain explicit Kwilt roles.

### Constraints to preserve

- Both Andrew and Blaire can participate as caregivers; the system must not create one permanent approval bottleneck.
- The child can understand current access, the reason for a restriction, remaining/earned access, and the next allowed action without asking a parent to interpret it.
- The child's Screen Time app/category choices remain privacy-preserving; Kwilt should not build a surveillance feed.
- Safety-sensitive policy changes, household membership, and new device enrollment require caregiver authority.
- Enforcement defaults conservatively when sync is delayed, but ordinary earned access that was already granted should remain usable offline until its local expiration.
- Native Apple Screen Time and another parental-control app may still impose stricter restrictions; Kwilt cannot promise to override them.
- Signed physical-device/TestFlight evidence is required for authorization, child-device selection, cross-device policy delivery, background enforcement, shield actions, offline expiration, reinstall/deletion behavior, and failover between caregivers.

### Constraints we may challenge

- The current Screen Time brief is centered on adult self-control and one shared setup flow. Family management needs a separate mode and role-aware activation path, while retaining the same native enforcement substrate.
- The current local-only settings record must become a projection of authoritative household policy plus device-local enforcement state.
- Requiring a parent decision for every blocked-app request should be treated as a failure mode. The system should resolve routine cases from agreed rules and surface only genuine exceptions.

### Design implication

The concept should not begin with a remote **Unlock** button or a screen-time wallet. It should begin with a legible family rule that combines real-life and clock-based criteria to answer most access questions automatically, then provide a compact request path for exceptions. The core sentence is: **These apps are available during this window, when these responsibilities are complete, for up to this much use.** The granular design must separately model people, devices, rules, criteria, access state, exceptions, and delivery state so that “the rule allows it” never falsely implies “the child device applied it.”

## Aspirational design challenge

How might we help Maya and her co-caregiver turn repeated Screen Time negotiations into a predictable, child-legible family rhythm—while preserving privacy, progressive independence, and reliable device-level enforcement?

## Out of scope

- Android enforcement in the first concept.
- Reading messages, browsing history, photos, location, or content from the child device.
- Replacing Apple Family Sharing, Apple Screen Time passcodes, or content/communication safety controls.
- A generic chores product, allowance system, school-management system, or behavior-scoring dashboard.
- AI deciding whether a child deserves access.
- Implementation, schema migration, entitlement submission, or release work during this exploration.

## Direction confirmed

The first granular concept optimizes for **routine access without asking**. Chore status and time of day are first-class rule criteria. Caregiver approvals remain an exception path, not the primary operating loop.
