import type {
  AgentToolCall,
  AgentToolDefinition,
  AgentToolExecutionResult,
} from '@kwilt/agent-runtime';
import {
  previewHouseholdInvitation,
  readHousehold,
} from '../../capabilities/relationships/actions/relationshipActions';
import type { HouseholdSnapshot } from '../household/data/household';
import type { CompleteHouseholdActionBoundary } from '../household/data/householdActionBoundary';
import { createHouseholdActionBoundary } from '../household/data/householdActionBoundary';
import { getSupabaseClient } from '../../services/backend/supabaseClient';

export type HouseholdProposalOperationType =
  | 'household.member.add_dependent'
  | 'household.invitation.create'
  | 'household.invitation.accept'
  | 'household.child_capability.update'
  | 'household.caregiver_grant.update'
  | 'household.member.update'
  | 'household.member.remove'
  | 'household.device.update'
  | 'household.device.revoke'
  | 'household.device.reconcile';

export type StagedHouseholdToolProposal = {
  capabilityId: 'household';
  title: string;
  body: string;
  operation: {
    type: HouseholdProposalOperationType;
    targetId: string | null;
    payload: Record<string, unknown>;
  };
};

const failed = (code: string, message: string, retryable = false): AgentToolExecutionResult => ({
  status: 'failed', code, message, retryable,
});

const nonEmpty = (value: unknown, max = 200): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= max ? normalized : null;
};

function actorFor(snapshot: HouseholdSnapshot) {
  return snapshot.members.find((member) => member.id === snapshot.currentMembershipId) ?? null;
}

function boundedDevice(device: Awaited<ReturnType<CompleteHouseholdActionBoundary['listDevices']>>[number]) {
  return {
    id: device.id,
    householdId: device.householdId,
    kind: device.kind,
    childMembershipId: device.childMembershipId,
    assignedCaregiverMembershipId: device.assignedCaregiverMembershipId,
    label: device.label,
    platform: device.platform,
    status: device.status,
    memberIds: device.memberIds,
    updatedAt: device.updatedAt,
  };
}

export function createHouseholdToolProvider({
  boundary,
}: {
  boundary?: CompleteHouseholdActionBoundary;
} = {}) {
  let resolvedBoundary = boundary;
  const getBoundary = () => {
    resolvedBoundary ??= createHouseholdActionBoundary(getSupabaseClient());
    return resolvedBoundary;
  };
  const staged: StagedHouseholdToolProposal[] = [];

  const stage = (proposal: StagedHouseholdToolProposal): AgentToolExecutionResult => {
    staged.push(proposal);
    return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
  };

  const authorizedContext = async (householdId: unknown) => {
    const requestedHouseholdId = nonEmpty(householdId);
    const snapshot = await getBoundary().read();
    const actor = actorFor(snapshot);
    if (!requestedHouseholdId || snapshot.household?.id !== requestedHouseholdId || !actor) return null;
    return { householdId: requestedHouseholdId, snapshot, actor };
  };

  const execute = async (
    call: AgentToolCall,
    tool: AgentToolDefinition,
  ): Promise<AgentToolExecutionResult | null> => {
    if (!call.toolId.startsWith('household.')) return null;
    if (call.toolId !== tool.id) return failed('tool_mismatch', 'The discovered Household tool does not match this call.');

    try {
      if (call.toolId === 'household.read') {
        const receipt = await readHousehold(getBoundary());
        return { status: 'completed', output: { household: receipt.result }, receipt: null };
      }
      if (call.toolId === 'household.invitation.preview') {
        const code = nonEmpty(call.arguments.code)?.toUpperCase();
        if (!code) return failed('invalid_household_invitation_code', 'A valid Household invitation code is required.');
        const receipt = await previewHouseholdInvitation(code, getBoundary());
        return { status: 'completed', output: { invitation: receipt.result }, receipt: null };
      }
      if (call.toolId === 'household.invitation.accept') {
        const code = nonEmpty(call.arguments.code)?.toUpperCase();
        const displayName = nonEmpty(call.arguments.displayName, 80);
        if (!code || !displayName) return failed('invalid_household_invitation_acceptance', 'A valid invitation code and display name are required.');
        const preview = await getBoundary().previewInvitation(code);
        return stage({
          capabilityId: 'household', title: `Join ${preview.householdName}`,
          body: `Join as ${preview.role} after reviewing the inviter and Household.`,
          operation: { type: 'household.invitation.accept', targetId: null, payload: { code, displayName, preview } },
        });
      }

      if (call.toolId === 'household.member.add_dependent' || call.toolId === 'household.invitation.create') {
        const snapshot = await getBoundary().read();
        const actor = actorFor(snapshot);
        const requestedHouseholdId = nonEmpty(call.arguments.householdId);
        const createsFirstHousehold = snapshot.household === null && snapshot.currentMembershipId === null
          && snapshot.members.length === 0 && call.arguments.householdId === null;
        if (!createsFirstHousehold
          && (!actor || actor.role !== 'owner' || !requestedHouseholdId || snapshot.household?.id !== requestedHouseholdId)) {
          return failed('household_not_authorized', 'Only the Household owner can perform that action.');
        }
        const householdId = createsFirstHousehold ? null : requestedHouseholdId;
        const ownerDisplayName = nonEmpty(call.arguments.ownerDisplayName, 80);
        if (call.toolId === 'household.member.add_dependent') {
          const displayName = nonEmpty(call.arguments.displayName, 80);
          if (!displayName || !ownerDisplayName) {
            return failed('invalid_household_dependent', 'A dependent and owner display name are required.');
          }
          return stage({ capabilityId: 'household', title: `Add ${displayName} to the Household`,
            body: 'Creates a dependent child membership after explicit review.',
            operation: { type: 'household.member.add_dependent', targetId: householdId,
              payload: { householdId, displayName, ownerDisplayName } } });
        }
        const role = call.arguments.role === 'caregiver' || call.arguments.role === 'child' ? call.arguments.role : null;
        const invitedEmail = call.arguments.invitedEmail === null ? null : nonEmpty(call.arguments.invitedEmail, 320);
        if (!role || !ownerDisplayName || (call.arguments.invitedEmail !== null && !invitedEmail)) {
          return failed('invalid_household_invitation', 'Choose a valid role, owner name, and optional email.');
        }
        return stage({ capabilityId: 'household', title: `Invite a ${role} to the Household`,
          body: 'Creates a short-lived invitation after explicit review.',
          operation: { type: 'household.invitation.create', targetId: householdId,
            payload: { householdId, role, invitedEmail, ownerDisplayName } } });
      }

      const context = await authorizedContext(call.arguments.householdId);
      if (!context) return failed('household_not_authorized', 'That Household is not available to the current member.');
      const { householdId, snapshot, actor } = context;

      if (call.toolId === 'household.device.list') {
        if (!['owner', 'caregiver'].includes(actor.role)) {
          return failed('household_not_authorized', 'Only a Household owner or caregiver can view participating devices.');
        }
        const devices = await getBoundary().listDevices(householdId);
        return { status: 'completed', output: { devices: devices.map(boundedDevice) }, receipt: null };
      }

      const membershipId = nonEmpty(call.arguments.membershipId);
      if (call.toolId === 'household.member.update' || call.toolId === 'household.member.remove') {
        const target = snapshot.members.find((member) => member.id === membershipId);
        const expectedUpdatedAt = nonEmpty(call.arguments.expectedUpdatedAt);
        if (!target) return failed('household_member_not_found', 'That Household member is no longer available.');
        if (!expectedUpdatedAt || target.updatedAt !== expectedUpdatedAt) {
          return failed('household_target_stale', `${target.displayName} changed. Review the current member before applying this change.`, true);
        }
        const canManage = actor.id === target.id && actor.kind === 'adult'
          || actor.role === 'owner' && target.role !== 'owner'
          || actor.role === 'caregiver' && target.role === 'child';
        if (!canManage) return failed('household_not_authorized', 'The current member cannot manage that Household member.');
        if (call.toolId === 'household.member.update') {
          const rawFields = call.arguments.fields;
          if (!rawFields || typeof rawFields !== 'object' || Array.isArray(rawFields)) {
            return failed('invalid_household_member_patch', 'Choose a supported Household member field.');
          }
          const fieldsInput = rawFields as Record<string, unknown>;
          const displayName = fieldsInput.displayName === undefined ? undefined : nonEmpty(fieldsInput.displayName, 80);
          const role = fieldsInput.role === undefined ? undefined
            : fieldsInput.role === 'caregiver' || fieldsInput.role === 'child' ? fieldsInput.role : null;
          if ((fieldsInput.displayName !== undefined && !displayName) || (fieldsInput.role !== undefined && !role)
            || (displayName === undefined && role === undefined) || (role && actor.role !== 'owner')) {
            return failed('invalid_household_member_patch', 'Choose an authorized display-name or role change.');
          }
          const fields = { ...(displayName ? { displayName } : {}), ...(role ? { role } : {}) };
          return stage({ capabilityId: 'household', title: `Update ${target.displayName}`,
            body: 'Applies only the reviewed fields to this exact current membership version.',
            operation: { type: 'household.member.update', targetId: target.id,
              payload: { householdId, expectedUpdatedAt, fields } } });
        }
        if (actor.role !== 'owner' || target.role === 'owner') {
          return failed('household_not_authorized', 'Only the Household owner can remove this member.');
        }
        const preview = await getBoundary().previewMemberRemoval({ membershipId: target.id, expectedUpdatedAt });
        return stage({ capabilityId: 'household', title: `Remove ${target.displayName} from the Household`,
          body: `${preview.capabilityGrants} capability grant(s), ${preview.deviceAssignments.length} device assignment(s), and ${preview.sharedObjects.reduce((sum, item) => sum + item.count, 0)} shared record(s) are affected. ${preview.recovery}`,
          operation: { type: 'household.member.remove', targetId: target.id,
            payload: { householdId, expectedUpdatedAt, preview } } });
      }

      if (call.toolId === 'household.child_capability.update') {
        const childMembershipId = nonEmpty(call.arguments.childMembershipId);
        const child = snapshot.members.find((member) => member.id === childMembershipId && member.role === 'child');
        const capabilityId = ['todos', 'screen-time', 'meal-planning'].includes(String(call.arguments.capabilityId))
          ? call.arguments.capabilityId as 'todos' | 'screen-time' | 'meal-planning' : null;
        if (!child || !capabilityId || typeof call.arguments.enabled !== 'boolean') {
          return failed('invalid_household_capability_change', 'Choose a valid child, capability, and enabled state.');
        }
        const canManage = actor.role === 'owner' || snapshot.grants.some((grant) =>
          grant.caregiverMembershipId === actor.id && grant.childMembershipId === child.id
            && grant.capabilityId === capabilityId);
        if (!canManage) return failed('household_not_authorized', 'The current caregiver does not have that child capability grant.');
        return stage({ capabilityId: 'household', title: `${call.arguments.enabled ? 'Enable' : 'Disable'} ${capabilityId} for ${child.displayName}`,
          body: 'Changes one exact child capability after explicit review.',
          operation: { type: 'household.child_capability.update', targetId: child.id,
            payload: { childMembershipId: child.id, capabilityId, enabled: call.arguments.enabled } } });
      }

      if (call.toolId === 'household.caregiver_grant.update') {
        const caregiverMembershipId = nonEmpty(call.arguments.caregiverMembershipId);
        const childMembershipId = nonEmpty(call.arguments.childMembershipId);
        const caregiver = snapshot.members.find((member) => member.id === caregiverMembershipId && member.role === 'caregiver');
        const child = snapshot.members.find((member) => member.id === childMembershipId && member.role === 'child');
        const capabilityId = ['todos', 'screen-time'].includes(String(call.arguments.capabilityId))
          ? call.arguments.capabilityId as 'todos' | 'screen-time' : null;
        if (actor.role !== 'owner') return failed('household_not_authorized', 'Only the Household owner can change caregiver grants.');
        if (!caregiver || !child || !capabilityId || typeof call.arguments.granted !== 'boolean') {
          return failed('invalid_household_grant', 'Choose a valid caregiver, child, capability, and grant state.');
        }
        return stage({ capabilityId: 'household', title: `${call.arguments.granted ? 'Grant' : 'Revoke'} ${capabilityId} authority`,
          body: `Changes ${caregiver.displayName}'s authority for ${child.displayName} after explicit review.`,
          operation: { type: 'household.caregiver_grant.update', targetId: caregiver.id,
            payload: { caregiverMembershipId: caregiver.id, childMembershipId: child.id, capabilityId, granted: call.arguments.granted } } });
      }

      if (call.toolId === 'household.device.update' || call.toolId === 'household.device.revoke'
        || call.toolId === 'household.device.reconcile') {
        if (!['owner', 'caregiver'].includes(actor.role)) return failed('household_not_authorized', 'Only an owner or caregiver can manage Household devices.');
        const deviceId = nonEmpty(call.arguments.deviceId);
        const expectedUpdatedAt = nonEmpty(call.arguments.expectedUpdatedAt);
        const devices = await getBoundary().listDevices(householdId);
        const device = devices.find((candidate) => candidate.id === deviceId);
        if (!device) return failed('household_device_not_found', 'That Household device is no longer available.');
        if (!expectedUpdatedAt || device.updatedAt !== expectedUpdatedAt) {
          return failed('household_target_stale', `${device.label} changed. Review its current status before applying this change.`, true);
        }
        const base = { householdId, expectedUpdatedAt };
        if (call.toolId === 'household.device.update') {
          const displayName = call.arguments.displayName === undefined ? undefined : nonEmpty(call.arguments.displayName, 80);
          const memberIds = call.arguments.memberIds === undefined ? undefined
            : Array.isArray(call.arguments.memberIds) && call.arguments.memberIds.length <= 50
              && call.arguments.memberIds.every((id) => typeof id === 'string' && id.trim())
              && new Set(call.arguments.memberIds).size === call.arguments.memberIds.length
              ? call.arguments.memberIds as string[] : null;
          if ((call.arguments.displayName !== undefined && !displayName)
            || (call.arguments.memberIds !== undefined && !memberIds)
            || (displayName === undefined && memberIds === undefined)) {
            return failed('invalid_household_device_patch', 'Choose a valid device name or authorized child assignments.');
          }
          if (memberIds?.some((id) => !snapshot.members.some((member) => member.id === id && member.role === 'child'))) {
            return failed('invalid_household_device_members', 'One or more selected children are not in this Household.');
          }
          const title = displayName ? `Rename ${device.label}` : `Update who can use ${device.label}`;
          return stage({ capabilityId: 'household', title,
            body: displayName ? `Changes the visible device name to ${displayName}.`
              : `Changes this shared device to ${memberIds!.length} authorized child assignment(s).`,
            operation: { type: 'household.device.update', targetId: device.id,
              payload: { ...base, ...(displayName ? { displayName } : {}), ...(memberIds ? { memberIds } : {}) } } });
        }
        if (call.toolId === 'household.device.revoke') {
          return stage({ capabilityId: 'household', title: `Revoke ${device.label}`,
            body: 'Stops current Household participation, preserves its audit record, and may require cleanup on the device.',
            operation: { type: 'household.device.revoke', targetId: device.id, payload: base } });
        }
        return stage({ capabilityId: 'household', title: `Reconcile ${device.label}`,
          body: 'Checks the authoritative assignment and may hand off device-local cleanup.',
          operation: { type: 'household.device.reconcile', targetId: device.id, payload: base } });
      }

      return null;
    } catch {
      return failed('household_provider_failed', 'Kwilt could not safely prepare that Household action.', true);
    }
  };

  return {
    execute,
    proposals: (): readonly StagedHouseholdToolProposal[] => [...staged],
  };
}
