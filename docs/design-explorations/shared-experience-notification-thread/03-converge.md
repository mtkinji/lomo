# Converge: Home receives, capabilities own, Chat helps

## Chosen direction

Build the first narrow version of a calm **Home** receiving surface, paired with
the existing AI surface as **Home | Ask**. Home is where deliberately shared and
participation-relevant family events can be found again. Ask remains Unified
Chat. Their records never share one timeline.

For the Kwilt 2.0 learning release, Home is intentionally small: a finite list
of recent meaningful family events, with unresolved invitations and turns made
easy to find. It is not yet a general daily dashboard, publishing destination,
or social feed.

This direction combines the strongest part of the Updates alternative with the
existing Family Moments navigation exploration. It avoids creating a temporary
notification inbox that would later compete with a richer shared-life Home.

## Qualitative comparison

| Alternative | Family participation | Trust and privacy | System fit | 2.0 blast radius | Long-term coherence |
| --- | --- | --- | --- | --- | --- |
| Capability-native only | Medium | High | High | Low | Low once several capabilities share |
| Standalone Updates inbox | High | High with strict eligibility | Medium | Medium | Medium; may later compete with Home |
| Narrow Home with Home \| Ask | High | High with separated records | Medium | Medium | High |
| Full Home/Today dashboard | Medium | Medium | Low | Very high | Unknown without broader evidence |
| Family social feed | High for presence, low for action | Low without extensive controls | Low | Very high | Misaligned with current trust model |
| Notification Chat | Medium | Medium-low | Superficially high | Medium | Low because event and AI semantics blur |

## Why this wins

- It gives shared experiences one learnable receiving place without making each
  new capability compete for permanent navigation.
- It preserves the semantic boundary between a person or capability event and
  an AI conversation.
- It can begin with invitations, encouragement, and game turns, then accept
  deliberate Exploration or Recipe shares only when those capabilities define
  their own access and action contracts.
- It gives the already-explored Family Moments direction a useful first slice
  instead of introducing a separate notification product beside it.
- It can remain calm: finite, chronological, unranked, and governed by source
  truth rather than unread mechanics.

## Capability delta

### Today

A push can open an exact native destination. Goal-scoped activity can be stored
in `kwilt_feed_events`. Goal invitations and remote Game invitations have
capability-specific lifecycle logic. Unified Chat has a durable global doorway.

What cannot be done well is returning later to one place to see which meaningful
family invitations, replies, or turns still matter across capabilities. A push
that has disappeared leaves no reliable cross-capability continuation.

### After this concept

Maya opens Home and can:

1. See that David invited her to a Goal, replied to a check-in, or is waiting on
   her Game turn.
2. Understand the minimum authorized context: who, what experience, and why it
   is here.
3. Take the exact capability-owned action or open the native experience.
4. See an item settle automatically when the underlying invitation, reply, or
   turn is no longer pending.
5. Ask Kwilt for help from a clearly separate Ask mode when interpretation is
   genuinely useful.

The workaround that disappears is reconstructing shared activity from expired
pushes, individual Goal feeds, invite links, and separate capability screens.

### Still impossible after 2.0

- Household membership does not expose everyone's activity.
- A capability cannot publish routine private events into Home.
- Users cannot broadcast arbitrary posts to all Friends or Household members.
- Home does not rank content, count followers, demand inbox zero, or become a
  family-monitoring dashboard.
- Chat cannot speak as a family member or silently act on an event.

## What foundation already exists

This is connective product work, not a greenfield family system.

- `NotificationService` already uses typed payloads and exact native return
  targets for local notifications.
- Goal invitations already have preview, accept, decline, revoke, expiry, and
  recipient-specific access rules.
- `kwilt_feed_events` already stores Goal-scoped check-ins, membership events,
  reactions, and replies under Goal membership RLS.
- Remote Games already have table/session invitation and turn-state foundations.
- Unified Chat already provides the global doorway and authoritative native
  return pattern that can become the separate Ask mode.

The missing foundation is one safe **recipient delivery projection** across
capabilities. Existing `kwilt_feed_events` should not simply become the global
Home query: it is Goal-scoped, its authorization follows Goal membership, and a
previous policy allowing friend-wide user events was deliberately removed.

The new connective contract needs:

- stable delivery/event identity;
- one exact recipient and disclosure-safe presentation;
- originating capability, object, actor, and native return target;
- a small typed action contract;
- lifecycle state derived from the source where possible;
- idempotent push delivery referring to the same record; and
- deterministic eligibility that capabilities opt into explicitly.

Home is a projection of these authorized deliveries. It is not the source of
truth and not a universal sharing or permission table.

## Reductive design decisions

### Include

- One `Home | Ask` mode distinction at the existing global doorway.
- One finite chronological stream in Home.
- A compact **Needs you** group only when unresolved actionable items exist.
- Recent resolved/shared items beneath it so a dismissed push can be recovered.
- Person, source capability, time, audience/disclosure cue, and one primary
  capability-owned action on every item.
- Automatic settled/expired presentation from capability truth.

### Refuse

- A new bottom tab.
- Notification filters, bulk mark-read, unread totals, or red badge pressure.
- A general Home dashboard containing To-dos, Plan, Money, weather, or widgets.
- A composer or arbitrary family posting in this release.
- Comments, public reactions, engagement ranking, suggested people, or an
  infinite history.
- Local personal reminders, marketing, AI nudges, and routine system telemetry
  in Home.

## 2.0 event eligibility

The first release should admit only events where another chosen person caused or
is waiting on meaningful participation:

- targeted Goal invitation;
- Goal-support check-in, reply, or encouragement addressed to the recipient;
- targeted remote Game invitation when an exact Kwilt recipient is known;
- remote Game turn or table-ready state.

A generic Game share link cannot create a Home item before someone claims it,
because Kwilt does not yet know the recipient. The accepted player can receive
later table-ready and turn events.

Exploration sharing should enter only after its explicit recipient, disclosure,
expiry, and return contracts exist. Recipes can later adopt the same delivery
envelope without inheriting Goal or Game permissions.

## Activation path

Home does not need onboarding or an empty dashboard. The Home mode becomes
relevant after the first qualifying family event arrives. The push opens the
exact Home item; the item then opens or acts through the owning capability. A
quiet contextual cue can introduce Home as the place to find family activity
again.

When no qualifying events exist, the doorway can continue to open Ask by
default. Home should not invent filler to justify itself.

Natural adoption means a recipient returns through Home after missing a push,
or uses Home to resume a shared Goal or Game without searching multiple
capabilities.

## Accepted trade-offs

- Home begins narrower than its name may eventually imply.
- A cross-capability delivery record adds backend and lifecycle work even though
  much of the underlying sharing foundation exists.
- The first release will not yet demonstrate the richer human-authored Family
  Moments stream.

## Rejected trade-offs

- Reusing Chat quickly at the cost of authorship and authority clarity.
- Reusing Goal feed rows globally at the cost of permission correctness.
- Building a broad Home dashboard before the family-receiving job is proven.
- Shipping a standalone Notifications destination likely to become navigation
  debt once Family Moments matures.

## Bet

We're betting that one calm, recoverable receiving place will make existing
family invitations, support, and remote play feel like one Kwilt experience,
without creating the pressure or surveillance of a social feed.

If people do not return through Home—or if Home and Ask feel artificially
coupled—we will keep the recipient delivery contract and move Home to its own
global entry point. We will not merge the records into Chat.

## Success signal

In a real two-account flow, a recipient can receive a qualifying event, dismiss
the push, later find the same event in Home, understand who sent it and what is
shared, take the correct action, and see the item settle when the source state
changes—without exposing unrelated Goal, Game, Household, Chat, or personal
activity data.
