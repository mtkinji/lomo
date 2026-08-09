# Evaluate Learning: One Shared Meal Cart

## Learning questions

### Desire and comprehension

- Do household members naturally understand the Plan drawer as a shared cart?
- Does `+` mean **put this forward for us**, rather than **commit this meal**?
- Does **Sounds good** read as support rather than a binding vote?
- Is `Added by <name>` useful context without making the drawer feel like a feed?
- Does everyone understand that Maya makes the final choice?

### Coordination value

- Can two people contribute without moving the conversation to Messages or
  verbally polling the household again?
- Can Maya settle meals directly from the cart without reconstructing who wanted
  what?
- Is one undifferentiated cart enough, or does it become unclear which meals are
  likely?
- Do unselected ideas remaining in the cart help the next cycle or create stale
  clutter?

### Trust and family dynamics

- Do named positive reactions feel helpful and safe across adults and children?
- Does anyone infer dislike from a missing reaction?
- Does contributor withdrawal and organizer removal feel appropriately scoped?
- Does the asymmetric organizer boundary feel understandable rather than
  dismissive?

### Technical feasibility

- Do production RLS and RPCs preserve household, permanent-user, membership, and
  child-activation boundaries?
- Do concurrent additions and reaction retries converge without duplicates or
  lost state?
- Does Realtime invalidation make two accounts feel like one cart without
  exposing rows across households?
- Can settlement preserve immutable Recipe provenance while excluding reactions
  and contributor identity from Groceries?
- Can existing finalized and draft plans coexist without the cart selecting the
  wrong record or damaging grocery history?

## Evidence plan

### Supporting evidence

- Two permanent accounts in one household complete three natural food cycles.
- Both accounts contribute or react in each cycle.
- Maya settles meals without a separate choice round or off-app polling.
- Participants correctly explain `+`, **Sounds good**, and organizer authority.
- The cart remains understandable in insertion order without vote sorting or a
  `Next up` state.
- Production probes show unrelated, anonymous, removed, and ineligible child
  identities cannot read or mutate the cart.
- Retry and concurrent-write tests produce one candidate and one reaction per
  intended identity.
- Grocery compilation contains only settled meal and Recipe provenance.

### Disconfirming evidence

- Household members believe `+` or **Sounds good** guarantees selection.
- Maya still asks everyone what they want outside Kwilt.
- Missing reactions are interpreted as rejection or create family pressure.
- The cart repeatedly accumulates stale candidates that Maya cannot scan.
- Maya needs to mark likely meals before the final selection moment.
- Realtime produces flicker, duplicate state, or unexplained reversals.
- Any identity outside the eligible household scope can read contributor or
  reaction data.
- Existing released clients regress because the production migration changed a
  legacy projection or RPC contract.

## Instrumentation

Use privacy-minimal capability events:

- `meal_cart_viewed`: viewer role, candidate count bucket, settled/draft state,
  cached/live source.
- `meal_cart_candidate_added`: actor role, candidate kind, existing/new cart,
  result code.
- `meal_cart_candidate_withdrawn`: actor role, own/organizer authority, result
  code.
- `meal_cart_reaction_changed`: actor role, added/removed, result code.
- `meal_cart_settlement_started`: candidate count bucket.
- `meal_cart_settled`: selected count, remaining count, exception count.
- `meal_cart_realtime_refreshed`: change kind and reconciliation result.

Do not capture meal titles, Recipe ids, contributor names, reaction membership,
food needs, diner identities, ingredient contents, or person-to-meal preference
graphs in analytics. Production SQL verification may inspect aggregate counts and
authority outcomes, not household content.

Keep a short manual observation note for each cycle:

- where each person first discovered the cart;
- whether they understood the two actions;
- whether Maya used off-app coordination;
- where hesitation occurred; and
- whether old ideas helped or cluttered the next cycle.

## Production verification evidence

Before app use, record:

- production project reference and database version;
- exact migration version/name and migration-history row;
- table, index, constraint, RLS, grant, function-owner, `security definer`, empty
  `search_path`, and authenticated-only execute state;
- anonymous RPC denial;
- unrelated-household, removed-member, and inactive-child denial;
- successful owner, caregiver, and activated-child projections according to the
  declared contract;
- duplicate-add and duplicate-reaction idempotency;
- organizer-only settlement;
- Security Advisor and Performance Advisor results after deployment; and
- Postgres/Realtime logs if any verification call fails.

Production schema evidence does not count as two-account app proof.

## Decision rule

### Keep and prepare for TestFlight

Proceed when all production authority probes pass and three household cycles show
that shared adding plus positive reactions remove coordination without confusing
support with commitment. The cart must remain usable without another persistent
state.

### Revise

- Add a reversible **Next up** boundary only if Maya repeatedly cannot tell which
  ideas are becoming real before settlement.
- Add explicit post-settlement cleanup only if retained ideas reliably create
  clutter.
- Reconsider named visibility if positive reactions still create pressure despite
  the absence of negative feedback.
- Revisit Realtime transport only if authoritative reload cannot make the shared
  experience feel immediate and reliable.

### Retire

Retire the shared reactions and return to organizer-only candidates if household
members do not contribute naturally, if the feature increases coordination, or
if privacy/authority cannot be made legible. The additive production tables and
RPCs can be revoked without changing Recipes, historical plans, or Groceries.

## Expected next action

After source implementation and production migration verification, run the
two-account matrix. Do not expand into comments, negative reactions, ranking,
recommendation learning, reminders, or TestFlight until the three-cycle decision
rule is met.
