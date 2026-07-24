# Evaluate Learning: Category Budget Planning

## Learning Questions
- Does removing the drawer make Budget Detail feel less ambiguous?
- Does Category settings feel like the right home for category maintenance?
- Does the absence of a quick amount field feel clarifying or like a missing control?
- Is the next needed amount-planning flow activated from the meter, not settings?

## Evidence Plan
Supporting evidence:
- simulator review shows title edit opens Category settings without keyboard or sheet confusion.
- Andrew does not need the removed drawer to complete routine maintenance.
- the next product question becomes "how should Adjust amount explain target impact?" rather than "where do settings live?"

Disconfirming evidence:
- renaming or amount changes feel hidden.
- users expect a fast amount edit from the detail page before target-backed planning exists.
- Category settings becomes overloaded.

## Instrumentation
For this local release, manual simulator notes and screenshots are enough. Do not add analytics for a removed local drawer.

## Decision Rule
Keep the deletion if the full settings route feels authoritative after one simulator pass. If amount editing feels missing, build a focused `Adjust amount` flow from Budget Detail rather than restoring the generic drawer.

## Expected Next Action
After this cleanup, implement target-backed allocation receipts or a narrow `Adjust amount` learning slice when the living-plan model is ready.
