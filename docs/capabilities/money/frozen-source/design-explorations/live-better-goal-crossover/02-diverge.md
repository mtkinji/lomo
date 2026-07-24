# Diverge: live-better-goal-crossover

## Axis Of Variation

Evidence-led versus coaching-led, and in-Budget action versus cross-app handoff.

## Alternative 1: Advice Card In Budget

Budget shows a simple advice card on Plan or Budget Detail: "Restaurants are running hot. Try a 2-night home dinner goal." The user can dismiss, adjust the budget, or save the suggestion. The advice stays inside Budget.

- Audience/persona fit: high for Blaire's request for advice.
- Design-challenge answer: partially answers it, but does not create durable follow-through.
- System-fit note: fits current Budget surfaces and avoids cross-app complexity.
- Kwilt model fit: weak; it does not use Arc, Goal, Activity, or Chapter.
- Best when: the advice is a local budget adjustment or one-time spending decision.
- Fails when: the pattern requires repeated behavior.
- Anti-pattern check: pass only if it avoids dashboard and shame language.

## Alternative 2: Goal Draft Bridge

Budget surfaces an evidence-backed insight and asks whether the user wants to set a goal. The action opens an editable goal draft payload, such as "Cook at home on 3 weeknights for the next month" or "Pause before household extras this month." Kwilt is introduced in the draft screen as the place for confirmation, optional Arc selection, and first Activity planning.

- Audience/persona fit: strongest. Blaire gets advice, but the life change lives in the product designed for follow-through.
- Design-challenge answer: turns a repeated spending pattern into one chosen "live better" goal.
- System-fit note: extends Budget with a bridge payload and uses Kwilt's existing goal proposal pattern.
- Kwilt model fit: strong. Goal is the durable object; Activity can be the first next step; Arc remains optional.
- Best when: the advice requires repeated action over weeks.
- Fails when: cross-app handoff is clunky, unsupported, or feels like an ad for Kwilt.
- Anti-pattern check: pass if optional, editable, and never required to dismiss.

## Alternative 3: Ask Workspace Financial Coach

Budget's Ask tab becomes the advice surface. Blaire asks "how can I spend smarter?" and the workspace analyzes budgets/transactions, proposes rules, and can recommend a Kwilt goal.

- Audience/persona fit: medium. It honors the explicit request for advice, but may ask Blaire to initiate too much.
- Design-challenge answer: good for explainability, weaker for timely activation.
- System-fit note: fits the agent workspace ambition already documented in Budget.
- Kwilt model fit: medium. It can propose a goal, but the workspace may blur Budget and Kwilt roles.
- Best when: Blaire wants to ask open-ended questions.
- Fails when: the product needs to proactively notice a pattern.
- Anti-pattern check: risk of anthropomorphic AI or overconfident coaching; requires the shared Kwilt voice rules and strict prompt/copy guardrails.

## Alternative 4: Weekly Money Pattern Review

Budget sends or shows a weekly review: one pattern, one question, one optional goal prompt. Example: "Shopping was ahead of pace by Tuesday twice this month. Want to make this a goal in Kwilt?"

- Audience/persona fit: high for calm household rhythm.
- Design-challenge answer: strong for long-term pattern, weaker for immediate "advice now."
- System-fit note: aligns with the low-scored `sustain-household-pattern` job step.
- Kwilt model fit: strong if each review can hand off to Goal/Activity, not Chapter.
- Best when: enough transaction history exists.
- Fails when: the product has not yet earned trust with the core gate and meter.
- Anti-pattern check: pass if no urgency, no streaks, and no shame.

## Alternative 5: App-Gate Reflection

After repeated app-gate choices, Budget says: "This keeps coming up. Set a goal?" The suggestion appears only after meaningful behavior, such as several review outcomes for the same budget. Kwilt is introduced only after the user opens the idea.

- Audience/persona fit: high for spending-app drift.
- Design-challenge answer: strong timing, since the prompt appears at the moment of tension.
- System-fit note: builds on Review and Screen Time event data.
- Kwilt model fit: strong for goal creation, but requires reliable review history first.
- Best when: app controls are proven on device/TestFlight.
- Fails when: Screen Time behavior is not reliable yet.
- Anti-pattern check: pass if it never blocks access, nags, or moralizes.

## Divergence Readout

The best first move is Alternative 2, with timing borrowed from Alternatives 4 and 5 later. Start with a goal draft bridge from an evidence-backed Budget insight. Do not start with a broad Ask coach or weekly review automation until the bridge value is proven.
