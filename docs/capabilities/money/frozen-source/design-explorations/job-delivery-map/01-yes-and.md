# Yes-And: job-delivery-map

Original idea: Maintain a job -> job steps -> UX flow map so automated and ad hoc build loops can ask how well Kwilt Money delivers its promised outcomes and what to improve next.

## 1. Yes, and what if it could find missing surfaces, not just weak screens?

- Serves: `jtbd-put-intention-before-impulse`
- Job elevation: The map can notice that a job step is poorly served inside the app and nominate a new surface like an iOS widget, Lock Screen widget, Screen Time gate, or notification.
- New value: Improvement cycles stop overfitting to existing screens.
- Cost delta vs. original: low
- Anti-pattern check: pass, if surface opportunities remain hypotheses that require a design loop before implementation.

## 2. Yes, and what if every feature brief had to name the job step it improves?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: Work moves from "ship feature" to "improve Maya's traversal through a specific step."
- New value: Roadmap and PR review can ask whether a shipped change should move a delivery score.
- Cost delta vs. original: low
- Anti-pattern check: pass, if the mapping is concise and does not become ceremony.

## 3. Yes, and what if the daily build loop produced a ranked delivery report?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Weaknesses are named with evidence, assumptions, and recommended next design challenges.
- New value: The app can be improved by outcome debt, not only by bug backlog or visual polish.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if the report stays small: top gaps, evidence, and next action.

## 4. Yes, and what if each job step had a "user question" field?

- Serves: `jtbd-review-budget-reality-before-spending`
- Job elevation: Screens are judged by whether they answer Maya's practical question, such as "What spending area am I trying to keep intentional?"
- New value: UX evaluation becomes more concrete and less abstract.
- Cost delta vs. original: low
- Anti-pattern check: pass, because the question keeps the map human and avoids internal jargon.

## 5. Yes, and what if design explorations could feed back into the map?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: A design loop does not end at a document; it updates the product's understanding of a job step, surface opportunity, or delivery score.
- New value: Learning compounds instead of disappearing into one-off explorations.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if updates happen only after evidence or a deliberate decision.

## 6. Yes, and what if runtime proof could attach to job steps?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Scores can refer to screenshots, simulator checks, smoke scripts, analytics events, or manual observations.
- New value: "How good is the app?" becomes answerable with receipts, not vibes.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if proof is lightweight and does not require full analytics before learning.

## 7. Yes, and what if the map could distinguish current flow gaps from learning gaps?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: The team can tell whether to build, test, observe, or run a design loop before committing implementation.
- New value: The next action can be "run iOS widget design loop" rather than prematurely "build widget."
- Cost delta vs. original: low
- Anti-pattern check: pass, because it protects against feature pile.

## Frame Recommendation

Run the loop with an expanded frame: build a job delivery operating artifact, not just a static map.

The artifact should include:

- structured job steps,
- current UX flows,
- delivery scores,
- evidence,
- surface opportunities,
- design-loop links/status,
- and a review runner that outputs ranked improvement recommendations.
