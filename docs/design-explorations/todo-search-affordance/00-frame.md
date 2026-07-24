# Frame: todo-search-affordance

## What the user said

> I'm missing the search affordance on this page, and wonder if I might want to bring it back in the footer - either on the left or right of the quick add dock. But that's my initial solution concept, not necessarily the right path. Another path could be to reveal search at the top of the list on scroll like many apps do.

## Restated in user voice

When my To-dos have accumulated into a long list and I know roughly what I am looking for, I want a readily discoverable way to retrieve it without maintaining more views or hunting through app navigation, so that capture remains trustworthy and I can get back to the commitment that matters.

## Target audience

`audience-aspirational-family-organizers` — people who want ordinary personal and family commitments to stay findable and manageable without learning a productivity methodology.

## Representative persona

Maya is returning to a crowded To-dos list to find a commitment she remembers capturing. She is not trying to configure or reorganize the list; she wants a direct recovery path.

- Current situation: the inventory is long enough that visual scanning is slow, while the visible controls emphasize views, filtering, grouping, sorting, and capture.
- What she's trying to become/do: trust that something captured in Kwilt can be found again when it matters.
- Emotional state or tension: she remembers enough to search, but the page makes her decide where search lives before she can use it.
- What would make this feel wrong to her: another persistent dock, a new search mode to configure, or search that unexpectedly broadens beyond To-dos.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — retrieval matters because a captured commitment cannot move forward if it is effectively lost in the inventory.

## Job flow step

In `job-flow-maya-move-family-life-forward`, “Trust that the to-do will not disappear into a pile” scores **3/5**. Activities persist, but crowded lists can feel hard to re-enter. The current flow offers system/custom views, filters, grouping, and sorting, but none of those replaces direct retrieval of a known item.

## Active anchors

- `jtbd-capture-and-find-meaning` — loose, low-friction capture is only trustworthy if imperfectly classified items remain recoverable.
- `jtbd-move-the-few-things-that-matter` — finding a known commitment is a means to acting on it, not a separate organization project.
- `jtbd-trust-this-app-with-my-life` — a life system should not make captured commitments feel hidden.

## serves snippet

```yaml
serves: [jtbd-capture-and-find-meaning, jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life]
```

## Friction we're addressing

Search still exists in the product, but its only visible entry on this screen is indirect: open the global capability menu, then choose Search. The former bottom navigation exposed a To-dos-scoped search action; the new screenshot leaves the Quick Add dock as the only persistent bottom control. For a long inventory, the capability is present but the local affordance is missing.

## System alignment

Constraint posture: `Fit the system`

Current system facts:

- Existing surface: `ActivitiesScreen` owns the To-dos inventory, its fixed view/filter/group/sort toolbar, a collapsible page header, and the floating `QuickAddDock`.
- Existing user flow: the accepted capability menu exposes one global Search entry, but reaching it requires opening the hamburger menu first.
- Existing domain/data model: `GlobalSearchDrawer` searches To-dos, Goals, Arcs, and Chapters; it already supports a single active To-dos scope and returns users to the owning surface.
- Existing technical affordances: `openGlobalSearch({ initialScope: 'activities' })` opens the shared drawer pre-scoped to To-dos. Legacy To-dos deep links and the retired bottom bar already use this path. The inventory already tracks scroll direction and collapses/reveals its header.
- Existing UX/copy conventions: one shared search surface, calm labels, capability-local context, and no productivity-dashboard framing. Quick Add is the persistent capture action.

Constraints to preserve:

- Reuse the shared global search drawer; do not create a second To-dos search implementation.
- Make a To-dos-origin entry feel locally scoped while allowing the existing drawer to broaden scope.
- Preserve Quick Add as an obvious, thumb-reachable capture path.
- Avoid accumulating multiple persistent bottom controls or competing docks.
- Preserve the existing header-collapse behavior and the fixed inventory toolbar's role.

Constraints we may challenge:

- Global Search being discoverable only from the capability menu.
- The assumption that every important local action must be permanently visible.

Design implication:

The work is primarily an entry-point and discoverability decision, not a search-capability build. The strongest concepts should reuse the same To-dos-scoped drawer and vary when and where its trigger appears. A footer trigger must earn scarce persistent space beside Quick Add; a scroll-revealed trigger must remain learnable and accessible without requiring a gesture the user cannot predict.

## Aspirational design challenge

How might we help Maya retrieve a known commitment from a crowded To-dos inventory the moment she needs it, while preserving one shared search system, effortless capture, and a calm page with no redundant chrome?

## Out of scope

- Changing search ranking, result-row design, or the global drawer's scope model.
- Solving general To-do prioritization or reorganizing the inventory.
- Reopening the accepted capability-menu or app-shell architecture.
- Implementing an affordance before comparing interaction concepts.

## Open question

Should a To-dos-origin search always open scoped to To-dos, or should it remember the broader scopes the user last selected after the first local invocation?
