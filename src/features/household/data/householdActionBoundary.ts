import type { SupabaseClient } from '@supabase/supabase-js';
import type { HouseholdActionBoundary } from '../../../capabilities/relationships/actions/relationshipActions';
import type { HouseholdManagementBoundary } from './householdManagementActions';
import {
  acceptHouseholdMemberInvite,
  addDependentChild,
  createHouseholdMemberInvite,
  getHouseholdSnapshot,
  previewHouseholdMemberRemovalRecord,
  previewHouseholdInvite,
  removeHouseholdMemberReviewedRecord,
  setCaregiverCapabilityGrant,
  setChildCapabilityActivation,
  updateHouseholdMemberRecord,
} from './household';
import {
  listHouseholdDevices,
  reconcileHouseholdDeviceRecord,
  revokeHouseholdDeviceReviewedRecord,
  updateHouseholdDeviceRecord,
} from './householdDeviceParticipation';

export type CompleteHouseholdActionBoundary = HouseholdActionBoundary & HouseholdManagementBoundary;

export function createHouseholdActionBoundary(client: SupabaseClient): CompleteHouseholdActionBoundary {
  return {
    read: () => getHouseholdSnapshot(client),
    addDependent: (input) => addDependentChild(client, input),
    createInvitation: (input) => createHouseholdMemberInvite(client, input),
    previewInvitation: (code) => previewHouseholdInvite(client, code),
    acceptInvitation: (input) => acceptHouseholdMemberInvite(client, input),
    setChildCapability: (input) => setChildCapabilityActivation(client, input),
    setCaregiverGrant: (input) => setCaregiverCapabilityGrant(client, input),
    updateMember: (input) => updateHouseholdMemberRecord(client, input),
    previewMemberRemoval: (input) => previewHouseholdMemberRemovalRecord(client, input),
    removeMember: (input) => removeHouseholdMemberReviewedRecord(client, input),
    listDevices: (householdId) => listHouseholdDevices(client, householdId),
    updateDevice: (input) => updateHouseholdDeviceRecord(client, input),
    revokeDevice: (input) => revokeHouseholdDeviceReviewedRecord(client, input),
    reconcileDevice: (input) => reconcileHouseholdDeviceRecord(client, input),
  };
}
