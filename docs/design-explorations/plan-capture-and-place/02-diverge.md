# Diverge: plan-capture-and-place

Axis of variation: slot-first vs Activity-first, persistent capture vs momentary capture, and user-driven vs recommendation-driven.

## Alternative A: Long-Press Slot Composer

When the user long-presses open time on the Plan calendar, Kwilt shows a temporary block preview. While the finger stays down, dragging adjusts duration in 15-minute increments. On release, Kwilt opens a time-shaped composer for that selected block with "New to-do here" and "Choose existing." New creates a lightweight Activity with the selected start/end; existing opens a scoped Activity picker and commits the chosen Activity into the slot.

- Audience/persona fit: strong for Marcus because it removes tab switching without adding a new planning surface.
- Design-challenge answer: open time becomes the place where one honest next action is captured or placed.
- System-fit note: extends `PlanCalendarLensPage` gesture handling, reuses `addActivity`, calendar commit logic, and Activity scheduling state.
- Best when: the user starts from "I have space here."
- Fails when: the user wants Kwilt to choose the work without deciding.
- Primer anti-pattern check: passes. Activity remains the object; capture is not blocked by Goal/Arc; no dashboard, streak, forced commitment, or anthropomorphic AI.

## Alternative B: Recommendations Sheet "Add One More"

Add a compact inline offer in the Recommendations sheet: "+ Add a to-do." It starts collapsed, like the current To-dos Quick Add dock, so the recommendation list stays primary. When tapped, it expands into the familiar Quick Add composer with AI actions available. Submitting creates a real Activity immediately, then keeps that Activity in the sheet with an offer to schedule it now: ideally a proposed time, or a "Pick a time" fallback when no safe slot is available. The user still taps Commit before Kwilt writes the calendar.

- Audience/persona fit: good when the user is already in the recommendation mindset and wants the sheet to include a missing Activity.
- Design-challenge answer: the recommendation moment can capture missing work without stealing vertical space from the calendar canvas.
- System-fit note: extends `PlanRecsPage` and the existing Quick Add dock/controller, but keeps it inside the sheet rather than permanently mounted over the calendar.
- Best when: the user is reviewing suggestions and notices "the thing I actually need is not here," but has not chosen an exact time block manually.
- Fails when: the user is looking at a specific empty slot and wants to control the exact duration with their finger.
- Primer anti-pattern check: passes if AI enrichment is optional and does not turn into AI choosing the day for the user.

## Alternative C: Existing-Activity Slot Picker First

When the user taps open time, Kwilt opens a picker of unscheduled Activities that fit the selected slot. A secondary "Create new" action exists, but the main affordance is rescuing existing work.

- Audience/persona fit: good for Marcus's maintenance-reduction need, because it avoids duplicate todos.
- Design-challenge answer: Plan turns the calendar into a decision lens for existing commitments.
- System-fit note: reuses Activity search/filtering and commit code, but needs fit scoring by duration and conflict.
- Best when: the user already has a useful Activity inventory.
- Fails when: the user's intent is new and rough; a picker can feel like a mini inbox.
- Primer anti-pattern check: mostly passes; risk is productivity-app list churn if the picker gets dense.

## Alternative D: Persistent Calendar Quick Add Dock

Mount the existing Quick Add dock over the Plan calendar canvas, like the Activities tab, so the user can create a to-do from Plan at any time.

- Audience/persona fit: weak. It gives broad capture access, but it competes with the day view and bottom navigation.
- Design-challenge answer: captures new work, but does not express "this exact slot and duration."
- System-fit note: technically plausible because `QuickAddDock` supports reuse, but poor surface fit for the compact calendar view.
- Best when: Plan becomes a general command center rather than a calendar-first surface.
- Fails when: vertical calendar inspection is the primary job, as in the current screenshots.
- Primer anti-pattern check: risky because persistent capture can make Plan feel like another productivity input surface.

## Alternative E: Long-Press Existing Activity To Schedule

Do not add creation to Plan. Instead, the user opens Activity search from Plan, long-presses an Activity, then chooses a calendar slot.

- Audience/persona fit: weak. It preserves existing objects but makes the user work too hard at the exact moment they are trying to plan.
- Design-challenge answer: partially answers "add existing," but ignores "create new."
- System-fit note: likely broad navigation and gesture complexity.
- Best when: avoiding any new Plan drawer is the top priority.
- Fails when: dogfooding Plan as the primary daily operating surface.
- Primer anti-pattern check: passes technically, but fails the calm UX bar by adding hidden interaction cost.

## Preferred Direction

Alternative A is the strongest for the calendar canvas. It honors the Outlook-style interaction pattern: single tap stays reserved for inspect/select behavior, long press creates a provisional block, drag sets duration, and release opens a composer. Alternative B is a good secondary sheet affordance for the Recommendations moment. Alternative D should be rejected for now because the Plan calendar is already space-constrained.
