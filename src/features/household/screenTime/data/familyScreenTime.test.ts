import type { SupabaseClient } from '@supabase/supabase-js';
import {
  applyFamilyScreenTimeOverrideBatchRpc,
  cancelFamilyScreenTimeOverrideRpc,
  createFamilyScreenTimeAccessRequestRpc,
  createFamilyScreenTimePrerequisiteAgreementRpc,
  decideFamilyScreenTimeAccessRequestRpc,
  fetchFamilyScreenTimeSnapshot,
  recordFamilyScreenTimeDeviceReceiptRpc,
  saveFamilyScreenTimeSelectionRpc,
  setFamilyScreenTimeAgreementRpc,
} from './familyScreenTime';

const rule = { weekdays: [1, 2, 3, 4, 5], startMinute: 960, endMinute: 1140 };
const snapshot = {
  childMembershipId: 'child-1',
  subjectId: 'subject-1',
  desiredPolicyVersion: 7,
  selections: [{ id: 'selection-1', label: 'Brawl Stars', selectionRef: 'native-ref-1', status: 'active' }],
  agreements: [{
    id: 'agreement-1', selectionId: 'selection-1', rule, active: true,
    version: 4, updatedAt: '2026-07-30T10:00:00.000Z',
  }],
  activeOverrides: [{
    id: 'override-1', selectionId: 'selection-1', action: 'block', timeBasis: 'wall_clock',
    startsAt: '2026-07-30T10:00:00.000Z', expiresAt: '2026-07-30T13:00:00.000Z',
    usageMinutes: null, provenance: 'caregiver_direct', policyVersion: 7, status: 'active',
  }],
  pendingRequests: [],
  devices: [{
    id: 'device-1', readiness: 'ready', authorizationStatus: 'authorized',
    lastSeenAt: '2026-07-30T10:01:00.000Z', releasedAt: null,
  }],
  latestDeviceReceipt: {
    policyVersion: 7, outcome: 'applied', failureCode: null,
    occurredAt: '2026-07-30T10:01:00.000Z', deviceId: 'device-1',
  },
};

function clientReturning(data: unknown, error: { message?: string } | null = null) {
  const rpc = jest.fn().mockResolvedValue({ data, error });
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

describe('family Screen Time data boundary', () => {
  it('parses the complete authoritative child snapshot', async () => {
    const { client, rpc } = clientReturning(snapshot);
    await expect(fetchFamilyScreenTimeSnapshot(client, 'child-1')).resolves.toEqual(snapshot);
    expect(rpc).toHaveBeenCalledWith('get_kwilt_family_screen_time_snapshot', {
      p_child_membership_id: 'child-1',
    });
  });

  it('accepts a not-yet-created child subject', async () => {
    const empty = { ...snapshot, subjectId: null, desiredPolicyVersion: 0, selections: [], agreements: [], activeOverrides: [], devices: [], latestDeviceReceipt: null };
    await expect(fetchFamilyScreenTimeSnapshot(clientReturning(empty).client, 'child-1')).resolves.toEqual(empty);
  });

  it('rejects malformed policy data and a response for another child', async () => {
    await expect(fetchFamilyScreenTimeSnapshot(
      clientReturning({ ...snapshot, desiredPolicyVersion: '7' }).client, 'child-1',
    )).rejects.toThrow('Invalid family Screen Time snapshot');
    await expect(fetchFamilyScreenTimeSnapshot(
      clientReturning({ ...snapshot, childMembershipId: 'child-2' }).client, 'child-1',
    )).rejects.toThrow('Family Screen Time child mismatch');
  });

  it('uses exact caregiver RPC shapes for selections, agreements, overrides, and cancellation', async () => {
    const { client, rpc } = clientReturning({});
    await saveFamilyScreenTimeSelectionRpc(client, {
      childMembershipId: 'child-1', label: 'Brawl Stars', selectionRef: 'native-ref-1', operationId: 'op:1',
    });
    await setFamilyScreenTimeAgreementRpc(client, {
      childMembershipId: 'child-1', agreementId: null, selectionId: 'selection-1', expectedVersion: 0,
      rule, active: true, operationId: 'op:2',
    });
    await applyFamilyScreenTimeOverrideBatchRpc(client, {
      items: [{ childMembershipId: 'child-1', selectionId: 'selection-1', expectedVersion: 7 }],
      action: 'block', timeBasis: 'wall_clock', expiresAt: '2026-07-30T13:00:00.000Z',
      usageMinutes: null, operationId: 'op:3',
    });
    await cancelFamilyScreenTimeOverrideRpc(client, {
      childMembershipId: 'child-1', overrideId: 'override-1', expectedVersion: 8, operationId: 'op:4',
    });

    expect(rpc).toHaveBeenNthCalledWith(1, 'save_kwilt_family_screen_time_selection', {
      p_child_membership_id: 'child-1', p_label: 'Brawl Stars', p_selection_ref: 'native-ref-1', p_operation_id: 'op:1',
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'set_kwilt_family_screen_time_agreement', {
      p_child_membership_id: 'child-1', p_agreement_id: null, p_selection_id: 'selection-1',
      p_expected_version: 0, p_rule: rule, p_active: true, p_operation_id: 'op:2',
    });
    expect(rpc).toHaveBeenNthCalledWith(3, 'apply_kwilt_family_screen_time_override_batch', {
      p_items: [{ childMembershipId: 'child-1', selectionId: 'selection-1', expectedVersion: 7 }],
      p_action: 'block', p_time_basis: 'wall_clock', p_expires_at: '2026-07-30T13:00:00.000Z',
      p_usage_minutes: null, p_operation_id: 'op:3',
    });
    expect(rpc).toHaveBeenNthCalledWith(4, 'cancel_kwilt_family_screen_time_override', {
      p_child_membership_id: 'child-1', p_override_id: 'override-1', p_expected_version: 8, p_operation_id: 'op:4',
    });
  });

  it('uses exact child-request, decision, and receipt RPC shapes', async () => {
    const { client, rpc } = clientReturning({});
    await createFamilyScreenTimeAccessRequestRpc(client, {
      childMembershipId: 'child-1', selectionId: 'selection-1', kind: 'use_now',
      requestedMinutes: 30, message: null, operationId: 'request:1',
    });
    await decideFamilyScreenTimeAccessRequestRpc(client, {
      childMembershipId: 'child-1', requestId: 'request-1', decision: 'approved',
      allowMinutes: 30, expectedVersion: 7, operationId: 'decision:1',
    });
    await recordFamilyScreenTimeDeviceReceiptRpc(client, {
      childMembershipId: 'child-1', installId: 'install-1', policyVersion: 8,
      outcome: 'applied', occurredAt: '2026-07-30T10:01:00.000Z',
      operationId: 'device:8', failureCode: null,
    });
    expect(rpc).toHaveBeenNthCalledWith(1, 'create_kwilt_family_screen_time_access_request', {
      p_child_membership_id: 'child-1', p_selection_id: 'selection-1', p_kind: 'use_now',
      p_requested_minutes: 30, p_message: null, p_operation_id: 'request:1',
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'decide_kwilt_family_screen_time_access_request', {
      p_child_membership_id: 'child-1', p_request_id: 'request-1', p_decision: 'approved',
      p_allow_minutes: 30, p_expected_version: 7, p_operation_id: 'decision:1',
    });
    expect(rpc).toHaveBeenNthCalledWith(3, 'record_kwilt_family_screen_time_device_receipt', {
      p_child_membership_id: 'child-1', p_install_id: 'install-1', p_policy_version: 8,
      p_outcome: 'applied', p_occurred_at: '2026-07-30T10:01:00.000Z',
      p_operation_id: 'device:8', p_failure_code: null,
    });
  });

  it('uses an atomic versioned RPC for a prerequisite agreement', async () => {
    const { client, rpc } = clientReturning({});
    const prerequisiteRule = {
      weekdays: [0, 1, 2, 3, 4, 5, 6], startMinute: 0, endMinute: 1439,
      dailyLimitMinutes: null,
      prerequisiteActivity: { selectionId: 'selection-gospel', thresholdMinutes: 5, reset: 'daily' as const },
    };
    await createFamilyScreenTimePrerequisiteAgreementRpc(client, {
      childMembershipId: 'child-1', targetSelectionId: 'selection-games',
      prerequisiteSelectionId: 'selection-gospel', expectedPolicyVersion: 7,
      rule: prerequisiteRule, operationId: 'agreement:1',
    });
    expect(rpc).toHaveBeenCalledWith('create_kwilt_family_screen_time_prerequisite_agreement', {
      p_child_membership_id: 'child-1', p_target_selection_id: 'selection-games',
      p_prerequisite_selection_id: 'selection-gospel', p_expected_policy_version: 7,
      p_rule: prerequisiteRule, p_operation_id: 'agreement:1',
    });
  });

  it('preserves server authorization and stale-version errors', async () => {
    const { client } = clientReturning(null, { message: 'family_screen_time_version_mismatch' });
    await expect(applyFamilyScreenTimeOverrideBatchRpc(client, {
      items: [{ childMembershipId: 'child-1', selectionId: 'selection-1', expectedVersion: 7 }],
      action: 'allow', timeBasis: 'wall_clock', expiresAt: '2026-07-30T11:00:00.000Z',
      usageMinutes: null, operationId: 'op:5',
    })).rejects.toThrow('family_screen_time_version_mismatch');
  });
});
