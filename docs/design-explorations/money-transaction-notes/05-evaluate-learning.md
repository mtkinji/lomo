# Evaluate Learning: Money Transaction Notes

## Learning questions
- Is the Note row understandable and discoverable without instruction?
- Does explicit household-visibility copy match the expected sharing model?
- Does the saved note make a generic transaction easier to recognize later?

## Evidence plan
Supportive evidence is a successful add, reopen, edit, and removal flow on the real transaction path, plus Andrew finding the note useful for the family-pictures purchase. Disconfirming evidence is confusion with Description, concern about household visibility, or the row feeling like clutter.

## Instrumentation
Use manual observation for the first release. Do not collect note text, length, or content in analytics. Existing generic mutation failure handling is sufficient.

## Decision rule
Keep the capability if the persisted flow is clear and useful in repeated household review. Revise the placement or visibility copy if those are the friction. Retire it rather than adding metadata if the job is too rare.

## Expected next action
After local runtime proof, decide whether it belongs in the next TestFlight build.
