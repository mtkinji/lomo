# Divergence: Re-entry Without Reconstruction

## Fixed design challenge

Help Maya resume a committed food cycle in one obvious move from the context
she is actually in, while preserving honest uncertainty and clear Meal,
Grocery, Recipe, and Activity ownership.

The solution must improve both of these equally valid moments:

1. **Kitchen:** “I have the groceries. Show me the meals we chose so I can cook
   one.”
2. **Store or leaving home:** “Show me the Grocery list and let me add ordinary
   household items.”

Kwilt cannot reliably infer which moment Maya is in. Both doors must therefore
remain available unless there is strong evidence, such as an active Cook Mode
session.

## Option A — Resume, shortcuts, and widgets; no new in-app surface

Kwilt preserves the last meaningful place in the app and adds direct entry
points outside the normal navigation:

- reopening Kwilt restores the last capability or active Cook Mode session;
- the planned-recipes widget shows the chosen meals and opens a Recipe directly;
- a Grocery widget or app shortcut opens the live list and supports quick add;
- notifications and deep links return to the capability that produced them.

The Meal Plan drawer remains the in-app place for the two post-commitment doors.

### Why it could work

- Adds no new destination or information architecture.
- Makes repeat behavior exceptionally fast once the user has adopted a widget
  or shortcut.
- Keeps every action with its owning capability.
- Builds on the recipe-sheet-on-the-counter quality of the planned Recipe
  stack.

### Where it breaks

- The app icon still cannot know whether Maya means cooking or shopping.
- Widgets and shortcuts are optional setup, so they cannot repair the default
  experience by themselves.
- A user who lands elsewhere in Kwilt still reconstructs navigation.
- Keeping the Meal Plan drawer as the only in-app fork leaves the current
  discoverability problem largely intact.

### Verdict

Useful supporting infrastructure, but insufficient as the entire answer.

## Option B — Use the existing contextual action dock

The committed Meals state changes the existing Meals action dock instead of
introducing a new global control or destination. The header keeps the familiar
Plan icon and count as the place to inspect or change the decision. The dock
becomes the place to act on it:

- **Choose a meal** — opens the short committed Recipe list, then Recipe
  readiness;
- **Groceries · 14** — opens the canonical Grocery list directly;
- an active Cook Mode session changes the first action to **Continue cooking**
  while Groceries remains available.

The post-commitment dock replaces the resting Add Recipe/Search/AI emphasis for
as long as the committed food cycle is active. Secondary inventory actions
remain available through established Meals controls rather than competing with
the current household job.

### Why it could work

- Uses an existing, already contextual control grammar and creates no new
  destination.
- Represents honest branching instead of inventing one “next” action.
- The header/dock split gives Plan management and plan execution different,
  legible jobs.
- Food can ship as the first thread without requiring a full cross-capability
  Home redesign.

### Where it breaks

- A split-button treatment could hide Groceries behind the exact extra choice
  the design is trying to remove.
- A grocery icon and badge alone may be too cryptic; both actions may need
  labels.
- Replacing Add Recipe/Search/AI must preserve a discoverable secondary path to
  those inventory actions.
- It does not naturally provide the ambient recipe-sheet quality of a widget.

### Guardrails

- Both cook and Grocery actions stay visible after commitment.
- **Choose a meal** opens the short Recipe chooser; **Groceries** opens the list
  directly with no intermediate Plan drawer.
- The dock changes only from explicit, durable Meal Plan or Cook Session state.
- When no committed cycle exists, the normal Meals inventory dock returns.

### Verdict

The strongest minimal in-app intervention because it reuses a familiar surface
and gives the post-commitment state an explicit execution treatment.

## Option C — A true Home that replaces the current default entry

Kwilt replaces Activities as the app's default landing behavior with a calm
continuation canvas. It owns no household records and does not enumerate every
capability. It shows only a few active threads, beginning with:

- the committed Recipe set, with direct meal selection;
- the live Grocery list, including quick add;
- a small out-and-about composition linking Grocery and relevant Activities
  without merging them;
- active sessions such as Cook Mode when present.

Activities remains a capability, but it is no longer asked to function as the
implicit app home. Food Home's single-lead continuation and redundant shell
recovery affordances are retired.

### Why it could work

- Solves re-entry from the app icon without requiring setup.
- Can make the prior household decision feel ambient and appetite-forward.
- Provides a coherent cross-capability place for groceries plus errands.
- Establishes a general continuation grammar rather than a Meals exception.

### Where it breaks

- It is the highest-cost and highest-risk option.
- Without aggressive subtraction, it becomes another dashboard.
- Ranking multiple household threads may create anxiety and false priority.
- Food alone is not enough evidence to justify changing Kwilt's default entry.

### Guardrails

- Home replaces current default-entry behavior; it cannot merely join the menu.
- No capability grid, totals dashboard, feed, generic recommendations, or
  “everything happening” summary.
- Maximum of three visible continuations, ordered by explicit state rather than
  engagement prediction.
- Every continuation answers “what can I resume?” and opens its owner directly.

### Verdict

Potentially the strongest long-term system, but it has not yet earned its scope.

## Comparison

| Criterion | A: Resume + widgets | B: Contextual action dock | C: True Home |
|---|---:|---:|---:|
| Works from anywhere in-app | Low | High | Medium |
| Works from the app icon | Medium | Medium | High |
| Adds a destination | No | No | Replaces one |
| Handles honest cook/grocery branching | Low | High | High |
| Supports ambient Recipe presence | High | Low | High |
| Cross-capability potential | Medium | Medium | High |
| Risk of becoming a dashboard | Low | Medium | High |
| Cost and architectural reach | Low | Medium | High |

## Divergence readout

No single option should be treated as a bundle of all three. Option A is a
valuable companion regardless of the in-app choice, but cannot carry the core
job. Option C is defensible only as a replacement-level redesign with broader
cross-capability evidence.

Option B is the most proportionate first system change: it reuses the Meals
action dock, admits the cook/grocery fork, and can later provide evidence for
whether a true Home is necessary. Its central design question is the dock
composition: two explicit labeled actions preserve honest branching, while a
split button or icon-only secondary action saves space by making Groceries less
obvious.
