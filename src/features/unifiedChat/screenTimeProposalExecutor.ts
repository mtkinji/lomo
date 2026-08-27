import type { SupabaseClient } from '@supabase/supabase-js';
import {
  applyTemporaryFamilyScreenTimeAccess,
  cancelTemporaryFamilyScreenTimeAccess,
  createFamilyScreenTimePrerequisiteAgreement,
  decideFamilyScreenTimeAccessRequest,
  setFamilyScreenTimeAgreement,
} from '../household/screenTime/familyScreenTimeCommands';
import type { UnifiedChatProposal } from './types';

type ScreenTimeProposal = Extract<UnifiedChatProposal, { capabilityId: 'screenTime' }>;

export function prepareApprovedScreenTimeProposal(proposal: ScreenTimeProposal) {
  if (proposal.operation.type === 'create_family_screen_time_prerequisite_agreement') {
    return {
      resultingObjectType: 'family_screen_time_agreement',
      resultingObjectId: proposal.operation.idempotencyKey,
      resultState: {
        policyState: 'pending',
        deviceState: 'not_checked',
        childMembershipId: proposal.operation.payload.childMembershipId,
        targetSelectionId: proposal.operation.payload.targetSelectionId,
        thresholdMinutes: proposal.operation.payload.rule.prerequisiteActivity.thresholdMinutes,
        reset: proposal.operation.payload.rule.prerequisiteActivity.reset,
      },
      returnTarget: { capabilityId: 'screenTime', route: 'ScreenTimeProtectionSettings' },
      undoOperation: null,
    };
  }
  if (proposal.operation.type === 'update_family_screen_time_agreement'
    || proposal.operation.type === 'deactivate_family_screen_time_agreement') {
    const active = proposal.operation.type === 'update_family_screen_time_agreement';
    return {
      resultingObjectType: 'family_screen_time_agreement',
      resultingObjectId: proposal.operation.targetId,
      resultState: { policyState: 'pending', deviceState: 'not_checked', active },
      returnTarget: { capabilityId: 'screenTime', route: 'ScreenTimeProtectionSettings' },
      undoOperation: null,
    };
  }
  if (proposal.operation.type === 'cancel_family_screen_time_override') {
    return {
      resultingObjectType: 'family_screen_time_override',
      resultingObjectId: proposal.operation.targetId,
      resultState: { policyState: 'pending_cancellation', deviceState: 'not_checked' },
      returnTarget: { capabilityId: 'screenTime', route: 'ScreenTimeProtectionSettings' },
      undoOperation: null,
    };
  }
  if (proposal.operation.type === 'decide_family_screen_time_request') {
    return {
      resultingObjectType: 'family_screen_time_request',
      resultingObjectId: proposal.operation.targetId,
      resultState: { decision: 'pending', deviceState: 'not_checked' },
      returnTarget: { capabilityId: 'screenTime', route: 'ScreenTimeProtectionSettings' },
      undoOperation: null,
    };
  }
  const action = proposal.operation.type === 'block_family_screen_time_selection' ? 'block' : 'allow';
  return {
    resultingObjectType: 'family_screen_time_override_batch',
    resultingObjectId: proposal.operation.idempotencyKey,
    resultState: {
      policyState: 'pending',
      deviceState: 'not_checked',
      action,
      expiresAt: proposal.operation.payload.expiresAt,
      targetCount: proposal.operation.payload.targets.length,
      scope: 'kwilt_family_restrictions',
    },
    returnTarget: { capabilityId: 'screenTime', route: 'ScreenTimeProtectionSettings' },
    undoOperation: null,
  };
}

export async function applyApprovedScreenTimeProposal(input: {
  proposal: ScreenTimeProposal;
  client: SupabaseClient;
  now?: Date;
}) {
  const { proposal, client } = input;
  const now = input.now ?? new Date();
  if (proposal.operation.type === 'create_family_screen_time_prerequisite_agreement') {
    const result = await createFamilyScreenTimePrerequisiteAgreement(client, {
      childMembershipId: proposal.operation.payload.childMembershipId,
      targetSelectionId: proposal.operation.payload.targetSelectionId,
      expectedPolicyVersion: proposal.operation.payload.expectedPolicyVersion,
      rule: proposal.operation.payload.rule,
      operationId: proposal.operation.idempotencyKey,
    });
    return {
      resultingObjectType: 'family_screen_time_agreement',
      resultingObjectId: result.agreementId,
      resultState: {
        policyState: 'saved',
        deviceState: result.deliveryState,
        childMembershipId: result.childMembershipId,
        desiredPolicyVersion: result.desiredPolicyVersion,
        agreementVersion: result.version,
        targetSelectionId: result.targetSelectionId,
        thresholdMinutes: result.rule.prerequisiteActivity.thresholdMinutes,
        reset: result.rule.prerequisiteActivity.reset,
      },
      returnTarget: { capabilityId: 'screenTime', route: 'ScreenTimeProtectionSettings' },
      undoOperation: null,
    };
  }
  if (proposal.operation.type === 'update_family_screen_time_agreement'
    || proposal.operation.type === 'deactivate_family_screen_time_agreement') {
    const active = proposal.operation.type === 'update_family_screen_time_agreement';
    const result = await setFamilyScreenTimeAgreement(client, {
      childMembershipId: proposal.operation.payload.childMembershipId,
      agreementId: proposal.operation.targetId,
      selectionId: proposal.operation.payload.selectionId,
      expectedVersion: proposal.operation.payload.expectedVersion,
      rule: proposal.operation.payload.rule,
      active,
      operationId: proposal.operation.idempotencyKey,
    });
    return {
      resultingObjectType: 'family_screen_time_agreement',
      resultingObjectId: result.agreementId,
      resultState: {
        policyState: 'saved', active: result.active, version: result.version,
        desiredPolicyVersion: result.desiredPolicyVersion, deviceState: result.deliveryState,
      },
      returnTarget: { capabilityId: 'screenTime', route: 'ScreenTimeProtectionSettings' },
      undoOperation: null,
    };
  }
  if (proposal.operation.type === 'cancel_family_screen_time_override') {
    const result = await cancelTemporaryFamilyScreenTimeAccess(client, {
      childMembershipId: proposal.operation.payload.childMembershipId,
      overrideId: proposal.operation.targetId,
      expectedVersion: proposal.operation.payload.expectedVersion,
      operationId: proposal.operation.idempotencyKey,
    });
    return {
      resultingObjectType: 'family_screen_time_override', resultingObjectId: result.overrideId,
      resultState: {
        policyState: 'cancelled', desiredPolicyVersion: result.desiredPolicyVersion,
        deviceState: result.deliveryState,
      },
      returnTarget: { capabilityId: 'screenTime', route: 'ScreenTimeProtectionSettings' },
      undoOperation: null,
    };
  }
  if (proposal.operation.type === 'decide_family_screen_time_request') {
    const result = await decideFamilyScreenTimeAccessRequest(client, {
      childMembershipId: proposal.operation.payload.childMembershipId,
      requestId: proposal.operation.targetId,
      decision: proposal.operation.payload.decision,
      allowMinutes: proposal.operation.payload.allowMinutes,
      expectedVersion: proposal.operation.payload.expectedVersion,
      operationId: proposal.operation.idempotencyKey,
    });
    return {
      resultingObjectType: 'family_screen_time_request', resultingObjectId: proposal.operation.targetId,
      resultState: {
        decision: result.decision, desiredPolicyVersion: result.desiredPolicyVersion,
        deviceState: result.deliveryState,
      },
      returnTarget: { capabilityId: 'screenTime', route: 'ScreenTimeProtectionSettings' },
      undoOperation: null,
    };
  }
  const action = proposal.operation.type === 'block_family_screen_time_selection' ? 'block' : 'allow';
  const result = await applyTemporaryFamilyScreenTimeAccess(client, {
    action,
    targets: proposal.operation.payload.targets,
    expiresAt: proposal.operation.payload.expiresAt,
    timeBasis: proposal.operation.payload.timeBasis,
    operationId: proposal.operation.idempotencyKey,
    now,
  });
  const states = result.targets.map((target) => target.deliveryState);
  const deviceState = states.every((state) => state === 'applied')
    ? 'applied'
    : states.some((state) => state === 'failed')
      ? 'failed'
      : states.some((state) => state === 'device_required')
        ? 'device_required'
        : 'applying';
  return {
    resultingObjectType: 'family_screen_time_override_batch',
    resultingObjectId: result.operationId,
    resultState: {
      policyState: 'saved',
      deviceState,
      action: result.action,
      expiresAt: result.expiresAt,
      targetCount: result.targets.length,
      targets: result.targets.map((target) => ({
        childMembershipId: target.childMembershipId,
        desiredPolicyVersion: target.policyVersion,
        deliveryState: target.deliveryState,
      })),
      scope: result.scope,
    },
    returnTarget: { capabilityId: 'screenTime', route: 'ScreenTimeProtectionSettings' },
    undoOperation: null,
  };
}
