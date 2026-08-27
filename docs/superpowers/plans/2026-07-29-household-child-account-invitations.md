# Household Child Account Invitations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an owner invite an existing Kwilt account into a Household as a child, with email-bound acceptance and an explicit review step, without creating a duplicate dependent profile.

**Architecture:** Extend the existing `kwilt_household_invites` contract with a role-aware migration and new RPCs while keeping the original caregiver RPCs compatible. The React Native data boundary exposes one role-aware invitation API, and Household Settings branches **Add a child** into existing-account and dependent-profile paths. Nearby, QR, and share delivery remain future transports over the same server invitation token.

**Tech Stack:** PostgreSQL/Supabase RPCs and RLS, TypeScript, React Native, Jest, React Native Testing Library.

---

## File structure

- Create `supabase/migrations/20260730042845_household_child_account_invites.sql`: extend invited roles, add preview/create/accept RPCs, enforce invited email, preserve legacy caregiver wrappers, and audit child invitation lifecycle.
- Create `src/features/household/data/householdChildInvitesMigration.test.ts`: static migration security and authority contract.
- Modify `src/features/household/data/household.ts`: role-aware invitation types and RPC adapters.
- Modify `src/features/household/data/household.test.ts`: exact RPC payload, normalization, preview parsing, and malformed-response tests.
- Modify `src/features/household/HouseholdSettingsScreen.tsx`: child-path choice, existing-account invitation, review-before-acceptance, and clear invitation receipt.
- Modify `src/features/household/HouseholdSettingsScreen.test.tsx`: user-visible branching and existing-child-account acceptance coverage.
- Modify `docs/feature-briefs/household-foundation.md`: keep acceptance criteria synchronized if implementation constraints refine the accepted design.

### Task 1: Define the role-aware server contract with failing tests

**Files:**
- Create: `src/features/household/data/householdChildInvitesMigration.test.ts`
- Create: `supabase/migrations/20260730042845_household_child_account_invites.sql`

- [x] **Step 1: Write the failing migration contract test**

Assert that the new migration:

```ts
expect(migration).toContain("check (invited_role in ('caregiver', 'child'))");
expect(migration).toContain('create or replace function public.create_kwilt_household_member_invite');
expect(migration).toContain('create or replace function public.preview_kwilt_household_invite');
expect(migration).toContain('create or replace function public.accept_kwilt_household_member_invite');
expect(migration).toContain("raise exception 'invite_email_mismatch'");
expect(migration).toContain("'child_invited'");
expect(migration).toContain("'child_joined'");
```

Also require `security definer`, `set search_path = ''`, authenticated grants, public/anonymous revocations, hashed invite-code lookup, row locking on acceptance, and no direct table mutation grants.

- [x] **Step 2: Run the test and confirm the missing migration fails**

Run: `npm test -- --runInBand src/features/household/data/householdChildInvitesMigration.test.ts`

Expected: FAIL because `20260730042845_household_child_account_invites.sql` does not exist.

- [x] **Step 3: Implement the migration**

The migration must:

```sql
alter table public.kwilt_household_invites
  drop constraint kwilt_household_invites_invited_role_check;
alter table public.kwilt_household_invites
  add constraint kwilt_household_invites_invited_role_check
  check (invited_role in ('caregiver', 'child'));
```

Create `create_kwilt_household_member_invite(uuid, text, text, text)`, `preview_kwilt_household_invite(text)`, and `accept_kwilt_household_member_invite(text, text)`. Creation validates the proposed role and requires the owner. Preview and acceptance require a permanent authenticated user, reject a targeted email that differs from the authenticated account email, and disclose only Household name, inviter name, proposed role, and expiry. Acceptance reuses or creates the accepting user's Person, creates exactly one membership with `v_invite.invited_role`, marks the invitation accepted, and records the matching audit event. Keep `create_kwilt_household_invite` and `accept_kwilt_household_invite` as caregiver-compatible wrappers.

- [x] **Step 4: Run the migration contract test**

Run: `npm test -- --runInBand src/features/household/data/householdChildInvitesMigration.test.ts`

Expected: PASS.

### Task 2: Add the app data boundary with TDD

**Files:**
- Modify: `src/features/household/data/household.ts`
- Modify: `src/features/household/data/household.test.ts`

- [x] **Step 1: Write failing adapter tests**

Cover these calls and exact payloads:

```ts
createHouseholdMemberInvite(client, {
  householdId: null,
  role: 'child',
  invitedEmail: 'charlie@example.com',
  ownerDisplayName: 'Andrew',
});

previewHouseholdInvite(client, ' ab12cd ');

acceptHouseholdMemberInvite(client, {
  code: ' ab12cd ',
  displayName: 'Charlie',
});
```

Require normalized email, uppercase codes, strict parsing of `code`, `expiresAt`, `role`, `householdName`, and `inviterDisplayName`, and rejection of malformed RPC responses.

- [x] **Step 2: Run the adapter test and confirm failure**

Run: `npm test -- --runInBand src/features/household/data/household.test.ts`

Expected: FAIL because the role-aware functions do not exist.

- [x] **Step 3: Implement the minimal typed adapters**

Add:

```ts
export type HouseholdInvitationRole = 'caregiver' | 'child';
export type HouseholdInvitation = { code: string; expiresAt: string; role: HouseholdInvitationRole };
export type HouseholdInvitationPreview = {
  householdName: string;
  inviterDisplayName: string;
  role: HouseholdInvitationRole;
  expiresAt: string;
};
```

Expose `createHouseholdMemberInvite`, `previewHouseholdInvite`, and `acceptHouseholdMemberInvite`. Keep the caregiver-named functions as compatibility wrappers until all callers migrate.

- [x] **Step 4: Run the adapter tests**

Run: `npm test -- --runInBand src/features/household/data/household.test.ts`

Expected: PASS.

### Task 3: Make Add a child connect an existing account

**Files:**
- Modify: `src/features/household/HouseholdSettingsScreen.tsx`
- Modify: `src/features/household/HouseholdSettingsScreen.test.tsx`

- [x] **Step 1: Write failing screen tests**

Test the user workflows:

```text
Add a child -> Already uses Kwilt -> enter Charlie email -> Create invitation
Add a child -> Create a profile -> enter name -> Add child
Join a household -> enter code -> Review invitation -> see inviter/Household/child role -> Join household
```

Assert that existing-account invitation calls the role-aware API with `role: 'child'`, profile creation remains `addDependentChild`, and acceptance occurs only after preview.

- [x] **Step 2: Run the screen test and confirm failure**

Run: `npm test -- --runInBand src/features/household/HouseholdSettingsScreen.test.tsx`

Expected: FAIL because **Add a child** still opens the name-only form.

- [x] **Step 3: Implement the UI flow**

Replace the single child form state with `child-choice`, `child-account`, and `child-profile`. Reuse `HouseholdAction`, `Input`, `Button`, and the neutral semantic styling already present. Show an invitation receipt with the role and code. Change the join action to preview first; show plain language that only the roster is shared and Screen Time requires separate device setup; accept only from the review state.

Do not add nearby permissions, Bluetooth discovery, QR scanning, email delivery infrastructure, or Apple authorization in this slice.

- [x] **Step 4: Run screen and data tests together**

Run: `npm test -- --runInBand src/features/household/HouseholdSettingsScreen.test.tsx src/features/household/data/household.test.ts src/features/household/data/householdChildInvitesMigration.test.ts`

Expected: PASS.

### Task 4: Verify and review the coherent slice

**Files:**
- Modify if generated: `docs/agent-code-map.md`

- [x] **Step 1: Run targeted type and product gates**

Run: `npm run lint && npm run lint:tests && npm run product:lint`

Expected: all commands pass; existing product-lint warnings may remain unchanged.

- [x] **Step 2: Run diff-aware verification**

Run: `npm run verify:changed -- --run`

Expected: all derived gates pass and `docs/agent-code-map.md` is regenerated if required.

- [x] **Step 3: Review the final diff against the accepted contract**

Confirm that:

- an existing Charlie account can join as `child` without a dependent-profile duplicate;
- email targeting is enforced without account enumeration;
- invitation transport does not activate capabilities or authorize a device;
- caregiver invites remain compatible;
- nearby/QR/share delivery can later reuse the same token and RPCs;
- no unrelated branch changes were modified.
