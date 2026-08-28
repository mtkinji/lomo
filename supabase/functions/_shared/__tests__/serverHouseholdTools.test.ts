import { executeServerHouseholdTool } from '../serverHouseholdTools';

function rpcClient(result: { data: unknown; error: unknown }) {
  return { rpc: jest.fn(async () => result) };
}

const snapshot = {
  household: { id: 'household-1', name: 'Watanabe Household' },
  currentMembershipId: 'owner-1',
  members: [{ id: 'owner-1', personId: 'person-1', displayName: 'Andrew', kind: 'adult', role: 'owner', updatedAt: '2026-08-27T18:00:00.000Z' }],
  activations: [],
  grants: [],
};

test('stages first-Household creation without inventing an existing actor membership', async () => {
  const client = rpcClient({
    data: { household: null, currentMembershipId: null, members: [], activations: [], grants: [] }, error: null,
  });
  const stageProposal = jest.fn(async (request) => ({ id: 'proposal-first', ...request }));

  await expect(executeServerHouseholdTool({
    client, userId: 'user-1', stageProposal,
    call: { id: 'call-first', toolId: 'household.member.add_dependent', arguments: {
      householdId: null, displayName: 'Charlie', ownerDisplayName: 'Andrew',
    } },
  })).resolves.toMatchObject({ status: 'proposed' });

  expect(stageProposal).toHaveBeenCalledWith(expect.objectContaining({
    operation: expect.objectContaining({ payload: expect.objectContaining({ householdId: null }) }),
  }));
});

test('reads the bounded Household projection for the authenticated external user', async () => {
  const client = rpcClient({ data: snapshot, error: null });

  await expect(executeServerHouseholdTool({
    client,
    userId: 'user-1',
    call: { id: 'read-household', toolId: 'household.read', arguments: {} },
  })).resolves.toEqual({ status: 'completed', output: { household: snapshot }, receipt: null });

  expect(client.rpc).toHaveBeenCalledWith('get_kwilt_agent_household_snapshot', { p_user_id: 'user-1' });
});

test('previews one normalized Household invitation without exposing the code', async () => {
  const preview = {
    householdName: 'Watanabe Household', inviterDisplayName: 'Andrew',
    role: 'caregiver', expiresAt: '2026-09-03T12:00:00.000Z',
  };
  const client = rpcClient({ data: preview, error: null });

  await expect(executeServerHouseholdTool({
    client,
    userId: 'user-1',
    call: { id: 'preview-invite', toolId: 'household.invitation.preview', arguments: { code: ' ab12cd ' } },
  })).resolves.toEqual({ status: 'completed', output: { invitation: preview }, receipt: null });

  expect(client.rpc).toHaveBeenCalledWith('preview_kwilt_agent_household_invite', {
    p_user_id: 'user-1', p_code: 'AB12CD',
  });
});

test('rejects an invalid invitation code before calling the database', async () => {
  const client = rpcClient({ data: null, error: null });

  await expect(executeServerHouseholdTool({
    client,
    userId: 'user-1',
    call: { id: 'preview-invite', toolId: 'household.invitation.preview', arguments: { code: '   ' } },
  })).resolves.toMatchObject({ status: 'failed', code: 'invalid_household_invitation_code', retryable: false });
  expect(client.rpc).not.toHaveBeenCalled();
});

test('reports Household provider failures without leaking database detail', async () => {
  const client = rpcClient({ data: null, error: { message: 'sensitive database detail' } });

  await expect(executeServerHouseholdTool({
    client,
    userId: 'user-1',
    call: { id: 'read-household', toolId: 'household.read', arguments: {} },
  })).resolves.toEqual({
    status: 'failed', code: 'household_read_failed',
    message: 'Kwilt could not read the current Household.', retryable: true,
  });
});

test('rejects a malformed Household projection instead of passing privileged rows through', async () => {
  const client = rpcClient({ data: { ...snapshot, members: [{ id: 'owner-1', privateToken: 'nope' }] }, error: null });

  await expect(executeServerHouseholdTool({
    client,
    userId: 'user-1',
    call: { id: 'read-household', toolId: 'household.read', arguments: {} },
  })).resolves.toMatchObject({ status: 'failed', code: 'invalid_household_projection', retryable: false });
});

test('lists bounded Household devices without exposing install identifiers', async () => {
  const client = rpcClient({ data: [{
    id: 'device-1', householdId: 'household-1', kind: 'personal_child',
    childMembershipId: 'child-1', assignedCaregiverMembershipId: null,
    installId: 'private-install-id', label: "Charlie's iPhone", platform: 'ios',
    status: 'ready', memberIds: [], updatedAt: '2026-08-27T18:00:00.000Z',
  }], error: null });
  const result = await executeServerHouseholdTool({ client, userId: 'user-1',
    call: { id: 'devices', toolId: 'household.device.list', arguments: { householdId: 'household-1' } } });
  expect(result).toMatchObject({ status: 'completed', output: { devices: [{ id: 'device-1', label: "Charlie's iPhone" }] } });
  expect(JSON.stringify(result)).not.toContain('private-install-id');
  expect(client.rpc).toHaveBeenCalledWith('list_kwilt_agent_household_devices', {
    p_user_id: 'user-1', p_household_id: 'household-1',
  });
});

test('executes an exact authorized member update with a canonical receipt', async () => {
  const client = rpcClient({ data: snapshot, error: null });
  const result = await executeServerHouseholdTool({ client, userId: 'user-1', call: {
    id: 'request-1', toolId: 'household.member.update', arguments: {
      householdId: 'household-1', membershipId: 'child-1',
      expectedUpdatedAt: '2026-08-27T18:00:00.000Z', fields: { displayName: 'Charles' },
    },
  } });
  expect(result).toMatchObject({ status: 'completed', receipt: {
    receiptId: 'request-1', operationId: 'household.member.update',
    resultRefs: [{ kind: 'household_member', id: 'child-1' }],
  } });
  expect(client.rpc).toHaveBeenCalledWith('update_kwilt_agent_household_member', {
    p_user_id: 'user-1', p_household_id: 'household-1', p_membership_id: 'child-1',
    p_expected_updated_at: '2026-08-27T18:00:00.000Z', p_display_name: 'Charles', p_role: null,
  });
});

test('turns stale Household mutations into needs_input and authority failures into refusal', async () => {
  const stale = rpcClient({ data: null, error: { message: 'stale_household_member' } });
  await expect(executeServerHouseholdTool({ client: stale, userId: 'user-1', call: {
    id: 'stale', toolId: 'household.member.update', arguments: {
      householdId: 'household-1', membershipId: 'child-1', expectedUpdatedAt: 'old', fields: { displayName: 'Charles' },
    },
  } })).resolves.toMatchObject({ status: 'needs_input', fields: ['expectedUpdatedAt'] });
  const denied = rpcClient({ data: null, error: { message: 'household_owner_required' } });
  await expect(executeServerHouseholdTool({ client: denied, userId: 'user-1', call: {
    id: 'denied', toolId: 'household.device.revoke', arguments: {
      householdId: 'household-1', deviceId: 'device-1', expectedUpdatedAt: '2026-08-27T18:00:00.000Z',
    },
  } })).resolves.toMatchObject({ status: 'refused' });
});

test('persists and returns a device-local cleanup handoff after reconciliation', async () => {
  const device = {
    id: 'device-1', householdId: 'household-1', kind: 'personal_child', childMembershipId: 'child-1',
    assignedCaregiverMembershipId: null, installId: 'private-install-id', label: "Charlie's iPhone",
    platform: 'ios', status: 'needs_attention', memberIds: [], updatedAt: '2026-08-27T18:01:00.000Z',
  };
  const client = rpcClient({ data: { device, requiresNativeCleanup: true }, error: null });
  const stageDeviceAction = jest.fn(async () => undefined);
  const result = await executeServerHouseholdTool({ client, userId: 'user-1', stageDeviceAction, call: {
    id: 'reconcile', toolId: 'household.device.reconcile', arguments: {
      householdId: 'household-1', deviceId: 'device-1', expectedUpdatedAt: '2026-08-27T18:00:00.000Z',
    },
  } });
  expect(result).toMatchObject({ status: 'pending_client_action', provider: 'device', request: {
    capabilityId: 'household', actionType: 'household.device.cleanup', targetId: 'device-1',
  } });
  expect(stageDeviceAction).toHaveBeenCalledWith(expect.objectContaining({ targetId: 'device-1' }));
});
