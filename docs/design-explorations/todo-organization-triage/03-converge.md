# Converge: To-Do Organization Triage

## Scoring

| Alternative | Maya fit | Job-flow improvement | Trust | Scope | Notes |
| --- | --- | --- | --- | --- | --- |
| A: Guided Triage Drawer | Strong | Strong | Strong | Medium | Best first answer to the customer's stated pain. |
| B: AI Organize Preview | Medium-strong | Strong | Medium | High | Powerful, but trust and AI quality must be earned. |
| C: Starter System Views | Medium | Medium | Strong | Low | Useful support work, but it risks answering discovery instead of overload. |
| D: Weekly Re-Entry Ritual | Strong later | Strong | Medium-strong | High | Better as a follow-on cadence after the manual ritual works. |
| E: Goal-Centered Bucketing | Medium | Medium-strong | Strong | High | Philosophically rich, but too much model shift for the immediate need. |
| F: Inferred Attention Layer | Strong | Strong | Medium-strong | Medium-high | Best answer if the goal is for organization to mostly just work. |

## Chosen alternative

Choose **Option F: Inferred Attention Layer**, with a small fallback from Option A: a review surface only for items Kwilt cannot confidently place.

The first version should make Activities feel organized before Maya asks for organization. Kwilt should compute an inspectable global priority model for each incomplete Activity, then let the views system project that model into useful surfaces. The user should see a sensible default order, a small set of obvious system views, and a clear next action without having to create a custom view. Prioritization happens in multiple passes: capture-time inference, list-time re-prioritization, manual re-prioritization, and low-confidence review. Manual re-prioritization is a normal control surface when Maya knows better; manual triage is only the safety valve for uncertain items.

## Product shape

- Add a global inferred priority model for incomplete Activities.
- Separate the model into five layers:
  - State: the broad action state. Most to-dos are implicitly active; exception states should be `later`, `waiting`, or `needs_review`.
  - Rank: the exact order among active candidates, so Kwilt can recommend one specific next Activity instead of handing the user a pile.
  - Actionability / placement: whether the Activity can reasonably be done now, is waiting on someone/something, depends on an availability window, or should be left out of the current active set.
  - Reason: the inspectable evidence, such as "Due today," "High-priority Goal," "Recently captured," or "No next step yet."
  - Recommendation surface: a small computed set of high-priority, currently actionable to-dos. Recommendation is not a tier or stored state.
- Treat the model as an attention lens, not a moral score or productivity rank.
- Run prioritization in passes:
  - Capture-time inference: when a new to-do is created, infer an initial state/rank from the text, schedule/reminder, selected Goal, parent Goal priority, explicit user inputs, and quick-add defaults.
  - List-time auto-prioritization: from the to-do list, let the user re-run prioritization based on transparent criteria such as Goal priority, due dates, stale scheduled items, unplanned captures, waiting markers, availability constraints, and recent edits.
  - Manual re-prioritization: let the user drag, mark, or choose a state/rank when she knows better; user changes should be respected, visible, and easy to revise.
- Treat new-item prioritization as local insertion by default. Use hidden lexicographic rank keys so a new Activity can be placed between neighbors without renumbering or visibly disturbing the whole list; rebalance rank keys only as invisible storage maintenance when a state's keys become too dense.
- Use deterministic signals first: scheduled date, reminder, explicit priority, parent Goal priority, recent edits, stale scheduled dates, steps, and completion/started state.
- Let AI enrich the model by proposing states, ranks, reasons, or suggested changes, but keep durable mutations previewed or undoable.
- Make system views consume the inferred priority model: Recommended, Ready/Active, Waiting, Later, Needs review, Unplanned, Recently captured, Stale scheduled, and Goal gaps.
- Keep scheduling as its existing due-date/reminder/recurrence model. A to-do can be active and scheduled, waiting and scheduled, or later and recurring.
- Let scheduling consume the same priority/rank/reason data without treating priority as immediate actionability. A high-priority Activity may be best placed later if it is waiting on someone, requires a business/service window, needs a certain location, or does not fit the user's current calendar constraints.
- Show the reason quietly when useful.
- Keep manual re-prioritization simple. If the user marks something important, moves it up, or changes its state, the engine should respect that more than a model inference.
- Use plain/non-final language for exception states: Later, Waiting, or Needs review. If the UI says Later, the backend state should also be `later`.

## Accepted trade-offs

- This adds a domain-level prioritization concept instead of treating priority as only a manual filter field.
- This makes prioritization a lifecycle, not a one-time AI judgment.
- This keeps model language consistent between UI and backend so the team does not have to translate `Later` into a different internal concept.
- This separates importance from actionability, which lets Kwilt recommend "schedule later" without pretending the Activity is less important.
- This makes user agency part of the design, not merely an error-recovery path.
- This avoids surprise cascades by distinguishing local insertion from explicit whole-list auto-prioritization.
- The first version can be deterministic and local; the magic comes from making existing signals coherent.
- The system may occasionally place an item imperfectly, so explanations and overrides matter.
- Views become more opinionated system surfaces, not only user-authored configurations.

## Rejected trade-offs

- Do not lead with a dashboard of counts, scores, or "system health."
- Do not confuse action states with exact next-action ordering; a tier alone cannot answer what to do next.
- Do not confuse priority with "do now"; availability, dependencies, and calendar fit must be allowed to defer high-priority work.
- Do not force users to maintain a visible priority taxonomy when the underlying rank can stay mostly hidden.
- Do not make AI silently reassign Goals, tags, schedules, or statuses.
- Do not require every to-do to be manually sorted.
- Do not hide manual re-prioritization behind settings or advanced view configuration.
- Do not make capture-time inference the final word; list-time context and user overrides must be able to revise it.
- Do not hide unanchored Activities or imply that unanchored means broken.
- Do not make this desktop-only; the customer's pain is already present on mobile.
- Do not give uncertain/deprioritized items therapeutic or overly abstract labels.

## Stated bet

We're betting that Kwilt can satisfy Maya's organization job best by inferring priority/actionability and letting views reflect that judgment automatically. If users still feel they have to manage the system, we should revisit by adding stronger AI organize previews and better override memory before adding more manual view controls.

## Success signal

Qualitative: users describe Kwilt as "already knowing what needs my attention" rather than "giving me more filters."

Behavioral:
- Users with crowded lists open system priority views more often than custom view settings.
- Users act from Recommended/Ready surfaces without first changing filters.
- Users can identify one recommended next Activity without manually sorting the whole active candidate set.
- High-priority but currently unavailable Activities are scheduled or held with clear reasons instead of sitting at the top as false "now" work.
- Users accept or lightly edit auto-prioritization criteria instead of building custom views from scratch.
- Manual re-prioritizations are easy to make and respected when they happen.
- Low-confidence review sessions are short and produce a better next action, schedule, waiting state, or Later decision.

## Follow-on build questions

- Should the global priority model be stored on the Activity, computed at read time, or stored as a user-overridable computed field?
- Should V1 expose priority display styles at all, or keep the underlying rank hidden behind recommendations and ordering?
- What criteria should list-time auto-prioritization expose by default?
- Should exact rank be visible, hidden, or only visible inside a "why this next?" explanation?
- What is the simplest manual re-prioritization gesture for V1: drag within a view, move to Later/Waiting/Needs review, star/pin, or all three?
- Which availability constraints belong in V1: waiting-on, business hours, location, energy/context, calendar free time, or only schedule windows from Auto-Schedule Assist?
- Does Waiting deserve a first-class Activity status, or is a tag enough for V1?
- What signals should be allowed to outrank explicit user priority?
- Are inferred priority views core/free while advanced custom views remain Pro?
