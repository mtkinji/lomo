---
feature: actionRuntime
audiences: [audience-ai-native-life-operators, audience-burned-out-productivity-power-users, audience-aspirational-family-organizers]
personas: [Nina, Marcus, Maya]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves:
  - jtbd-trust-this-app-with-my-life
  - jtbd-carry-intentions-into-action
  - jtbd-get-help-without-retelling-my-life
  - jtbd-understand-why-ai-suggested-this
  - jtbd-stay-in-control-of-ai-actions
briefs:
  - unified-chat-operational-control-plane
status: draft
last_reviewed: 2026-08-26
---

# Capability Action Runtime

Owns the UI- and Chat-neutral registry, dispatch, authorization, idempotency,
confirmation, and canonical receipt contracts used to invoke capability-owned
actions. Capability business rules and persistence remain with each capability;
this module coordinates them without becoming a second domain layer.

## Finding an action end to end

Start with `scripts/action-runtime-boundary.json`. Each migrated operation names
its capability-owned action module and the UI or Chat files protected from
reintroducing raw mutations. For the initial To-do slice:

- operation contracts live in `packages/kwilt-agent-runtime/src/kwiltToolContracts.ts`;
- capability rules and normalized results live in
  `src/capabilities/todos/actions/todoActions.ts`;
- mobile persistence is adapted by `getTodoActionStoreBoundary` in
  `src/store/useAppStore.ts`;
- mobile Chat applies reviewed proposals through
  `src/features/unifiedChat/activityProposalExecutor.ts`;
- server Chat dispatches low-risk capture through
  `supabase/functions/_shared/serverActionDispatcher.ts`; and
- model-facing results use the canonical receipt adapter in
  `supabase/functions/_shared/serverToolProviderRegistry.ts`.

Native navigation, Toasts, haptics, and undo presentation stay in their UI
callers after the capability action returns. Add an operation to the boundary
manifest only after every protected path named there uses the capability action.

The Household slice follows the same rule through
`src/capabilities/relationships/actions/relationshipActions.ts`. Native
Household settings and Chat's authorized Family Screen Time evidence loader now
share `household.read`. Membership, invitation, child-capability, and caregiver
grant writes also use confirmed action handlers and canonical receipts in the
native UI. Their strict tool contracts are intentionally `pending_provider`:
neither mobile Chat nor Phone may advertise or execute them until an
authenticated Household provider, review proposal, durable receipt, and undo or
explicit non-reversible boundary are implemented.
