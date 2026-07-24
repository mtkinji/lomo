# Diverge: app-pause-sentence-builder

Axis of variation: inline composition vs guided setup vs compact management.

## Alternative 1: Inline Sentence Builder

Structure: The page title is `App pause`. The main content is a plain-language rule start with a tappable app token: `Pause [Choose apps] when:`. The conditions appear immediately below as inline toggle rows. There is no category summary, no status pill, no rules section, no bottom CTA, and no Edit mode. Advanced settings sit below as a collapsed row.

Audience/persona fit: High. It feels like composing one understandable rule, not managing controls.

Design-challenge answer: Strong. Maya can see and change the pause in one place.

System fit: Medium-high. Reuses existing policy fields and native picker, but changes layout and interaction shape.

Best when: the first learning slice is one category and one active app-pause rule.

Fails when: the product truly needs many independent rules per category immediately.

Anti-pattern check: avoids dashboard sprawl, punishment language, and technical Screen Time framing.

## Alternative 2: Two-Step Setup Sheet

Structure: The page stays mostly empty except for two setup steps: `1. Choose apps` and `2. Choose when they pause`. Each step opens a focused sheet. After both steps are complete, the final sentence appears as a receipt.

Audience/persona fit: Medium. It is guided and clear, but still feels like setup.

Design-challenge answer: Medium. It reduces ambiguity but does not make the rule itself the primary interface.

System fit: High. It can reuse existing drawer and controls.

Best when: native Screen Time authorization or app selection needs more explanation.

Fails when: the user expects to directly edit the rule.

Anti-pattern check: risks becoming onboarding/tutorial copy.

## Alternative 3: Compact Rule Card

Structure: Keep a single card, but remove the hero summary and rules section. The card title is `App pause`, body is the rule sentence, and action row has `Apps`, `Conditions`, and `Review window` buttons.

Audience/persona fit: Medium. It is more reductive than today but still frames the rule as a card-managed object.

Design-challenge answer: Medium. It removes redundancy, but edit controls remain separated from the sentence.

System fit: High. Lowest implementation change.

Best when: we need a quick cleanup without changing interaction primitives.

Fails when: the card still feels like a settings panel.

Anti-pattern check: lower risk, but still drifts toward configuration UI.

## Alternative 4: Review-First Rehearsal

Structure: The screen shows a simulated review moment first: `Before Amazon opens, show Shopping.` The user can change `Amazon`, `Shopping`, and `when` from the sentence. A secondary `Try review` action opens the review flow.

Audience/persona fit: Medium-high. It connects setup to the final value unit.

Design-challenge answer: Strong for learning, but more than the user asked for on the setup screen.

System fit: Medium. It couples setup and rehearsal.

Best when: activation into the review behavior is the main problem.

Fails when: setup still needs to be simpler before rehearsal is useful.

Anti-pattern check: can overteach if the rehearsal becomes another block of explanation.
