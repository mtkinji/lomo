import type { SupabaseClient } from '@supabase/supabase-js';

export type HouseholdRole = 'owner' | 'caregiver' | 'child';
export type HouseholdPersonKind = 'adult' | 'dependent';
export type HouseholdInvitationRole = 'caregiver' | 'child';
export type HouseholdInvitation = {
  code: string;
  expiresAt: string;
  role: HouseholdInvitationRole;
  recovered: boolean;
  emailDelivery: 'sent' | 'failed' | 'not_requested';
};
export type HouseholdInvitationPreview = {
  invitationId?: string;
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
  updatedAt: string;
  /** Additive presentation fields; fresh snapshots normalize both values. */
  avatarUrl?: string | null;
  avatarSource?: 'account' | 'dependent' | 'initials';
};

export type HouseholdMemberRemovalPreview = {
  membershipId: string;
  expectedUpdatedAt: string;
  displayName: string;
  capabilityGrants: number;
  deviceAssignments: { id: string; label: string }[];
  sharedObjects: { kind: string; count: number }[];
  recovery: string;
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

export function normalizeHouseholdInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/[-\s]/g, '');
}

export function formatHouseholdInviteCode(code: string): string {
  const normalized = normalizeHouseholdInviteCode(code);
  return normalized.length === 8 ? `${normalized.slice(0, 4)}-${normalized.slice(4)}` : normalized;
}

export function buildHouseholdInviteUrl(code: string): string {
  return `https://go.kwilt.app/open/household/${encodeURIComponent(normalizeHouseholdInviteCode(code))}`;
}

export function buildHouseholdPlanInviteMessage(input: {
  inviterName: string;
  householdName: string;
  code: string;
}): string {
  const inviterName = input.inviterName.trim() || 'Someone';
  const householdName = input.householdName.trim() || 'their Household';
  const code = normalizeHouseholdInviteCode(input.code);
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
    && isString(member.updatedAt)
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
  const invitedEmail = input.invitedEmail?.trim().toLowerCase() || '';
  let data: unknown;
  if (invitedEmail) {
    const result = await client.functions.invoke('household-invite-send', { body: {
      householdId: input.householdId,
      role: input.role,
      invitedEmail,
      ownerDisplayName: input.ownerDisplayName.trim(),
    } });
    if (result.error) throw new Error(result.error.message || 'Unable to send Household invitation');
    data = result.data;
  } else {
    data = await callRpc(client, 'create_kwilt_household_member_invite', {
      p_household_id: input.householdId,
      p_invited_role: input.role,
      p_invited_email: null,
      p_owner_display_name: input.ownerDisplayName.trim(),
    });
    if (data && typeof data === 'object') {
      data = {
        ...data,
        recovered: typeof (data as { recovered?: unknown }).recovered === 'boolean'
          ? (data as { recovered: boolean }).recovered
          : false,
        emailDelivery: 'not_requested' as const,
      };
    }
  }
  if (!data || typeof data !== 'object'
    || !isString((data as { code?: unknown }).code)
    || !isString((data as { expiresAt?: unknown }).expiresAt)
    || !isInvitationRole((data as { role?: unknown }).role)
    || typeof (data as { recovered?: unknown }).recovered !== 'boolean'
    || !['sent', 'failed', 'not_requested'].includes(String((data as { emailDelivery?: unknown }).emailDelivery))) {
    throw new Error('Invalid Household invitation');
  }
  return data as HouseholdInvitation;
}

function parseInvitationPreview(data: unknown): HouseholdInvitationPreview {
  if (!data || typeof data !== 'object'
    || !isString((data as { householdName?: unknown }).householdName)
    || !isString((data as { inviterDisplayName?: unknown }).inviterDisplayName)
    || !isInvitationRole((data as { role?: unknown }).role)
    || !isString((data as { expiresAt?: unknown }).expiresAt)
    || ((data as { invitationId?: unknown }).invitationId !== undefined
      && !isString((data as { invitationId?: unknown }).invitationId))) {
    throw new Error('Invalid Household invitation preview');
  }
  return data as HouseholdInvitationPreview;
}

export async function previewHouseholdInvite(
  client: SupabaseClient,
  code: string,
): Promise<HouseholdInvitationPreview> {
  const data = await callRpc(client, 'preview_kwilt_household_invite', {
    p_code: normalizeHouseholdInviteCode(code),
  });
  return parseInvitationPreview(data);
}

export async function findPendingHouseholdInviteForMe(
  client: SupabaseClient,
): Promise<HouseholdInvitationPreview | null> {
  const data = await callRpc(client, 'get_kwilt_pending_household_invitation_for_me');
  return data === null ? null : parseInvitationPreview(data);
}

export function acceptPendingHouseholdInviteForMe(client: SupabaseClient, input: {
  invitationId: string;
  displayName: string;
}): Promise<HouseholdSnapshot> {
  return snapshotRpc(client, 'accept_kwilt_pending_household_invitation_for_me', {
    p_invitation_id: input.invitationId,
    p_display_name: input.displayName.trim(),
  });
}

export function acceptHouseholdMemberInvite(client: SupabaseClient, input: {
  code: string;
  displayName: string;
}): Promise<HouseholdSnapshot> {
  return snapshotRpc(client, 'accept_kwilt_household_member_invite', {
    p_code: normalizeHouseholdInviteCode(input.code),
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

export function updateHouseholdMemberRecord(client: SupabaseClient, input: {
  membershipId: string;
  expectedUpdatedAt: string;
  fields: { displayName?: string; role?: Exclude<HouseholdRole, 'owner'> };
}): Promise<HouseholdSnapshot> {
  return snapshotRpc(client, 'update_kwilt_household_member', {
    p_membership_id: input.membershipId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_display_name: input.fields.displayName ?? null,
    p_role: input.fields.role ?? null,
  });
}

export async function previewHouseholdMemberRemovalRecord(client: SupabaseClient, input: {
  membershipId: string;
  expectedUpdatedAt: string;
}): Promise<HouseholdMemberRemovalPreview> {
  const value = await callRpc(client, 'preview_kwilt_household_member_removal', {
    p_membership_id: input.membershipId,
    p_expected_updated_at: input.expectedUpdatedAt,
  });
  if (!value || typeof value !== 'object') throw new Error('Invalid Household member removal preview');
  const row = value as Partial<HouseholdMemberRemovalPreview>;
  if (!isString(row.membershipId) || !isString(row.expectedUpdatedAt) || !isString(row.displayName)
    || !Number.isInteger(row.capabilityGrants) || Number(row.capabilityGrants) < 0
    || !Array.isArray(row.deviceAssignments) || row.deviceAssignments.some((item) => (
      !item || !isString(item.id) || !isString(item.label)
    ))
    || !Array.isArray(row.sharedObjects) || row.sharedObjects.some((item) => (
      !item || !isString(item.kind) || !Number.isInteger(item.count) || item.count < 0
    )) || !isString(row.recovery)) throw new Error('Invalid Household member removal preview');
  return row as HouseholdMemberRemovalPreview;
}

export function removeHouseholdMemberReviewedRecord(client: SupabaseClient, input: {
  membershipId: string;
  expectedUpdatedAt: string;
}): Promise<HouseholdSnapshot> {
  return snapshotRpc(client, 'remove_kwilt_household_member_reviewed', {
    p_membership_id: input.membershipId,
    p_expected_updated_at: input.expectedUpdatedAt,
  });
}
