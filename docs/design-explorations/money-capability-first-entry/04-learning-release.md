# Learning Release: Money Capability First Entry

## Concept To Build

Build one capability-owned Money first-time experience that starts from universal onboarding,
Budgets, Transactions, or Accounts, reuses the existing Money setup spine, and returns the person
to the place they originally chose.

## Capability Delta

Today, the user cannot reliably:

- enter the same Money FTUX from all four entry sources;
- keep a Transactions or Accounts destination through setup;
- leave or resume Money setup without ambiguous completion state;
- follow the universal Money promise into the existing real Money setup flow.

After this release, the user can:

- see the same Money opening and setup sequence from universal onboarding, Budgets, Transactions,
  or Accounts;
- continue directly when Money has already been introduced and has usable foundation;
- complete setup and arrive at the requested place;
- choose `Not now`, inspect that requested place's honest empty or partial state, and finish setup
  later;
- resume an interrupted setup checkpoint without losing a newer explicit destination tap.

Still intentionally not supported:

- destination-specific tours;
- automatic Plaid authorization;
- sample financial values presented as real;
- app controls as the definition or prerequisite of Money;
- production-wide first-install replacement;
- counting setup completion as a trusted Money decision.

## User Experience

### Entry sources

- Universal onboarding Money action opens the Money entry coordinator for Budgets.
- Budgets and Accounts remain visible before setup and open the coordinator with their own requested
  place.
- Transactions appears in the main navigation only after real account or transaction evidence
  exists, then opens the same coordinator when orientation is still incomplete.
- Direct Transactions links continue to resolve through the coordinator even while its menu row is
  hidden.
- Existing oriented Money users pass through without visible onboarding.

### Opening moment

The shared first screen uses the existing Money setup's grounded promise and Kwilt's calm first-use
grammar. Its primary message is **Know where I stand before I spend**. It explains that Kwilt can
maintain a household plan from real account evidence without requiring routine bookkeeping.

Primary action: `Set up Money`.

Quiet action: `Not now`.

The existing capability introduction is the Money welcome. Setup extends its friendly,
illustration-led grammar with a consistent character and grounded household scenes for target,
connection, and ready. The app-control-specific illustration is not reused as general Money art.

### Setup spine

Reuse and refine the existing Money setup behavior:

1. Choose a simple monthly living target with one 50-100 percent slider.
2. Connect an account through the existing Plaid action, or leave setup honestly.
3. Watch the real sync and plan pipeline progress through truthful phase messages.
4. See `Your budgets are ready` on the same final interstitial.
5. Continue to Budgets, Transactions, or Accounts according to the requested place.

Account success starts plan construction automatically. The user is not asked to trigger a build,
review categories one by one, or interpret a progress bar.

### Exit and resume

`Not now` replaces the coordinator with the requested destination and records introduction without
claiming setup completion. The full introduction does not automatically replay on later Money taps.
The native destination owns its empty, stale, disconnected, or partial state:

| Destination | Empty-state message | Primary action |
| --- | --- | --- |
| Budgets | Connect the accounts you use so Kwilt can build a monthly budget from real income and spending. | `Connect accounts` |
| Transactions | Transactions appear after an account is connected and synced. | `Connect an account` |
| Accounts | No financial accounts are connected yet. | `Connect an account` |

Budgets resumes shared setup at account evidence. Transactions and Accounts use the existing Money-
owned account connection action, then offer the next unfinished plan step after a successful
connection. A destination with partial real data shows that data and a quiet contextual
`Finish Money setup` action instead of pretending it is empty.

If the app or flow is interrupted after setup begins, the next external Money entry offers to
continue from the saved checkpoint. A newly tapped destination becomes the post-setup destination;
it does not discard valid setup progress.

### Completion

The result page shows only authoritative plan facts. Its primary action is destination-specific:

- `See my budgets`
- `Review transactions`
- `View accounts`

The destination replaces the coordinator in navigation history.

## Existing Product Relationship

This release enhances the existing `MoneySetupScreen`, Money onboarding domain logic, per-user
storage, Money navigator, capability menu routing, and universal capability-onboarding handoff.

It replaces these behaviors:

- direct first entry from the three Money menu rows;
- unconditional setup completion to Budgets;
- the general Money onboarding handoff from app controls to category creation;
- `Connect later` advancing into a build step that usually cannot finish.

It leaves these behaviors unchanged:

- internal navigation among established Money destinations;
- native Money data ownership and privacy gate;
- Plaid connection and synchronization implementation;
- living-plan generation and reconciliation;
- account, transaction, category, settings, receipt, and app-control ownership after first entry.

## Buildable Slice

### Must be real

- A typed Money entry route with requested place and entry source.
- One coordinator decision using signed-in, user-scoped Money orientation and current foundation
  evidence.
- Additive, normalized persisted state for introduction, active checkpoint, requested place, and
  completion.
- Shared FTUX rendering and step transitions using the existing Money setup operations.
- `Not now`, interruption, resume, retry, and completion paths.
- Typed replacement into Budgets, Transactions, or Accounts.
- Universal onboarding and all three external Money destinations routed through the same
  coordinator when invoked.
- Existing users with usable Money value pass through without a visible gate.
- Honest empty-state setup continuation from each destination after dismissal.
- A deliberate zero-plan Budgets state whose primary action connects accounts.
- A Money-owned navigation-visibility projection that hides Transactions only before any durable
  account or transaction evidence exists and never flickers during loading or errors.
- Development controls to reset Money FTUX and launch each entry source without altering real
  financial rows.
- Focused tests for routing, state migration/normalization, adoption decisions, destination
  preservation, and back-stack outcomes.

### Can be thin or temporary

- Local privacy-safe adoption events can use the existing analytics adapter without a production
  dashboard.
- The setup retains the current Money operations while restoring the prior illustration-led,
  full-screen hierarchy and slider interaction.
- The universal onboarding host may remain development-only during this learning release; its
  typed Money handoff must still be real.
- Signed-device Plaid OAuth remains a later verification gate; simulator paths may use an already
  connected account or an explicit provider-unavailable recovery state.

### Intentionally excluded

- New financial models, tables, migrations, or Plaid provider behavior.
- Screen Time or app-control illustration and education inside this setup.
- App-control onboarding changes beyond removing it as the general Money entry.
- Rewriting native Budgets, Transactions, or Accounts surfaces.
- Production rollout, TestFlight publication, or standalone Money retirement.
- Cross-capability onboarding work after Money.

## Release Channel

`Local build` on the iPhone 17 Pro, iOS 26.5 Simulator.

This is the fastest truthful channel for evaluating all four entry sources, navigation history,
interruption, resume, empty states, copy hierarchy, and accessibility without changing production
behavior or requiring live Plaid authorization. A later signed-device gate is required for real
Plaid OAuth and tactile/accessibility behavior that Simulator cannot prove.

## Brand-Goodwill Guardrails

- Present one calm Money promise, not a setup checklist or budgeting lesson.
- Never display fabricated balances, transactions, income, or plan facts.
- Explain financial connection at the moment it is requested.
- Keep `Not now` visible and truthful.
- Do not repeatedly replay the full opening after dismissal.
- Keep Budgets and Accounts discoverable before setup; do not show a useless Transactions
  destination in the pristine main navigation.
- Preserve the user's selected destination through every outcome.
- Show one focused recovery action when evidence is missing or stale.
- Do not call route arrival, account connection, or setup completion a trusted decision.
- Keep loading, errors, and content from stacking multiple sheets or educational surfaces.

## Reversibility

The release uses one new route, additive local state, and existing capability operations. It does
not require a backend migration or alter financial records unless the user explicitly completes the
existing setup actions. The coordinator can be removed by restoring direct Money navigation and
the prior universal handoff. New local state is versioned and safely ignored by older builds.

## Permanent Product Threshold

Promote this to accepted Money entry behavior after the local matrix proves:

- identical first screen and setup spine from all four sources;
- Budgets and Accounts visible in the pristine menu while Transactions remains hidden until real
  account or transaction evidence exists;
- no destination flash before the coordinator decision;
- correct destination after completion and dismissal;
- checkpoint and destination survival through interruption/relaunch;
- no repeat gate for an oriented user with usable Money foundation;
- honest recovery for missing, stale, or unavailable financial evidence;
- acceptable visual hierarchy and accessibility at default and enlarged text sizes;
- focused verification passes with no regression to established internal Money navigation.

Signed-device Plaid OAuth, physical haptics, installed TestFlight behavior, and production first-run
remain explicit later gates.
