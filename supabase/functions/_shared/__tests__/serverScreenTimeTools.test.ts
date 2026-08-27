import { executeServerScreenTimeTool } from '../serverScreenTimeTools.ts';

const projection = {
  children: [{
    membershipId: 'charlie', displayName: 'Charlie', desiredPolicyVersion: 7,
    selections: [{
      id: 'selection-1', label: 'Brawl Stars', status: 'active', selectionRef: 'must-not-escape',
    }],
    agreements: [{
      id: 'agreement-1', selectionId: 'selection-1', active: true, version: 2,
      updatedAt: '2026-08-27T12:00:00.000Z',
      rule: {
        weekdays: [1, 2, 3, 4, 5], startMinute: 960, endMinute: 1140,
        dailyLimitMinutes: 30,
        prerequisiteActivity: { selectionId: 'selection-reading', thresholdMinutes: 10, reset: 'daily', selectionRef: 'must-not-escape' },
        selectionRef: 'must-not-escape',
      },
    }], activeOverrides: [{
      id: 'override-1', selectionId: 'selection-1', action: 'block', timeBasis: 'wall_clock',
      startsAt: '2026-08-27T11:00:00.000Z', expiresAt: '2026-08-27T15:00:00.000Z',
      usageMinutes: null, provenance: 'caregiver_direct', policyVersion: 7, status: 'active',
    }], pendingRequests: [{
      id: 'request-1', selectionId: 'selection-1', kind: 'more_time', requestedMinutes: 30,
      message: null, status: 'pending', expiresAt: '2026-08-27T14:00:00.000Z',
      createdAt: '2026-08-27T11:30:00.000Z',
    }],
    devices: [{
      id: 'device-1', readiness: 'ready', authorizationStatus: 'authorized',
      lastSeenAt: null, releasedAt: null,
    }],
    latestDeviceReceipt: null,
    subjectId: 'must-not-escape',
  }],
};

describe('executeServerScreenTimeTool', () => {
  it('stages personal rule control as a redacted device-owned handoff', async () => {
    const stageDeviceAction = jest.fn(async () => undefined);
    await expect(executeServerScreenTimeTool({
      client: {}, userId: 'user-1', stageDeviceAction,
      call: {
        id: 'personal-update', toolId: 'screen_time.personal_rule.update', arguments: {
          ruleId: 'rule-1', expectedUpdatedAt: '2026-08-27T12:00:00.000Z',
          fields: { limitMinutes: 20 },
        },
      },
    })).resolves.toMatchObject({
      status: 'pending_client_action', provider: 'device',
      request: { actionType: 'open_personal_screen_time_rule', targetId: 'rule-1' },
    });
    expect(JSON.stringify(stageDeviceAction.mock.calls)).not.toMatch(/token|selectionRef/i);
  });

  it('reads only explicitly authorized child policy projections', async () => {
    const rpc = jest.fn(async () => ({ data: projection, error: null }));
    const result = await executeServerScreenTimeTool({
      client: { rpc }, userId: 'user-1',
      call: {
        id: 'read-1', toolId: 'screen_time.read',
        arguments: { childMembershipIds: ['charlie'] },
      },
    });

    expect(rpc).toHaveBeenCalledWith('get_kwilt_agent_screen_time_snapshot', {
      p_user_id: 'user-1', p_child_membership_ids: ['charlie'],
    });
    expect(result).toEqual({
      status: 'completed', receipt: null,
      output: {
        children: [{
          membershipId: 'charlie', displayName: 'Charlie', desiredPolicyVersion: 7,
          selections: [{ id: 'selection-1', label: 'Brawl Stars', status: 'active' }],
          agreements: [{
            id: 'agreement-1', selectionId: 'selection-1', active: true, version: 2,
            updatedAt: '2026-08-27T12:00:00.000Z',
            rule: {
              weekdays: [1, 2, 3, 4, 5], startMinute: 960, endMinute: 1140,
              dailyLimitMinutes: 30,
              prerequisiteActivity: { selectionId: 'selection-reading', thresholdMinutes: 10, reset: 'daily' },
            },
          }], activeOverrides: [{
            id: 'override-1', selectionId: 'selection-1', action: 'block', timeBasis: 'wall_clock',
            startsAt: '2026-08-27T11:00:00.000Z', expiresAt: '2026-08-27T15:00:00.000Z',
            usageMinutes: null, provenance: 'caregiver_direct', policyVersion: 7, status: 'active',
          }], pendingRequests: [{
            id: 'request-1', selectionId: 'selection-1', kind: 'more_time', requestedMinutes: 30,
            message: null, status: 'pending', expiresAt: '2026-08-27T14:00:00.000Z',
            createdAt: '2026-08-27T11:30:00.000Z',
          }],
          devices: [{
            readiness: 'ready', authorizationStatus: 'authorized',
            lastSeenAt: null, releasedAt: null,
          }],
          latestDeviceReceipt: null,
        }],
      },
    });
    expect(JSON.stringify(result)).not.toContain('must-not-escape');
    expect(JSON.stringify(result)).not.toContain('device-1');
  });

  it('passes null to request every authorized child when no filter is supplied', async () => {
    const rpc = jest.fn(async () => ({ data: { children: [] }, error: null }));
    await executeServerScreenTimeTool({
      client: { rpc }, userId: 'user-1',
      call: { id: 'read-all', toolId: 'screen_time.read', arguments: {} },
    });
    expect(rpc).toHaveBeenCalledWith('get_kwilt_agent_screen_time_snapshot', {
      p_user_id: 'user-1', p_child_membership_ids: null,
    });
  });

  it('rejects malformed child filters before database access', async () => {
    const rpc = jest.fn();
    await expect(executeServerScreenTimeTool({
      client: { rpc }, userId: 'user-1',
      call: { id: 'read-invalid', toolId: 'screen_time.read', arguments: { childMembershipIds: [''] } },
    })).resolves.toEqual({
      status: 'failed', code: 'invalid_screen_time_children',
      message: 'Choose up to 20 valid children to read.', retryable: false,
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('keeps database errors bounded', async () => {
    const rpc = jest.fn(async () => ({ data: null, error: { message: 'private database detail' } }));
    await expect(executeServerScreenTimeTool({
      client: { rpc }, userId: 'user-1',
      call: { id: 'read-failed', toolId: 'screen_time.read', arguments: {} },
    })).resolves.toEqual({
      status: 'failed', code: 'screen_time_read_failed',
      message: 'Kwilt could not read the current Screen Time state.', retryable: true,
    });
  });

  it('stages an authorized temporary block for explicit native review', async () => {
    const rpc = jest.fn(async () => ({ data: projection, error: null }));
    const stageProposal = jest.fn(async () => ({
      id: 'proposal-block', status: 'pending' as const, version: 1, replayed: false,
    }));
    await expect(executeServerScreenTimeTool({
      client: { rpc }, userId: 'user-1', stageProposal, now: new Date('2026-08-27T12:00:00.000Z'),
      call: {
        id: 'block-1', toolId: 'screen_time.override.block', arguments: {
          targets: [{ childMembershipId: 'charlie', selectionId: 'selection-1', expectedVersion: 7 }],
          timeBasis: 'wall_clock', expiresAt: '2026-08-27T15:00:00.000Z',
        },
      },
    })).resolves.toEqual({
      status: 'proposed',
      proposal: { id: 'proposal-block', status: 'pending', version: 1, replayed: false },
    });
    expect(stageProposal).toHaveBeenCalledWith({
      capabilityId: 'screenTime', title: 'Block Brawl Stars',
      body: expect.stringContaining('Charlie'),
      operation: {
        type: 'block_family_screen_time_selection', targetType: null, targetId: null,
        summary: 'Block Brawl Stars for Charlie until 2026-08-27T15:00:00.000Z',
        payload: {
          targets: [{ childMembershipId: 'charlie', selectionId: 'selection-1', expectedVersion: 7 }],
          timeBasis: 'wall_clock', expiresAt: '2026-08-27T15:00:00.000Z',
        },
      },
    });
  });

  it('rejects a stale or unauthorized temporary control before proposal persistence', async () => {
    const rpc = jest.fn(async () => ({ data: projection, error: null }));
    const stageProposal = jest.fn();
    await expect(executeServerScreenTimeTool({
      client: { rpc }, userId: 'user-1', stageProposal, now: new Date('2026-08-27T12:00:00.000Z'),
      call: {
        id: 'allow-stale', toolId: 'screen_time.override.allow', arguments: {
          targets: [{ childMembershipId: 'charlie', selectionId: 'missing', expectedVersion: 6 }],
          timeBasis: 'wall_clock', expiresAt: '2026-08-27T15:00:00.000Z',
        },
      },
    })).resolves.toEqual({
      status: 'failed', code: 'screen_time_target_stale',
      message: 'A child, saved app selection, or Screen Time version changed. Refresh before continuing.',
      retryable: true,
    });
    expect(stageProposal).not.toHaveBeenCalled();
  });

  it('stages an authorized daily prerequisite agreement for explicit native review', async () => {
    const agreementProjection = {
      children: [{
        ...projection.children[0],
        selections: [
          { id: 'selection-reading', label: 'Gospel Library', status: 'active' },
          { id: 'selection-games', label: 'Games', status: 'active' },
        ],
      }],
    };
    const rpc = jest.fn(async () => ({ data: agreementProjection, error: null }));
    const stageProposal = jest.fn(async () => ({
      id: 'proposal-agreement', status: 'pending' as const, version: 1, replayed: false,
    }));
    await expect(executeServerScreenTimeTool({
      client: { rpc }, userId: 'user-1', stageProposal,
      call: {
        id: 'agreement-1', toolId: 'screen_time.agreement.create', arguments: {
          childMembershipId: 'charlie', targetSelectionId: 'selection-games', expectedPolicyVersion: 7,
          rule: {
            weekdays: [0, 1, 2, 3, 4, 5, 6], startMinute: 0, endMinute: 1439,
            dailyLimitMinutes: null,
            prerequisiteActivity: { selectionId: 'selection-reading', thresholdMinutes: 5, reset: 'daily' },
          },
        },
      },
    })).resolves.toMatchObject({ status: 'proposed' });
    expect(stageProposal).toHaveBeenCalledWith(expect.objectContaining({
      capabilityId: 'screenTime', title: 'Use Gospel Library before Games',
      operation: expect.objectContaining({
        type: 'create_family_screen_time_prerequisite_agreement',
        payload: expect.objectContaining({ childMembershipId: 'charlie', targetSelectionId: 'selection-games' }),
      }),
    }));
  });

  it.each([
    ['screen_time.agreement.update', {
      childMembershipId: 'charlie', agreementId: 'agreement-1', selectionId: 'selection-1', expectedVersion: 2,
      rule: { weekdays: [1, 2, 3, 4, 5], startMinute: 900, endMinute: 1140, dailyLimitMinutes: 20 },
    }, 'update_family_screen_time_agreement'],
    ['screen_time.agreement.deactivate', {
      childMembershipId: 'charlie', agreementId: 'agreement-1', selectionId: 'selection-1', expectedVersion: 2,
      currentRule: {
        weekdays: [1, 2, 3, 4, 5], startMinute: 960, endMinute: 1140, dailyLimitMinutes: 30,
        prerequisiteActivity: { selectionId: 'selection-reading', thresholdMinutes: 10, reset: 'daily' },
      },
    }, 'deactivate_family_screen_time_agreement'],
    ['screen_time.override.cancel', {
      childMembershipId: 'charlie', overrideId: 'override-1', expectedVersion: 7,
    }, 'cancel_family_screen_time_override'],
    ['screen_time.request.decide', {
      childMembershipId: 'charlie', requestId: 'request-1', decision: 'approved', allowMinutes: 30, expectedVersion: 7,
    }, 'decide_family_screen_time_request'],
  ])('stages %s as a reviewed authoritative proposal', async (toolId, args, operationType) => {
    const rpc = jest.fn(async () => ({ data: projection, error: null }));
    const stageProposal = jest.fn(async () => ({
      id: 'proposal-next', status: 'pending' as const, version: 1, replayed: false,
    }));
    await expect(executeServerScreenTimeTool({
      client: { rpc }, userId: 'user-1', stageProposal,
      now: new Date('2026-08-27T12:00:00.000Z'),
      call: { id: `call-${toolId}`, toolId, arguments: args },
    })).resolves.toMatchObject({ status: 'proposed' });
    expect(stageProposal).toHaveBeenCalledWith(expect.objectContaining({
      capabilityId: 'screenTime', operation: expect.objectContaining({ type: operationType }),
    }));
  });

  it('rejects an agreement update that requires its target selection before itself', async () => {
    const selfReferentialProjection = {
      children: [{
        ...projection.children[0],
        selections: [
          ...projection.children[0].selections,
          { id: 'selection-reading', label: 'Gospel Library', status: 'active' },
        ],
      }],
    };
    const rpc = jest.fn(async () => ({ data: selfReferentialProjection, error: null }));
    const stageProposal = jest.fn();
    await expect(executeServerScreenTimeTool({
      client: { rpc }, userId: 'user-1', stageProposal,
      call: {
        id: 'update-stale-prerequisite', toolId: 'screen_time.agreement.update', arguments: {
          childMembershipId: 'charlie', agreementId: 'agreement-1', selectionId: 'selection-1', expectedVersion: 2,
          rule: {
            weekdays: [1, 2, 3, 4, 5], startMinute: 900, endMinute: 1140, dailyLimitMinutes: 20,
            prerequisiteActivity: { selectionId: 'selection-1', thresholdMinutes: 10, reset: 'daily' },
          },
        },
      },
    })).resolves.toMatchObject({ status: 'failed', code: 'screen_time_target_stale', retryable: true });
    expect(stageProposal).not.toHaveBeenCalled();
  });
});
