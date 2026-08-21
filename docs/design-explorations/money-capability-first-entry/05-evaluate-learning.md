# Evaluate Learning: Money Capability First Entry

## Learning questions

1. Do Budgets and Accounts remain understandable first destinations when Transactions is hidden
   before Money has real evidence?
2. Does one shared Money FTUX feel relevant when entered from universal onboarding, Budgets, or
   Accounts?
3. Does preserving the requested destination make setup feel like help rather than a detour?
4. Does `Not now` produce an honest, useful empty state without causing the full introduction to
   replay or trapping the person in setup?
5. Can a person understand the difference between being introduced to Money, connecting an
   account, building a usable plan, and making a trusted Money decision?
6. Does Transactions appear at the right moment without flicker, stale disappearance, or requiring
   the shell to understand financial details?

## Evidence plan

### Supporting evidence

- All supported entry sources render the same opening hierarchy and setup spine.
- A person can predict where completion and `Not now` will land them.
- Budgets and Accounts empty states each have one obvious next action.
- Transactions is absent in a pristine menu, appears after durable account or transaction evidence,
  and remains present through loading or refresh failure.
- Interruption and relaunch preserve the active checkpoint and latest explicit destination.
- Existing Money evidence bypasses the FTUX without losing native recovery states.
- The rendered flow has one dominant action per moment and remains legible at enlarged text.

### Disconfirming evidence

- People choose Accounts mainly to avoid a target-first setup sequence.
- `Not now` feels like failure or exposes a confusing pseudo-budget.
- The Budgets empty state makes users expect manual category setup instead of account-backed help.
- Transactions appears or disappears while the menu is open.
- Returning users with real Money data encounter beginner onboarding.
- A local completion receipt suppresses necessary native recovery.
- The full-screen presentation feels like a promotional tollgate rather than capability-owned help.

## Instrumentation

Use privacy-safe events without balances, merchants, institutions, account names, or transaction
content:

- `money_entry_requested`: source and requested place.
- `money_ftux_presented`: fresh or resume and current checkpoint.
- `money_ftux_action`: continue, not-now, retry, or resume.
- `money_ftux_checkpoint_reached`: checkpoint id only.
- `money_requested_place_opened`: requested place and outcome path.
- `money_navigation_visibility_changed`: pristine or evidence-available and evidence kind reduced to
  account, transaction, or both.

Do not track selected living percentage in onboarding analytics. The authoritative value remains in
Money's existing private data path.

## Evaluation matrix

Run on iPhone 17 Pro, iOS 26.5 Simulator:

| State | Entry | Expected result |
| --- | --- | --- |
| Pristine | Universal onboarding | Shared Money FTUX; Budgets retained as destination. |
| Pristine | Budgets menu | Same Money FTUX; `Not now` opens deliberate Budgets empty state. |
| Pristine | Accounts menu | Same Money FTUX; `Not now` opens Accounts with visible connect action. |
| Pristine | Main menu | Budgets and Accounts visible; Transactions hidden. |
| Introduced, incomplete | Budgets | Native empty/partial state; no full intro replay. |
| Setup interrupted | Accounts | Resume offered; Accounts becomes latest post-setup destination. |
| Account evidence available | Main menu | Transactions visible without menu-session reflow. |
| Usable foundation | Any Money entry | Direct destination; no visible FTUX gate. |
| Refresh error with prior evidence | Main menu | Transactions remains visible. |

## Decision rule

Proceed to permanent product behavior when focused tests pass and the Simulator matrix shows clear
hierarchy, truthful state, correct destination continuity, stable navigation visibility, and no
critical accessibility or interaction failures.

Revise the sequence if the account-evidence step repeatedly feels delayed by the monthly-target
question. Simplify the empty states if they create a second onboarding system. Retire the
coordinator approach if it cannot avoid destination flash or if shell/capability ownership becomes
blurred.

## Expected next action

Implement the local slice, run the full matrix, then decide whether the target should remain before
account connection or move after the first successful connection. Do not promote to TestFlight or
production from source/tests alone.
