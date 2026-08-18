# Learning Release: Household Member Photos

## Concept To Build

Let an authorized caregiver add one private, optional photo to a dependent
Household child from that child's detail, while connected children continue to
use the photo from their own Kwilt account.

## Capability Delta

Today, the user cannot:

- open an existing dependent child as a recognizable Household Person;
- add, replace, remove, and persist a private child photo;
- distinguish a caregiver-managed dependent image from a connected child's
  account-owned photo in the Household projection.

After this release, the user can:

- open a child from **Settings → Household**;
- add, replace, or remove one optional dependent photo;
- leave and relaunch the app and see the same resolved image in the Household
  roster and child detail;
- see a connected child's account photo take precedence without exposing a
  caregiver edit action; and
- fall back truthfully to the dependent image or initials when no account image
  is present.

Still intentionally not supported:

- editing a connected child's account photo from Household Settings;
- public child images, recognition, discovery, AI analysis, or photo history;
- using a photo as authentication, consent, membership, or authority;
- showing dependent photos in the current Chores learning slice before Chores
  reads canonical Household members.

## User Experience

**Settings → Household** presents a flat **Your family** group with a resolved
avatar, name, and role for each member. Selecting a dependent child opens a
quiet detail page led by the child's avatar and name.

If the dependent has no managed image, **Add photo** opens **Update photo** with
**Take photo** and **Choose from library**. A managed image adds **Remove
photo**. Permission is requested only after choosing the matching action. The
picker is image-only with a simple square crop.

The previous image remains visible during replacement. Cancellation changes
nothing. A failed upload keeps the previous image and offers retry. Successful
save or removal updates the detail and Household roster from the server-backed
snapshot.

For a connected child, the detail shows the resolved account image and the
sentence:

> Photo comes from Charlie's Kwilt account.

No disabled edit control, lock badge, setup reminder, or completion language
appears.

## Existing Product Relationship

This enhances the existing Household roster and canonical `kwilt_people` /
auth-binding projection. It reuses `ProfileAvatar`, the existing account-photo
picker anatomy, Settings patterns, and the Household server command boundary.

It deliberately leaves dependent creation name-first. It does not introduce a
new People system, a profile-completion flow, or capability-owned avatar state.

The current Chores learning slice remains unchanged for child photos because
its Charlie and Olive records are local simulated members, not canonical
Household people. Chores becomes a consumer only when its member projection is
backed by real Household IDs. Binding images by display name, copying a local
URI into Chores, or adding a second Chores avatar store would create false
integration and is prohibited.

## Buildable Slice

Must be real:

- an additive canonical dependent-photo storage reference;
- a private image-only Supabase Storage bucket with bounded MIME types and file
  size;
- Household-owner-authorized upload confirmation, replacement, and removal
  commands with explicit cleanup behavior;
- a Household snapshot projection that resolves account photo, dependent
  photo, or initials source without exposing auth IDs or raw storage paths;
- typed `HouseholdMember.avatarUrl` and `avatarSource` client parsing;
- a real Household roster row and dependent child-detail route;
- image selection, square crop, loading, cancellation, permission-denied,
  replacement, removal, upload-failure, expired-image, and initials fallback
  states;
- server/domain tests for ownership, connected-account precedence, isolation
  across Households, object cleanup, and unauthorized mutation;
- focused screen tests plus relaunch persistence proof against the development
  backend.

Can be thin or temporary:

- the detail owns only avatar and existing basic identity facts;
- the first build may authorize only the current Household owner if caregiver
  dependent-profile authority is not yet explicit enough to grant safely;
- a developer-only fixture may exercise connected-account precedence, but it
  must use the same server resolver as production and be labeled fixture proof;
- initials remain the offline and expired-delivery fallback rather than adding
  a persistent image cache in the first slice.

Intentionally excluded:

- Chores/member-switcher integration before canonical Household membership;
- photo during child creation;
- birthdays, addresses, Contacts, food needs, gifts, capability grants, member
  codes, or devices on the child detail;
- bulk photo setup, prompts, notifications, badges, completion percentages, or
  analytics about which children lack photos;
- multiple images, captions, filters, generated avatars, face cropping, or
  automatic subject detection.

## Release Channel

**Local build** on Andrew's current iPhone 17 Pro Simulator, using the real
development Household backend only after the migration and Storage policies are
available there.

This is not a production or TestFlight claim. A local UI backed only by device
files would not count. Deployment of the schema, bucket, or policies beyond the
development project requires separate authorization.

## Brand-Goodwill Guardrails

- Never imply a photo is missing work or required setup.
- Never call an account photo `verified`.
- Never expose a caregiver edit action for a connected child's account image.
- Keep permission and failure copy concrete: what was unavailable and what the
  user can do next.
- Preserve the existing photo or initials through every failed or canceled
  state.
- Do not log image bytes, signed URLs, raw storage paths, or photo-presence
  analytics.

## Reversibility

The database change is additive and nullable. Existing Household snapshots and
clients continue to render initials when avatar fields are absent. The new
route and row affordance can be hidden without deleting membership or
capability data.

Managed objects use a dedicated private bucket and Person-scoped references so
they can be enumerated and deleted independently. Removing the feature requires
first deleting or exporting managed objects according to the child-data
retention contract, then dropping the nullable reference later; rollback must
not orphan private child images.

No Chores schema or local learning record is changed by this release, so the
feature does not create a rollback dependency there.

## Permanent Product Threshold

Promote Household member photos only after Andrew can:

1. use a real development Household child rather than a local-only person;
2. add, replace, remove, and relaunch-persist that child's image;
3. observe correct Household isolation and unauthorized-write rejection;
4. exercise permission denial, cancellation, upload failure, offline/expired
   image delivery, and cleanup without losing the prior state;
5. prove connected-account precedence through the real resolver; and
6. confirm the child detail remains calm and useful without absorbing broader
   People administration.

Chores promotion remains a separate gate: Chores must first consume canonical
Household member IDs and authorization. Only then may the same resolved avatar
appear there, with no copying or name-based linkage.

## Current implementation evidence

Source implementation now includes the private bucket/schema, separate
account-owned and dependent-managed references, one-use upload intents, the
authenticated media broker, strict mobile parsing, the Household roster and
member detail, and canonical signed-in Settings photo mutation. Focused Jest,
Deno policy tests, Edge Function type-check, and app TypeScript pass.

This is not yet runtime or backend proof. Local SQL execution is unavailable
while Docker is stopped, and the development migration/function have not been
deployed. Simulator capture, real Household persistence, isolation, cleanup,
and relaunch evidence therefore remain promotion gates.
