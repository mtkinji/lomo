# Converge: To-Do Action Contexts

## Scoring

| Alternative | Maya fit | Job-flow improvement | Preserves grouping | System fit | Scope | Role in the system |
| --- | --- | --- | --- | --- | --- | --- |
| A: Context Smart Views | Medium-strong | Strong | Strong | Strong | Medium | Inspect-more fallback when the user wants a full context list. |
| B: Context Grouping | Medium | Medium | Medium | Medium | Medium | Later scan lens if users want one master list sectioned by context. |
| C: Contextual Recommended Strip | Strong | Strong | Strong | Medium | Medium-high | First in-app expression of contextual next action. |
| D: Action Context Field | Strong later | Strong | Strong | Medium | High | Future shared context contract if signals need durability across surfaces. |
| E: Transition Prompts | Strong | Medium-strong | Strong | Strong | Low-medium | Explicit user-supplied context when Kwilt does not know the situation. |
| F: Contextual Next Action Surface | Strong | Strong | Strong | Medium | Medium-high | Primary outcome layer: one or a few low-friction next moves. |
| G: Tag-First Organization | Weak | Low-medium | Strong | Strong technically | Low | Optional evidence and power-user path, not the main UX. |
| H: Evidence-Based Saved Places | Strong | Strong | Strong | Medium | Medium | Mobile place-learning layer based on repeated task/location evidence and confirmation. |

## System Convergence

Choose a **Layered Contextual Action System**.

The product should keep the grouping implementation as a valid presentation feature. The new feedback should not be interpreted as "add more grouping dimensions until the list solves everything" or even "make better context views." The divergent options are mostly right, but they belong at different layers:

1. **Signals layer**: tags, Activity type, location metadata, saved places, future privacy-preserving place priors, schedule, title/notes cues, priority state, current Kwilt surface such as mobile or desktop, and recent behavior.
2. **Context layer**: lightweight contexts such as `Away`, `At saved place`, `Errands`, `At computer`, `Calls/messages`, and possibly `At home`. This may start as computed/session context and become a durable `actionContexts` field later.
3. **Next-action layer**: decide one or a few low-friction Activities that fit the current context.
4. **Delivery layer**: surface the next action through Recommended, widget/shortcut, opt-in notification, desktop prompt, agent response, or in-app view.
5. **Inspection layer**: if the user asks for more, open the matching context view.
6. **Scan layer**: grouping sections whatever list is visible by Goal, Schedule, or Status.
7. **Correction layer**: let the user say "not now," "not here," remove a context, or add a lightweight signal without turning it into taxonomy maintenance.

## Product shape

- Add a contextual action system for common modes:
  - `Away` or `Errands`
  - `At saved place`, such as a confirmed grocery, school, church, or store context
  - `At computer`, primarily through Kwilt Desktop
  - `Calls/messages`
  - `At home` only if there is enough signal to make it useful
- The primary output should be one or a small number of low-friction next actions, not always a full list.
- Delivery channels can include:
  - an in-app Recommended card
  - a widget or shortcut result
  - a calm notification when the user has opted into a trigger
  - the default or prominent surface in Kwilt Desktop for `At computer`
  - a context view when the user asks to inspect the list
- Use existing signals first:
  - tags such as `errands`, `computer`, `calls`, `home`
  - Activity type, such as `shopping_list`
  - location metadata when present
  - user-confirmed saved places inferred from repeated task/location evidence
  - current Kwilt surface, especially desktop vs mobile
  - title/notes cues for AI or deterministic suggestion, without silently mutating the Activity
- Treat tags as optional evidence, not the organizing system. The product should work when many Activities are untagged or inconsistently tagged.
- If the output is a list, let that context view preserve normal list controls. A user can inspect `At computer`, then group by Goal or Status inside that context.
- Keep `Context` out of the grouping drawer for V1. If users repeatedly ask for one full list sectioned by action context, revisit context grouping after context semantics have proven stable.
- Keep location triggers separate. A location trigger can surface a next action at a place; contextual next-action help can also work without permission or automation.
- Saved-place suggestions should require evidence and confirmation. A good prompt is "You often do grocery tasks here. Remember this as a grocery place?" not "We looked up this address."
- Cross-user place intelligence is a future layer, not V1. If Kwilt ever uses "people usually do grocery tasks here" as evidence, it should be privacy-preserving, opt-in or clearly disclosed, thresholded, coarse enough to avoid identifying an individual's home or routine, and secondary to the user's own confirmed places.
- Treat unclassified Activities as valid. They remain visible in All to-dos and can appear in a neutral `None` or "No context yet" state only inside context-management affordances, not as an error.

## Accepted trade-offs

- Contextual next actions may miss some useful Activities until tagging/inference improves.
- This adds a broader actionability system, but the user-facing V1 should still feel like one simple next-action surface.
- The first version may need an in-app Recommended expression before widgets, shortcuts, notifications, or richer desktop surfaces exist. That is acceptable if the model does not assume opening Kwilt is the job.
- `At computer` does not need mobile-side Mac presence detection in V1. Opening Kwilt Desktop can itself be the explicit context signal.
- Some layers should remain implicit until there is evidence. In particular, the context contract should not become a visible field before it earns its keep.

## Rejected trade-offs

- Do not discard or roll back grouping.
- Do not add many context labels to the grouping drawer in V1.
- Do not require users to classify every Activity at capture time.
- Do not make "tag tasks correctly, then create/switch tag views" the core experience.
- Do not make OS location permission a prerequisite for seeing away-from-home tasks.
- Do not query or classify every new address just because the user dwells there.
- Do not save frequent places silently; ask only when repeated task-place evidence makes the value clear.
- Do not use cross-user location/task patterns at household scale, low sample size, or in a way that could reveal a user's routine.
- Do not build Mac activity sensing before the desktop app itself proves useful as the `At computer` surface.
- Do not define success as opening Kwilt or switching to a context view.
- Do not let AI silently rewrite tags, Goals, schedules, or location triggers to make context views look smarter.
- Do not frame context as productivity optimization, task hygiene, or a dashboard.
- Do not ship all layers as visible UI at once. The system can be comprehensive without exposing every concept.

## System implications

- Recommended and next-best-action logic may be the better first implementation path than `ActivityView`.
- `ActivityView` can still carry fallback list views through templates or system views.
- Existing `tags`, `type`, and `location` are enough to prototype context membership, but tags should be treated as noisy hints rather than required structure.
- A future saved-place model may become useful before a broad `actionContexts` field if mobile recommendations repeatedly depend on places like grocery, school, church, or stores.
- A future cross-user place-prior model should require privacy review before implementation. Safer shapes include coarse public/place-category priors with minimum crowd thresholds; unsafe shapes include raw coordinates, rare places, homes, schools tied to small populations, or per-user routine leakage.
- A future `actionContexts` field may become worthwhile if:
  - users repeatedly use contextual next-action surfaces,
  - AI/context inference needs a durable inspectable target,
  - one Activity needs multiple contexts,
  - desktop/mobile/widget surfaces need a shared context contract.
- Grouping should remain unchanged for the current branch unless the implementation needs minor copy to clarify that grouping is for sectioning the current list.

## Sequencing

1. Start with contextual Recommended for `Away/Errands` on mobile and computer-ready recommendations in Kwilt Desktop, powered by existing signals.
2. Add a lightweight "not now / not here" correction path so wrong recommendations teach the system without forcing setup.
3. Add saved-place suggestions only after repeated evidence, for example grocery/shopping tasks at the same location, and require user confirmation.
4. Add inspect-more context views only after the next-action surface has something credible to show.
5. Promote context to a durable `actionContexts` field only if cross-surface behavior needs a shared contract.
6. Consider `Context` grouping only if users ask to scan one master list by context, not because the system needs context internally.

## Stated bet

We're betting that the right answer is a layered contextual action system whose first visible slice is a least-friction next action, not a choice between tags, views, grouping, recommendations, prompts, and future context fields. If users mostly want one master list sectioned by context, we should revisit by adding `Context` as a grouping after the context labels and membership rules are proven.

## Success signal

Qualitative: users say "Kwilt helped me know what to do while I was out" or "when I sat down at my computer, the right next task was obvious" without saying they had to open the app and set up a system.

Behavioral:
- Users act on context-aware recommendations, widgets, prompts, or context views without first editing filters.
- Users still use grouping inside context views for scanability.
- Context views produce fewer "wrong list" moments than broad All to-dos.
- Users do not start over-tagging Activities just to make the feature useful.

## Next design challenge

How might we prototype `Away` on mobile and `At computer` in Kwilt Desktop as contextual next-action recommendations using existing Activity fields, while making it obvious how a user can correct the suggestion or confirm a repeated place pattern when Kwilt gets context wrong?
