import type { SupabaseClient } from '@supabase/supabase-js';

export type HouseholdRole = 'owner' | 'caregiver' | 'child';
export type HouseholdPersonKind = 'adult' | 'dependent';
export type HouseholdInvitationRole = 'caregiver' | 'child';
export type HouseholdInvitation = {
  code: string;
  expiresAt: string;
  role: HouseholdInvitationRole;
};
export type HouseholdInvitationPreview = {
  householdName: string;
  inviterDisplayName: string;
  role: HouseholdInvitationRole;
  expiresAt: string;
};
export type ChildCapabilityId = 'todos' | 'screen-time' | 'meal-planning';
export type ChildCapabilityState =
  | 'inactive'
  | 'pending_setup'
  | 'active'
  | 'pending_cleanup'
  | 'blocked';

export type HouseholdMember = {
  id: string;
  personId: string;
  displayName: string;
  kind: HouseholdPersonKind;
  role: HouseholdRole;
  /** Additive presentation fields; fresh snapshots normalize both values. */
  avatarUrl?: string | null;
  avatarSource?: 'account' | 'dependent' | 'initials';
};

export type ChildCapabilityActivation = {
  childMembershipId: string;
  capabilityId: ChildCapabilityId;
  state: ChildCapabilityState;
};

export type HouseholdCapabilityGrant = {
  caregiverMembershipId: string;
  childMembershipId: string;
  capabilityId: ChildCapabilityId;
};

export type HouseholdSnapshot = {
  household: { id: string; name: string } | null;
  currentMembershipId: string | null;
  members: HouseholdMember[];
  activations: ChildCapabilityActivation[];
  grants: HouseholdCapabilityGrant[];
};

type RpcResult = { data: unknown; error: { message?: string } | null };

async function callRpc(
  client: SupabaseClient,
  name: string,
  parameters?: Record<string, unknown>,
): Promise<unknown> {
  const result = await (client.rpc as unknown as (
    functionName: string,
    args?: Record<string, unknown>,
  ) => Promise<RpcResult>)(name, ...(parameters === undefined ? [] : [parameters]));
  if (result.error) throw new Error(result.error.message || `Unable to run ${name}`);
  return result.data;
}

const isString = (value: unknown): value is string => typeof value === 'string';
const isInvitationRole = (value: unknown): value is HouseholdInvitationRole => (
  value === 'caregiver' || value === 'child'
);

export function buildHouseholdInviteUrl(code: string): string {
  return `https://go.kwilt.app/open/household/${encodeURIComponent(code.trim().toUpperCase())}`;
}

export function buildHouseholdPlanInviteMessage(input: {
  inviterName: string;
  householdName: string;
  code: string;
}): string {
  const inviterName = input.inviterName.trim() || 'Someone';
  const householdName = input.householdName.trim() || 'their Household';
  const code = input.code.trim().toUpperCase();
  return `${inviterName} invited you to join ${householdName} in Kwilt and weigh in on the family Plan.\n\n`
    + 'You’ll review what joining shares before you accept.\n\n'
    + buildHouseholdInviteUrl(code);
}

function parseSnapshot(value: unknown): HouseholdSnapshot {
  if (!value || typeof value !== 'object') throw new Error('Invalid Household snapshot');
  const candidate = value as Partial<HouseholdSnapshot>;
  const householdValid = candidate.household === null || (
    candidate.household != null
    && isString(candidate.household.id)
    && isString(candidate.household.name)
  );
  const membersValid = Array.isArray(candidate.members) && candidate.members.every((member) => (
    member != null
    && isString(member.id)
    && isString(member.personId)
    && isString(member.displayName)
    && ['adult', 'dependent'].includes(member.kind)
    && ['owner', 'caregiver', 'child'].includes(member.role)
  ));
  const activationsValid = Array.isArray(candidate.activations) && candidate.activations.every((activation) => (
    activation != null
    && isString(activation.childMembershipId)
    && ['todos', 'screen-time', 'meal-planning'].includes(activation.capabilityId)
    && ['inactive', 'pending_setup', 'active', 'pending_cleanup', 'blocked'].includes(activation.state)
  ));
  const grantsValid = Array.isArray(candidate.grants) && candidate.grants.every((grant) => (
    grant != null
    && isString(grant.caregiverMembershipId)
    && isString(grant.childMembershipId)
    && ['todos', 'screen-time'].includes(grant.capabilityId)
  ));
  if (!householdValid || !membersValid || !activationsValid || !grantsValid
    || !(candidate.currentMembershipId === null || isString(candidate.currentMembershipId))) {
    throw new Error('Invalid Household snapshot');
  }
  return {
    ...candidate,
    members: (candidate.members as HouseholdMember[]).map((member) => ({
      ...member,
      avatarUrl: null,
      avatarSource: 'initials' as const,
    })),
  } as HouseholdSnapshot;
}

async function snapshotRpc(
  client: SupabaseClient,
  name: string,
  parameters?: Record<string, unknown>,
): Promise<HouseholdSnapshot> {
  return parseSnapshot(await callRpc(client, name, parameters));
}

export function getHouseholdSnapshot(client: SupabaseClient): Promise<HouseholdSnapshot> {
  return snapshotRpc(client, 'get_kwilt_household_snapshot');
}

export function addDependentChild(client: SupabaseClient, input: {
  householdId: string | null;
  displayName: string;
  ownerDisplayName: string;
}): Promise<HouseholdSnapshot> {
  return snapshotRpc(client, 'add_kwilt_dependent', {
    p_household_id: input.householdId,
    p_display_name: input.displayName.trim(),
    p_owner_display_name: input.ownerDisplayName.trim(),
  });
}

export function setChildCapabilityActivation(client: SupabaseClient, input: {
  childMembershipId: string;
  capabilityId: ChildCapabilityId;
  enabled: boolean;
}): Promise<HouseholdSnapshot> {
  return snapshotRpc(client, 'set_kwilt_child_capability_activation', {
    p_child_membership_id: input.childMembershipId,
    p_capability_id: input.capabilityId,
    p_enabled: input.enabled,
  });
}

export function setCaregiverCapabilityGrant(client: SupabaseClient, input: {
  caregiverMembershipId: string;
  childMembershipId: string;
  capabilityId: ChildCapabilityId;
  granted: boolean;
}): Promise<HouseholdSnapshot> {
  return snapshotRpc(client, 'set_kwilt_household_capability_grant', {
    p_caregiver_membership_id: input.caregiverMembershipId,
    p_child_membership_id: input.childMembershipId,
    p_capability_id: input.capabilityId,
    p_granted: input.granted,
  });
}

export async function createCaregiverInvite(client: SupabaseClient, input: {
  householdId: string | null;
  invitedEmail?: string;
  ownerDisplayName: string;
}): Promise<{ code: string; expiresAt: string }> {
  const data = await callRpc(client, 'create_kwilt_household_invite', {
    p_household_id: input.householdId,
    p_invited_email: input.invitedEmail?.trim() || null,
    p_owner_display_name: input.ownerDisplayName.trim(),
  });
  if (!data || typeof data !== 'object' || !isString((data as { code?: unknown }).code)
    || !isString((data as { expiresAt?: unknown }).expiresAt)) {
    throw new Error('Invalid Household invitation');
  }
  return data as { code: string; expiresAt: string };
}

export async function createHouseholdMemberInvite(client: SupabaseClient, input: {
  householdId: string | null;
  role: HouseholdInvitationRole;
  invitedEmail?: string;
  ownerDisplayName: string;
}): Promise<HouseholdInvitation> {
  const data = await callRpc(client, 'create_kwilt_household_member_invite', {
    p_household_id: input.householdId,
    p_invited_role: input.role,
    p_invited_email: input.invitedEmail?.trim().toLowerCase() || null,
    p_owner_display_name: input.ownerDisplayName.trim(),
  });
  if (!data || typeof data !== 'object'
    || !isString((data as { code?: unknown }).code)
    || !isString((data as { expiresAt?: unknown }).expiresAt)
    || !isInvitationRole((data as { role?: unknown }).role)) {
    throw new Error('Invalid Household invitation');
  }
  return data as HouseholdInvitation;
}

export async function previewHouseholdInvite(
  client: SupabaseClient,
  code: string,
): Promise<HouseholdInvitationPreview> {
  const data = await callRpc(client, 'preview_kwilt_household_invite', {
    p_code: code.trim().toUpperCase(),
  });
  if (!data || typeof data !== 'object'
    || !isString((data as { householdName?: unknown }).householdName)
    || !isString((data as { inviterDisplayName?: unknown }).inviterDisplayName)
    || !isInvitationRole((data as { role?: unknown }).role)
    || !isString((data as { expiresAt?: unknown }).expiresAt)) {
    throw new Error('Invalid Household invitation preview');
  }
  return data as HouseholdInvitationPreview;
}

export function acceptHouseholdMemberInvite(client: SupabaseClient, input: {
  code: string;
  displayName: string;
}): Promise<HouseholdSnapshot> {
  return snapshotRpc(client, 'accept_kwilt_household_member_invite', {
    p_code: input.code.trim().toUpperCase(),
    p_display_name: input.displayName.trim(),
  });
}

export function acceptCaregiverInvite(client: SupabaseClient, input: {
  code: string;
  displayName: string;
}): Promise<HouseholdSnapshot> {
  return snapshotRpc(client, 'accept_kwilt_household_invite', {
    p_code: input.code.trim().toUpperCase(),
    p_display_name: input.displayName.trim(),
  });
}

export function removeHouseholdMember(
  client: SupabaseClient,
  membershipId: string,
): Promise<HouseholdSnapshot> {
  return snapshotRpc(client, 'remove_kwilt_household_member', {
    p_membership_id: membershipId,
  });
}
