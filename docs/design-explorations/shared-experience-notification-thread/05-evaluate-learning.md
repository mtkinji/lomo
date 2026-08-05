# Evaluate Learning: Shared Home

## Decision This Release Must Inform

Should Shared Home become Kwilt's permanent cross-capability receiving layer
for meaningful family participation, should the delivery foundation remain but
surface inside each capability, or should the Home concept be reframed before
additional capabilities adopt it?

This evaluation separates three claims:

1. **Engineering proof:** the authorized delivery, push, routing, and settlement
   lifecycle works.
2. **Comprehension proof:** people understand Home, Ask, authorship, visibility,
   and the next action.
3. **Product proof:** Home makes it meaningfully easier to resume family
   participation after an interruption.

A passing build or migration proves only part of the first claim.

## Learning Questions

### 1. Does Home solve a real recovery problem?

- After dismissing or missing a push, does a person naturally look in Home?
- Does Home remove the need to search Goals, sharing settings, invite links, and
  Games separately?
- Are **Needs you** and **Recent** sufficient, or does the person still ask what
  is pending?

### 2. Is the Home and Ask distinction immediately understandable?

- Before tapping, can the person predict that Home contains family activity and
  Ask opens AI Chat?
- In Home, can the person identify who caused an event and which capability owns
  it?
- Do existing Chat threads still feel easy to find and return to?

### 3. Does the experience preserve trust?

- Can the recipient tell why they are allowed to see each item?
- Does any item reveal more in Home or on the lock screen than the originating
  capability intended?
- Does Home feel like helpful continuity rather than monitoring, an inbox, or a
  social engagement surface?
- When access is revoked, does sensitive presentation disappear promptly and
  understandably?

### 4. Are the first event types the right eligibility boundary?

- Do targeted Goal invitations, support responses, and claimed-seat Pass the
  Pattern handoffs all feel meaningful enough to enter Home?
- Are any of them too routine, duplicative, or better left capability-native?
- Are testers asking for deliberately shared Explorations or Moments because
  Home now feels like their natural receiving place?

### 5. Is the delivery lifecycle technically dependable?

- Does one source event create exactly one recipient delivery under retries?
- Does the push open the same item that Home later displays?
- Do pending items settle, expire, and become unavailable from source truth?
- Do foreground, background, cold-launch, offline, notification-denied,
  sign-out, and account-switch states recover without disclosure or duplication?

### 6. Is the contract truly cross-capability?

- Can Goal and Game use the same delivery envelope without embedding their
  permission models in Home?
- Could Exploration adopt the contract by declaring its own recipient,
  presentation, lifecycle, and route rather than changing the core table and
  screen architecture?

## Evidence That Supports The Bet

### Required engineering evidence

- All recipient-only RLS and negative authorization tests pass.
- Repeated and concurrent source-command tests create no duplicate deliveries
  or duplicate pushes for the same idempotency key.
- Two permanent accounts on physical devices complete real Goal and Game
  delivery lifecycles from source action through settlement.
- A dismissed push is later recovered as the same delivery id in Home.
- Cold launch and account switching never display another account's cached
  presentation.
- Revocation and deletion remove disclosure-safe presentation within the
  defined refresh/reconciliation boundary.

Any authorization leak, wrong-recipient delivery, or cross-account cached item
is an automatic failure regardless of the rest of the evidence.

### Required comprehension evidence

Without being coached, both testers can answer:

1. What will I find in Home?
2. What happens when I choose Ask?
3. Who caused this item?
4. Who else can see it?
5. Where will this button take me?

Both testers must correctly distinguish a family-authored/capability event from
an AI message. Minor naming preferences are acceptable; uncertainty about
authorship, audience, or authority is not.

### Supporting product evidence

- At least one tester naturally returns through Home after dismissing or missing
  a push rather than being instructed to do so.
- Across at least ten real event lifecycles spanning Goal and Game, Home leads to
  the correct capability without the tester searching elsewhere.
- The tester describes Home as a useful place to catch up or resume—not as an
  inbox they must clear.
- **Needs you** contains only events the recipient agrees deserve attention.
- A settled event moving to **Recent** makes sense without manual read/unread
  management.

With only two initial testers, these are directional product signals rather
than population-level evidence. They can justify the next controlled release,
not a claim of broad product-market validation.

## Disconfirming Signals

Revise or stop if any of these occur:

- A tester expects Home to contain To-dos, Plan, Money, or a daily dashboard and
  experiences the narrow surface as misleading.
- Home and Ask appear to be one mixed communication system, or a person thinks
  AI can see family content merely because both share a doorway.
- The person cannot tell why they received an item or who can see their action.
- Home creates a felt obligation to clear or monitor family activity.
- Most supported events feel too minor to deserve both a push and Home entry.
- Direct capability routes consistently make Home feel redundant, including
  after pushes are missed.
- A source capability needs to copy private state into the delivery record to
  render a useful item.
- Goal and Game require incompatible core delivery semantics rather than typed
  capability adapters.
- Settled or revoked items remain actionable, duplicate, reappear, or disclose
  stale content.
- The only way to create adoption appears to be badges, ranking, filler, or more
  frequent notifications.

## Instrumentation

Record only operational metadata needed to evaluate the loop:

- `shared_delivery_created`: event kind, capability, lifecycle state, and
  creation path;
- `shared_delivery_push_attempted`: capability, generic/specific copy class,
  permission state, and success/failure class;
- `shared_home_opened`: entry source—manual, push, cold launch, or return;
- `shared_home_item_opened`: capability, event kind, current state, and coarse
  age bucket;
- `shared_delivery_destination_reached`: capability and route-success class;
- `shared_delivery_settled`: capability, event kind, settlement reason, and
  coarse elapsed-time bucket; and
- `shared_delivery_unavailable`: revocation, deletion, expiry, or authorization
  failure class.

Do not record:

- item titles, Goal names, Game names, message/check-in text, or push body;
- actor or recipient display names;
- relationship labels;
- private source payloads;
- screen recordings by default;
- time spent reading as a proxy for engagement; or
- unread counts, daily-use streaks, or feed-depth metrics.

Delivery ids may appear in protected diagnostic logs for lifecycle correlation,
but should not be added to general analytics properties. Logs must not contain
the disclosure-safe presentation itself.

## Manual Learning Record

For each real lifecycle, record:

- source event and capability;
- device/account roles;
- app state when delivered;
- whether a push appeared and was intentionally opened or dismissed;
- whether Home was found without prompting;
- predicted versus actual destination;
- settlement result;
- any privacy, authorship, urgency, or wording confusion; and
- proof level: automated test, local source, Simulator, signed device,
  TestFlight, or production backend.

After several events, ask each tester only:

1. “What do you think Home is for?”
2. “Was anything here missing, surprising, or too visible?”
3. “Would you look here again after missing a Kwilt notification?”
4. “Did anything feel like another inbox to maintain?”
5. “What kind of family share would you expect to arrive here next?”

Do not explain the intended answer before asking.

## Decision Rule

Evaluate after:

- every required automated and authorization gate passes;
- both event families complete successfully on two permanent physical-device
  accounts;
- at least ten real delivery lifecycles have been observed; and
- the testers have had at least 48 hours in which they could naturally return
  after an interruption.

### Promote to the next controlled audience

Proceed when all security and lifecycle gates pass, both testers understand
Home versus Ask, and at least one unprompted missed-push recovery occurs. The
next step is a small production cohort, not immediate production-default
exposure.

### Revise the surface but keep the delivery foundation

Do this when delivery and privacy are dependable and the events are useful, but
the Home name, **Home | Ask** doorway, grouping, or card presentation causes
confusion. Test a separate global Home entry or capability-native pending
sections before changing the delivery contract.

### Narrow eligibility

Do this when one event family is useful and another feels noisy or redundant.
Remove the weak event type rather than adding filters or preferences.

### Retire Shared Home

Hide the surface when direct capability navigation remains sufficient after
missed pushes, or when the surface creates inbox pressure without improving
participation. Retain only delivery infrastructure that has an independently
proven use; otherwise stop emission and let the additive schema remain dormant.

### Block release

Do not release beyond the allowlisted TestFlight audience after any privacy
leak, wrong-recipient event, cross-account cache exposure, duplicate action, or
unreconciled stale authorization. These are correctness failures, not learning
trade-offs.

## Expected Next Action

Write the accepted feature brief and implementation plan against this learning
release. Build the recipient-delivery contract and one complete Goal lifecycle
before adding Game, then prove the shared contract with Game rather than
designing both adapters independently. Keep Exploration and Recipes as explicit
future adopters until their own sharing contracts exist.
