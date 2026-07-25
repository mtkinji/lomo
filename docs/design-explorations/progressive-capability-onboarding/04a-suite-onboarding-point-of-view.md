# Broadened Point of View: Onboarding Into a Life-Assistance Suite

**Status:** Reopens the earlier Agent-hosted task-router convergence and pauses its learning
release. This is a product-model reset, not a UI refinement.

## Executive Point Of View

Kwilt should not onboard people into Goals, a workspace, a household, a capability catalog, or a
blank Agent conversation.

Kwilt should onboard people into a **guided relationship with a broad life-assistance system**:

> Learn just enough about what would be useful now, recommend one concrete starting path, produce
> one native result, preserve one relevant next possibility, and let the rest of Kwilt remain
> available without demanding setup.

Call this model **Guided Relevance**.

Its operating rule is:

> **One now. One next. The full map when wanted.**

- **One now:** one concrete task or outcome path that can create real value.
- **One next:** one adjacent possibility held lightly, not promoted during the first-value moment.
- **The full map:** Option G and Agent remain available for exploration at any time.

This is more guided than a capability menu or blank chat, but less presumptuous than an identity
survey, forced Goal, household setup, or algorithmic life diagnosis.

Agent should host and remember the guidance. Capabilities should still own their data, setup,
permissions, mutations, native results, and recovery.

## What Changed In The Problem

The original Kwilt product had a coherent universal theory:

```text
meaningful identity direction
  -> Arc
    -> Goal
      -> Activities
        -> Plan and reflection
```

That theory remains valuable for people who want help becoming someone or moving a meaningful
goal into action. It no longer describes the universal admission path to a suite that can also
help someone:

- understand spending and save money;
- choose healthier device boundaries;
- coordinate responsibilities with another person;
- play a game together;
- preserve a story or memory;
- plan meals or maintain a home;
- join an existing shared context; or
- ask for help before knowing which capability applies.

The design problem is therefore not “how should Goals onboarding become progressive?” It is:

> How does a broad, mostly download-led product give an unscoped person enough bearings to find
> personally relevant value, without making them learn the suite, declare their whole life, or
> create structures they may never need?

## Restated In User Voice

When I download Kwilt, I may know only that it could make some part of my life or family work
better. Help me recognize what that could mean for me, choose one useful place to begin, and get a
real result without asking me to understand all of Kwilt or commit my life to a model I have not
yet experienced. As Kwilt earns context, help me discover other relevant ways it can help—without
turning my age, family, behavior, or private data into presumptuous conclusions.

## The Category Point Of View

Kwilt should not think of itself as a conventional “super app.” Most super apps are distribution
platforms in which a host exposes many services or third-party miniapps. Research on that model
describes an OS-like host, miniapp stores, and significant cross-service security and privacy
trade-offs. Kwilt is instead one product team building a coherent set of native, bounded
capabilities around one person and their chosen relationships. ([super-app security survey](https://arxiv.org/abs/2306.07495))

A better working category is:

> **A personal and family life-assistance suite.**

The suite is unified by:

- one identity and continuity layer;
- one calm shell and Agent;
- one permission and trust philosophy;
- native capabilities that do materially different jobs; and
- scoped ways for people to act together.

It is not unified by one universal domain object. That distinction determines the onboarding.

## What The Analogs Actually Teach

The useful question is not “which app has the best onboarding?” It is “what truth lets that app
justify its first required structure?”

| Product or pattern | First organizing move | Why it works there | Lesson for Kwilt |
| --- | --- | --- | --- |
| Slack | Create or join a workspace | The workspace is where the people, communication, tools, and information live; without it there is no Slack job | Do not copy workspace creation unless all meaningful Kwilt value truly belongs to one shared container—it does not. ([Slack](https://slack.com/help/articles/206845317-Create-a-Slack-workspace)) |
| Apple Family Sharing | An adult optionally creates a family group and invites people | The group is a cross-service sharing and authority boundary, but an individual Apple Account remains useful without it | Family structure can span capabilities, but it should appear when shared value or child authority is real, not as universal personal setup. ([Apple](https://support.apple.com/en-us/108380)) |
| Google Families | Create a family group to share selected services; some product actions can create the group | The group coordinates specific cross-product benefits, roles, purchases, and supervision | A shared substrate can be created from the triggering family job rather than demanded at first launch. ([Google](https://support.google.com/families/answer/7103337)) |
| Life360 | Join an invited Circle or choose among adding people, a Tile, or a pet; skipping is available | Location and connected-object awareness are the central product jobs, so a Circle or object creates immediate meaning | Route-specific invitations and a small starting choice set are useful; a social container is justified only when connection is the core value. ([Life360](https://support.life360.com/hc/en-us/articles/23053525850519-Create-a-Life360-Account)) |
| Monarch Money | Connect financial accounts, then work through an ordered but skippable setup guide | Connected financial data is the prerequisite for almost every downstream promise | Each Kwilt capability may have a strong local prerequisite and guided sequence; that does not make the prerequisite global to Kwilt. ([Monarch](https://help.monarch.com/hc/en-us/articles/360048393272-Getting-Started-with-Monarch)) |
| Notion | Seed the workspace with templates chosen from onboarding answers | Templates reduce blank-canvas anxiety and make an abstract tool concrete | Kwilt should recommend concrete starter paths, but avoid creating speculative Goals, households, budgets, or lists merely to make the app look populated. ([Notion](https://www.notion.com/help/start-with-a-template)) |
| Chat-first products | Present an open composer, sometimes with examples | The user can express almost any intent without learning a menu | Agent is a powerful ambiguity resolver, but an empty prompt transfers the product-model problem to a user who does not yet know what the product can do. |
| Progressive disclosure | Teach controls at the surface and moment where they become relevant | People avoid front-loaded instruction and nonessential setup | Global entry should establish bearings; capability learning and permission requests remain contextual. ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/onboarding)) |

### Research implications

“Too many choices” is not a sufficient diagnosis. A meta-analysis of 50 experiments found a mean
choice-overload effect near zero with substantial variation. The important conditions include
preference uncertainty and decision difficulty—not simply the raw number of options. Kwilt should
therefore reduce **decision complexity**, not dogmatically limit every first screen to two cards.
([Scheibehenne, Greifeneder, and Todd](https://ideas.repec.org/a/oup/jconrs/v37y2010i3p409-425.html))

Cold-start recommendation research supports asking for a small amount of explicit input, while
also warning that one fixed seed set is unlikely to fit diverse new users. For Kwilt, this argues
for a short adaptive orientation rather than one universal task list or passive inference.
([Nguyen et al.](https://proceedings.mlr.press/v244/nguyen24a.html))

Self-determination theory offers a particularly useful quality test for Kwilt's ambition to help
people live better. The first experience should support:

- **autonomy:** the person can answer, type, skip, browse, or correct the proposed path;
- **competence:** the person reaches a result that makes some part of life feel more workable; and
- **relatedness:** connection is available and meaningful without becoming mandatory exposure.

Those needs are associated with healthier motivation and well-being; “make people happier” should
be treated as a downstream consequence, not an onboarding claim or score.
([Deci and Ryan](https://doi.org/10.1207/S15327965PLI1104_01))

## Kwilt's Universal Root

Slack can start with a workspace because the workspace is its universal root. Kwilt needs a
different answer.

The universal root is:

> **A person with a private Kwilt, an evolving understanding of what help is relevant, and scoped
> relationships that are added only when real participation requires them.**

That breaks into four distinct concepts:

### 1. Person

The durable human identity and private account. This exists for everyone.

### 2. Personal Kwilt

The person's default, private continuity boundary. It should be created invisibly with the
account, not named or configured like a workspace. It can eventually unify the person's own
Activities, Goals, Money, memories, game history, preferences, and Agent context without implying
that every capability can freely read every other one.

### 3. Relevance map

A small, revisable model of what the person has explicitly said would be useful now, what Kwilt
has already helped with, and which possibility may be relevant next. This is not a personality
profile, life score, capability-completion checklist, or permanent persona label.

The user-facing expression may simply live in Agent as “what we're working on” and “something we
could do next.” The product does not need to expose the term *relevance map*.

### 4. Scoped relationships and Spaces

A live share, support relationship, dependent child, or repeated group activity creates exactly
the participation structure it needs. A named Space appears only when durable repeated
coordination earns it. This preserves the accepted person-centered Spaces architecture.

Kwilt therefore does **not** ask every new user to create a family, household, Circle, or Space.
Someone who arrives through an invitation reviews and joins that scoped context. Someone who
starts alone remains fully functional until a task requires another person.

## The Recommended Onboarding Architecture

Onboarding becomes a lifecycle rather than a funnel.

```text
arrival
  -> resolve explicit context if present
  -> establish account and required safety boundaries
  -> guided orientation when intent is unknown
  -> propose one starting path
  -> native capability produces first value
  -> retain one relevant next possibility
  -> expand or connect only when a real next job appears
  -> periodically reorient when life or the product materially changes
```

### Stage 0: Resolve the door used

An invite, object link, restore target, widget, Shortcut, referral promise, or explicit App Store
campaign is stronger evidence than onboarding answers. Honor it first.

Most organic downloads will be unscoped. The architecture must work well without pretending the
download itself reveals intent.

### Stage 1: Establish only universal prerequisites

Before usefulness:

- authenticate or restore the correct account;
- resolve blocking account or data-safety conditions;
- determine age-related eligibility or guardian consent only where the experience or law requires
  it; and
- accept app-wide legal terms only if explicit versioned acceptance is actually required.

Do not request notifications, contacts, location, photos, microphone, calendar, financial
connection, Screen Time, household roles, or subscription choices globally.

### Stage 2: Give bearings through a short guided orientation

For an unscoped download, Agent should not begin with an empty composer or a capability grid. It
should ask one bounded question:

> **What would make Kwilt useful today?**

The response surface combines:

- a small set of concrete, currently deliverable examples;
- a free-text answer;
- **Show me what Kwilt can help with**; and
- **I'll look around**.

Examples must be tasks or observable decisions, not generic promises:

- **Put what I need to do tomorrow in one place**
- **Turn something important to me into a next step**
- **See where my money went last month**
- **Coordinate a responsibility with someone**
- **Choose apps to block for myself or my child**
- **Start something fun with people nearby**
- **Save a story I don't want to lose**

The list shown in one session should be shorter than this full research set. It should be selected
from product availability, declared context, and safe priors—not from passive sensitive inference.

The leading visual expression of this stage is now explored in
[04b-guided-overture.md](04b-guided-overture.md): show several task transformations in quick
succession, settle those same scenes into starting choices, then let the user choose one, name
something else, or look around. This is intended to make the suite's breadth legible without
turning orientation into a product catalog or a swipe-through feature tour.

Agent may ask one follow-up when the first answer is too broad or when authority changes the path.
For example, **Choose apps to block** may require distinguishing self-control from managing a
child's device. It should not ask a generic demographic questionnaire before knowing why the
answer matters.

### Stage 3: Recommend a starter path, not a capability

Agent reflects the answer as a proposed path:

```text
You said tomorrow feels scattered.

Start here
Put tomorrow's obligations in one place.

After that, if useful
Choose what gets protected on your calendar.

[Start]  [Change this]  [Look around]
```

The recommendation names what will happen and any required setup. It may explain why this route
fits the person's answer, but it does not claim to understand the person's life.

This is the first expression of **one now, one next, full map**.

### Stage 4: Let the capability create the value

The selected capability owns its native first-value journey:

- Goals may create a Goal and, when meaningful, an Arc.
- To-dos may capture an unanchored Activity immediately.
- Money may connect an account and show transaction-backed truth.
- Games may start a playable session with almost no setup.
- Screen Time may explain authority, request authorization, and apply a real policy.
- Stories may capture text first, asking for photos or microphone only when chosen.
- Shared work may create or join the least participation structure required.

Agent does not simulate these outcomes or duplicate their permissions.

### Stage 5: Return with continuity, not celebration clutter

After first value, keep the user at the native result. Agent records the authoritative result and
can later continue from it.

Do not immediately interrupt with another capability. The “one next” possibility should be
available when the user returns to Agent, finishes the current task, or explicitly asks what else
Kwilt can do.

### Stage 6: Guide expansion over time

Kwilt should earn breadth through demonstrated relevance:

- a completed planning task may make calendar placement relevant;
- recurring grocery activity may make a shared list relevant;
- transaction history may make a savings target relevant;
- a repeated game group may earn a durable Space;
- a captured story may make inviting one person relevant;
- a child's device setup may make a scoped caregiver relevant.

Every expansion proposal must state the evidence, the new value, and the data or authority it
would use. The user can choose **Not now**, **Don't suggest this**, or **Change what Kwilt is helping
me with**.

### Stage 7: Reorient without replaying onboarding

Life circumstances and product breadth change. Agent should occasionally offer reorientation when:

- the user explicitly asks what else Kwilt can do;
- a major new capability becomes available and matches declared interest;
- an old path is stale and the person asks for a fresh start;
- a new relationship or dependent changes what collaboration is possible; or
- a significant product change genuinely alters consent or understanding.

This is not a recurring setup nag. Dormant capabilities are normal.

## The Role Of Agent

Agent should be the **guidance layer**, not the universal data owner and not merely another
capability tile.

Agent's onboarding responsibilities are:

- interpret stated intent;
- reduce the suite to a few relevant, currently real paths;
- explain why a path was proposed;
- remember user-approved “now” and “next” context;
- hand off to the native owner;
- retain the result and exact return target; and
- help the person reorient later.

Agent must not:

- infer a life diagnosis from age, taps, spending, or family data;
- create empty structures to make onboarding appear successful;
- claim native value from a navigation event;
- become a required interstitial for exact links or invitations;
- hide the full product behind conversation; or
- recommend capabilities that are unavailable or cannot deliver the described task.

The first Agent state should therefore be **guided but conversational**: concrete options, free
text, and browse access together. Neither task cards alone nor a blank composer is enough.

## How Personalization Signals Should Be Used

Use the strongest legitimate signal available and preserve uncertainty.

| Signal | Strength | Appropriate use | Inappropriate use |
| --- | --- | --- | --- |
| Accepted invite or exact task link | Authoritative for that route | Open the exact review or native task | Generalize consent to other people, data, or capabilities |
| Existing capability data or safe resume target | Strong | Restore value or offer a precise continuation | Replay beginner onboarding or infer unrelated needs |
| User's current free-text request | Strong | Interpret and propose a route | Silently mutate high-risk state or overclaim understanding |
| Explicitly selected task or outcome | Strong | Build the current relevance map | Treat it as a permanent identity label |
| Declared relationship or role | Medium and contextual | Choose the correct authority, language, and participation path | Create a household or expose family data automatically |
| Declared age range | Safety and eligibility signal | Tailor legal eligibility, language, defaults, communication, and guardian flows | Predict whether someone wants Goals, Money, Games, family help, or productivity coaching |
| App Store campaign or referral source | Weak-medium | Order likely starting examples and measure acquisition promise | Bypass confirmation or assume sensitive intent |
| Device state or available integrations | Weak contextual | Avoid offering impossible routes | Treat availability as desire |
| Passive cross-capability behavior | Weak and sensitive | At most generate a transparent, dismissible hypothesis after repeated evidence | Quietly profile family, finances, health, identity, or vulnerability |

### Age specifically

Age may be necessary for safety, legal eligibility, child/guardian relationships, and
age-appropriate communication. It is a poor proxy for what outcome matters now.

Where age is required, prefer privacy-preserving age ranges and request them at the point where
the product needs to differentiate the experience. Apple's Declared Age Range API is designed to
share only an age band, allows a person or guardian to decline, and avoids revealing a birthdate.
([Apple Declared Age Range](https://developer.apple.com/documentation/DeclaredAgeRange))

The product should ask **why age matters here** before asking age—not gather it because it might
improve recommendations someday.

## Connection And The Slack Analogy

Slack begins with a workspace because work communication is structurally many-person and every
channel belongs somewhere. Kwilt's jobs are mixed:

- some are deeply private;
- some are personal but supported by another person;
- some are shared copies;
- some have one live source and scoped participants;
- some require durable family authority; and
- some are temporarily co-played.

Forcing all of these into a household or workspace would make solo use feel empty and shared use
overbroad.

Kwilt's equivalent of Slack's “create or join” split should appear only when connection is the
arrival context:

```text
invited arrival
  -> preview who invited me, what is shared, what I can do, and what remains private
    -> accept or decline
      -> native shared value

unscoped arrival with a shared job
  -> choose the concrete shared task
    -> identify or invite the minimum people
      -> create the least structure required
        -> earn a named Space only for durable repeated participation
```

This preserves connection as a major product outcome without turning every person's Kwilt into a
workspace.

## The Missing Product Taxonomy

The current JTBD taxonomy is still centered on the Goals-era product:

- see who I'm becoming;
- move the few things that matter;
- capture and find meaning;
- make sense of a season;
- invite the right people in; and
- trust Kwilt with my life.

Those remain important, but they do not yet provide first-class demand language for Money, Games,
home and meals, memories, family device support, or everyday coordination. This is now a product
strategy gap.

Before a permanent onboarding system ranks or recommends the whole suite, Kwilt needs a broader
outcome taxonomy. A provisional internal grammar is:

- **Move:** do, plan, or finish something that matters.
- **Understand:** see what is happening in money, time, behavior, or a season.
- **Protect:** create boundaries around attention, spending, privacy, or responsibility.
- **Coordinate:** share, assign, decide, or keep people in sync.
- **Enjoy:** play, make, remember, or connect for its own sake.
- **Become:** pursue a meaningful direction through Arcs and Goals.

These are not final navigation labels or onboarding copy. They are a test of whether Kwilt can
organize user demand more broadly than its capability inventory while still generating concrete
tasks. Each capability can serve several outcomes; each outcome can be served by several
capabilities.

The taxonomy must be researched and linked to audiences/job flows before it becomes a routing
model. Onboarding cannot be more strategically coherent than the jobs it is routing toward.

## What The First-Run Experience Should Feel Like

The desired emotional sequence is:

1. **I have bearings.** I can see examples of what Kwilt actually helps with.
2. **It heard the part that matters.** The proposed start reflects what I selected or said.
3. **I remain in control.** I can change it, type something else, or browse.
4. **This did something real.** I reached native value, not a configured empty system.
5. **There is more here, but I don't need it now.** Breadth feels reassuring rather than
   demanding.
6. **Kwilt can remember and connect the pieces—with my permission.** Continuity becomes the
   advantage of the suite.

## Models Explicitly Rejected

### Goal-first for everyone

Retain as an excellent starter path for identity or aspiration demand. Reject as the universal
schema for Money, play, household coordination, memories, and device control.

### Workspace- or household-first

Reject because personal value does not require a group and shared authority differs by capability.
Create or join participation structures only when the job requires another person.

### Capability picker

Reject as the primary first-run assignment. It asks the user to translate a life need into Kwilt's
internal taxonomy before Kwilt has helped.

### Blank Agent

Reject for unscoped downloads. It offers infinite flexibility but little product comprehension.
Keep free text alongside guided examples.

### Exhaustive life survey

Reject because it delays competence, invites overcollection, and turns provisional answers into a
false theory of the person.

### “Set up all of Kwilt” checklist

Reject because capability breadth is not user progress. A checklist may be appropriate inside a
connection-led capability such as Money, but not across the suite.

### Pure task router

Reject as the complete onboarding model. It can start a task but does not by itself help an
unscoped person understand Kwilt's breadth, choose among unfamiliar possibilities, or develop a
longer-term relationship with the suite.

### Passive predictive weave

Reject for initial personalization. Sensitive cross-capability inference may feel powerful but
would undermine the trust required for a life-assistance system.

## Product Principles

1. **Orient before routing when intent is unknown.** A little guidance is necessary for a broad
   suite.
2. **Route before teaching when intent is known.** Exact context outranks generic orientation.
3. **Ask for the minimum useful truth.** Every question must change the proposed path or a safety
   boundary.
4. **Recommend paths, not product nouns.** Describe what the person can do and receive.
5. **One now, one next, full map.** Preserve focus, continuity, and autonomy together.
6. **Let native value teach the capability.** Do not front-load interface instruction.
7. **Permissions belong to the value exchange.** Shared OS access is not a reason for global
   prompting.
8. **The person is universal; participation is scoped.** Do not force a household container.
9. **Age protects; it does not diagnose.** Use it for safety and eligibility, not presumed needs.
10. **Breadth must be earned.** Expansion follows declared or demonstrated relevance.
11. **Happiness is not a setup metric.** Support autonomy, competence, relatedness, relief, and
    meaningful connection; do not score a person's life.
12. **The relevance map belongs to the user.** Make it inspectable, correctable, dismissible, and
    forgettable.
13. **Portfolio growth must not lengthen first-run.** Capabilities contribute truthful task
    offers; Kwilt selects a short, diverse composition and keeps the full map available.

## Provisional Product Promise

The Goals-era promise can broaden without becoming generic wellness language:

> **Kwilt is one place to get practical help with life—what you need to do, understand, protect,
> remember, or do with other people.**

This is not final marketing copy. It is a product-design test: every first-run example should make
one part of that sentence tangible.

“Be more productive, happier, connected, and save money” is useful as an ambition, but weak as
interface language. Productivity and happiness are aggregate outcomes. Onboarding should offer
specific ways to make tomorrow easier, see spending clearly, protect attention, coordinate with a
person, or do something enjoyable together.

## Implications For The Existing Exploration

The earlier **Agent-Hosted Context-First Task Routing** convergence was directionally correct in
four ways:

- Agent is the right guidance host for unscoped entry.
- exact routes should bypass generic onboarding;
- capabilities own activation and permissions; and
- user-facing offers must be concrete tasks.

It was incomplete in three important ways:

1. It assumed choosing from a short task set was sufficient orientation.
2. It optimized the first action without defining how Kwilt guides breadth over time.
3. It relied on a Goals-era JTBD taxonomy that does not yet organize the complete suite's demand.

Therefore:

- `03-converge.md` should be treated as reopened.
- `04-learning-release.md` should not move into implementation.
- the next design phase should define and compare several versions of Guided Relevance, including
  structured choice, short Agent dialogue, and a hybrid orientation-to-starter-path experience.
- the broadened demand taxonomy should be researched in parallel with that divergence, not buried
  inside task copy.

## Stated Bet

We're betting that an unscoped person does not need to understand all of Kwilt or declare their
whole life. They need enough concrete examples to recognize themselves, one trustworthy
recommendation they can correct, and one real result that proves the suite can help.

We're also betting that Kwilt's long-term advantage is not merely having many capabilities. It is
remembering what the person has chosen, connecting capabilities and people with explicit scope,
and guiding the next relevant move without making the person maintain the system.

If users still feel lost after a guided first result, we should strengthen the persistent map and
reorientation model. We should not respond by restoring universal Goal creation, forcing a
workspace, or expanding the first-run survey.

## Decisions Still Needed

1. What broader outcome/JTBD taxonomy truthfully covers Money, Games, home, memories, Screen Time,
   connection, and personal growth?
2. What is the smallest first orientation that creates bearings without feeling like a survey?
3. Should “one next” live only in Agent, appear on return, or also have a calm shell expression?
4. How does Kwilt explain cross-capability continuity and let a person inspect or revoke it?
5. What capability coverage must exist before broad suite examples can be shown honestly?
6. Which audiences should pressure-test first-run variants beyond Maya: Marcus, Nina, a teen, a
   returning Money user, and an invited caregiver are the minimum set.

## Recommendation

Adopt **Guided Relevance** as the strategic onboarding point of view, not yet as an implementation
spec.

The next artifact should re-diverge around three materially different expressions of the model:

1. **Guided choices:** two adaptive questions followed by a starter path.
2. **Guided Agent:** a bounded conversational orientation with concrete answer suggestions.
3. **Hybrid map:** a visual “ways Kwilt can help” map that narrows into Agent-guided selection.

Each must prove the same contract: one now, one next, full map; no universal Goal, workspace,
household, permission bundle, or passive life diagnosis.

The user's Avatar-opening metaphor produced a promising expression of the third option. See
[04b-guided-overture.md](04b-guided-overture.md) for the **Show -> Settle -> Choose** concept and
three budget-conscious production forms. The user selected this direction for learning-release
planning; [03a-converge-guided-overture.md](03a-converge-guided-overture.md) records the revised
convergence.

The user's scalability requirement is developed in
[04c-scalable-overture-system.md](04c-scalable-overture-system.md). The critical separation is
capability-owned offers and native value, with shell-owned selection, pacing, and presentation
budget.

The non-disruptive test plan is defined in
[04d-guided-overture-learning-release.md](04d-guided-overture-learning-release.md): begin with a
replayable internal lab, graduate to a production-hidden internal TestFlight route, and only then
consider a mutually exclusive first-run variant for fresh internal test accounts. The current
Goals-and-Arc onboarding remains the default throughout those first two stages.
