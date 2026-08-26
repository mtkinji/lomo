# Family Screen Time Child-Device Enrollment Implementation Plan

> **Superseded on 2026-08-26:** Do not execute this plan as written. It incorrectly
> requires a conventional child account and child JWT before personal-device setup.
> Implement [Household Device Participation Foundation](2026-08-26-household-device-participation-foundation.md)
> first, then use its corrected Screen Time continuation. The architecture and copy
> contracts linked below have been updated to the accepted guardian-managed access
> model.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inert production setup card with a physically proven, one-child/one-iPhone enrollment, policy reconciliation, authoritative receipt, recovery, and release path.

**Architecture:** Keep caregiver mutations in Household-authorized Postgres RPCs and put child-device traffic behind one authenticated Edge Function that requires both the child's Supabase session and a Keychain-held device credential. The enrolled install persists complete policies and a native App Group receipt outbox, applies only monotonic child-scoped versions, and reports a coherent snapshot before the server derives Ready or Applied. Treat Apple `.child` authorization, picker behavior, signed entitlements, and closed-app enforcement as physical-device gates rather than source assertions.

**Tech Stack:** React Native and TypeScript, React Navigation, Zustand/Jest, Expo SDK 55, `expo-secure-store`, Supabase Postgres and Edge Functions/Deno, Swift FamilyControls/ManagedSettings/DeviceActivity, Expo config plugins, APNs/Expo notification hints.

---

## Execution constraints

- Read the canonical [enrollment and reconciliation contract](../../architecture/family-screen-time-device-enrollment-and-reconciliation.md) and [copy contract](../../product/family-screen-time-device-setup-copy.md) before implementation.
- Reuse the current checkout and ordinary branch. Do not create a worktree unless Andrew explicitly authorizes a parallel lane and its integration target.
- Task 0 is a stop/go gate. Do not build the server transport until the signed-device spike proves a usable `.child` authorization and picker path.
- TDD is required for migration contracts, state projection, validation, digesting, queues, reconciliation, Edge Functions, release, and recovery logic. Presentational screen composition may be implementation-first, but branchy logic must be extracted and tested.
- The checked-in source of native truth is `plugins/withAppleEcosystemIntegrations.js`; ignored/generated `ios/` files are inspection and build proof, not independent source edits.
- A source pass, Simulator pass, signed-device pass, TestFlight pass, and production rollout are separate gates.

## File and ownership map

| Unit | Responsibility |
| --- | --- |
| `supabase/migrations/20260826153000_household_dependent_account_connection.sql` | Explicitly connect an existing dependent membership to the child's reviewed authenticated account without creating a duplicate child. |
| `supabase/migrations/20260826160000_family_screen_time_device_enrollment.sql` | Enrollment sessions, strengthened device/receipt/snapshot schema, caregiver RPCs, private device functions, monotonic server projection. |
| `supabase/functions/_shared/familyScreenTimeDevice.ts` | Pure request validation, child/device credential authorization, policy and receipt action dispatch. |
| `supabase/functions/family-screen-time-device/index.ts` | CORS, Supabase JWT, service client, and HTTP boundary for the device channel. |
| `src/features/household/screenTime/device/familyScreenTimeDeviceContract.ts` | Shared closed TypeScript contracts and parsers for enrollment, capabilities, policies, receipts, snapshots, and failures. |
| `src/features/household/screenTime/device/familyScreenTimeDeviceCredential.ts` | Keychain storage and install/device credential consistency. |
| `src/features/household/screenTime/device/familyScreenTimeDeviceClient.ts` | Caregiver RPC and child Edge Function calls. |
| `src/features/household/screenTime/device/familyScreenTimeDeviceReconciler.ts` | Serialized durable upload/fetch/apply/snapshot loop with monotonic policy handling. |
| `src/features/household/screenTime/device/familyScreenTimeDeviceRuntime.ts` | Auth, foreground, push-hint, upgrade, outbox, and release triggers. |
| `src/features/household/screenTime/FamilyScreenTimeDeviceSetupScreen.tsx` | Child-device identity, claim, Apple approval, picker, checking, recovery, and success UI. |
| `src/features/household/screenTime/FamilyScreenTimeLearningScreen.tsx` | Real caregiver setup, progress, desired/applied truth, agreement, diagnostics, and release. |
| `plugins/withAppleEcosystemIntegrations.js` | Generated Swift bridge, App Group policy store/outbox, `.child` authorization, picker, apply, snapshot, and cleanup. |
| `docs/delivery-evidence/family-screen-time/child-device-learning-release.md` | Build lineage and signed-device/TestFlight evidence checklist; never upgraded by source-only proof. |

## Task 0: Prove the Apple path on signed devices

**Files:**
- Modify: `plugins/withAppleEcosystemIntegrations.js`
- Modify: `src/services/appleEcosystem/screenTimeProtection.ts`
- Modify: `src/services/appleEcosystem/screenTimePrerequisiteNative.test.ts`
- Create: `docs/delivery-evidence/family-screen-time/child-device-feasibility-spike.md`
- Inspect generated: `ios/Kwilt/KwiltScreenTimeProtection.swift`
- Inspect generated: `ios/Kwilt/KwiltScreenTimeProtection.m`

- [ ] **Step 1: Write the failing bridge contract test**

Require the generated Swift to accept an explicit member and never infer family authority from the existing no-argument method:

```ts
expect(pluginSource).toContain('requestAuthorization(for member: FamilyControlsMember)');
expect(pluginSource).toContain('requestAuthorization(for: member)');
expect(pluginSource).toContain('case "child": member = .child');
expect(pluginSource).toContain('case "individual": member = .individual');
expect(pluginSource).not.toContain('requestAuthorization(for: .individual)');
```

- [ ] **Step 2: Run the contract test and observe the existing hard-coded mode fail**

Run: `npx jest src/services/appleEcosystem/screenTimePrerequisiteNative.test.ts --runInBand`

Expected: FAIL because generated Swift still calls `.individual` and exposes no member argument.

- [ ] **Step 3: Add the smallest explicit native member API**

Use this JavaScript boundary:

```ts
export async function requestScreenTimeAuthorization(
  member: 'individual' | 'child' = 'individual',
): Promise<ScreenTimeAuthorizationStatus> {
  if (Platform.OS !== 'ios' || !native?.requestAuthorization) return 'unavailable';
  try {
    return normalizeStatus(await native.requestAuthorization(member));
  } catch {
    return 'unavailable';
  }
}
```

Generate Swift that maps only `child` and `individual`, rejects any other value, calls `AuthorizationCenter.shared.requestAuthorization(for: member)`, and returns the observed `authorizationStatus` after the system sheet resolves.

- [ ] **Step 4: Regenerate and verify native output**

Run:

```bash
KWILT_ENABLE_WIDGETS=1 npx expo prebuild --platform ios --no-install
npx jest src/services/appleEcosystem/screenTimePrerequisiteNative.test.ts --runInBand
```

Expected: prebuild completes; the focused Jest test passes; generated Swift contains `.child` and `.individual` branches.

- [ ] **Step 5: Verify signed entitlements before runtime claims**

Build a signed development archive or install from the intended TestFlight build. For the archived `.app` and each Screen Time extension, run:

```bash
codesign -d --entitlements :- /absolute/path/to/Kwilt.app
codesign -d --entitlements :- /absolute/path/to/Kwilt.app/PlugIns/KwiltDeviceActivityMonitor.appex
codesign -d --entitlements :- /absolute/path/to/Kwilt.app/PlugIns/KwiltShieldAction.appex
codesign -d --entitlements :- /absolute/path/to/Kwilt.app/PlugIns/KwiltShieldConfiguration.appex
```

Expected: every target contains `com.apple.developer.family-controls`; every target that reads shared state contains `group.com.andrewwatanabe.kwilt`.

- [ ] **Step 6: Run the two-device feasibility script**

On a guardian iPhone and Charlie's physical iPhone in the same Apple Family Sharing group:

1. Install the exact same signed build lineage.
2. On Charlie's iPhone, sign in with Charlie's iCloud child account and invoke `.child` authorization.
3. Confirm the guardian approval sheet appears and `AuthorizationCenter.authorizationStatus` becomes approved.
4. Present `FamilyActivityPicker` on Charlie's authorized iPhone with the guardian present.
5. Select one harmless app/category, relaunch Kwilt, and confirm the saved opaque selection can still be loaded and applied locally.
6. With Kwilt terminated, apply and clear one short Device Activity schedule to that selection.

Record device model, iOS version, Apple account roles, app version/build, Git commit, build source, entitlement output, authorization result, picker placement, persistence result, and closed-app apply/clear result in `docs/delivery-evidence/family-screen-time/child-device-feasibility-spike.md`.

- [ ] **Step 7: Apply the stop/go rule**

Proceed only if Steps 5–6 pass. If the child-device picker does not provide a usable local selection, stop and revise the architecture for Apple's documented caregiver-device picker plus end-to-end encrypted token handoff. Do not send raw or base64-wrapped Apple tokens to Supabase.

- [ ] **Step 8: Commit the bounded spike**

```bash
git add plugins/withAppleEcosystemIntegrations.js src/services/appleEcosystem/screenTimeProtection.ts src/services/appleEcosystem/screenTimePrerequisiteNative.test.ts docs/delivery-evidence/family-screen-time/child-device-feasibility-spike.md
git commit -m "spike(screen-time): prove child authorization path"
```

## Task 1: Connect an existing dependent profile to Charlie's account

**Files:**
- Create: `supabase/migrations/20260826153000_household_dependent_account_connection.sql`
- Create: `src/features/household/data/householdDependentAccountConnectionMigration.test.ts`
- Modify: `src/features/household/data/household.ts`
- Modify: `src/features/household/data/household.test.ts`
- Modify: `src/features/household/HouseholdMemberDetailScreen.tsx`
- Modify: `src/features/household/HouseholdMemberDetailScreen.test.tsx`
- Modify: `src/features/household/HouseholdSettingsScreen.tsx`
- Modify: `src/features/household/HouseholdSettingsScreen.test.tsx`

- [ ] **Step 1: Write the failing migration and client tests**

Require a targeted invite that preserves the existing child membership id and never joins by name or similar email:

```ts
expect(sql).toContain('create_kwilt_dependent_account_connection_invite');
expect(sql).toContain('preview_kwilt_dependent_account_connection_invite');
expect(sql).toContain('accept_kwilt_dependent_account_connection_invite');
expect(sql).toContain('target_child_membership_id');
expect(sql).toContain("raise exception 'dependent_account_already_connected'");
expect(sql).toContain("raise exception 'account_already_in_household'");
expect(sql).not.toContain('lower(person.display_name) =');
```

Client/UI tests cover owner creates invitation, child previews while signed in, child accepts or declines, email mismatch, account already in a Household, expired/replayed code, and the same `childMembershipId` remaining after acceptance.

- [ ] **Step 2: Run focused tests and confirm red**

Run: `npx jest src/features/household/data/householdDependentAccountConnectionMigration.test.ts src/features/household/data/household.test.ts src/features/household/HouseholdMemberDetailScreen.test.tsx src/features/household/HouseholdSettingsScreen.test.tsx --runInBand`

Expected: FAIL because dependent profiles cannot yet be connected to an authenticated account.

- [ ] **Step 3: Add targeted connection invitation fields and RPCs**

Extend `kwilt_household_invites` with an `invite_kind` check for `member_join | dependent_account_connection`, a nullable exact `target_child_membership_id`, and an `operation_id` unique key. The create RPC requires an active owner of the target Household, an active child membership whose person has no active auth binding, optional exact invited email, a seven-day expiry, and idempotent operation id. Return only the random invite code, expiry, target display name, and invite kind.

The preview RPC requires a permanent authenticated user, validates expiry/email, and returns Household name, inviter name, target display name, relationship, and privacy disclosure without exposing other roster data.

- [ ] **Step 4: Atomically connect the authenticated person**

Acceptance must lock the invite and target membership, resolve the caller's one active `kwilt_person_auth_bindings` row, reject any active Household membership for that person, and update only:

```sql
update public.kwilt_household_memberships
set person_id = v_authenticated_person_id
where id = v_invite.target_child_membership_id
  and person_id = v_dependent_person_id
  and role = 'child'
  and status = 'active';
```

Preserve the membership id, child capability activations, caregiver grants, Screen Time subject, and audit history. Mark the invitation accepted, append an audit event containing old/new person ids, and retain the now-unbound dependent person for audit-safe later cleanup. Do not reassign a membership if the target gained a binding or changed person while the invite was open.

- [ ] **Step 5: Add the owner and child review surfaces**

On an unbound child member detail, show **Connect Charlie's Kwilt account** and create/share the targeted invitation. On the signed-in recipient path, render the copy contract's exact Household, relationship, privacy, **Connect my account**, and **Decline** language. After acceptance, refresh Household state and return to the exact child membership; do not create a second Charlie row.

- [ ] **Step 6: Run focused tests**

Run the Step 2 command again.

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260826153000_household_dependent_account_connection.sql src/features/household/data/householdDependentAccountConnectionMigration.test.ts src/features/household/data/household.ts src/features/household/data/household.test.ts src/features/household/HouseholdMemberDetailScreen.tsx src/features/household/HouseholdMemberDetailScreen.test.tsx src/features/household/HouseholdSettingsScreen.tsx src/features/household/HouseholdSettingsScreen.test.tsx
git commit -m "feat(household): connect dependent profile account"
```

## Task 2: Add enrollment, snapshot, and monotonic receipt schema

**Files:**
- Create: `supabase/migrations/20260826160000_family_screen_time_device_enrollment.sql`
- Create: `src/features/household/screenTime/data/familyScreenTimeDeviceEnrollmentMigration.test.ts`
- Modify: `src/features/household/screenTime/data/familyScreenTimeMigration.test.ts`

- [ ] **Step 1: Write the failing migration contract**

Assert the new migration creates and protects these objects:

```ts
const tables = [
  'kwilt_family_screen_time_enrollment_sessions',
  'kwilt_family_screen_time_device_capability_reports',
  'kwilt_family_screen_time_enforcement_snapshots',
];
for (const table of tables) {
  expect(sql).toContain(`create table public.${table}`);
  expect(sql).toContain(`alter table public.${table} enable row level security`);
  expect(sql).toContain(`revoke all on public.${table} from anon, authenticated`);
}
expect(sql).toContain("check (outcome in ('received', 'deferred', 'applied', 'failed', 'superseded', 'cleanup_applied'))");
expect(sql).toContain('create_kwilt_family_screen_time_enrollment_session');
expect(sql).toContain('cancel_kwilt_family_screen_time_enrollment_session');
expect(sql).toContain('request_kwilt_family_screen_time_device_release');
expect(sql).not.toContain("when v_receipt.outcome = 'received' then 'ready'");
```

- [ ] **Step 2: Run the focused tests and confirm red**

Run: `npx jest src/features/household/screenTime/data/familyScreenTimeDeviceEnrollmentMigration.test.ts src/features/household/screenTime/data/familyScreenTimeMigration.test.ts --runInBand`

Expected: FAIL because the migration and hardened receipt semantics do not exist.

- [ ] **Step 3: Create the schema and constraints**

The migration must include these durable fields and checks:

```sql
create table public.kwilt_family_screen_time_enrollment_sessions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  child_membership_id uuid not null references public.kwilt_household_memberships(id) on delete cascade,
  created_by_membership_id uuid not null references public.kwilt_household_memberships(id),
  status text not null check (status in ('issued','claimed','completed','cancelled','expired')),
  secret_hash text not null unique,
  manual_code_hash text not null unique,
  expires_at timestamptz not null,
  claimed_at timestamptz,
  claimed_by_user_id uuid,
  claimed_install_id text,
  operation_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kwilt_family_screen_time_devices
  add column credential_hash text,
  add column enrollment_session_id uuid references public.kwilt_family_screen_time_enrollment_sessions(id),
  add column enrollment_state text not null default 'claimed'
    check (enrollment_state in ('claimed','authorizing','reconciling','ready','needs_attention','release_pending','released')),
  add column latest_received_version bigint not null default 0,
  add column latest_applied_version bigint not null default 0,
  add column latest_snapshot_at timestamptz,
  add column release_requested_at timestamptz;

create unique index kwilt_family_screen_time_one_live_device_per_subject
  on public.kwilt_family_screen_time_devices(subject_id)
  where enrollment_state <> 'released';
```

Generate a 256-bit link secret plus a separate 12-character Crockford Base32 manual code;
store only their hashes and return both only from the original idempotent create result.
Add capability-report and snapshot tables with `device_id`, policy version/digest where
applicable, app/build, coarse booleans/identifiers, device timestamp, server timestamp,
and unique idempotency ids. Do not add Apple application, category, or web-domain token
columns.

- [ ] **Step 4: Replace the old outcome/readiness shortcut**

Migrate old `expired` application receipts to diagnostic failures and old `released` receipts to `cleanup_applied` only when the device row is already released. Replace the receipt check with the closed outcome set. `received` updates only `latest_received_version`; `applied` updates `latest_applied_version`; `ready` is derived only after a matching capability report and coherent snapshot. Reject a future version, mismatched digest, lower applied version, and impossible release regression.

- [ ] **Step 5: Add caregiver RPCs and private device functions**

The three caregiver RPCs must call the existing exact-child caregiver/grant helper, use expected versions and operation ids, and return the plain link secret plus manual code only from the original create result. Private functions are executable only by `service_role` and must accept already verified `device_id` plus normalized payloads; they may not trust a caller-supplied child membership independently.

- [ ] **Step 6: Run migration contracts**

Run: `npx jest src/features/household/screenTime/data/familyScreenTimeDeviceEnrollmentMigration.test.ts src/features/household/screenTime/data/familyScreenTimeMigration.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 7: Apply to a disposable Supabase branch and run adversarial SQL checks**

Prove owner, scoped caregiver, child, unscoped caregiver, wrong household, expired token, replayed token, stale version, future receipt, wrong digest, and direct table mutation behavior. Expected: only the exact authorized paths succeed; no app role can directly mutate the new tables.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260826160000_family_screen_time_device_enrollment.sql src/features/household/screenTime/data/familyScreenTimeDeviceEnrollmentMigration.test.ts src/features/household/screenTime/data/familyScreenTimeMigration.test.ts
git commit -m "feat(screen-time): add child device enrollment schema"
```

## Task 3: Implement the authenticated child-device Edge Function

**Files:**
- Create: `supabase/functions/_shared/familyScreenTimeDevice.ts`
- Create: `supabase/functions/_shared/__tests__/familyScreenTimeDevice_deno_test.ts`
- Create: `supabase/functions/family-screen-time-device/index.ts`
- Create: `supabase/functions/family-screen-time-device/deno.json`
- Modify: `package.json`

- [ ] **Step 1: Write failing pure-handler tests**

Cover all seven actions and denial cases. Use this request union:

```ts
export type FamilyScreenTimeDeviceAction =
  | { action: 'claim-enrollment'; transport: 'link' | 'manual_code'; token: string; installId: string }
  | { action: 'report-authorization'; deviceId: string; installId: string; authorizationStatus: 'authorized' | 'denied' | 'revoked' }
  | { action: 'report-capabilities'; deviceId: string; installId: string; report: DeviceCapabilityReport }
  | { action: 'fetch-policy'; deviceId: string; installId: string }
  | { action: 'record-receipts'; deviceId: string; installId: string; receipts: ApplicationReceipt[] }
  | { action: 'record-snapshot'; deviceId: string; installId: string; snapshot: EnforcementSnapshot }
  | { action: 'acknowledge-release'; deviceId: string; installId: string; receipt: ApplicationReceipt; snapshot: EnforcementSnapshot };
```

Tests must reject absent/malformed JWT, non-child auth binding, absent/wrong/released credential, wrong install id, another child/device, expired or replayed enrollment secret, future version, digest mismatch, more than 100 receipts, and unknown fields that would carry Apple tokens. Manual-code tests must prove per-user, per-install, and network-source attempt limits plus one generic response for wrong, expired, and cross-child codes.

- [ ] **Step 2: Run the Deno test and confirm red**

Run: `deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/__tests__/familyScreenTimeDevice_deno_test.ts`

Expected: FAIL because the handler does not exist.

- [ ] **Step 3: Implement strict parsing and credential verification**

Hash secrets and device credentials with SHA-256 before database comparison:

```ts
export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
```

`claim-enrollment` verifies the child JWT and exact person auth binding, applies manual-code rate limits when selected, atomically claims one unexpired session for the same child, creates the managed device, and returns `{ deviceId, credential, childMembershipId, enrollmentState }` once. Generate 32 random bytes for the credential and store only its hash. Compare the selected hash using the database's constant-time cryptographic equality path and return the same public error for a wrong, expired, or cross-child secret.

Every other action reads the credential from `x-kwilt-screen-time-device-credential`, verifies child JWT + binding + `deviceId` + `installId` + credential hash + non-released state, then calls one private database function. Return generic 401/403 errors that do not disclose household or child identity.

- [ ] **Step 4: Implement the HTTP wrapper**

Follow `supabase/functions/remote-bank-command/index.ts`: allow POST plus GET for `fetch-policy`, validate `Authorization`, construct user and service clients, pass only normalized identity into the pure handler, and keep service-role usage behind successful device authorization.

- [ ] **Step 5: Add the focused Deno test to `test:supabase-functions`**

Append `supabase/functions/_shared/__tests__/familyScreenTimeDevice_deno_test.ts` to the existing command. Do not replace or shorten the current test list.

- [ ] **Step 6: Run tests and lint**

```bash
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/__tests__/familyScreenTimeDevice_deno_test.ts
deno check --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/familyScreenTimeDevice.ts supabase/functions/family-screen-time-device/index.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json supabase/functions/_shared/familyScreenTimeDevice.ts supabase/functions/_shared/__tests__/familyScreenTimeDevice_deno_test.ts supabase/functions/family-screen-time-device/index.ts supabase/functions/family-screen-time-device/deno.json
git commit -m "feat(screen-time): add authenticated child device channel"
```

## Task 4: Add mobile contracts, parsers, and Keychain credential storage

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/features/household/screenTime/device/familyScreenTimeDeviceContract.ts`
- Create: `src/features/household/screenTime/device/familyScreenTimeDeviceContract.test.ts`
- Create: `src/features/household/screenTime/device/familyScreenTimeDeviceCredential.ts`
- Create: `src/features/household/screenTime/device/familyScreenTimeDeviceCredential.test.ts`
- Create: `src/features/household/screenTime/device/familyScreenTimeDeviceClient.ts`
- Create: `src/features/household/screenTime/device/familyScreenTimeDeviceClient.test.ts`
- Modify: `src/features/household/screenTime/data/familyScreenTime.ts`
- Modify: `src/features/household/screenTime/data/familyScreenTime.test.ts`

- [ ] **Step 1: Install Expo-compatible secure storage**

Run: `npx expo install expo-secure-store`

Expected: `package.json` and `package-lock.json` add the SDK 55-compatible package.

- [ ] **Step 2: Write failing parser and credential tests**

The contract must use exact unions from the architecture, reject unknown outcome/failure values, require matching child/device/version/digest, and canonicalize JSON recursively by sorted object keys before SHA-256 hashing. Credential tests must prove that a stored credential is returned only when both the current install id and authenticated user id match its binding.

- [ ] **Step 3: Define the closed device contract**

Export these top-level types and parsers:

```ts
export type DeviceCredentialBinding = {
  deviceId: string;
  installId: string;
  boundUserId: string;
  credential: string;
};

export type ApplicationOutcome =
  | 'received' | 'deferred' | 'applied' | 'failed' | 'superseded' | 'cleanup_applied';

export function parsePolicyEnvelope(value: unknown): FamilyScreenTimeDevicePolicyEnvelope;
export function parseApplicationReceipt(value: unknown): FamilyScreenTimeApplicationReceipt;
export function parseEnforcementSnapshot(value: unknown): FamilyScreenTimeEnforcementSnapshot;
export function canonicalPolicyDigestInput(policy: Omit<FamilyScreenTimeDevicePolicyEnvelope, 'digest'>): string;
```

Use an explicit key allow-list in every parser so token-shaped or extra sensitive fields are rejected rather than silently discarded.

- [ ] **Step 4: Store one credential binding in Keychain**

Use `SecureStore.setItemAsync('kwilt-family-screen-time-device-v1', JSON.stringify(binding), { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY })`. On install-id or user-id mismatch, delete the value and return `null`. Delete it after acknowledged release and on account removal; never log the value.

- [ ] **Step 5: Implement typed caregiver and device calls**

Caregiver calls use existing `client.rpc`. Device calls use `client.functions.invoke('family-screen-time-device', { body, headers: { 'x-kwilt-screen-time-device-credential': credential } })`, parse every response, and never retry `claim-enrollment` after an ambiguous response without first querying the session state.

- [ ] **Step 6: Update existing family snapshot types**

Replace `expired | released` application outcomes with the canonical outcome union. Expand device projection to include `enrollmentState`, `latestReceivedVersion`, `latestAppliedVersion`, `latestSnapshotAt`, and release timestamps. Keep UI projection backward-safe for a database response with no enrolled device.

- [ ] **Step 7: Run focused tests**

Run: `npx jest src/features/household/screenTime/device/familyScreenTimeDeviceContract.test.ts src/features/household/screenTime/device/familyScreenTimeDeviceCredential.test.ts src/features/household/screenTime/device/familyScreenTimeDeviceClient.test.ts src/features/household/screenTime/data/familyScreenTime.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/features/household/screenTime/device src/features/household/screenTime/data/familyScreenTime.ts src/features/household/screenTime/data/familyScreenTime.test.ts
git commit -m "feat(screen-time): add enrolled device client contracts"
```

## Task 5: Add the child enrollment deep link and setup state machine

**Files:**
- Create: `src/features/household/screenTime/familyScreenTimeDeviceSetupFlow.ts`
- Create: `src/features/household/screenTime/familyScreenTimeDeviceSetupFlow.test.ts`
- Create: `src/features/household/screenTime/FamilyScreenTimeDeviceSetupScreen.tsx`
- Create: `src/features/household/screenTime/FamilyScreenTimeDeviceSetupScreen.test.tsx`
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/navigation/linkingConfig.ts`
- Modify: `src/navigation/linkingConfig.test.ts`
- Modify: `src/navigation/navigationPersistence.ts`
- Modify: `src/navigation/navigationPersistence.test.ts`
- Modify: `src/features/household/HouseholdSettingsScreen.tsx`
- Modify: `src/features/household/HouseholdSettingsScreen.test.tsx`

- [ ] **Step 1: Write failing route and state-projection tests**

Require `kwilt://screen-time/enroll?token=opaque-secret` to produce root route `FamilyScreenTimeDeviceSetup` with the token intact. Also cover opening the same route without a token and entering a normalized 12-character manual code. Cover signed out, wrong Kwilt user, missing child auth binding, confirmation, claiming, authorization, picker, checking, ready, expired, claimed, denied, offline, rate-limited manual code, and unsupported-build projections.

- [ ] **Step 2: Run the focused tests and confirm red**

Run: `npx jest src/navigation/linkingConfig.test.ts src/navigation/navigationPersistence.test.ts src/features/household/screenTime/familyScreenTimeDeviceSetupFlow.test.ts --runInBand`

Expected: FAIL because the route and projector do not exist.

- [ ] **Step 3: Add a production root route**

Add:

```ts
FamilyScreenTimeDeviceSetup: { token?: string } | undefined;
```

to `RootDrawerParamList`, register `FamilyScreenTimeDeviceSetupScreen`, and add:

```ts
FamilyScreenTimeDeviceSetup: {
  path: 'screen-time/enroll',
  parse: { token: (value: string) => String(value) },
},
```

Do not put the enrollment route under Settings: the app must receive it before a child has navigated into Household. Add **Enter Screen Time setup code** to the signed-in child's Household screen and navigate to this root route without a token. Do not persist the link secret or manual code in navigation-restoration storage or analytics.

- [ ] **Step 4: Implement the pure setup projector**

```ts
export type DeviceSetupStep =
  | 'sign_in' | 'wrong_user' | 'needs_auth_binding' | 'confirm_device'
  | 'claiming' | 'apple_authorization' | 'selection' | 'checking' | 'ready'
  | 'expired' | 'already_claimed' | 'offline' | 'needs_attention';

export function projectDeviceSetupStep(input: DeviceSetupFacts): DeviceSetupStep;
```

Priority order is terminal ready, terminal session errors, identity mismatch, missing auth binding, unclaimed confirmation, Apple authorization, selection, bootstrap checking, recoverable failure. Never project ready from `received`.

- [ ] **Step 5: Compose the child-device screen with accepted copy**

Use `SettingsPage`/capability-onboarding primitives and the exact copy contract. The screen signs in before claim, accepts a manually entered code when no link secret is present, shows the intended child name only after authenticated validation, requires explicit physical-device confirmation, calls `.child`, presents the picker only after approval, and remains on **Checking this iPhone** until the server snapshot is Ready. UI composition may be implementation-first; keep claim/retry branching in the tested projector and commands.

- [ ] **Step 6: Run route and screen tests**

Run: `npx jest src/navigation/linkingConfig.test.ts src/navigation/navigationPersistence.test.ts src/features/household/screenTime/familyScreenTimeDeviceSetupFlow.test.ts src/features/household/screenTime/FamilyScreenTimeDeviceSetupScreen.test.tsx --runInBand`

Expected: PASS; no assertion or snapshot contains the enrollment token.

- [ ] **Step 7: Commit**

```bash
git add src/navigation/RootNavigator.tsx src/navigation/linkingConfig.ts src/navigation/linkingConfig.test.ts src/navigation/navigationPersistence.ts src/navigation/navigationPersistence.test.ts src/features/household/HouseholdSettingsScreen.tsx src/features/household/HouseholdSettingsScreen.test.tsx src/features/household/screenTime/familyScreenTimeDeviceSetupFlow.ts src/features/household/screenTime/familyScreenTimeDeviceSetupFlow.test.ts src/features/household/screenTime/FamilyScreenTimeDeviceSetupScreen.tsx src/features/household/screenTime/FamilyScreenTimeDeviceSetupScreen.test.tsx
git commit -m "feat(screen-time): add child device enrollment route"
```

## Task 6: Extend the native bridge with child-scoped policy storage and receipts

**Files:**
- Modify: `plugins/withAppleEcosystemIntegrations.js`
- Modify: `scripts/apple-widget-generator-contract.test.mjs`
- Modify: `src/services/appleEcosystem/screenTimeProtection.ts`
- Modify: `src/services/appleEcosystem/screenTimeProtection.test.ts`
- Create: `src/features/household/screenTime/device/familyScreenTimeNativeDevice.ts`
- Create: `src/features/household/screenTime/device/familyScreenTimeNativeDevice.test.ts`
- Inspect generated: `ios/Kwilt/KwiltScreenTimeProtection.swift`
- Inspect generated: `ios/Kwilt/KwiltScreenTimeProtection.m`

- [ ] **Step 1: Write failing native generator and wrapper tests**

Require namespaced App Group keys, a serial queue, persist-before-apply, selection existence checks, monotonic version checks, policy digest echo, receipt outbox append-before-return, full snapshot, and cleanup. Require these bridge methods:

```ts
requestAuthorization(member: 'individual' | 'child')
presentActivityPicker(json: string)
applyFamilyPolicy(json: string)
readFamilyEnforcementSnapshot(json: string)
drainFamilyReceiptOutbox(json: string)
cleanupFamilyDevice(json: string)
```

- [ ] **Step 2: Run focused tests and confirm red**

Run: `npx jest src/services/appleEcosystem/screenTimeProtection.test.ts src/features/household/screenTime/device/familyScreenTimeNativeDevice.test.ts --runInBand && node --test scripts/apple-widget-generator-contract.test.mjs`

Expected: FAIL on missing family-device native methods.

- [ ] **Step 3: Generate native persistence and apply behavior**

Use App Group file names scoped by `deviceId`; store the last complete envelope and receipt outbox as protected files. Use `ManagedSettingsStore.Name("kwilt.family.<selectionRef>")` and Device Activity names derived from stable rule ids. Before changing stores:

1. Decode and validate child/device/schema/version/digest fields supplied by the already validated TypeScript contract.
2. Reject versions below the locally applied version.
3. Reject any named `selectionRef` without a locally stored `FamilyActivitySelection`.
4. Persist the envelope durably.
5. Append `received`.
6. Reconcile the complete named monitor/store set.
7. Append `applied`, `deferred`, `failed`, or `superseded`.
8. Return the locally observed outcome and a full snapshot.

Never use a missing selection as an empty `FamilyActivitySelection`; never call the personal global clear path from a family policy.

- [ ] **Step 4: Generate receipt outbox and cleanup behavior**

Outbox entries contain UUID receipt id, operation id, device/child/policy ids, version, digest, closed outcome, closed failure code, and device timestamp. Drain returns a copy and deletes only ids acknowledged by JavaScript after server success. Release stops all `kwilt.family.*` monitors, clears all `kwilt.family.*` stores, deletes family policies and selections, appends `cleanup_applied`, and preserves that receipt until server acknowledgement.

- [ ] **Step 5: Add the TypeScript native adapter**

The adapter parses every native return through Task 4 contracts and maps unavailable native methods to `extension_unavailable`; it does not coerce exceptions to applied. Expose `authorizeChild`, `saveLocalSelection`, `applyPolicy`, `readSnapshot`, `readOutbox`, `acknowledgeOutbox`, and `cleanupForRelease`.

- [ ] **Step 6: Regenerate and run focused checks**

```bash
KWILT_ENABLE_WIDGETS=1 npx expo prebuild --platform ios --no-install
npx jest src/services/appleEcosystem/screenTimeProtection.test.ts src/features/household/screenTime/device/familyScreenTimeNativeDevice.test.ts --runInBand
node --test scripts/apple-widget-generator-contract.test.mjs
```

Expected: PASS; generated bridge matches plugin source.

- [ ] **Step 7: Commit tracked source only**

```bash
git add plugins/withAppleEcosystemIntegrations.js scripts/apple-widget-generator-contract.test.mjs src/services/appleEcosystem/screenTimeProtection.ts src/services/appleEcosystem/screenTimeProtection.test.ts src/features/household/screenTime/device/familyScreenTimeNativeDevice.ts src/features/household/screenTime/device/familyScreenTimeNativeDevice.test.ts
git commit -m "feat(screen-time): add native family policy receipts"
```

## Task 7: Build the durable reconciliation loop

**Files:**
- Create: `src/features/household/screenTime/device/familyScreenTimeDeviceReconciler.ts`
- Create: `src/features/household/screenTime/device/familyScreenTimeDeviceReconciler.test.ts`
- Create: `src/features/household/screenTime/device/familyScreenTimeReconcileQueue.ts`
- Create: `src/features/household/screenTime/device/familyScreenTimeReconcileQueue.test.ts`

- [ ] **Step 1: Write failing reconciliation and queue tests**

Cover serialized concurrent triggers, upload-before-fetch ordering, duplicate receipt retry, offline retry, persisted envelope before native apply, same-version idempotency, stale-version rejection, skipped-version acceptance only for a complete envelope, unsupported schema, digest mismatch, selection missing, applied receipt followed by coherent snapshot, push loss, and release priority.

- [ ] **Step 2: Run tests and confirm red**

Run: `npx jest src/features/household/screenTime/device/familyScreenTimeDeviceReconciler.test.ts src/features/household/screenTime/device/familyScreenTimeReconcileQueue.test.ts --runInBand`

Expected: FAIL because queue and reconciler do not exist.

- [ ] **Step 3: Implement one serialized reconciler**

```ts
export type ReconcileReason =
  | 'enrollment' | 'authorization' | 'foreground' | 'push_hint' | 'app_upgrade'
  | 'local_event' | 'outbox_retry' | 'diagnostics' | 'release';

export async function reconcileFamilyScreenTimeDevice(
  deps: FamilyScreenTimeReconcileDependencies,
  reason: ReconcileReason,
): Promise<FamilyScreenTimeReconcileResult>;
```

The exact order is credential validation, read native outbox, upload receipts, upload required snapshot, fetch complete policy, parse and verify digest/version/schema, persist/apply natively, upload new receipts, upload changed snapshot. Preserve the last valid bounded policy offline. Never clear family stores because fetch fails.

- [ ] **Step 4: Implement durable coalescing**

Persist only non-sensitive trigger metadata in AsyncStorage key `kwilt-family-screen-time-reconcile-v1`. One in-flight run absorbs later reasons and reruns once with priority `release > enrollment > authorization > local_event > diagnostics > app_upgrade > foreground > push_hint > outbox_retry`. The device credential remains only in Keychain.

- [ ] **Step 5: Run focused tests**

Run: `npx jest src/features/household/screenTime/device/familyScreenTimeDeviceReconciler.test.ts src/features/household/screenTime/device/familyScreenTimeReconcileQueue.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/household/screenTime/device/familyScreenTimeDeviceReconciler.ts src/features/household/screenTime/device/familyScreenTimeDeviceReconciler.test.ts src/features/household/screenTime/device/familyScreenTimeReconcileQueue.ts src/features/household/screenTime/device/familyScreenTimeReconcileQueue.test.ts
git commit -m "feat(screen-time): reconcile child device policy"
```

## Task 8: Replace the caregiver simulation with real enrollment and delivery truth

**Files:**
- Modify: `src/features/household/screenTime/FamilyScreenTimeLearningScreen.tsx`
- Modify: `src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx`
- Modify: `src/features/household/screenTime/familyScreenTimeSetupFlow.ts`
- Modify: `src/features/household/screenTime/familyScreenTimeSetupFlow.test.ts`
- Modify: `src/features/household/screenTime/familyScreenTimePresentation.ts`
- Modify: `src/features/household/screenTime/familyScreenTimePresentation.test.ts`
- Modify: `src/features/household/screenTime/familyScreenTimeCommands.ts`
- Modify: `src/features/household/screenTime/familyScreenTimeCommands.test.ts`
- Keep development-only: `src/features/household/screenTime/simulatedFamilyScreenTimeDevice.ts`
- Keep development-only: `src/features/household/screenTime/FamilyScreenTimeDevControls.tsx`

- [ ] **Step 1: Write failing caregiver projection and command tests**

Cover no device, session issued with expiry, claimed, waiting for Apple approval, waiting for selection, reconciling, ready, saved/newer desired version, exact applied+snapshot match, named failure, release pending, and released. Prove that `received`, push delivery, or caregiver save never returns Ready/Applied.

- [ ] **Step 2: Run focused tests and confirm red**

Run: `npx jest src/features/household/screenTime/familyScreenTimeSetupFlow.test.ts src/features/household/screenTime/familyScreenTimePresentation.test.ts src/features/household/screenTime/familyScreenTimeCommands.test.ts src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx --runInBand`

Expected: FAIL because production still depends on `deviceMode === 'simulated'` and the setup CTA is inert.

- [ ] **Step 3: Add real caregiver commands**

Implement `startDeviceEnrollment`, `cancelDeviceEnrollment`, `refreshDeviceState`, `saveStarterAgreement`, `requestDiagnostics`, and `requestDeviceRelease`. Generate an idempotent operation id for every mutation, pass expected activation/policy version, and retain the original result on retries.

- [ ] **Step 4: Project truthful caregiver states**

```ts
export type CaregiverDeviceDeliveryState =
  | 'needs_device_setup' | 'waiting_for_child_open' | 'waiting_for_apple'
  | 'waiting_for_selection' | 'checking_device' | 'ready'
  | 'saved' | 'applying' | 'applied' | 'needs_attention'
  | 'release_pending' | 'released';
```

`applied` requires desired version equal to latest applied version plus latest coherent snapshot with the same digest. `ready` requires bootstrap `applied` and coherent snapshot. Map closed failure codes to the copy contract's exact action.

- [ ] **Step 5: Replace the inert setup card**

Render **Finish setup on Charlie's iPhone**, prerequisites, **Start device setup**, QR, short code, share link, expiry, cancel/new-code actions, realtime-or-foreground progress, and the exact current recovery action. Keep the simulated device entry reachable only from `DevTools` under `__DEV__`; production must not import or call `simulateFamilyScreenTimePolicyDelivery`.

- [ ] **Step 6: Keep agreement saving separate from application**

Saving calls the authoritative RPC and shows **Saved** or **Applying to Charlie's iPhone**. It becomes **Applied on Charlie's iPhone** only after snapshot refresh proves exact version+digest. A failed device application retains the saved agreement and shows one recovery action.

- [ ] **Step 7: Run focused tests**

Run: `npx jest src/features/household/screenTime/familyScreenTimeSetupFlow.test.ts src/features/household/screenTime/familyScreenTimePresentation.test.ts src/features/household/screenTime/familyScreenTimeCommands.test.ts src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx --runInBand`

Expected: PASS; a source assertion confirms simulated delivery is not imported by the production screen.

- [ ] **Step 8: Commit**

```bash
git add src/features/household/screenTime/FamilyScreenTimeLearningScreen.tsx src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx src/features/household/screenTime/familyScreenTimeSetupFlow.ts src/features/household/screenTime/familyScreenTimeSetupFlow.test.ts src/features/household/screenTime/familyScreenTimePresentation.ts src/features/household/screenTime/familyScreenTimePresentation.test.ts src/features/household/screenTime/familyScreenTimeCommands.ts src/features/household/screenTime/familyScreenTimeCommands.test.ts
git commit -m "feat(screen-time): connect caregiver setup to real device"
```

## Task 9: Start reconciliation from app lifecycle and push hints

**Files:**
- Create: `src/features/household/screenTime/device/familyScreenTimeDeviceRuntime.ts`
- Create: `src/features/household/screenTime/device/familyScreenTimeDeviceRuntime.test.ts`
- Modify: `src/services/pushTokenService.ts`
- Modify: `src/services/pushTokenService.test.ts`
- Modify: `src/services/NotificationService.ts`
- Modify: `src/services/NotificationService.test.ts`
- Modify: `src/services/background/registerKwiltBackgroundTasks.ts`
- Modify: `src/services/background/registerKwiltBackgroundTasks.test.ts`
- Modify: `App.tsx`

- [ ] **Step 1: Write failing trigger tests**

Prove auth binding, initial start, foreground, silent reconcile notification, app upgrade, local native outbox, diagnostics, and release enqueue the correct reason; duplicate starts add one listener; sign-out stops cloud traffic but does not clear enforcement; a malformed push cannot select a child or claim success.

- [ ] **Step 2: Run focused tests and confirm red**

Run: `npx jest src/features/household/screenTime/device/familyScreenTimeDeviceRuntime.test.ts src/services/pushTokenService.test.ts src/services/NotificationService.test.ts src/services/background/registerKwiltBackgroundTasks.test.ts --runInBand`

Expected: FAIL because no family-device runtime exists.

- [ ] **Step 3: Implement idempotent runtime start/stop**

`startFamilyScreenTimeDeviceRuntime()` reads the Keychain binding, subscribes once to auth and AppState, compares app/build to the last capability report, and starts the queue. On sign-out, remove network listeners and retain bounded native policy; on the next matching sign-in, resume upload/fetch. A different user causes credential invalidation and a visible recovery path, not a global restriction clear.

- [ ] **Step 4: Register a device-scoped reconcile token**

After enrollment, associate the existing Expo push token with `deviceId` through the device channel. Push payload is exactly:

```json
{ "type": "family_screen_time_reconcile", "deviceId": "opaque-uuid" }
```

The receiver compares `deviceId` to the Keychain binding and enqueues `push_hint`; it never accepts policy, child name, selection, reason, version, or applied state from the notification.

- [ ] **Step 5: Register background opportunities**

Use the existing background-task registration owner to enqueue `outbox_retry`/`foreground`-equivalent reconciliation when iOS grants time. Do not promise exact timing. Device Activity extensions continue local schedule enforcement independently of app wakes.

- [ ] **Step 6: Start the runtime in `App.tsx`**

Start it beside the existing Screen Time runtimes after auth/store initialization. Keep startup idempotent and do not add another global provider.

- [ ] **Step 7: Run focused tests**

Run: `npx jest src/features/household/screenTime/device/familyScreenTimeDeviceRuntime.test.ts src/services/pushTokenService.test.ts src/services/NotificationService.test.ts src/services/background/registerKwiltBackgroundTasks.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add App.tsx src/features/household/screenTime/device/familyScreenTimeDeviceRuntime.ts src/features/household/screenTime/device/familyScreenTimeDeviceRuntime.test.ts src/services/pushTokenService.ts src/services/pushTokenService.test.ts src/services/NotificationService.ts src/services/NotificationService.test.ts src/services/background/registerKwiltBackgroundTasks.ts src/services/background/registerKwiltBackgroundTasks.test.ts
git commit -m "feat(screen-time): reconcile enrolled device in runtime"
```

## Task 10: Complete recovery, diagnostics, release, and replacement

**Files:**
- Create: `src/features/household/screenTime/device/familyScreenTimeDeviceRecovery.ts`
- Create: `src/features/household/screenTime/device/familyScreenTimeDeviceRecovery.test.ts`
- Modify: `src/features/household/screenTime/device/familyScreenTimeDeviceReconciler.ts`
- Modify: `src/features/household/screenTime/device/familyScreenTimeDeviceReconciler.test.ts`
- Modify: `src/features/household/screenTime/FamilyScreenTimeDeviceSetupScreen.tsx`
- Modify: `src/features/household/screenTime/FamilyScreenTimeDeviceSetupScreen.test.tsx`
- Modify: `src/features/household/screenTime/FamilyScreenTimeLearningScreen.tsx`
- Modify: `src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx`

- [ ] **Step 1: Write failing recovery and release tests**

Cover every closed failure code, unknown-code fallback, offline prior-policy retention, revoked authorization, missing selection, app/schema update, reinstall/new install, release while offline, cleanup failure, duplicate cleanup receipt, credential retirement after coherent release snapshot, and replacement blocked while the old device is still live.

- [ ] **Step 2: Run focused tests and confirm red**

Run: `npx jest src/features/household/screenTime/device/familyScreenTimeDeviceRecovery.test.ts src/features/household/screenTime/device/familyScreenTimeDeviceReconciler.test.ts src/features/household/screenTime/FamilyScreenTimeDeviceSetupScreen.test.tsx src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx --runInBand`

Expected: FAIL on missing recovery action and complete release transaction.

- [ ] **Step 3: Implement the closed recovery projector**

```ts
export type DeviceRecoveryAction =
  | 'sign_in' | 'connect_child_account' | 'new_code' | 'retry_apple_authorization'
  | 'open_app_store' | 'choose_apps' | 'try_now' | 'show_child_step'
  | 'finish_guardian_release' | 'start_replacement';

export function projectDeviceRecovery(
  code: FamilyScreenTimeFailureCode | 'unknown',
): { titleKey: string; bodyKey: string; action: DeviceRecoveryAction };
```

Map to the copy contract. Unknown codes use **Charlie's iPhone needs attention** and `show_child_step`; no failure defaults to Applied, Ready, Released, or global clear.

- [ ] **Step 4: Implement release as a policy transaction**

Caregiver RPC increments desired version and returns a complete release envelope. Child reconciliation applies native cleanup, uploads `cleanup_applied` plus release snapshot, and calls `acknowledge-release`. Only then does the server retire the credential and mark released; only after that does the app delete the Keychain binding. Offline release remains pending with the prior bounded policy locally active.

- [ ] **Step 5: Implement explicit replacement**

Replacement creates a new enrollment only after the caregiver sees the old-device state. If the old device is available, require release first. If classified lost, preserve `cleanup_unconfirmed` diagnostics, retire its cloud credential, prevent false **Released** copy, and require a separate explicit risk acknowledgement before the new device can become live.

- [ ] **Step 6: Run focused tests**

Run the Step 2 command again.

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/household/screenTime/device/familyScreenTimeDeviceRecovery.ts src/features/household/screenTime/device/familyScreenTimeDeviceRecovery.test.ts src/features/household/screenTime/device/familyScreenTimeDeviceReconciler.ts src/features/household/screenTime/device/familyScreenTimeDeviceReconciler.test.ts src/features/household/screenTime/FamilyScreenTimeDeviceSetupScreen.tsx src/features/household/screenTime/FamilyScreenTimeDeviceSetupScreen.test.tsx src/features/household/screenTime/FamilyScreenTimeLearningScreen.tsx src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx
git commit -m "feat(screen-time): add device recovery and release"
```

## Task 11: Lock analytics, privacy, accessibility, and support evidence

**Files:**
- Modify: `src/features/household/screenTime/familyScreenTimeAnalytics.ts`
- Modify: `src/features/household/screenTime/familyScreenTimeAnalytics.test.ts`
- Modify: `src/features/household/screenTime/FamilyScreenTimeDeviceSetupScreen.test.tsx`
- Modify: `src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx`
- Create: `docs/delivery-evidence/family-screen-time/child-device-learning-release.md`
- Modify: `docs/feature-briefs/family-screen-time-controls.md`
- Modify after signed proof: `docs/job-flows/maya-establish-family-screen-time.md`

- [ ] **Step 1: Write failing analytics allow-list tests**

Allow only event name, child membership id, device lifecycle, setup step, coarse outcome, app/build, and duration. Reject/scrub enrollment token, credential, Apple token, selection contents, app label derived from a token, detailed usage, child note, policy body, digest, receipt id, and device error text.

- [ ] **Step 2: Run focused analytics and accessibility tests**

Run: `npx jest src/features/household/screenTime/familyScreenTimeAnalytics.test.ts src/features/household/screenTime/FamilyScreenTimeDeviceSetupScreen.test.tsx src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx --runInBand`

Expected before implementation: FAIL on missing events/allow-list/accessibility states.

- [ ] **Step 3: Implement the allow-list and accessible setup behavior**

Use only the minimum event list from the architecture. Ensure setup progress uses a polite live region, failure focus moves to its title, QR always has short-code and share alternatives, long device/child names wrap, Dynamic Type scrolls, and every button names its action.

- [ ] **Step 4: Create the release evidence runbook**

The evidence file must record:

- source branch, commit, dirty state, Metro checkout/port, app version/build, build profile, EAS build id, and install source;
- caregiver and child device models/iOS/Apple family roles without account secrets;
- signed entitlement inspection for app and every Screen Time extension;
- session claim, `.child` approval, local selection, bootstrap received/applied/snapshot/Ready;
- real short schedule applying and clearing while Kwilt is closed;
- duplicate/out-of-order receipt, missed push, offline, reboot, upgrade, revoked auth, missing selection, and stale schema drills;
- release cleanup and credential retirement; and
- explicit result per gate: source, Simulator, signed device, TestFlight learning household, production rollout.

- [ ] **Step 5: Update product proof only after evidence exists**

After signed-device and TestFlight evidence, update the feature brief proof boundary and only the job-flow steps actually improved. Do not raise Enroll, Apply, Recover, or Release scores from source tests, Simulator, an EAS upload, Apple processing, or caregiver-device UI alone.

- [ ] **Step 6: Run focused tests**

Run the Step 2 command again.

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/household/screenTime/familyScreenTimeAnalytics.ts src/features/household/screenTime/familyScreenTimeAnalytics.test.ts src/features/household/screenTime/FamilyScreenTimeDeviceSetupScreen.test.tsx src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx docs/delivery-evidence/family-screen-time/child-device-learning-release.md docs/feature-briefs/family-screen-time-controls.md docs/job-flows/maya-establish-family-screen-time.md
git commit -m "docs(screen-time): add child device release evidence"
```

## Task 12: Run completion and physical release gates

**Files:**
- Verify all files changed by Tasks 0–11
- Update with actual results: `docs/delivery-evidence/family-screen-time/child-device-learning-release.md`

- [ ] **Step 1: Run task-completion verification once**

Run: `npm run verify:changed -- --run`

Expected: all diff-derived typecheck, test typecheck, Jest, product lint, architecture lint, and Supabase function checks pass. Run it again only if it fails, the diff changes afterward, or the integration base changes; record why.

- [ ] **Step 2: Inspect generated iOS and build a signed physical-device binary**

Run the normal clean prebuild/build path from this exact checkout. Record checkout, branch, commit, dirty state, Metro port, build/install source, and generated extension list. A Simulator build is not Apple authorization or enforcement proof.

- [ ] **Step 3: Execute the signed-device matrix**

Prove claim, guardian `.child` approval, selection privacy, bootstrap receipt+snapshot Ready, one saved agreement reaching Applied, closed-app apply/clear, child explanation, duplicate and out-of-order receipt handling, missed push, offline/foreground, reboot, app upgrade, revoked authorization, missing selection, schema incompatibility, release cleanup, and credential retirement.

- [ ] **Step 4: Execute the TestFlight learning-household matrix**

Install the same intended TestFlight build on both devices. Repeat setup and release once with Andrew and Blaire, and capture whether each person can distinguish Saved, Applying, Applied, Needs attention, Release pending, and Released without protocol language.

- [ ] **Step 5: Apply the rollout boundary**

Keep the capability restricted to the learning household until the signed and TestFlight evidence file has no unresolved safety or truth failures. Apple entitlement approval, upload, processing, tester availability, device install, and successful family workflow are distinct evidence rows.

- [ ] **Step 6: Commit final evidence**

```bash
git add docs/delivery-evidence/family-screen-time/child-device-learning-release.md docs/feature-briefs/family-screen-time-controls.md docs/job-flows/maya-establish-family-screen-time.md
git commit -m "test(screen-time): record child device learning release"
```

## Self-review against the accepted contract

- Identity, exact child binding, caregiver authority, commercial entitlement, physical install, and Apple authorization remain separate.
- Enrollment secrets expire, are single-use, are hashed at rest, and do not grant membership.
- Device credentials are random, hashed server-side, Keychain-held, user/install scoped, and retired only after cleanup proof.
- Apple tokens stay in the native App Group; the signed-device picker gate prevents inventing an unsupported transport.
- Policies are complete, canonical-digest checked, monotonic, persist-before-apply, and safe offline.
- Receipts distinguish received/deferred/applied/failed/superseded/cleanup; snapshots prove observed enforcement separately.
- Ready and Applied require exact version+digest plus coherent snapshot.
- Reconciliation covers enrollment, auth, foreground, push hints, app upgrade, local events, outbox retry, diagnostics, and release.
- Recovery has a closed code/action map; unknown failure never becomes success or a global clear.
- Release is a versioned cleanup transaction; replacement cannot silently abandon a live device.
- Source, Simulator, signed device, TestFlight, and rollout evidence remain separate.
- Caregiver and child instructions use the accepted copy and never expose protocol internals.
