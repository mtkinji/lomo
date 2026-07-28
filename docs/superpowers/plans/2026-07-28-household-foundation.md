# Household Foundation Implementation Plan

> **For Codex:** Use the accepted Household Foundation brief as the product contract. Execute this plan in the repository's normal checkout on `codex/family-capability-foundation`; do not create a worktree unless Andrew explicitly approves a parallel lane.

**Goal:** Ship the first server-authorized Household slice so a parent can add dependent children and activate To-dos or Screen Time independently for each child, with no implicit sharing of personal data.

**Architecture:** Add canonical Person, Household, Membership, child capability activation, caregiver grant, invitation, and audit tables in Supabase. Keep all client writes behind authenticated `security definer` RPCs with a fixed empty search path; RLS allows only the minimum roster/activation reads needed by active members. Add a small typed client repository and a single Settings > Household surface that creates the Household just in time when the first child is added.

**Tech Stack:** PostgreSQL/Supabase migrations and RLS, TypeScript, React Native, React Navigation, Jest/React Native Testing Library.

---

## Task 1: Freeze the server authorization contract

**Files:**
- Create: `src/features/household/data/householdMigration.test.ts`
- Create: `supabase/migrations/20260728190000_household_foundation.sql`

1. Write a failing migration contract suite that requires canonical people, auth bindings, households, memberships, capability catalog, child activations, caregiver grants, invitations, and audit events.
2. Require authenticated RPCs for snapshot, adding a dependent, capability activation, caregiver grant changes, invitation creation/acceptance, and member removal.
3. Require `security definer set search_path = ''`, explicit `auth.uid()` checks, public/anon execute revocation, authenticated grants, RLS enablement, and denial of direct client writes.
4. Require the activation lifecycle to be child-scoped and limited to cataloged capabilities; seed `todos` and `screen-time` independently.
5. Run `npm test -- --runInBand src/features/household/data/householdMigration.test.ts` and confirm the red state before adding the migration.
6. Implement the migration and rerun the focused suite to green.

## Task 2: Add the typed Household client boundary

**Files:**
- Create: `src/features/household/data/household.ts`
- Create: `src/features/household/data/household.test.ts`

1. Write failing tests for parsing the server snapshot and invoking each RPC with exact parameter names.
2. Define stable client types for roles, people, memberships, supported child capabilities, activation states, grants, and the complete Household snapshot.
3. Implement `getHouseholdSnapshot`, `addDependentChild`, `setChildCapabilityActivation`, `setCaregiverCapabilityGrant`, `createCaregiverInvite`, `acceptCaregiverInvite`, and `removeHouseholdMember`.
4. Surface server errors as ordinary `Error` instances and never optimistically claim authority changes succeeded.
5. Run the focused data tests to green.

## Task 3: Add the parent-facing Household settings surface

**Files:**
- Create: `src/features/household/HouseholdSettingsScreen.tsx`
- Create: `src/features/household/HouseholdSettingsScreen.test.tsx`
- Modify: `src/features/account/SettingsHomeScreen.tsx`
- Modify: `src/features/account/SettingsHomeScreen.test.tsx`
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/navigation/navigationPersistence.ts`

1. Add `SettingsHousehold` to navigation and the persisted-route allow-list.
2. Put Household in a Family settings group, separate from capability-specific Money household configuration.
3. Show a signed-out explanation without issuing authenticated calls.
4. For a signed-in owner, show the roster, an add-child form, and child cards with independent To-dos and Screen Time toggles.
5. Make pending mutations explicit and reload server truth after success; on failure, preserve the prior displayed state and explain the error.
6. Include caregiver invite generation as an owner action. Do not automatically grant the invited caregiver authority over either capability.
7. Add focused component tests for first-child setup and sibling-independent activation.

## Task 4: Verify the complete first slice

**Files:**
- Modify as required by verification only.

1. Run the Household migration, data, screen, and Settings root tests together.
2. Run `npm run product:lint` to validate the accepted brief and links.
3. Run `npm run verify:changed -- --run` for diff-aware typecheck, tests, architecture checks, and manual follow-up identification.
4. Inspect the final diff for privacy regressions: no queries or policies should widen access to Goals, Activities, Money, Chat, or other capability content.
5. Record proof boundaries accurately: local migration-contract and component proof do not equal a deployed Supabase migration or a signed-device Screen Time result.
