# Frame: Money Capability First Entry

## Review cadence

Check in after each phase. This is the first top-to-bottom capability pass in the broader
capability-onboarding initiative.

## What the user said

> Might as well go top to bottom. Let's start with Budgets. Incidentally, the user should get the
> same FTUX by tapping on Budgets, or transactions, or Accounts.

## Restated in user voice

When I open any Money destination for the first time, help me understand and establish the one
Money foundation those destinations share, then take me to the place I originally chose so I can
do the thing that brought me there.

## Target audience

`audience-aspirational-family-organizers` - Aspirational family organizers.

## Representative persona

Maya is opening Budgets, Transactions, or Accounts because she wants a calm, trustworthy read on
household money without becoming the administrator of a finance system.

- Current situation: She has selected a concrete Money place from Kwilt's navigation.
- What she's trying to become/do: Understand or establish household money reality well enough to
  make a decision.
- Emotional state or tension: Interested but cautious; financial setup asks for unusually high
  trust and can easily feel like work before value.
- What would make this feel wrong: Different setup stories for sibling Money destinations, losing
  the destination she tapped, replaying global onboarding, presenting sample values as real, or
  treating account connection as success by itself.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few areas I most want
to grow.

## Job-flow step

This work targets the first two weak steps in
`job-flow-maya-review-budget-reality-before-spending`:

1. **Recognize and enter the Money job** - delivery score 2. Native Budgets, Transactions, and
   Accounts exist, but capability adoption and destination continuity are not one production path.
2. **Start or resume minimum setup** - delivery score 2. First-use setup exists, but direct
   Transactions and Accounts entry can bypass the shared Money foundation and there is no explicit
   return-to-original-destination contract.

## Active anchors

- `jtbd-review-budget-reality-before-spending` - all three destinations support one household
  money-reality job rather than three separate capability adoptions.
- `jtbd-trust-this-app-with-my-life` - financial connection, setup state, and post-setup routing
  must be truthful, bounded, and recoverable.

## serves snippet

```yaml
serves: [jtbd-review-budget-reality-before-spending, jtbd-trust-this-app-with-my-life]
```

## Friction we're addressing

Kwilt exposes Budgets, Transactions, and Accounts as three navigation destinations owned by one
Money capability. The existing setup state is also capability-wide, but setup is currently a
screen inside the Money stack and its completion action always goes to Budgets. This allows a
first tap on Transactions or Accounts to miss the intended FTUX and makes destination continuity
implicit rather than guaranteed.

## System alignment

Constraint posture: `Bend the system`

### Current system facts

- The capability menu models `money-summary`, `money-transactions`, and `money-accounts` as three
  destinations with `ownerId: money`.
- Navigation currently dispatches the selected destination directly.
- Money has one persisted onboarding record per signed-in user and one `MoneySetupScreen`.
- `MoneySetupScreen` can truthfully skip itself when the user already has completed setup, an
  active living plan, or sufficient existing foundation.
- Setup completion currently navigates unconditionally to `MoneySummary`.
- The accepted Money progressive-activation brief previously said exact Money destinations bypass
  orientation.
- Global capability onboarding and Money capability adoption are separate state machines and must
  remain separate.

### Constraints to preserve

- One Money capability owns all three destinations.
- Budgets remains a visible promise and Accounts remains a visible setup/recovery place before
  Money has data. Transactions does not need main-navigation prominence until real account or
  transaction evidence exists.
- Returning users with existing Money value do not replay beginner setup.
- Money owns Plaid connection, living-plan creation, financial truth, recovery, and first value.
- Route arrival and account connection are not treated as successful Money activation.
- No sample financial values are presented as real.
- The shared FTUX must be resumable and must not prevent the user from leaving Money.

### Constraint intentionally changed

An exact tap on Budgets, Transactions, or Accounts no longer bypasses Money FTUX when the signed-in
person has not yet established or adopted Money. The tap is authoritative evidence of the desired
post-FTUX destination, not evidence that capability setup should be skipped.

### Design implication

Resolve first entry at the Money capability boundary before rendering a destination. Store the
original Money place as an entry intent, run or resume one shared FTUX, and return to that place
after the minimum truthful foundation is complete. If setup is already unnecessary, continue
directly with no visible gate.

## Aspirational design challenge

How might we help Maya establish one trustworthy Money foundation from any Money entry point,
while preserving the destination she chose and avoiding finance-system administration?

## Out of scope

- Separate onboarding content for Budgets, Transactions, and Accounts.
- Reworking the universal first-install reel.
- Changing Money's financial model, Plaid provider contract, or living-plan algorithm.
- Treating a menu tap, setup completion, or account connection as a first trusted decision.
- Expanding this pass to Food, Goals & Plans, Fun, or ungrouped capabilities.

## Open question

None for framing. The next phase should compare where the shared Money gate lives and how it
preserves the original destination through interruption and resume.
