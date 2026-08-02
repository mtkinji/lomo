# Pet Engine Study 59 — The World Gets the Screen

## Frame and system alignment

> The prototype should feel like playing inside a beautiful tiny anime world,
> not like inspecting an animation engine that happens to contain one.

Charlie remains the provisional teen participant for this Pet learning release.
The portable engine now has causal weather, direct touch, stage-shaped play,
Focus, life echoes, sound, persistent world memory, and three visibly different
forms. The hosted presentation still gives equal or greater visual authority to
a study headline and a permanently open engine inspector. That chrome is useful
for proving the system, but it interrupts the feeling the system exists to test.

Restated in user voice: **When I visit Moss, I want the little world to take
over the screen and respond to my hand before I see how it was built, so I can
feel like I am playing with a creature inside a beautiful living story.**

This continues the underserved `Notice non-metric progress` step in
`job-flow-sarah-see-who-im-becoming`, currently scored 3. The life echoes and
evolution already carry progress without a dashboard; this study lets those
consequences be experienced before the prototype explains them.

```yaml
serves: [jtbd-feel-arc-progress-without-tracking-tools, jtbd-trust-this-app-with-my-life]
```

Constraint posture: **Fit the Pet capability and bend the lab presentation.**
Keep the existing capability header, canvas, contextual dock, world state,
sound, persistence, accessibility, and inspector. Change only which layer is
primary: the world is immediate; the machinery is progressive disclosure.

**Design challenge:** How might Charlie enter Moss's world with no explanatory
barrier, while keeping every deterministic lab control available for learning
and verification?

## UI contract

**Job:** When Charlie opens the Pet learning experience, they need to meet Moss
inside the living meadow immediately, so they can play, notice, and feel growth
before interpreting the engine.

**Primary action:** Touch the world.

**Must show:** Moss, current day/form/weather, the complete playable habitat,
the current contextual invitation, sound control, and all causal scene feedback.

**Reveal later:** Weather triggers, external Kwilt receipt simulators, motion
transport, stage preview, palette, runtime readouts, reset, and accessibility
controls.

**Must not add:** A launch screen, tutorial carousel, mode chooser, joystick,
new navigation, reward UI, care meter, or duplicated play controls.

**Reuse map:** Pet capability frame → existing `world-first-capability`; play
surface → existing Canvas runtime; moment guidance → existing world dock and
scene captions; advanced proof → existing inspector in a temporary drawer.

**Behavior sources:** Direct world touch, Focus, weather, evolution, life echoes,
and persistence remain unchanged. `?play=1` changes presentation only. The Lab
toggle reveals the existing inspector without pausing or resetting the world.

**Unresolved decisions:** None for the learning release. Whether a production
Kwilt Pet capability should expose any inspector equivalent remains out of scope.

**Required states:** Loading, reunion, quiet play, world invitation, Focus,
weather, care-ready, evening, evolution, Lab closed, Lab open, narrow phone,
desktop, reduced motion, and persisted return.

**Proof path:** Private Sites route at `?play=1`, operated at 390 × 844 and a
desktop viewport with real pointer, keyboard, sound toggle, Focus, weather,
stage preview, and Lab open/close.

## Divergence

### Add a larger hero card around the phone

This would make the presentation more polished while preserving the existing
three-column lab. It would still ask the user to read about the experience
before inhabiting it, so it does not solve the emotional hierarchy.

### Build a separate simplified demo engine

A bespoke showcase could be cinematic, but it would create a second behavior
path and allow the demo to drift from the portable runtime being proved.

### Let the world become the presentation

Use the exact existing capability and engine as a centered, full-height play
experience. Remove the study explanation from view and keep one quiet `Lab`
control that opens the existing inspector as a temporary drawer. On an actual
phone-sized viewport, remove the mock-device margins so the Pet capability
occupies the screen like a real app surface.

## Convergence

Choose **let the world become the presentation**.

The authored sentence is:

1. the route opens directly on Moss and the meadow;
2. the existing reunion establishes recognition without an extra start button;
3. the capability header lightly names day, form, weather, and sound;
4. the contextual dock offers only the action that matters in the present scene;
5. every direct gesture and causal world episode continues unchanged;
6. a small `Lab` affordance can reveal the existing inspector without resetting
   or obscuring the world permanently;
7. closing Lab returns to the same living moment;
8. the explanatory Study 59 layout remains available on the ordinary route.

We're betting that **removing explanatory competition** will create a larger
gain in immersion than adding another animation. If testers miss the available
interactions, improve contextual discovery inside the world rather than
restoring the permanent inspector.

## Capability delta and reductive decisions

Today, the person can play the complete engine, but only inside a page that
visually reads as a technical study. After this release, the same source of
truth can be entered as a Pet capability-sized experience with no false demo
path and no required configuration.

No engine state, action, currency, progression rule, notification, or healthy
behavior changes. The Study heading is not duplicated inside play mode. Lab is
one disclosure control, not a new navigation system. The ordinary study route
remains for side-by-side design and technical review.

## Learning release and evaluation

Publish the private site with `?play=1` as the primary family-playtest URL.
Start without opening Lab. Touch the meadow, Moss, the tree, the leaf, and a
visitor; complete one Focus ritual; then open Lab, trigger weather and preview
forms, close it, and confirm the world did not restart.

Supporting evidence is that attention lands on the world first; the current
gesture remains understandable; Moss and habitat are larger and uninterrupted;
the phone route resembles a capability rather than a framed website; Lab is
discoverable when wanted but visually absent during play; and every existing
engine behavior remains available from the same runtime.

Disconfirming evidence is a splash screen, a prominent mode selector, a hidden
sound or Focus action, a Lab drawer that resets/pauses the world, unreadable
contextual guidance, desktop dead space that diminishes the scene, or mobile
scrolling that makes the habitat feel like one card in a document.

## Spec refinement

This is a presentational branch over the existing component, not a second
engine. Query recognition is local and privacy-free. UI and layout are direct
implementation; source-level coverage verifies the mode and disclosure remain
present, while real browser operation is the authoritative proof. No
user-owned product behavior is being inferred.

## Reductive UI score

| Category | Result | Evidence |
| --- | --- | --- |
| Job clarity | PASS | The first visible surface is the playable meadow; the resting dock names touch and Focus without an explainer. |
| Reduction | PASS | Study copy and inspector are absent in play mode; one Lab disclosure preserves all secondary proof controls. |
| Hierarchy | PASS | Moss and the habitat dominate; identity, sound, current invitation, and Lab remain subordinate. |
| System fit | PASS | The existing capability frame, Canvas runtime, dock, captions, inspector, and persistence are reused unchanged. |
| Interaction | PASS | Focus place choice, live weather, Lab open/close, and world continuity were operated in the browser. |
| States | PASS | Reunion, quiet, wind play, weather arrival, Focus choosing/together, Lab closed, and Lab open were observed. |
| Resilience | PARTIAL | Desktop and responsive source rules are verified; physical iPhone viewport remains a separate proof boundary. |
| Runtime proof | PASS | The local `?play=1` route rendered and was operated through the actual Sites-compatible browser build. |
