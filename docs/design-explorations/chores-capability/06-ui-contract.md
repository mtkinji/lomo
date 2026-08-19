# UI Contract: Chores Digital Rewards Wallet

## Job

When a child has earned digital chore tokens, they need to understand what they own, set some aside for cash, and know whether payment is still outstanding without relying on a caregiver's memory.

## Authority chain

1. Andrew's accepted reservation-before-redemption decision.
2. The Chores feature brief and digital-rewards learning release.
3. Platform and accessibility requirements.
4. Kwilt UI Constitution, semantic tokens, `ActivityListItem`, `Button`, `BottomDrawer`, and Canonical Bottom Dock Geometry.

## Three-second read

The Chores inventory remains primary. When Rewards is enabled, one circular wallet action opens a drawer whose leading fact is the child's available balance. Set-aside tokens remain visibly included in total ownership.

## Primary action

For a child: **Set aside N tokens for $N**. This creates a cancellable reservation and does not debit total ownership.

For a caregiver: **Paid $N** only after the outside-app transfer. This atomically settles the payout and redeems the reserved tokens.

## Primary information

- available tokens and current cash value;
- set-aside tokens and total tokens;
- `Waiting for $N` while unpaid; and
- child name, token amount, and cash amount for caregiver fulfillment.

## Reveal later

Ledger history and settled receipts may follow in a later disclosure. Chore instructions remain in the chore inventory and detail drawer; the Rewards action never repeats what the child should do.

## Scan order

1. Available tokens.
2. Cash value.
3. Set-aside and total ownership.
4. Pending payout.
5. Redemption controls.

## Must not add

- physical-token or mixed-custody modes;
- caregiver accept/reject controls;
- automatic payment claims;
- reward catalogs, rankings, streaks, or dashboards;
- child settlement controls; or
- a fixed chore-agreement bar.

## Reuse map

- Entry -> `FloatingDockActionButton` with `circleDollarSign` and canonical bottom-dock placement.
- Wallet -> `BottomDrawer`, `BottomDrawerHeader`, shared `Button`, semantic spacing and surfaces.
- Caregiver attention -> existing red dot treatment, separate from **Review requests**.
- Chore earning value -> existing monochrome row metadata with explicit `N tokens` copy.

## Behavior sources

- Earn -> trusted completion or caregiver approval, once per completed occurrence.
- Set rate -> caregiver action in Chore settings; accepts a positive USD amount with cent precision and applies to available-value projections and future reservations.
- Reserve -> child action against available tokens at the current household rate; the reservation snapshots that rate and value.
- Cancel -> child action while the reservation is unpaid.
- Settle -> caregiver action after outside-app payment; removes reserved tokens exactly once.
- Adjust -> explicit ledger correction, including reopening completed work.

## Required states

- Rewards disabled;
- zero and positive available balances;
- one or several pending payouts;
- partially set-aside balance;
- child cancellation;
- caregiver settlement;
- insufficient available tokens;
- long child names and Dynamic Type; and
- child versus caregiver projection.

## Proof path

In the iPhone Simulator: enable **Use digital rewards** as caregiver; verify the default `Dollars per token` value is $0.50; switch to Charlie and set aside tokens at that rate; switch to Andrew and change the rate to $0.75; verify the pending payout still shows its captured $0.50-per-token value; switch back to Charlie and verify available tokens now use $0.75 and future reservations capture that value. Cancel and confirm availability returns; reserve again; switch to Andrew; open the attention-marked Rewards action; mark the payout paid; switch back and verify the redeemed tokens leave the total. Separately confirm Rewards-off has no wallet, rate editor, or token metadata.

Physical-device, Android, Dynamic Type, assistive-technology, production household authorization, and actual outside-app transfer proof remain separate gates.

## Caregiver root-chore management

The caregiver projection remains a stable chore-series inventory. Tapping a row opens the root chore editor. Rewards settlement is a separate capability-owned drawer and never changes chore definition, recurrence, evidence, approval, or completion receipts.
