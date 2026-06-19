# Diverge: Dynamic Next Best Action

Axis of variation: deterministic vs. AI-mediated vs. user-trained recommendation.

## Option A: Rule-Based Primary Action

A pure selector keeps Focus as the stable primary one-tap action for to-dos, because execution is generally more valuable than planning in Activity Detail. The chevron opens the planning and help alternatives: Schedule, Add steps, Ask Kwilt, and Share. Schedule remains the first alternate for unscheduled to-dos, and Share remains discoverable without becoming the default primary action.

- Audience/persona fit: Strong for Marcus because it reduces immediate choice without demanding setup.
- Design-challenge answer: Gives a clear next move and keeps alternatives available.
- Best when: The initial rules are good enough for common task states.
- Fails when: Users expect deep personalization immediately.
- Object model: Touches Activity only.
- Capture-first stance: Does not block capture or require anchoring.
- Anti-pattern check: pass; no dashboard, no streak pressure, no anthropomorphic AI.

## Option B: AI First Suggestion

The primary action is generated from the Activity title, notes, steps, Goal, due date, and schedule state. The menu still contains deterministic fallbacks.

- Audience/persona fit: Potentially strong for Nina, less ideal for Marcus because it may feel opaque.
- Design-challenge answer: Could make better recommendations, but at the cost of reliability and latency.
- Best when: The Activity has rich context and AI is already warm.
- Fails when: The network is slow, the model over-explains, or suggestions feel too clever.
- Object model: Activity plus optional Goal context.
- Capture-first stance: Must degrade gracefully to deterministic actions.
- Anti-pattern check: risky; avoid "AI knows best" framing.

## Option C: User-Trained Favorite Action

Kwilt starts rule-based, then biases the primary button toward the user's most-used action for similar Activity states.

- Audience/persona fit: Good long-term, but it adds hidden state before the product has earned it.
- Design-challenge answer: Reduces repeated choice after usage patterns emerge.
- Best when: There is enough behavioral history to trust the bias.
- Fails when: Past behavior locks users into stale habits.
- Object model: Activity plus usage history.
- Capture-first stance: Does not block capture, but should remain resettable.
- Anti-pattern check: pass if it never becomes a gamified optimization layer.

## Option D: Two-Part "Do / Shape" Control

The primary button recommends an execution action while a small adjacent "Shape" button opens schedule, steps, and AI planning choices.

- Audience/persona fit: Medium; clearer than today's toolbar, but still asks users to parse a control model.
- Design-challenge answer: Distinguishes action from planning, though with more UI.
- Best when: Users often need both execution and planning in one visit.
- Fails when: The two-part model becomes another feature taxonomy.
- Object model: Activity only.
- Capture-first stance: Does not block capture.
- Anti-pattern check: pass, but visually busier than needed.
