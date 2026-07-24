# Navigation and Workflows: Family Screen Time

## Navigation decision

Family Screen Time uses three existing Kwilt ownership levels rather than creating a parental-controls mini-app:

1. **Screen Time capability** — daily state, child access, family rules, requests, and actionable delivery truth.
2. **Global Settings > Household** — people, roles, invitations, child profiles, managed devices, and release.
3. **To-dos capability** — canonical assigned Activities used as responsibility criteria. This depends on the proposed [Activity Assignment Dependency](./activity-assignment-dependency.md); today's personal owner-scoped Activities cannot yet fill this role.

This follows the accepted shell and settings contracts:

- The capability side sheet owns capability entry.
- The avatar owns global Settings.
- A title-adjacent ellipsis owns contextual Screen Time settings links.
- Object mutation remains with the canonical object; Screen Time links to household Activities rather than creating a duplicate chore system.
- Personal To-dos stay private by default. Choosing another household member in **Who's doing this?** shares only that Activity; household membership never exposes a person's private list.
- React Navigation remains the single router.

## Proposed information architecture

```text
Kwilt side sheet
├── Goals & Plans
│   ├── Goals
│   ├── To-dos
│   ├── Plan
│   ├── Arcs
│   └── Chapters
├── Family & Home                       future group; not a destination
│   └── Screen Time                     capability
├── Chats
└── Avatar -> Settings
    ├── Household                       global relationship settings
    │   ├── People & roles
    │   ├── Invitations
    │   └── [Child]
    │       ├── Screen Time caregivers
    │       └── Managed devices
    └── Screen Time Controls            existing personal/self-control settings
```

The learning release may register Screen Time as a direct allowlisted capability before the future **Family & Home** group is ready. It should not add an empty group solely for one hidden test capability.

## Why Screen Time is not only a Settings row

Settings is appropriate for enrollment and durable administration, but the daily jobs are operational:

- Is Games available now?
- What does the child need to do next?
- How much use remains?
- Is a real exception waiting?
- Did Riley's iPad apply the rule?

Those questions justify a first-class Screen Time capability. The existing **Settings > Screen Time Controls** route remains the adult `.individual` configuration surface during the learning release. Family Screen Time does not silently replace it.

## Role-aware Screen Time root

One `ScreenTimeHome` route renders different useful content based on the signed-in person's household role and device enrollment. It is not a user-selectable “parent mode” toggle.

### Caregiver home

```text
Screen Time

Riley
Games open after homework at 4:00
Applied on Riley's iPad

[Exception awaiting decision]            only when present

My Screen Time                           restrained secondary link
```

- One calm card per child.
- Card shows the current family sentence, next transition, and only actionable device truth.
- Tap the child card to open `ScreenTimeChildDetail`.
- A pending exception appears inside the child's card and through a direct notification link; there is no separate request inbox in the learning release.
- Adult personal Screen Time remains reachable but does not compete with the family state.

### Child home

```text
Screen Time

Games open at 4:00 after homework.

Next
Homework                           [Open to-do]

Today
30 minutes available

[Ask for an exception]
```

- Lead with one current truth, not the full policy.
- Show the next incomplete Activity as a reference to the canonical To-do.
- `Open to-do` navigates to the Activity detail in the To-dos stack with an exact return target.
- Completion occurs on the Activity surface. Screen Time re-evaluates from canonical Activity truth.
- These behaviors describe the proposed household-Activity model, not current Kwilt behavior.
- If no action is available, say when access changes next.
- Device/offline status appears only when it changes what the child can do.

### Solo adult home

For a person with no family-managed child relationship, Screen Time continues to present their existing `.individual` protection state and setup. Family setup appears as a separate, restrained invitation; adult state is never reclassified as parent-managed.

### Caregiver who is also self-managing

Show family child cards first because they contain shared operational state. Place **My Screen Time** as a secondary destination. Do not use a persistent Family/Me segmented control unless family use proves the secondary link inadequate.

## Proposed route ownership

### Capability stack

```text
ScreenTimeStack
├── ScreenTimeHome
├── ScreenTimeChildDetail(childId)
├── ScreenTimeRuleDetail(ruleId)
├── ScreenTimeRuleComposer(ruleId?)
└── ScreenTimeException(requestId)        compact sheet or pushed detail
```

For the one-rule learning release, `ScreenTimeRuleDetail` and `ScreenTimeChildDetail` may be one screen if separate routes would create empty hierarchy. The data model remains distinct even if the UI collapses them.

### Settings stack

```text
SettingsHome
├── SettingsHousehold
│   ├── SettingsHouseholdInvite
│   └── SettingsHouseholdMember(memberId)
│       └── SettingsManagedDevice(deviceId?)
└── SettingsScreenTimeProtection          existing individual mode
```

Do not create a second **Family Screen Time Settings** home. The Screen Time ellipsis deep-links to the relevant Household member/device or existing personal settings destination.

### Cross-capability Activity route

The child launches the canonical `ActivityDetail`/To-do route with return context:

```text
ScreenTimeHome
  -> ActivityDetail(activityId, returnTo: ScreenTimeHome)
  -> complete Activity
  -> local rule re-evaluation
  -> back returns to ScreenTimeHome
```

If the Activity becomes complete while offline, the local occurrence and outbox update before return so Screen Time can show the resulting access immediately.

## Deep links

Durable links should resolve to stable user jobs:

```text
kwilt://screen-time
kwilt://screen-time/child/:childId
kwilt://screen-time/request/:requestId
kwilt://settings/household
kwilt://settings/household/member/:memberId
```

- A caregiver notification opens the exact request.
- A device-health notification opens the exact child/device context.
- The custom shield opens the child Screen Time home or the exact next Activity when one unambiguous Activity blocks access.
- Deep-link authorization checks occur before rendering; a stale or unauthorized link falls back to Screen Time home with a plain explanation.

Do not include Apple opaque app/category tokens in routes or analytics.

## Workflow 1: First caregiver setup

```text
Side sheet -> Screen Time
  -> Family Screen Time empty state
  -> Set up for a child
  -> Settings > Household
  -> Create household
  -> Add child profile
  -> Set up child device
```

On the child device, with a caregiver present:

```text
Open Kwilt enrollment link/code
  -> Confirm child profile
  -> Apple guardian `.child` authorization
  -> Choose governed apps/categories
  -> Require automatic date and time
  -> Device capability check
  -> First policy/receipt round trip
  -> This device is ready
```

After readiness, both devices return to the caregiver's Screen Time capability and open the starter rule composer. Setup does not finish on a generic Settings success page.

## Workflow 2: Add Blaire as co-caregiver

```text
Avatar -> Settings -> Household -> Invite caregiver
  -> Send authenticated invitation
  -> Blaire accepts in her Kwilt account
  -> Household shows Screen Time scope for Riley
  -> Blaire's side sheet now includes family Screen Time state
```

- Blaire receives the same daily Screen Time authority as Andrew for the scoped child.
- Billing-owner status is not emphasized in everyday Screen Time UI.
- Neither caregiver sees unrelated private capability data merely because they can manage Screen Time.

## Workflow 3: Create the first rule

```text
Screen Time -> Riley -> Create rule
  -> What: Games selection
  -> When: school days, 4:00–7:00
  -> After: Homework + Feed the dog
  -> How much: 30 minutes
  -> Preview child experience
  -> Activate
  -> Updating Riley's iPad
  -> Applied
```

The composer is one sentence-shaped screen, not a four-step wizard that hides the whole agreement. Rows may be edited in any order; activation requires a valid time window and device support. The screen stays in a pending state until the child device acknowledges the policy version.

## Workflow 4: Ordinary child day

Before 4:00:

```text
Child opens Screen Time
  -> Games open at 4:00 after homework
  -> Open to-do
  -> Activity detail
  -> Complete homework
  -> Return to Screen Time
  -> Homework done. Games open at 4:00.
```

At 4:00:

```text
Device Activity schedule begins
  -> local evaluator sees all criteria true
  -> Managed Settings clears Games shield
  -> child sees 30 minutes available
```

During use:

```text
Apple counts foreground Games usage
  -> child may view remaining use in Screen Time
  -> at threshold, local extension restores shield
  -> shield says Games are finished for today
```

No caregiver notification is sent during a normal day.

## Workflow 5: Fully offline day

```text
Child device has cached Rule v17 + local Activity occurrences
  -> child completes Homework offline in To-dos
  -> local Activity outbox records completion
  -> Screen Time evaluator opens Games if clock criterion passes
  -> Device Activity counts usage locally
  -> threshold restores shield
  -> reconnect uploads outbox/receipts and sends full snapshot
  -> device fetches any newer rule version
```

The child home behaves normally. A small **Offline** note appears only when the child requests something that requires a caregiver or when policy freshness is material.

## Workflow 6: Child requests an exception

From Screen Time home or the custom shield:

```text
Ask for an exception
  -> Use now / 10 more minutes / Something is wrong
  -> optional short note
  -> Send
```

Child sees:

- **Waiting for Andrew or Blaire** when connected.
- **We'll send this when you're back online** when the child device is offline.

Caregiver receives a quiet actionable notification:

```text
Riley asked for 10 more minutes of Games
  -> notification deep-links to ScreenTimeException
  -> See current rule + request note + device status
  -> 10 minutes / Until 7:00 / Keep the rule / Not today
  -> decision records once for both caregivers
  -> approval: Waiting for Riley's iPad -> Applied
  -> denial: child sees next eligible request boundary
```

The request sheet is not a chat thread and does not expose detailed app-usage history. One pending or denied request owns the current child/app/rule state: repeated child taps do not create additional requests or notifications. **Keep the rule** suppresses another time request until eligibility meaningfully changes; **Not today** suppresses it until the next local day. **Something is wrong** remains separately available for help.

## Workflow 7: Edit a rule

```text
Screen Time -> Riley -> Rule
  -> Edit
  -> change one or more sentence rows
  -> review effective timing
  -> Publish new version
  -> old version remains device truth until new version applies
```

If an access session is active, the review screen must say what the edit will do:

- **Apply after today's session** is the default for non-safety changes.
- **Apply now** is a deliberate caregiver action and names whether access will close.

The learning release may support only edits when no session is active. It must not silently change active-session semantics.

## Workflow 8: Device needs attention

Caregiver child card shows a restrained state:

```text
Riley
Rule v17 last applied yesterday at 4:02 PM
Device offline
```

Tap opens child detail with one next action:

- Ask Riley to open Kwilt.
- Finish Apple authorization.
- Update Kwilt.
- Re-select governed apps.
- Retry current policy.

Protocol logs remain in internal diagnostics, not in the family UI.

## Workflow 9: Release the child device

```text
Avatar -> Settings -> Household -> Riley -> Managed devices
  -> Riley's iPad
  -> Release this device
  -> caregiver re-authenticates
  -> explain that Kwilt will remove its restrictions
  -> publish release policy
  -> Release pending on Riley's iPad
  -> child device stops monitors and clears Kwilt shields
  -> cleanup receipt
  -> Released
```

The device remains listed while release is pending. The child can request this process from Screen Time but cannot execute it unilaterally.

## Reductive navigation decisions

- **Add:** one Screen Time capability stack and one Household settings branch.
- **Keep:** existing Settings root, existing individual Screen Time route, To-dos/Activity detail, capability side sheet, and one root router.
- **Collapse:** one-rule child detail and rule detail in the learning release when separate screens add no value.
- **Refuse:** parent/child mode switch, separate request inbox, device dashboard, chore home, family admin capability, second settings home, or separate child app.
- **Contextualize:** show device state only when it affects the current family job.
- **Deep-link:** notification and shield entry return to the exact child/request/Activity, then preserve an understandable back path.

## Learning-release route minimum

The smallest coherent TestFlight slice needs only:

```text
Capability
  ScreenTimeHome
  ScreenTimeChildDetail                 includes rule detail
  ScreenTimeRuleComposer
  ScreenTimeException                   compact sheet

Settings
  SettingsHousehold
  SettingsHouseholdMember               includes one managed device

Existing
  SettingsScreenTimeProtection          individual mode
  ActivityDetail                        responsibility completion
```

Additional route separation should follow observed navigation pressure, not anticipated enterprise administration.
