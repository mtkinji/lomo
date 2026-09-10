# Design loop: people and moments

September 9, 2026 · Proposed direction

## 00 — Frame and system alignment

**User intent:** learn broadly from Instagram and turn those lessons into an implementation plan, improving the richness and fit of Kwilt Home.

**Audience/persona:** aspirational family organizers / Maya, with chosen supporters such as David as a secondary audience. Maya wants to feel included in ordinary family life without becoming the administrator of everyone else's participation.

**Hero anchor:** `jtbd-move-the-few-things-that-matter`. Supporting anchors: `jtbd-invite-the-right-people-in`, `jtbd-help-us-enjoy-being-together`, `jtbd-trust-this-app-with-my-life`. The [family-life job flow](../../job-flows/maya-move-family-life-forward.md) identifies participation and continued use as relevant steps. Its scores are historical documentation, not a fresh evaluation of this implementation. Everyday connection remains a possible taxonomy gap; we should not disguise ordinary stories as productivity to force a fit.

**Design challenge:** How might Home make everyday moments easy to share, enjoyable to encounter, and natural to respond to, across a household and its chosen connections?

**What I see:** the supplied Instagram references give people and media the greatest visual weight. Kwilt's saved empty-state screen gives substantial weight to a large action, wrapping filters, and a checklist illustration. Current populated-feed source wraps posts in cards, puts text before every photo, stacks photos, and uses text buttons for identity and responses. These are two different product feelings even where the underlying functions overlap.

**Anchor in play:** connection through recognizable people and concrete moments. The intended improvement is expressive content with trustworthy participation, not simply fewer controls.

**System alignment:** Home owns posts and conversations; capabilities own original records; Needs you carries actionable deliveries. A post is not a new planning object. Goals and Activities can supply approved snapshots; Chapters remain retrospectives. Home creation never requires an Arc or Goal. Automatic household chores are a deliberate system-post exception, not precedent for automatically publishing every capability event.

## 01 — Yes-and opportunities

| Opportunity | How it elevates the job | Placement |
|---|---|---|
| People become recognizable throughout Kwilt | Participation feels like hearing from someone, not processing another item. | Shared presentation foundation |
| Photos, words, and source moments share a common grammar | Ordinary life and accomplishments can coexist without a required productivity frame. | First release |
| Appreciation becomes the start of a conversation | A small response can lead to a meaningful exchange around the original moment. | First release, deepen later |
| A discovery becomes something to do together | Home connects Explore moments to saving and future participation. | Existing source actions first |
| Saved moments become chosen collections | A household can revisit meaningful experiences without scrolling indefinitely. | Subsequent release |
| Catch-up can be bounded and personal | Someone can see what is new from their people and feel finished. | Requires truthful seen state |
| Shared history can support a household journal | Everyday contributions and authored memories gain lasting value. | Separate retrospective experience |

## 02 — References and three sketches

References worth knowing within the supplied Instagram system: **the people/story rail** for recognizable entry points; **the photo post** for identity/content/action rhythm; **the tall media post** for immersive content and local controls; **the response strip** for quick social versus personal actions; **the Following/Favorites view selector** for explicit scope. The first four are visually evidenced; the fifth is documented in Meta's dated announcement linked in the catalog. These are relationships to translate into Kwilt's own components and visual identity.

The substantive axis is **what organizes the visit: moments, days, or people**.

### A. People and moments — recommended default

```text
Menu   Home / All ▾                       +
Needs you · 1 invitation           Review →   [only when present]

(avatar) Alex          Household · 20m     ⋯
┌────────────────────────────────────────┐
│              GENEROUS PHOTO            │
│                                   1/3  │
└────────────────────────────────────────┘
♡ Cheer     Comment                    Save
Alex  Found a great place for a picnic…
[Place preview · Save place / View]

(avatar) Sam finished 2 chores    Household
Kitchen reset · Laundry       [Details]
♡ Thanks    Comment
```

Best when people want an enjoyable mixed view of daily life. Strong fit with current chronological architecture and Andrew's mini-Instagram intent. Fails if system activity becomes so frequent that authored moments disappear; compact grouping and a moments-only view provide control without deleting contributions. Save appears only after its backend exists. The sketch's invitation is a real conditional source action, not a permanent feed banner.

### B. Household journal — organize by day

```text
Menu   Home / Household ▾                 +
Today · Wednesday
  Alex's picnic photos
  Sam's contribution summary
  A short story from Maya
Yesterday
  Goal celebration and its replies
```

Best for retrospective family browsing and dense household activity. Makes the day feel coherent; supports later collections. Fails as the sole default when followed households and different time zones make day boundaries ambiguous or a fresh personal moment feels buried. Keep as a future view, not a second post store. The user can still write an unanchored story directly.

### C. People first — organize by relationship

```text
Menu   Home / Your people ▾               +
(Alex: new) (Sam: new) (Maya) (Household)
Catch up with Alex → authorized moments
Then: All moments in chronological order
```

Best for a larger network and returning after several days. Makes connection tangible and allows a bounded visit. Fails when sparse data produces an empty rail or visual rings imply unseen stories that do not exist. Requires an authorized per-person summary and actual seen state. Never expose a child's personal profile through a household system actor.

## 03 — Converge

Choose **A as the default**, add **C as a useful catch-up entry** once its data supports it, and retain **B as a future history/journal view**. This preserves all three valuable modes without making the first screen ask users to understand three systems.

The bet: a more personal, media-rich presentation plus responsive conversation will make the existing capabilities feel substantially more connected before we need entirely new content formats.

Keep Home at the top of standard app navigation. Within Home, separate three concepts: **who I am acting as**, **which posts I am viewing**, and **who will see what I post**. They must never silently update one another.

### UI contract

- First glance: identify Home, the person, and the moment; locate creation without a large toolbar.
- Every post: author or truthful system attribution, audience, time, content, appreciation, conversation, and authority-aware overflow.
- Photo post: media leads; caption follows; multiple photos remain one post. Text-only post: readable story body with equal dignity.
- Household contribution: compact, grouped, expandable, and truthful about approval and earlier reporting.
- Source handoff: original action succeeds, immediate celebration offers Share or Continue, then preview and explicit audience before publication.
- Needs you: preserve actionable invitations and their source authority; social refresh cannot bury or duplicate them.
- States: initial loading, empty household, no connections, refreshing, older-page loading, partial image failure, offline, revoked access, draft, uploading, failed publication, success.
- Accessibility: usable with large text and VoiceOver, no color-only state, no gesture-only action, accessible media alternatives, and reduced-motion support.

## 04 — Learning release

Build the first release as a complete mixed-feed experience, not a cosmetic post-card demo. Include one/four-photo moments, text, place, completed goal, automatic chores, invitations, conversation, pagination, and failure recovery. Use fictional local fixtures or disposable test accounts, not invented posts in a real household.

Use the existing Home feature-gate pattern for controlled rollout. Additive schema changes must tolerate the old client; hiding the new layout must not strand drafts or published data. Reuse existing components and dependencies before adding a gallery/list package.

Start with native development verification, then a signed internal build for real photo selection, keyboard, media memory, and networking. Production exposure follows functional and audience checks; a source test pass alone is not native or production proof.

## 05 — Evaluate learning

Use a small formative round with household organizers and other household members, including people who rarely post. Suggested first round: five participants across at least two households; findings are directional, not statistical validation.

Ask each person to identify an author and audience; publish a photo with a caption to the intended audience; respond to a moment; explain a pending chore; find a saved item; return from a conversation to their place in the feed. Observe without coaching. Proposed acceptance: no audience misunderstandings, no lost drafts, no duplicate publication, all primary tasks possible with large text and assistive labels. Repeat any task whose failure comes from the interface rather than unfamiliar test setup.

Ask: “Did this help you feel more included?” and “Did sharing feel worth doing?” Track task completion, unintended audience corrections, publication/retry failures, and whether shared moments lead to voluntary responses or useful source actions. Collect event metadata without captions, photos, coordinates, or private names. Do not optimize for session duration, number of chores, or compulsive return frequency.

The permanent-product threshold is reliable everyday sharing and participation with clear audiences—not a visual resemblance score. Update job-flow evidence and scores only after observing the released experience.
