import type { ServerAgentToolCall, ServerAgentToolResult } from './agentRuntime.ts';

type QueryResult = { data: unknown; error: unknown };
type HouseholdClient = {
  rpc?: (name: string, args: Record<string, unknown>) => PromiseLike<QueryResult>;
};

const HOUSEHOLD_ROLES = new Set(['owner', 'caregiver', 'child']);
const PERSON_KINDS = new Set(['adult', 'dependent']);
const CAPABILITY_IDS = new Set(['todos', 'screen-time', 'meal-planning']);
const ACTIVATION_STATES = new Set(['inactive', 'pending_setup', 'active', 'pending_cleanup', 'blocked']);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function string(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeHouseholdSnapshot(value: unknown): Record<string, unknown> | null {
  const input = record(value);
  if (!input || !Array.isArray(input.members) || !Array.isArray(input.activations) || !Array.isArray(input.grants)) return null;
  const household = input.household === null ? null : record(input.household);
  if (household && (!string(household.id) || !string(household.name))) return null;
  const currentMembershipId = input.currentMembershipId === null ? null : string(input.currentMembershipId);
  if (input.currentMembershipId !== null && !currentMembershipId) return null;

  const members = input.members.map(record);
  if (members.some((member) => !member || !string(member.id) || !string(member.personId) ||
      !string(member.displayName) || !PERSON_KINDS.has(String(member.kind)) || !HOUSEHOLD_ROLES.has(String(member.role)))) return null;
  const activations = input.activations.map(record);
  if (activations.some((activation) => !activation || !string(activation.childMembershipId) ||
      !CAPABILITY_IDS.has(String(activation.capabilityId)) || !ACTIVATION_STATES.has(String(activation.state)))) return null;
  const grants = input.grants.map(record);
  if (grants.some((grant) => !grant || !string(grant.caregiverMembershipId) ||
      !string(grant.childMembershipId) || !CAPABILITY_IDS.has(String(grant.capabilityId)))) return null;

  return {
    household: household ? { id: string(household.id), name: string(household.name) } : null,
    currentMembershipId,
    members: members.map((member) => ({
      id: string(member!.id), personId: string(member!.personId), displayName: string(member!.displayName),
      kind: member!.kind, role: member!.role,
    })),
    activations: activations.map((activation) => ({
      childMembershipId: string(activation!.childMembershipId),
      capabilityId: activation!.capabilityId, state: activation!.state,
    })),
    grants: grants.map((grant) => ({
      caregiverMembershipId: string(grant!.caregiverMembershipId),
      childMembershipId: string(grant!.childMembershipId), capabilityId: grant!.capabilityId,
    })),
  };
}

function normalizeInvitationPreview(value: unknown): Record<string, unknown> | null {
  const input = record(value);
  const householdName = string(input?.householdName);
  const inviterDisplayName = string(input?.inviterDisplayName);
  const role = input?.role === 'caregiver' || input?.role === 'child' ? input.role : null;
  const expiresAt = string(input?.expiresAt);
  if (!householdName || !inviterDisplayName || !role || !expiresAt || !Number.isFinite(Date.parse(expiresAt))) return null;
  return { householdName, inviterDisplayName, role, expiresAt };
}

export async function executeServerHouseholdTool({
  client, userId, call,
}: {
  client: HouseholdClient;
  userId: string;
  call: ServerAgentToolCall;
}): Promise<ServerAgentToolResult | null> {
  if (!client.rpc && (call.toolId === 'household.read' || call.toolId === 'household.invitation.preview')) {
    return { status: 'unavailable', reason: 'server_household_provider_unavailable', retryable: false };
  }
  if (call.toolId === 'household.read') {
    const { data, error } = await client.rpc!('get_kwilt_agent_household_snapshot', { p_user_id: userId });
    if (error) {
      return { status: 'failed', code: 'household_read_failed', message: 'Kwilt could not read the current Household.', retryable: true };
    }
    const household = normalizeHouseholdSnapshot(data);
    if (!household) {
      return { status: 'failed', code: 'invalid_household_projection', message: 'Kwilt received an invalid Household projection.', retryable: false };
    }
    return { status: 'completed', output: { household }, receipt: null };
  }

  if (call.toolId === 'household.invitation.preview') {
    const code = string(call.arguments.code)?.toUpperCase() ?? '';
    if (!code || code.length > 200) {
      return {
        status: 'failed', code: 'invalid_household_invitation_code',
        message: 'A valid Household invitation code is required.', retryable: false,
      };
    }
    const { data, error } = await client.rpc!('preview_kwilt_agent_household_invite', {
      p_user_id: userId, p_code: code,
    });
    if (error) {
      return { status: 'failed', code: 'household_invitation_preview_failed', message: 'Kwilt could not preview that Household invitation.', retryable: false };
    }
    const invitation = normalizeInvitationPreview(data);
    if (!invitation) {
      return { status: 'failed', code: 'invalid_household_invitation_preview', message: 'Kwilt received an invalid invitation preview.', retryable: false };
    }
    return { status: 'completed', output: { invitation }, receipt: null };
  }

  return null;
}
