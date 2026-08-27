import type { SupabaseClient } from '@supabase/supabase-js';
import {
  applyTemporaryFamilyScreenTimeAccess,
  cancelTemporaryFamilyScreenTimeAccess,
  decideFamilyScreenTimeAccessRequest,
  setFamilyScreenTimeAgreement,
} from './familyScreenTimeCommands';

const now = new Date('2026-07-30T10:00:00.000Z');
const target = (childMembershipId: string, selectionId: string, expectedVersion: number) => ({
  childMembershipId, selectionId, expectedVersion,
});

const snapshot = (childMembershipId: string, desiredPolicyVersion: number, receiptVersion?: number) => ({
  childMembershipId,
  subjectId: `subject-${childMembershipId}`,
  desiredPolicyVersion,
  selections: [{ id: `selection-${childMembershipId}`, label: 'Brawl Stars', selectionRef: `ref-${childMembershipId}`, status: 'active' }],
  agreements: [],
  activeOverrides: [],
  pendingRequests: [],
  devices: [{ id: `device-${childMembershipId}`, readiness: 'ready', authorizationStatus: 'authorized', lastSeenAt: now.toISOString(), releasedAt: null }],
  latestDeviceReceipt: receiptVersion == null ? null : {
    policyVersion: receiptVersion, outcome: 'applied', failureCode: null,
    occurredAt: now.toISOString(), deviceId: `device-${childMembershipId}`,
  },
});

function clientWithSequence(results: unknown[]) {
  const rpc = jest.fn(async () => ({ data: results.shift() ?? null, error: null }));
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

describe('family Screen Time direct commands', () => {
  it('blocks one saved app selection for several children in one atomic operation', async () => {
    const batch = {
      operationId: 'chat:run-1:1',
      overrides: [
        { overrideId: 'override-c', childMembershipId: 'charlie', selectionId: 'selection-charlie', action: 'block', timeBasis: 'wall_clock', startsAt: now.toISOString(), expiresAt: '2026-07-30T13:00:00.000Z', policyVersion: 8 },
        { overrideId: 'override-g', childMembershipId: 'grant', selectionId: 'selection-grant', action: 'block', timeBasis: 'wall_clock', startsAt: now.toISOString(), expiresAt: '2026-07-30T13:00:00.000Z', policyVersion: 5 },
      ],
    };
    const { client, rpc } = clientWithSequence([batch, snapshot('charlie', 8), snapshot('grant', 5)]);

    await expect(applyTemporaryFamilyScreenTimeAccess(client, {
      action: 'block', durationMinutes: 180,
      targets: [target('charlie', 'selection-charlie', 7), target('grant', 'selection-grant', 4)],
      operationId: 'chat:run-1:1', now,
    })).resolves.toMatchObject({
      action: 'block', expiresAt: '2026-07-30T13:00:00.000Z',
      targets: [
        { childMembershipId: 'charlie', deliveryState: 'applying' },
        { childMembershipId: 'grant', deliveryState: 'applying' },
      ],
    });
    expect(rpc).toHaveBeenNthCalledWith(1, 'apply_kwilt_family_screen_time_override_batch', {
      p_items: [
        { childMembershipId: 'charlie', selectionId: 'selection-charlie', expectedVersion: 7 },
        { childMembershipId: 'grant', selectionId: 'selection-grant', expectedVersion: 4 },
      ],
      p_action: 'block', p_time_basis: 'wall_clock', p_expires_at: '2026-07-30T13:00:00.000Z',
      p_usage_minutes: null, p_operation_id: 'chat:run-1:1',
    });
  });

  it('temporarily allows an app through named Kwilt family restrictions', async () => {
    const batch = { operationId: 'chat:run-2:1', overrides: [{
      overrideId: 'override-c', childMembershipId: 'charlie', selectionId: 'selection-charlie',
      action: 'allow', timeBasis: 'wall_clock', startsAt: now.toISOString(),
      expiresAt: '2026-07-30T10:30:00.000Z', policyVersion: 8,
    }] };
    const { client } = clientWithSequence([batch, snapshot('charlie', 8, 8)]);
    await expect(applyTemporaryFamilyScreenTimeAccess(client, {
      action: 'allow', durationMinutes: 30,
      targets: [target('charlie', 'selection-charlie', 7)], operationId: 'chat:run-2:1', now,
    })).resolves.toMatchObject({
      action: 'allow', scope: 'kwilt_family_restrictions',
      targets: [{ childMembershipId: 'charlie', deliveryState: 'applied' }],
    });
  });

  it('preserves an explicitly confirmed expiry instead of extending it after approval delay', async () => {
    const expiresAt = '2026-07-30T10:30:00.000Z';
    const approvalTime = new Date('2026-07-30T10:05:00.000Z');
    const batch = { operationId: 'chat:run-2:exact', overrides: [{
      overrideId: 'override-c', childMembershipId: 'charlie', selectionId: 'selection-charlie',
      action: 'allow', timeBasis: 'wall_clock', startsAt: approvalTime.toISOString(),
      expiresAt, policyVersion: 8,
    }] };
    const { client, rpc } = clientWithSequence([batch, snapshot('charlie', 8)]);

    await expect(applyTemporaryFamilyScreenTimeAccess(client, {
      action: 'allow', expiresAt,
      targets: [target('charlie', 'selection-charlie', 7)],
      operationId: 'chat:run-2:exact', now: approvalTime,
    })).resolves.toMatchObject({ expiresAt });
    expect(rpc).toHaveBeenNthCalledWith(1, 'apply_kwilt_family_screen_time_override_batch',
      expect.objectContaining({ p_expires_at: expiresAt }));
  });

  it('reports device setup separately from saved and applied truth', async () => {
    const batch = { operationId: 'op:1', overrides: [{
      overrideId: 'override-1', childMembershipId: 'charlie', selectionId: 'selection-charlie',
      action: 'block', timeBasis: 'wall_clock', startsAt: now.toISOString(),
      expiresAt: '2026-07-30T11:00:00.000Z', policyVersion: 1,
    }] };
    const noDevice = { ...snapshot('charlie', 1), devices: [] };
    const { client } = clientWithSequence([batch, noDevice]);
    await expect(applyTemporaryFamilyScreenTimeAccess(client, {
      action: 'block', durationMinutes: 60,
      targets: [target('charlie', 'selection-charlie', 0)], operationId: 'op:1', now,
    })).resolves.toMatchObject({ targets: [{ deliveryState: 'device_required' }] });
  });

  it('rejects duplicate children, unsafe durations, and usage budgets before the server', async () => {
    const { client, rpc } = clientWithSequence([]);
    await expect(applyTemporaryFamilyScreenTimeAccess(client, {
      action: 'block', durationMinutes: 30,
      targets: [target('charlie', 'a', 1), target('charlie', 'b', 1)], operationId: 'op:1', now,
    })).rejects.toThrow('one selection per child');
    await expect(applyTemporaryFamilyScreenTimeAccess(client, {
      action: 'allow', durationMinutes: 0,
      targets: [target('charlie', 'a', 1)], operationId: 'op:2', now,
    })).rejects.toThrow('between 1 minute and 7 days');
    await expect(applyTemporaryFamilyScreenTimeAccess(client, {
      action: 'allow', durationMinutes: 30, timeBasis: 'foreground_usage',
      targets: [target('charlie', 'a', 1)], operationId: 'op:3', now,
    })).rejects.toThrow('Foreground usage budgets are not available yet');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('cancels one override and treats cleanup as applying until the device acknowledges it', async () => {
    const cancelled = { overrideId: 'override-1', childMembershipId: 'charlie', status: 'cancelled', desiredPolicyVersion: 9, operationId: 'op:cancel' };
    const { client } = clientWithSequence([cancelled, snapshot('charlie', 9, 8)]);
    await expect(cancelTemporaryFamilyScreenTimeAccess(client, {
      childMembershipId: 'charlie', overrideId: 'override-1', expectedVersion: 8, operationId: 'op:cancel',
    })).resolves.toMatchObject({ desiredPolicyVersion: 9, deliveryState: 'applying' });
  });

  it('updates or deactivates an exact agreement version and reports device delivery separately', async () => {
    const updated = {
      agreementId: 'agreement-1', childMembershipId: 'charlie', selectionId: 'selection-charlie',
      rule: { weekdays: [1, 2, 3, 4, 5], startMinute: 900, endMinute: 1140, dailyLimitMinutes: 20 },
      active: true, version: 3, desiredPolicyVersion: 8, operationId: 'op:update',
    };
    const { client, rpc } = clientWithSequence([updated, snapshot('charlie', 8)]);
    await expect(setFamilyScreenTimeAgreement(client, {
      childMembershipId: 'charlie', agreementId: 'agreement-1', selectionId: 'selection-charlie',
      expectedVersion: 2, rule: updated.rule, active: true, operationId: 'op:update',
    })).resolves.toMatchObject({ version: 3, deliveryState: 'applying' });
    expect(rpc).toHaveBeenNthCalledWith(1, 'set_kwilt_family_screen_time_agreement', expect.objectContaining({
      p_agreement_id: 'agreement-1', p_expected_version: 2, p_active: true,
    }));
  });

  it('decides one pending child request and keeps denial separate from device application', async () => {
    const denied = {
      requestId: 'request-1', childMembershipId: 'charlie', decision: 'denied', overrideId: null,
      desiredPolicyVersion: 7, operationId: 'op:deny',
    };
    const { client } = clientWithSequence([denied, snapshot('charlie', 7, 7)]);
    await expect(decideFamilyScreenTimeAccessRequest(client, {
      childMembershipId: 'charlie', requestId: 'request-1', decision: 'denied',
      allowMinutes: null, expectedVersion: 7, operationId: 'op:deny',
    })).resolves.toMatchObject({ decision: 'denied', deliveryState: 'not_applicable' });
  });
});
