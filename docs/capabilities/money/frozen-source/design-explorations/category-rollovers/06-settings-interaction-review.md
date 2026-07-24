# Settings Interaction Review: category-rollovers

## Prompt

The expanded rollover controls in Category settings should be understandable and useful. The current implementation makes `Start` actionable with a drawer for `All history` or `Start fresh in this month`, but the question is whether people will understand that interaction or whether a more elegant solution exists.

## Restated In User Voice

When Maya sees rollover is on, she wants to understand what is affecting this month's room and make a simple correction if the carryover is wrong, so that she can trust the meter without managing accounting settings.

## Anchor Fit

- `jtbd-trust-this-app-with-my-life` - rollover changes money interpretation, so controls must be transparent and reversible.
- `jtbd-review-budget-reality-before-spending` - the setting should help the meter answer current spending reality.
- `jtbd-carry-intentions-into-action` - the category plan should keep working month to month without manual cleanup.

serves: [jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending, jtbd-carry-intentions-into-action]

## Synthetic Empathy Statements

- "I turned rollovers on because I want the app to remember last month. I do not want to choose a bookkeeping start date."
- "If it says all history, I wonder whether old bad data is going to haunt this category forever."
- "Start fresh sounds useful, but it also sounds like it might erase something."
- "I care less about the policy and more about why this month says I have less room."
- "If I overspent last month, I want the app to say that plainly, not make me infer it from a hidden setting."
- "When I open settings, I expect controls. When I open detail, I expect an explanation."
- "A row called Start feels like a setup question. A row called This month includes feels like the thing I need to understand."
- "If I want to ignore earlier months, I want one clear action: do not carry that old amount into this month."
- "All history only makes sense if I already know Kwilt has complete history."
- "If the control changes money math, I need to know what changes immediately after I tap it."

## Current Interaction Read

Current shape:

- `Rollovers` toggle turns automatic carryover on or off.
- Expanded state shows `Start` with a value such as `All history`.
- Tapping `Start` opens a drawer with `All history` and `Start fresh in Jul 2026`.
- A conditional destructive row, `Start fresh this month`, appears when there is a non-zero carry-in.

What works:

- The setting is reversible.
- The choices map to real model fields.
- It avoids manual rollover amounts, transfers, and caps.

What is weak:

- `Start` is an abstract policy label, not a user outcome.
- `All history` can imply a level of data completeness the app may not have.
- The drawer adds a second layer for what is usually a one-action correction.
- `Start fresh this month` duplicates the drawer's second choice.
- The control explains configuration before it explains the visible money consequence.

## Divergent Options

### A: Keep Start Drawer

Keep the current shape: expanded rollover settings show `Start`, and the row opens a drawer with `All history` / `Start fresh in current month`.

Persona fit: Medium. It is orderly, but too policy-oriented for Maya.  
System fit: High. It uses existing settings grammar.  
Best when: the app later supports more start choices.  
Fails when: the user only wants to understand or correct this month's carryover.  
Anti-pattern check: mild bookkeeping smell.

### B: Inline History Choice

Replace the drawer with an inline two-choice control inside the expanded group: `Use all available history` and `Start fresh this month`.

Persona fit: Medium-high. It makes the choices visible.  
System fit: Medium. It adds a segmented/radio control to settings.  
Best when: both choices need to be visible all the time.  
Fails when: the extra control makes rollover feel more complex than one toggle.  
Anti-pattern check: still starts from configuration.

### C: Fact First, Action Second

Expanded rollover settings show a compact fact row and one contextual action:

- `This month includes` -> `-$97 from June`
- `Ignore earlier carryover` -> `Start fresh this month`

After starting fresh, the section changes to:

- `Counting from` -> `Jul 2026`
- `Use earlier history` -> `All available history`

Persona fit: High. It answers the visible confusion first, then offers one reversible correction.  
System fit: High. It uses existing row grammar and does not add a new surface.  
Best when: the main job is trust in this month's meter.  
Fails when: users need arbitrary start-date selection, which is intentionally out of scope.  
Anti-pattern check: passes; no ledger editor.

### D: Move Reset To Detail Facts

Settings only has the toggle. Category detail shows rollover facts and the action to ignore earlier carryover near the meter.

Persona fit: Medium-high. The action appears at the moment of confusion.  
System fit: Medium. It moves a settings action into a detail surface.  
Best when: reset is rare and explanation-heavy.  
Fails when: users expect rollover management to live where they turned it on.  
Anti-pattern check: risks adding action clutter to the meter.

## Convergence

Choose **C: Fact First, Action Second**.

The more elegant solution is not a better drawer. It is to remove the drawer and make the expanded state explain the current effect plus provide one reversible action.

## Reductive Decisions

- Keep exactly one primary setting: `Rollovers`.
- Do not expose a generic `Start` row.
- Do not add arbitrary start-date selection.
- Do not show both a drawer option and a duplicate `Start fresh this month` row.
- Do not make users learn `rolloverResetStartsOn`.
- Use the expanded section to answer, "What is affecting this month?"

## Recommended Interaction

When rollover is on and carry-in is non-zero:

- Row: `This month includes` / `-$97 from June`
- Row action: `Ignore earlier carryover` / `Start fresh`
- Footer: `Unused or overspent monthly amounts carry into the next month.`

When rollover is on and there is no carry-in:

- Row: `This month includes` / `$0 from earlier months`
- Optional row action only if a reset exists: `Use earlier history` / `All available history`

When the user has started fresh:

- Row: `Counting from` / `Jul 2026`
- Row action: `Use earlier history` / `All available history`

## Bet

We're betting that users understand rollover better when the expanded control starts with the money effect and offers one correction, rather than exposing a start-policy drawer. If that turns out not to be true, revisit with an inline two-choice control before adding arbitrary date selection.

## Learning Check

In simulator or TestFlight review, the user should be able to answer:

- Why is this month's budget different from the monthly amount?
- What will happen if I tap `Ignore earlier carryover`?
- How do I return to using all available history?

