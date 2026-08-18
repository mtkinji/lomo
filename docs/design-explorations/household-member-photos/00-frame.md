# Frame: Household Member Photos

## What the user said

> We need the ability to add an image of each child within the household. If a
> child has their own Kwilt account, we should use their photo.

## Restated in user voice

When my family participates in Kwilt, I want each child to be recognizable at a
glance, so the right person can enter and understand their own household
experience without turning a child photo into an account, permission, or public
profile.

## Target audience

`audience-aspirational-family-organizers` — families who want ordinary
participation to feel natural without administering a workspace.

## Representative persona

**Maya** coordinates household life for children with different ages, devices,
and levels of Kwilt participation.

- Current situation: some children have independent Kwilt accounts while
  others exist only as caregiver-managed dependent profiles.
- What she is trying to do: make family identity legible wherever attribution
  matters, especially on a shared device.
- Emotional state or tension: a familiar photo should make switching feel
  immediate, but child identity and privacy still need clear ownership.
- What would make this feel wrong: requiring a photo, publishing it, letting a
  caregiver silently override a connected child's identity, or treating the
  image as authority.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — recognizable household participation
helps ordinary family work move with less friction.

## Job flow step

Step 7 of `job-flow-maya-move-family-life-forward`, **Let family members
participate without turning life into admin**, is currently scored 3/5.
Household and capability foundations exist, but the roster and active-member
control expose names rather than a durable, recognizable member identity.

## Active anchors

- `jtbd-invite-the-right-people-in` — show the correct bounded household
  identity without broadening access.
- `jtbd-trust-this-app-with-my-life` — make child-photo ownership, visibility,
  replacement, and removal explicit.
- `jtbd-move-the-few-things-that-matter` — reduce friction when family members
  switch context or act with attribution.

```yaml
serves: [jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life, jtbd-move-the-few-things-that-matter]
```

## Friction we're addressing

The canonical `kwilt_people` record and client `HouseholdMember` projection do
not carry a photo. Dependent-child creation collects only a name, so Chores and
future Household Mode surfaces can show initials but cannot present the
recognizable family identity the switcher implies.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Settings → Household creates dependent profiles and
  manages child-by-child capabilities.
- Existing user flow: the shared-device identity control lists eligible
  children and the assigned caregiver; Chores is its first shaped consumer.
- Existing domain/data model: `kwilt_people` is canonical person identity and
  remains distinct from auth binding, Household membership, capability grant,
  and active-device actor.
- Existing technical affordance: `ProfileAvatar` already renders a URL or a
  name-derived fallback throughout Kwilt.
- Existing UX convention: global Settings owns shared identity management;
  attribution-sensitive capabilities consume projections rather than owning
  profiles.

Constraints to preserve:

- A photo is optional and never blocks person creation, switching, or capture.
- A photo is roster metadata, not proof of identity, authentication, authority,
  content access, or Household membership.
- A dependent child's photo is caregiver-managed and household-private.
- When a child has a connected Kwilt account, that child's own account photo is
  authoritative; a prior caregiver-managed photo becomes fallback only.
- Removing or replacing a photo is explicit and reversible.
- Capability surfaces consume the resolved photo and do not create independent
  avatar copies or editors.

Constraints we may challenge:

- `kwilt_people` currently stores only a display name and person kind.
- Household Settings currently has no person-detail editing surface after a
  dependent is created.

Design implication:

Photo storage and precedence belong in the canonical Household Person
projection. The first useful UI is a quiet person-detail action in Settings;
Chores and the active-member switcher should only render the resolved result.

## Aspirational design challenge

How might we help Maya and her family recognize who is participating at a
glance, while keeping a child's photo private, optional, and separate from
account access or capability authority?

## Out of scope

- Public child profiles, discovery, feeds, or social visibility.
- Face recognition or using photos to authenticate a child.
- Photo requirements, setup-completion prompts, or roster progress.
- Capability-specific avatar editors or copied avatar snapshots.
- Broader birthdays, addresses, contact import, gifting, or relationship-memory
  work already reserved for the future People foundation.

## Open question

None for framing. The user confirmed that a connected child's own Kwilt photo
takes precedence over a caregiver-managed dependent photo.
