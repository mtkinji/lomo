import type {
  ChildCapabilityState,
  HouseholdSnapshot,
} from '../household/data/household';

export type FamilyScreenTimeOverviewRow = {
  childMembershipId: string;
  displayName: string;
  value: string;
};

function familyActivationValue(state: ChildCapabilityState): string | null {
  switch (state) {
    case 'pending_setup': return 'Set up';
    case 'active': return 'On';
    case 'pending_cleanup': return 'Applying';
    case 'blocked': return 'Needs attention';
    case 'inactive': return null;
  }
}

export function buildFamilyScreenTimeOverviewRows(
  snapshot: HouseholdSnapshot | null,
): FamilyScreenTimeOverviewRow[] {
  if (!snapshot) return [];
  const childById = new Map(
    snapshot.members
      .filter((member) => member.role === 'child')
      .map((member) => [member.id, member] as const),
  );

  return snapshot.activations.flatMap((activation) => {
    if (activation.capabilityId !== 'screen-time') return [];
    const child = childById.get(activation.childMembershipId);
    const value = familyActivationValue(activation.state);
    if (!child || !value) return [];
    return [{
      childMembershipId: child.id,
      displayName: child.displayName,
      value,
    }];
  }).sort((left, right) => left.displayName.localeCompare(right.displayName));
}
