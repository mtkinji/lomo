import type {
  ChildCapabilityId,
  HouseholdInvitation,
  HouseholdInvitationPreview,
  HouseholdInvitationRole,
  HouseholdSnapshot,
} from '../../../features/household/data/household';

export type HouseholdActionBoundary = {
  read(): Promise<HouseholdSnapshot>;
  addDependent(input: {
    householdId: string | null;
    displayName: string;
    ownerDisplayName: string;
  }): Promise<HouseholdSnapshot>;
  createInvitation(input: {
    householdId: string | null;
    role: HouseholdInvitationRole;
    invitedEmail?: string;
    ownerDisplayName: string;
  }): Promise<HouseholdInvitation>;
  findPendingInvitation(): Promise<HouseholdInvitationPreview | null>;
  previewInvitation(code: string): Promise<HouseholdInvitationPreview>;
  acceptInvitation(input: { code: string; displayName: string }): Promise<HouseholdSnapshot>;
  acceptPendingInvitation(input: { invitationId: string; displayName: string }): Promise<HouseholdSnapshot>;
  setChildCapability(input: {
    childMembershipId: string;
    capabilityId: ChildCapabilityId;
    enabled: boolean;
  }): Promise<HouseholdSnapshot>;
  setCaregiverGrant(input: {
    caregiverMembershipId: string;
    childMembershipId: string;
    capabilityId: ChildCapabilityId;
    granted: boolean;
  }): Promise<HouseholdSnapshot>;
};

export type HouseholdActionOperationId =
  | 'household.read'
  | 'household.member.add_dependent'
  | 'household.invitation.create'
  | 'household.invitation.preview'
  | 'household.invitation.accept'
  | 'household.child_capability.update'
  | 'household.caregiver_grant.update';

export type HouseholdActionReceipt<Result> = {
  operationId: HouseholdActionOperationId;
  status: 'completed';
  resultRefs: readonly { kind: string; id: string }[];
  reversible: boolean;
  result: Result;
};

export class HouseholdActionConfirmationError extends Error {
  constructor() {
    super('This Household change requires explicit confirmation.');
    this.name = 'HouseholdActionConfirmationError';
  }
}

function assertConfirmed(confirmed: boolean): void {
  if (!confirmed) throw new HouseholdActionConfirmationError();
}

function householdRef(snapshot: HouseholdSnapshot): readonly [{ kind: 'household'; id: string }] {
  return [{ kind: 'household', id: snapshot.household?.id ?? 'none' }];
}

function snapshotReceipt(
  operationId: HouseholdActionOperationId,
  result: HouseholdSnapshot,
  reversible: boolean,
  resultRefs: readonly { kind: string; id: string }[] = householdRef(result),
): HouseholdActionReceipt<HouseholdSnapshot> {
  return { operationId, status: 'completed', resultRefs, reversible, result };
}

export async function readHousehold(
  boundary: HouseholdActionBoundary,
): Promise<HouseholdActionReceipt<HouseholdSnapshot>> {
  const result = await boundary.read();
  return snapshotReceipt('household.read', result, true);
}

export async function addDependentHouseholdMember(
  input: {
    householdId: string | null;
    displayName: string;
    ownerDisplayName: string;
    confirmed: boolean;
  },
  boundary: HouseholdActionBoundary,
): Promise<HouseholdActionReceipt<HouseholdSnapshot>> {
  assertConfirmed(input.confirmed);
  const displayName = input.displayName.trim();
  const result = await boundary.addDependent({
    householdId: input.householdId,
    displayName,
    ownerDisplayName: input.ownerDisplayName.trim(),
  });
  const member = result.members.find((candidate) => (
    candidate.role === 'child' && candidate.displayName === displayName
  ));
  return snapshotReceipt(
    'household.member.add_dependent', result, false,
    member ? [{ kind: 'household_member', id: member.id }] : householdRef(result),
  );
}

export async function createHouseholdInvitation(
  input: {
    householdId: string | null;
    role: HouseholdInvitationRole;
    invitedEmail?: string;
    ownerDisplayName: string;
    confirmed: boolean;
  },
  boundary: HouseholdActionBoundary,
): Promise<HouseholdActionReceipt<HouseholdInvitation>> {
  assertConfirmed(input.confirmed);
  const result = await boundary.createInvitation({
    householdId: input.householdId,
    role: input.role,
    invitedEmail: input.invitedEmail?.trim().toLowerCase() || undefined,
    ownerDisplayName: input.ownerDisplayName.trim(),
  });
  return {
    operationId: 'household.invitation.create', status: 'completed',
    resultRefs: [{ kind: 'household', id: input.householdId ?? 'none' }],
    reversible: false, result,
  };
}

export async function previewHouseholdInvitation(
  code: string,
  boundary: HouseholdActionBoundary,
): Promise<HouseholdActionReceipt<HouseholdInvitationPreview>> {
  const result = await boundary.previewInvitation(code.trim().toUpperCase());
  return {
    operationId: 'household.invitation.preview', status: 'completed',
    resultRefs: [{ kind: 'household_invitation_preview', id: 'reviewed' }],
    reversible: true, result,
  };
}

export async function findPendingHouseholdInvitation(
  boundary: HouseholdActionBoundary,
): Promise<HouseholdActionReceipt<HouseholdInvitationPreview | null>> {
  const result = await boundary.findPendingInvitation();
  return {
    operationId: 'household.invitation.preview', status: 'completed',
    resultRefs: result ? [{ kind: 'household_invitation_preview', id: result.invitationId ?? 'matched' }] : [],
    reversible: true, result,
  };
}

export async function acceptHouseholdInvitation(
  input: { code: string; displayName: string; confirmed: boolean },
  boundary: HouseholdActionBoundary,
): Promise<HouseholdActionReceipt<HouseholdSnapshot>> {
  assertConfirmed(input.confirmed);
  const result = await boundary.acceptInvitation({
    code: input.code.trim().toUpperCase(),
    displayName: input.displayName.trim(),
  });
  return snapshotReceipt('household.invitation.accept', result, false);
}

export async function acceptPendingHouseholdInvitation(
  input: { invitationId: string; displayName: string; confirmed: boolean },
  boundary: HouseholdActionBoundary,
): Promise<HouseholdActionReceipt<HouseholdSnapshot>> {
  assertConfirmed(input.confirmed);
  const result = await boundary.acceptPendingInvitation({
    invitationId: input.invitationId,
    displayName: input.displayName.trim(),
  });
  return snapshotReceipt('household.invitation.accept', result, false);
}

export async function setHouseholdChildCapability(
  input: {
    childMembershipId: string;
    capabilityId: ChildCapabilityId;
    enabled: boolean;
    confirmed: boolean;
  },
  boundary: HouseholdActionBoundary,
): Promise<HouseholdActionReceipt<HouseholdSnapshot>> {
  assertConfirmed(input.confirmed);
  const result = await boundary.setChildCapability({
    childMembershipId: input.childMembershipId,
    capabilityId: input.capabilityId,
    enabled: input.enabled,
  });
  return snapshotReceipt('household.child_capability.update', result, true, [{
    kind: 'household_child_capability',
    id: `${input.childMembershipId}:${input.capabilityId}`,
  }]);
}

export async function setHouseholdCaregiverGrant(
  input: {
    caregiverMembershipId: string;
    childMembershipId: string;
    capabilityId: ChildCapabilityId;
    granted: boolean;
    confirmed: boolean;
  },
  boundary: HouseholdActionBoundary,
): Promise<HouseholdActionReceipt<HouseholdSnapshot>> {
  assertConfirmed(input.confirmed);
  const result = await boundary.setCaregiverGrant({
    caregiverMembershipId: input.caregiverMembershipId,
    childMembershipId: input.childMembershipId,
    capabilityId: input.capabilityId,
    granted: input.granted,
  });
  return snapshotReceipt('household.caregiver_grant.update', result, true, [{
    kind: 'household_capability_grant',
    id: `${input.caregiverMembershipId}:${input.childMembershipId}:${input.capabilityId}`,
  }]);
}
