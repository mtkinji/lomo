# UI Contract: Welcome and Capability Chooser

## Job

When Kwilt cannot know why someone installed it, the person needs to recognize one concrete kind of
help and choose it, so the right capability can begin its own first-time experience.

## Authority chain

1. Andrew's rendered-flow corrections on 2026-08-19.
2. `FirstTimeUxFlow` illustration, spacing, and motion grammar.
3. `FullScreenInterstitial`, Kwilt tokens, `Button`, `Logo`, and `Icon`.
4. React Native and iOS accessibility conventions.

The universal Welcome and capability chooser use Parchment as their calm canvas. Kwilt Pine carries
the mark, page position, icons, and quiet actions rather than filling the screen. Capability-owned
walkthroughs can introduce stronger color after the person has chosen a path.

## Three-second read

- Welcome: human illustration -> bottom welcome message -> page dots.
- Chooser: What do you want help with? -> four direct paths -> quiet exits.

## Primary action

Choose one capability path. Each path has one card and one typed handoff.

## Primary information

- Set goals and make a plan.
- Make meals easier.
- Set up household chores.
- Set up Screen Time controls.

## Secondary information

`Something else` and `Explore Kwilt` remain visually quiet because they are exits, not competing
capability promises.

## Reveal later

Supporting explanations, capability names, permissions, setup requirements, and first actions belong
to the selected capability's onboarding. They do not appear in the chooser cards.

## Scan order

Welcome: quiet Kwilt mark -> illustration -> bottom welcome message -> page dots.

Chooser: title -> path cards -> page dots -> quiet exits.

## Must not add

- An eyebrow that repeats Kwilt or restates the title.
- A generic white app-shell surface that loses the warmer Parchment onboarding canvas.
- A saturated full-screen canvas on the universal Welcome or chooser.
- A top Back button.
- Multiple Goals / To-dos / Plan paths that lead into the same original questionnaire.
- Supporting paragraphs inside every chooser card.
- An onboarding-only version of UI already available in the capability.

## Reuse map

- Full-color moment -> `FullScreenInterstitial`.
- Brand identity -> `Logo`.
- Welcome art -> `assets/illustrations/welcome.png`.
- Choice surface -> localized Kwilt card surface and `Icon`.
- Capability transition -> typed `CapabilityOnboardingHandoff`.

## Nearest precedent

`FirstTimeUxFlow` is the accepted composition precedent: a central illustration surrounded by
negative space, with the welcome title and explanation anchored at the bottom. The universal
two-page introduction uses a horizontal swipe and two quiet page dots rather than a numbered
progress bar, instruction label, or Continue button. The Kwilt mark remains a quiet Pine orientation
cue on Parchment rather than another focal point. The chooser differs because it presents several
mutually exclusive paths.

## Behavior sources

- Unknown intent and one chooser: accepted capability-routed onboarding brief.
- One original Goals path and Chores inclusion: Andrew's 2026-08-19 correction.
- No top Back and no onboarding-only picker: Andrew's rendered-flow review.
- Something else and Explore Kwilt: accepted finite exit architecture.

## Required states

Welcome, chooser, path selected, capability interruption/resume, Something else, and Explore Kwilt.
Production still filters paths by capability promotion state.

## Proof path

Developer Tools -> Play capability onboarding -> swipe to the chooser -> inspect on iPhone 17 Pro,
iOS 26.5 Simulator -> select each visible path and verify its typed native handoff.
