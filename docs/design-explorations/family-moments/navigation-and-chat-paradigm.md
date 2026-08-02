# Navigation And Chat Paradigm: Family Moments

## What I See

The current left drawer is doing too many jobs at once:

- capability catalog: Goals, To-dos, Plan, Arcs, Chapters, Money destinations, Explore, and Games;
- Chat history: a growing list of durable AI threads;
- shell utilities: Search, Settings, and a persistent Chat action; and
- current-location indicator: which capability or Chat thread is active.

The strongest failure is structural. Adding Moments, Stories, Pet, and a feed as sibling rows would make every new product idea compete for permanent shell space. The menu would increasingly describe Kwilt's internal architecture rather than help a person decide what to do next.

The second failure is semantic. Unified Chat is an authoritative causal timeline:

```text
request → working → answer → evidence → proposal → receipt
```

A family feed has a different grammar:

```text
person → deliberately shared moment → optional presence → recede or keep
```

Putting both record types into the same chronological thread would make authorship, privacy, and authority harder to understand. A Pet evolution card could look like a Kwilt-generated claim; a Goal receipt could look like something the family can see; a relative's Story could look like context the AI has consumed. Chat may be the doorway, but it should not become the owner or storage model for shared life.

## The Anchor In Play

This surface serves `jtbd-invite-the-right-people-in`, `jtbd-capture-and-find-meaning`, and the candidate relational job **Help us stay present in one another's ordinary lives**.

Anchor-derived design principle:

> Kwilt should feel like one calm place for life, while making it unmistakable whether I am seeing something a person shared, asking Kwilt for help, or opening a private capability.

This means reducing permanent navigation choices without flattening different trust contracts into one stream.

## References Worth Knowing

### Apple — Shared with You

Content sent through Messages is also organized in the relevant receiving app, labeled with who shared it, with a path back to the conversation. The transferable idea is that conversation can be the social transport while the content retains its native presentation and ownership. Kwilt should not copy the automatic cross-app exposure rule; every shared-life projection needs an explicit audience grant.

Reference: [Use Shared with You on iPhone and iPad](https://support.apple.com/en-mide/102197)

### WhatsApp — Chats and Updates

WhatsApp keeps Status and Channels in Updates, separate from personal Chats, explicitly so updates do not interrupt conversations. The transferable idea is semantic separation inside one product. Kwilt should not copy public channels, discovery, creators, ads, or one-way broadcast posture.

Reference: [WhatsApp Channels: Here's Everything You Need to Know](https://about.fb.com/news/2023/09/whatsapp-channels-heres-everything-you-need-to-know/)

### Discord — Forum posts

Discord separates fast text channels from media-rich or longer-lived posts, then gives each post its own discussion. The transferable idea is that a Moment or Story can be the stable object and lightweight responses can belong to it. Kwilt should not copy server/channel proliferation, roles, tags, engagement sorting, or community-administration burden.

Reference: [Forum Channels FAQ](https://support.discord.com/hc/en-us/articles/6208479917079-Forum-Channels-FAQ)

### Slack — Activity

Slack's Activity view aggregates messages, mentions, replies, reactions, invitations, apps, and reminders into one chronological place, with direct reply paths. It proves that a cross-source receiving layer can help someone catch up. It also demonstrates the danger: filters, unread state, clearing, badges, and inbox-zero behavior quickly turn a feed into attention administration. Kwilt should borrow the cross-source projection, not the notification-inbox posture.

Reference: [Introducing the new Activity view in Slack](https://slack.com/help/articles/46751260742035-Introducing-the-new-Activity-view-in-Slack/)

## Three Sketches

Axis of variation: **one mixed timeline → one doorway with separated modes → Home-led shell with Chat as an action**.

### 1. The Family Room Thread

Pin one special **Family Room** above ordinary Chat threads. It behaves like a multi-person conversation: Moments, Story shares, Goal celebrations, Pet glimpses, and Place postcards appear as rich cards; family responses sit beneath or between them. The ordinary composer can send text or capture a Moment. The capability list gains no row.

What is removed: a separate feed destination. What is added: human actors, circle membership, rich post cards, replies, and privacy state inside a surface currently understood as AI Chat.

- Anchor check: relational and immediate, but the boundary between human sharing and AI assistance becomes fragile.
- Reference grounding: Messages plus rich attachments; Discord posts with replies.
- Best when: Kwilt intentionally wants Chat to become a broader human-and-AI messaging platform.
- Fails when: people cannot instantly tell what Kwilt knows, what family can see, or whether the composer addresses AI or people.

### 2. One Doorway, Two Modes

Keep the persistent bottom-left-drawer Chat affordance as Kwilt's cross-cutting doorway, but open a surface with two stable sibling modes:

```text
Home | Ask
```

**Home** is the finite, chronological shared-life stream. Cards retain person, source capability, audience, and object-specific actions. The resting action is **Share a moment**. **Ask** is the existing Unified Chat experience with its own threads, context chips, composer, proposals, and receipts. Switching modes never interleaves records. The doorway could eventually be labeled **Kwilt** or represented by the Kwilt mark, but the learning release can keep the familiar Chat label and introduce Home contextually.

What is removed: the need for a new capability row. What is added: one mode switch at the top of the existing global destination and a clear composer transformation.

- Anchor check: one calm place, explicit authorship and audience, no new shell destination.
- Reference grounding: WhatsApp's semantic separation; Apple's content-native Shared with You projection.
- Best when: Home is a cross-capability receiving layer and Chat remains a trusted action layer.
- Fails when: **Home** and **Ask** feel like unrelated products forced behind one button, or the Chat label makes Home undiscoverable.

### 3. Home Becomes The Shell

Make **Home** the app's default canvas and primary orientation surface. It contains a small shared-life section, recent personal returns, and contextual entry into capabilities. Chat becomes a persistent floating/collapsed action available from Home and every capability. The left drawer stops listing every destination equally: it shows a short recent/pinned set plus **All capabilities** or Search for the full inventory.

What is removed: the assumption that every capability deserves permanent left-nav presence. What is added: a default Home, recent/pinned capability logic, and an overflow/library model.

- Anchor check: can make Kwilt feel coherent and life-shaped instead of architecture-shaped.
- Reference grounding: Slack's Home/Activity distinction, but without unread administration or configurable filters.
- Best when: capability growth is now a platform-level constraint, not merely a feed-placement issue.
- Fails when: Home becomes a dashboard, hides important capabilities, or requires users to curate their own navigation system.

## Recommendation

Choose **One Doorway, Two Modes** for the Family Moments learning direction, while treating **Home Becomes The Shell** as the likely broader navigation exploration.

The recommendation is deliberately narrower than redesigning the whole shell. It tests the user's intriguing premise—that Chat can be the place the feed lives—without corrupting the existing Chat timeline or spending another permanent nav row. Chat is the shared doorway, not the feed's data model.

The first sketch to prototype should show:

- the existing persistent Chat doorway;
- a stable **Home | Ask** mode switch;
- three Home cards: a human Moment, a user-approved Pet evolution, and a shared Story;
- explicit author and audience on every card;
- one lightweight response that stays attached to its card;
- **Share a moment** in Home versus the existing Ask composer; and
- zero unread count, filter control, algorithmic ranking, or additional left-nav row.

Defer circles management, long-term Story preservation, multi-person Chat, capability pinning, and a full shell redesign until the mode distinction is understandable.

The bet:

> We're betting that the dominant blocker is permanent-destination growth, not lack of interest in shared life. If Home and Ask still feel artificially combined, the next move is to make Home the shell and keep Chat as its persistent action—not to mix the timelines.

Success means a person can answer, without explanation:

1. Am I looking at something my people shared or something Kwilt generated?
2. Who can see what I do here?
3. If I type now, am I sharing with people or asking Kwilt?
4. Where do I go back to my private capability work?
