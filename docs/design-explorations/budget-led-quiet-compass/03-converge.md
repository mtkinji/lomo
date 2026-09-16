# Converge: Editorial Lead

## Whole-journey convergence — 2026-09-15

Andrew's completed Origin walkthrough adds a second decision beyond the starter composition:
how much guided experience should precede useful app access? The [first-run plan](../../feature-briefs/kwilt-first-run-onboarding.md)
is the proposed consolidated answer. Earlier starter decisions below remain the visual foundation.

| Journey alternative | What it offers | Trade-off | Decision |
| --- | --- | --- | --- |
| Comprehensive guided intake | Origin-like ceremony, full profiles, many connected accounts, extensive personalization before entry | Attractive and thorough, but reproduces the fatigue Andrew reported and asks for information Kwilt does not need | Reject as the default |
| Immediate bare app | Authentication followed directly by the capability shell | Fast, but gives up the invitation, first-use explanation, and personal proof point Andrew valued | Keep as the returning-user/skip behavior, not the whole new-user experience |
| Brief guided start with a personal first look | Meaningful choice before auth, minimum connection, optional context, one to three grounded findings, an owned action and usable landing | Requires careful state/route continuity and truthful partial-data handling | Recommend |

### The bet

For Maya, the winning unit is not a longer tour or a faster dismissal of onboarding. It is a
short sequence in which Kwilt makes a clear promise, shows personal evidence, and helps her take
one useful next step. The emotional response to the reveal and the actual first decision are
different outcomes; measure both.

### Reduction decisions

- Keep the heavy `Control your spending` lead and the three visible alternate rows.
- Keep atmospheric continuity, fixed primary actions, and the real Kwilt mark.
- Remove repeated welcomes, mandatory profile/credit/risk intake, and requests to connect every
  account before seeing value.
- Consolidate optional conversational context into the connected/sync transition.
- Treat first-look findings as skippable and revisit-able inside Money.
- Put the budget proposal into Money's existing review/commit boundary; offer app pauses after
  the budget exists, without another mandatory setup chain.
- Do not add a notifications modal after promising to open the app.
- Preserve free alternative paths and a clearly labeled read-only preview.

### Constraint posture and remaining evidence

**Bend the entry system; fit capability ownership.** Pre-authentication choice and preview are
new entry behaviors, but Money still owns financial facts and budgets, Screen Time owns device
rules, and every other capability owns its first-value receipt. The current development-only
coordinator, demo Money injection, and missing Chores navigation target are explicit production
gates in the plan, not details that visuals can defer until after launch.

This is a recommended plan, not a user-approved final mockup or a claim of improved conversion.
The next learning release and evaluation define how to test it.

## Decision

Proceed with **Alternative B: Editorial lead**.

The first screen should feel like a calm, useful recommendation from Kwilt, not a declaration that
Kwilt is only a budgeting app. The lead offer sits directly on the Parchment canvas, with one Sumi
primary action. The three other practical ways to start remain visible as flat, directly tappable
rows.

## First-session empathy correction

The initial mockup paired `Control your spending` with `Start with Money` and too much supporting
explanation. Andrew subsequently confirmed that the heavy `Control your spending` tagline is
strong; the problem was the surrounding density and the product-centered action label:

- `Start with Money` names Kwilt's internal capability instead of the useful thing the person will
  do.
- Multiple labels, explanatory lines, and icon pairs made a simple recommendation feel like a
  product tour.
- A secondary heading before the alternatives repeated hierarchy the layout could communicate on
  its own.
- The app-control promise only needs to establish that it is optional; its mechanism belongs after
  the person chooses the spending path.

At this moment, a first-time person needs to:

1. Recognize that they downloaded the right app even if they came for goals, chores, or meals.
2. Understand why this starting point might help without learning Kwilt's product taxonomy.
3. Feel that the recommendation is optional, reversible, and not a judgment about their spending.
4. Know the concrete payoff of the next step before being asked for financial access.
5. See another valid path immediately if the recommendation does not match why they came.

The screen should therefore create this emotional sequence:

`I am in the right app` -> `this is one useful recommendation` -> `I understand the payoff` ->
`I know what my tap begins` -> `I can choose something else`.

### User-outcome lens

| Outcome | What improves it on this screen | What would damage it |
| --- | --- | --- |
| Happiness | A useful recommendation without judgment, plus an obvious escape | Restrictive language, shame, or a surprise permission wall |
| Engagement | A strong lead and three recognizable alternatives visible together | A generic tour, hidden choices, or asking the person to understand the whole app |
| Activation | An action named for the first useful outcome: building a spending plan | Internal labels such as `Money`, or counting a tap and account connection as value |
| Retention | The next flow fulfills the exact promise made here and reaches trustworthy personal evidence | A bait-and-switch into category administration or Screen Time permission before value |
| Task success | One direct route into minimum Money setup, with honest leave and resume behavior | Duplicate welcomes, dead ends, or losing the capability the person actually selected |

## Three copy and structure sketches

### A. Prescribed outcome

- Lead: `Control your spending`
- Action: `Start with Money`
- Strength: Fast and visually forceful; the lead line itself is retained.
- Failure: The internal action label and surrounding explanatory treatment make the recommendation
  feel more prescriptive and complicated than the tagline requires.

### B. Broad product orientation

- Orientation: `Kwilt helps with money, goals, chores, and meals.`
- Lead: `Start wherever life needs help.`
- Action: Four similar choices.
- Strength: Explains the breadth of Kwilt.
- Failure: Restores the catalog problem, makes the person evaluate the whole product, and gives up
  the useful lead recommendation.

### C. Welcoming recommendation

- Lead: `Control your spending`
- Explanation: `Build a simple budget. Add app controls later, if you want.`
- Action: `Build my budget`
- Secondary heading: none; the alternate rows follow the primary action directly.
- Quiet exit: `Just look around`
- Strength: Uses hierarchy instead of explanatory labels, names a concrete outcome in one short
  supporting line, and keeps every other offer visible.
- Failure condition: If people still read Kwilt as primarily a finance app, add one short breadth
  sentence near the brand mark rather than weakening the lead hierarchy.

Choose **C. Welcoming recommendation** for the next mockup.

The wording follows useful precedents without copying their product models:
[YNAB](https://support.ynab.com/en_us/your-ynab-trial-ry87vWAc) plainly describes its value as
making a plan for spending; [Monarch](https://app.monarch.com/signup/connect-spending-account)
names the actual first financial task and keeps a skip path; [Opal](https://opalapp.com/) asks the
person to choose what they want to focus on before applying a restriction. Kwilt should combine
that clarity, agency, and reversibility while keeping its broader capabilities visible.

## Qualitative comparison

| Direction | Activation clarity | Brand fit | Offer visibility | Complexity | Decision |
| --- | --- | --- | --- | --- | --- |
| Featured offer card | High | Medium-high | High if it fits above the fold | Low | Reject: risks making the recommendation feel like a promoted tile |
| Editorial lead | High | High | High | Low | **Select: clearest hierarchy with the least interface chrome** |
| Mechanism strip | High | Medium | High | Medium | Hold in reserve: use only if people cannot explain the app-pause promise |

## Why this direction wins

- It gives Kwilt a point of view without pretending every new user arrived for Money.
- It makes the primary action unmistakable while leaving every alternate offer on the first
  screen.
- It uses copy and hierarchy to explain the value rather than adding a tour, diagram, or large
  marketing card.
- It fits Kwilt's light visual language: Parchment canvas, Sumi content and controls, and Pine only
  in the small brand mark.
- It keeps the decision reversible. A person can start with Money, choose another capability, or
  look around Kwilt without granting permissions or committing to setup.

## System alignment

This direction bends the current first-install system but preserves its important boundaries.

- `budget-app-controls` becomes the recommended first path, consistent with the current capability
  contract and Money job-flow priorities.
- Money remains useful on its own. Screen Time is an optional second step after a person has a
  budget and understands why an app pause could help.
- Money owns budget identity and condition truth. Screen Time owns rule persistence, explanation,
  and enforcement.
- Secondary offers route directly into their capability-owned onboarding rather than through a
  capability tour or Agent conversation.
- The existing Logo, semantic colors, Button, Icon, and onboarding shell should be reused in the
  eventual implementation. Generated icons in the mockup are illustrative only; production must
  use `src/ui/Icon` assets.

## Capability delta

### Today

- A fresh install enters the legacy Goal and Arc onboarding flow.
- The first-run experience does not represent Kwilt's newer capabilities or its differentiated
  Money plus Screen Time loop.
- The earlier neutral chooser gives every offer similar weight and does not tell the user where
  Kwilt believes they should begin.

### After this change

- A new user with unknown intent sees one visually dominant recommendation: `Control your
  spending`.
- The supporting line promises the immediate budget outcome and says app controls are optional and
  later. The chooser does not explain the complete Money plus Screen Time mechanism.
- Goals and to-dos, household chores, and meals and groceries remain visible and directly
  selectable on the same screen.
- Each choice hands off to capability-owned onboarding; `Just look around` enters the app shell.

### Still not promised

- Family or child Screen Time enrollment.
- Screen Time permission or enforcement before it has been proven on the user's device.
- A trustworthy financial decision merely because Money opened, an account connected, or setup
  screens were completed.
- A full explanation of Kwilt's capability catalog on first launch.

## Reductive design decisions

Keep:

- Parchment full-screen canvas.
- The canonical `BrandLockup` with the real three-piece mark and `Kwilt` wordmark as the only
  prominent brand-color moment.
- `Control your spending` in `fonts.black` (`Inter_900Black`) at approximately 46-48pt with a
  compact line height: heavier but slightly smaller than the preceding mockup.
- One short supporting sentence: `Build a simple budget. Add app controls later, if you want.`
- One full-width Sumi `Build my budget` button.
- Three flat secondary rows, all visible in the initial viewport where standard text size allows.
- No heading above the secondary rows.
- A quiet `Just look around` exit.

Remove or avoid:

- A white hero card, `Start here` badge, progress indicator, illustration, feature checklist, or
  mechanism diagram.
- All capability and lead icons; only the Kwilt brand mark and quiet row chevrons remain.
- Pine headers, Pine action fills, or red offer icons.
- Helper paragraphs beneath the secondary offers.
- Equal-weight buttons, horizontal carousels, `More`, or a second chooser screen.
- Bank-link, Screen Time, notification, or household permission prompts on this screen.

If enlarged text requires scrolling, preserve the same content order and direct access to every
offer rather than shrinking type or hiding choices.

## Activation path

1. A new user with unknown intent sees the calm spending-plan recommendation and all available
   alternatives.
2. `Build my budget` enters the minimum capability-owned Money setup.
3. The user reaches a first trustworthy budget answer or decision.
4. Kwilt may then offer budget-aware app controls as an optional, explained second step.
5. If accepted, the user selects an app and budget, reviews the rule, and grants only the required
   Screen Time access.
6. The differentiated activation moment is a completed budget-aware app review in which the user
   chooses `Open for now` or `Keep blocked` with trustworthy budget context.

Secondary rows should enter their corresponding first-value paths directly. `Just look around`
should enter the normal app shell without marking a capability as selected.

Opening Money, tapping `Build my budget`, connecting an account, granting permission, or
finishing onboarding is progress evidence, not activation by itself. The documented
`MoneyFirstTrustedDecision` contract is the better activation boundary but is not yet wired as
production evidence.

## Bet

We are betting that framing Money as one useful, optional recommendation—and naming the actual
outcome instead of the internal capability—will help a new person feel oriented and willing to
begin, while visible alternatives preserve intent match for people who came for another job.

If people interpret the offer as generic budgeting or cannot explain what the app pause does, the
first revision should add the smallest possible mechanism cue from Alternative C. It should not
add a tour or enlarge the lead into a promotional card.

## Success signal

Before implementation, a quick comprehension check should show that a person can say, in their
own words, that Kwilt helps them make a budget and can pause selected spending apps until they
review it.

After implementation, evaluate:

- First-value completion by selected route, not chooser taps alone.
- Time from first install to a trustworthy Money answer or decision.
- Completion and later reuse of budget-aware app review.
- Selection and first-value completion for each secondary offer.
- Use of `Just look around`, including whether those users later choose a capability.

There is no production evidence yet that this composition or lead offer improves activation. The
current decision is a design bet to validate through a refined mockup, route-level testing, and
eventually real first-run behavior.

## Next design pass

Refine the selected editorial mockup into a ship-candidate screen using the exact Kwilt icon and
type system, then inspect it at iPhone 17 Pro dimensions for:

- three-second comprehension;
- all offers visible without feeling crowded;
- primary versus secondary tap hierarchy;
- standard and enlarged text behavior; and
- a direct, honest transition into each capability-owned onboarding path.
