# Frame: due-date-reminders

## What the user said
> I have this feeling like we need to modify the "Reminders" part of Kwilt. Every time I have to set a reminder I think to myself - would this be better as a function of the Due date? It's annoying to me because I feel like reminders should be in relation to due dates for the most part. I rarely care enough about setting the reminder, but I often feel like I care to set a due date, and when doing that I expect reminders to happen automatically somehow in relation to that due date.

## Restated in user voice
When I give a to-do a due date, I want Kwilt to carry the follow-through moment for me, so that I do not have to become the reminder engine just to trust that the thing will come back at the right time.

## Target audience
`audience-aspirational-family-organizers` - Aspirational family organizers. This is the best first lens because the screenshot and problem are ordinary-life follow-through: household, family, appointments, and small commitments that need to reappear without turning Kwilt into a power-user task system.

## Representative persona
Maya: Maya is helping her family become more organized without adopting a productivity methodology.

- Current situation: she captures real family to-dos, often with a date attached, then has to decide whether a separate reminder is worth configuring.
- What she is trying to become/do: someone whose family commitments reliably resurface before they are missed.
- Emotional state or tension: she wants trust and relief, not another field to tune.
- What would make this feel wrong to her: reminder math, notification spam, power-user defaults, or unclear automation that changes dates without explanation.

## Hero anchor
`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few areas I most want to grow.

## Job flow step
`job-flow-maya-move-family-life-forward`

- Underserved step: "Schedule or hand off work when it cannot happen now."
- Current product offering: Activities, Quick Add, due date, reminder, location, repeat, Plan, system views, and notification settings.
- Delivery score: 2.
- Gap: scheduling and follow-through exist as separate controls, but they do not yet feel like one calm promise.

## Active anchors
- `jtbd-move-the-few-things-that-matter` - due dates should help users move important commitments, not just classify to-dos.
- `jtbd-carry-intentions-into-action` - this is the direct job: carry a fragile intention across time without making the user manage every step.
- `jtbd-trust-this-app-with-my-life` - automatic reminders need clear, respectful notification behavior or they become a trust problem.

## Friction we're addressing
The current Activity detail surface separates "Reminder" and "Due date" under "Triggers." That is technically clear but behaviorally fussy: users often know when something is due before they know the exact reminder timestamp. The deeper annoyance is that Kwilt is asking the user to design the app's interruption behavior after they already expressed the commitment. The user expects the due date to be enough for one reasonable nudge unless they choose otherwise.

## System alignment
Constraint posture: `Fit the system`

Current system facts:
- Existing surface: Activity detail has a planning/triggers section with Reminder, Due date, Location, Repeat, estimate, and difficulty.
- Existing user flow: users can set an exact reminder timestamp or a date-only due date from separate bottom sheets.
- Existing domain/data model: `Activity.reminderAt` is an exact timestamp; `Activity.scheduledDate` behaves like due date / anytime-today; `Activity.scheduledAt` is separate provider-backed scheduled-time semantics.
- Existing technical affordances: `NotificationService` already schedules one-shot Activity reminders from `reminderAt`; Quick Add trigger enrichment already infers reminder and scheduled date together.
- Existing UX/copy conventions: Activity surfaces should reduce maintenance, preserve capture-first behavior, and avoid generic productivity-app voice.

Constraints to preserve:
- Keep `reminderAt` and `scheduledDate` as separate fields because exact nudges and due-date semantics are different.
- Do not block capture behind notification permission or date configuration.
- Do not make reminders urgent by default.
- Keep manual reminder control available for exceptional cases.

Constraints we may challenge:
- The user-facing "Reminder" row should not remain the primary way to express ordinary due-date follow-through.
- The "Triggers" framing may be too implementation-shaped for Maya's mental model.

Design implication:
The smallest promising move is not a new reminder system. It is a responsibility shift: due dates become enough for Kwilt to take on one calm follow-through nudge, and reminders become an exception override rather than a required second decision.

## Aspirational design challenge
How might we help Maya set a due date and trust that Kwilt will carry the reminder burden for her, while preserving calm notifications, capture-first behavior, and explicit control over exceptions?

## Out of scope
- Multi-reminder schedules.
- AI-generated notification campaigns.
- Calendar sync changes.
- Changing `scheduledAt` / Plan calendar semantics.
- Location-trigger redesign.

## Open question
Should the default due-date nudge happen the morning of the due date, the evening before, or depend on due-date distance and task shape?
