# Learning Release: Shared Home

## Concept To Build

Build a calm Home where a person can recover and resume meaningful family
invitations, support responses, and Game turns, while every action and privacy
decision remains owned by its originating Kwilt capability.

## Capability Delta

Today, the user cannot:

- return to one in-app place after a family push disappears;
- see unresolved participation across Goal support and remote Games;
- know that a push and a later in-app item refer to the same event; or
- distinguish family activity that needs attention from Kwilt's personal
  reminders and AI nudges without visiting several capabilities.

After this release, the user can:

- open Home from a clear global affordance;
- find a finite list of authorized family events across the supported
  capabilities;
- see who caused the event, which experience owns it, and what is expected;
- open the exact Goal invitation, support context, or Game state;
- recover the same item after dismissing its push; and
- see pending items settle or expire when the source capability changes.

Still intentionally not supported:

- arbitrary family posts, a general social feed, or a full daily dashboard;
- Household-wide visibility or automatic publication of personal activity;
- inline cross-capability mutations owned by Home;
- generic Game share links appearing before a recipient claims a seat;
- Exploration or Recipe shares without their own recipient and disclosure
  contracts; and
- comments, ranking, filters, unread totals, or inbox-zero behavior.

## User Experience

### Entry

The capability menu footer's current **Chat** control becomes an explicit split
entry: **Home | Ask**. Search remains beside it. Existing Chat thread rows still
open the selected Ask conversation directly.

- **Home** opens the new receiving surface.
- **Ask** opens Unified Chat with the current capability context exactly as the
  existing Chat action does today.
- A qualifying push opens the exact Home item, not a generic list position. The
  item's primary action then opens the authoritative capability destination.

This makes the semantic choice visible before navigation; Home is not hidden
behind a button still labeled Chat.

### Home

Home has one quiet title and, when necessary, two visual groups:

1. **Needs you** — unresolved invitations, replies requiring a response, and
   the recipient's current Game turn.
2. **Recent** — recently settled events and meaningful responses retained long
   enough to recover a missed push.

Each item shows only:

- the actor's permitted display identity;
- one concrete sentence describing what happened;
- the owning capability and experience label;
- relative time and a clear settled/expired state when applicable; and
- one primary action such as **Review invitation**, **Open support**, or
  **Take your turn**.

Home does not accept freeform input. The item action routes to the existing
capability screen, where acceptance, decline, encouragement, play, and other
mutations already follow capability rules. A later release may add bounded
inline actions only where the capability exposes an idempotent typed command.

### Empty and unavailable states

- If the account has never received a qualifying event, Home says that family
  invitations and turns will appear here; it does not manufacture suggestions.
- If recent events have all settled, Home keeps a short recent history and no
  empty **Needs you** section.
- If a source has been revoked, deleted, or is no longer authorized, the item
  becomes unavailable without revealing cached private detail.
- If loading fails, Home preserves the last authorized snapshot only for the
  same signed-in user and labels it as not current.

## Happy Path

1. David takes an action that produces a qualifying event for Maya, such as a
   targeted Goal invitation or handing a remote Pass the Pattern turn to her.
2. The owning server command validates access and creates one idempotent
   recipient delivery record containing a disclosure-safe event projection.
3. The server optionally sends Maya a push using her existing registered Expo
   push token. The payload carries the delivery id and typed destination.
4. Maya dismisses the push and later opens **Home**.
5. Home loads that same delivery under **Needs you**.
6. Maya taps its primary action and reaches the existing Goal or Game surface.
7. The capability completes the action and updates its own source state.
8. The delivery settles idempotently and moves to **Recent** or expires from the
   retained window.

## Existing Product Relationship

This release enhances existing infrastructure rather than replacing it:

- typed push routing remains in `NotificationService`;
- Expo push-token registration remains the device-delivery foundation;
- Goal invitation, support, and Game commands remain authoritative;
- Goal detail keeps its Goal-scoped activity stream and reactions;
- individual Chat threads and contextual Chat launches remain intact; and
- capability-native deep links remain valid even when no Home item exists.

Home does not query `kwilt_feed_events` as a universal feed. Those rows are
Goal-scoped and authorized through Goal membership. Home instead reads a new
recipient-scoped delivery projection that can safely reference capability-owned
source events without widening access.

The adjacent Family Moments exploration can later project deliberately shared
Moments and Stories into the same Home grammar. It does not need to share the
first release's event types or permission model.

## Buildable Slice

### Must be real

- An additive recipient-delivery schema with:
  - stable id and idempotency key;
  - exact recipient and optional actor;
  - typed event kind and originating capability/object reference;
  - server-produced, disclosure-safe presentation fields;
  - typed native destination/action metadata;
  - pending, settled, expired, and unavailable lifecycle states; and
  - creation, update, expiry, and retention timestamps.
- RLS proving that only the exact recipient can read a delivery; clients cannot
  create deliveries or widen recipients.
- Server-side creation from at least two real capability families:
  - targeted Goal invitation or Goal-support response; and
  - remote Pass the Pattern handoff for a claimed permanent-account seat.
- Idempotency under command retry and push retry.
- Home query, focus refresh, and recipient-scoped realtime update or equivalent
  bounded refresh behavior.
- The Home screen with loading, empty, needs-you, recent, expired/unavailable,
  stale-cache, and error behavior.
- The capability-menu **Home | Ask** entry without changing the existing main
  Goals, To-dos, Plan, and More tabs.
- Exact-item deep linking from a server push and exact native return routing.
- Same-user-only local snapshot isolation across sign-out and account switch.
- Minimal analytics for delivery created, push attempted, Home opened, item
  opened, native destination reached, and delivery settled—without recording
  private item text or family content.

### Can be thin or temporary

- Event cards can share one layout with small capability marks rather than
  bespoke designs.
- Home can retain a fixed recent window rather than pagination or user-managed
  history.
- Source settlement can initially be emitted by the supported server commands;
  a generalized reconciliation worker is not required if foreground refresh
  safely repairs missed transitions.
- The production UI can be gated to explicit test accounts or a remote feature
  flag.
- Push bundling and delivery preferences can remain unchanged; qualifying
  events can send individually during the small test.

### Intentionally excluded

- Home content from personal reminders, Plan, Money, Screen Time, AI, marketing,
  or device-local notifications.
- Generic notification history imported from the operating system.
- New social relationships, circles, contacts access, discovery, or audience
  expansion.
- A Home composer, Family Moments capture, Story preservation, comments, or
  open-ended reactions.
- Exploration sharing until its real access contract exists.
- Recipe sharing, which remains a future capability adopter.
- Inline accept/decline or Game commands inside Home.
- Broad navigation redesign, capability pinning, or replacing the current
  default To-dos tab.

## Release Channel

Use a **TestFlight build backed by an additive production Supabase schema**, with
Home hidden behind an explicit account allowlist or remote feature flag. Test
with Andrew and at least one trusted family member using separate permanent
Kwilt accounts and physical devices.

This is the smallest channel that can truthfully test separate-account RLS,
server-created deliveries, Expo push behavior, dismissed-push recovery,
background arrival, account switching, and real Goal/Game lifecycle state. A
local or single-Simulator build cannot establish those claims.

Do not announce Home or enable it for the general production audience during
the learning release.

## Brand-Goodwill Guardrails

- Present Home as a polished, finite part of Kwilt; do not label it as an
  unfinished feed or ask testers to excuse missing core states.
- Use concrete human copy: who did what and where it leads. Do not infer motive,
  emotion, urgency, or private progress.
- Show no red unread count or escalating reminder pressure.
- Send a push only for capability-declared meaningful events and respect the
  user's existing notification permission.
- Never include disclosure in a push that the locked screen should not reveal;
  use generic copy when the capability's privacy contract requires it.
- Suppress duplicate pushes and duplicate Home items under retry.
- If authorization changes, remove sensitive cached presentation immediately
  and show only that the item is no longer available.
- Keep Home and Ask visually and semantically distinct, including accessibility
  labels and focus behavior.

## Reversibility

Server event emission and the Home UI are independently gated. Turning off
emission stops new deliveries; turning off the UI restores the current Chat
footer behavior. Existing Goal, Game, notification, and Chat flows continue to
work directly.

The backend migration is additive and can remain dormant. Delivery records use
a short server-controlled retention window and contain only the minimum
projection needed for the recipient, so disabling the experiment does not leave
a permanent family-history product behind. No existing `kwilt_feed_events` rows
or capability data need migration.

## Verification Gates

Before TestFlight:

- migration/RLS tests prove recipient-only reads and reject actor, friend,
  Household-member, anonymous, and wrong-recipient access;
- command tests prove event eligibility, safe presentation, idempotency,
  settlement, expiry, and revoked-source behavior;
- app tests prove account-isolated snapshots, grouping, routing, and Home/Ask
  navigation;
- `npm run verify:changed -- --run` passes, plus focused Supabase function and
  migration checks; and
- the signed build is confirmed to contain the intended branch and commit.

On physical devices with two permanent accounts:

- create each supported event from its real originating flow;
- prove the intended recipient sees it and another relationship member does not;
- receive, dismiss, and later recover the same push-linked delivery in Home;
- open the exact Goal/Game destination, complete the action, and observe the
  delivery settle;
- verify foreground, background, cold-launch, denied-notification, offline,
  sign-out, and account-switch behavior; and
- distinguish TestFlight upload, Apple processing, installation, and behavioral
  proof in the release record.

## Permanent Product Threshold

Promote Shared Home from a gated learning release when:

- the two-account lifecycle works repeatedly across both Goal and Game event
  families without authorization or duplication failures;
- testers understand Home versus Ask without explanation;
- at least one tester naturally returns through Home after missing or dismissing
  a push;
- Home shortens participation rather than becoming another place to maintain;
- event wording and locked-screen behavior feel trustworthy; and
- the recipient-delivery contract accepts a third capability without widening
  its permissions or forcing bespoke Home infrastructure.

If those conditions fail, retain the useful delivery contract where warranted,
simplify Home to capability-native pending sections, or move Home to a separate
entry point. Do not solve weak adoption by adding badges, filler, ranking, or
more notifications.
