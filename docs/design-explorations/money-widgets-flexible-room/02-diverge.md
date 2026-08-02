# Diverge: Money Widgets for Flexible Room

## Axis of variation

How much should WidgetKit separate the two jobs: one whole-month answer versus
one category answer?

All alternatives use the same native Money projection, App Group snapshot,
freshness timestamp, and Budget deep links. None changes the Arc, Goal,
Activity, or Chapter model; none blocks capture or any other Kwilt action.

## Alternative A: Two Clear Widgets

The widget gallery offers two Money widgets:

1. **Flexible money** — no financial configuration. It shows the exact
   whole-month amount left or over, the month, and quiet freshness. Tapping it
   opens Budget.
2. **Budget category** — the user selects a category and chooses `Dollars left`
   or `Percent used` in native widget configuration. Tapping it opens that
   category.

Existing category widget instances preserve `Percent used`. Newly added
category widgets default to `Dollars left`.

- Persona fit: Excellent. The gallery language matches the two questions Maya
  already asks.
- Design-challenge answer: The whole-month widget requires nearly no decision;
  the category widget requires only category plus preferred expression.
- System fit: Strong. It reuses one WidgetKit extension and AppIntent entity
  selection, while keeping each timeline entry simple.
- Best when: clarity and low day-to-day interpretation matter more than having
  the fewest gallery entries.
- Fails when: users expect to turn any existing Money widget into any other
  Money widget without removing and re-adding it.
- Anti-pattern check: Pass. Each widget gives one answer; neither becomes a
  dashboard, score, warning system, or behavior judgment.

## Alternative B: One Adaptive Money Widget

The gallery offers one **Money** widget. Native configuration first asks what
to show: `Flexible money` or a selected category. If the user selects a
category, a second option chooses `Dollars left` or `Percent used`.

The same widget kind changes its rendering and deep link based on those
parameters.

- Persona fit: Good after setup, weaker during setup. One gallery entry looks
  tidy, but the configuration asks the user to understand Kwilt's scope model.
- Design-challenge answer: It minimizes widget kinds, not necessarily user
  decisions.
- System fit: Strong technically. One AppIntent provider can branch between
  whole-plan and category payloads.
- Best when: users frequently repurpose existing widget instances and value one
  generic Money entry in the gallery.
- Fails when: the first configuration screen feels like a form or users cannot
  predict what “Flexible money” versus “Category” will look like.
- Anti-pattern check: Pass after configuration. Risk: generic configuration
  language can make a simple glanceable feature feel like system setup.

## Alternative C: One Whole-Month Glance

A medium widget leads with flexible money left, then shows two or three chosen
categories beneath it. Each category row uses either dollars left or percent
used. Small widgets remain category-only.

The medium widget opens Budget; individual category rows may deep-link on
supported interactive-widget versions.

- Persona fit: Mixed. It provides broad orientation, but it can invite scanning
  and comparison when Maya only needs one answer.
- Design-challenge answer: It reduces the number of widgets needed to monitor a
  plan, but increases the amount of information in each glance.
- System fit: Moderate. It needs multiple category selection, per-row display
  semantics, and potentially interactive deep-link behavior.
- Best when: users consistently want the whole-month answer and a few category
  constraints together.
- Fails when: the widget becomes a miniature Budget dashboard, category names
  truncate, or configuration becomes burdensome.
- Anti-pattern check: Borderline. It can pass only if the category rows stay
  subordinate and the surface avoids KPI-grid behavior. It is the least
  reductive option.

## Alternative D: Dollars-First Replacement

Replace category percentage widgets with dollars-left widgets and add flexible
money as another selectable scope. Percent used disappears from the default
product rather than remaining a presentation option.

- Persona fit: Strong for people who think only in dollars; poor for people who
  use percent as a quick relative comparison.
- Design-challenge answer: It creates the fewest concepts by declaring dollars
  left the sole practical language.
- System fit: Simple implementation, but it breaks existing widget expectations
  and abandons an explicitly requested option.
- Best when: testing proves percentages add interpretation cost without helping
  real decisions.
- Fails when: existing users deliberately chose percent and lose a useful
  glanceable signal.
- Anti-pattern check: Pass visually, but fails the current continuity and user-
  control requirements.

## Divergence takeaway

Alternative A optimizes for the fewest decisions in each moment. Alternative B
optimizes for the fewest widget kinds. Alternative C optimizes for information
density. Alternative D optimizes for one universal financial language.

The strongest candidates to carry into convergence are A and B. C is useful as
a possible later medium-family expansion, not as the first learning release.
D should remain rejected unless user evidence later shows percent is no longer
valuable.
