# Diverge: Contextual Capability Entry

## Decisions held constant

All alternatives preserve these decisions from review:

- Welcome remains one balanced illustrated page.
- A deliberate horizontal swipe from anywhere on the full page moves forward or backward.
- Every value story is a usable door, not merely a tour slide.
- A person can start the displayed experience, keep swiping, or choose **Explore Kwilt** without
  penalty.
- Earlier positions will receive more exposure, so ordering is an explicit retention bet rather
  than a neutral taxonomy sort.
- Capability-specific FTUX still owns setup, permissions, first native value, recovery, and
  landing.
- A bottom guide does not cover the open capability menu.
- Chat does not receive a repeated line on every already-constrained capability story unless the
  final design proves that the repetition improves comprehension.

## Target audience and challenge

Audience: `audience-aspirational-family-organizers`

Representative persona: Maya

Hero JTBD: `jtbd-move-the-few-things-that-matter`

Trust guardrail: `jtbd-trust-this-app-with-my-life`

> How might Kwilt give Maya a short, skippable understanding of the kinds of help available, let
> her begin the moment one feels relevant, and then reveal the real product map without making
> first install grow with every capability?

Constraint posture: `Question the system`. The alternatives deliberately test whether the current
standalone chooser, the current navigation taxonomy, or the assumption of equal capability
exposure should survive.

## Axis of variation

How much value breadth is shown before action, and how the design trades off:

- one clear door per page;
- total sequence length;
- fair exposure across value propositions;
- learning the persistent navigation; and
- enough dedicated space to explain Chat truthfully.

## Shared ordering and learning policy

The first position is scarce product inventory. The initial order should be an editorial retention
hypothesis constrained by product truth, not alphabetical order, registry order, or private
personalization.

Before a door can be ranked, it must pass the onboarding readiness contract. Among eligible doors,
rank using:

1. breadth of credible demand;
2. frequency of the underlying life moment;
3. likelihood that the FTUX reaches native first value in the first session;
4. likelihood of voluntary return after that value;
5. current quality and recovery confidence; and
6. strategic distinctiveness for Kwilt.

Do not optimize the order from page taps alone. Position affects exposure, and curiosity clicks are
not retention. For each position, distinguish:

- value page viewed;
- direct start selected;
- capability first value reached;
- onboarding resumed after interruption;
- voluntary D1, D7, and D30 return; and
- later use of the same or another capability.

Record only path IDs, position, readiness version, and bounded lifecycle events. Do not record the
person's Goal text, recipe content, chore names, financial facts, Screen Time selections, Game
content, or Chat transcript to rank onboarding.

Hold the order stable within a release so the result is interpretable. Use a deliberate holdout or
small rotation test only when Kwilt needs to separate true value demand from first-position
advantage. A verified live link, invite, or resume target can bypass the editorial order because it
is stronger evidence than the default ranking.

## Alternative A — One Outcome, One Door

### Sketch

After Welcome, the person enters a ranked horizontal reel. Each page communicates exactly one
supported first-start outcome through one illustration, a direct headline, one short explanation,
and one primary action. For example: **Make meals easier** / **Try it now**. Page indicators show
the remaining length; **Explore Kwilt** stays available in a quiet, consistent location. Swiping
anywhere reveals the next ranked outcome. Chat receives its own value page if it deserves a first-
install door; it is not squeezed into the other stories.

### What Maya sees, does, and understands

- Sees one uncluttered promise at a time.
- Can act immediately without choosing again.
- Understands that swiping reveals another kind of help.
- Learns breadth progressively rather than parsing a menu.

### Audience/persona fit

Strong for Maya when clarity matters more than complete coverage. Each page can remain warm,
concrete, and visually generous. It does not ask her to understand capability groups.

### Design-challenge answer

It maximizes recognition and action quality for each outcome, but the sequence length grows with
the number of promoted doors. The ranking policy therefore becomes highly consequential.

### System-fit note

Extends the current two-page onboarding pager and reuses capability onboarding contracts. Each
contract gains value-story content, illustration metadata, and editorial rank. The standalone card
chooser is retired.

The four-object model remains intact: the Goals door may hand into the accepted Arc/Goal question
flow, while capture remains optional and unblocked. Other capabilities retain their own native
models.

### First value

The page action starts a readiness-qualified capability FTUX; completion remains the capability's
authoritative result, not viewing or finishing the reel.

### Best when / fails when

- Best when each promoted outcome genuinely needs a distinct explanation and the eligible set is
  small.
- Fails when six or more doors make later outcomes effectively invisible, or when product teams
  fight for sequence position rather than improving native first value.

### Chat treatment

One dedicated Chat door, likely near the end of the value reel: **Ask Kwilt for help across the
app** / **Open Chat**. It shows one bounded request becoming a visible native action. This gives Chat
enough space, but its later position limits exposure; placing it first would consume the most
valuable capability-discovery position.

### Data and observability

Requires exposure-by-position and first-value/return joins using path IDs. No new personal content
data is required.

### Main risk

Exposure bias becomes product destiny: the lead outcome gains learning and retention opportunities
while later outcomes remain under-sampled.

### Primer anti-pattern check

Passes if every page is skippable, concrete, readiness-qualified, and free of broad life-improvement
hype. It fails if it becomes a mandatory feature parade or if Chat claims universal action support
that the registered capability operations cannot fulfill.

## Alternative B — Value Families With Several Doors

### Sketch

The reel contains three or four illustrated value-family pages rather than one page per outcome.
Each page tells one coherent life story and exposes two or three compact direct doors within it.
For example, a **Make home life easier** story might offer **Plan meals** and **Set up chores**;
another page might offer **Set a goal** and **Plan my week**. The user can start either action,
swipe onward, or explore Kwilt. Chat receives one final connective family page or one clearly
separated door within a final **Ask Kwilt** story.

### What Maya sees, does, and understands

- Sees the breadth of Kwilt in fewer pages.
- Recognizes related outcomes through one shared illustration.
- Chooses a concrete door without first learning native destination names.
- Understands that one part of life may be served by several Kwilt capabilities.

### Audience/persona fit

Strong for Maya if the families match how she thinks about family life. It is weaker if each page
starts to resemble a mini menu or if the family labels become vague umbrella language.

### Design-challenge answer

It keeps the sequence bounded as Kwilt grows, but spends more of each page on choice. The primary
copy and illustration must explain the family while the actions still name exact outcomes.

### System-fit note

Adds a thin value-family layer above existing onboarding contracts. A family owns no domain data
and performs no mutations; it only groups eligible doors for explanation and routing. The
production menu remains the durable destination map.

The group layer must not distort Kwilt's four-object model. Goals, Activities, and Plans can share
a story, but the copy cannot invent a new container or require Arc/Goal selection before capture.

### First value

Selecting one of the compact doors starts its existing capability-owned FTUX and native proof.
Viewing or choosing a family is not first value.

### Best when / fails when

- Best when three or four user-legible families can cover the ready paths without ambiguity.
- Fails when Chores, Screen Time, Meals, Money, Goals, and Games do not cluster naturally enough to
  support one illustration and at most three actions per page.

### Chat treatment

A dedicated final family page can explain Chat as the connective layer without repeating it on
every page. Alternatively, **Ask Kwilt** can be one door on a final **Start another way** page. Both
protect space in the main value stories, but risk framing Chat as an afterthought.

### Data and observability

Measure family exposure separately from door selection, then attribute native first value to the
selected path. This can reveal whether the family helped recognition or merely added a layer.

### Main risk

Compression creates vague copy and dense action clusters—the exact problems the current direct
outcome chooser was intended to avoid.

### Primer anti-pattern check

Passes if family names remain concrete and each action is specific. It fails if **Make life better**
style umbrellas replace real actions, if pages become dashboards of capabilities, or if the family
layer turns into a second taxonomy users must remember.

## Alternative C — One Ranked Hero, Then a Value Atlas

### Sketch

After Welcome, Kwilt gives the highest-retention hypothesis one full illustrated value page and one
direct action. Swiping again reveals a compact illustrated atlas of every other readiness-qualified
door, including Chat. Tapping an atlas item opens its full value story with a start action; **Explore
Kwilt** enters the shell immediately. Only one outcome receives automatic full-story exposure, but
all others remain visible without requiring five or six swipes.

### What Maya sees, does, and understands

- Immediately understands the one value Kwilt believes is most broadly useful.
- Can scan the rest of Kwilt's ready doors in one place.
- Chooses whether another outcome deserves a closer look.
- Reaches the real app after at most two automatic value states.

### Audience/persona fit

Strong for Maya if the lead story is broadly relevant and the atlas stays calm. It respects her
time while preserving optional breadth. It is weaker if the hero feels like Kwilt has presumed why
she came.

### Design-challenge answer

It explicitly accepts unequal exposure while containing the sequence. It gives the retention bet
maximum visual quality and makes the remainder discoverable without pretending they receive equal
attention.

### System-fit note

Reuses the full-screen interstitial for Welcome, hero, and optional story detail. It replaces the
current chooser with a richer but still bounded atlas. Contracts still filter the doors; no
capability data model changes.

The atlas is not a dashboard and carries no progress, status, badges, or completion. It is a small
set of entry choices.

### First value

Hero or atlas selection starts capability FTUX. Native first value remains unchanged.

### Best when / fails when

- Best when Kwilt is willing to make one visible product bet and wants a short default sequence.
- Fails when no single value proposition is broad enough to deserve the hero, or when the atlas
  visually collapses back into the card chooser Andrew already rejected.

### Chat treatment

Chat receives a fully visible atlas entry without crowding every capability story. Opening it gives
Chat a dedicated value explanation before **Open Chat**. This balances space and exposure better
than putting Chat last in a long reel.

### Data and observability

Compare hero starts and retention against atlas-opened stories. A controlled hero rotation can
test whether the lead advantage belongs to the outcome or the position.

### Main risk

The atlas recreates temporary chooser UI and loses the immersive, energetic quality of the value
story sequence.

### Primer anti-pattern check

Passes if the atlas is sparse, non-status-bearing, and skippable. It fails if it becomes a
capability dashboard, if hero placement is framed as what the user “should” care about, or if
rotation becomes opaque personalization.

## Alternative D — The Real Menu Is the Index

### Sketch

Welcome swipes into the actual Kwilt shell with its capability navigation already open and no
bottom overlay. The real menu is the index. Selecting a readiness-qualified group or destination
first opens its illustrated value story; from there the person can start the capability FTUX or
return to the menu. Ordinary destinations remain navigable, while unready destinations do not
receive a promoted story. Chat remains visible in its normal menu location and can open one
dedicated explanation the first time it is selected.

### What Maya sees, does, and understands

- Sees the persistent product map immediately.
- Learns where she will return later.
- Requests an explanation only for the destination she is curious about.
- Can ignore onboarding and use the real app at once.

### Audience/persona fit

Strong for Maya if the menu is already calm, legible, and organized in her language. Weak if the
current combination of groups, capability nouns, Money sub-destinations, Chat history, profile,
search, and footer actions feels like system administration.

### Design-challenge answer

It maximizes contextual truth and eliminates a disposable chooser, but provides almost no automatic
value selling. It also relies on the menu taxonomy to do first-install recognition work it was not
designed to do.

### System-fit note

Reuses the real `CapabilitySideSheet` and `CapabilityMenu`, but bends their responsibility:
first-time selection needs to intercept certain rows and route to value stories before ordinary
navigation. Group headers may need a new first-install action even though they currently only
expand and collapse.

The real capability models remain unchanged and capture stays unblocked. However, the shell needs
an intentional foreground destination behind the open menu; an arbitrary default remains an
unresolved product signal.

### First value

Selecting **Start this experience** from a requested value story enters capability FTUX. Directly
opening the ordinary destination is exploration, not onboarding completion.

### Best when / fails when

- Best when navigation learning is more important than automatic breadth communication and the
  menu itself has reached first-install quality.
- Fails when Maya sees a dense information architecture instead of understandable forms of help,
  or when intercepting normal rows makes the real menu behave unpredictably during onboarding.

### Chat treatment

Chat needs no repeated cross-sell: its real menu affordance is already visible. Its first selection
can open a dedicated value story that demonstrates one bounded cross-capability action before
entering Chat.

### Data and observability

Measure which menu rows are inspected, which value stories open, which paths start, and whether the
menu is reopened later. Avoid touch heatmaps or content capture.

### Main risk

The design teaches the product map before it establishes why the map is valuable, recreating the
very capability-taxonomy burden the onboarding strategy was meant to remove.

### Primer anti-pattern check

Passes if the menu remains optional, ordinary navigation is honest, and value stories do not block
capture. It fails if first install turns the menu into a checklist, adds badges to push exploration,
or changes row behavior in a way users cannot predict.

## Comparison without convergence

| Alternative | Story clarity | Sequence length | Exposure fairness | Teaches real nav | Space for Chat | Primary trade-off |
| --- | --- | --- | --- | --- | --- | --- |
| A. One Outcome, One Door | Highest | Longest | Lowest | Low | Dedicated but late | Clarity versus growth in pages |
| B. Value Families | Medium | Bounded | Medium | Medium | Dedicated final story | Compression versus page density |
| C. Hero + Atlas | High for lead | Shortest | Medium | Low | Visible in atlas | Strong bet versus temporary chooser |
| D. Real Menu Index | On demand | Short | High | Highest | Native placement | Context versus value articulation |

## What divergence reveals

The number-of-pages problem and the one-door-per-page principle cannot both be solved merely by
renaming capabilities as groups. The current candidate promises do not compress cleanly:

- **Set goals and make a plan** can coherently span Goals and Plan.
- **Make meals easier** can coherently span Recipes, Meal Planning, Groceries, and Cook Mode.
- **Set up household chores** and **Set up Screen Time controls** are both household-management
  moments but lead to materially different setup, authority, and first value.
- Money has several navigation destinations but one plausible first-start promise.
- Games has a distinct connection job and should not be reduced to a miscellaneous Fun slide.
- Chat crosses these paths but should not compete for a sentence on every page.

The decisive convergence question is therefore not just how many pages feel tolerable. It is which
cost Kwilt is most willing to accept:

1. a longer ranked reel with the clearest doors;
2. denser family pages with fewer swipes;
3. one dominant retention bet followed by compressed discovery; or
4. less automatic value selling in exchange for teaching the real navigation immediately.

## Review question

Which cost feels most acceptable for Kwilt: **more pages**, **more choices per page**, **one strongly
favored hero value**, or **less value storytelling before the real menu**?
