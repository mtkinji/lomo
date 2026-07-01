# Evaluate Learning: object-creation-ux-system

## Learning questions

- Can users complete FTUX when the first prompt starts from concrete focus?
- Do users understand that the generated Goal belongs inside the generated Arc?
- Does direct Goal creation need minimal guidance, or is speed the stronger success factor?
- Does direct Arc creation need a visible path choice between identity-first and activity-to-identity?
- Which questions create clarity, and which feel repetitive after the user's prior answer?

## Evidence that supports the bet

- Users complete FTUX without needing explanation of Arc vs Goal.
- Users describe the saved Arc as who they are becoming, not just the activity they typed.
- Users can find the linked Goal on Arc detail.
- Later direct Goal creation feels faster but still coherent with FTUX.

## Evidence that disconfirms the bet

- Users abandon FTUX during the questionnaire.
- Users think the Arc is just a category for the Goal.
- Users say later direct Goal creation feels unrelated or under-guided.
- Users repeatedly answer multiple questions with the same sentence because the flow is asking for distinctions they do not feel.

## Instrumentation

Needed:

- FTUX step started/completed events by step id.
- FTUX generation accepted / abandoned.
- Created Arc and linked Goal ids.
- Manual QA notes from simulator and TestFlight sessions.

Avoid:

- Tracking sensitive free-text contents beyond local/debug contexts.
- Scoring identity quality as a user-facing metric.

## Decision rule

After FTUX has been observed in local and TestFlight sessions, decide whether to:

- proceed to direct Goal creation alignment,
- reduce FTUX questions,
- revise the creation grammar,
- or split direct Arc creation into identity-first and activity-to-identity paths before touching Goal creation.
