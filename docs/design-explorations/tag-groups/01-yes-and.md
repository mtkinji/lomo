# Yes-And: tag-groups

Original idea: improve tagging so users can group to-dos into practical sets like Groceries and pull that group up when they need it.

**Yes, and what if it could...** make used tags feel like lightweight saved groups rather than loose metadata?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: The user can move from capture to in-context action without constructing a custom view.
- New value: "Groceries" becomes an openable place in the Activities list.
- Cost delta vs. original: low
- Anti-pattern check: pass; this fits existing Activities and views.

**Yes, and what if it could...** teach AI to prefer the user's exact existing grouping language before inventing or broadening tags?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: The app becomes predictable because it keeps using the words the user already chose.
- New value: "Groceries" stays "Groceries" instead of being collapsed into "errands."
- Cost delta vs. original: low
- Anti-pattern check: pass; AI remains backstage and constrained.

**Yes, and what if it could...** distinguish a primary grouping tag from optional descriptive tags without adding visible complexity?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: The app knows which tag is for retrieval and which tags are secondary descriptors.
- New value: It avoids multi-tag grouping ambiguity while preserving useful metadata.
- Cost delta vs. original: medium
- Anti-pattern check: pass if primary tag is inferred/reviewable, not a required capture field.

**Yes, and what if it could...** let Quick Add inherit the open tag group so "milk" entered inside Groceries automatically lands there?

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: The user's context does the organizing with almost no extra input.
- New value: The group becomes a working surface, not only a filter.
- Cost delta vs. original: low, because tag-filter inheritance already exists.
- Anti-pattern check: pass; capture remains fast.

**Yes, and what if it could...** offer tag suggestions in the detail field from recent tag history?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: The user can reuse a stable vocabulary instead of typing variants.
- New value: Fewer one-off tags and less tag drift.
- Cost delta vs. original: medium
- Anti-pattern check: pass if suggestions stay quiet and optional.

**Yes, and what if it could...** show a compact "Tags" entry point from the Activities list when the user has meaningful tag history?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: The user does not need to remember that tag filters live inside custom views.
- New value: Common groups become accessible in one or two taps.
- Cost delta vs. original: medium
- Anti-pattern check: pass if it is not a dashboard or taxonomy manager.

**Yes, and what if it could...** later promote frequently used tag groups into context-aware recommendations?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: The app can surface "Groceries" when a planning or location context makes it relevant.
- New value: Better retrieval timing.
- Cost delta vs. original: high
- Anti-pattern check: defer; avoid location creep and surprising automation in V1.

## Frame Recommendation

**Run design-thinking-loop with the expanded frame** - the useful frame is not "group by tags" in the list-sectioning sense. It is "tag groups as a simple retrieval layer over existing Activity tags and views."
