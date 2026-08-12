# Converge: Contextual Recipe Chat

## Chosen alternative
One-tap recipe-shaped conversation offers in the existing contextual Chat drawer.

It best serves Maya's practical adaptation moment while fitting the current Recipe Home, Action Dock, Unified Chat, and immutable Recipe contracts.

## Capability delta
Today, Maya cannot open Chat from a recipe with its exact facts and see clear ways to make it work tonight.

After this release, she can open Chat from Recipe Home, choose one of four concrete conversation starters, edit the prompt, and send with the exact Recipe version available as authorized evidence.

Still intentionally unsupported: a card does not silently update, fork, plan, shop, or cook a recipe. Recipe writes still require a later capability-owned reviewed operation.

## Reduction decisions
- Reuse the standard `navAiGuide` icon; do not label the control “AI.”
- Keep Share and household reaction controls in the object header; put Chat in the dock.
- Keep Meal Plan as the one dominant left-side action; Chat is the separate circular right action.
- Reuse quick-start card anatomy; add no carousel, category header, explanation panel, or onboarding coachmark.
- Show four offers only in a fresh Recipe detail launch. Durable threads return to their conversation instead of re-showing starters.

## Activation
Recipe Home is the ready moment: the person can see appetite, time, servings, ingredients, and method before asking. A tap opens the 60% drawer; selecting a card submits its full prompt, adds the request to the timeline, and begins the response.

## Accepted trade-offs
- Four offers cover high-value jobs without claiming personalization from pantry or household evidence that is not yet available.
- “Make it ours” begins a reviewable conversation now; automatic recipe-version persistence remains a later capability slice.

## Bet
We're betting that concrete recipe-shaped starters will help people begin higher-quality contextual turns without making Recipe Home feel busier. If not, revisit the number and ranking of cards before adding richer automation.

## Success signal
In dogfooding, a person can open a recipe, select the right offer without explanation, see that request enter the timeline, receive an answer grounded in the exact recipe, and return to Recipe Home with no accidental mutation.
