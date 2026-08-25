# Frame: Home As Shared Life

## What the user said

> One of the most interesting opportunities, now that I've refactored the main
> menu for navigation, is that there's actually space now for a Home. We've gone
> the rounds on whether a Home should be included, what it might look like and
> what it might do, and now that there's actually space for it, I want to rethink
> it.
>
> I've also wondered if it would make sense to have a feed. Perhaps Home is a
> potential location for that, or another way to think about it.
>
> When I think of a feed, I do think of what I'm doing, but primarily I think
> about what my household is doing, especially where household could eventually
> become a broader concept of Spaces, where maybe there are multiple households
> in the family and they're sharing certain types of things with each other.

## Restated in user voice

When life is unfolding across my household and wider family, help me open one
calm place and see what the people and Spaces I belong to have legitimately made
part of our shared life—through deliberate sharing or activity in something we
already share—so I can feel present, respond, continue something, or offer
something of my own without keeping up with group chats or exposing the private
systems behind each item.

## Target audience

`audience-aspirational-family-organizers` — people who want family participation
and connection to feel natural rather than like administering a shared workspace.

## Representative persona

Maya belongs to her direct household and may eventually participate in other
durable family contexts: grandparents' household, an extended-family Space, or a
focused Space shared by several households. She wants to know what is happening
with her people without merging those households or inspecting each capability.

- Current situation: meaningful family life is distributed across people,
  households, schedules, capabilities, and group threads.
- What she's trying to do: remain present to the ordinary life, growth, play,
  needs, and Stories her people intentionally make visible to her.
- Emotional state or tension: affectionate and curious, but resistant to social
  performance, catch-up pressure, surveillance, and family administration.
- What would make this feel wrong to her: an automatic household activity log,
  public-social mechanics, an infinite feed, a Space switcher, or unclear reasons
  why she can see something.

## Hero anchor

Maya's audience hero remains `jtbd-move-the-few-things-that-matter`, but a
household/Spaces feed is not primarily a personal-prioritization feature. Its
strongest existing anchor is `jtbd-invite-the-right-people-in`: each item should
feel like something offered within a particular room of life, not an event Kwilt
exposed because two people happen to be related.

The concept continues to reveal a likely missing demand-side anchor:
**Help us stay present in one another's ordinary lives.** That is broader than
Goal accountability and different from household operations, group messaging,
or starting a Game together. It should remain provisional until the exchange
loop creates real demand evidence.

Candidate linkage for this exploration:

```yaml
serves: [jtbd-invite-the-right-people-in, jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
```

## Job flow step

The nearest current step is **Family participation**, now **3/5**, in
`job-flow-maya-move-family-life-forward`. Kwilt has explicit Household,
shared-Goal, private-Game, and recipient-delivery contracts, but participation
remains distributed across capability-owned destinations. There is no coherent
place to experience the shared life those permissions enable.

The Participation Spaces exploration adds the missing structural context:

- a person may participate in several non-nested Spaces;
- Household is an important Space type, not the only durable multi-person
  boundary;
- Spaces are permission and provenance boundaries, not global navigation modes;
- one-off shares do not require a Space; and
- personal surfaces should remain unified across authorized sources.

The uncovered relational step is: **open one calm, person-centered surface;
notice what people across my authorized Spaces deliberately shared or did within
an already-shared context; understand where each item came from and who can see
it; respond or continue in context; and leave without feeling behind.**

## Active anchors

- `jtbd-invite-the-right-people-in` — Space participation and item visibility
  must remain bounded, explainable, and revocable.
- `jtbd-capture-and-find-meaning` — an ordinary glimpse should be easy to offer
  and allowed to recede; only selected things need to become durable Stories.
- `jtbd-trust-this-app-with-my-life` — family media, children, locations, Goals,
  and household activity require explicit audiences, source truth, calm
  notifications, and no inferred blanket access.

## Friction we're addressing

Kwilt can authorize people to participate in particular capabilities and can
deliver a few shared event types, but it lacks a shared-life experience. Maya
must reconstruct family life from group chats, pushes, individual capabilities,
and separate households. A feed could make that life legible, but only if
“what my household is doing” means **activity inside something we knowingly
share, plus things people intentionally offered**, not a surveillance projection
of their private Kwilt activity.

## System alignment

Constraint posture: `Question the system`

Current system facts:

- Existing surface: the refactored capability menu groups primary capabilities,
  collapses less-used destinations under **More**, exposes recent Chats, and has
  a stable footer where **Home** can sit beside **Ask** without adding another
  capability row.
- Existing user flow: app launch enters To-dos; no general-purpose Home is
  user-facing by default. A production-hidden route labeled **Home** currently
  receives invitations, Game turns, and authored Goal check-ins.
- Existing participation model: the converged Spaces direction defines a Space
  as a named, non-nested boundary for repeated participation. A person may belong
  to multiple Spaces, but Spaces never become a global workspace switcher.
- Existing domain/data model: capabilities own their objects. Goal feed events
  are Goal-scoped, and the shared-delivery envelope is a recipient projection;
  neither is a safe universal family-feed database.
- Existing technical affordances: authenticated Person and Household identity,
  typed destinations, recipient-authorized deliveries, invitations, Goal
  check-ins, Game turns, reactions/replies, push identity, caching, and realtime
  refresh provide useful primitives without yet constituting a shared-life feed.
- Existing UX/copy conventions: private by default, capability-owned truth,
  explicit visibility, calm chronological presentation, and no default-public
  sharing, streak pressure, or engagement optimization.

Constraints to preserve:

- Home is person-centered. It may aggregate authorized items from multiple
  Spaces without asking the user to choose a current Space.
- Every item identifies the human author, Space or direct-sharing context,
  source capability, audience, and reason it appears.
- Household membership, Friendship, kinship, caregiving, or shared payment never
  causes content to enter the feed by itself.
- Personal capability activity remains private unless its owner deliberately
  publishes a bounded representation. Activity on a Space-owned or explicitly
  shared object may appear without a second Share action only when the
  capability's visibility policy made that consequence understandable up front.
- Space membership does not reveal every capability or object in that Space.
- A post to two Spaces is two explicit audience grants, not inherited visibility
  through nested households or family trees.
- The feed is finite, chronological or calmly grouped, and low-pressure: no
  engagement ranking, follower mechanics, unread administration, response
  obligation, posting cadence, or infinite catch-up.
- A quiet feed feels peaceful, not incomplete.
- Chat remains semantically separate: people share into Home; users ask Kwilt in
  Chat; the records and composers never become one ambiguous timeline.

Constraints we may challenge:

- Home may be primarily relational rather than the personal orientation surface
  imagined in the retired Today concept.
- The user's own activity may appear mainly when it has become part of shared
  life—something they offered, did with others, or are responsible for in a
  Space—rather than as a private productivity digest.
- The hidden Shared Home experiment's inbox grammar may become the seed of a
  broader participant feed, but “Needs you” cannot remain the identity of Home.
- The earlier **Home | Ask** idea assumed navigation scarcity. The refactored
  menu may now allow sibling Home and Ask destinations without combining them
  behind one doorway.

Design implication:

Explore Home first as a **person-centered shared-life feed across authorized
Spaces**, not as a personal dashboard with a social section. Household is the
first meaningful context; multiple households and extended-family Spaces are the
pressure test. Personal continuity belongs only where it helps the shared-life
job and does not crowd out the people.

## Aspirational design challenge

How might we help Maya open one calm Home and feel present to the ordinary life,
growth, play, needs, and Stories that people across her household and wider family
Spaces deliberately shared—while preserving separate households, explicit
audiences, capability ownership, child dignity, and freedom from social-feed
pressure?

## Out of scope

- Automatically publishing household or capability activity.
- A generic people graph, public discovery, followers, rankings, or creator
  mechanics.
- A global Space switcher or a separate Home per Space as the default experience.
- Nested Spaces or inherited visibility between direct households and an
  extended-family Space.
- Treating all current Shared Home delivery types as a finished feed model.
- Final schema, RLS, retention, child-safety, or multi-Space posting rules.
- Deciding that every personal continuation or recommendation belongs on Home.

## Open question

Should the first feed-defining loop be **deliberate sharing**—an ordinary Moment,
Story, celebration, or Place postcard—or **activity in an already-shared Space
object**—a Game turn, meal-plan change, chore completion, or similar household
event? The eventual Home may contain both, but the first one will establish its
social contract.
