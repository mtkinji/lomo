# Learning release: Native first meal cycle

## Hypothesis

A person will reach Food value faster when the product teaches the loop through real actions instead
of explaining it in two full-screen moments.

## Scope

- Enter Recipes directly from **Make meals easier**.
- Relay one coachmark at a time through Recipe, Plan, optional sharing, and Groceries.
- Persist only the guide checkpoint; domain records remain the source of completion truth.
- Keep Groceries visible and independently startable before any meal plan exists.

## Instrumented moments

Observe path start, Recipe opened, Plan mutation succeeded, sharing opened or skipped, Grocery send
succeeded, resulting list viewed, guide dismissed, and guide completed. Never count a tooltip view
as domain success.

## Promotion gates

The release needs clean-account and existing-Household rehearsal, normal and enlarged text,
VoiceOver, Reduce Motion, relaunch at each checkpoint, offline failure behavior, and confirmation
that no coachmark obscures its target or prevents the underlying action.
