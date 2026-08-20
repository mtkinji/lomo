# Frame: Contextual Capability Entry

## Review cadence

Check in after each phase. This exploration reopens one architectural decision in the accepted
capability-routed onboarding brief: whether the unknown-intent choice belongs on a separate
onboarding page or can be taught more truthfully through Kwilt's real capability navigation.

The full-surface gesture is a fixed interaction requirement for the introductory pager: a person
can swipe left or right from anywhere on the page, with page indicators and an equivalent
accessible action. The design question is whether the second state should still be a page in that
pager.

## What the user said

> I should be able to swipe left/right anywhere on the page to transition.

> I'm also now thinking that the second page could actually just be a drawer over the application
> itself. Like, the app could load with the left nav visible, and maybe we could use a bottom guide
> to teach them that they could pick any of those capabilities to explore first.

> It's certainly contextual, and I like that. And it teaches, it potentially teaches the real UI,
> which I also like.

## Restated in user voice

When I first open Kwilt, do not make me learn a temporary chooser that disappears as soon as I use
it. Let me see the real places Kwilt can help and choose one in the same interface I will use later.
Explain just enough for me to understand that I can start anywhere, then let the capability I pick
guide me to a real result.

## Target audience

`audience-aspirational-family-organizers` — Aspirational family organizers.

Maya is the strongest pressure test because she may arrive with dinner, chores, spending, play,
Screen Time, or a personal goal in mind, but should not need to understand Kwilt's information
architecture before receiving help. A contextual entry can reduce the gap between onboarding and
ordinary use, but it becomes wrong for Maya if it turns first launch into browsing a product map or
administering a system.

## Representative persona

Maya, opening Kwilt for the first time with a live but not necessarily well-named need.

- Current situation: Kwilt has no reliable knowledge of why she installed it.
- What she is trying to do: Recognize a useful place to begin and get help without learning a
  productivity methodology.
- Emotional tension: She is open to breadth if the app makes that breadth feel useful rather than
  overwhelming.
- What would make this feel wrong: A duplicate navigation model, internal product terminology,
  unready destinations, a dense menu presented as a tour, or a guide that blocks the controls it
  is trying to teach.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — Help me make real progress in the few areas I most want to
grow.

The trust guardrail is `jtbd-trust-this-app-with-my-life`: first launch should show the real
product truthfully, make clear what is selectable, and avoid promising a polished first path where
one does not exist.

## Job-flow step

This exploration primarily serves the transition into Maya's job flow rather than replacing its
native steps:

1. Arrive with one live need but no trustworthy intent payload.
2. Recognize where Kwilt can help without learning the whole suite.
3. Choose one starting point.
4. Enter a capability-owned first-time experience.
5. Produce a real native result and know where to return.
6. Keep using Kwilt because the system feels helpful, not fussy.

The weak step is **recognize where Kwilt can help and choose one starting point**. The current
development flow answers it with a purpose-built outcome chooser. That is clear and readiness
gated, but it is temporary UI: after selection, the person must separately learn the capability
menu that actually organizes Kwilt.

The real menu removes that translation cost, but creates a different risk. It exposes the product's
complete destination taxonomy — including multiple destinations for one outcome, such as Recipes
and Groceries, and several Money destinations — rather than the small set of first-install
promises Kwilt is ready to fulfill.

This also bears on the existing Maya flow's weak **See what matters** and **Know the next doable
action** steps, both scored 2, and its **Keep using the system** step, scored 3. Teaching the stable
navigation could improve re-entry; asking Maya to parse that navigation before value could worsen
all three.

## Active anchors

- `jtbd-move-the-few-things-that-matter` — The entry must route a live need toward action, not
  merely expose product structure.
- `jtbd-trust-this-app-with-my-life` — The UI shown during onboarding should be real, truthful,
  accessible, and consistent with what the person will use later.

## serves snippet

```yaml
serves: [jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life]
```

## Current system

### Universal onboarding

- `CapabilityOnboardingHost` currently owns Welcome and the capability chooser inside a full-screen
  modal.
- Welcome and chooser behave as a two-state onboarding sequence, with page indicators and a
  left-swipe entrance into the chooser.
- The chooser uses ordinary-language promises and only receives paths allowed by the onboarding
  contract for its surface.
- Selecting a path starts a typed capability-specific handoff; `Something else` and `Explore
  Kwilt` provide exits.

### Real capability navigation

- `CapabilitySideSheet` is the production left navigation. The application foreground sheet moves
  aside to reveal it, and the foreground can be swiped left to cover it again.
- `CapabilityMenu` uses the real registry and route targets. It includes grouped destinations for
  Money, Food, Goals & Plans, and Fun, plus direct destinations such as Chores.
- The menu exposes destination language, not first-install outcome language. For example, the Food
  outcome **Make meals easier** is represented by Recipes and Groceries, while Money is represented
  by Budgets, Transactions, and Accounts.
- The menu also contains profile, search, Chat, and potentially Home. It is therefore more truthful
  than a temporary chooser, but cognitively broader than the first decision requires.
- Existing capability-discovery state and dots can mark unvisited destinations after onboarding.

### Contextual education

- `BottomGuide` is an established Kwilt component for lightweight, page-level education over the
  current canvas.
- It is not the recommended first-install treatment over the open capability menu. Even without a
  scrim, the guide would obscure lower navigation rows and compete with the menu footer, making the
  real map less legible at the moment Kwilt is trying to teach it.
- The component remains appropriate for later education inside a selected capability, where its
  compact overlay can point toward one real next action without hiding a list of peer choices.

## System alignment

Constraint posture: `Question the system`

The accepted brief says the chooser is not a copy of the capability menu because a first-install
outcome may span destinations and only readiness-qualified paths should be promoted. The user's
proposal correctly challenges whether that principle requires a separate screen. Preserve the
outcome and readiness responsibilities while questioning the assumption that they need a temporary
navigation surface.

### Constraints to preserve

- One calm illustrated Welcome before the app asks for a direction.
- Unknown intent remains unknown; Kwilt helps the person choose rather than pretending to know.
- Capability-owned onboarding starts only after an explicit choice.
- Only outcomes with a credible, polished first-value journey receive an onboarding promise.
- The first decision uses direct language about the help a person wants, not vague aspirations or
  a list of internal objects.
- The person can skip guidance and explore the real app without penalty.
- Screen-reader and switch-control users receive an equivalent ordered choice and explicit actions;
  swipe cannot be the only progression mechanism.

### Constraints to challenge

- The chooser must be a second full-screen onboarding page.
- First-install outcome labels and persistent destination labels must live on different surfaces.
- The shell must stay hidden until universal onboarding is fully complete.
- Teaching persistent navigation must wait until after a person reaches a capability.
- The production menu must expose every active destination identically during first-install
  orientation.

## The product tension

The idea is strongest when framed as **progressive disclosure inside the real shell**, not simply
"replace the chooser with the menu."

The chooser currently provides:

1. user-outcome language;
2. readiness filtering;
3. one selection that can coordinate several capabilities; and
4. a typed handoff into capability FTUX.

The real menu provides:

1. truthful spatial context;
2. persistent navigation learning;
3. immediate freedom to explore; and
4. no jarring transition from onboarding UI to application UI.

The design opportunity is to combine those strengths. A successful contextual model should make
the real menu temporarily easier to understand without forking it into a separate onboarding-only
menu. It should also distinguish **where the app can go** from **which first-start journeys Kwilt is
ready to recommend**.

## Gesture implications

- On the illustrated Welcome, horizontal paging should recognize a deliberate left or right swipe
  from anywhere in the content surface while yielding to clear vertical scrolling and accessibility
  gestures.
- If the next state is the real shell with its side sheet open, it should stop pretending to be page
  2 of a carousel. The page dots end when the shell appears.
- A right-swipe return to Welcome remains available only while the first-start guide is active and
  before a capability has been selected. It needs explicit gesture arbitration with the side
  sheet's existing close gesture so the same movement never means both "cover navigation" and
  "return to onboarding."
- After a capability selection or guide dismissal, ordinary side-sheet gestures take over and
  Welcome does not become part of normal app navigation.

## Aspirational design challenge

How might we let Maya enter the real Kwilt shell and understand that she can choose the kind of
help she wants, while preserving outcome-led language, capability-readiness gates, and a clear
handoff into capability-specific first value?

## Success looks like

- Maya sees the real navigation before she is asked to memorize it.
- She can name a useful starting outcome in a few seconds without parsing the entire registry.
- Selecting a recommended start launches the same capability-specific FTUX contract as the current
  chooser.
- Unready capabilities are not elevated into first-install promises merely because they appear in
  navigation.
- Dismissing the guide leaves a usable app rather than a stranded onboarding state.
- The welcome-to-shell transition feels like entering Kwilt, not advancing to another marketing
  slide.
- Later, Maya knows how to reopen the same navigation and choose something else.

## Out of scope for this exploration

- Rewriting every capability or group label in the persistent menu.
- Designing each capability's FTUX in detail.
- Declaring currently unready capabilities release-ready.
- Redesigning profile, search, Chat, Home, or every menu footer action.
- Adding illustrations before the selected interaction model proves a missing role for them.
- Treating navigation exposure alone as successful onboarding.

## Highest-risk open question

What should the application foreground show behind the open side sheet before Maya has chosen her
first capability? An arbitrary default destination can quietly reintroduce the false idea that one
capability is Kwilt's universal door, while an empty or onboarding-only canvas would weaken the
proposal's promise to teach the real UI.
