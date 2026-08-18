# Private Household Member Photos Implementation Plan

> **For Codex:** Required sub-skill: follow `executing-plans` while implementing this plan. Work inline in the existing `codex/chores` checkout; the repository AGENTS.md explicitly forbids creating a worktree without Andrew's approval.

**Goal:** Let a Household owner add a private photo for an accountless dependent while every connected member uses their own canonical Kwilt account photo, with account-first resolution across devices.

**Architecture:** Store account-owned and caregiver-managed photo references separately: `kwilt_account_avatars` is keyed to `auth.users`, while `kwilt_people.managed_avatar_storage_path` is the dependent fallback. A private `household-avatars` Storage bucket holds opaque objects. A single authenticated Edge Function owns upload initialization, confirmation, removal, and signed URL resolution; it re-checks self/Household-owner authority on every mutation and returns display-ready URLs without exposing auth bindings. Household RPC snapshots add only `avatarSource`, while the client asks the Edge Function for short-lived member URLs and combines them by membership ID.

**Tech Stack:** Expo/React Native, TypeScript, Supabase Postgres/RLS, Supabase Storage, Supabase Edge Functions (Deno), Jest/React Native Testing Library, pgTAP-style SQL fixtures.

**Scope record:** React Native surface is Settings → Household roster and a new focused member-detail screen, plus the existing Settings account avatar control. Native requirements are camera/library permission recovery, square image picking, 44pt controls, VoiceOver labels/states, dynamic text, and initials fallback. Backend deployment and real-device/Simulator proof remain explicit gates separate from source verification.

---

## Task 1: Lock the private persistence and authority contract

**Files:**
- Create: `supabase/migrations/20260818190000_household_member_avatars.sql`
- Create: `supabase/tests/household_member_avatars.sql`
- Create: `src/features/household/data/householdAvatarMigration.test.ts`

- [ ] Write failing SQL-contract tests asserting: a private `household-avatars` bucket with image-only MIME and size limits; a service-only `kwilt_account_avatars` table; a nullable managed dependent reference on `kwilt_people`; no direct authenticated writes; account/self and owner/dependent authority helpers; account-first source resolution; and explicit function execute revocation/grants.
- [ ] Add pgTAP fixtures for self account mutation, owner-dependent mutation, connected-child caregiver rejection, cross-Household rejection, removal, and account-first precedence.
- [ ] Run `npm test -- --runInBand src/features/household/data/householdAvatarMigration.test.ts` and preserve the expected red result.
- [ ] Generate the migration with `npx supabase migration new household_member_avatars`, then implement the schema and narrow RPC helpers used by the Edge Function. Use `security definer`, `set search_path = ''`, permanent-user enforcement, and no client write grants.
- [ ] Re-run the focused Jest contract test and, when a local Supabase database is available, `npx supabase test db --file supabase/tests/household_member_avatars.sql`.

## Task 2: Build a testable avatar authority and media policy core

**Files:**
- Create: `supabase/functions/_shared/householdAvatarPolicy.ts`
- Create: `supabase/functions/_shared/__tests__/householdAvatarPolicy_deno_test.ts`

- [ ] Write failing Deno tests for accepted JPEG/PNG/WebP types, 5 MB maximum, opaque extension mapping, bounded source/action parsing, account-over-dependent resolution, and safe error projection.
- [ ] Run `npx supabase functions serve --help` to confirm the installed CLI contract and run the repository's focused Deno test command for the new file.
- [ ] Implement pure parsing, MIME/size validation, source precedence, and response shaping. Do not log photo presence, paths, signed URLs, bytes, person IDs, or child identifiers.
- [ ] Re-run the focused Deno test.

## Task 3: Implement the authenticated private-media broker

**Files:**
- Create: `supabase/functions/household-avatars/index.ts`
- Modify: `supabase/config.toml`
- Modify: `supabase/functions/account-delete/index.ts`

- [ ] Implement `resolve-self` and `resolve-household`. Authenticate with the caller JWT, resolve authority through server-owned SQL helpers, and return only `{ membershipId?, avatarUrl, avatarSource }`; sign private URLs for a short bounded lifetime.
- [ ] Implement `init-upload` for `self` or a target child membership. Generate a random opaque object path, validate authority before issuing a signed upload URL, and return a one-use confirmation reference.
- [ ] Implement `confirm-upload`. Revalidate authority, inspect the uploaded object's MIME and size, atomically replace the appropriate canonical reference, then best-effort delete the old object. Reject confirmation if source ownership changed while uploading.
- [ ] Implement `remove`. Revalidate authority, clear the canonical reference first, then idempotently delete the old private object.
- [ ] Extend account deletion to purge account-avatar objects. Ensure Household member removal/dependent deletion clears projection immediately and queues or performs idempotent managed-object cleanup without directly mutating the Storage schema.
- [ ] Add the function to local Supabase config and verify it parses/lints with the repository's Deno/Supabase checks.

## Task 4: Add a strict mobile avatar data boundary

**Files:**
- Create: `src/features/household/data/householdAvatars.ts`
- Create: `src/features/household/data/householdAvatars.test.ts`
- Modify: `src/features/household/data/household.ts`
- Modify: `src/features/household/data/household.test.ts`

- [ ] Write failing tests for strict response parsing, membership-keyed resolution, account/dependent/initials sources, malformed/expired URL fallback, exact Edge request bodies, picker MIME/size forwarding, and no auth-user ID/raw-path fields in resolved client models.
- [ ] Implement the Edge request wrapper using Kwilt's existing authenticated Edge headers and `uploadFileToSignedUrl`; keep the old image until `confirm-upload` succeeds.
- [ ] Extend `HouseholdMember` with `avatarUrl: string | null` and `avatarSource: 'account' | 'dependent' | 'initials'`. Keep snapshot parsing strict and merge only server-returned membership IDs.
- [ ] Re-run the two focused data suites.

## Task 5: Build the quiet Household roster and person detail

**Files:**
- Create: `src/features/household/HouseholdMemberDetailScreen.tsx`
- Create: `src/features/household/HouseholdMemberDetailScreen.test.tsx`
- Modify: `src/features/household/HouseholdSettingsScreen.tsx`
- Modify: `src/features/household/HouseholdSettingsScreen.test.tsx`
- Modify: `src/navigation/RootNavigator.tsx`

- [ ] Add failing screen tests for the `Your family` roster with real `ProfileAvatar`, disclosure navigation, initials fallback, connected-account source sentence, owner-only dependent editing, no edit affordance for connected children, cancellation, denial recovery, uploading state, failure retry, replacement, and removal.
- [ ] Add `SettingsHouseholdMember` route params containing only membership ID. The detail screen reloads the canonical snapshot and never trusts route-provided role/source/authority.
- [ ] Replace capability-per-child headings as the roster entry point with one flat `Your family` group; preserve existing capability controls behind the selected child's detail so this change does not remove current functionality.
- [ ] Implement the detail hierarchy: large avatar, name, one contextual action/source sentence, then existing capability settings. Use `ProfileAvatar`, `SettingsPage`, `SettingsGroup`, and the current `BottomDrawer` picker pattern.
- [ ] Request camera/library permission only after the selected action. Use image-only square editing, preserve the old image during upload, and show concrete Settings recovery after denial.
- [ ] Re-run the focused screen suites and inspect the component at the smallest supported viewport and large accessibility text.

## Task 6: Promote the signed-in account photo to canonical storage

**Files:**
- Create: `src/features/account/SettingsHomeScreen.test.tsx` if no focused file exists, otherwise modify its existing test
- Modify: `src/features/account/SettingsHomeScreen.tsx`
- Modify: `src/store/useAppStore.ts`

- [ ] Add failing tests showing that signed-in photo add/replace/remove uses the private account-avatar contract, preserves the prior image until confirmation, and refreshes the local cache from the server result. Signed-out behavior remains local-only and is labeled as non-synced if retained.
- [ ] Replace `persistImageUri` as the signed-in source of truth with the avatar broker. Keep provider `authIdentity.avatarUrl` only as a fallback when no canonical Kwilt avatar exists.
- [ ] Store the last confirmed canonical signed URL/source in the local presentation cache without treating an expiring URL as permanent identity data.
- [ ] Re-run the focused Settings/store tests.

## Task 7: Verify the full learning slice without overstating proof

**Files:**
- Modify: `docs/design-explorations/household-member-photos/04-learning-release.md`
- Modify: `docs/design-explorations/household-member-photos/05-evaluate-learning.md`
- Modify: `docs/feature-briefs/household-member-photos.md`

- [ ] Run focused Jest suites from Tasks 1, 4, 5, and 6 plus the focused Deno policy test.
- [ ] Run `npm run product:lint` and `npm run jtbd:lint`.
- [ ] Run `npm run verify:changed -- --run` once after the slice is complete. If unrelated dirty Chores work still blocks `lint:tests`, report the exact blocker and preserve the earlier passing focused evidence.
- [ ] With explicit backend deployment authorization, deploy the migration/function to the development project and verify owner, cross-Household, connected-child, replacement, removal, and cleanup behavior against real rows.
- [ ] From this exact checkout/branch/commit, build and inspect iPhone 17 Pro Simulator states: initials, managed dependent, connected account, permission denial, upload failure, reload/relaunch persistence, smallest viewport, and accessibility text. Record backend and Simulator proof separately.
- [ ] Update the learning/evaluation artifacts with observed evidence only. Do not mark the Kwilt Activity done until backend and runtime acceptance are genuinely complete.

## Implementation references

- Supabase private Storage authorization and upload permissions: https://supabase.com/docs/guides/storage/security/access-control
- Supabase private asset delivery and signed URL behavior: https://supabase.com/docs/guides/storage/serving/downloads
- Supabase Data API grants change for newly created tables: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
