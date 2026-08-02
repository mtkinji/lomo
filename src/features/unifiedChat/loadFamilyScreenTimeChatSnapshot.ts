import type { SupabaseClient } from '@supabase/supabase-js';
import { getHouseholdSnapshot } from '../household/data/household';
import { fetchFamilyScreenTimeSnapshot } from '../household/screenTime/data/familyScreenTime';
import type { ScreenTimeChatSnapshot } from './capabilityAdapters';

export async function loadFamilyScreenTimeChatSnapshot(
  client: SupabaseClient,
): Promise<ScreenTimeChatSnapshot> {
  const household = await getHouseholdSnapshot(client);
  const actor = household.members.find((member) => member.id === household.currentMembershipId);
  if (!household.household || !actor || !['owner', 'caregiver'].includes(actor.role)) {
    return { children: [] };
  }
  const grantedChildren = new Set(household.grants.filter((grant) => (
    grant.caregiverMembershipId === actor.id && grant.capabilityId === 'screen-time'
  )).map((grant) => grant.childMembershipId));
  const activatedChildren = new Set(household.activations.filter((activation) => (
    activation.capabilityId === 'screen-time' && activation.state !== 'inactive'
  )).map((activation) => activation.childMembershipId));
  const children = household.members.filter((member) => (
    member.role === 'child'
    && activatedChildren.has(member.id)
    && (actor.role === 'owner' || grantedChildren.has(member.id))
  ));
  return {
    children: await Promise.all(children.map(async (child) => ({
      membershipId: child.id,
      displayName: child.displayName,
      canManage: true,
      policy: await fetchFamilyScreenTimeSnapshot(client, child.id),
    }))),
  };
}
