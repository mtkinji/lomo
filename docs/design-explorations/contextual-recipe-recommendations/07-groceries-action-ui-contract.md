# Groceries action UI contract

Job: When Maya has planned meals, she needs a clear way to continue into the
compiled grocery list, so she can turn the plan into shopping action.

Authority chain: explicit user decision -> Kwilt UI constitution and canonical
Bottom Dock Geometry -> `BottomDrawer.bottomAccessory` -> canonical `Button`.

Three-second read: **View groceries** is the drawer's primary downstream action.

Primary action: View groceries.

Primary information: current Ideas and Planned meals. Secondary information:
the optional **Get ideas from Kwilt** offer.

Reveal later: grocery compilation details remain owned by Groceries.

Scan order: current meal rows -> Planned state -> fixed View groceries action.

Must not add: another planning state, send/finalize semantics, helper copy,
counts, confirmation, or a new navigation destination.

Reuse map: fixed safe-area geometry -> `BottomDrawer.bottomAccessory`; action ->
canonical full-width `Button`; destination cue -> existing cart icon.

Nearest precedent: the canonical fixed full-width drawer action. This differs
from a phone-floating page dock because it is contained by a full-height drawer.

External exemplar ledger: N/A; the accepted Kwilt pattern is sufficient.

Behavior sources: `onOpenGroceries` remains the existing navigation callback;
**View groceries** remains truthful because Planned meals already compile into
the grocery list.

Unresolved decisions: none.

Required states: normal, pressed, share-sheet-hidden, reduced motion, long text,
and bottom safe-area clearance.

Proof path: Recipes -> Ideas drawer on iPhone 17 Pro Simulator; inspect the
fixed action, scroll meal rows, open Groceries, and return without changing Plan.
