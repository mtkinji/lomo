# Yes-And: todo-search-affordance

## Original idea

Restore a readily discoverable Search entry on the To-dos inventory, reusing Kwilt's shared search drawer and opening it in a To-dos-first context.

## Adjacencies

### 1. Recover items hidden by the current view

**Yes, and what if it could...** make clear that Search looks across To-dos, not merely inside the active view, filters, grouping, or visible slice of the list?

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: retrieval becomes a dependable escape hatch when organization choices hide a known commitment.
- New value: Maya does not need to understand or undo the current filter configuration before finding something.
- Cost delta vs. original: low
- Anti-pattern check: pass — this reduces maintenance rather than adding another view; scope should be explained in the drawer, not with more persistent chrome.

### 2. Preserve the exact return point

**Yes, and what if it could...** return Maya to the same To-dos view and scroll context after she inspects or dismisses Search?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: searching becomes a reversible interruption instead of a navigation detour that loses the user's place.
- New value: users can check a result and continue scanning the prior inventory without rebuilding context.
- Cost delta vs. original: low
- Anti-pattern check: pass — it protects continuity and creates no new user-maintained state.

### 3. Broaden only when the user asks

**Yes, and what if it could...** begin with To-dos because of where it was invoked, while keeping the existing scope chips available to deliberately broaden into Goals, Arcs, or Chapters?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the system understands local intent without trapping the user in a narrow search mode.
- New value: one affordance serves the immediate retrieval job and still exposes Kwilt-wide recall when needed.
- Cost delta vs. original: low
- Anti-pattern check: pass — the scope is visible and user-controlled; no hidden AI interpretation is required.

### 4. Offer useful recovery before typing

**Yes, and what if it could...** show a few recent or likely To-dos immediately, so opening Search can recover something even before Maya remembers the exact words?

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: retrieval supports partial memory, not only exact query formulation.
- New value: recently touched commitments become reachable with one invocation and one selection.
- Cost delta vs. original: low, because the existing drawer already supplies recent/recommended results for an empty query.
- Anti-pattern check: pass — keep the set small and quiet; do not turn Search into a recommendation dashboard.

### 5. Establish a consistent capability-local search contract

**Yes, and what if it could...** define a reusable rule that invoking Search from a capability starts locally scoped, while invoking it from the capability menu starts global?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: users learn one predictable relationship between place and search scope across Kwilt.
- New value: future capability surfaces can add discoverable Search without inventing separate search experiences.
- Cost delta vs. original: medium
- Anti-pattern check: pass — this strengthens the accepted one-search-system contract; it should remain a behavior rule, not a new setting.

### 6. Support high-intent non-touch invocation later

**Yes, and what if it could...** allow a hardware-keyboard shortcut, system command, or accessibility action to open the same locally scoped Search when the user's intent is already explicit?

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: retrieval stays fast on desktop, keyboard-connected, and assistive-input contexts without creating another search surface.
- New value: power and accessibility users gain a direct path that shares identical scope and results.
- Cost delta vs. original: medium
- Anti-pattern check: pass — this is optional input parity, not productivity gamification or a required shortcut to discover the feature.

## What this expansion reveals

The offered idea is not secretly a request for a new search product. The valuable adjacent behaviors — searching beyond the active view, local-first scope, reversible return, and useful empty-query results — are already supported or naturally belong to the shared drawer contract. The unresolved product decision remains the trigger's placement and visibility on the To-dos surface.

No missing JTBD node is indicated. The existing `jtbd-capture-and-find-meaning` and `jtbd-trust-this-app-with-my-life` anchors adequately describe dependable retrieval.

## Frame recommendation

**Run the design-thinking loop with the original frame.**

Keep the scope to a discoverable To-dos Search entry. Carry these behaviors into divergence as acceptance constraints:

- A local invocation always opens To-dos-first.
- Search spans all eligible To-dos, not only the active view.
- The user can visibly broaden to the other existing scopes.
- Dismissal or result inspection preserves a coherent return path.
- Empty-query recents remain a quiet recovery aid.

Do not expand this slice into new ranking, new search data, a configurable search mode, or a universal redesign of every capability surface.
