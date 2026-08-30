import {
  ConnectedToolConflictError,
  createConnectedToolActions,
  parseConnectedToolConnectRequest,
  type ConnectedToolBoundary,
} from './connectedToolActions';

const active = {
  client_id: 'client-1', client_name: 'ChatGPT', connection_type: 'oauth' as const,
  surface: 'chatgpt', scope: 'life.read life.write', connected_at: '2026-08-01T00:00:00.000Z',
  last_used_at: '2026-08-27T00:00:00.000Z', revoked_at: null, write_count: 3,
  last_action_at: '2026-08-27T00:00:00.000Z',
};

function boundary(): ConnectedToolBoundary & { revoke: jest.Mock } {
  let revoked = false;
  const revoke = jest.fn(async () => { revoked = true; });
  return {
    revoke,
    load: async () => ({
      connections: [{ ...active, revoked_at: revoked ? '2026-08-28T00:00:00.000Z' : null }],
      actions: [{
        id: 'action-1', client_id: 'client-1', surface: 'chatgpt', tool_name: 'goals.update',
        tool_kind: 'write', object_type: 'goal', object_id: 'secret-goal-id', success: true,
        error_code: null, result_status: 'completed', result_summary: 'private result',
        created_at: '2026-08-27T00:00:00.000Z',
      }],
    }),
  };
}

test('lists bounded connection status without credentials or object identifiers', async () => {
  const actions = createConnectedToolActions(boundary());
  await expect(actions.list()).resolves.toEqual({ connections: [{
    connectionId: 'client-1', name: 'ChatGPT', surface: 'chatgpt',
    scopes: ['life.read', 'life.write'], connectedAt: active.connected_at,
    lastUsedAt: active.last_used_at, revokedAt: null, writeCount: 3,
    lastActionAt: active.last_action_at,
  }] });
  const detail = await actions.get({ connectionId: 'client-1' });
  expect(detail).toMatchObject({ connection: { connectionId: 'client-1' } });
  expect(JSON.stringify(detail)).not.toContain('secret-goal-id');
  expect(JSON.stringify(detail)).not.toContain('private result');
});

test('prepares only supported provider-owned connection setup', () => {
  expect(parseConnectedToolConnectRequest({ providerId: 'chatgpt' })).toEqual({ providerId: 'chatgpt' });
  expect(parseConnectedToolConnectRequest({ providerId: 'https://evil.example' })).toBeNull();
  expect(parseConnectedToolConnectRequest({ providerId: 'chatgpt', token: 'secret' })).toBeNull();
});

test('revokes one exact active version and verifies the provider result', async () => {
  const connectionBoundary = boundary();
  const actions = createConnectedToolActions(connectionBoundary);
  await expect(actions.revoke({
    connectionId: 'client-1', expectedConnectedAt: active.connected_at,
  })).resolves.toMatchObject({ connectionId: 'client-1', revoked: true, revokedAt: expect.any(String) });
  expect(connectionBoundary.revoke).toHaveBeenCalledWith('client-1');
});

test('rejects stale or missing connections before revoke', async () => {
  const actions = createConnectedToolActions(boundary());
  await expect(actions.revoke({ connectionId: 'client-1', expectedConnectedAt: 'stale' }))
    .rejects.toThrow(ConnectedToolConflictError);
  await expect(actions.revoke({ connectionId: 'missing', expectedConnectedAt: active.connected_at }))
    .rejects.toThrow('not available');
});
