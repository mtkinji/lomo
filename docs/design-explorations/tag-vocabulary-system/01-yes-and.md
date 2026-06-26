# Yes-And: tag-vocabulary-system

## Original idea

Improve tags so Maya can find existing tags when creating or filtering, and so a growing tag list does not become unmanageable.

## Common tag-system paradigms researched

- **Searchable tag autocomplete at creation time.** Stack Overflow describes showing matching existing tags as the user types, ordered by frequency, because tags are how questions are grouped, ordered, and found. Source: [Stack Overflow Blog: Improved Tagging](https://stackoverflow.blog/2011/08/09/improved-tagging/).
- **Tag/label inventory with descriptions and management.** GitHub labels have a management surface for creating labels, descriptions, and colors, plus issue search/filter syntax for label retrieval. Sources: [GitHub managing labels](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/managing-labels), [GitHub issue filtering](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/filtering-and-searching-issues-and-pull-requests).
- **Select and multi-select option vocabulary.** Notion and Airtable both treat select/multi-select as choosing from an option list while still allowing new options. Sources: [Notion database properties](https://www.notion.com/help/database-properties), [Airtable multiple select field](https://support.airtable.com/docs/multiple-select-field).
- **Tag browser plus smart folders.** Apple Notes uses tags for quick categorization and Smart Folders for saved organization/search by tags. Sources: [Apple Notes tags and Smart Folders](https://support.apple.com/en-us/102288), [Apple Notes tag browser](https://support.apple.com/guide/iphone/organize-with-tags-iphedddbfdf9/ios).
- **Labels plus filters as separate concepts.** Todoist keeps labels and filters distinct: labels are reusable task metadata, filters are saved queries that can include labels. Source: [Todoist introduction to filters](https://www.todoist.com/help/articles/introduction-to-filters-V98wIH).
- **Synonyms/aliases to reduce drift.** Stack Exchange tag systems use synonyms so alternate names can resolve to a canonical tag. Source: [Stack Exchange tag synonyms example](https://ux.stackexchange.com/tags/autocomplete/synonyms).
- **Nested tags are powerful but costly.** Bear supports nested tags, but this pushes users toward folder-like taxonomy design. Source: [Bear nested tags](https://bear.app/faq/how-to-use-tags/).

## Yes, and what if it could suggest the existing tag before creating a new one?

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: capture stays fast while the system nudges reuse instead of drift.
- New value: typing "groc" finds Groceries before creating Grocery, groceries-list, or store.
- Cost delta vs. original: low
- Anti-pattern check: pass, if capture can still continue without choosing a tag.

## Yes, and what if each tag had a quiet inventory record behind the scenes?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the system can remember canonical labels, counts, recency, aliases, hidden status, and example uses without making every Activity carry admin metadata.
- New value: rename, merge, and hide become possible later.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if inventory exists to support retrieval rather than create a taxonomy dashboard.

## Yes, and what if "All tags" became a practical tag browser?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: Maya can open Groceries, School, Errands, or Home from one place when the top five are not enough.
- New value: scalable retrieval without exposing filter syntax.
- Cost delta vs. original: low to medium
- Anti-pattern check: pass, if it is a focused browser rather than an analytics page.

## Yes, and what if cleanup was prompted only when drift is obvious?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Maya is asked to resolve "Grocery" vs "Groceries" only when it helps future retrieval.
- New value: low-effort merge/alias flows keep tags clean over time.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if cleanup is optional and never blocks the task.

## Yes, and what if AI treated tags as a vocabulary to reuse, not a place to be creative?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: AI-tagged to-dos land in the groups the user already expects.
- New value: fewer generic, one-off tags; better tag group reliability.
- Cost delta vs. original: low
- Anti-pattern check: pass, if AI suggestions are inspectable and editable.

## Yes, and what if saved views could be born from tags, not configured from scratch?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: a useful recurring tag can graduate into a saved view only when the user naturally relies on it.
- New value: Groceries can become an easy openable view without requiring the user to understand filter logic.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if saved views remain optional and do not replace simple tag groups.

## Frame recommendation

Run the loop with an expanded frame: **Tag Vocabulary System**. The issue is not only tag filtering or grouping; it is the reusable vocabulary layer that makes capture, filtering, AI suggestions, tag groups, and future cleanup coherent.
