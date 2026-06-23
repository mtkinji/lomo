# Diverge: Contextual Recommended P1A Contract

## Axis Of Variation

The main variation is where "current context" comes from:

- user-selected context;
- surface/session context;
- inferred context from a confidence-gated evidence model.

## Alternative A: Manual Context Selector

Add a small selector or chips to the Recommended module. Maya can choose `Out & about`, `Calls/messages`, or another mode, and Recommended re-ranks Activities for that selected mode.

Audience/persona fit: weak-to-medium. It is clear and controllable, but it asks Maya to configure the moment when the strategy says Kwilt should reduce first-scan work.

Design-challenge answer: answers context honestly because the user supplies it, but fails the "without mode switching" constraint.

System-fit note: easy to wire into existing Recommended, but it risks becoming a manual view system.

Best when: the product wants explicit correction/control more than ambient usefulness.

Fails when: chips feel like "pick a filter before Kwilt can help."

Primer anti-pattern check: does not block capture, but drifts toward productivity-app configuration.

## Alternative B: Category-Weighted Recommended

Keep the UI unchanged and add hard-coded boosts for Activities that look like errands, calls, desktop work, or location-based tasks.

Audience/persona fit: weak. It is invisible and low scope, but it does not actually know the user's current context.

Design-challenge answer: fails. It makes Recommended more opinionated, not more contextual.

System-fit note: technically cheap inside `activityPriority.ts`, but semantically wrong because candidate-fit evidence is treated as context.

Best when: the product only wants a static priority model.

Fails when: Maya is not in that context and Kwilt globally promotes the wrong kind of task.

Primer anti-pattern check: low UI clutter, but trust risk is high because the system claims intelligence without evidence.

## Alternative C: Surface-Context First

Use the current product surface as the strongest P1 context signal. Mobile app open can only show contextual Recommended when existing evidence is strong; Kwilt Desktop open is a strong `at computer` signal. No mobile context selector ships in P1A.

Audience/persona fit: medium-strong. It keeps interaction cost low and avoids fake context. It is especially strong for desktop because the surface itself is meaningful.

Design-challenge answer: partially answers. It makes context real where surface context is real, but mobile `out and about` may be rare without stronger signals.

System-fit note: extends Recommended input with `surface` and confidence, not a new user-facing model.

Best when: the strategy prioritizes trust and low UI change over broad mobile coverage.

Fails when: mobile context needs to be useful before Kwilt has enough signal to infer it.

Primer anti-pattern check: preserves capture-first and avoids dashboards, urgency, and setup.

## Alternative D: Evidence-Gated Context Engine

Create a componentized recommendation layer that can evaluate context fit without turning it into a separate user-facing mode. It separates:

- **core next-action score**: urgency, importance, readiness, and effort/shape;
- **context-fit evidence**: Activity type, title/notes cues, tags, explicit location metadata, current surface when available, and due/scheduled/reminder fields;
- **confidence policy**: high confidence can label Recommended as contextual; medium/low confidence keeps normal Recommended framing.

Recommended consumes the componentized score, not raw task categories. No chips ship in P1A unless later explicitly accepted.

Audience/persona fit: strong. Maya gets help when Kwilt has a justified reason and normal behavior when it does not.

Design-challenge answer: strongest. It keeps Recommended as the delivery surface while building the real underlying context system.

System-fit note: extends the model behind `activityPriority.ts` without requiring a new UI surface. It also creates a place for P2/P3 evidence to plug in later.

Best when: the goal is a durable contextual-action architecture, not a one-off ranking tweak.

Fails when: P1A needs broad context coverage immediately; this will initially be conservative.

Primer anti-pattern check: preserves capture-first, avoids setup, and keeps the system humble.

## Alternative E: P1B-First Explicit Place Delivery

Pause P1A and focus first on Location Triggers / Location Offers audit and polish. Treat existing explicit per-task location triggers as the current strongest context system.

Audience/persona fit: medium. Useful for tasks with trusted places, but narrower than contextual next action.

Design-challenge answer: answers "deliver this at a place," not "what is doable now when I open Kwilt."

System-fit note: works with existing capability and may clarify future P1A inputs.

Best when: the team believes place delivery is the strongest near-term value.

Fails when: the strategy needs Recommended to become the front door first.

Primer anti-pattern check: good if permission/copy are careful; risky if it becomes interruption-heavy.

## Divergence Summary

The strongest P1A route is Alternative D, with Alternative C as one input when surface evidence is available. That means: build the componentized scorer, start with existing signals, keep UI stable, and let contextual framing appear only when confidence is justified.
