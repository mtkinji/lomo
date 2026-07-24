# Diverge: budget-reality-gate

## Axis Of Variation

The useful variation is where the product creates value:

- at app-open time with a hard gate,
- before app-open time with a soft review habit,
- or after spend with a reflection loop.

The Kwilt context primer biases this toward app-open time because
`jtbd-put-intention-before-impulse` is hot before the drift happens. The concept
must still preserve agency, avoid dashboard behavior, and never make the user
feel punished.

## Alternative 1: Hard Gate, Soft Voice

Amazon, DoorDash, or another selected target stays behind the Screen Time shield until the
user reviews the meter mapped to that target. The review screen shows percent used, remaining
runway, pace, and two choices: `Open for now` or `Leave blocked`. A
`BudgetReviewEvent` records the choice and powers the short unlock window.

Audience/persona fit: strong for Maya when a specific app repeatedly causes
household spending drift.

Design-challenge answer: puts the budget-reality pause directly before the
impulse while keeping the decision user-owned.

System-fit note: extends the existing `BudgetReviewEvent` and Screen Time seam.

Best when: there are clear app/meter pairs, like DoorDash to takeout or Amazon to household extras.

Fails when: the user wants general budgeting insight without app restrictions.

Primer anti-pattern check: passes if setup is explicit and reversible; fails if
copy becomes punitive or the app hides why access is blocked.

## Alternative 2: Soft Check-In Before Open

The app sends or surfaces a contextual reminder before the user opens a
spending app, but does not actually block access. The user can review the lane
and choose to proceed, but the OS gate is not part of the first release.

Audience/persona fit: moderate for Maya because it is gentle, but weaker when
habitual spending needs a true pause.

Design-challenge answer: supports intention before impulse, but relies on the
user noticing and respecting the prompt.

System-fit note: avoids Screen Time complexity; still uses `BudgetLane` and
`BudgetReviewEvent`.

Best when: the product is still proving comprehension and copy.

Fails when: the prompt becomes ignorable or notification-like.

Primer anti-pattern check: passes if calm and sparse; fails if it becomes naggy.

## Alternative 3: Runway Home Meter

The app is primarily a home-screen resource meter. It shows household spending
runway, highlights lanes that are ahead of pace, and lets Maya manually review
before spending. The access gate becomes a later add-on.

Audience/persona fit: moderate; it maps to the live resource-meter insight, but
does not reach the spend moment.

Design-challenge answer: helps Maya understand reality, but not necessarily
before impulse.

System-fit note: fits the existing home screen with minimal domain changes.

Best when: real transaction data exists and the product can be opened daily.

Fails when: the user only checks it after spending has already happened.

Primer anti-pattern check: risk of becoming a dashboard. Must stay rule-driven
and decision-oriented in V1, even if multiple meters exist.

## Alternative 4: Spend Reflection Receipt

After the user opens the app or logs a purchase, Kwilt Money asks whether the
purchase matched the household lane intention. It becomes a lightweight
reflection tool rather than an app gate.

Audience/persona fit: weak for the first value unit. Maya probably does not
want another logging task.

Design-challenge answer: supports learning, not prevention.

System-fit note: would require purchase capture, manual logging, or bank sync.

Best when: the goal is retrospective insight.

Fails when: the job is stopping automatic app drift.

Primer anti-pattern check: high admin risk; likely violates "helpful, not
fussy" for Maya.
