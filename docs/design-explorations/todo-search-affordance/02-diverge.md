# Diverge: todo-search-affordance

## Fixed frame

Help Maya retrieve a known commitment from a crowded To-dos inventory the moment she needs it, while preserving one shared search system, effortless capture, and a calm page with no redundant chrome.

All concepts below reuse `openGlobalSearch({ initialScope: 'activities' })`. None creates an inline search engine or a second result surface.

## Axis of variation

The primary axis is **persistent versus situational availability**. The secondary axis is **top-of-page context versus bottom-of-page thumb reach**. A final axis tests whether Search should remain a separate action or share the existing dock's visual container.

## Concept A: Fixed-toolbar lens

Add a compact Search icon to the fixed inventory toolbar beside the existing view, filter, grouping, and sort controls.

```text
[ 🗂 All to-dos ]        [ 🔍 ] [ filter ] [ group ] [ sort ]
```

Tapping the lens opens the existing drawer scoped to To-dos. Search remains available while the user scrolls because the toolbar is already fixed.

- Audience/persona fit: strong for Maya because the action sits with the controls that help her work with the current inventory, without requiring her to understand the capability menu.
- Design-challenge answer: makes retrieval consistently visible at the point where list complexity is already expressed.
- System fit: high. It adds one caller to an existing fixed surface and uses the current search state and drawer.
- Object model: touches Activities only as the invocation context; the drawer may broaden to other objects by explicit scope selection.
- Capture-first stance: Quick Add is unchanged.
- Best when: Search is considered a peer of filtering, grouping, and sorting and deserves continuous visibility.
- Fails when: the toolbar becomes a dense row of equally weighted controls, especially on smaller devices or with localized labels.
- Anti-pattern check: pass, with restraint. Do not add a label, badge, or advanced-search framing; one familiar lens is enough.

## Concept B: Native top-of-list Search

Place a full-width `Search To-dos` field at the top of the inventory. It is visible when the user is at the top, scrolls away with the list, and reappears through the familiar pull-down/reverse-scroll behavior.

```text
[ 🗂 All to-dos ]          [ filter ] [ group ] [ sort ]
[ 🔍 Search To-dos                                  ]
[ first to-do card                                  ]
```

The field is an affordance, not a separate editor: focusing it opens the existing scoped drawer and autofocuses the drawer's query input.

- Audience/persona fit: strong for Maya because the control says exactly what it does and is encountered naturally before scanning a long list.
- Design-challenge answer: provides the clearest search affordance without making it permanent during ordinary list use.
- System fit: medium-high. It reuses the list header and search drawer, but must coordinate with the existing collapsible page header, fixed toolbar, ghost fade, three list layouts, and scroll restoration.
- Object model: Activities-local entry into the shared object search.
- Capture-first stance: Quick Add stays continuously available even when Search scrolls away.
- Best when: explicit comprehension matters more than always-on thumb reach.
- Fails when: the field is hidden before a user learns it exists, or pull-down competes with existing header reveal and refresh expectations.
- Anti-pattern check: pass. The field should be calm and temporary, with no search suggestions competing on the inventory itself.

## Concept C: Bottom Search satellite

Shorten the Quick Add capsule slightly and add a separate circular Search button beside it. Place the lens on the right so the left edge continues to read as Add through the capsule's existing plus icon.

```text
[ +  Add a to-do                                  ] [ 🔍 ]
```

Both actions stay thumb-reachable and persistent. Search opens the same To-dos-scoped drawer; Quick Add keeps its existing focus and expansion behavior.

- Audience/persona fit: strong for frequent retrieval because the action is continuously reachable without scrolling or reaching to the top.
- Design-challenge answer: restores the missing bottom action directly while keeping Search and Add visibly separate.
- System fit: medium. The action itself is trivial, but dock width, keyboard states, Quick Add expansion, safe-area geometry, reserved list padding, and small-screen behavior all change.
- Object model: Activities-local invocation; broader objects remain opt-in inside the drawer.
- Capture-first stance: preserved only if the Add capsule remains the dominant target and does not lose useful text-entry width.
- Best when: Search is frequent enough to deserve scarce persistent bottom space.
- Fails when: the satellite makes the bottom feel like a reconstructed tab bar, visually weakens Quick Add, or collides with its focused/expanded states.
- Anti-pattern check: pass conditionally. It must remain two quiet actions, not grow into a multi-button command dock.

## Concept D: One dock, two explicit actions

Keep the dock's full width but add a trailing Search action inside the idle capsule. The plus and placeholder remain the Add affordance; a divider and lens make Search a separate button. When Quick Add receives focus, the Search action disappears and the existing composer behavior owns the dock.

```text
[ +  Add a to-do                              | 🔍 ]
```

- Audience/persona fit: moderate. Both high-frequency actions occupy one predictable place, but the container risks suggesting that search is part of text capture.
- Design-challenge answer: adds persistent thumb-reachable retrieval without creating a second floating object.
- System fit: medium. It keeps current outer geometry but changes hit targets, input width, accessibility order, focused-state transitions, and the dock's visual semantics.
- Object model: Activities-local invocation into shared search.
- Capture-first stance: preserved only if tapping the main capsule still focuses Add immediately and the search hit target is unmistakably separate.
- Best when: maintaining a single calm bottom silhouette is more important than keeping the actions in separate containers.
- Fails when: users mistake the lens for “submit,” expect typed Quick Add text to become a query, or hesitate over which mode the field is in.
- Anti-pattern check: pass only with a strong semantic separation and no persistent mode. A toggle that converts entered Add text into Search would fail the capture-first principle.

## Concept E: Scroll-adaptive Search rail

Use the existing inventory scroll state to reveal a compact `Find a to-do` rail only after the user has moved meaningfully into a long list. It occupies the space released when the large page header collapses, staying near the top while the fixed toolbar and list continue beneath it. Returning to the top restores the normal header and removes the rail.

```text
Initial state:   [ To-dos header ]
                 [ view / filter / group / sort ]

Deep-list state: [ 🔍 Find a to-do ]
                 [ view / filter / group / sort ]
```

- Audience/persona fit: strong in the moment of demonstrated need: Maya has started scanning a long inventory and Search arrives without occupying the calm initial state.
- Design-challenge answer: makes the affordance situationally present when the list itself has become costly to scan.
- System fit: medium-low. It can reuse existing scroll direction and header-collapse progress, but adds a second chrome state, timing rules, accessibility visibility rules, and animation coordination.
- Object model: Activities-local invocation into shared search.
- Capture-first stance: Quick Add remains untouched and persistent.
- Best when: Kwilt wants contextual assistance instead of another always-visible control.
- Fails when: users cannot predict why Search appeared, the rail flickers around thresholds, or Search vanishes precisely when they try to reach it.
- Anti-pattern check: pass if deterministic and motion-light. Do not present it as AI anticipation or animate it in an attention-seeking way.

## Cross-concept system and philosophy check

All five concepts:

- preserve Activity as the only day-level planning object;
- preserve unanchored Activities as first-class search results;
- do not require Arc or Goal selection before capture or retrieval;
- keep Search deterministic, inspectable, and user-invoked;
- avoid dashboards, productivity scoring, streak pressure, forced organization, anthropomorphic AI, and new configuration;
- retain the accepted one-global-search-surface contract.

## Distinctions worth testing visually

- Whether a fifth fixed toolbar control feels more crowded than a second bottom object.
- Whether the top-of-list field remains discoverable after it scrolls away.
- Whether a right-side bottom satellite preserves enough width and dominance for Quick Add.
- Whether a trailing lens inside Quick Add reads as a separate action or as input behavior.
- Whether scroll-adaptive Search feels helpful or unpredictable beside the existing collapsing header.

## Divergence checkpoint

No option is selected here. The next phase should compare the concepts on discoverability, one-handed reach, initial calm, semantic clarity, system fit, implementation blast radius, and capture-first integrity. It should also produce actual-screen sketches for the leading concepts before committing to geometry.
