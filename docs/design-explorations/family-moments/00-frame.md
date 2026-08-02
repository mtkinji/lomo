# Frame: Family Moments

## What the user said

> I wonder what it might be like in Kwilt if we created a sort of family social network, sort of like BeReal, but for the family. Or Marco Polo, but for the family and friends.
>
> These could tie into Stories.
>
> I think it might be beneficial to start considering the concept of a feed, like a place I could go to see what's happening with my family, my household, and my extended circles of friends and extended family. I'm thinking something Instagram-like. I'm thinking something where I could see places my family has been to, where they could celebrate goals they are achieving, if they choose to share them publicly, where they could show me that their pet has grown, and I could see their pet, where I could see streak celebrations, perhaps, or where we could share stories with one another.

## Restated in user voice

When ordinary life is happening and the people I love are apart or moving at different speeds, I want one calm place where I can offer an honest glimpse and receive the glimpses, celebrations, and Stories they intentionally offer me, so we remain present in one another's lives without performing, coordinating an event, or exposing the private systems behind what we share. When one of those glimpses turns out to matter, I want to help it become part of a Story we can revisit without having to decide that at capture time.

## Target audience

`audience-aspirational-family-organizers` — people who want family participation and connection to feel natural, not like administering a shared workspace.

## Representative persona

Maya is already using Kwilt to help family life move. In this situation, she is not trying to organize anyone; she wants an easy way for household members, extended family, or close friends to feel included in ordinary life.

- Current situation: the people she cares about are often in different rooms, schedules, cities, or seasons of life.
- What she's trying to become/do: be a family that remains meaningfully present to one another without requiring a planned call or constant group chat.
- Emotional state or tension: affectionate and curious, but tired of noisy feeds, group-chat backlog, performative posting, and the pressure to respond.
- What would make this feel wrong to her: another content treadmill, parent-administered participation, surveillance, public metrics, automatic cross-posting, or a feed she has to keep up with.

## Hero anchor

Maya's audience hero is `jtbd-move-the-few-things-that-matter`, but this idea does not primarily serve a progress or organization job. It activates three supporting anchors and reveals a likely missing demand-side anchor:

- `jtbd-invite-the-right-people-in` — the circle and visibility boundary must be explicit and trustworthy.
- `jtbd-capture-and-find-meaning` — sharing an ordinary moment should be lighter than journaling or content production.
- `jtbd-see-my-arcs-in-everyday-moments` — a deliberately shared celebration can make growth visible through a lived moment without exposing the private evidence or turning identity into a score.
- Candidate missing anchor, not yet authored: **Help us stay present in one another's ordinary lives.** This is broader than shared accountability, narrower and more private than a social network, and different from starting a game together.

Provisional feature linkage if the taxonomy is not expanded:

```yaml
serves: [jtbd-invite-the-right-people-in, jtbd-capture-and-find-meaning, jtbd-see-my-arcs-in-everyday-moments]
```

## Job flow step

There is no exact job flow for asynchronous relational presence today. The nearest family-operating step is `job-flow-maya-move-family-life-forward`, where **Family participation** scores 2/5; the nearest gathering step is `job-flow-maya-start-playing-together`, where **Reach or gather the people involved** scores 1/5 and currently happens outside unified Kwilt. `job-flow-david-invite-the-right-people-in` also shows a 2/5 recipient experience, but it is specifically about accountability around a Goal.

The uncovered step is: **open one calm shared-life surface, notice what chosen people deliberately offered, respond without obligation, offer an ordinary moment or capability-owned celebration of my own, and preserve only the moments that later prove meaningful.**

## Active anchors

- `jtbd-invite-the-right-people-in` — people need to know exactly who can see each moment and what membership does not reveal.
- `jtbd-capture-and-find-meaning` — capture must be fast, optional, and allowed to remain ordinary.
- `jtbd-see-my-arcs-in-everyday-moments` — shared progress should be a human moment or celebration, not a dashboard or identity score.
- `jtbd-trust-this-app-with-my-life` — intimate family media raises the bar for consent, retention, child safety, deletion, and calm notification behavior.
- Candidate missing: **Help us stay present in one another's ordinary lives** — the actual outcome is felt closeness, not accountability, productivity, play, or content reach.

## Friction we're addressing

Group chats mix logistics, memes, urgent messages, and meaningful glimpses into one stream. Video calls require coordination. Public social networks invite performance and expose family life beyond the intended circle. Camera rolls preserve files but not shared meaning. Kwilt's own capabilities can create warm, shareable moments—Goal progress, a Pet evolution, a Place visit, a show-up celebration, or a Story—but today there is no calm receiving layer where chosen people can encounter those moments together. The risk is that solving this by aggregating private capability events would turn celebration into surveillance.

## System alignment

Constraint posture: `Question the system`

Current system facts:

- Existing surface: Kwilt has a capability menu with Goals & Plans, Money, and Fun groups; Games and Explore already live under Fun. The same left drawer also carries a growing Chat-thread list, Search, Settings, and a persistent Chat action. Friends and Household are managed as bounded relationship foundations in Settings. There is no cross-capability shared-life destination, and adding one more permanent capability row now risks making the shell itself feel like a catalog to administer.
- Existing user flow: Friend and Household invitations require explicit acceptance. Friendship grants no content, Household, or capability access. Household membership shares only roster and minimum relationship metadata; each capability must opt into Household and declare its own sharing policy.
- Existing domain/data model: Kwilt's Arc → Goal → Activity → Chapter model has no honest home for a casual relational moment. A Moment should not silently become an Activity, Goal check-in, or Chat message merely to reuse an object. Goal detail already has a Goal-scoped `kwilt_feed_events` stream for check-ins, membership events, reactions, and replies. That event log is not a safe global social-feed model: it is authorized by Goal membership, and a legacy policy that exposed user-level events to Friends was intentionally removed because Friendship must not imply content access. The accepted capability platform already names **Stories & Memories**, and the Explore/Missions design defines a Story as an authored, revisitable object that can be as small as one photo and one sentence.
- Existing technical affordances: the app has server-authorized Friend and Household identities and invitations, privacy-scoped Supabase foundations, media-library/camera support, photo/video attachment upload paths, audio packages, Goal check-ins/reactions/replies, and realtime Goal event subscriptions. The Stories system has also established a future canonical `MediaAsset` direction with container-scoped access, sanitized share derivatives, and explicit Story audience grants. These are useful primitives and accepted design contracts, not proof of a reusable or production-ready family-media system.
- Existing UX/copy conventions: calm, grounded, private by default, capture-first, explicit visibility, no default-public sharing, no streak pressure, and no requirement that every capture be anchored or interpreted.

Constraints to preserve:

- Household membership and Friendship remain zero-access relationship facts until this capability is explicitly enabled for a person or circle.
- A child or caregiver relationship must not imply blanket visibility, posting authority, location access, or device access.
- Personal Arcs, Goals, Activities, Chapters, Chat, Money, Explore history, and Screen Time remain private unless separately and deliberately shared.
- No capability may publish to the shared-life surface merely because an event occurred. Sharing a Goal celebration, streak, Pet state, Story, or Place moment requires a deliberate preview of the exact representation and audience.
- Sharing a Place moment must not reveal a route, current location, visit history, home location, or precise capture coordinate unless that exact context is deliberately included.
- Sharing a Pet appearance or evolution must not reveal Activities, care history, streaks, moods, Screen Time, or the action that caused growth.
- No public discovery, follower counts, engagement ranking, read-receipt pressure, streak loss, or engagement-optimized algorithmic feed.
- Capture cannot require a caption, Arc, Goal, polished edit, or immediate response.
- Chat remains a durable private capability layer; it should not become the container for a family social stream.
- Chat's authoritative request → answer → evidence → proposal → receipt timeline must not be interleaved with human-authored family posts or ambient capability celebrations. A shared doorway is acceptable; an ambiguous shared timeline is not.
- The first learning release should not add a permanent left-navigation capability row. It must reuse, replace, collapse, or temporarily gate an existing shell affordance while Kwilt's longer-term capability-discovery pattern is reconsidered.
- Viewing a Moment must not reveal its later Story, and viewing a Story must not reveal every Moment or private container that references the same media.
- Keeping or contributing a Moment to a Story must preview Story ownership, authorship, included media, subjects, and audience; the Moment's original audience is not inherited silently.

Constraints we may challenge:

- Kwilt currently assumes most captured life belongs to personal Activities or retrospective Chapters. This concept may justify one new capability-owned object: a short-lived or intentionally retained **Moment** shared with an explicit circle.
- The anchor taxonomy and job flows currently have no exact demand-side home for staying present in one another's ordinary lives. Evidence from this exploration may justify a new relational-presence JTBD and job flow rather than stretching Goal accountability or family administration to cover it.
- Fun currently contains Games and Explore. A relational-presence capability may belong there, or may need a calmer cross-cutting entry that does not read as entertainment or productivity.
- Chat currently acts as both a global destination and a contextual capability layer. It may be able to become the shared doorway to a Kwilt Home mode, but doing so would require clear separation between human shared-life content and AI conversation rather than treating every object as a message.

Design implication:

Treat “feed” as the receiving experience, not as an authorization model or universal event database. The smallest complete loop is still relational: one person deliberately offers a Moment, Story, or capability-owned celebration to one chosen circle; the people in that circle encounter it in a calm shared-life stream, return lightweight presence if they wish, and let it recede or deliberately keep it. Relationship foundations can determine who is eligible to join a circle, but they cannot decide what enters the stream or who can see an item.

Instagram is a useful interaction reference—visual, chronological, easy to browse—but not the product model. Kwilt's version should feel more like opening the family room after being away than checking a network for updates.

The navigation implication is explored in [`navigation-and-chat-paradigm.md`](navigation-and-chat-paradigm.md). The provisional direction is one persistent Kwilt doorway with two sibling modes—**Home** for intentionally shared life and **Ask** for the existing Chat—rather than either a new capability row or a single mixed Chat/feed timeline.

## Feed relationship to capability-owned truth

The shared-life surface may present several kinds of deliberately shared things without absorbing their private source objects:

| Shared representation | Source owner | What may appear | What stays private |
| --- | --- | --- | --- |
| Moment | Moments | Author-chosen photo, video, audio, or text | Camera roll, unshared Moments, later Story membership |
| Goal celebration | Goal | A user-approved milestone card or check-in | Goal internals, Activities, metrics, partner circle, drafts |
| Pet glimpse | Pet | A user-approved portrait, appearance, or evolution | Care receipts, streak source, Activities, mood, Screen Time |
| Place postcard | Moment or Story | Deliberately chosen Place label and media | Route, live location, visit history, precise coordinates |
| Streak celebration | Owning capability | A user-approved show-up celebration | Missed days, underlying actions, private streak history |
| Story share | Stories | The authored Story and explicit audience context | Other Stories, source containers, unrelated media |

The stream stores or projects only the shared representation and its explicit audience grant. Opening an item may deep-link to its source only when the viewer already has separate authorization to that source object.

## Moments and Stories relationship

The two concepts should answer different questions:

| Concept | User question | Default posture |
| --- | --- | --- |
| Moment | What does life feel like for you right now? | Lightweight, circle-scoped, low-pressure, allowed to recede |
| Story | What happened, and what is worth keeping? | Authored, revisitable, intentionally composed, explicitly owned and shared |
| Shared-life stream | What have my people deliberately offered me? | Recipient-facing, chronological, finite, never a source of private capability truth |

This creates a gentle ladder rather than a content pipeline:

```text
capture an honest Moment
  -> share it with one chosen circle
  -> receive lightweight presence
  -> let it recede
       or
  -> deliberately keep/contribute it to a Story
  -> revisit the Story later through Stories, a Person, a Place, or a family occasion
```

Important boundaries:

- Most Moments should never need to become Stories.
- Story promotion is optional and can happen later; capture-first means the author does not classify the moment up front.
- A Story may gather contributions from several people, but each contribution retains authorship and subject provenance.
- A shared family Story should be Person-owned or explicitly Space-owned; Household membership alone cannot decide ownership or audience.
- Kwilt may gently suggest that several Moments appear related, but it must not auto-author or auto-publish a family narrative.

## Aspirational design challenge

How might we help Maya open one calm place and feel caught up with the ordinary life, growth, play, and Stories her chosen people deliberately offered her—then share something of her own or preserve what matters—while protecting privacy, low pressure, authorship, child dignity, and Kwilt's calm attention posture?

## Out of scope

- Public profiles, discovery, followers, friend counts, or creator mechanics.
- An infinite, engagement-ranked, or algorithmically personalized feed.
- Automatically projecting Goal, Pet, streak, Place, Activity, Explore, Screen Time, Money, or device events into the stream.
- Daily posting requirements, streaks, countdown shame, or penalties for not responding.
- Automatic sharing from Photos, Explore/location history, Activities, Screen Time, or device sensors.
- Replacing urgent family messaging, group chat, or video calling.
- Automatically archiving every Moment, compiling family narratives, recognizing people, or widening Story audiences.
- Implementation or a permanent new top-level capability before the relational job and smallest exchange loop are chosen.

## Open question

Can one persistent Kwilt doorway make **Home** and **Ask** feel like coherent sibling modes without weakening the familiar, direct promise of Chat?
