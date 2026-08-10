import type { HouseholdSnapshot } from '../../household/data/household';
import type { ScreenTimeActor } from './screenTimeGuideActions';

export function resolveScreenTimeActor(snapshot: HouseholdSnapshot | null): ScreenTimeActor {
  if (!snapshot?.currentMembershipId) return { kind: 'self_adult' };
  const membership = snapshot.members.find((member) => member.id === snapshot.currentMembershipId);
  if (!membership) return { kind: 'household_member' };
  if (membership.role === 'owner') return { kind: 'household_owner' };
  if (membership.role === 'child') {
    return { kind: 'household_child', membershipId: membership.id };
  }
  return {
    kind: 'household_caregiver',
    childMembershipIds: snapshot.grants.flatMap((grant) => (
      grant.caregiverMembershipId === membership.id && grant.capabilityId === 'screen-time'
        ? [grant.childMembershipId]
        : []
    )),
  };
}

