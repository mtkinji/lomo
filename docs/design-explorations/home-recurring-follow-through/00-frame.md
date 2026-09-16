# Frame: Home Recurring Follow-Through

## What the user said

> The today slash recommend experience would now actually be the feed. We have a
> feed on Home. That would be a good place to do it. I think skip, snooze, or move
> on would need to really be thoughtfully surfaced within the to-do somewhere. I
> think a skipped to-do could be a signal we want to preserve somewhere, perhaps
> for a Chapter to comment on them and whether they were following through.

## Restated in user voice

When a recurring commitment comes around and real life changes the plan, I want
Kwilt to bring it back into the flow of my life and let me complete it, defer it,
or honestly let that occurrence go, so the series keeps moving and later
reflection can help me notice whether the rhythm still serves what matters to me.

## Target audience

`audience-aspirational-family-organizers` — people who want ordinary personal and
family commitments to remain dependable without maintaining a productivity
system.

## Representative persona

Maya has recurring responsibilities mixed into a changing household day. She
does not want a separate morning planning ritual just to make the right to-do
reappear, and she does not want one missed occurrence to become debt or shame.

- Current situation: recurring work competes with family changes, interruptions,
  and shared-life moments already arriving on Home.
- What she's trying to do: keep meaningful rhythms alive while making honest
  decisions about each occurrence.
- Emotional state or tension: she wants dependable support, but resists both
  nagging and the quiet disappearance of intentions.
- What would make this feel wrong to her: a task dashboard on Home, repeated
  overdue alarms, a reason form every time she skips, or a Chapter that grades
  her follow-through.

Marcus remains a secondary guardrail: this must reduce maintenance rather than
turn Home into another productivity inbox.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — recurring commitments matter only when
they help Maya carry a few real intentions into ordinary action.

## Job flow step

The primary gap is **Schedule or hand off work when it cannot happen now**, rated
**2/5** in `job-flow-maya-move-family-life-forward`. The supporting gaps are
**Trust that the to-do will not disappear** at **3/5** and **Know the next doable
action** at **2/5**.

Kwilt can encode recurrence, generate one occurrence at a time, schedule a local
reminder, show setup recommendations on Home, and preserve completed or skipped
occurrences. It does not yet turn the Home feed into the dependable re-entry
surface for current recurring commitments, and skipped occurrences are not yet
available to Chapters as explicit reflective evidence.

## Active anchors

- `jtbd-carry-intentions-into-action` — Kwilt should carry the recurring thread
  across time without making the user rebuild it each day.
- `jtbd-make-sense-of-the-season` — repeated completions and skips can
  become grounded retrospective evidence when interpreted humbly.
- `jtbd-trust-this-app-with-my-life` — notification, feed, recurrence, and
  Chapter language must remain predictable, reversible, and free of shame.

```yaml
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-make-sense-of-the-season, jtbd-trust-this-app-with-my-life]
```

## Friction we're addressing

The current recurrence engine is capable, but the attention loop is fragmented.
The reminder is one-shot, the private action does not naturally re-enter the Home
feed, and **Skip this one** is hidden in the to-do overflow. Snooze schedules
another local notification without changing the Activity's persisted reminder,
while Skip advances the recurrence and leaves only a generic skipped status and
update time. Chapters currently exclude skipped Activities from carried-forward
work rather than treating them as a distinct occurrence outcome.

The missing contract is not merely “show a task card on Home.” Completion already
has a canonical affordance and should remain ordinary rather than becoming one
more labeled choice. The new design work is giving the exceptional responses a
clear meaning:

- **Snooze** — defer attention briefly; keep the same occurrence and commitment.
- **Skip this one** — intentionally close this occurrence without completion,
  preserve that fact, and advance the series without creating debt.

Using the existing completion affordance still means that this occurrence
happened and the series advances. The feed should reuse that affordance rather
than add a separate **Complete** button.

Rescheduling remains available through ordinary due-date or reminder editing in
Activity Detail. It is not a separate recurring-occurrence resolution action.

## System alignment

Constraint posture: `Bend the system`

### Current system facts

- Existing surface: Home is a person-centered, chronological shared-life feed
  with a private setup-recommendation region above it.
- Existing feed grammar: Moment, Contribution, Personal message, and Invitation /
  request describe shared or delivered content; none describes a private
  continuation from the user's own life system.
- Existing user flow: Home recommendations currently help people discover or
  continue Household, Money, and Meals setup. They do not select Activities.
- Existing recurrence model: one visible Activity occurrence at a time; Complete
  or Skip creates the next occurrence and carries its scheduled/reminder time.
- Existing resolution UI: completion already has its normal to-do affordance;
  **Skip this one** lives in Activity Detail's overflow; notification actions
  are **Start Focus** and **Snooze 1h**.
- Existing evidence model: recurring occurrences share `repeatSeriesId`, but an
  Activity has no dedicated skipped-at timestamp or optional
  occurrence-resolution context.
- Existing Chapter behavior: Chapters are retrospective and data-grounded, but
  current generation excludes skipped Activities from carried-forward work.

### Constraints to preserve

- Home remains a calm feed, not a dashboard, task list, or second Activities
  screen.
- Completion reuses the existing to-do affordance; the design does not add a
  second button or competing completion path.
- The feed may recommend an occurrence, but Activity remains the authoritative
  object and Activity Detail remains the place to understand or change its
  recurrence.
- A private to-do item is visibly private and cannot be confused with something
  shared to the household.
- Feed ordering cannot bury people and ordinary shared life under a queue of
  tasks; a quiet day and a completed day both remain acceptable.
- Snoozing changes attention timing, not the factual outcome of an occurrence.
- Skipping closes one occurrence without claiming completion.
- Skip evidence is factual, correctable, and occurrence-specific. Asking for a
  reason remains optional and exceptional, not a reflection tax.
- Chapters may name repeated patterns and ask an open question; they must not
  infer character, motivation, or failure from a single skip.
- Chapters remain retrospective only. They may help the user see a rhythm, but
  they do not reschedule the next occurrence themselves.

### Constraints we may challenge

- Home is no longer only a shared-life stream. It may become a mixed life feed
  containing carefully bounded private continuity items alongside shared moments.
- The existing four feed patterns may need a fifth private **Continuation**
  pattern, rather than forcing a to-do into a social Moment or request.
- Skip may need to move out of the overflow when a recurring occurrence is
  actively asking for a decision.
- The current Activity status alone may be insufficient evidence for trustworthy
  Chapter reflection.

### Design implication

Home should own **re-entry and attention**, not recurrence administration. A
recurring occurrence can enter the feed when it is genuinely timely and offer a
small immediate action. Its existing completion affordance remains primary,
while the to-do thoughtfully exposes Snooze and Skip with its recurrence
explanation. Persisting the outcome should create a quiet evidence trail that
Chapters can aggregate by series, Goal, and season.

Chapter interpretation should distinguish observation from judgment. For
example, after enough evidence it may say, “Sunday preparation was planned four
times and skipped twice. Is that still the right rhythm?” It should not say,
“You failed to follow through.”

## Aspirational design challenge

How might we help Maya encounter the recurring commitment that most deserves a
decision inside her Home feed, resolve that occurrence honestly with minimal
friction, and later recognize whether the rhythm still fits her life—while
preserving Home's shared-life warmth, Activity authority, and shame-free
reflection?

## Out of scope

- Turning Home into a complete task list or configurable productivity dashboard.
- Showing every due or overdue Activity in the feed.
- Repeated notifications until an Activity is completed.
- Requiring a reason when the user skips an occurrence.
- Publishing personal to-do outcomes to household members by default.
- Letting a Chapter modify future recurrence without an explicit user action.
- Final ranking logic, schema, notification cadence, or feed-card composition.

## Open question

Should the first learning release interleave one private Continuation item in the
chronological feed, or preserve the shared stream by placing one bounded personal
continuation immediately above it?
