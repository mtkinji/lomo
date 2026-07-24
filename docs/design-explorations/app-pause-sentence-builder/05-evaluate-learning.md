# Evaluate Learning: app-pause-sentence-builder

## Learning questions

- Does the screen name match the entry point exactly?
- Does the first viewport contain one primary concept: the app-pause rule builder?
- Does `Choose apps` inside the sentence make the separate bottom CTA unnecessary?
- Does removing spend progress make setup feel clearer, or does the user miss budget context?
- Do visible condition toggles create trust without becoming a rules list?
- Does inline editing feel direct without becoming fiddly?

## Evidence plan

Supporting evidence:

- Andrew can describe the screen as "where I write the app pause rule."
- In no-app state, the only obvious next action is the `Choose apps` token.
- In selected-app state, the rule reads naturally.
- No visible element says `Ready`, `Needs apps`, or `Rules`.
- The app selection token still opens native app/category selection.
- Condition toggles can be changed without opening an edit mode.

Disconfirming evidence:

- The sentence token does not look tappable.
- Users expect a save button or confirmation receipt.
- The category name inside each condition row is too repetitive or too subtle.
- Screen Time authorization failure needs more explicit setup copy.
- Multiple targets become unreadable in the sentence.

## Instrumentation

Manual simulator and self-use notes are enough for this learning slice.

Future events, if needed:

- `app_pause_token_apps_pressed`
- `app_pause_condition_toggled`
- `app_pause_rule_saved`
- `app_pause_authorization_needed`

## Decision rule

Proceed if the inline builder removes the need for separate CTA, status pills, and rule cards without making app selection or condition editing harder.

Revise if the sentence is elegant but not actionable.

Fallback if needed: a two-step setup flow with `Choose apps` then `Choose when`, followed by a sentence receipt.
