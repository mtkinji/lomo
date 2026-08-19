# Learning Release: Digital Chore Rewards

## Concept To Build

Add an optional digital Rewards wallet to Chores where children can set earned tokens aside for cash and caregivers complete redemption only after paying outside Kwilt.

## Capability Delta

Today, a child cannot monitor a durable token balance or turn earned tokens into a reviewable value exchange.

After this release, the child can:

- see available, set-aside, and total tokens;
- see the caregiver-configured household cash value;
- set available tokens aside for a payout;
- see `Waiting for $N`; and
- cancel an unpaid redemption and restore availability.

The caregiver can set **Dollars per token** in Chore settings, see household payouts waiting, pay through Greenlight or another outside method, and then tap **Paid**. Only that settlement removes the set-aside tokens from the child's owned balance. Changing the household rate updates unreserved token value and future redemptions; existing payouts retain the value captured when the child set tokens aside.

Still intentionally unsupported: physical-token reconciliation, approval or rejection, automated money movement, a reward catalog, rankings, child-recorded payment, and caregiver custody of a child's tokens.

## User Experience

Rewards remains off by default in Chores Labs. When enabled, each chore may show `1–3 tokens`. The child receives one circular wallet action at the bottom of the Chores inventory. The drawer reads available tokens first, their cash value second, any set-aside tokens and pending payout third, and redemption controls last.

Requesting redemption creates a reservation, not a debit. The copy says the tokens are still the child's and set aside. The child may cancel while unpaid. The caregiver Rewards action gains attention when a payout is waiting; its drawer says to pay outside Kwilt and then record it. **Paid** atomically records settlement and permanently redeems the reserved tokens.

## Existing Product Relationship

This extends the current Chores inventory and caregiver dock. It does not create another capability destination, alter chore completion approval, or turn Money/Plaid transactions into payout evidence.

## Buildable Slice

Must be real:

- versioned append-only local reward events for earn, reserve, cancel, settle, and adjust;
- one-time migration of legacy opening balances and completed chore earnings;
- trusted completion and caregiver approval credit exactly once;
- child wallet, reservation, pending state, and cancellation;
- caregiver waiting-payout attention and settlement; and
- Rewards-off behavior with no residual token UI.

Can be thin or temporary:

- a caregiver-configured local USD exchange rate that defaults to 50 cents;
- local simulated household actors; and
- manual outside-app payment.

Intentionally excluded:

- physical tokens, payment providers, bank linking, notifications, reward shopping, and production household authorization.

## Release Channel

Local build, then TestFlight dogfood after Simulator acceptance. Rewards remains explicitly Labs-gated and off by default.

## Brand-Goodwill Guardrails

- Never remove a child's tokens before payment is recorded.
- Always show available, set-aside, and total as distinct facts.
- Never imply Kwilt moved money.
- Keep payout work separate from chore-quality approval.

## Reversibility

The Labs switch hides the UI without deleting ledger history. Append-only events allow projections and copy to evolve without rewriting receipts.

## Permanent Product Threshold

Promote only if children understand that set-aside tokens remain theirs, caregivers reliably notice and settle payouts, and households find the caregiver-set exchange useful without needing a full allowance platform.
