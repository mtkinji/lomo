# Evaluate Learning: Settings Surface Grammar

## Learning Questions

- Does `Shopping settings` read as a quiet maintenance page rather than a primary product screen?
- Can the user quickly distinguish Budget Plan, Forecast, and Screen Time Controls?
- Does the compact Screen Time sentence still communicate the rule clearly?
- Does grouped-row styling reduce the urge to keep tuning individual font weights and card borders?
- Does the design feel compatible with main Kwilt settings surfaces?

## Evidence That Supports The Bet

- Simulator screenshot shows a clear settings hierarchy on first read.
- The user does not call out the page header, toggles, or cards as feeling too large.
- Rollover and Screen Time settings feel like peers rather than Screen Time dominating the page.
- The same primitives appear plausible for notifications/privacy/settings surfaces in main Kwilt.

## Evidence That Disconfirms The Bet

- The page still reads like a Screen Time feature page.
- The sentence-form control feels lost or unclear at settings density.
- The grouped settings style feels too generic and loses Kwilt identity.
- The implementation creates another local style fork instead of a reusable pattern.

## Decision Rule

After local simulator review:

- Proceed if the page feels calmer and the rule remains legible.
- Revise if the page is calmer but the sentence-form control loses clarity.
- Reframe if the user still wants the whole page to behave more like native iOS Settings and less like a Kwilt object surface.
- Retire the local primitives if they do not generalize beyond this page.

## Instrumentation

For this learning release, use manual evidence:

- Simulator screenshots for Shopping and a no-rule category such as Groceries.
- User review of the rendered page.
- Code review for whether the settings primitives are reusable or too page-specific.

Do not add analytics yet; this is a pre-release visual grammar decision.

## Expected Next Action

If accepted, extract the local primitives into shared Budget UI components, then compare against main Kwilt settings screens before proposing ecosystem migration.
