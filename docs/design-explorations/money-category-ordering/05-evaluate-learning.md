# Evaluate Learning: money-category-ordering

## Learning questions

- Is the Summary overflow menu discoverable enough for occasional ordering?
- Does the dedicated list feel calmer than direct grid dragging would?
- Does one shared order improve both Summary scanning and transaction correction?
- Do users expect per-month order or category groups after using it?

## Evidence

Supporting evidence:

- Andrew can find the command without prompting after the first demonstration.
- A saved order survives refresh/relaunch and matches in Summary and the picker.
- No accidental month swipe or meter open occurs during reordering.

Disconfirming evidence:

- The command is repeatedly missed.
- Users try to drag meters directly despite having used the drawer.
- Shared order makes the category picker worse because users expect alphabetical search results.

## Instrumentation

Record only `money_category_reorder_opened`, `money_category_reorder_saved`, item count, and success/failure. Do not record category names or order.

## Decision rule

After one week of Andrew dogfooding and at least three reorder/save/relaunch cycles, keep the design if it is discoverable and stable. If discovery fails, improve entry placement. If manipulation fails, test direct grid drag only after month-paging gesture conflicts are resolved.

## Expected next action

Accept the feature as a small permanent customization or revise only its entry point; do not expand into groups without separate demand.
