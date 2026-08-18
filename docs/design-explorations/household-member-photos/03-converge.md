# Converge: Household Member Photos

## Decision

Choose **One Quiet Person Detail**.

Household Settings will expose a recognizable row for each member. Selecting a
dependent child opens one restrained child-detail page where an authorized
caregiver can add, change, or remove that child's optional photo. Connected
children display the photo resolved from their own Kwilt account and do not
expose caregiver photo controls.

Chores, the active-member switcher, and later Household-authorized capability
surfaces consume the resolved Household Person avatar. They do not own image
selection, storage, precedence, or editing.

## Qualitative scoring

| Criterion | A: During setup | B: Person detail | C: Contextual edit |
| --- | --- | --- | --- |
| Maya / family-organizer fit | High | High | Medium-high |
| Existing-child support | Medium | High | High |
| Household system fit | Medium | High | Low-medium |
| Connected-account ownership clarity | Medium | High | Medium |
| Child-facing calm | High | High | Low-medium |
| Discoverability | High for new children | High | High |
| Implementation blast radius | Medium | Medium | Medium-high |
| Privacy / authority risk | Medium | Low | High |
| Future People compatibility | Medium | High | Low |

Alternative B wins because it gives identity one stable owner and keeps
caregiver administration out of the compact, child-facing switcher.

## Capability delta

### Today, the user cannot

- Add a recognizable image to a dependent Household child.
- Revisit a child after creation to manage their identity photo.
- Let Chores or Household Mode resolve a child avatar from canonical Household
  identity.
- Distinguish a caregiver-managed dependent image from a connected child's own
  account photo.

### After this concept ships

- Maya can open Charlie from **Settings → Household**, add one optional photo,
  and see it anywhere Charlie's Household identity is already authorized.
- Maya can replace or remove a dependent photo without changing membership,
  capabilities, or content access.
- When Charlie connects a Kwilt account, Charlie's own Kwilt photo takes
  precedence automatically.
- Every consumer receives one resolved avatar plus its source rather than
  inventing its own precedence rules.

### Still intentionally not possible

- Requiring a photo to create, select, or activate a child.
- Editing a connected child's account photo from caregiver Household Settings.
- Treating a face as identity proof, authentication, consent, membership, or
  capability authority.
- Publishing a child image or using it in discovery, AI interpretation, or
  face recognition.
- Editing avatars from Chores, Screen Time, Games, Meals, or the member
  switcher.

## Chosen experience

### Household roster

**Settings → Household** gains a flat **Your family** group containing member
rows with:

- resolved avatar or initials;
- display name;
- role or participation label;
- disclosure indicator when the current adult may inspect that member.

The roster is not a completion surface. It has no missing-photo badge,
progress, `2 of 7 set up`, or reminder.

### Child detail

Selecting a dependent child opens a page with this hierarchy:

1. large avatar and child name;
2. one photo action or truthful source state;
3. existing relationship/participation context only when it already belongs to
   Household.

Three-second read: **this is Charlie; this is the photo Household currently
uses**.

For a dependent without a managed image:

```text
              [ C ]
              Charlie

             Add photo
```

For a dependent with a managed image, tapping the avatar or camera badge opens
**Update photo** with:

- **Take photo**
- **Choose from library**
- **Remove photo**

For a connected child:

```text
             [ photo ]
              Charlie

Photo comes from Charlie's Kwilt account.
```

No disabled caregiver edit button appears. The short source sentence explains
the boundary more clearly than a lock icon, `managed` badge, or permissions
copy.

### Capture behavior

- Request camera or photo-library permission only after the matching action.
- Denial keeps the detail usable and points to Settings in concrete language.
- The picker is image-only and offers a square crop.
- Upload starts only after the user confirms the chosen image.
- Keep the previous avatar visible while replacing it.
- Close the update drawer only after the server confirms the new reference.
- A canceled picker changes nothing.
- A failed upload preserves the previous image and offers a quiet retry.
- Removing a managed image returns immediately to initials after server
  confirmation; it does not require a destructive alert.

## Resolved-avatar contract

The Household API projects:

- `avatarUrl: string | null` — authorized, display-ready resolved image;
- `avatarSource: 'account' | 'dependent' | 'initials'` — truthful ownership;
  and
- no underlying auth user ID or raw storage path to ordinary consumers.

Resolution order:

1. active auth-bound child's own account photo when present;
2. caregiver-managed dependent photo when present;
3. initials.

Account profile metadata contributes presentation only. It must never be used
as a role, membership, or authorization claim. A connected child with an
account photo exposes no caregiver mutation affordance. Capability consumers
render the projected result and do not inspect auth binding themselves.

## System implications

- Add a private dependent-photo storage reference on or beside canonical
  `kwilt_people`; do not store transient local URIs or public child-image URLs.
- Add server-authorized commands for dependent upload confirmation and removal.
- Keep read/mutation scope inside active Household membership plus explicit
  dependent-profile authority. `authenticated` alone is not authorization.
- Extend `get_kwilt_household_snapshot` or a narrow companion projection with
  resolved avatar data and ownership source.
- Add a private, image-only Storage bucket with bounded MIME types and file
  size; object policies and server commands must cover replacement and cleanup.
- Define cleanup for replacement, dependent deletion, Household removal, and
  account deletion.
- Extend client `HouseholdMember` once; reuse `ProfileAvatar` throughout.
- Preserve initials as the offline, expired-URL, and load-failure fallback.

## Reductive design decisions

- Enhance Household Settings; do not create an Avatar capability.
- Keep **Create a child profile** name-first; do not add photo setup yet.
- Add one member-detail identity job; do not pull birthdays, addresses, food
  needs, contacts, gifts, grants, or devices into this release.
- Do not add photo-edit affordances to Chores or the active-member switcher.
- Do not add missing-photo badges, prompts, notifications, setup progress, or
  recurring education.
- Do not add a crop editor beyond the platform image picker's simple square
  crop.
- Do not retain multiple photos, history, reactions, captions, or AI-generated
  alternatives.
- Do not label a connected account photo `verified`; it is authoritative for
  presentation, not proof of the person's physical identity.

## Activation path

The feature activates naturally when Maya opens **Settings → Household** to add
or manage a child. A recognizable roster row makes the destination legible;
the child detail exposes **Add photo** only after she chooses that person.

The first visible payoff occurs when Maya returns to Chores or the Household
member switcher and sees Charlie's image without further setup. No tour or
success message is required.

If later evidence shows that most photos are added immediately after child
creation, **Add photo** may become an optional post-create shortcut. It should
still route through the same Person contract and never block creation.

## Accepted trade-offs

- Adding a photo takes one deliberate trip into child detail rather than being
  offered during creation.
- The first detail page may be intentionally sparse because it owns only
  identity, not every future Person field.
- Connected children must change their account photo from their own account.
- Short-lived avatar delivery may briefly fall back to initials when offline or
  expired.

## Rejected trade-offs

- Faster setup at the cost of making child creation depend on media handling.
- Contextual editing that places caregiver authority in child-facing chrome.
- Public object URLs for simpler rendering.
- Copying account photos into Household storage and creating stale snapshots.
- Letting each capability resolve account versus dependent identity itself.

## Stated bet

We're betting that one optional photo, managed from a calm Household Person
detail and reused everywhere attribution already matters, will make family
participation feel immediately more recognizable without increasing perceived
administration or weakening child privacy.

If people cannot find photo editing, rarely revisit Household after setup, or
interpret the detail as an incomplete profile they must finish, we will test an
optional post-create shortcut before adding prompts or switcher controls.

## Success signal

For the first accepted slice, Andrew can:

1. open an existing dependent child from Household Settings;
2. add, replace, remove, and persist that child's photo;
3. see the same resolved photo in the Household roster and Chores member
   switcher;
4. connect or simulate connecting the child to an account and observe the
   account photo take precedence; and
5. confirm that cancellation, permission denial, upload failure, offline image
   failure, and photo removal all return to a truthful previous image or
   initials without changing membership or capability authority.
