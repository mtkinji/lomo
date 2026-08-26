---
id: brief-household-member-photos
title: Private Household Member Photos
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-move-the-few-things-that-matter, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-household-foundation, brief-shared-household-device-profiles, brief-chores-as-recurring-activities]
owner: andrew
last_updated: 2026-08-18
---

# Private Household Member Photos

## Context

Household and the Chores learning slice use avatars as active-person identity,
but canonical Household people currently contain only a display name and kind.
A caregiver cannot add a recognizable photo for a dependent child, and
capability surfaces have no canonical way to distinguish a caregiver-managed
dependent image from a connected child's own Kwilt account image.

The first Chores screenshot exposed the symptom through Andrew's initials. The
caregiver avatar was repaired from the signed-in profile, but child photos
belong to Household Person identity rather than Chores.

## Target audience

`audience-aspirational-family-organizers` wants family participation to feel
recognizable and immediate without managing a workspace or completing a family
database.

## Representative persona

Maya has children with different levels of Kwilt participation. Some are
caregiver-managed dependents on a shared device; others may eventually have
their own connected Kwilt accounts. She wants each child to be recognizable
without making a photo required, public, or authoritative beyond presentation.

## Aspirational design challenge

How might we help Maya and her family recognize who is participating at a
glance, while keeping a child's photo private, optional, and separate from
account access or capability authority?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — recognizable, correctly attributed
family participation helps ordinary household work move without adding
administrative friction.

## Job flow step

Step 7 of `job-flow-maya-move-family-life-forward`, **Let family members
participate without turning life into admin**, is scored 3/5. Household and
capability foundations exist, but the roster and future shared-device identity
control do not yet provide durable, recognizable member presentation.

## JTBD framing

When Maya's family participates in Kwilt, she wants each child to be
recognizable at a glance so the right person can understand and enter their own
bounded experience. This serves `jtbd-invite-the-right-people-in` by preserving
the correct family identity boundary and `jtbd-trust-this-app-with-my-life` by
keeping photo ownership, visibility, removal, and authority explicit.

## Design

### Product decision

Choose one quiet Household Person detail as the only photo-management owner.

- **Settings → Household** presents a flat **Your family** roster with resolved
  avatar, name, role, and disclosure.
- Selecting a dependent child opens a focused child-detail page.
- An authorized caregiver may add, replace, or remove one optional dependent
  photo.
- A connected child's own Kwilt account photo takes precedence and exposes no
  caregiver mutation affordance.
- Chores and other Household-authorized surfaces consume the resolved avatar
  only after they consume canonical Household Person IDs.

### Source and precedence

The Household projection exposes:

```ts
type HouseholdAvatarSource = 'account' | 'dependent' | 'initials';

type HouseholdMemberAvatar = {
  avatarUrl: string | null;
  avatarSource: HouseholdAvatarSource;
};
```

Resolution order:

1. active auth-bound child's canonical account photo when present;
2. caregiver-managed dependent photo when present;
3. name-derived initials.

Consumers receive a display-ready authorized URL and source. They do not
receive the bound auth user ID, raw object path, provider metadata, or authority
to mutate the image.

An account photo is authoritative for presentation, not identity proof. Photo
source never changes role, membership, capability activation, grant,
authentication, performer, approver, or authorizer.

### Household roster

The **Your family** group contains member rows with:

- `ProfileAvatar` using the resolved URL or initials;
- member display name;
- role/participation label; and
- disclosure into member detail when allowed.

There is no missing-photo badge, roster completion count, reminder, or prompt.
Initials are a complete state.

### Child detail

The page hierarchy is:

1. large resolved avatar;
2. child display name;
3. one photo action or source sentence; and
4. only existing basic relationship facts already owned by Household.

For a dependent without a managed image, the action is **Add photo**.

For a dependent with a managed image, tapping the avatar/camera badge opens
**Update photo** with:

- **Take photo**
- **Choose from library**
- **Remove photo**

For a connected child, show:

> Photo comes from Charlie's Kwilt account.

Do not show a disabled button, lock badge, `verified`, `managed`, or permission
explanation.

### Media behavior

- Request camera/library permission only after the matching user action.
- Use the platform image picker, image-only selection, and simple square crop.
- Confirm the selected image before upload.
- Keep the previous image visible until replacement is server-confirmed.
- Cancellation changes nothing.
- Upload failure preserves the prior image or initials and offers retry.
- Removal is reversible and server-confirmed but does not require a destructive
  alert.
- Image delivery failure or expiry falls back to initials without deleting the
  canonical storage reference or entering a retry loop.

### Storage and server boundary

- Store managed child images in a dedicated private, image-only Supabase
  Storage bucket with bounded MIME types and file size.
- Use opaque Person-scoped object paths; do not use child names, email
  addresses, auth IDs, or Household names in paths.
- Store only the managed object reference on or beside `kwilt_people`.
- Do not store transient device file URIs or public child-image URLs.
- Authorize read, upload confirmation, replacement, and removal through the
  canonical Household Person contract. `authenticated` alone is not
  authorization.
- App roles receive no direct Storage policies. A server-side broker validates
  the caller, issues a short-lived one-use upload intent, signs delivery, and
  rechecks source/target authority before confirmation or removal.
- Server-side avatar resolution may read account presentation metadata but must
  never use user-editable metadata for authorization.
- Replacement, dependent deletion, Household removal, and account deletion
  each define object cleanup and fallback behavior.
- Removing a dependent from the Household revokes image projection immediately
  and schedules idempotent deletion of the caregiver-managed object. The first
  release retains no product grace period or recoverable photo archive.
- Application logs and analytics must not contain image bytes, filenames,
  signed URLs, raw object paths, child identifiers, or photo-presence state.

### Mutation authority

The first learning release may safely restrict dependent-photo mutation to the
active Household owner because current generic caregiver authority over
dependent identity is not explicit. Broadening this to a caregiver requires a
named dependent-profile management grant or an accepted role rule; it must not
be inferred from `role = caregiver` or from a capability-specific grant.

### Relationship to Chores

The current Chores learning slice contains local simulated Charlie and Olive
records. It must not receive Household photos by matching display names,
copying device URIs, or adding a Chores avatar store.

Chores may render the resolved Household avatar only after its member
projection uses canonical Household Person/membership IDs and authority. That
promotion is a separate implementation and verification gate.

### State matrix

| State | Avatar | Action / copy |
| --- | --- | --- |
| Dependent, no photo | Initials | Avatar/camera opens **Add photo** |
| Dependent, managed photo | Managed image | Avatar/camera opens **Update photo** |
| Connected, account photo | Account image | `Photo comes from <name>'s Kwilt account.` |
| Connected, no account photo, dependent fallback | Managed image | Account source boundary; no caregiver edit in this slice |
| No available image delivery | Initials | No error chrome; retry through ordinary refresh |
| Uploading replacement | Previous image | Busy state; prevent duplicate mutation |
| Upload failed | Previous image or initials | Concrete error and retry |
| Permission denied | Previous image or initials | Concrete Settings recovery path |
| Picker canceled | Previous image or initials | No change |

### Privacy and child-data boundaries

- Household membership makes the resolved roster image visible only within the
  accepted Household projection and capability-owned authorized consumers.
- The image is not public, discoverable, shareable, or available to Chat/AI.
- No face recognition, subject analysis, demographic inference, quality
  scoring, or moderation-based identity claim is performed.
- No product analytics records whether a child has a photo.
- Removing a member ends future Household projection immediately; asset
  retention/deletion follows the explicit child-data contract.

### Learning release

Release through a local iPhone 17 Pro Simulator build against the real
development Household backend after the migration and Storage policy are
available there. A device-local-only image does not count as proof. Development
schema/bucket changes require explicit deployment authorization.

See:

- [Frame](../design-explorations/household-member-photos/00-frame.md)
- [Divergence](../design-explorations/household-member-photos/02-diverge.md)
- [Convergence](../design-explorations/household-member-photos/03-converge.md)
- [Learning release](../design-explorations/household-member-photos/04-learning-release.md)
- [Evaluate learning](../design-explorations/household-member-photos/05-evaluate-learning.md)

## Success signal

Andrew can use a real development Household child to add, replace, remove, and
relaunch-persist one private image; the Household roster and child detail agree
on the resolved source; connected-account precedence is proven through the real
resolver; another Household cannot read or mutate the reference or object; and
failure, denial, cancellation, expiry, replacement, and cleanup preserve a
truthful prior image or initials without changing any authority.

The page must also pass visual and accessibility review as a calm identity
surface rather than profile-completion administration.

## Spec refinement

### Build-ready decisions

- Source owner: canonical Household Person projection.
- Chosen UI: one child-detail page from Household roster.
- Dependent creation remains name-first.
- Dependent image storage is private and server-backed.
- A signed-in person's chosen Kwilt account photo is also private and
  server-backed; the current device-local profile URI is only a temporary
  compatibility fallback during migration.
- Connected account photo precedes the dependent fallback.
- Initial mutation authority is Household owner only unless a separate
  caregiver identity-management rule is accepted.
- Initials are the complete fallback for absent, offline, or unavailable image
  delivery.
- Chores integration is excluded until canonical Household-member integration.

### Canonical account-photo dependency

Kwilt's current in-app profile photo mutation writes a device-local
`userProfile.avatarUrl`. That URI is not a durable server identity source and
cannot be resolved by another Household member or device. Provider metadata may
contain an avatar, but it does not necessarily represent the person's chosen
Kwilt photo.

This initiative promotes a signed-in person's chosen Kwilt photo to a private,
server-backed canonical account avatar. The Settings account-photo mutation
must use that contract, retain the prior image until confirmation, and refresh
the local profile cache from the confirmed server projection. Provider images
may remain a temporary presentation fallback when no canonical Kwilt account
photo exists, but provider-only behavior does not satisfy account-photo support.

Do not copy the child device's local URI, infer identity by name/email, or call
provider-only behavior complete account-photo support.

### Acceptance evidence

- Migration/SQL tests: active owner mutation, non-owner rejection, cross-
  Household isolation, connected-account precedence, replacement/removal,
  object cleanup, and revoked/default execution boundaries.
- Storage tests: private read/signing, insert, replacement, delete, MIME/size,
  and opaque-path rules.
- Client tests: strict snapshot parsing, source resolution, expired/missing URL
  fallback, and no raw identifier leakage.
- Screen tests: roster/detail states, add/change/remove, cancellation,
  permission denial, loading, retry, connected source copy, accessibility
  labels, and no caregiver edit for connected account photos.
- Runtime: real development Household, fresh Simulator capture, reload and
  relaunch persistence, smallest viewport, accessibility text sizing, and
  normal/degraded state evidence.
- Completion gate: `npm run verify:changed -- --run`, with backend and Simulator
  proof reported separately.

## Open questions

- None for the learning-release scope.
