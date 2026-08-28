import {
  acceptHouseholdInvitation,
  addDependentHouseholdMember,
  createHouseholdInvitation,
  setHouseholdCaregiverGrant,
  setHouseholdChildCapability,
} from '../../capabilities/relationships/actions/relationshipActions';
import type { CompleteHouseholdActionBoundary } from '../household/data/householdActionBoundary';
import {
  previewHouseholdMemberRemoval,
  reconcileHouseholdDevice,
  removeHouseholdMemberReviewed,
  revokeHouseholdDeviceReviewed,
  updateHouseholdDevice,
  updateHouseholdMember,
} from '../household/data/householdManagementActions';
import type {
  DecideUnifiedChatProposalInput,
  FinalizeUnifiedChatMutationReceiptInput,
  PersistUnifiedChatMutationReceiptInput,
  TransitionUnifiedChatProposalInput,
  UnifiedChatMutationReceipt,
  UnifiedChatProposal,
  UnifiedChatProposalDecisionResult,
} from './types';

type HouseholdProposal = Extract<UnifiedChatProposal, { capabilityId: 'household' }>;
type Repository = {
  decideProposal(input: DecideUnifiedChatProposalInput): Promise<UnifiedChatProposalDecisionResult>;
  transitionProposalStatus(input: TransitionUnifiedChatProposalInput): Promise<{ status: UnifiedChatProposal['status']; version: number }>;
  persistMutationReceipt(input: PersistUnifiedChatMutationReceiptInput): Promise<UnifiedChatMutationReceipt>;
  finalizeMutationReceipt(id: string, input: FinalizeUnifiedChatMutationReceiptInput): Promise<UnifiedChatMutationReceipt>;
};

type Completion = { status: 'completed' | 'pending_client_action' };

const requiredString = (value: unknown, name: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`invalid_household_proposal_${name}`);
  return value.trim();
};
const requiredBoolean = (value: unknown, name: string): boolean => {
  if (typeof value !== 'boolean') throw new Error(`invalid_household_proposal_${name}`);
  return value;
};

export async function executeHouseholdProposalDecision({
  proposal, action, repository, boundary, now = () => new Date().toISOString(),
}: {
  proposal: HouseholdProposal;
  action: DecideUnifiedChatProposalInput['action'];
  repository: Repository;
  boundary: CompleteHouseholdActionBoundary;
  now?: () => string;
}): Promise<Completion> {
  const decision = await repository.decideProposal({
    proposalId: proposal.id, action, expectedVersion: proposal.version,
  });
  if (action !== 'approve') return { status: 'completed' };
  const applying = await repository.transitionProposalStatus({
    proposalId: proposal.id, fromStatus: 'approved', toStatus: 'applying', expectedVersion: decision.version,
  });
  let reservationPersisted = false;
  try {
    const payload = proposal.operation.payload;
    const operationType = proposal.operation.type;
    const targetId = proposal.operation.targetId;
    const appliedAt = now();
    const householdId = typeof payload.householdId === 'string' ? payload.householdId : null;
    const beforeSnapshot = await boundary.read();
    const beforeMember = targetId ? beforeSnapshot.members.find((member) => member.id === targetId) : undefined;
    const beforeDevices = householdId && operationType.startsWith('household.device.')
      ? await boundary.listDevices(householdId) : [];
    const beforeDevice = targetId ? beforeDevices.find((device) => device.id === targetId) : undefined;
    const reserved = await repository.persistMutationReceipt({
      capabilityId: 'household', threadId: proposal.threadId, proposalId: proposal.id,
      operationId: proposal.operation.id, idempotencyKey: proposal.operation.idempotencyKey,
      status: 'reserved', resultingObjectType: targetId?.startsWith('device-') ? 'household_device' : 'household_subject',
      resultingObjectId: targetId, resultState: { operationType, completionStatus: 'reserved' },
      returnTarget: null, undoOperation: null, appliedAt,
    });
    reservationPersisted = true;

    let receipt: { status: string; resultRefs: readonly { kind: string; id: string }[]; result: unknown };
    if (operationType === 'household.member.add_dependent') {
      receipt = await addDependentHouseholdMember({
        householdId: payload.householdId === null ? null : requiredString(payload.householdId, 'household_id'),
        displayName: requiredString(payload.displayName, 'display_name'),
        ownerDisplayName: requiredString(payload.ownerDisplayName, 'owner_display_name'), confirmed: true,
      }, boundary);
    } else if (operationType === 'household.invitation.create') {
      const role = payload.role === 'caregiver' || payload.role === 'child' ? payload.role : null;
      if (!role) throw new Error('invalid_household_proposal_role');
      receipt = await createHouseholdInvitation({
        householdId: payload.householdId === null ? null : requiredString(payload.householdId, 'household_id'),
        role, invitedEmail: typeof payload.invitedEmail === 'string' ? payload.invitedEmail : undefined,
        ownerDisplayName: requiredString(payload.ownerDisplayName, 'owner_display_name'), confirmed: true,
      }, boundary);
    } else if (operationType === 'household.invitation.accept') {
      receipt = await acceptHouseholdInvitation({ code: requiredString(payload.code, 'code'),
        displayName: requiredString(payload.displayName, 'display_name'), confirmed: true }, boundary);
    } else if (operationType === 'household.child_capability.update') {
      const capabilityId = payload.capabilityId === 'todos' || payload.capabilityId === 'screen-time'
        || payload.capabilityId === 'meal-planning' ? payload.capabilityId : null;
      if (!capabilityId) throw new Error('invalid_household_proposal_capability');
      receipt = await setHouseholdChildCapability({
        childMembershipId: requiredString(payload.childMembershipId, 'child_membership_id'), capabilityId,
        enabled: requiredBoolean(payload.enabled, 'enabled'), confirmed: true,
      }, boundary);
    } else if (operationType === 'household.caregiver_grant.update') {
      const capabilityId = payload.capabilityId === 'todos' || payload.capabilityId === 'screen-time'
        || payload.capabilityId === 'meal-planning' ? payload.capabilityId : null;
      if (!capabilityId) throw new Error('invalid_household_proposal_capability');
      receipt = await setHouseholdCaregiverGrant({
        caregiverMembershipId: requiredString(payload.caregiverMembershipId, 'caregiver_membership_id'),
        childMembershipId: requiredString(payload.childMembershipId, 'child_membership_id'), capabilityId,
        granted: requiredBoolean(payload.granted, 'granted'), confirmed: true,
      }, boundary);
    } else if (operationType === 'household.member.update') {
      if (!targetId || !payload.fields || typeof payload.fields !== 'object' || Array.isArray(payload.fields)) {
        throw new Error('invalid_household_proposal_member_update');
      }
      const raw = payload.fields as Record<string, unknown>;
      const fields: { displayName?: string; role?: 'caregiver' | 'child' } = {
        ...(typeof raw.displayName === 'string' ? { displayName: raw.displayName } : {}),
        ...(raw.role === 'caregiver' || raw.role === 'child' ? { role: raw.role } : {}),
      };
      receipt = await updateHouseholdMember({ householdId: requiredString(payload.householdId, 'household_id'),
        membershipId: targetId, expectedUpdatedAt: requiredString(payload.expectedUpdatedAt, 'expected_updated_at'),
        fields, confirmed: true }, boundary);
    } else if (operationType === 'household.member.remove') {
      if (!targetId) throw new Error('invalid_household_proposal_member');
      const preview = await previewHouseholdMemberRemoval({
        householdId: requiredString(payload.householdId, 'household_id'), membershipId: targetId,
        expectedUpdatedAt: requiredString(payload.expectedUpdatedAt, 'expected_updated_at'),
      }, boundary);
      receipt = await removeHouseholdMemberReviewed({ ...preview.result,
        householdId: requiredString(payload.householdId, 'household_id'), confirmed: true }, boundary);
    } else if (operationType === 'household.device.update') {
      if (!targetId) throw new Error('invalid_household_proposal_device');
      receipt = await updateHouseholdDevice({ householdId: requiredString(payload.householdId, 'household_id'),
        deviceId: targetId, expectedUpdatedAt: requiredString(payload.expectedUpdatedAt, 'expected_updated_at'),
        fields: {
          ...(typeof payload.displayName === 'string' ? { displayName: payload.displayName } : {}),
          ...(Array.isArray(payload.memberIds) && payload.memberIds.every((id) => typeof id === 'string')
            ? { memberIds: payload.memberIds as string[] } : {}),
        }, confirmed: true }, boundary);
    } else if (operationType === 'household.device.revoke') {
      if (!targetId) throw new Error('invalid_household_proposal_device');
      receipt = await revokeHouseholdDeviceReviewed({ householdId: requiredString(payload.householdId, 'household_id'),
        deviceId: targetId, expectedUpdatedAt: requiredString(payload.expectedUpdatedAt, 'expected_updated_at'),
        confirmed: true }, boundary);
    } else if (operationType === 'household.device.reconcile') {
      if (!targetId) throw new Error('invalid_household_proposal_device');
      receipt = await reconcileHouseholdDevice({ householdId: requiredString(payload.householdId, 'household_id'),
        deviceId: targetId, expectedUpdatedAt: requiredString(payload.expectedUpdatedAt, 'expected_updated_at'),
        confirmed: true }, boundary);
    } else {
      throw new Error('unsupported_household_proposal');
    }

    const firstRef = receipt.resultRefs[0] ?? null;
    const afterSnapshot = receipt.result && typeof receipt.result === 'object' && 'members' in receipt.result
      ? receipt.result as Awaited<ReturnType<CompleteHouseholdActionBoundary['read']>> : null;
    const afterMember = targetId ? afterSnapshot?.members.find((member) => member.id === targetId) : undefined;
    const resultDevice = receipt.result && typeof receipt.result === 'object' && 'device' in receipt.result
      ? (receipt.result as { device?: unknown }).device : receipt.result;
    const afterDevice = resultDevice && typeof resultDevice === 'object' && 'updatedAt' in resultDevice
      ? resultDevice as Awaited<ReturnType<CompleteHouseholdActionBoundary['updateDevice']>> : undefined;
    let undoOperation: Record<string, unknown> | null = null;
    if (operationType === 'household.member.update' && beforeMember && afterMember) {
      const changedFields = payload.fields as Record<string, unknown>;
      undoOperation = { type: 'household.member.update', membershipId: beforeMember.id,
        householdId: requiredString(payload.householdId, 'household_id'), expectedUpdatedAt: afterMember.updatedAt,
        fields: {
          ...('displayName' in changedFields ? { displayName: beforeMember.displayName } : {}),
          ...('role' in changedFields && beforeMember.role !== 'owner' ? { role: beforeMember.role } : {}),
        } };
    } else if (operationType === 'household.device.update' && beforeDevice && afterDevice) {
      undoOperation = { type: 'household.device.update', deviceId: beforeDevice.id,
        householdId: requiredString(payload.householdId, 'household_id'), expectedUpdatedAt: afterDevice.updatedAt,
        displayName: beforeDevice.label, memberIds: beforeDevice.memberIds };
    } else if (operationType === 'household.child_capability.update') {
      undoOperation = { type: operationType, childMembershipId: payload.childMembershipId,
        capabilityId: payload.capabilityId, enabled: !requiredBoolean(payload.enabled, 'enabled') };
    } else if (operationType === 'household.caregiver_grant.update') {
      undoOperation = { type: operationType, caregiverMembershipId: payload.caregiverMembershipId,
        childMembershipId: payload.childMembershipId, capabilityId: payload.capabilityId,
        granted: !requiredBoolean(payload.granted, 'granted') };
    }
    const completionStatus = receipt.status === 'pending_client_action' ? 'pending_client_action' : 'completed';
    const returnTarget = completionStatus === 'pending_client_action'
      ? { capability: 'household', screen: 'HouseholdDevices', params: { deviceId: targetId } } : null;
    await repository.finalizeMutationReceipt(reserved.id, {
      capabilityId: 'household',
      resultingObjectType: firstRef?.kind ?? (targetId ? 'household_subject' : 'household'),
      resultingObjectId: firstRef?.id ?? targetId,
      resultState: { operationType, completionStatus, resultRefs: receipt.resultRefs },
      returnTarget, undoOperation, appliedAt,
    });
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applying', toStatus: 'applied', expectedVersion: applying.version,
    });
    return { status: completionStatus };
  } catch (error) {
    if (!reservationPersisted) {
      await repository.transitionProposalStatus({
        proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: applying.version,
      }).catch(() => undefined);
    }
    throw error;
  }
}
