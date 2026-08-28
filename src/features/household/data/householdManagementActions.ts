import type {
  HouseholdMemberRemovalPreview,
  HouseholdRole,
  HouseholdSnapshot,
} from './household';
import type { HouseholdDevice } from './householdDeviceParticipation';

export type HouseholdManagementBoundary = {
  read(): Promise<HouseholdSnapshot>;
  updateMember(input: {
    membershipId: string;
    expectedUpdatedAt: string;
    fields: { displayName?: string; role?: Exclude<HouseholdRole, 'owner'> };
  }): Promise<HouseholdSnapshot>;
  previewMemberRemoval(input: { membershipId: string; expectedUpdatedAt: string }): Promise<HouseholdMemberRemovalPreview>;
  removeMember(input: { membershipId: string; expectedUpdatedAt: string }): Promise<HouseholdSnapshot>;
  listDevices(householdId: string): Promise<HouseholdDevice[]>;
  updateDevice(input: {
    deviceId: string;
    expectedUpdatedAt: string;
    fields: { displayName?: string; memberIds?: string[] };
  }): Promise<HouseholdDevice>;
  revokeDevice(input: { deviceId: string; expectedUpdatedAt: string }): Promise<HouseholdDevice>;
  reconcileDevice(input: { deviceId: string; expectedUpdatedAt: string }): Promise<{
    device: HouseholdDevice;
    requiresNativeCleanup: boolean;
  }>;
};

export type HouseholdManagementOperationId =
  | 'household.member.update'
  | 'household.member.remove'
  | 'household.device.list'
  | 'household.device.update'
  | 'household.device.revoke'
  | 'household.device.reconcile';

export type HouseholdManagementReceipt<Result> = {
  operationId: HouseholdManagementOperationId;
  status: 'completed' | 'proposed' | 'pending_client_action';
  resultRefs: readonly { kind: string; id: string }[];
  reversible: boolean;
  result: Result;
};

export class HouseholdManagementAuthorizationError extends Error {
  constructor() { super('The current Household member is not authorized for this action.'); this.name = 'HouseholdManagementAuthorizationError'; }
}
export class HouseholdManagementStaleTargetError extends Error {
  constructor(public readonly candidateSummary: string) { super('The Household target changed.'); this.name = 'HouseholdManagementStaleTargetError'; }
}
export class HouseholdManagementConfirmationError extends Error {
  constructor() { super('This Household change requires explicit confirmation.'); this.name = 'HouseholdManagementConfirmationError'; }
}

function confirm(confirmed: boolean): void {
  if (!confirmed) throw new HouseholdManagementConfirmationError();
}

async function context(householdId: string, boundary: HouseholdManagementBoundary) {
  const snapshot = await boundary.read();
  if (snapshot.household?.id !== householdId) throw new HouseholdManagementAuthorizationError();
  const actor = snapshot.members.find((member) => member.id === snapshot.currentMembershipId);
  if (!actor) throw new HouseholdManagementAuthorizationError();
  return { snapshot, actor };
}

function exactMember(snapshot: HouseholdSnapshot, membershipId: string, expectedUpdatedAt: string) {
  const member = snapshot.members.find((candidate) => candidate.id === membershipId);
  if (!member) throw new HouseholdManagementAuthorizationError();
  if (member.updatedAt !== expectedUpdatedAt) {
    throw new HouseholdManagementStaleTargetError(`${member.displayName} is currently ${member.role}.`);
  }
  return member;
}

function canManageMember(actor: HouseholdSnapshot['members'][number], target: HouseholdSnapshot['members'][number]): boolean {
  if (actor.id === target.id) return actor.kind === 'adult';
  if (actor.role === 'owner') return target.role !== 'owner';
  return actor.role === 'caregiver' && target.role === 'child';
}

function memberRef(id: string) { return [{ kind: 'household_member', id }] as const; }
function deviceRef(id: string) { return [{ kind: 'household_device', id }] as const; }

export async function updateHouseholdMember(input: {
  householdId: string; membershipId: string; expectedUpdatedAt: string;
  fields: { displayName?: string; role?: Exclude<HouseholdRole, 'owner'> }; confirmed: boolean;
}, boundary: HouseholdManagementBoundary): Promise<HouseholdManagementReceipt<HouseholdSnapshot>> {
  confirm(input.confirmed);
  const { snapshot, actor } = await context(input.householdId, boundary);
  const target = exactMember(snapshot, input.membershipId, input.expectedUpdatedAt);
  if (!canManageMember(actor, target) || (input.fields.role !== undefined && actor.role !== 'owner')) {
    throw new HouseholdManagementAuthorizationError();
  }
  const displayName = input.fields.displayName?.trim();
  if ((displayName !== undefined && (!displayName || displayName.length > 80))
    || (displayName === undefined && input.fields.role === undefined)) throw new Error('invalid_household_member_patch');
  const fields = { ...(displayName !== undefined ? { displayName } : {}), ...(input.fields.role ? { role: input.fields.role } : {}) };
  const result = await boundary.updateMember({ membershipId: target.id, expectedUpdatedAt: target.updatedAt, fields });
  return { operationId: 'household.member.update', status: 'completed', resultRefs: memberRef(target.id), reversible: true, result };
}

export async function previewHouseholdMemberRemoval(input: {
  householdId: string; membershipId: string; expectedUpdatedAt: string;
}, boundary: HouseholdManagementBoundary): Promise<HouseholdManagementReceipt<HouseholdMemberRemovalPreview>> {
  const { snapshot, actor } = await context(input.householdId, boundary);
  const target = exactMember(snapshot, input.membershipId, input.expectedUpdatedAt);
  if (actor.role !== 'owner' || target.role === 'owner') throw new HouseholdManagementAuthorizationError();
  const result = await boundary.previewMemberRemoval({ membershipId: target.id, expectedUpdatedAt: target.updatedAt });
  return { operationId: 'household.member.remove', status: 'proposed', resultRefs: memberRef(target.id), reversible: true, result };
}

export async function removeHouseholdMemberReviewed(input: HouseholdMemberRemovalPreview & {
  householdId: string; confirmed: boolean;
}, boundary: HouseholdManagementBoundary): Promise<HouseholdManagementReceipt<HouseholdSnapshot>> {
  confirm(input.confirmed);
  const { snapshot, actor } = await context(input.householdId, boundary);
  const target = exactMember(snapshot, input.membershipId, input.expectedUpdatedAt);
  if (actor.role !== 'owner' || target.role === 'owner') throw new HouseholdManagementAuthorizationError();
  const result = await boundary.removeMember({ membershipId: target.id, expectedUpdatedAt: target.updatedAt });
  return { operationId: 'household.member.remove', status: 'completed', resultRefs: memberRef(target.id), reversible: false, result };
}

async function deviceContext(householdId: string, boundary: HouseholdManagementBoundary) {
  const { actor } = await context(householdId, boundary);
  if (actor.role !== 'owner' && actor.role !== 'caregiver') throw new HouseholdManagementAuthorizationError();
  return boundary.listDevices(householdId);
}

function exactDevice(devices: HouseholdDevice[], deviceId: string, expectedUpdatedAt: string) {
  const device = devices.find((candidate) => candidate.id === deviceId);
  if (!device) throw new HouseholdManagementAuthorizationError();
  if (device.updatedAt !== expectedUpdatedAt) throw new HouseholdManagementStaleTargetError(`${device.label} is ${device.status}.`);
  return device;
}

export async function readHouseholdDevices(input: { householdId: string }, boundary: HouseholdManagementBoundary) {
  const result = await deviceContext(input.householdId, boundary);
  return { operationId: 'household.device.list' as const, status: 'completed' as const,
    resultRefs: result.map((device) => ({ kind: 'household_device', id: device.id })), reversible: true, result };
}

export async function updateHouseholdDevice(input: {
  householdId: string; deviceId: string; expectedUpdatedAt: string;
  fields: { displayName?: string; memberIds?: string[] }; confirmed: boolean;
}, boundary: HouseholdManagementBoundary) {
  confirm(input.confirmed);
  const device = exactDevice(await deviceContext(input.householdId, boundary), input.deviceId, input.expectedUpdatedAt);
  const displayName = input.fields.displayName?.trim();
  const memberIds = input.fields.memberIds === undefined ? undefined : [...new Set(input.fields.memberIds)];
  if ((displayName !== undefined && (!displayName || displayName.length > 80))
    || (memberIds !== undefined && (memberIds.length > 50 || memberIds.some((id) => !id.trim())))
    || (displayName === undefined && memberIds === undefined)) throw new Error('invalid_household_device_patch');
  const fields = { ...(displayName !== undefined ? { displayName } : {}), ...(memberIds !== undefined ? { memberIds } : {}) };
  const result = await boundary.updateDevice({ deviceId: device.id, expectedUpdatedAt: device.updatedAt, fields });
  return { operationId: 'household.device.update' as const, status: 'completed' as const,
    resultRefs: deviceRef(device.id), reversible: true, result };
}

export async function revokeHouseholdDeviceReviewed(input: {
  householdId: string; deviceId: string; expectedUpdatedAt: string; confirmed: boolean;
}, boundary: HouseholdManagementBoundary) {
  confirm(input.confirmed);
  const device = exactDevice(await deviceContext(input.householdId, boundary), input.deviceId, input.expectedUpdatedAt);
  const result = await boundary.revokeDevice({ deviceId: device.id, expectedUpdatedAt: device.updatedAt });
  return { operationId: 'household.device.revoke' as const, status: 'completed' as const,
    resultRefs: deviceRef(device.id), reversible: false, result };
}

export async function reconcileHouseholdDevice(input: {
  householdId: string; deviceId: string; expectedUpdatedAt: string; confirmed: boolean;
}, boundary: HouseholdManagementBoundary) {
  confirm(input.confirmed);
  const device = exactDevice(await deviceContext(input.householdId, boundary), input.deviceId, input.expectedUpdatedAt);
  const result = await boundary.reconcileDevice({ deviceId: device.id, expectedUpdatedAt: device.updatedAt });
  return { operationId: 'household.device.reconcile' as const,
    status: result.requiresNativeCleanup ? 'pending_client_action' as const : 'completed' as const,
    resultRefs: deviceRef(device.id), reversible: false, result };
}
