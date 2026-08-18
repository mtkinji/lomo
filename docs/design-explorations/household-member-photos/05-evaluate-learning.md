# Evaluate Learning: Household Member Photos

## Learning questions

### Desire and timing

- When Andrew opens a real child from Household Settings, does **Add photo**
  feel like a useful identity action or like unnecessary profile setup?
- Is Household Settings a natural place to look when a child's initials appear
  elsewhere?
- Does the value become apparent from the updated roster without a success
  message, prompt, or tour?

### Comprehension and trust

- Is it clear that the image helps recognize a Household Person but does not
  change membership, capability access, authentication, or Screen Time?
- Does **Photo comes from Charlie's Kwilt account** clearly explain why a
  caregiver cannot edit a connected child's image here?
- After replacement, removal, permission denial, or failure, can Andrew predict
  which image or initials will remain?
- Does the sparse child detail feel intentionally focused rather than visibly
  unfinished?

### Technical feasibility

- Can a private dependent image be uploaded, replaced, removed, and resolved
  without exposing a public object URL, auth user ID, or raw storage path?
- Do Household isolation and mutation authority hold for both database
  references and Storage objects?
- Does connected-account precedence resolve on the server and remain consistent
  across clients and relaunches?
- Can expired or unavailable image delivery fall back to initials without
  corrupting the stored reference or entering a retry loop?
- Do replacement, removal, dependent deletion, and Household removal clean up
  private objects according to the retention contract?

### System fit

- Can `HouseholdMember.avatarUrl` and `avatarSource` remain one canonical
  consumer contract rather than leaking storage/auth resolution into screens?
- Does the change stay isolated from Chores until Chores owns real Household
  IDs?
- Does the implementation avoid creating a third Person, avatar, or media
  authority?

## Evidence plan

### Supporting evidence

The bet is supported when all of the following are observed:

1. Andrew finds an existing child from **Settings → Household** and adds a
   photo without instruction.
2. The same resolved image appears in the Household roster after leaving,
   relaunching, and refreshing.
3. Three consecutive add/replace/remove cycles preserve the correct previous
   state through cancellation and injected upload failure.
4. Camera denial and library denial each leave a usable page and provide a
   concrete recovery path.
5. A real or server-backed connected-child fixture changes the source to
   `account`, uses the account photo when present, hides caregiver mutation,
   and falls back according to the accepted precedence rule when absent.
6. SQL/integration tests prove that another Household cannot read, sign, write,
   replace, or delete the child's object or reference.
7. Deletion and replacement leave no orphaned object in the test bucket.
8. Andrew describes the surface as “Charlie’s photo” rather than “a Chores
   photo,” “a Screen Time profile,” or “a verified identity.”

### Disconfirming evidence

The bet is weakened when any of these occur:

- Andrew looks first in Chores or the member switcher and cannot find a path to
  manage the photo from Household.
- The child detail reads as an incomplete profile that now demands more fields.
- A connected child appears caregiver-editable or the ownership sentence needs
  additional permissions explanation.
- Upload or signed-delivery behavior frequently flashes, drops to initials, or
  loses the previous image during an ordinary good-network path.
- A photo mutation broadens role, membership, grant, or capability access.
- The implementation needs display-name matching, client-side auth inspection,
  public URLs, or capability-local avatar copies to work.
- Private child objects remain after the corresponding dependent Person is
  deleted contrary to the retention contract.

## Instrumentation

### Required

- Focused domain/client tests for precedence and parsing.
- Migration and SQL authorization tests covering Household isolation,
  connected-account ownership, mutations, and cleanup.
- Storage-policy tests for read, insert, replacement, and deletion boundaries.
- Screen tests for initials, dependent image, account image, add, replace,
  remove, permission denial, cancellation, loading, and failure.
- Development logs limited to operation stage, coarse result, and non-sensitive
  error code during local verification.
- Manual iPhone 17 Pro Simulator notes for discovery, hierarchy, permission
  prompts, crop, reload persistence, and degraded states.
- A final object-list check in the development bucket after replacement and
  deletion scenarios.

### Deliberately not collected

- Image bytes, thumbnails, signed URLs, storage paths, filenames, or EXIF data
  in analytics or application logs.
- Child name, age, membership ID, auth ID, Household ID, or which child has or
  lacks a photo in analytics.
- Photo-presence rate, roster-completion percentage, time-to-complete-profile,
  or prompts intended to increase image coverage.
- Face, expression, demographic, quality, safety, or content classification.
- Chores completion, Screen Time, behavior, or performance correlation with
  whether a child has a photo.

For the Andrew-only local release, product analytics are unnecessary. Manual
observation plus technical evidence are sufficient and create less privacy
risk.

## Brand-goodwill evidence

Goodwill is protected when:

- no child or caregiver is interrupted because a photo is absent;
- initials remain a complete, dignified state;
- the surface uses direct copy and no `finish setup` language;
- failures preserve the prior image or initials and do not imply lost
  Household data;
- connected-account ownership is clear without a lock, warning, or blame; and
- the page remains visually calm at the smallest supported viewport and with
  accessibility text sizing.

Goodwill is weakened if the product frames family recognizability as profile
completion, repeatedly asks for Photos access, or makes a caregiver feel that
every child must be documented before the Household is usable.

## Decision rule

### Proceed to permanent Household capability

Proceed when:

- every authorization, isolation, precedence, cleanup, and persistence check
  passes;
- the normal and degraded UI states pass Simulator visual/accessibility review;
- Andrew can find and complete the action without instruction;
- the connected-account boundary is understood from the single source sentence;
  and
- no second avatar store, public URL, display-name linkage, or capability-local
  resolver was introduced.

### Simplify or revise

- If editing is hard to find, first add a quiet optional action immediately
  after successful dependent creation that routes to the same child detail.
- If the detail feels too sparse, improve its identity hierarchy or fold it
  into the future accepted People destination; do not fill it with unrelated
  fields.
- If signed delivery is visually unstable, revise the authorized delivery/cache
  contract before adding consumers.
- If connected ownership is confusing, revise the source presentation before
  adding permissions copy or disabled controls.

### Stop or reframe

Stop the release if private object isolation, cleanup, server-side precedence,
or correct connected-child ownership cannot be guaranteed within the canonical
Household Person model. Do not ship a device-local or public-URL substitute.

## Expected next action

After the local proof, either:

1. promote the Household photo capability and separately plan canonical Chores
   Household-member integration;
2. revise discovery, delivery, or ownership presentation and rerun the same
   evidence set; or
3. retain initials and remove the learning surface if the photo creates more
   administration or privacy complexity than recognizable value.

## Evidence captured so far

- Source/type proof: app TypeScript, focused Household/account Jest suites,
  migration contract tests, and the Deno avatar policy pass.
- Security refinement: upload confirmation is bound to a short-lived one-use
  intent, so a path observed inside a signed URL cannot be adopted as another
  person's canonical photo.
- Not yet captured: local SQL execution, deployed development backend,
  cross-Household runtime attempts, object-list cleanup, or Simulator visual
  and relaunch proof.
