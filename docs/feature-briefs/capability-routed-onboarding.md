---
id: brief-capability-routed-onboarding
title: Capability-Routed First Install
status: accepted
audiences: [audience-aspirational-family-organizers, audience-burned-out-productivity-power-users, audience-faith-and-values-driven-builders, audience-life-transition-restarters]
personas: [Maya, Marcus, Sarah, Elena]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-move-the-few-things-that-matter, jtbd-see-who-im-becoming, jtbd-carry-intentions-into-action, jtbd-put-intention-before-impulse, jtbd-help-us-enjoy-being-together, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-guided-overture-onboarding, brief-ftux-goal-arc-onboarding, brief-screen-time-controls-contextual-setup, brief-money-progressive-activation]
exploration: docs/design-explorations/contextual-capability-entry
owner: andrew
last_updated: 2026-08-19
---

# Capability-Routed First Install

## Context

Kwilt cannot reliably know why someone installed it. A new person may want help with money,
Screen Time, meals, goals, chores, games, or Chat. First launch must therefore make Kwilt's most
valuable outcomes legible without asking the person to understand its capability map.

The first-install experience is not a temporary chooser and not a product tour. It is a short reel
of value stories. Every story is also a door into the real capability, where capability-owned
onboarding and first value continue.

The original question-led Arc, Goal, and To-do experience remains an accepted onboarding model.
Screen Time remains an accepted model for lightweight illustrated setup. Shared visual language
does not require every capability to use the same interaction model.

This brief supersedes the earlier card-chooser direction and the Guided Overture direction. It
authorizes a Developer Tools and internal-TestFlight rehearsal only. Production first launch stays
unchanged until the promotion gates in this brief pass.

## Target audience

The primary audience is `audience-aspirational-family-organizers`. Family organizers may arrive
with one live household need but no language for Kwilt's architecture. First start should help them
recognize a useful outcome, enter it directly, and reach something real they can return to.

## Representative persona

Maya opens Kwilt after hearing that it can help with family life. Kwilt cannot know whether she is
thinking about spending, Screen Time, dinner, chores, play, or a personal goal. The opening must
make breadth useful without turning her into the administrator of a new system.

## Aspirational design challenge

How might we help Maya recognize the most valuable ways Kwilt can help and enter any one of them
directly, while keeping first start calm, truthful, reversible, and grounded in real capability UI?

## Hero JTBD

The hero job is `jtbd-move-the-few-things-that-matter`: onboarding succeeds when the person begins
moving a real part of life, not when they finish a tour or merely reach a home screen.

## Job flow step

This work improves the entry into `job-flow-maya-move-family-life-forward`, especially recognizing
what matters and finding the next doable action. It does not raise a capability's delivery score by
itself; each door must still prove that its native job flow reaches first value.

## JTBD framing

When I first open Kwilt, help me recognize one practical way it can make life easier. Let me move
between the possibilities without committing, then take me into the real experience I choose so I
can act with intention and trust what the app says happened.

## Design

### Experience architecture

The unknown-intent path is:

```text
one balanced illustrated Welcome
  -> ranked value-door reel
  -> capability-specific action
  -> capability-owned FTUX in the real application
  -> authoritative native first value
```

The Welcome and every value door share one horizontally swipeable sequence. A person can swipe
left or right from anywhere on the full page. Page indicators communicate position without a
`Swipe to choose` instruction. Every door also has one explicit, capability-specific action.
**Skip tour** is available from every value door, and the person can also swipe forward past the
end of the reel.

Choosing **Skip tour**, or swiping forward past the final door, ends universal onboarding and
reveals the actual application with the capability side sheet open. The side sheet is unobscured;
no coach mark, bottom guide, page indicator, or onboarding overlay covers its destinations. At
that boundary, ordinary shell gestures take over.

An authoritative deep link, invitation, restore target, or interrupted capability checkpoint may
bypass the generic reel. Acquisition campaign interest alone is not treated as known intent unless
that context reaches the installed app in a trustworthy payload.

### Visual and interaction grammar

The Welcome and value doors use:

- Parchment as the full-screen canvas;
- a small Kwilt mark balanced against the page indicators;
- one truthful Kwilt-style illustration;
- one direct outcome headline and short supporting message;
- one capability-specific primary action and one quiet **Skip tour** action;
- the established full-screen interstitial spacing, type, and motion language; and
- equivalent VoiceOver, Dynamic Type, Reduce Motion, and non-gesture controls.

They do not use eyebrows, progress bars, top back buttons, pill-shaped chooser cards, feature
lists, `Swipe to choose`, or a mandatory Continue button. The Welcome keeps its title with the
bottom copy so the illustration and empty space remain balanced.

### Ranked doors

The provisional long-term ranking is:

1. **Use a budget to pause apps like Amazon**
2. **Make meals easier**
3. **Turn one goal into a clear plan**
4. **Tell Kwilt what you need**
5. **Share the household chores**
6. **Find a game that fits your group**

The reel promotes at most six doors after Welcome. Order is a retention hypothesis, not a claim of
validated demand. The first implementation rehearses only the first four doors. Chores and Games
remain absent until their capability onboarding and first-value paths pass the readiness contract.

Generic Screen Time is not a separate initial door in this rehearsal. The lead Money story combines
budget truth and category-specific Screen Time control. Budget-linked app blocking already exists
in other products, so Kwilt must not claim the mechanic as unique. The differentiator is its place
inside a broader, calm, reversible household system spanning Money, Screen Time, Goals, Meals,
Chores, Games, and Chat.

Chat receives one dedicated door. Its cross-capability value is not repeated as secondary copy on
every other door.

### Door and handoff contract

Every promoted door declares:

- a stable ID and rank;
- one outcome headline, supporting message, action label, and illustration key;
- its coordinator and terminal capability owners;
- its promotion state and current proof boundary;
- a typed handoff into the real application;
- an interruption and resume checkpoint;
- an authoritative first-value event and evidence source; and
- an exact native landing or recovery destination.

The universal coordinator owns Welcome, paging, selection, resumption, and shell exit. It cannot
create capability data, claim capability success, or substitute onboarding-only UI for native work.

### Initial four handoffs

#### Use a budget to pause apps like Amazon

The door opens the real Money summary with an `app-control-onboarding` entry intent. If Money is not
ready, its existing setup and recovery states remain authoritative. Once categories are available,
a contextual guide asks the person to choose the spending category they want to protect. In this
entry mode, choosing a real category opens its existing **App controls** screen directly. The person
then uses the existing private Apple picker and policy controls.

The coordinator never invents a category, guesses which category should control Amazon, or treats
route arrival as success. First value is an enabled category-specific policy with approved Screen
Time authorization, at least one opaque selected target, and a saved condition. Automated and
Simulator proof do not substitute for signed physical-device enforcement.

#### Make meals easier

The door begins the lightweight Food orientation, then opens the real Recipe library. The person
can choose an existing meal or add their own in the real Recipes UI. Household sharing, voting,
ingredient compilation, shared Groceries, and Cook Mode are progressive parts of the same meal
loop. The onboarding layer does not introduce a meal picker or other temporary application UI.

#### Turn one goal into a clear plan

The door enters the original question-led Arc and Goal experience without replaying another generic
Welcome. The accepted questions remain because they help form the first useful result rather than
merely explaining features.

#### Tell Kwilt what you need

The door opens a fresh standalone Chat with no synthetic message and no automatic send. The empty
composer and native suggestions remain authoritative. Chat retains its existing proposal,
confirmation, receipt, recovery, and capability-owner boundaries.

### Readiness contract

A door can enter the production reel only when all of the following are true:

1. It names a credible install reason in ordinary language.
2. Its promise can be fulfilled without hidden prerequisites or exaggerated differentiation.
3. One coordinator and all terminal capability owners are declared.
4. Its capability-owned FTUX has a bounded beginning, meaningful action, and end.
5. First value is an authoritative result, not a route arrival or tour completion.
6. Permissions, household authority, subscription, data, device, and regional constraints appear
   before they block progress.
7. Denial, cancellation, interruption, service failure, and relaunch have finite recovery paths.
8. The rendered experience passes Kwilt's hierarchy, copy, illustration, motion, and native
   transition bar.
9. VoiceOver, Dynamic Type, Reduce Motion, and non-gesture operation preserve meaning and access.
10. Source/tests, Simulator, signed device, backend, TestFlight, and production proof are reported
    separately and never borrowed from one another.

Failure of any gate keeps the door out. The reel does not show disabled, `Coming soon`, or concept
doors to imply breadth.

### Persistence and completion

Universal orientation state and capability progress are separate facts. The universal layer stores
the last visible page, selected door, capability checkpoint, completion receipt, and exit state per
user. Existing version-one chooser records migrate conservatively: Welcome stays Welcome, chooser
returns to the first door, a valid selected path preserves its checkpoint, and terminal exits stay
terminal. Unknown shapes reset rather than being guessed.

Relaunching an interrupted capability offers **Continue where I left off**, **Choose another
starting point**, and **Explore Kwilt**. Welcome is not replayed automatically. Choosing another
door preserves or abandons native drafts according to the owning capability's existing rules.

Universal onboarding ends when a door is chosen or the person explores Kwilt. Capability success
is recorded only when its owner emits authoritative first value.

### Illustration policy

Reuse existing illustrations when their meaning is truthful. The original Goals art may be reused.
The first rehearsal justifies new illustrations for Money plus app control, Meals, and Chat because
no current asset expresses those value stories accurately. New art must extend the existing Kwilt
line, character, texture, and palette language rather than establishing capability-specific brands.

## Learning release

The first implementation is reachable from Developer Tools only and is packaged in an internal
TestFlight build. It includes Welcome plus Money/app control, Meals, Goals, and Chat; full-page
bidirectional paging; page persistence; direct native handoffs; accessible equivalent actions; and
the unobscured capability side-sheet exit.

Production entry policy and the current first-launch fallback remain unchanged. Chores and Games
are not present. No server migration is required for the universal layer.

## Success signal

A clean-account tester can:

- understand the Welcome without feeling forced through a heavy intro;
- identify the four distinct value stories;
- swipe either direction anywhere on the page and operate the same sequence without gestures;
- enter every door through its explicit action;
- arrive in real Money, Food, Goals, or Chat UI with truthful next guidance;
- choose **Skip tour** and see the real capability menu unobscured; and
- relaunch from every checkpoint without replaying or losing meaningful capability progress.

Rendered hierarchy and handoff acceptance by Andrew are required. Production promotion additionally
requires current evidence for every promoted door at the lifecycle where its promise actually runs.

## Deferred decisions

- Whether Chores or Games earns the fifth position first.
- Whether Explore becomes a credible install-reason door or remains ordinary capability discovery.
- Whether validated acquisition context should reorder the reel while still preserving all doors.
- Whether observed retention supports the provisional ranking, especially Money in the lead slot.
