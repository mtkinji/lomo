import type { SupabaseClient } from '@supabase/supabase-js';

export type FamilyScreenTimeAction = 'block' | 'allow';
export type FamilyScreenTimeBasis = 'wall_clock' | 'foreground_usage';
export type FamilyScreenTimeDeliveryOutcome = 'received' | 'applied' | 'failed' | 'expired' | 'released';
export type FamilyScreenTimeRule = Record<string, unknown>;

export type FamilyScreenTimeSelection = {
  id: string;
  label: string;
  selectionRef: string;
  status: 'active' | 'revoked';
};

export type FamilyScreenTimeAgreement = {
  id: string;
  selectionId: string;
  rule: FamilyScreenTimeRule;
  active: boolean;
  version: number;
  updatedAt: string;
};

export type FamilyScreenTimeOverride = {
  id: string;
  selectionId: string;
  action: FamilyScreenTimeAction;
  timeBasis: FamilyScreenTimeBasis;
  startsAt: string;
  expiresAt: string | null;
  usageMinutes: number | null;
  provenance: 'caregiver_direct' | 'child_request_approved';
  policyVersion: number;
  status: 'active' | 'cancelled' | 'expired';
};

export type FamilyScreenTimeAccessRequest = {
  id: string;
  selectionId: string;
  kind: 'use_now' | 'more_time' | 'something_wrong';
  requestedMinutes: number | null;
  message: string | null;
  status: 'pending' | 'approved' | 'denied' | 'cancelled' | 'expired';
  expiresAt: string;
  createdAt: string;
};

export type FamilyScreenTimeDevice = {
  id: string;
  readiness: 'pending' | 'ready' | 'blocked' | 'released';
  authorizationStatus: 'unknown' | 'pending' | 'authorized' | 'denied' | 'revoked';
  lastSeenAt: string | null;
  releasedAt: string | null;
};

export type FamilyScreenTimeDeviceReceipt = {
  policyVersion: number;
  outcome: FamilyScreenTimeDeliveryOutcome;
  failureCode: string | null;
  occurredAt: string;
  deviceId: string;
};

export type FamilyScreenTimeSnapshot = {
  childMembershipId: string;
  subjectId: string | null;
  desiredPolicyVersion: number;
  selections: FamilyScreenTimeSelection[];
  agreements: FamilyScreenTimeAgreement[];
  activeOverrides: FamilyScreenTimeOverride[];
  pendingRequests: FamilyScreenTimeAccessRequest[];
  devices: FamilyScreenTimeDevice[];
  latestDeviceReceipt: FamilyScreenTimeDeviceReceipt | null;
};

export type FamilyScreenTimeOverrideBatchInput = {
  items: Array<{ childMembershipId: string; selectionId: string; expectedVersion: number }>;
  action: FamilyScreenTimeAction;
  timeBasis: FamilyScreenTimeBasis;
  expiresAt: string | null;
  usageMinutes: number | null;
  operationId: string;
};

type RpcResult = { data: unknown; error: { message?: string } | null };

async function callRpc(client: SupabaseClient, name: string, parameters: Record<string, unknown>): Promise<unknown> {
  const result = await (client.rpc as unknown as (
    functionName: string,
    args: Record<string, unknown>,
  ) => Promise<RpcResult>)(name, parameters);
  if (result.error) throw new Error(result.error.message || `Unable to run ${name}`);
  return result.data;
}

const isRecord = (value: unknown): value is Record<string, unknown> => value != null && typeof value === 'object' && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const isNullableString = (value: unknown): value is string | null => value === null || isString(value);
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const inSet = <T extends string>(value: unknown, options: readonly T[]): value is T => isString(value) && options.includes(value as T);

function validSelection(value: unknown): value is FamilyScreenTimeSelection {
  return isRecord(value) && isString(value.id) && isString(value.label) && isString(value.selectionRef)
    && inSet(value.status, ['active', 'revoked']);
}

function validAgreement(value: unknown): value is FamilyScreenTimeAgreement {
  return isRecord(value) && isString(value.id) && isString(value.selectionId) && isRecord(value.rule)
    && typeof value.active === 'boolean' && isNumber(value.version) && isString(value.updatedAt);
}

function validOverride(value: unknown): value is FamilyScreenTimeOverride {
  return isRecord(value) && isString(value.id) && isString(value.selectionId)
    && inSet(value.action, ['block', 'allow']) && inSet(value.timeBasis, ['wall_clock', 'foreground_usage'])
    && isString(value.startsAt) && isNullableString(value.expiresAt)
    && (value.usageMinutes === null || isNumber(value.usageMinutes))
    && inSet(value.provenance, ['caregiver_direct', 'child_request_approved'])
    && isNumber(value.policyVersion) && inSet(value.status, ['active', 'cancelled', 'expired']);
}

function validRequest(value: unknown): value is FamilyScreenTimeAccessRequest {
  return isRecord(value) && isString(value.id) && isString(value.selectionId)
    && inSet(value.kind, ['use_now', 'more_time', 'something_wrong'])
    && (value.requestedMinutes === null || isNumber(value.requestedMinutes))
    && isNullableString(value.message)
    && inSet(value.status, ['pending', 'approved', 'denied', 'cancelled', 'expired'])
    && isString(value.expiresAt) && isString(value.createdAt);
}

function validDevice(value: unknown): value is FamilyScreenTimeDevice {
  return isRecord(value) && isString(value.id) && inSet(value.readiness, ['pending', 'ready', 'blocked', 'released'])
    && inSet(value.authorizationStatus, ['unknown', 'pending', 'authorized', 'denied', 'revoked'])
    && isNullableString(value.lastSeenAt) && isNullableString(value.releasedAt);
}

function validReceipt(value: unknown): value is FamilyScreenTimeDeviceReceipt {
  return isRecord(value) && isNumber(value.policyVersion)
    && inSet(value.outcome, ['received', 'applied', 'failed', 'expired', 'released'])
    && isNullableString(value.failureCode) && isString(value.occurredAt) && isString(value.deviceId);
}

function parseSnapshot(value: unknown): FamilyScreenTimeSnapshot {
  if (!isRecord(value)
    || !isString(value.childMembershipId)
    || !isNumber(value.desiredPolicyVersion)
    || !(value.subjectId === null || isString(value.subjectId))
    || !Array.isArray(value.selections) || !value.selections.every(validSelection)
    || !Array.isArray(value.agreements) || !value.agreements.every(validAgreement)
    || !Array.isArray(value.activeOverrides) || !value.activeOverrides.every(validOverride)
    || !Array.isArray(value.pendingRequests) || !value.pendingRequests.every(validRequest)
    || !Array.isArray(value.devices) || !value.devices.every(validDevice)
    || !(value.latestDeviceReceipt === null || validReceipt(value.latestDeviceReceipt))) {
    throw new Error('Invalid family Screen Time snapshot');
  }
  return value as FamilyScreenTimeSnapshot;
}

export async function fetchFamilyScreenTimeSnapshot(client: SupabaseClient, childMembershipId: string) {
  const snapshot = parseSnapshot(await callRpc(client, 'get_kwilt_family_screen_time_snapshot', {
    p_child_membership_id: childMembershipId,
  }));
  if (snapshot.childMembershipId !== childMembershipId) throw new Error('Family Screen Time child mismatch');
  return snapshot;
}

export function saveFamilyScreenTimeSelectionRpc(client: SupabaseClient, input: {
  childMembershipId: string; label: string; selectionRef: string; operationId: string;
}) {
  return callRpc(client, 'save_kwilt_family_screen_time_selection', {
    p_child_membership_id: input.childMembershipId, p_label: input.label.trim(),
    p_selection_ref: input.selectionRef, p_operation_id: input.operationId,
  });
}

export function setFamilyScreenTimeAgreementRpc(client: SupabaseClient, input: {
  childMembershipId: string; agreementId: string | null; selectionId: string;
  expectedVersion: number; rule: FamilyScreenTimeRule; active: boolean; operationId: string;
}) {
  return callRpc(client, 'set_kwilt_family_screen_time_agreement', {
    p_child_membership_id: input.childMembershipId, p_agreement_id: input.agreementId,
    p_selection_id: input.selectionId, p_expected_version: input.expectedVersion,
    p_rule: input.rule, p_active: input.active, p_operation_id: input.operationId,
  });
}

export function applyFamilyScreenTimeOverrideBatchRpc(client: SupabaseClient, input: FamilyScreenTimeOverrideBatchInput) {
  return callRpc(client, 'apply_kwilt_family_screen_time_override_batch', {
    p_items: input.items, p_action: input.action, p_time_basis: input.timeBasis,
    p_expires_at: input.expiresAt, p_usage_minutes: input.usageMinutes, p_operation_id: input.operationId,
  });
}

export function cancelFamilyScreenTimeOverrideRpc(client: SupabaseClient, input: {
  childMembershipId: string; overrideId: string; expectedVersion: number; operationId: string;
}) {
  return callRpc(client, 'cancel_kwilt_family_screen_time_override', {
    p_child_membership_id: input.childMembershipId, p_override_id: input.overrideId,
    p_expected_version: input.expectedVersion, p_operation_id: input.operationId,
  });
}

export function createFamilyScreenTimeAccessRequestRpc(client: SupabaseClient, input: {
  childMembershipId: string; selectionId: string; kind: FamilyScreenTimeAccessRequest['kind'];
  requestedMinutes: number; message: string | null; operationId: string;
}) {
  return callRpc(client, 'create_kwilt_family_screen_time_access_request', {
    p_child_membership_id: input.childMembershipId, p_selection_id: input.selectionId,
    p_kind: input.kind, p_requested_minutes: input.requestedMinutes,
    p_message: input.message, p_operation_id: input.operationId,
  });
}

export function decideFamilyScreenTimeAccessRequestRpc(client: SupabaseClient, input: {
  childMembershipId: string; requestId: string; decision: 'approved' | 'denied';
  allowMinutes: number | null; expectedVersion: number; operationId: string;
}) {
  return callRpc(client, 'decide_kwilt_family_screen_time_access_request', {
    p_child_membership_id: input.childMembershipId, p_request_id: input.requestId,
    p_decision: input.decision, p_allow_minutes: input.allowMinutes,
    p_expected_version: input.expectedVersion, p_operation_id: input.operationId,
  });
}

export function recordFamilyScreenTimeDeviceReceiptRpc(client: SupabaseClient, input: {
  childMembershipId: string; installId: string; policyVersion: number;
  outcome: FamilyScreenTimeDeliveryOutcome; occurredAt: string; operationId: string; failureCode: string | null;
}) {
  return callRpc(client, 'record_kwilt_family_screen_time_device_receipt', {
    p_child_membership_id: input.childMembershipId, p_install_id: input.installId,
    p_policy_version: input.policyVersion, p_outcome: input.outcome,
    p_occurred_at: input.occurredAt, p_operation_id: input.operationId,
    p_failure_code: input.failureCode,
  });
}
