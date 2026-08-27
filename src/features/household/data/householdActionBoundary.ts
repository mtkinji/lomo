import type { SupabaseClient } from '@supabase/supabase-js';
import type { HouseholdActionBoundary } from '../../../capabilities/relationships/actions/relationshipActions';
import {
  acceptHouseholdMemberInvite,
  addDependentChild,
  createHouseholdMemberInvite,
  getHouseholdSnapshot,
  previewHouseholdInvite,
  setCaregiverCapabilityGrant,
  setChildCapabilityActivation,
} from './household';

export function createHouseholdActionBoundary(client: SupabaseClient): HouseholdActionBoundary {
  return {
    read: () => getHouseholdSnapshot(client),
    addDependent: (input) => addDependentChild(client, input),
    createInvitation: (input) => createHouseholdMemberInvite(client, input),
    previewInvitation: (code) => previewHouseholdInvite(client, code),
    acceptInvitation: (input) => acceptHouseholdMemberInvite(client, input),
    setChildCapability: (input) => setChildCapabilityActivation(client, input),
    setCaregiverGrant: (input) => setCaregiverCapabilityGrant(client, input),
  };
}
