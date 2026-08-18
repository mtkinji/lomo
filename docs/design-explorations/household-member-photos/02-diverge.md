# Diverge: Household Member Photos

## Fixed frame

Help Maya and her family recognize who is participating at a glance, while
keeping a child's photo private, optional, and separate from account access or
capability authority.

## Axis of variation

**When and where photo management activates:** during child creation, from one
durable Person home, or contextually where a missing avatar is first noticed.

Every alternative keeps the same precedence rule:

1. a connected child's own Kwilt account photo;
2. a caregiver-managed dependent photo when no connected account photo exists;
3. the existing name-derived initials fallback.

The resolved source should be explicit in the Household projection rather than
reimplemented by each capability.

## Alternative A: Photo During Child Setup

After entering the child's name in **Create a child profile**, Maya sees one
optional **Add photo** action before completing setup. She may take a photo,
choose one, or continue with initials. Existing children gain a matching edit
action in Household Settings. Once an account is connected, the setup photo is
shown only when that account has no photo.

### Audience and persona fit

Strong for Maya when she is already deliberately adding her family and has the
right photo nearby. It makes the new child immediately recognizable.

### Design-challenge answer

Recognition begins at the same moment as person creation, without requiring a
separate cleanup pass.

### System fit

Constraint posture: `Extend the system`.

- Existing surface changed: dependent-child creation form.
- Domain change: the Person must be created before its private asset can be
  stored, or the flow needs careful temporary-upload cleanup.
- Connected account precedence stays server-resolved.
- The four-object model is untouched; this is Household identity metadata.
- Capture-first passes because **Add child** never depends on choosing a photo.

### Best when

- Most dependent children are added once by a caregiver who already wants to
  personalize the roster.
- The flow can create the person first and treat image upload as an optional
  second mutation without leaving the user stuck.

### Fails when

- Existing children are the main problem; setup-time affordance does not help
  Maya discover how to update them.
- Camera/library permission or upload failure makes the essential **Add child**
  act feel unreliable.
- The extra choice turns a simple name form into profile administration.

### Primer anti-pattern check

Passes only if the photo is visually secondary, optional, and never presented
as profile completion. No progress meter, missing-photo badge, or repeated
prompt is allowed.

## Alternative B: One Quiet Person Detail

Household Settings renders each child as a recognizable row. Tapping a child
opens one restrained person-detail surface with the large avatar, name,
relationship/participation facts already owned by Household, and **Add photo**,
**Change photo**, or **Remove photo**. Creating a child remains name-first and
fast. A connected child's detail shows their account photo with the status
**Managed by their Kwilt account** instead of caregiver photo controls.

### Audience and persona fit

Strongest for Maya because it gives every existing or future child one obvious,
revisitable home without making photo setup part of ordinary household work.

### Design-challenge answer

Recognition becomes a durable Household Person capability. Attribution-sensitive
surfaces consume it without owning editing or authority.

### System fit

Constraint posture: `Extend the system`.

- Existing surface changed: Household roster rows become disclosures into one
  member detail.
- Existing component reused: the account-photo drawer pattern can provide
  **Take photo**, **Choose from library**, and **Remove photo**.
- Domain extension: a dependent-photo storage reference and resolved avatar
  projection are added to the canonical Person path.
- The future Settings → People direction can later absorb this detail without
  changing its identity contract.
- The four-object model is untouched; capture-first passes because neither
  adding a child nor using Chores requires a photo.

### Best when

- The product needs one stable place to correct identity details and explain
  connected-account ownership.
- Chores, Household Mode, Meals, Games, and Screen Time should all consume the
  same recognizable Person projection.

### Fails when

- Household Settings remains organized only around capability toggles and does
  not make member rows visibly tappable.
- The detail absorbs birthdays, addresses, food needs, grants, devices, and
  every other future Person idea before those jobs are ready.

### Primer anti-pattern check

Passes. It is calm, user-driven, non-gamified, and does not create a dashboard.
The reductive guardrail is one identity-editing job; capability policy stays in
its existing sections.

## Alternative C: Fix It Where You Notice It

When a caregiver sees initials in the active-member switcher or Chores member
drawer, a small edit affordance beside a dependent child opens the photo picker.
Connected children show their account image without an edit action. In
Household Mode, the edit affordance remains hidden until the caregiver exits
through fresh local authentication.

### Audience and persona fit

Strong for immediate discoverability: Maya can repair the missing image at the
moment she notices it rather than remembering a Settings path.

### Design-challenge answer

The system turns visible identity friction into its own contextual activation
moment.

### System fit

Constraint posture: `Bend the system`.

- Existing attribution surfaces gain an identity-management affordance.
- Capability and active-member chrome must route into caregiver-only Household
  management without pretending the current child actor has that authority.
- Chores must not store or upload the image itself.
- The four-object model is untouched; capture-first passes only if the prompt
  never blocks switching or completing work.

### Best when

- Users rarely visit Household Settings after setup and the missing avatar is
  most salient during shared-device switching.
- The app can make the caregiver-auth transition feel clear and proportionate.

### Fails when

- Editing controls clutter the compact member switcher.
- A child sees a caregiver-only action or is bounced into authentication during
  ordinary participation.
- Multiple capabilities start inventing their own routes into Person editing.

### Primer anti-pattern check

Needs repair. An unsolicited missing-photo prompt would violate the calm UX bar
and resemble setup-completion pressure. The only acceptable version is a quiet,
caregiver-only edit action with no badge, nudge, or reminder.

## Shared data and privacy contract

Regardless of interaction choice, a production implementation should avoid a
public child-image URL and avoid storing transient device file URIs in the
canonical Person row.

- Store the caregiver-managed image in a private, image-only Supabase Storage
  bucket with a small file-size limit and an opaque Person-scoped path.
- Store only the storage reference on or beside `kwilt_people`.
- Authorize upload, replacement, and removal through the Household Person
  authority contract; bucket membership alone is not authorization.
- Replacement/upsert policies must account for `INSERT`, `SELECT`, and
  `UPDATE`; removal needs explicit delete authority.
- Project a short-lived resolved URL or fetch contract to authorized Household
  consumers. Do not expose another member's auth user ID.
- Resolve connected-account photo precedence server-side. Account profile
  metadata is presentation input, never an authorization claim.
- On replacement/removal, clean up old objects and keep initials as the durable
  failure state.
- Account deletion, Household removal, and dependent-profile deletion must each
  define whether the managed asset is deleted or merely loses projection.

## Divergence summary

| Alternative | Recognition speed | Existing-child support | System clarity | Admin pressure | Privacy/authority risk |
| --- | --- | --- | --- | --- | --- |
| A: Photo During Child Setup | High for new children | Medium | Medium | Medium | Medium |
| B: One Quiet Person Detail | Medium | High | High | Low | Low |
| C: Fix It Where You Notice It | High | High | Low-medium | Low if silent | High |

Alternative B is the strongest system fit going into convergence. Alternative
A offers a useful optional shortcut later; Alternative C is valuable as an
activation insight but should not put editing controls into child-facing
switchers.
