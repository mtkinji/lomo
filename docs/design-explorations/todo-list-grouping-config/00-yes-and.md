# Yes-And: To-Do List Grouping Config

Original idea: Add a "Grouping" config to the to-do list so users can choose how Activities are visually sectioned.

**Yes, and what if it could...** make a crowded list easier to scan without replacing Smart order.

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: The user can orient inside a pile by seeing meaningful sections while Kwilt still decides the helpful order inside each section.
- New value: Grouping becomes a readability lens, not another ranking system the user has to maintain.
- Cost delta vs. original: low
- Anti-pattern check: pass, if Smart order remains the default and grouping is not presented as productivity optimization.

**Yes, and what if it could...** adapt group choices to the current view and sort.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: The user sees only grouping options that help the current action context, such as Goal, schedule, or status.
- New value: Kwilt avoids showing nonsensical combinations like a Recommendation module above a strict field sort plus unrelated sections.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if unavailable combinations are quietly hidden or explained in plain language.

**Yes, and what if it could...** preserve the user's preferred grouping per view.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: The app remembers the way the user prefers to re-enter a recurring list without forcing that preference globally.
- New value: All to-dos, Today, Waiting, Later, and custom views can each hold the grouping that makes sense for that lens.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if saved view settings stay transparent and easy to reset.

**Yes, and what if it could...** use grouping to reveal missing structure gently.

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: Activities without a Goal or schedule remain first-class, but the user can see when a cluster may need a Goal, schedule, or release.
- New value: Grouping becomes light sensemaking over captured life, not an audit queue.
- Cost delta vs. original: low
- Anti-pattern check: pass, if unanchored/unscheduled sections use neutral language.

**Yes, and what if it could...** let future AI propose useful groupings without applying them silently.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Kwilt can notice "this view might work better grouped by Goal" while keeping the user in control.
- New value: Grouping can become a recommendation surface later without becoming opaque auto-configuration now.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if suggestions are previewed, reversible, and not anthropomorphic.

**Frame Recommendation:** Run design-thinking-loop with the original frame. The feature is a concrete configuration addition, but it touches the Activities organization model enough to need a spec. Keep it scoped to grouping as a view/list presentation setting, explicitly separate from Smart order and Recommended.
