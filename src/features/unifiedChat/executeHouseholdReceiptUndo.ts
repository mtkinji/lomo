import {
  setHouseholdCaregiverGrant,
  setHouseholdChildCapability,
} from '../../capabilities/relationships/actions/relationshipActions';
import type { CompleteHouseholdActionBoundary } from '../household/data/householdActionBoundary';
import {
  updateHouseholdDevice,
  updateHouseholdMember,
} from '../household/data/householdManagementActions';
import type { UnifiedChatMutationReceipt } from './types';

const requiredString = (value: unknown, field: string) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`invalid_household_undo_${field}`);
  return value.trim();
};

export async function executeHouseholdReceiptUndo({
  receipt, boundary, now = () => new Date().toISOString(),
}: {
  receipt: UnifiedChatMutationReceipt;
  boundary: CompleteHouseholdActionBoundary;
  now?: () => string;
}): Promise<{ undoneAt: string }> {
  const undo = receipt.undoOperation;
  if (!receipt.canUndo || !undo || typeof undo.type !== 'string') {
    throw new Error('This Household receipt does not contain a safe undo operation.');
  }
  if (undo.type === 'household.member.update') {
    if (!undo.fields || typeof undo.fields !== 'object' || Array.isArray(undo.fields)) {
      throw new Error('This Household member undo is invalid.');
    }
    const raw = undo.fields as Record<string, unknown>;
    const fields: { displayName?: string; role?: 'caregiver' | 'child' } = {
      ...(typeof raw.displayName === 'string' ? { displayName: raw.displayName } : {}),
      ...(raw.role === 'caregiver' || raw.role === 'child' ? { role: raw.role } : {}),
    };
    await updateHouseholdMember({
      householdId: requiredString(undo.householdId, 'household_id'),
      membershipId: requiredString(undo.membershipId, 'membership_id'),
      expectedUpdatedAt: requiredString(undo.expectedUpdatedAt, 'expected_updated_at'),
      fields, confirmed: true,
    }, boundary);
  } else if (undo.type === 'household.device.update') {
    const memberIds = Array.isArray(undo.memberIds) && undo.memberIds.every((id) => typeof id === 'string')
      ? undo.memberIds as string[] : null;
    if (!memberIds) throw new Error('This Household device undo is invalid.');
    await updateHouseholdDevice({
      householdId: requiredString(undo.householdId, 'household_id'),
      deviceId: requiredString(undo.deviceId, 'device_id'),
      expectedUpdatedAt: requiredString(undo.expectedUpdatedAt, 'expected_updated_at'),
      fields: { displayName: requiredString(undo.displayName, 'display_name'), memberIds }, confirmed: true,
    }, boundary);
  } else if (undo.type === 'household.child_capability.update') {
    if (typeof undo.enabled !== 'boolean'
      || !['todos', 'screen-time', 'meal-planning'].includes(String(undo.capabilityId))) {
      throw new Error('This Household capability undo is invalid.');
    }
    await setHouseholdChildCapability({
      childMembershipId: requiredString(undo.childMembershipId, 'child_membership_id'),
      capabilityId: undo.capabilityId as 'todos' | 'screen-time' | 'meal-planning',
      enabled: undo.enabled, confirmed: true,
    }, boundary);
  } else if (undo.type === 'household.caregiver_grant.update') {
    if (typeof undo.granted !== 'boolean'
      || !['todos', 'screen-time', 'meal-planning'].includes(String(undo.capabilityId))) {
      throw new Error('This Household caregiver undo is invalid.');
    }
    await setHouseholdCaregiverGrant({
      caregiverMembershipId: requiredString(undo.caregiverMembershipId, 'caregiver_membership_id'),
      childMembershipId: requiredString(undo.childMembershipId, 'child_membership_id'),
      capabilityId: undo.capabilityId as 'todos' | 'screen-time' | 'meal-planning',
      granted: undo.granted, confirmed: true,
    }, boundary);
  } else {
    throw new Error('This Household receipt does not contain a supported undo operation.');
  }
  return { undoneAt: now() };
}
