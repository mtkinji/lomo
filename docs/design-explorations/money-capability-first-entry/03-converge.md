# Converge: Capability-Owned Money Entry

## Decision

Choose **Money Entry Coordinator**, reusing and refining the existing Money setup experience rather
than creating another onboarding flow.

Every first-party entry into Budgets, Transactions, or Accounts supplies a typed requested place to
one capability-owned coordinator. The coordinator determines whether to:

1. continue directly for someone already oriented to Money;
2. resume an interrupted Money setup checkpoint; or
3. begin the same Money FTUX for someone entering from universal onboarding or the capability menu.

Completion, dismissal, and recovery all preserve the requested place.

## Alternative scoring

| Alternative | Maya fit | Active JTBD fit | Financial trust | System alignment | Resume and destination integrity | Blast radius |
| --- | --- | --- | --- | --- | --- | --- |
| Shell Preflight | Strong | Strong | Mixed | Mixed | Mixed | Medium-high across the shell |
| **Money Entry Coordinator** | **Strong** | **Strong** | **Strong** | **Strong** | **Strong** | **Medium and capability-scoped** |
| Destination-Hosted Shared Overture | Mixed-strong | Strong | Mixed | Strong | Mixed | Medium across three screens |

## Existing onboarding review

The existing `MoneySetupScreen` is the implementation spine to retain, but it is not currently the
shared first-entry experience.

### What is already strong

- The flow is owned by Money and uses the signed-in person's user-scoped state.
- It checks local completion, living-target, active-plan, linked-account, and snapshot evidence.
- It asks for a real living target rather than presenting sample financial values.
- Plaid connection is requested in context and reconciliation uses current account evidence.
- Plan construction remains deterministic, reviewable, and reversible.
- Setup completion requires a usable living plan rather than treating route arrival or account
  connection as success.
- The final state can show real plan facts: planned use, protected costs, and flexible money.

### What prevents it from serving the new contract

- Budgets, Transactions, and Accounts currently navigate directly and do not share an entry gate.
- Setup completion always navigates to Budgets, discarding Transactions or Accounts intent.
- The current universal Money door promises app controls, not the broader Money job.
- In the live no-budgets rehearsal, that app-control handoff opened `New category`; it did not enter
  the existing Money setup flow.
- `Connect later` advances to a build step that normally cannot complete without usable account
  history. This reads like permission to continue but often becomes a delayed block.
- The standard Money screen and card presentation feels like configuration inside an already-open
  capability, not the intentional first-time threshold used elsewhere in Kwilt.
- One local `completedAt` value currently suppresses setup even if durable Money foundation is no
  longer available. Orientation and current financial readiness need separate meanings.
- The existing state remembers completion and target, but not an FTUX checkpoint or requested
  post-FTUX destination.

## Chosen user experience

### Entry

- Universal onboarding Money door -> `MoneyEntry(requestedPlace: Budgets)`.
- Capability menu Budgets -> `MoneyEntry(requestedPlace: Budgets)`.
- Capability menu Accounts -> `MoneyEntry(requestedPlace: Accounts)`.
- Capability menu Transactions -> `MoneyEntry(requestedPlace: Transactions)` once real account or
  transaction evidence makes that destination useful.
- Internal navigation within an already-open, already-oriented Money session remains direct.

Budgets and Accounts remain visible in a pristine Money state. Transactions is hidden from the
main navigation until Money has durable evidence that an account was connected or real transaction
history exists. Temporary loading, refresh errors, or disconnection do not hide it; visibility must
not flicker with network health. Direct links still resolve through the coordinator, because menu
visibility is progressive disclosure rather than access control.

The universal Money door should express the canonical Money promise—**Know where I stand before I
spend**—rather than making app controls the general definition of Money. App controls remain a
later Money/Screen Time behavior, not the universal capability threshold.

### Shared FTUX

Keep the existing functional sequence, with the capability introduction serving as the welcome:

1. **Money promise** - the existing capability introduction explains what Kwilt will make easier
   and that real numbers require the user's own evidence.
2. **Monthly target** - choose a simple household spending target with one 50-100 percent slider,
   without category-by-category
   administration.
3. **Account evidence** - connect the accounts that should inform current truth.
4. **Analyze and build** - automatically create the maintained plan from real evidence, showing
   truthful rotating work messages and one recovery action when evidence is insufficient.
5. **Useful result** - show the real plan answer, then open the requested place.

These are narrative moments, not equal tasks. Only the target and account connection ask the person
to decide or act. Setup uses a quiet `2 of 4`, `3 of 4`, and `4 of 4` counter with no progress track;
the counter disappears when the fourth frame resolves to `Your budgets are ready`. Every frame is
illustration-led, using one consistent character and grounded household setting. No duplicate
welcome, percentage presets, manual build action, floating meters, or result dashboard is added.

### Completion

The final primary action names the destination the person chose:

- `See my budgets`
- `Review transactions`
- `View accounts`

The result replaces the coordinator in navigation history so Back does not replay FTUX.

### Leave and resume

`Not now` opens the requested Money place using its truthful empty or partial state and records
that the person has seen the introduction. It does not mark the financial foundation complete and
does not automatically replay the full introduction on later Money taps.

| Requested place | Empty-state truth | Primary action |
| --- | --- | --- |
| Budgets | No maintained monthly plan exists yet. | `Connect accounts` |
| Transactions | No connected activity is available yet. | `Connect an account` |
| Accounts | No financial accounts are connected yet. | `Connect an account` |

Budgets resumes shared setup at the account-evidence step. Transactions and Accounts use the
existing capability-owned account connection action; after a successful connection, Money offers
the next unfinished plan step without replaying the introduction. If partial real data exists, the
destination renders it and adds a quiet contextual `Finish Money setup` action rather than
pretending it is empty.

An interrupted active setup stores its checkpoint and requested place. The next external Money
entry offers a calm continuation with an option to start over or continue to the newly selected
place. It does not silently discard a more recent explicit destination tap.

## Capability delta

### Today, the user cannot reliably

- receive the same Money FTUX from Budgets, Transactions, Accounts, or universal onboarding;
- retain the destination they chose through setup;
- resume Money setup at a capability-owned checkpoint;
- distinguish having seen Money from having a currently usable plan;
- follow the universal Money promise into the existing Money setup experience.

### After this release, the user can

- enter one shared Money FTUX from all four entry sources;
- leave without being trapped in setup;
- resume without losing the destination they care about;
- establish the existing real Money foundation once;
- arrive at Budgets, Transactions, or Accounts as originally requested;
- bypass FTUX when already oriented, while still seeing native recovery if financial evidence is
  stale, disconnected, or incomplete.

### Still intentionally unsupported

- Destination-specific onboarding tours.
- Sample or fabricated financial values.
- Silent Plaid connection, automatic permission, or blanket financial access.
- Treating setup completion as `MoneyFirstTrustedDecision`.
- App-control setup as a prerequisite for Money adoption.
- A cross-capability setup checklist, completion percentage, or adoption badge.

## Reductive design decisions

- Reuse one Money setup spine; do not add a second flow.
- Replace the current general Money app-control handoff; do not add another Money carousel page.
- Keep three destinations; do not invent a Money onboarding hub.
- Keep Budgets and Accounts visible before setup; hide Transactions only in the pristine no-evidence
  state.
- Keep account connection in the shared flow and Accounts as its long-term owner.
- Remove the misleading `Connect later -> build -> cannot finish` path. `Not now` exits honestly to
  the requested destination instead.
- Do not make the user review individual categories before the first plan can become useful.
- Do not add a success modal after the useful result screen.
- Do not replay global Kwilt onboarding when only Money is new.

## System implications

- Add a typed Money entry route with `requestedPlace` and `source`.
- Route universal onboarding and external menu selections through it.
- Project Money-owned navigation visibility so the shell can hide pristine Transactions without
  learning Plaid or plan rules.
- Keep direct internal Money navigation unchanged after orientation.
- Evolve Money onboarding storage to distinguish introduction, in-progress checkpoint, requested
  place, and completed financial foundation.
- Base direct pass-through on current capability evidence, not local completion alone.
- Make `MoneySetupScreen` coordinator-driven or extract its current steps into a reusable
  capability-owned flow.
- Replace the unconditional `navigation.navigate('MoneySummary')` completion behavior with a typed
  replace to the requested place.
- Retire the no-budgets app-control path that opens category creation as the general Money FTUX.

## Activation and learning path

The person is most ready for Money education immediately after an explicit Money tap. Teach only
the shared model required to make the first trustworthy plan; explain transaction correction,
forecast confidence, app controls, and advanced account health later at their native moments.

Progress signals:

`money_entry_requested -> money_ftux_started_or_resumed -> target_saved -> account_connected_or_existing -> plan_usable -> requested_place_opened`

These signals describe adoption progress. `MoneyFirstTrustedDecision` remains a later event that
requires an authoritative continue, correction, plan adjustment, or keep-blocked outcome.

## Accepted trade-offs

- A new user may take several steps before seeing the selected destination because a trustworthy
  budget or transaction view depends on real foundation.
- The coordinator adds one typed route and richer local resume state.
- Direct Money links no longer always bypass FTUX for a person who has never encountered Money.

## Rejected trade-offs

- Duplicating the guard and onboarding logic in three screens.
- Letting the global shell interpret durable financial readiness.
- Losing explicit destination intent to simplify navigation.
- Requiring setup completion before the person can leave or inspect an honest empty Money state.

## Bet

We're betting that one capability-owned Money threshold, followed by the exact place the person
chose, will feel more coherent and trustworthy than three destination-specific introductions or an
app-control-first promise. If users routinely leave at the monthly-target step or repeatedly choose
Accounts only to bypass the broader setup, revisit the sequence by making account connection the
first working step and moving plan intent later—not by creating separate destination tours.

## Success signal

In an iPhone Simulator first-use matrix, universal onboarding, Budgets, direct Transactions entry,
and Accounts all render the same initial Money FTUX without destination flash. The pristine main
navigation shows Budgets and Accounts but not Transactions; Transactions appears after durable
account or transaction evidence without flickering during loading or errors. Completion opens the
requested place, interruption resumes with that intent, `Not now` opens an honest destination
state, and a returning user with current Money foundation enters directly. Automated tests prove
the routing, visibility projection, state normalization, completion evidence, and back-stack
behavior separately from Simulator visual proof and signed-device Plaid proof.
