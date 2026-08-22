# Frame: Budget Settings

## What the user said
> The Budget ellipsis should open global Budget settings, and the existing Money plan controls belong there too.

## Restated in user voice
When I need to change how my household budget works, I want one predictable place for plan defaults, categories, privacy, and access so I can maintain it without learning which internal Money screen owns each control.

## Target audience
`audience-aspirational-family-organizers` - family organizers who want useful defaults without becoming finance administrators.

## Representative persona
Maya is maintaining an ordinary household budget. She expects Settings to organize durable behavior separately from the month she is reviewing.

## Hero anchor
`jtbd-move-the-few-things-that-matter`

## Job flow step
Establish plan and categories (4/5): setup and plan changes exist, but global maintenance is split across generic Settings and an in-context Money plan screen.

## Active anchors
- `jtbd-review-budget-reality-before-spending` - durable plan and category defaults underpin the answer.
- `jtbd-trust-this-app-with-my-life` - settings ownership and additive recovery must be predictable.

## System alignment
Constraint posture: `Fit the system`

- Global Settings already owns capability-level defaults and permissions.
- Budget owns current-month review and category objects.
- `SettingsPage`, `SettingsGroup`, and `SettingsRow` are the local authority.
- Existing Money plan persistence stays authoritative.

Design implication: add one canonical Budget settings route, merge the Money plan surface into it, and keep category-specific controls on category settings.

## Aspirational design challenge
How might we help Maya maintain the household budget from one predictable place, while preserving useful defaults and category-level ownership?

## Out of scope
Bulk category editing, destructive reset, automatic renaming, and new plan semantics.
