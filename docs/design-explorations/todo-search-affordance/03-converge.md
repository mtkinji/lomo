# Converge: todo-search-affordance

## Scoring approach

Each concept is scored from 1–5, where 5 is strongest. Scores compare the concepts rather than claim research precision.

- **Discoverability:** can Maya find Search without prior instruction?
- **Reach:** how comfortably can she invoke it during ordinary phone use?
- **Calmness:** does the To-dos surface remain visually focused?
- **Semantic clarity:** is Search unmistakably retrieval rather than capture, filtering, or submission?
- **System fit:** does it fit the accepted shell, inventory chrome, and shared-search contract?
- **Implementation safety:** how little state, animation, geometry, and regression risk does it introduce?
- **Capture-first integrity:** does Quick Add remain obvious, immediate, and uncompromised?

## Scorecard

| Concept | Discoverability | Reach | Calmness | Semantic clarity | System fit | Implementation safety | Capture-first | Total / 35 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **B. Native top-of-list Search** | 5 | 3 | 5 | 5 | 4 | 3 | 5 | **30** |
| **C. Bottom Search satellite** | 5 | 5 | 3 | 5 | 3 | 3 | 4 | **28** |
| **A. Fixed-toolbar lens** | 5 | 3 | 2 | 4 | 2 | 4 | 5 | **25** |
| **D. One dock, two actions** | 4 | 5 | 4 | 2 | 3 | 3 | 3 | **24** |
| **E. Scroll-adaptive Search rail** | 2 | 3 | 5 | 4 | 2 | 2 | 5 | **23** |

## Score rationale

### B. Native top-of-list Search — 30

This gives Search the strongest literal affordance while letting it leave the stage once the user begins ordinary list work. It preserves the Quick Add dock, keeps retrieval and capture semantically separate, and follows a familiar inventory pattern. Its main costs are top reach and coordination with the existing collapsible header and multiple list layouts.

### C. Bottom Search satellite — 28

This is the strongest alternative when thumb reach and persistent availability dominate. It loses points because Search is not necessarily frequent enough to deserve permanent bottom prominence, and because shortening or displacing Quick Add makes the page's capture-first action less singular. It also risks rebuilding the visual weight of the retired bottom action cluster one control at a time.

### A. Fixed-toolbar lens — 25

The trigger is clear and technically direct, but the actual toolbar is already full: one wide view selector plus filter, grouping, and sort. A fifth peer control would either overflow at compact widths, force smaller targets, or make every organization control equally loud. Search should reduce the cost of a crowded inventory, not make the control row feel crowded too.

### D. One dock, two actions — 24

This keeps one bottom silhouette and good reach, but the visual containment creates the wrong semantic question: does text in this field add or search? Even with separate hit targets, the dock becomes a compound command bar. That weakens the immediate “tap anywhere here to capture” model.

### E. Scroll-adaptive Search rail — 23

The concept is calm and timely in theory, but it asks the user to learn an unexplained chrome state. It also adds the most behavioral complexity: thresholds, scroll-direction rules, animation coordination, accessibility transitions, and possible flicker. The system would be predicting when retrieval matters without evidence that the prediction improves use.

## Chosen alternative

**Choose B: Native top-of-list Search.**

Place one full-width `Search To-dos` affordance directly below the fixed inventory toolbar and above the first list card. It is part of the list's opening context rather than permanent page chrome. As the user scrolls into the inventory, it scrolls away. Returning to the top reveals it again.

Tapping the affordance opens the existing global Search drawer with:

- To-dos as the sole initial scope;
- the drawer query input focused;
- all eligible To-dos searchable regardless of the active To-dos view, filters, grouping, or sort;
- existing scope chips available so the user can deliberately broaden the search;
- existing empty-query recent/recommended To-dos retained;
- dismissal returning to the same To-dos view and position.

## Capability delta

### Today

The user cannot readily search from the visible To-dos inventory. Search exists, but she must know to open the hamburger menu and select the global Search row. The page itself suggests scanning, filtering, grouping, sorting, or changing views.

### After this concept

When the user opens or returns to the top of a crowded To-dos list, she can recognize and invoke `Search To-dos` directly. The shared drawer starts in the local scope, searches beyond the current view configuration, and still allows explicit broadening.

### Workaround removed

The user no longer has to scan the list, dismantle active filters, or leave the visible page through the capability menu merely to retrieve a known To-do.

### Still intentionally unsupported

- Inline filtering of the rendered inventory while typing.
- A second Activities-specific search result surface.
- Search modes, saved searches, query settings, or configurable invocation behavior.
- Search-driven changes to the current view, filter, grouping, or sort.
- A persistent bottom Search control.

## Reductive design pass

### Smallest elegant version

One familiar, passive search field at the top of the list. It contains a lens and the copy `Search To-dos`; tapping anywhere opens and focuses the existing drawer. It has no clear button, scope control, suggestions, or typed state on the inventory itself.

### Existing feature enhanced

This enhances `ActivitiesScreen` as an entry point and `GlobalSearchDrawer` as the already-authoritative search experience. It does not create a new feature boundary.

### What it replaces or collapses

For To-dos retrieval, it replaces the need to understand the hamburger → global Search route. That global route remains available for Kwilt-wide search.

### What we are refusing to add

- No footer satellite.
- No compound Add/Search dock.
- No extra fixed-toolbar icon.
- No adaptive “Kwilt thinks you need Search now” animation.
- No coachmark, setting, badge, label explaining search architecture, or new search state.
- No changes to result ranking or card design in this slice.

### Clutter boundary

The affordance becomes clutter if it stays pinned while scrolling, gains auxiliary buttons, shows suggestions in the inventory, or pushes the first card down by substantially more than one compact input row.

### Sharp job

It does one job: provide an unmistakable local path to retrieve a known To-do.

## Activation and learning

### Moment of readiness

The user is most ready when she opens the inventory and sees enough items to know scanning will be costly. The top-of-list location meets that moment without interrupting capture or demanding setup.

### Activation behavior

- Show the field whenever the To-dos inventory has content.
- Keep it in the opening list context, below the inventory toolbar.
- Let it scroll away naturally with the cards.
- Reveal it again only by returning to the top; do not introduce a threshold-triggered floating state.
- On tap, open the existing drawer scoped to To-dos and focus its input.

### Education posture

No teaching is needed. The familiar field, lens icon, and literal `Search To-dos` copy should explain the behavior. If that does not happen, the affordance itself needs correction rather than a coachmark.

### Natural adoption signal

A user invokes Search from the To-dos field, selects a result, and returns to the inventory without first changing views or filters. Repeat use across separate sessions is stronger evidence that the local entry is earning its space.

## Accepted trade-offs

- Search is not permanently thumb-reachable once the user is deep in the list.
- The first visible card moves down by one compact row at the top of the inventory.
- The implementation must integrate carefully with the existing collapse/fade/list-header behavior.

## Rejected trade-offs

- Weakening or compressing Quick Add for persistent Search access.
- Crowding the fixed toolbar to keep Search continuously visible.
- Adding behavioral complexity to predict when Search should appear.
- Blurring whether the bottom input captures or retrieves.

## System implications

- Add one To-dos-local trigger that calls `openGlobalSearch({ initialScope: 'activities' })`.
- Ensure opening the drawer from this trigger resets the query and reliably focuses the input.
- Confirm the initial local scope overrides prior broader scope selection for this invocation while leaving scope chips interactive.
- Confirm search operates on the full eligible Activities collection rather than the active rendered view.
- Preserve inventory scroll state through drawer dismissal and result-navigation return.
- Render the affordance consistently across supported list layouts, or explicitly exclude layouts where a top-of-list search field would be misleading.

## Stated bet

We're betting that a familiar Search field at the top of the To-dos inventory is discoverable enough to restore confidence in retrieval, while its ability to scroll away keeps the page calmer than a persistent footer or toolbar action. If users still hunt through controls or repeatedly need Search while deep in the list, revisit the bottom satellite as the next comparison—not the compound dock or scroll-adaptive rail.

## Success signal

In Andrew-only use and a small learning release, the local field is noticed without instruction, opens To-dos-scoped Search as expected, retrieves items hidden by the active view, and does not make the inventory feel meaningfully more crowded. Search use should replace view/filter dismantling for known-item retrieval without reducing Quick Add use or causing Add/Search confusion.

## Visual-sketch decision

Actual-screen sketches were intentionally skipped at Andrew's request; the concepts were scored directly from the supplied To-dos screenshot and current implementation geometry.
