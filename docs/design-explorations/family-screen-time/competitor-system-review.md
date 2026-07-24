# Competitor System Review: Family Screen Time

Research refreshed July 23, 2026. This review uses first-party product sites, help centers, setup guides, and App Store listings. App Store reviews are treated as directional failure evidence, not representative quality scores.

Adjacent architecture research: [what Family Screen Time can learn from Mobile Device Management](./mobile-device-management-reference.md).

Job coverage review: [parent, child, lifecycle, and offline job audit](./job-coverage-audit.md).

Product navigation: [role-aware navigation and end-to-end workflows](./navigation-and-workflows.md).

## Executive read

The category has converged on two main control loops:

1. **Earned-time wallet:** a child receives baseline time, completes work for additional minutes, and spends a visible balance until the selected apps re-shield.
2. **Responsibility gate:** selected apps remain available until a required task becomes overdue, then stay blocked until a parent accepts proof or extends the deadline.

The better products combine these with schedules, daily ceilings, always-available apps, recurring tasks, optional automatic approval, multi-device accounting, and a child-facing status view. Most still make the parent the operational bottleneck, blur household roles, or provide too little evidence that a remote approval actually reached the child device.

Kwilt should not win by creating a larger chore marketplace. Its opportunity is a **family access agreement**: predictable baseline access, real-life conditions, progressively delegated independence, shared caregiver authority, and explicit delivery truth from policy decision through device enforcement.

## Systems examined

### taskr: overdue responsibility gate

**Control logic**

- A caregiver assigns a chore or homework item, sets a due time, chooses the child, and chooses which apps/categories become unavailable if the item is late.
- The child retains access before the deadline. Once overdue, the chosen apps are shielded.
- The child submits photo proof. The caregiver approves, rejects with feedback, or extends the deadline. Approval restores access.
- App targets can vary per task, preserving school, communication, or safety-critical apps while limiting games/social apps.

**Setup and identity**

- The parent creates a family and receives a family code for child devices.
- Apple Family Sharing must already include the child.
- Family Controls permission is accepted on the child device.
- The guide asks the family to designate a primary child device and recommends additional Apple Screen Time settings to limit circumvention.

**What it teaches**

- A deadline-based gate is cognitively simple: the child knows exactly what is due and what happens if it is missed.
- Per-task app targeting is powerful but creates a large configuration surface.
- Photo proof gives caregivers confidence but guarantees a review interruption unless trust rules reduce it.

**Observed weakness**

- A current App Store review reports crashes, logout, backend unavailability, notification residue, and completed work not restoring access. The version history itself repeatedly mentions Screen Time enforcement and notification reliability fixes. That is the category's central trust failure: a correct family decision is worthless when enforcement delivery is ambiguous.

Sources: [taskr system](https://thetaskr.app/), [taskr setup guide](https://thetaskr.app/how-it-works), [taskr App Store listing](https://apps.apple.com/us/app/taskr-chores-screen-time/id6755744833)

### ScreenChore: baseline allowance plus earned bonuses

**Control logic**

- A parent sets a daily allowance for each child and assigns chores by weekday.
- The child spends baseline time first.
- When time is exhausted, the child sees the chores that can earn additional minutes.
- A parent approves completion, or the chore can be configured to auto-approve.
- Selected apps become unavailable when the allowance is exhausted.

**What it teaches**

- Baseline time prevents every minute of leisure from becoming transactional.
- Auto-approval is necessary if the product promise is fewer interruptions.
- One parent account for the whole family is simple to explain but insufficient for accountable co-caregiving.

Sources: [ScreenChore product flow](https://screenchore.com/), [ScreenChore App Store listing](https://apps.apple.com/us/app/screenchore/id6759873609)

### ChoreTime: usage-based time pool

**Control logic**

- Parents choose the managed apps/categories locally on the child device.
- Chore points convert into usage-based time.
- The timer pauses when managed apps are not being used, resumes on use, and re-applies shields when the earned allocation is consumed.
- Earned time can be shared across multiple child devices.
- A parent override can temporarily bypass normal rules.

**Technical posture**

- Family Controls handles authorization and opaque selections.
- Managed Settings applies shields.
- Device Activity monitors usage thresholds and supports automatic re-shielding.
- App/category tokens remain in the shared app container rather than being uploaded as recognizable bundle identifiers.

**What it teaches**

- Usage time is fairer and easier to reason about than a wall-clock grant that drains while the child is interrupted or using an unmetered app.
- A cross-device pool is a household concept; a per-device timer is an enforcement detail.
- Local token storage and cloud-synced abstract policy can preserve privacy.

Source: [ChoreTime technical/product description](https://choretime.app/)

### ScreenCoach: configurable time economy and progressive trust

**Control logic**

- Each child can have **Free Time**, earned **Token Time**, and a daily **Max Time** ceiling.
- Activities can earn time tokens or allowance-like gems.
- Children may select parent-created activities or propose their own, including the amount they believe the work deserves.
- Unused tokens carry forward.
- The system works across multiple devices and can support a device shared by multiple children.

**Role model**

- `Child`: every activity requires approval.
- `Trusted Child`: configured activities or values can self-approve within limits.
- `Account Manager`: full configuration and approval privileges, intended for another parent or administrator.

**What it teaches**

- Baseline, earned, and maximum time solve three different family needs and should not be collapsed into one number.
- Trust is most useful when it reduces approvals within explicit boundaries.
- Child-proposed activities create agency, but child-proposed reward values need ceilings and review.
- ScreenCoach exposes a broad, highly configurable system. Its own App Store feedback notes a learning curve and previously blurred parent/child account experiences. Power can become household administration.

Sources: [ScreenCoach roles](https://help.myscreencoach.com/en/article/add-a-user-child-additional-parent-7joieg/), [earned-time behavior](https://help.myscreencoach.com/en/article/how-can-my-kids-earn-more-screen-time-80d5i8/), [system overview](https://support.myscreencoach.com/support/solutions/articles/51000305059-how-does-screencoach-work-), [App Store listing](https://apps.apple.com/us/app/screencoach-parental-control/id1509516221)

### ScreenRewards: transparent time ledger

**Control logic**

- Parents create family-wide or child-specific chores and assign minute values.
- Children choose from available work, submit it, and receive minutes after approval.
- A visible balance records earning and spending.
- The product adds recurring chores, daily ceilings, school/bedtime blocks, an all-device pause, and cross-platform family sync.

**Identity and privacy posture**

- Child profiles do not require child email addresses or phone numbers.
- The product claims end-to-end encryption for family task/profile content.

**What it teaches**

- A ledger can eliminate disputes about how much time remains, but “bank account for screen time” can turn every responsibility into a market transaction.
- A child profile is not necessarily an independent internet identity.
- Schedules and emergency pauses must override the balance without corrupting it.

Source: [ScreenRewards product and privacy model](https://screenrewards.app/)

### Choreio: configurable approval by child trust

**Control logic**

- Parents assign tasks to one child, multiple children, or a rotation; add schedules, reminders, and late penalties.
- Approval can be required per task and adjusted based on the child's trust level.
- Children can see present and future responsibilities, then submit a photo and comment for approval.
- Daily limits, school/bedtime restrictions, additional time awards, and activity snapshots sit beside the chore loop.

**What it teaches**

- Rotation and multi-child assignment acknowledge real household work better than a flat individual chore list.
- Approval should be a policy on the responsibility, not an unchangeable property of every completion.
- “View online activity” and family-responsibility management are different jobs; combining them easily creates surveillance creep.

Sources: [Choreio parent and child flows](https://choreio.app/), [Choreio FAQ](https://choreio.app/faqs/)

### Joon: motivation layer without system-wide enforcement

**Control logic**

- Parents use one app to assign real-life “Quests.” Children use a separate companion pet game.
- Children mark Quests complete; parents approve or reject them by default.
- Individual Quests can disable **Requires Review**.
- Completed work generates coins/experience used inside the child game or for parent-defined real-world rewards.
- The child joins through a family code and can use a separate or shared device.

**What it teaches**

- Parent and child experiences can be radically different while sharing one family system.
- Optional review at the work-item level is more flexible than a global “trusted child” identity.
- A motivation layer can improve task initiation without controlling the entire device.
- Kwilt should not copy the pet, levels, streaks, or behavioral scoring. Those violate its calmer, identity-first product posture.

Sources: [Joon system](https://www.joonapp.io/user-manual/how-joon-works), [parent guide](https://www.joonapp.io/user-manual/getting-you-started-with-joon), [child setup](https://www.joonapp.io/user-manual/getting-your-kids-started-with-joon)

### Earn Time: broad family control suite and cautionary failure

**Control logic**

- Tasks and templates earn time; schedules/downtime, app and website blocks, Study Mode, bonus time, borrowed future time, family chat, achievements, widgets, Live Activities, geofencing, and device restrictions are combined into one product.
- Recent versions have added per-device usage, multi-device parent pause, and device permission status.

**What it teaches**

- Families do eventually need multi-device state, permission diagnostics, and caregiver-visible current status.
- Borrowing from tomorrow is a useful exception mechanism when it is bounded and legible.
- The suite demonstrates feature-gravity: once a product becomes “parental controls,” it absorbs chat, location, content, reports, and device administration.

**Observed weakness**

- A current App Store review describes a child device remaining locked after the child was removed from the family. The developer response identifies lingering restrictions after removal as a bug. Safe offboarding and local recovery are therefore first-class requirements, not cleanup work.

Sources: [Earn Time App Store listing and version history](https://apps.apple.com/us/app/earn-screen-time-kids-chores/id6757981439), [parent setup guide](https://kidsquest.app/guides/earntime-guide-en.pdf)

### OurPact: separate parent/child apps with broken co-caregiver identity

**Control logic and identity**

- A parent app manages children; a separate OurPact Jr companion appears on child devices.
- At present, two caregivers cannot hold distinct logins for the same children. OurPact tells them to share one account password.

**What it teaches**

- Separate parent/child experiences are established and comprehensible.
- Shared caregiver credentials destroy actor-level accountability, safe revocation, personalized notifications, and least privilege. Kwilt must never use this pattern.

Sources: [parent/child application split](https://support.ourpact.com/hc/en-us/articles/360005460174-What-s-the-Difference-Between-OurPact-and-OurPact-Jr), [multiple-caregiver limitation](https://support.ourpact.com/hc/en-us/articles/115015596227-Can-Two-or-More-Parents-or-Guardians-Share-Management-Abilities)

### ChatGPT: linked accounts and bounded parental governance

**Control and identity model**

- Parent and teen keep separate ChatGPT accounts. Either person can send an invitation; the relationship begins only after the other accepts it.
- Parental controls live inside ordinary account settings rather than in a separate parent application.
- One parent can link with multiple teens, but a teen can currently link with only one parent. Either party may unlink at any time, and the parent is notified if the teen unlinks. This consent-oriented rule is not appropriate for Kwilt's device-enforcement relationship.
- A parent can govern selected capability settings, including sensitive-content safeguards, model training, memory, voice, image generation, and quiet hours. The teen can see which settings are on or off but cannot change parent-managed choices while linked.
- Linking does not expose the teen's conversations or create real-time monitoring. Limited safety notifications are a separate, narrowly disclosed exception.
- The relationship ends automatically when the account is identified as adult, returning full settings authority to the account holder.

**What the screenshot and system teach**

- The strongest reusable pattern is not the row labeled **Parental controls**. It is the model behind it: one product, independent identities, an accepted relationship, bounded delegated authority, visible settings, and an explicit lifecycle.
- This validates Kwilt running on both caregiver and child devices with role-aware experiences. Kwilt does not need separate parent and child app-store products.
- Parent access should govern named capabilities, not reveal the child's entire Kwilt account. A Screen Time caregiver should not automatically inherit Money, Chat, Goal, journal, or broader family access.
- The relationship should be legible from both sides. A child should see who can manage Screen Time and what those caregivers can change.
- Settings are the right place to create and inspect the family relationship. They are not the right place for the daily Screen Time loop: current access, remaining time, responsibilities, requests, and enforcement health need dedicated role-aware surfaces.

**Where the pattern is insufficient for Kwilt**

- ChatGPT governs behavior inside one service. Kwilt must also enroll a physical child device, obtain Apple's Family Controls authorization, deliver a versioned policy, and receive proof that the device applied it.
- A managed child must not be able to unlink the household, remove a caregiver, sign out to disable reconciliation, or retire the managed device. The child may request release or report an incorrect/unsafe relationship, but a caregiver-authorized release and device cleanup receipt are required to stop enforcement.
- ChatGPT's current one-parent-per-teen relationship cannot represent Andrew and Blaire as independent, equally capable caregivers. Kwilt needs multiple accountable caregivers without shared credentials.
- ChatGPT links authenticated teen accounts. Kwilt also needs dependent child profiles that can begin without an email or phone number and later attach to a child's own login.
- A small set of feature switches does not model baseline time, earned access, schedules, exception requests, multi-device usage, expiring grants, or delivery receipts.

**Kwilt interpretation**

Use the ChatGPT pattern for **relationship setup and bounded authority**:

```text
Settings > Household
  People and roles
  [Child]
    Screen Time caregivers
    Managed devices
    Capability permissions
```

Use the Screen Time capability for **daily operation**:

```text
Caregiver: child status -> policy -> exception -> device receipt
Child:     current access -> what changes next -> available actions -> request
```

Sources: [OpenAI parental controls overview](https://openai.com/index/introducing-parental-controls/), [OpenAI parental controls FAQ](https://help.openai.com/en/articles/12315553-parental-controls-faq)

### Apple Family Sharing: two platform jobs with the same name

Apple Family Sharing participates in two separate parts of the Kwilt system. Neither should become Kwilt's household authorization database.

**1. Child-device authorization**

- The child's Apple Account belongs to the Apple family group.
- Kwilt requests Family Controls authorization for the child on the managed device; a parent or guardian authenticates it.
- Kwilt's existing `.individual` authorization remains available for adult self-control. Family enrollment adds a distinct `.child` authorization path; it must not silently reinterpret an existing individual setup as parent-managed.
- Apple then supplies anti-circumvention protections for the authorized parental-control app. The child cannot independently revoke Kwilt's household authority from inside Kwilt, and the app must continue enforcing while signed out or offline.
- A caregiver-authorized unenrollment must deliberately revoke authorization, clear Kwilt's Managed Settings, stop Device Activity monitors, retire the install, and acknowledge completion before the server calls the device unmanaged.

This is the platform trust anchor for **who may authorize control of the device**. It does not define which Kwilt caregiver can approve a request or see another capability.

**2. App Store purchase and subscription sharing**

- Kwilt is already free to download, so each family member can install the same binary and use their own Kwilt identity.
- Apple can make an eligible Kwilt Pro auto-renewable subscription shareable with up to five other Apple family members. Each member receives their own transaction/receipt; RevenueCat identifies family-shared ownership separately.
- The purchaser still chooses whether to share the subscription, and shared entitlement can later be revoked if sharing stops or the recipient leaves the Apple family.
- Enabling Family Sharing is a per-product App Store Connect decision and cannot be reversed for that product. It therefore needs an explicit packaging decision rather than being switched on as an implementation convenience.
- Apple and RevenueCat do not reveal enough information to reconstruct which shared receipts belong to the same Apple family. Kwilt must use its own authenticated Household records for membership, billing-plan seats, caregiver scope, and lifecycle.

**Recommended commercial model**

Treat Screen Time as a household capability purchased once, not as a child-by-child subscription. App Store Family Sharing can remove purchase friction for independently signed-in family members, but the Kwilt backend should grant capability access through an active household plan. A StoreKit entitlement answers **is this Apple account entitled to paid Kwilt?** A Kwilt household permission answers **what may this person do for which child?**

Before enabling it, verify the current App Store Connect products and sandbox-test purchase, restore, sharing delay, revocation, Apple-family departure, Kwilt-household departure, and RevenueCat webhook behavior. Do not allow loss of a shared purchase receipt to silently remove active device restrictions; it may stop future premium policy changes, but safe enforcement/release needs an explicit transition.

Sources: [Apple Family Controls](https://developer.apple.com/documentation/FamilyControls), [Apple child-family transfer and departure rules](https://support.apple.com/en-us/102634), [Apple StoreKit Family Sharing](https://developer.apple.com/documentation/storekit/supporting-family-sharing-in-your-app), [App Store Connect configuration](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/turn-on-family-sharing-for-in-app-purchases), [RevenueCat Family Sharing](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-family-sharing)

## Established product patterns

| Pattern | Why it exists | Common failure |
| --- | --- | --- |
| Parent surface + child surface | Authority and daily-use needs are different | Role confusion or two unrelated products |
| Family code / invite enrollment | Child devices need a low-friction join path | Code treated as permanent authority rather than bootstrap proof |
| Accepted account relationship | Separate identities need explicit, revocable linkage | Relationship confused with device enrollment or universal data access |
| Capability-scoped parental settings | Caregivers need authority over a bounded experience | A parent role silently grants access to the child's entire account |
| Child-visible governance | The managed person should know who controls what | Controls become invisible surveillance or unexplained restrictions |
| Caregiver-controlled device release | A child must not bypass active enforcement by unlinking | No recovery path, zombie shields, or coercive control after authority should end |
| Apple Family Sharing + child-device authorization | Apple requires guardian approval for child enforcement | Product account role falsely presented as device authorization |
| Baseline daily access | Not every leisure minute should require work | Baseline and earned time become one opaque number |
| Earned time wallet | Children can see and control a finite resource | Every family responsibility becomes transactional |
| Required-item gate | Important work happens before selected distractions | One missed item can create an overbroad lockout |
| Proof then approval | Caregiver can verify remote completion | Every success generates an interruption |
| Auto-approval / trusted mode | Reduces repetitive approvals | Trust is global, vague, or hard to audit |
| Usage-based countdown | Earned time is consumed only during selected activity | Cross-device counters drift or expire late |
| Daily maximum and blocked windows | Earned balances should not override sleep/school/family rules | Override precedence is unclear |
| Always-available apps | Safety and communication must remain usable | “Lock device” language overpromises what is actually shielded |
| Multi-device child identity | Children use phones, tablets, and sometimes shared devices | Device state is mistaken for child state |
| Parent override / pause | Real life produces exceptions | Override becomes the default path and recreates nagging |
| Transparent ledger/history | Prevents disputes about earned and spent time | Turns into a surveillance or performance dashboard |
| Recurring responsibilities | Routine work should not be recreated daily | Setup becomes a schedule editor parents must maintain |

## The opportunity for Kwilt

### Core concept: family rules, not a time marketplace

The product is a deterministic rule system in which criteria govern access to selected apps, categories, or websites. Chores are normally eligibility conditions, not currency.

The caregiver-facing rule should read like a family sentence:

> **Games are available between 4:00 and 7:00, after homework and today's chores are complete, for up to 30 minutes.**

Each rule has four understandable parts:

1. **What:** the selected activity group, such as Games or Entertainment.
2. **When:** allowed days and time windows.
3. **After what:** named responsibilities, a routine, or all required items due today.
4. **How much:** an optional usage cap inside the eligible window.

Criteria within one rule use **AND** semantics: all must be true before access opens. Multiple allowed windows for the same activity use **OR** semantics. The interface should express this in ordinary sentences rather than exposing boolean logic.

Precedence must remain small and predictable:

1. Safety and communication apps marked **Always available** remain available.
2. Hard blocked windows such as bedtime or school override ordinary availability.
3. A normal rule opens access only when its time and responsibility criteria are satisfied.
4. A caregiver may issue a bounded exception that explicitly states which failed criterion it overrides and when the exception expires.

A completed responsibility resets according to its own recurrence. A daily chore satisfies today's criterion; it does not permanently unlock the rule. Whether completion requires caregiver review is configured on the responsibility, not decided anew on every Screen Time request.

This keeps the system understandable for both sides. The caregiver sets a few stable agreements. The child sees one current explanation: **Games open at 4:00 after homework** or **Games are available for 18 more minutes.** Kwilt evaluates the rules and asks a caregiver only when the family wants to make an exception.

### 1. Resolve routine cases before notifying a caregiver

Most competitors digitize the interruption: the child submits, the parent receives a push, and the parent taps approve. Kwilt should treat repeated approval as a temporary trust state.

For each access condition, the family can choose:

- **Automatic:** completion deterministically grants access.
- **Check the first few times:** caregiver review establishes confidence, then Kwilt offers to make that condition automatic.
- **Always review:** reserved for ambiguous, higher-stakes, or safety-sensitive cases.

This is per condition and per child, not a global “good kid” score.

### 2. Separate three types of family agreement

- **Baseline:** ordinary leisure access the child receives without earning it.
- **Before first:** a required real-life condition that must be satisfied before selected apps become available.
- **Earn more:** optional work or activity that adds discretionary access.

This prevents normal responsibilities, exceptional contributions, and basic leisure from becoming one chore market.

### 3. Spend access intentionally

Instead of removing every shield whenever the balance is positive, the child starts an access session for a chosen group, such as **Games for 20 minutes**. The session consumes usage-based time, shows the end state clearly, and leaves unrelated rules untouched.

This improves comprehension and makes the grant feel deliberate rather than like an invisible global toggle.

### 4. Make progressive independence a policy, not a role label

Trust should be expressed as bounded delegation:

- Which condition may self-verify?
- How much access may it grant?
- How often?
- Within what daily ceiling?
- Until when?

The family can graduate a condition from review-required to automatic without elevating the child into a broadly privileged account.

### 5. Give both caregivers real identities

Andrew and Blaire should receive independent household memberships, notification preferences, sessions, and audit attribution. Either can answer an exception; the first accepted response closes the request for both. Policy changes and approvals record who acted and what state the device reached.

### 6. Treat delivery state as product UI

An access decision should have explicit states:

```text
requested -> allowed by policy / approved -> delivered -> applied on device
                                          -> failed / device offline
                                          -> expired -> shield restored
```

The caregiver UI must distinguish **Approved** from **Applied on Riley's iPad**. The child device must retain enough signed/local state to honor already granted access and restore restrictions when time expires offline.

### 7. Make recovery and offboarding impossible to miss

Removing a child, disabling Screen Time, signing out, losing household membership, or retiring a device must invoke a local cleanup contract and show the result. A child device needs a caregiver-authenticated recovery path when server state is unavailable. Kwilt must not leave “zombie shields.”

### 8. Preserve child dignity and privacy

The child sees:

- what is available now;
- why something is unavailable;
- what they can do next;
- how much access remains;
- who changed a rule;
- their own requests and decisions.

The caregiver sees enough enforcement and agreement state to govern the system, not a feed of browsing content, messages, location, or behavioral scoring.

Research on joint family oversight supports transparency as a conversation aid but also surfaces parent/teen power imbalances and the need for selective sharing with trusted relatives. That favors explicit scopes and child-legible rules over reciprocal surveillance or a default extended-family roster. Sources: [parent/teen joint oversight study](https://arxiv.org/abs/2204.07749), [extended-family oversight study](https://arxiv.org/abs/2306.02287).

## System-wide changes required in Kwilt

### Current reusable foundations

- One Supabase identity/session owner.
- Goal invite, membership, and RLS primitives for entity-scoped collaboration.
- Install identity and push-token registries.
- Local Activities, completion/progress events, scheduling, Focus Sessions, and notifications.
- Local Screen Time settings, Family Controls entitlement path, Family Activity Picker, Managed Settings store, and shield extensions.
- Unified capability direction that already names household identity and Screen Time as shared platform concerns.

### Current gaps

- No household entity or household membership model.
- `kwilt_memberships` is constrained to `entity_type = 'goal'`; its roles model collaboration on one Goal, not authority over a household or child.
- No dependent child profile distinct from an authenticated user.
- No relationship between a child profile, a Kwilt install, and an Apple-authorized managed device.
- Push tokens are user-scoped but not device-scoped in a way that can prove delivery to a particular child device.
- Screen Time rules and authorization are local-only and use `.individual` authorization.
- No Device Activity monitor extension or offline usage-based allowance engine.
- No authoritative household policy, access ledger, request, approval, command, delivery receipt, or enforcement health record.
- No capability-scoped household privacy model. Most existing server data remains owner-only; shared Goals are entity-specific.

### Recommended platform model

Do not stretch `kwilt_memberships` into a universal role table. Keep Goal collaboration separate and introduce an explicit household control plane:

```text
households
  household_memberships
    authenticated adult member OR dependent child profile
  household_member_scopes
    which children/capabilities a caregiver may govern

dependent_profiles
  optional linked auth user as the child grows

managed_devices
  install_id + child profile + Apple authorization/enforcement state

screen_time_policies
  baseline + before-first conditions + earn-more rules + ceilings + schedules

screen_time_conditions
  Activity/routine/Focus/manual evidence and approval policy

screen_time_ledger_entries
  grants, spends, adjustments, expirations; append-only

screen_time_requests
  child exceptions and caregiver decisions

screen_time_device_commands
  intended state/version for one managed device

screen_time_delivery_receipts
  delivered/applied/failed/expired/recovered evidence
```

The cloud owns household intent, authority, and the append-only access ledger. Each child device owns Apple tokens and actual enforcement. Synchronization is a reconciliation protocol, not a remote `clearRestrictions()` call.

### Identity and household foundation

- Add a private **Household** participation space distinct from broader-family sharing. Screen Time, Money, Chores, Meals, and other operational capabilities can use household membership without exposing data to Shared Goal or broader-family participants.
- Keep one billing owner while supporting multiple authenticated caregivers.
- Support dependent child profiles that need no email or phone number. A child can later link a real Kwilt auth identity without replacing the profile or losing its history.
- Make invites short-lived bootstrap credentials. Acceptance creates a durable membership/device enrollment; the code is not ongoing authority.

### Device enrollment and native runtime

- Promote the existing install registry into a managed-device relationship without conflating an install with a person.
- Store device-specific push token, app/build version, last check-in, policy version, authorization status, Apple selection presence, enforcement status, and last successful reconcile.
- Add Device Activity monitor/report extensions needed for usage thresholds and background re-shielding.
- Keep opaque Apple app/category tokens in an app-group/local device store unless signed-device experiments prove a privacy-safe cross-device encoding is required and supported.
- Add signed/versioned policy snapshots and monotonic command handling so retries are idempotent and stale approvals cannot reopen access.
- Define precedence: emergency/always-available > caregiver pause/safety schedule > daily ceiling > active earned grant > baseline > shield.

### Activities and condition evidence

- Activities remain Kwilt's atomic unit of doing. A Screen Time condition references an Activity or a lightweight recurring household responsibility rather than creating a separate generic task universe.
- Preserve capture-first: Screen Time setup cannot become required metadata on Activities.
- Record evidence separately from completion. An Activity may be complete in Kwilt while its Screen Time grant is pending review, automatic, rejected, or expired.
- Do not let AI determine completion, deservingness, or access authority.

### Notifications and realtime behavior

- Route approval requests to eligible caregivers individually, respecting each caregiver's notification preferences.
- Use first-valid-decision-wins semantics and withdraw/downgrade stale notifications on other caregiver devices.
- Child-device receipts update request and device health state, but push delivery is only a wake-up hint; reconciliation must recover after missed pushes.
- Default to one calm exception notification, not a stream of overdue-task alerts.

### Security and RLS posture

- Enforce authorization from database membership and explicit capability/child scopes, never user-editable auth metadata.
- Every mutation checks: authenticated actor, active household membership, permitted capability action, permitted child scope, and non-stale object version.
- Child clients cannot insert approvals, policy changes, ledger adjustments, device ownership changes, or caregiver memberships.
- Caregivers cannot read unrelated personal Kwilt objects merely because they share a household.
- Server functions that coordinate privileged mutations must validate `auth.uid()` and household permission explicitly; service-role access is not itself authorization.
- New public-schema tables require explicit Data API grants under current Supabase exposure behavior, plus RLS and adversarial policy tests.

### Product surfaces

- **Household settings:** people, roles, invitations, capability access, and managed devices.
- **Screen Time caregiver home:** one child card per child showing availability, next transition, exceptions needing attention, and device enforcement health—not a KPI dashboard.
- **Child Screen Time home:** available now, current session, next condition, request path, and personal ledger.
- **Shield:** reason, remaining requirement or expiration, one valid next action, and safe access that remains available.
- **Activity detail:** optional Screen Time agreement section only when that Activity is already a condition.

### Lifecycle, privacy, and operations

- Add household-aware export/deletion, child-profile erasure, device retirement, caregiver removal, ownership transfer, and subscription transfer semantics.
- Define minimum retention for access decisions and device receipts; delete photo proof promptly after review unless the family deliberately retains it.
- Avoid storing app names, browsing content, message content, location, or raw device-usage histories when opaque counts/state suffice.
- Add an operational device-health view for internal support because failures will span app version, entitlements, Apple authorization, notification delivery, policy version, and local extension state.

## Recommended role governance

### Separate four concepts

1. **Household role:** a person's durable place in the private household.
2. **Child scope:** which children that adult may govern.
3. **Capability permission:** what that adult may do in Screen Time, Money, Chores, and other private capabilities.
4. **Condition trust policy:** whether one child's completion of one condition needs review.

Do not encode all four in `owner | parent | child`.

### V1 household roles

| Role | Membership/billing | Screen Time policy | Routine approvals | Own child experience |
| --- | --- | --- | --- | --- |
| Billing owner | Manage plan, transfer ownership, invite/remove caregivers and children | Full | Full | If also a managed participant |
| Caregiver | No billing transfer; cannot remove owner | Manage for scoped children | Approve/deny for scoped children | If also a managed participant |
| Child participant | Cannot manage household | View own policy only | Submit evidence/request; automatic grants only where policy allows | Full own status/ledger/session control within limits |

One person may have only one household membership role, but permissions are evaluated per capability and child scope. Andrew and Blaire should normally be `Billing owner` and `Caregiver` with equivalent Screen Time authority; the billing distinction should not create a daily parenting distinction.

### Deferred role: limited caregiver

A babysitter, grandparent, or other helper may later receive time-bounded permission to approve routine requests for selected children without seeing household Money, private Goals, full device history, or membership administration. Do not include this in V1 schema semantics unless it can be enforced end to end.

### Governance invariants

- Never share credentials between caregivers.
- Never infer Kwilt caregiver authority solely from an Apple Family Sharing role.
- Never infer Apple device authorization from a Kwilt household role.
- Never allow removal of the last billing owner without an explicit transfer.
- Every sensitive action records actor, target child/device, prior state, new state, reason, policy version, and device result.
- A child can always see which caregivers currently have Screen Time authority over them.
- Approval rights can be revoked immediately; already-issued local grants keep only their bounded expiry unless explicitly recalled and the child device confirms it.
- “Trusted child” is not an identity role. Automatic approval is a scoped, revocable policy for a named condition with a ceiling.
- Broader family membership never grants Household or Screen Time access automatically.

## Job-flow delivery review

Target: `audience-aspirational-family-organizers`, represented by Maya.

- **Schedule or hand off work — 2/5:** household authority, co-caregiver routing, and device reconciliation do not exist.
- **Family participation — 2/5:** shared Goals provide entity membership, but there is no private household/child participation model.
- **Keep using the system — 3/5:** local self-directed Screen Time exists, but cross-device family enforcement cannot yet be trusted.

No score changes are justified because this is research, not shipped capability.

Recommended next design challenge:

> How might we let a child understand and satisfy ordinary access agreements independently, while either caregiver handles only genuine exceptions and every family member can tell whether the child device actually applied the decision?

## Decisions to carry into divergence

- The core object is a **family access agreement**, not a chore and not a remote unlock.
- Household authority, Apple device authorization, and progressive trust are separate models.
- Baseline, before-first, and earn-more rules are separate policy types.
- Usage-based time is preferred to wall-clock time for earned sessions.
- Caregivers use distinct identities; routine approvals should shrink over time.
- Delivery state and safe offboarding are first-class product behavior.
- The first learning release should not include surveillance, family chat, location, web filtering, allowance money, AI verification, or extended-family helpers.
