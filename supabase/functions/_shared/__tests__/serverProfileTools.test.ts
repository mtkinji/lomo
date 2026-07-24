import { executeServerProfileTool } from '../serverProfileTools';

function projectionClient(row: Record<string, unknown> | null, error: unknown = null) {
  const calls: Array<[string, ...unknown[]]> = [];
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'eq']) {
    query[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return query;
    };
  }
  query.maybeSingle = async () => ({ data: row, error });
  return { client: { from: jest.fn(() => query) }, calls };
}

const projection = {
  profile_id: 'profile-1', full_name: 'Andrew', age_range: '35-44',
  profile_updated_at: '2026-07-23T18:00:00.000Z',
};

test('reads only the bounded owner-scoped native Profile projection', async () => {
  const { client, calls } = projectionClient(projection);
  await expect(executeServerProfileTool({
    client, userId: 'user-1', call: { id: 'read-profile', toolId: 'profile.read', arguments: {} },
  })).resolves.toEqual({
    status: 'completed',
    output: { profile: { id: 'profile-1', fullName: 'Andrew', ageRange: '35-44', updatedAt: '2026-07-23T18:00:00.000Z' } },
    receipt: null,
  });
  expect(client.from).toHaveBeenCalledWith('kwilt_agent_profile_projections');
  expect(calls).toContainEqual(['eq', 'user_id', 'user-1']);
});

test('stages a Profile edit with the native projection version for reviewed mobile apply', async () => {
  const { client } = projectionClient(projection);
  const stageProposal = jest.fn(async () => ({
    id: 'proposal-1', status: 'pending' as const, version: 1, replayed: false,
  }));
  await expect(executeServerProfileTool({
    client, userId: 'user-1',
    call: { id: 'update-profile', toolId: 'profile.update', arguments: { fields: { fullName: ' Andy ' } } },
    stageProposal,
  })).resolves.toMatchObject({ status: 'proposed', proposal: { id: 'proposal-1' } });
  expect(stageProposal).toHaveBeenCalledWith(expect.objectContaining({
    capabilityId: 'profile',
    operation: {
      type: 'update_profile', targetType: 'profile', targetId: 'profile-1',
      summary: 'Update Profile display fields',
      payload: { fullName: 'Andy', expectedUpdatedAt: '2026-07-23T18:00:00.000Z' },
    },
  }));
});

test('rejects unsupported Profile fields before staging', async () => {
  const { client } = projectionClient(projection);
  const stageProposal = jest.fn();
  await expect(executeServerProfileTool({
    client, userId: 'user-1',
    call: { id: 'update-profile', toolId: 'profile.update', arguments: { fields: { email: 'private@example.com' } } },
    stageProposal,
  })).resolves.toMatchObject({ status: 'failed', code: 'invalid_profile_patch' });
  expect(stageProposal).not.toHaveBeenCalled();
});

test('does not stage against a missing or unversioned native Profile', async () => {
  const { client } = projectionClient({ profile_id: null, profile_updated_at: null });
  await expect(executeServerProfileTool({
    client, userId: 'user-1',
    call: { id: 'update-profile', toolId: 'profile.update', arguments: { fields: { ageRange: '35-44' } } },
    stageProposal: jest.fn(),
  })).resolves.toMatchObject({ status: 'failed', code: 'profile_version_unavailable' });
});
