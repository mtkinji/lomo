# Progressive Meal Commitment Implementation Plan

**Goal:** Turn selected shared-cart ideas into an immutable, sparsely timed Next
meals batch while keeping unselected ideas in the continuous cart.

**Architecture:** Add one normalized timing union at the Meal Planning domain
boundary and persist it on versioned occasions. Finalization remains the only
commit authority; in the same transaction it copies unselected candidates and
their reactions into a new draft cart. Recipe Library owns the drawer workflow,
Meal Planning owns projection/presentation, and Groceries keeps consuming only
the finalized plan version.

**Tech stack:** React Native/Expo, TypeScript, Jest, PostgreSQL/Supabase RPC.

## Tasks

- [ ] Add red domain tests for Flexible, specific occasion, bounded coverage,
  finalization payloads, and sparse committed-plan selection.
- [ ] Implement the timing contract and projection/presentation helpers.
- [ ] Add red migration/repository tests for timing columns, grants, and
  unselected-candidate/reaction carry-forward.
- [ ] Create the additive Supabase migration and extend repository mapping.
- [ ] Add choose/place phases and the timing editor to the full Plan drawer.
- [ ] Render committed Next meals as dated, coverage, and Flexible sections.
- [ ] Run focused Jest, test/app typechecks, product/architecture lint,
  `npm run verify:changed -- --run`, local SQL proof where available, production
  migration verification, and Simulator visual proof.

This plan executes inline on `feature/meal-planning-jobs`; no parallel worktree
or subagent lane is authorized.
