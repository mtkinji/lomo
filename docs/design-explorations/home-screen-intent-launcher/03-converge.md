# Converge: Home Screen Intent Launcher

## Qualitative scoring

| Criterion | Personal Rail | Chosen Trio | Intent Set |
| --- | --- | --- | --- |
| User control over destinations | Highest | High | Medium |
| Breadth in one medium widget | Highest | Medium | High |
| Stable Ask Kwilt access | High | High | High |
| Label and state room | Medium | High | Medium |
| Configuration effort | Medium | Medium | Low |
| Current system fit | High | High | Medium-high |
| Risk of becoming an app grid | Medium | Low | Low-medium |

## Chosen alternative

**Personal Rail** — four independently configurable Kwilt affordances across the top, with one stable full-width `Ask Kwilt` bar across the bottom.

Andrew chose four rather than three. The four positions are therefore a product requirement. The design must make them legible and confidently tappable rather than treating the fourth as optional when space becomes difficult.

## Capability delta

Today, the user cannot:

- Keep a personalized set of important Kwilt destinations together in one Home Screen widget.
- Replace the separate Focus and Chat launchers with one coherent Kwilt front door.
- Reach Chat, Calendar, To-dos, household capabilities, and other stable destinations through one configurable surface.

After this concept ships, the user can:

- Add one medium Kwilt Launcher with four independently chosen shortcuts.
- Tap the stable Ask Kwilt bar to enter a fresh unsent Unified Chat composer.
- Configure each upper position through Edit Widget from a bounded list of supported Kwilt destinations and actions.
- See a compact countdown in the configured Focus position during an active session and tap it to return to controls.

Still intentionally not possible:

- Adding arbitrary URLs, custom labels, or unsupported destinations.
- Running Chat, recording audio, starting Focus, creating a To-do, or mutating another capability without entering the owning Kwilt surface.
- Showing private object names, event titles, money values, household details, badges, or recommendations in launcher shortcuts.
- Automatically reordering shortcuts from inferred usage.

## Interaction contract

### Stable Ask Kwilt action

- Occupies the full bottom row in every configuration.
- Uses the Kwilt mark, `Ask Kwilt`, and one clear directional affordance.
- Opens `kwilt://chat?entry=fresh&mode=conversation&source=widget`.
- Never auto-records and never creates a durable thread before the first valid send.
- Is not included in the configurable shortcut list, preventing redundant Chat placements.

### Four configurable affordances

- All four upper positions are independently configurable through iOS Edit Widget.
- Every position shows a recognizable icon and short visible label; accessibility labels name both the action and destination.
- Configuration is optional because every new widget starts with useful defaults.
- The four positions must resolve to four distinct choices. The configuration experience should omit already-selected destinations where practical and otherwise reject duplication clearly rather than silently changing a selection.
- Position order is meaningful and remains stable until the user edits it.

### Initial bounded destination list

The first release may include only destinations with stable deep links and clear capability ownership:

- `Focus` — open deliberate duration-and-audio setup; become countdown/controls return while active.
- `Calendar` — open today's Plan calendar.
- `To-dos` — open the To-dos screen.
- `Add To-do` — open the To-dos screen with Quick Add focused.
- `Goals` — open Goals.
- `Arcs` — open Arcs.
- `Chapters` — open Chapters.
- `Meals` — open Meal Plan.
- `Recipes` — open the recipe library.
- `Groceries` — open the current grocery-list surface.
- `Chores` — open Chores.
- `Money` — open Money summary without projecting financial data into the widget.
- `Screen Time` — open the existing Screen Time destination.
- `Games` — open the Games shelf.
- `Explore` — open Explore.

Settings, developer tools, object-specific records, recent items, and arbitrary URLs are excluded.

### Defaults

The provisional default rail is:

1. `Focus`
2. `Calendar`
3. `To-dos`
4. `Meals`

This gives a useful cross-section of action, time, concrete work, and household life. The defaults are not a claim that these are universally most important; immediate configurability is the answer to that variation.

## Before and after user story

Before: the user dedicates separate Home Screen positions to Chat and Focus, then opens the Kwilt app and navigates when they want Calendar, To-dos, Meals, or another capability.

After: the user keeps one recognizable Kwilt Launcher. Four chosen destinations sit across the top in a stable order. Ask Kwilt remains available across the bottom. One tap reaches the intended owning surface with no private Home Screen projection or intermediate Kwilt navigation.

## System implications

- Replace or supersede the current standalone Chat and Focus widget recommendation with one medium App Intent-configured launcher; retaining the small widgets as optional alternate sizes remains possible.
- Reuse the generated WidgetKit extension and the scalar App Intent configuration pattern already used by the Money category widget.
- Add four persisted shortcut parameters and a bounded destination registry that owns label, icon, deep link, availability, and optional state presentation.
- Reuse existing routes where they are already stable; add focused parsing/tests only for destinations that need an explicit widget entry state such as Add To-do.
- Read the existing shared Focus snapshot only when rendering a configured Focus position.
- Keep all configuration local to WidgetKit; no backend profile, sync model, or in-app launcher settings screen is required for V1.

## Reductive design decisions

- One supported family in V1: `systemMedium`.
- Exactly four configurable positions and one fixed Ask Kwilt action.
- No widget title, greeting, avatar, recent-content row, page indicator, overflow menu, badges, suggestions, or personalization engine.
- No nested picker inside the rendered widget; customization lives in Edit Widget.
- No duplicated Chat shortcut in the configurable list.
- No private or dynamic data except a configured Focus position's bounded active state.

## Activation path

The launcher should first be dogfooded through manual widget placement. Useful defaults mean the initial widget works before editing; the configuration benefit becomes apparent through the ordinary Edit Widget affordance. Do not add an in-app configuration screen or promotional prompt to the first learning release.

Natural adoption means the combined launcher replaces the separate Chat/Focus footprint, remains installed, and its configured destinations produce repeated direct entries without users falling back to opening Kwilt and navigating manually.

## Accepted trade-offs

- Four destinations leave less room per shortcut than a three-slot design.
- Configuration occurs in Apple's Edit Widget surface rather than inside Kwilt.
- Active Focus status is compact rather than reproducing the full standalone Focus widget.
- A bounded destination list sacrifices arbitrary flexibility for reliable routes, labels, and accessibility.

## Rejected trade-offs

- Do not reduce to three positions solely to simplify layout.
- Do not remove labels and rely on ambiguous capability icons.
- Do not auto-rank or swap destinations based on recent use.
- Do not make Ask Kwilt configurable or removable.
- Do not turn the widget into a private-content dashboard.

## Stated bet

We're betting that four user-chosen destinations plus one stable Ask Kwilt entry will earn the space currently occupied by separate widgets and reduce navigation enough to become the user's habitual Kwilt front door. If four labeled positions cannot remain calm and legible at real size, we will revisit the visual shape and typography while preserving the four-position contract.

## Success signal

The learning release succeeds when the widget remains installed through ordinary use, the four destinations are understandable and reliably editable, repeated taps reach the exact intended surfaces, Ask Kwilt still feels primary, and an active Focus position remains readable without making the launcher feel like a dashboard.
