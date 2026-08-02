# Pet Engine Study 26 — A Little Life Growing Beside Yours

## Frame and system alignment

> I should feel like the character can evolve from a baby to a powerful adult
> creature. Through all this, I should engage by doing the things in Kwilt that
> represent progress in life.

Charlie can now play differently with each form, but the prototype still makes
the growth journey hard to experience. After today's care, the capability keeps
showing action buttons that cannot create another care moment; the only route
to tomorrow is a buried inspector control. The engine proves thresholds, while
the product flow obscures them.

The target remains `audience-aspirational-family-organizers`, represented by
Maya and pressure-tested through Charlie. The hero job is
`jtbd-move-the-few-things-that-matter`; this study serves
`jtbd-feel-arc-progress-without-tracking-tools`,
`jtbd-help-us-enjoy-being-together`, and `jtbd-trust-this-app-with-my-life`.
It strengthens **Keep using the system because it feels helpful, not fussy**
in `job-flow-maya-move-family-life-forward` (3/5).

Constraint posture: **Fit the system.** Keep one meaningful action → one
available care moment → one remembered care day → stage thresholds. Expose a
truthful prototype accelerator only after the day's care has settled. Do not
change the production concept: real Kwilt waits for a real next day.

How might we let Charlie experience the whole healthy-action-to-evolution arc
in minutes, while preserving the truth that care is bounded to one real day and
missed days never cause loss?

## Anchor assessment

### Restated in user voice

When I do something real and care for Moss, I want the little world to reach a
natural stopping point and welcome me into the next chapter, so I can feel our
growth without grinding dead buttons or operating developer tools.

### Matches

- `jtbd-feel-arc-progress-without-tracking-tools` — the repeated life rhythm
  makes progress legible through transformation rather than a score.
- `jtbd-help-us-enjoy-being-together` — the complete loop is short enough to
  discover and share while still respecting one care moment per day.
- `jtbd-trust-this-app-with-my-life` — the prototype names accelerated time
  honestly and never implies that repeated button presses are real progress.

```yaml
serves: [jtbd-feel-arc-progress-without-tracking-tools, jtbd-help-us-enjoy-being-together, jtbd-trust-this-app-with-my-life]
```

## Yes-and decision

Expansion is skipped. This is a bounded repair of the existing learning flow,
not a calendar system, time mechanic, onboarding tour, or new progression
model. The job elevation is that the prototype can finally test the emotional
arc it already claims to contain.

## Divergence

Axis of variation: **how should a tester cross days without falsifying the
product?**

### Keep time in the inspector

Preserve the current developer control and add better instructions. This keeps
the capability pure, but the emotional loop still depends on leaving the world
and operating the machine.

### One-click evolution montage

Play an automated sequence from Baby through Guardian. It would reveal the art
quickly, but the user watches healthy actions and care instead of performing
them. It tests a trailer, not a playable relationship.

### A next morning inside the completed day

After care and its animation settle, replace the now-ineffective action buttons
with one calm **Let the next morning arrive** action. Its supporting line says
prototype time is moving forward and nothing is lost. The next day returns the
real action choices and a new-morning world beat. Production would omit this
accelerator and use actual elapsed time.

### Remove daily bounds for the prototype

Let every action immediately create another care moment. This is fastest, but
it teaches grinding, destroys the one-daily-care contract, and turns real-life
progress into an economy.

## Convergence

Choose **a next morning inside the completed day**.

The sequence is:

1. choose To-do, Focus, or Play;
2. receive one care opportunity and its distinct world consequence;
3. give today's care;
4. while care or evolution is still performing, show a quiet settling state;
5. after the creature is grounded and calm, show one next-morning action;
6. state plainly that this advances prototype time and loses nothing;
7. begin the next day with a greeting and a fresh set of meaningful choices;
8. repeat through the existing three-day Young and eight-day Guardian
   thresholds.

The capability never shows actions that are known to be inert. The inspector
keeps its unrestricted day control for engine QA, but it is no longer required
to experience growth.

### Capability delta

Today, a tester cannot complete the growth story from the Pet capability
without discovering an inspector control. After this study, the entire
action-care-day-evolution loop is playable in the capability. The prototype
still cannot claim real activity completion, generate multiple care moments in
one day, punish a missed day, automate care, or represent production time.

### Reductive decisions

- Replace dead action choices; do not add a fourth persistent button.
- One next-morning action only after the day is complete.
- No calendar, streak, countdown, energy, sleep debt, daily reward, or skip
  currency.
- No automated evolution montage.
- No change to care thresholds or persistence shape.

We're betting that **a clear daily stopping point plus an honest prototype
morning** will make the full growth arc feel intentional rather than grindable.
If the journey still feels repetitive, revisit the variety and emotional
specificity of To-do, Focus, and Play consequences—not the one-day bound.

## Learning release and evaluation

The private site remains the release channel. At 390 × 844, complete three
different action-care-morning loops and verify that Young arrives without
using the inspector. Continue to eight if the rhythm remains engaging enough
to reach Guardian. Confirm that action buttons never remain after today's care,
the morning control cannot interrupt care/evolution, every new day preserves
care and scenery, and the copy unmistakably identifies accelerated prototype
time. Disconfirming evidence is a grind loop, a fake production promise, an
interruptible evolution, a dead control, or a flow that still requires the
inspector.

## Spec refinement

Pure pet-state logic must expose an explicit phase: `choose-action`,
`care-ready`, `care-settling`, or `day-complete`. The phase, not duplicated JSX
conditions, owns the branch. A new day uses the existing
`advancePrototypeDay`, returns with a greeting rather than indefinite sleep,
and starts a sunny world-arrival beat. The main morning action is enabled only
in `day-complete`; inspector advance remains unrestricted. Tests precede the
state helper. No user-owned decision remains for this prototype study.
