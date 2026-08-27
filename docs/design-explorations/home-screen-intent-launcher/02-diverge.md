# Diverge: Home Screen Intent Launcher

## Fixed design challenge

How might we give each person a fast, recognizable front door to the parts of Kwilt that matter most to them, while keeping Ask Kwilt universally available and avoiding a miniature app grid?

## Axis of variation

The alternatives vary by **how much shortcut choice the widget exposes and how that choice is represented**: four compact destinations, three legible destinations, or one coherent destination set.

## Alternative A: Personal Rail

Four individually configurable circular shortcuts run across the top. A full-width `Ask Kwilt` bar anchors the bottom and opens a fresh unsent composer. Each top position is selected independently in Edit Widget from a bounded list of stable Kwilt destinations and actions. Focus becomes a compact countdown when active if it occupies one of the four positions.

- Audience/persona fit: high for Nina and other users who already know which parts of Kwilt they rely on.
- Design-challenge answer: offers the most direct translation of “the parts of Kwilt that matter most to me.”
- System fit: high. Reuses existing deep links, Focus shared state, and the same App Intent widget-configuration mechanism used by the Money category widget.
- Four-object stance: destinations can open Arcs, Goals, To-dos/Activities, or Chapters, but the launcher creates and edits none of them.
- Capture-first stance: `Add To-do` can open Quick Add directly without requiring Arc or Goal selection.
- Best when: breadth and resemblance to familiar launcher widgets matter most.
- Fails when: four icons plus labels become cramped, ambiguous, or hard to tap confidently.
- Primer anti-pattern check: pass if the row is visually quiet and bounded; failure if more pages, badges, or nested categories turn it into an app drawer.

## Alternative B: Chosen Trio

Three individually configurable, labeled shortcut tiles run across the top. Each has room for a clear icon, a short label, and a small state treatment such as a Focus countdown. The same full-width `Ask Kwilt` bar anchors the bottom. Defaults can be Focus, Calendar, and To-dos, while Edit Widget lets each position draw from the broader bounded list.

- Audience/persona fit: high for Marcus; fewer, more legible choices reduce navigation without recreating navigation.
- Design-challenge answer: balances personal relevance with a calm, dependable visual hierarchy.
- System fit: high. It uses the same configuration and deep-link contracts as Personal Rail with less layout and accessibility pressure.
- Four-object stance: neutral launcher; capability-owned screens retain object meaning and editing.
- Capture-first stance: strong when `Add To-do` is selected; the shortcut enters the existing To-dos Quick Add state directly.
- Best when: the widget must remain legible in tinted, dark, StandBy, and accessibility contexts.
- Fails when: users consistently need four equally frequent destinations and resent choosing only three.
- Primer anti-pattern check: pass. Three bounded destinations plus one stable Chat action remain a launcher, not a dashboard.

## Alternative C: Intent Set

Instead of configuring each position, the user chooses one named set in Edit Widget, such as `Move the day` (Focus, Calendar, Add To-do), `Run the household` (Chores, Meals, Calendar), or `Look after the system` (Money, Goals, Plan). Ask Kwilt remains fixed at the bottom. The set keeps the row internally coherent and can still show bounded state such as an active Focus countdown.

- Audience/persona fit: medium. It reduces configuration work for less technical users but asks them to identify with Kwilt-authored bundles.
- Design-challenge answer: offers tailored entry without four separate configuration decisions.
- System fit: high technically, but medium conceptually because Kwilt would own and explain a new set taxonomy.
- Four-object stance: safe if sets remain navigation presets; risky if they become a new user-managed planning object.
- Capture-first stance: depends on the selected set; no set may block ordinary capture elsewhere.
- Best when: most users share a few recognizable patterns and individual slot configuration proves burdensome.
- Fails when: a person's actual combination crosses set boundaries or the set names feel like imposed personas.
- Primer anti-pattern check: pass only if sets stay optional and plain; failure if they become modes, scores, or prescriptive workflows.

## Comparison summary

| Alternative | Personal relevance | Label clarity | Configuration effort | State room | App-grid risk |
| --- | --- | --- | --- | --- | --- |
| Personal Rail | Highest | Medium | Medium | Low | Medium |
| Chosen Trio | High | Highest | Medium | High | Low |
| Intent Set | Medium | High | Lowest | Medium | Low-medium |

## Divergence takeaway

Andrew's top-row/bottom-bar inversion is the right stable composition. Andrew selected **Personal Rail** with four individually configurable affordances. That decision makes four user-chosen destinations part of the product contract rather than a density experiment.

The visual treatment must now prove that four short labels, accessible tap targets, and a compact active-Focus countdown remain legible at the actual medium-widget size. If circular icons cannot carry that contract, the shape or typography should change; the implementation should not silently remove labels or reduce the four chosen positions. Intent Set should wait unless individual configuration proves confusing in dogfooding.
