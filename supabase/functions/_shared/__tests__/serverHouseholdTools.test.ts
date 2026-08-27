import { executeServerHouseholdTool } from '../serverHouseholdTools';

function rpcClient(result: { data: unknown; error: unknown }) {
  return { rpc: jest.fn(async () => result) };
}

const snapshot = {
  household: { id: 'household-1', name: 'Watanabe Household' },
  currentMembershipId: 'owner-1',
  members: [{ id: 'owner-1', personId: 'person-1', displayName: 'Andrew', kind: 'adult', role: 'owner' }],
  activations: [],
  grants: [],
};

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
