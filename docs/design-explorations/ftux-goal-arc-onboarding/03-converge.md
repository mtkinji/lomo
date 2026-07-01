# Converge: ftux-goal-arc-onboarding

## Chosen Direction

Ship one deterministic FTUX flow that creates both:

- an identity-shaped Arc,
- a concrete first Goal linked to that Arc.

After confirmation, land on the Arc detail screen with the first Goal visible.

## Capability Delta

Today, FTUX can create an Arc, but concrete-first users may struggle to produce Arc-shaped input. A Goal may exist in product state later, but it is not the default first-run output of the identity survey.

After this concept ships, a first-time user can start with a concrete input like `Tennis`, answer deterministic universal questions, and leave onboarding with:

- Arc: `The Practice Builder`
- Goal: `Practice tennis consistently for the next 4 weeks`
- Goal linked to Arc
- Landing surface: Arc detail

Still intentionally not supported:

- AI-generated survey choices.
- Creating only a Goal in FTUX.
- Creating sport/project-specific tracking surfaces.
- Requiring first Activity scheduling before the user can enter the app.

## Deterministic FTUX Sequence

1. `What kind of thing is it?`
   - deterministic category options
2. `Name it in a few words.`
   - short free text
3. `What do you want to do with it?`
   - deterministic progress-intent options
4. `What matters most about it?`
   - deterministic meaning options
5. `Who is this helping you become?`
   - deterministic identity-bridge options

Resistance and support-style questions are deferred until after the first activation payoff.

## Output Contract

The generation step must produce:

- `arcName`
- `arcNarrative`
- `goalTitle`
- `goalDescription`
- optional `firstActivitySuggestion`

Hard constraints:

- Arc name cannot be only the concrete input.
- Goal title must be concrete and time-oriented when possible.
- Goal must be linked to the Arc on save.
- First Activity suggestion is optional and must not block completion.

## Landing

Land on Arc detail.

Required first-run landing content:

- Arc identity hero.
- First linked Goal visible in the Goal section.
- Primary next action: plan/add first Activity.

Why not land on Goal detail:

- FTUX payoff is the context: "this concrete thing belongs to a bigger becoming."
- Landing on Goal would reinforce the wrong hierarchy.

## Accepted Trade-Offs

- More generation complexity than Arc-only FTUX.
- More persistence complexity because two objects are created together.
- Slightly more testing required around partial failure and linkage.

## Rejected Trade-Offs

- Goal-first with optional Arc creation: drop-off risk is too high and weakens Kwilt's identity model.
- Arc-only with suggested Goal: still asks users for Arc language too early.
- Full review/editor before save: useful later, but too much FTUX friction for V1.

## Bet

We're betting that first-run task success improves when Kwilt starts from concrete progress but completes the identity context in the same flow. If this is wrong, users will either reject the generated Arc as forced or fail to understand why they landed on the Arc after entering a concrete goal.

## Success Signal

In manual FTUX QA, users can complete cases like `Tennis`, `Prayer`, `School assignments`, `Repair friendship`, and `Stop scrolling at night`, then explain the output as both "what I am working on" and "who I am becoming."
