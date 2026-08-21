# Diverge: Money Capability First Entry

## Design challenge

How might we help Maya establish one trustworthy Money foundation from any Money entry point,
while preserving the destination she chose and avoiding finance-system administration?

## Axis of variation

**Where the shared first-entry decision lives:** before the Money navigator, at the Money
capability boundary, or inside each destination.

Money does not create or change an Arc, Goal, Activity, or Chapter in this flow. The four-object
model remains untouched. The relevant Kwilt principle is capture-first by analogy: the FTUX must
not block the rest of Kwilt, and leaving Money cannot require financial setup or commitment.

## Alternative A: Shell Preflight

The global capability shell intercepts the first tap on any Money destination. It checks shared
Money adoption state before navigation. If FTUX is needed, it opens Money setup as a full-screen
global modal while holding the requested destination. On completion, the shell dispatches the
original navigation action. The universal onboarding handoff calls the same preflight with Budgets
as its default destination.

### Maya fit

The gate happens consistently before any Money screen appears, so there is no empty or misleading
destination flash. The downside is ownership: Money setup feels hosted by the shell even though it
requests financial connection and creates a plan.

### Design-challenge answer

Strong consistency and destination continuity, but weaker capability ownership.

### System fit

- Changes the capability menu selection path and every other external Money navigation source.
- Requires the shell to load or query Money-specific adoption evidence.
- Makes global onboarding and menu entry easy to unify.
- Risks teaching the shell about Plaid, plan readiness, and Money recovery states.

### Best when

Every external Money entry is already centralized and the preflight can remain a thin capability-
owned callback rather than duplicating Money logic.

### Fails when

Deep links, Chat actions, widgets, or nested Money links bypass the shell, or when the shell begins
to own financial setup rules.

### Primer and anti-pattern check

- Four-object model: unaffected.
- Capture-first: the user can leave the modal and use Kwilt; no financial commitment is required
  to dismiss.
- Avoids dashboards, pressure, streaks, AI inference, and forced commitment.
- Main concern: a global modal can feel like a product tollgate rather than contextual help.

## Alternative B: Money Entry Coordinator

All first-party Money entry sources navigate to one capability-owned `MoneyEntry` coordinator with
the requested place: Budgets, Transactions, or Accounts. The coordinator loads shared adoption
evidence once. If Money is already established, it immediately replaces itself with the requested
place. If not, it runs one full-screen Money FTUX, persists its checkpoint and requested place,
then replaces itself with the original destination. The universal onboarding handoff targets the
same coordinator with Budgets as the explicit default.

The first visible moment can remain a calm Money introduction, while later steps are honest about
their purpose: choose the household plan posture, connect accounts when real evidence is required,
build or recover the plan, then continue to the chosen place. `Skip for now` leaves Money without
marking it complete; an interrupted session resumes at its checkpoint and still remembers the
destination.

### Maya fit

Maya receives one coherent Money story regardless of which menu row she tapped. Money—not the
shell—explains financial access and owns recovery. Her tap still matters because the end of FTUX
is Transactions or Accounts when that is what she chose, rather than always Budgets.

### Design-challenge answer

Strongest combination of one foundation, capability ownership, truthful resume, and destination
continuity.

### System fit

- Extends the Money stack with one typed entry route and a typed requested-place parameter.
- Reuses the existing per-user Money onboarding record and setup behavior.
- Replaces the current unconditional `MoneySetup -> MoneySummary` completion action.
- Requires first-party external Money routes to use the coordinator; internal navigation after
  Money is open continues directly.
- Keeps financial evidence and recovery inside `src/capabilities/money/`.

### Best when

Money has one capability-wide adoption threshold and all three destinations rely on the same
minimum truthful foundation.

### Fails when

The FTUX becomes a long generic budgeting course or requires work irrelevant to the selected
destination. Accounts entry must not feel absurdly delayed by asking the user to connect an account
somewhere other than the account-connection step.

### Primer and anti-pattern check

- Four-object model: unaffected.
- Capture-first: Money setup may be left without blocking the rest of Kwilt; no forced plan is
  required to dismiss.
- Avoids dashboards, setup percentages across capabilities, productivity language, and AI
  inference.
- Preserves financial truth by treating route arrival and connection as progress, not first value.

## Alternative C: Destination-Hosted Shared Overture

Kwilt first opens Budgets, Transactions, or Accounts exactly as tapped. Each destination invokes
the same shared `MoneyFirstVisit` full-screen overlay when adoption evidence says it is needed. The
overlay gives the common Money introduction and can start the existing setup flow. Closing it
reveals the selected destination. Completing setup returns naturally because the destination
remained mounted underneath.

### Maya fit

Her tap feels immediately honored, and each destination can reveal why setup matters in context.
Accounts can lead directly into connection; Transactions can explain that real activity comes from
connected accounts; Budgets can explain the maintained plan. The risk is that “same FTUX” quietly
becomes three variants and that an empty, loading, or misleading screen appears beneath or briefly
before the overlay.

### Design-challenge answer

Strongest destination context, weaker guarantee of one coherent capability adoption flow.

### System fit

- Reuses the existing destinations and setup route.
- Adds a shared guard hook or host to all three screens.
- Requires careful coordination so only one overlay owns attention and no screen marks onboarding
  complete independently.
- Deep links naturally encounter the guard, but nested detail routes need an explicit policy.

### Best when

Each destination can provide useful read-only value before setup, and the shared overture is truly
short and identical.

### Fails when

Screens fetch sensitive financial data before the gate resolves, one destination forgets the
guard, or destination-specific copy fragments the shared Money model.

### Primer and anti-pattern check

- Four-object model: unaffected.
- Capture-first: leaving the overlay leaves the user at the chosen Money place, which is highly
  permissive.
- Avoids pressure and forced commitment.
- Main concern: empty-state and overlay stacking can turn FTUX into status noise or a promotional
  interruption.

## Comparative read

| Alternative | Same FTUX guarantee | Preserves tapped destination | Capability ownership | Resume integrity | Implementation blast radius | Main risk |
| --- | --- | --- | --- | --- | --- | --- |
| Shell Preflight | Strong | Strong | Mixed | Mixed | Medium-high across shell routes | Global shell absorbs Money rules |
| Money Entry Coordinator | Strong | Strong | Strong | Strong | Medium, concentrated in Money and entry routing | Coordinator becomes an overlong tollgate |
| Destination-Hosted Shared Overture | Mixed-strong | Strong | Strong | Mixed | Medium across three screens | Three variants and empty-screen flash |

## Direction to carry into convergence

`Money Entry Coordinator` is the leading alternative because the user chose one Money FTUX, not
three destination explainers, and because financial setup belongs to Money rather than the global
shell. Convergence should pressure-test the minimum number of FTUX moments, the skip/exit behavior,
the exact adoption evidence, and whether Accounts needs a contextual handoff within the shared
sequence rather than a separate version.
