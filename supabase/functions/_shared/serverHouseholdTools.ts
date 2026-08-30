import type {
  ServerAgentProposalRecord,
  ServerAgentProposalRequest,
  ServerAgentToolCall,
  ServerAgentToolResult,
} from './agentRuntime.ts';

type QueryResult = { data: unknown; error: unknown };
type HouseholdClient = {
  rpc?: (name: string, args: Record<string, unknown>) => PromiseLike<QueryResult>;
};
type DeviceActionRequest = {
  capabilityId: string; actionType: string; targetType: string; targetId: string;
  title: string; consequenceSummary: string; payload: Record<string, unknown>; idempotencyKey: string;
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
      !string(member.displayName) || !string(member.updatedAt) || !PERSON_KINDS.has(String(member.kind))
      || !HOUSEHOLD_ROLES.has(String(member.role)))) return null;
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
      kind: member!.kind, role: member!.role, updatedAt: string(member!.updatedAt),
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

function normalizeHouseholdDevices(value: unknown): Record<string, unknown>[] | null {
  if (!Array.isArray(value)) return null;
  const devices = value.map(record);
  if (devices.some((device) => !device || !string(device.id) || !string(device.householdId)
    || !['personal_child', 'shared_household'].includes(String(device.kind))
    || (device.childMembershipId !== null && !string(device.childMembershipId))
    || (device.assignedCaregiverMembershipId !== null && !string(device.assignedCaregiverMembershipId))
    || !string(device.label) || !['ios', 'ipados'].includes(String(device.platform))
    || !['pending', 'ready', 'needs_attention', 'revoked'].includes(String(device.status))
    || !Array.isArray(device.memberIds) || device.memberIds.some((id) => !string(id))
    || !string(device.updatedAt))) return null;
  return devices.map((device) => ({
    id: string(device!.id), householdId: string(device!.householdId), kind: device!.kind,
    childMembershipId: device!.childMembershipId, assignedCaregiverMembershipId: device!.assignedCaregiverMembershipId,
    label: string(device!.label), platform: device!.platform, status: device!.status,
    memberIds: device!.memberIds, updatedAt: string(device!.updatedAt),
  }));
}

function errorCode(error: unknown): string {
  const input = record(error);
  return string(input?.code) ?? string(input?.message) ?? 'household_operation_failed';
}

function operationFailure(error: unknown): ServerAgentToolResult {
  const code = errorCode(error);
  if (code.includes('stale_household_')) {
    return { status: 'needs_input', prompt: 'That Household item changed. Review its current version before trying again.', fields: ['expectedUpdatedAt'] };
  }
  if (code.includes('required') || code.includes('not_found') || code.includes('wrong_household')) {
    return { status: 'refused', reason: 'The current Household member is not authorized for that action.' };
  }
  return { status: 'failed', code: 'household_operation_failed', message: 'Kwilt could not safely apply that Household action.', retryable: true };
}

function completed(call: ServerAgentToolCall, operationId: string, kind: string, id: string,
  result: unknown, reversible: boolean): ServerAgentToolResult {
  return {
    status: 'completed', output: { result },
    receipt: { receiptId: call.id, operationId, status: 'completed',
      resultRefs: [{ kind, id }], reversible, result },
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
  client, userId, call, stageProposal, stageDeviceAction,
}: {
  client: HouseholdClient;
  userId: string;
  call: ServerAgentToolCall;
  stageProposal?: (request: ServerAgentProposalRequest) => Promise<ServerAgentProposalRecord>;
  stageDeviceAction?: (request: DeviceActionRequest) => Promise<void>;
}): Promise<ServerAgentToolResult | null> {
  if (!client.rpc && call.toolId.startsWith('household.')) {
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

  if (call.toolId === 'household.device.list') {
    const householdId = string(call.arguments.householdId);
    if (!householdId) return { status: 'failed', code: 'invalid_household_id', message: 'A valid Household is required.', retryable: false };
    const { data, error } = await client.rpc!('list_kwilt_agent_household_devices', {
      p_user_id: userId, p_household_id: householdId,
    });
    if (error) return operationFailure(error);
    const devices = normalizeHouseholdDevices(data);
    if (!devices) return { status: 'failed', code: 'invalid_household_device_projection', message: 'Kwilt received invalid Household device data.', retryable: false };
    return { status: 'completed', output: { devices }, receipt: null };
  }

  if (call.toolId === 'household.member.add_dependent' || call.toolId === 'household.invitation.create'
    || call.toolId === 'household.child_capability.update' || call.toolId === 'household.caregiver_grant.update') {
    if (!stageProposal) return { status: 'unavailable', reason: 'server_household_proposal_persistence_unavailable', retryable: false };
    const requestedHouseholdId = string(call.arguments.householdId);
    const { data, error } = await client.rpc!('get_kwilt_agent_household_snapshot', { p_user_id: userId });
    if (error) return operationFailure(error);
    const household = normalizeHouseholdSnapshot(data);
    const members = Array.isArray(household?.members) ? household.members.map(record) : [];
    const grants = Array.isArray(household?.grants) ? household.grants : [];
    const actor = members.find((member) => string(member?.id) === household?.currentMembershipId) ?? null;
    const isHouseholdCreation = call.toolId === 'household.member.add_dependent'
      || call.toolId === 'household.invitation.create';
    const createsFirstHousehold = isHouseholdCreation && household?.household === null
      && household.currentMembershipId === null && members.length === 0 && call.arguments.householdId === null;
    if (!household || (!createsFirstHousehold
      && (!requestedHouseholdId || record(household.household)?.id !== requestedHouseholdId || !actor))) {
      return { status: 'refused', reason: 'That Household is not available to the current member.' };
    }
    const householdId = createsFirstHousehold ? null : requestedHouseholdId;
    const actorRole = createsFirstHousehold ? 'owner' : actor?.role;
    let title: string;
    let body: string;
    let targetType: string;
    let targetId: string | null;
    let payload: Record<string, unknown>;
    if (call.toolId === 'household.member.add_dependent') {
      const displayName = string(call.arguments.displayName);
      const ownerDisplayName = string(call.arguments.ownerDisplayName);
      if (actorRole !== 'owner') return { status: 'refused', reason: 'Only the Household owner can add a dependent.' };
      if (!displayName || displayName.length > 80 || !ownerDisplayName || ownerDisplayName.length > 80) {
        return { status: 'failed', code: 'invalid_household_dependent', message: 'A dependent and owner display name are required.', retryable: false };
      }
      title = `Add ${displayName} to the Household`; body = 'Creates a dependent child membership after explicit review.';
      targetType = 'household'; targetId = householdId; payload = { householdId, displayName, ownerDisplayName };
    } else if (call.toolId === 'household.invitation.create') {
      const role = call.arguments.role === 'caregiver' || call.arguments.role === 'child' ? call.arguments.role : null;
      const ownerDisplayName = string(call.arguments.ownerDisplayName);
      const invitedEmail = call.arguments.invitedEmail === null ? null : string(call.arguments.invitedEmail);
      if (actorRole !== 'owner') return { status: 'refused', reason: 'Only the Household owner can create an invitation.' };
      if (!role || !ownerDisplayName || (call.arguments.invitedEmail !== null && !invitedEmail)) {
        return { status: 'failed', code: 'invalid_household_invitation', message: 'Choose a valid role and optional email.', retryable: false };
      }
      title = `Invite a ${role} to the Household`; body = 'Creates a short-lived invitation after explicit review.';
      targetType = 'household'; targetId = householdId; payload = { householdId, role, invitedEmail, ownerDisplayName };
    } else if (call.toolId === 'household.child_capability.update') {
      const childMembershipId = string(call.arguments.childMembershipId);
      const capabilityId = ['todos', 'screen-time', 'meal-planning'].includes(String(call.arguments.capabilityId))
        ? String(call.arguments.capabilityId) : null;
      const child = members.find((member) => string(member?.id) === childMembershipId && member?.role === 'child');
      const canManage = actorRole === 'owner' || grants.some((value) => {
        const grant = record(value);
        return grant?.caregiverMembershipId === actor?.id && grant?.childMembershipId === childMembershipId
          && grant?.capabilityId === capabilityId;
      });
      if (!canManage) return { status: 'refused', reason: 'The current caregiver does not have that child capability grant.' };
      if (!child || !capabilityId || typeof call.arguments.enabled !== 'boolean') {
        return { status: 'failed', code: 'invalid_household_capability_change', message: 'Choose a valid child capability change.', retryable: false };
      }
      title = `${call.arguments.enabled ? 'Enable' : 'Disable'} ${capabilityId} for ${string(child.displayName)}`;
      body = 'Changes one exact child capability after explicit review.'; targetType = 'household_member'; targetId = childMembershipId;
      payload = { childMembershipId, capabilityId, enabled: call.arguments.enabled };
    } else {
      const caregiverMembershipId = string(call.arguments.caregiverMembershipId);
      const childMembershipId = string(call.arguments.childMembershipId);
      const capabilityId = ['todos', 'screen-time'].includes(String(call.arguments.capabilityId))
        ? String(call.arguments.capabilityId) : null;
      if (actorRole !== 'owner') return { status: 'refused', reason: 'Only the Household owner can change caregiver grants.' };
      if (!caregiverMembershipId || !childMembershipId || !capabilityId || typeof call.arguments.granted !== 'boolean') {
        return { status: 'failed', code: 'invalid_household_grant', message: 'Choose a valid caregiver grant change.', retryable: false };
      }
      title = `${call.arguments.granted ? 'Grant' : 'Revoke'} ${capabilityId} authority`;
      body = 'Changes one caregiver authority grant after explicit review.'; targetType = 'household_member'; targetId = caregiverMembershipId;
      payload = { caregiverMembershipId, childMembershipId, capabilityId, granted: call.arguments.granted };
    }
    const proposal = await stageProposal({ capabilityId: 'household', title, body,
      operation: { type: call.toolId, targetType, targetId, summary: title, payload } });
    return { status: 'proposed', proposal };
  }

  if (call.toolId === 'household.invitation.accept') {
    if (!stageProposal) return { status: 'unavailable', reason: 'server_household_proposal_persistence_unavailable', retryable: false };
    const code = string(call.arguments.code)?.toUpperCase();
    const displayName = string(call.arguments.displayName);
    if (!code || !displayName || displayName.length > 80) {
      return { status: 'failed', code: 'invalid_household_invitation_acceptance', message: 'A valid invitation and display name are required.', retryable: false };
    }
    const { data, error } = await client.rpc!('preview_kwilt_agent_household_invite', { p_user_id: userId, p_code: code });
    if (error) return operationFailure(error);
    const preview = normalizeInvitationPreview(data);
    if (!preview) return { status: 'failed', code: 'invalid_household_invitation_preview', message: 'Kwilt received an invalid invitation preview.', retryable: false };
    const proposal = await stageProposal({ capabilityId: 'household', title: `Join ${String(preview.householdName)}`,
      body: `Join as ${String(preview.role)} after reviewing the inviter and Household.`,
      operation: { type: call.toolId, targetType: 'household_invitation', targetId: null,
        summary: `Join ${String(preview.householdName)}`, payload: { code, displayName, preview } } });
    return { status: 'proposed', proposal };
  }

  if (call.toolId === 'household.member.update') {
    const householdId = string(call.arguments.householdId);
    const membershipId = string(call.arguments.membershipId);
    const expectedUpdatedAt = string(call.arguments.expectedUpdatedAt);
    const fields = record(call.arguments.fields);
    const displayName = fields && 'displayName' in fields ? string(fields.displayName) : null;
    const role = fields?.role === 'caregiver' || fields?.role === 'child' ? fields.role : null;
    if (!householdId || !membershipId || !expectedUpdatedAt || (!displayName && !role)
      || (fields && Object.keys(fields).some((key) => !['displayName', 'role'].includes(key)))) {
      return { status: 'failed', code: 'invalid_household_member_patch', message: 'Choose a valid Household member and supported fields.', retryable: false };
    }
    const { data, error } = await client.rpc!('update_kwilt_agent_household_member', {
      p_user_id: userId, p_household_id: householdId, p_membership_id: membershipId,
      p_expected_updated_at: expectedUpdatedAt, p_display_name: displayName, p_role: role,
    });
    if (error) return operationFailure(error);
    const household = normalizeHouseholdSnapshot(data);
    if (!household) return { status: 'failed', code: 'invalid_household_projection', message: 'Kwilt received invalid Household data.', retryable: false };
    return completed(call, call.toolId, 'household_member', membershipId, household, true);
  }

  if (call.toolId === 'household.member.remove') {
    const householdId = string(call.arguments.householdId);
    const membershipId = string(call.arguments.membershipId);
    const expectedUpdatedAt = string(call.arguments.expectedUpdatedAt);
    if (!householdId || !membershipId || !expectedUpdatedAt) {
      return { status: 'failed', code: 'invalid_household_member', message: 'Choose an exact current Household member.', retryable: false };
    }
    const { data, error } = await client.rpc!('preview_kwilt_agent_household_member_removal', {
      p_user_id: userId, p_household_id: householdId, p_membership_id: membershipId,
      p_expected_updated_at: expectedUpdatedAt,
    });
    if (error) return operationFailure(error);
    const preview = record(data);
    if (!preview || !string(preview.displayName) || !stageProposal) {
      return { status: 'unavailable', reason: 'server_household_proposal_persistence_unavailable', retryable: false };
    }
    const proposal = await stageProposal({ capabilityId: 'household',
      title: `Remove ${string(preview.displayName)} from the Household`,
      body: 'Reviews affected grants, device assignments, shared records, and recovery before removal.',
      operation: { type: call.toolId, targetType: 'household_member', targetId: membershipId,
        summary: `Remove ${string(preview.displayName)}`, payload: { householdId, expectedUpdatedAt, preview } } });
    return { status: 'proposed', proposal };
  }

  if (call.toolId === 'household.device.update' || call.toolId === 'household.device.revoke'
    || call.toolId === 'household.device.reconcile') {
    const householdId = string(call.arguments.householdId);
    const deviceId = string(call.arguments.deviceId);
    const expectedUpdatedAt = string(call.arguments.expectedUpdatedAt);
    if (!householdId || !deviceId || !expectedUpdatedAt) {
      return { status: 'failed', code: 'invalid_household_device', message: 'Choose an exact current Household device.', retryable: false };
    }
    const rpcName = call.toolId === 'household.device.update' ? 'update_kwilt_agent_household_device'
      : call.toolId === 'household.device.revoke' ? 'revoke_kwilt_agent_household_device'
        : 'reconcile_kwilt_agent_household_device';
    const args: Record<string, unknown> = {
      p_user_id: userId, p_household_id: householdId, p_device_id: deviceId,
      p_expected_updated_at: expectedUpdatedAt,
    };
    if (call.toolId === 'household.device.update') {
      const displayName = call.arguments.displayName === undefined ? null : string(call.arguments.displayName);
      const memberIds = call.arguments.memberIds === undefined ? null : Array.isArray(call.arguments.memberIds)
        && call.arguments.memberIds.length <= 50 && call.arguments.memberIds.every((id) => Boolean(string(id)))
        ? call.arguments.memberIds : undefined;
      if ((!displayName && memberIds === null) || memberIds === undefined) {
        return { status: 'failed', code: 'invalid_household_device_patch', message: 'Choose a valid device name or child assignments.', retryable: false };
      }
      args.p_display_name = displayName;
      args.p_member_ids = memberIds;
    }
    const { data, error } = await client.rpc!(rpcName, args);
    if (error) return operationFailure(error);
    const reconciliation = call.toolId === 'household.device.reconcile' ? record(data) : null;
    const normalized = normalizeHouseholdDevices([reconciliation?.device ?? data]);
    if (!normalized?.[0]) return { status: 'failed', code: 'invalid_household_device_projection', message: 'Kwilt received invalid Household device data.', retryable: false };
    const device = normalized[0];
    if (call.toolId === 'household.device.reconcile' && reconciliation?.requiresNativeCleanup === true) {
      const request: DeviceActionRequest = {
        capabilityId: 'household', actionType: 'household.device.cleanup', targetType: 'household_device', targetId: deviceId,
        title: `Finish cleanup for ${String(device.label)}`,
        consequenceSummary: 'Kwilt will finish Household and Screen Time cleanup on this device. The Household change you already reviewed will stay the same.',
        payload: { householdId, deviceId, expectedUpdatedAt: device.updatedAt },
        idempotencyKey: `${call.id}:household-device-cleanup`,
      };
      if (stageDeviceAction) await stageDeviceAction(request);
      return { status: 'pending_client_action', provider: 'device', request };
    }
    return completed(call, call.toolId, 'household_device', deviceId, device,
      call.toolId !== 'household.device.revoke');
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
