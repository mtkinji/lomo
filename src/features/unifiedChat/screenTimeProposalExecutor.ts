import type { SupabaseClient } from '@supabase/supabase-js';
import { applyTemporaryFamilyScreenTimeAccess } from '../household/screenTime/familyScreenTimeCommands';
import type { UnifiedChatProposal } from './types';

type ScreenTimeProposal = Extract<UnifiedChatProposal, { capabilityId: 'screenTime' }>;

export function prepareApprovedScreenTimeProposal(proposal: ScreenTimeProposal) {
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
