# Learning Release: One Shared Meal Cart

## Concept To Build

Turn the existing Plan count and drawer into one household-private shared meal
cart where eligible members can add meal possibilities, show named positive
support, and let the organizer settle the next meals without opening a separate
family-choice workflow.

## Capability Delta

Today, the household cannot:

- see and contribute to one live candidate set together;
- add a meal directly from Meals or Recipe Home and know that the organizer will
  see it in the active plan;
- show lightweight, household-visible support on an individual meal; or
- move from shared contribution to a settled plan without an organizer-created,
  frozen choice round and separate finalization flow.

After this release, the household can:

- open the same current cart from the existing top-right Plan affordance;
- add catalog meals and plain meal ideas from any eligible activated account;
- see who added each meal;
- add or remove one named **Sounds good** reaction per person and meal;
- watch additions and reactions appear across two signed-in accounts;
- let the organizer select a subset in the expanded drawer and settle it as the
  next meals; and
- compile Groceries from the settled plan without exposing contributor or
  reaction data to Groceries.

Still intentionally not supported:

- negative reactions, vetoes, comments, reminders, rankings, or winners;
- private Recipe sharing through the cart unless the Recipe is already
  household-visible under an existing explicit grant;
- automatic meal selection or recommendation from reaction history;
- non-organizer settlement, grocery compilation, Money changes, or retailer
  actions;
- calendar scheduling, trip-target setup, pantry review, or optimization inside
  the cart; and
- migration of historical private choice responses into visible reactions.

## User Experience

### Add from where appetite begins

Sam browses Meals or opens Recipe Home and taps the existing `+` control. The
meal enters the household's active cart immediately. The control changes to its
selected state and the top-right count increases. The drawer stays closed; that
count is the durable confirmation and entry point. No horizon or
family-invitation form appears.

If there is no active draft cart, the first addition creates one with an open
horizon. The cart belongs to the household food cycle; Sam does not become its
organizer merely by making the first contribution. Organizer ownership resolves
from the household's eligible owner/caregiver policy and is shown plainly when
needed.

### See the shared cart

Any eligible household member taps the top-right Plan affordance and opens the
full drawer. The list remains in insertion order. Each meal row contains:

- artwork;
- meal title;
- `Added by <name>`;
- compact reaction avatars or `You + N`;
- a reversible **Sounds good** control; and
- removal only when the viewer is the contributor or organizer.

The contributor's own support is implicit and visible. They do not need to add
the meal and then react to it separately.

The first non-organizer contribution may reveal one quiet explanation:

> Everyone in this Meal Plan can add ideas. Maya makes the final choice.

### React without voting ceremony

Riley taps **Sounds good** on Sam's meal. Her avatar appears on that row for the
household. Tapping again removes only Riley's reaction. The list does not reorder,
the count in the top-right affordance does not change, and no winner or completion
state appears.

### Settle the next meals

Only Maya sees the quiet neutral **Choose next meals** continuation. Tapping it
keeps the drawer open and adds selection controls to every meal row. Nothing is
preselected from support counts. Authorship and reactions stay visible while she
selects.

After selecting at least one meal, Maya taps the charcoal **Use these meals**
commitment action. Kwilt creates
one settled immutable plan version. If every selected meal uses the household's
ordinary diners and default servings, settlement completes inside the drawer.
Only a real exception opens a focused resolution sheet for that meal.

After settlement, the primary action becomes **Make grocery list**. Unselected
ideas remain in the open cart for the next decision. Maya can clear individual
ideas; the release does not add automatic expiry or another status.

## Existing Product Relationship

Enhances:

- the top-right Plan affordance;
- the existing 88-percent Plan drawer, opened only from the top-right affordance;
- one-tap add/remove behavior in Meals and Recipe Home;
- Meal Plan candidate provenance and immutable settled versions;
- household identity, child capability activation, and Realtime infrastructure;
- organizer-owned grocery compilation.

Replaces in the primary path:

- **Ask the family**;
- frozen candidate choice rounds;
- the separate participant response surface;
- aggregate review as a required step;
- **Review Meal Plan** as a generic handoff; and
- the ordinary case of the generic Finalize Meals screen.

Leaves intact:

- historical choice-round records and read paths;
- Recipe ownership, provenance, and explicit grants;
- grocery compilation, provenance, Already Have, list review, and retailer
  boundaries;
- exceptional diner and serving resolution; and
- finalized-plan revision and stale-grocery recovery.

## Buildable Slice

### Must be real

#### Data and authority

- One active shared cart per household food cycle.
- Household-readable cart projection limited to eligible active members.
- Child access requires active Meal Planning capability activation.
- Actor-aware append, contributor withdrawal, organizer removal, and organizer
  settlement operations.
- One unique positive reaction per person and candidate.
- Named reaction projection visible only to eligible members of that cart's
  household.
- Optimistic concurrency or idempotency that prevents duplicate candidates and
  duplicate reactions during retries.
- Server-enforced organizer-only settlement and grocery authority.
- Immutable settlement snapshot that excludes reaction records from Groceries.
- Realtime invalidation for candidate and reaction changes.
- Security tests proving unrelated household members, anonymous users,
  deactivated children, and removed members cannot read or mutate the cart.

#### UI and interaction

- Existing top-right count remains synchronized with the shared projection and
  opens the complete drawer; adding never exposes a partial sheet.
- Full drawer renders contributor and reactions for catalog meals and plain
  meal ideas.
- Eligible members can add, withdraw their contribution, and toggle their own
  reaction.
- Organizer can remove any unsettled candidate.
- Organizer-only selection mode and **Use these meals** action.
- Non-organizers see settled outcome but never organizer controls.
- Clear pending, retry, stale-version, removed-membership, and offline copy.
- Accessibility labels distinguish adding a meal, reacting, withdrawing a
  contribution, removing as organizer, selecting for settlement, and inspecting
  named support.

#### End-to-end proof

- Two permanent signed-in accounts in the same household see one cart.
- Account A adds a meal; Account B receives it without relaunching.
- Account B reacts and adds another meal; Account A receives both changes.
- Both accounts can change only their own reaction.
- Contributor withdrawal and organizer removal follow the declared authority.
- Maya settles a subset; the other account sees the settled result.
- Groceries compiles only the selected meals and receives no reaction or private
  participant data.
- Relaunch on both accounts restores the same authoritative state.

### Can be thin or temporary

- Use initials in existing avatar primitives if household profile images are not
  already available.
- Support the bundled catalog, already household-visible Recipes, and plain meal
  notes; defer new Recipe-grant UI.
- Use existing Supabase Realtime invalidation followed by authoritative reload
  rather than introducing collaborative local CRDT state.
- Keep insertion order fixed; no drag reorder or household sorting.
- Preserve existing Finalize Meals as an exception fallback while ordinary
  settlement moves into the drawer.
- Keep legacy choice-round routes callable for historical records while removing
  their entry from the primary cart.

### Intentionally excluded

- Downvotes, vetoes, ranked choice, vote totals as the primary visual, or
  automatic selection.
- Comments, emoji menus, mentions, feeds, and per-change notifications.
- A `Considering` versus `Next up` lifecycle.
- Household recommendation learning or AI-prepared overlap summaries.
- Automatic cart cleanup, expiry, cadence, or recurring reminders.
- Budget, pantry, price, sale, and retailer evidence inside the cart.
- Simultaneous editing of servings, dates, and diners on every row.
- Broad access to another person's private Recipe library.

## Required States

- no active cart;
- first contribution creates the cart;
- one and many candidates;
- contributor viewing their own addition;
- another eligible member viewing and reacting;
- concurrent duplicate add or reaction retry;
- contributor withdrawal;
- organizer removal;
- non-organizer removal denied;
- organizer selection mode with zero, one, and many selected meals;
- ordinary settlement;
- settlement requiring one contextual diner or serving exception;
- settled plan with remaining unselected candidates;
- Realtime reconnect and authoritative refresh;
- cached read while offline with mutations disabled or honestly queued according
  to proven authority; and
- membership or child activation revoked while the drawer is open.

## Release Channel

**Production-hidden** for the Supabase authority layer, paired with a local app
build for the first UI and household proof.

The migration, tables, RLS policies, authenticated RPCs, grants, and Realtime
publication ship to Kwilt's production Supabase project. Existing released app
binaries do not call the new RPCs or render the shared-cart projection, so the
product remains invisible until a later app release. The branch's local app build
uses the production authority only after schema probes, advisors, and anonymous
denial checks pass.

This channel proves the production database shape without presenting unfinished
UI to households. A single-account mock or component preview still cannot
validate the concept. TestFlight remains gated on two-account source/runtime
proof.

The local proof must identify the source checkout, branch, commit, dirty state,
installed development-client build, Metro owner and port, production project
reference, migration version, and both account roles. Production schema proof,
Simulator proof, signed-device proof, and TestFlight proof remain distinct.

## Brand-Goodwill Guardrails

- Existing released binaries have no entry point to the new production RPCs or
  projection.
- Production authorization is household-scoped and does not rely on a hidden
  client flag for security.
- No production household data or historical private choice response becomes
  visible through the experiment.
- The UI says **Sounds good**, never **Vote**, **Winner**, or **Most popular**.
- The organizer boundary is visible before any participant expects their
  reaction to commit dinner.
- No notification is sent for additions or reactions in the learning release.
- Failed or stale mutations explain that the cart did not change; the interface
  never displays an optimistic success it cannot reconcile.
- Removing the feature leaves Recipes, settled plan versions, and Groceries
  usable.

## Reversibility

- Add new cart contribution and reaction operations without deleting legacy
  choice-round tables or history.
- Keep the production RPCs additive and unreachable from existing released UI;
  authorization remains real rather than depending on a client-side feature
  flag.
- Keep reaction records capability-local and disposable; no other capability
  depends on them.
- Keep Groceries dependent only on the immutable settled plan contract.
- The UI can return to organizer-only candidates and the legacy choice-round
  flow without migrating reaction data.
- Database rollback disables new RPC entry points and policies without deleting
  existing Recipe, plan, or grocery records.

## Permanent Product Threshold

Promote the shared cart toward TestFlight only after:

- two real accounts complete three food cycles without cross-household access,
  stale mutation confusion, or lost contributions;
- household members understand **Sounds good** as support rather than a binding
  vote;
- Maya settles meals without separately polling the household;
- the cart remains comprehensible without a second `Next up` state;
- ordinary settlement is materially simpler than the legacy choice-round path;
- contribution and reaction controls remain usable at accessibility text sizes;
- Groceries receives only settled meal and Recipe provenance; and
- the security and authority tests pass against the exact database functions and
  policies intended for the next release channel.
