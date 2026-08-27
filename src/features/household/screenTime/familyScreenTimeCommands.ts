import type { SupabaseClient } from '@supabase/supabase-js';
import {
  applyFamilyScreenTimeOverrideBatchRpc,
  cancelFamilyScreenTimeOverrideRpc,
  createFamilyScreenTimePrerequisiteAgreementRpc,
  decideFamilyScreenTimeAccessRequestRpc,
  fetchFamilyScreenTimeSnapshot,
  setFamilyScreenTimeAgreementRpc,
  type FamilyScreenTimeAction,
  type FamilyScreenTimeBasis,
  type FamilyScreenTimeSnapshot,
  type FamilyScreenTimePrerequisiteRule,
} from './data/familyScreenTime';

export type FamilyScreenTimeDeliveryState = 'device_required' | 'applying' | 'applied' | 'failed';

export type TemporaryFamilyScreenTimeTarget = {
  childMembershipId: string;
  selectionId: string;
  expectedVersion: number;
};

type AppliedOverride = {
  overrideId: string;
  childMembershipId: string;
  selectionId: string;
  action: FamilyScreenTimeAction;
  timeBasis: FamilyScreenTimeBasis;
  startsAt: string;
  expiresAt: string | null;
  policyVersion: number;
};

type CreatedPrerequisiteAgreement = {
  agreementId: string;
  childMembershipId: string;
  targetSelectionId: string;
  prerequisiteSelectionId: string;
  rule: FamilyScreenTimePrerequisiteRule;
  active: boolean;
  version: number;
  desiredPolicyVersion: number;
  operationId: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => value != null && typeof value === 'object' && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function parseAppliedOverride(value: unknown): AppliedOverride {
  if (!isRecord(value) || !isString(value.overrideId) || !isString(value.childMembershipId)
    || !isString(value.selectionId) || !['block', 'allow'].includes(String(value.action))
    || !['wall_clock', 'foreground_usage'].includes(String(value.timeBasis))
    || !isString(value.startsAt) || !(value.expiresAt === null || isString(value.expiresAt))
    || !isNumber(value.policyVersion)) {
    throw new Error('Invalid family Screen Time override result');
  }
  return value as AppliedOverride;
}

function parseBatch(value: unknown): { operationId: string; overrides: AppliedOverride[] } {
  if (!isRecord(value) || !isString(value.operationId) || !Array.isArray(value.overrides)) {
    throw new Error('Invalid family Screen Time override result');
  }
  return { operationId: value.operationId, overrides: value.overrides.map(parseAppliedOverride) };
}

function parseCreatedPrerequisiteAgreement(value: unknown): CreatedPrerequisiteAgreement {
  if (!isRecord(value) || !isString(value.agreementId) || !isString(value.childMembershipId)
    || !isString(value.targetSelectionId) || !isString(value.prerequisiteSelectionId)
    || !isRecord(value.rule) || value.active !== true || !isNumber(value.version)
    || !isNumber(value.desiredPolicyVersion) || !isString(value.operationId)) {
    throw new Error('Invalid family Screen Time prerequisite agreement result');
  }
  return value as CreatedPrerequisiteAgreement;
}

function deliveryState(snapshot: FamilyScreenTimeSnapshot, policyVersion: number): FamilyScreenTimeDeliveryState {
  if (snapshot.devices.length === 0) return 'device_required';
  const receipt = snapshot.latestDeviceReceipt;
  if (!receipt || receipt.policyVersion !== policyVersion) return 'applying';
  if (receipt.outcome === 'applied' || receipt.outcome === 'released' || receipt.outcome === 'expired') return 'applied';
  return receipt.outcome === 'failed' ? 'failed' : 'applying';
}

function validateCommon(input: {
  targets: TemporaryFamilyScreenTimeTarget[];
  durationMinutes?: number;
  expiresAt?: string;
  operationId: string;
  timeBasis?: FamilyScreenTimeBasis;
  now?: Date;
}) {
  if (input.targets.length === 0) throw new Error('Choose at least one child');
  if (new Set(input.targets.map((item) => item.childMembershipId)).size !== input.targets.length) {
    throw new Error('Choose one selection per child');
  }
  const now = input.now ?? new Date();
  if (input.expiresAt != null) {
    const expiry = new Date(input.expiresAt);
    const durationMs = expiry.getTime() - now.getTime();
    if (!Number.isFinite(expiry.getTime()) || durationMs <= 0 || durationMs > 7 * 24 * 60 * 60_000) {
      throw new Error('Expiry must be between 1 minute and 7 days');
    }
  } else if (!Number.isInteger(input.durationMinutes) || Number(input.durationMinutes) < 1 || Number(input.durationMinutes) > 7 * 24 * 60) {
    throw new Error('Duration must be between 1 minute and 7 days');
  }
  if ((input.timeBasis ?? 'wall_clock') === 'foreground_usage') {
    throw new Error('Foreground usage budgets are not available yet');
  }
  if (!input.operationId.trim()) throw new Error('Operation ID is required');
  for (const target of input.targets) {
    if (!target.childMembershipId || !target.selectionId || !Number.isInteger(target.expectedVersion) || target.expectedVersion < 0) {
      throw new Error('Invalid family Screen Time target');
    }
  }
}

export async function applyTemporaryFamilyScreenTimeAccess(client: SupabaseClient, input: {
  action: FamilyScreenTimeAction;
  durationMinutes?: number;
  expiresAt?: string;
  targets: TemporaryFamilyScreenTimeTarget[];
  operationId: string;
  timeBasis?: FamilyScreenTimeBasis;
  now?: Date;
}) {
  validateCommon(input);
  const startsAt = input.now ?? new Date();
  const expiresAt = input.expiresAt != null
    ? new Date(input.expiresAt).toISOString()
    : new Date(startsAt.getTime() + Number(input.durationMinutes) * 60_000).toISOString();
  const raw = await applyFamilyScreenTimeOverrideBatchRpc(client, {
    items: input.targets,
    action: input.action,
    timeBasis: 'wall_clock',
    expiresAt,
    usageMinutes: null,
    operationId: input.operationId,
  });
  const applied = parseBatch(raw);
  if (applied.operationId !== input.operationId || applied.overrides.length !== input.targets.length) {
    throw new Error('Family Screen Time override result mismatch');
  }

  const targets = [];
  for (const override of applied.overrides) {
    const expected = input.targets.find((item) => item.childMembershipId === override.childMembershipId);
    if (!expected || expected.selectionId !== override.selectionId || override.action !== input.action) {
      throw new Error('Family Screen Time override target mismatch');
    }
    const snapshot = await fetchFamilyScreenTimeSnapshot(client, override.childMembershipId);
    if (snapshot.desiredPolicyVersion !== override.policyVersion) {
      throw new Error('Family Screen Time policy version mismatch');
    }
    targets.push({ ...override, deliveryState: deliveryState(snapshot, override.policyVersion) });
  }

  return {
    operationId: applied.operationId,
    action: input.action,
    scope: 'kwilt_family_restrictions' as const,
    expiresAt,
    targets,
  };
}

export async function cancelTemporaryFamilyScreenTimeAccess(client: SupabaseClient, input: {
  childMembershipId: string;
  overrideId: string;
  expectedVersion: number;
  operationId: string;
}) {
  const raw = await cancelFamilyScreenTimeOverrideRpc(client, input);
  if (!isRecord(raw) || !isString(raw.overrideId) || raw.overrideId !== input.overrideId
    || !isString(raw.childMembershipId) || raw.childMembershipId !== input.childMembershipId
    || raw.status !== 'cancelled' || !isNumber(raw.desiredPolicyVersion)
    || !isString(raw.operationId) || raw.operationId !== input.operationId) {
    throw new Error('Invalid family Screen Time cancellation result');
  }
  const snapshot = await fetchFamilyScreenTimeSnapshot(client, input.childMembershipId);
  if (snapshot.desiredPolicyVersion !== raw.desiredPolicyVersion) {
    throw new Error('Family Screen Time policy version mismatch');
  }
  return {
    overrideId: raw.overrideId,
    childMembershipId: raw.childMembershipId,
    desiredPolicyVersion: raw.desiredPolicyVersion,
    operationId: raw.operationId,
    deliveryState: deliveryState(snapshot, raw.desiredPolicyVersion),
  };
}

export async function createFamilyScreenTimePrerequisiteAgreement(client: SupabaseClient, input: {
  childMembershipId: string;
  targetSelectionId: string;
  expectedPolicyVersion: number;
  rule: FamilyScreenTimePrerequisiteRule;
  operationId: string;
}) {
  if (!input.childMembershipId || !input.targetSelectionId || !input.operationId.trim()
    || !Number.isInteger(input.expectedPolicyVersion) || input.expectedPolicyVersion < 0
    || !input.rule.prerequisiteActivity.selectionId
    || input.rule.prerequisiteActivity.selectionId === input.targetSelectionId) {
    throw new Error('Invalid family Screen Time prerequisite agreement');
  }
  const result = parseCreatedPrerequisiteAgreement(
    await createFamilyScreenTimePrerequisiteAgreementRpc(client, {
      childMembershipId: input.childMembershipId,
      targetSelectionId: input.targetSelectionId,
      prerequisiteSelectionId: input.rule.prerequisiteActivity.selectionId,
      expectedPolicyVersion: input.expectedPolicyVersion,
      rule: input.rule,
      operationId: input.operationId,
    }),
  );
  if (result.operationId !== input.operationId || result.childMembershipId !== input.childMembershipId
    || result.targetSelectionId !== input.targetSelectionId
    || result.prerequisiteSelectionId !== input.rule.prerequisiteActivity.selectionId) {
    throw new Error('Family Screen Time prerequisite agreement result mismatch');
  }
  const snapshot = await fetchFamilyScreenTimeSnapshot(client, input.childMembershipId);
  if (snapshot.desiredPolicyVersion !== result.desiredPolicyVersion) {
    throw new Error('Family Screen Time policy version mismatch');
  }
  return {
    ...result,
    deliveryState: deliveryState(snapshot, result.desiredPolicyVersion),
  };
}

export async function setFamilyScreenTimeAgreement(client: SupabaseClient, input: {
  childMembershipId: string;
  agreementId: string;
  selectionId: string;
  expectedVersion: number;
  rule: Record<string, unknown>;
  active: boolean;
  operationId: string;
}) {
  if (!input.childMembershipId || !input.agreementId || !input.selectionId || !input.operationId.trim()
    || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 1 || !isRecord(input.rule)) {
    throw new Error('Invalid family Screen Time agreement update');
  }
  const raw = await setFamilyScreenTimeAgreementRpc(client, input);
  if (!isRecord(raw) || raw.agreementId !== input.agreementId || raw.childMembershipId !== input.childMembershipId
    || raw.selectionId !== input.selectionId || !isRecord(raw.rule) || raw.active !== input.active
    || !isNumber(raw.version) || !isNumber(raw.desiredPolicyVersion) || raw.operationId !== input.operationId) {
    throw new Error('Invalid family Screen Time agreement result');
  }
  const snapshot = await fetchFamilyScreenTimeSnapshot(client, input.childMembershipId);
  if (snapshot.desiredPolicyVersion !== raw.desiredPolicyVersion) {
    throw new Error('Family Screen Time policy version mismatch');
  }
  return {
    agreementId: raw.agreementId as string,
    childMembershipId: raw.childMembershipId as string,
    selectionId: raw.selectionId as string,
    rule: raw.rule,
    active: raw.active,
    version: raw.version,
    desiredPolicyVersion: raw.desiredPolicyVersion,
    operationId: raw.operationId as string,
    deliveryState: deliveryState(snapshot, raw.desiredPolicyVersion),
  };
}

export async function decideFamilyScreenTimeAccessRequest(client: SupabaseClient, input: {
  childMembershipId: string;
  requestId: string;
  decision: 'approved' | 'denied';
  allowMinutes: number | null;
  expectedVersion: number;
  operationId: string;
}) {
  if (!input.childMembershipId || !input.requestId || !input.operationId.trim()
    || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 0
    || (input.decision === 'approved' && (!Number.isInteger(input.allowMinutes) || Number(input.allowMinutes) < 1 || Number(input.allowMinutes) > 1440))
    || (input.decision === 'denied' && input.allowMinutes !== null)) {
    throw new Error('Invalid family Screen Time request decision');
  }
  const raw = await decideFamilyScreenTimeAccessRequestRpc(client, input);
  if (!isRecord(raw) || raw.requestId !== input.requestId || raw.childMembershipId !== input.childMembershipId
    || raw.decision !== input.decision || !(raw.overrideId === null || isString(raw.overrideId))
    || !isNumber(raw.desiredPolicyVersion) || raw.operationId !== input.operationId) {
    throw new Error('Invalid family Screen Time request decision result');
  }
  if (input.decision === 'denied') {
    return {
      requestId: raw.requestId as string, childMembershipId: raw.childMembershipId as string,
      decision: raw.decision as 'denied', overrideId: raw.overrideId as string | null,
      desiredPolicyVersion: raw.desiredPolicyVersion, operationId: raw.operationId as string,
      deliveryState: 'not_applicable' as const,
    };
  }
  const snapshot = await fetchFamilyScreenTimeSnapshot(client, input.childMembershipId);
  if (snapshot.desiredPolicyVersion !== raw.desiredPolicyVersion) {
    throw new Error('Family Screen Time policy version mismatch');
  }
  return {
    requestId: raw.requestId as string, childMembershipId: raw.childMembershipId as string,
    decision: raw.decision as 'approved', overrideId: raw.overrideId as string | null,
    desiredPolicyVersion: raw.desiredPolicyVersion, operationId: raw.operationId as string,
    deliveryState: deliveryState(snapshot, raw.desiredPolicyVersion),
  };
}
