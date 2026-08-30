import { continueThreadOnPhoneAgent } from '../phoneAgentContinuation';

function query(result: { data: unknown; error: unknown }) {
  const chain: Record<string, any> = {};
  for (const method of ['select', 'eq', 'is', 'order', 'limit']) chain[method] = jest.fn(() => chain);
  chain.maybeSingle = jest.fn(async () => result);
  return chain;
}

test('binds the current owned thread to the verified Phone Agent link without returning a phone number', async () => {
  const links = query({ data: { id: 'link-1' }, error: null });
  const rpc = jest.fn(async () => ({ data: { id: 'binding-1' }, error: null }));
  const result = await continueThreadOnPhoneAgent({
    client: { from: jest.fn(() => links), rpc }, userId: 'user-1', threadId: 'thread-1',
  });

  expect(rpc).toHaveBeenCalledWith('bind_kwilt_agent_channel_thread', {
    p_user_id: 'user-1', p_channel: 'sms', p_phone_link_id: 'link-1', p_thread_id: 'thread-1',
  });
  expect(result).toEqual({ status: 'ready', channel: 'phone_agent', continuation: 'next_message' });
  expect(JSON.stringify(result)).not.toContain('+1');
});

test('requires a verified Phone Agent link and never attempts a binding otherwise', async () => {
  const links = query({ data: null, error: null });
  const rpc = jest.fn();
  await expect(continueThreadOnPhoneAgent({
    client: { from: jest.fn(() => links), rpc }, userId: 'user-1', threadId: 'thread-1',
  })).rejects.toThrow('phone_agent_not_linked');
  expect(rpc).not.toHaveBeenCalled();
});

test('rejects missing causal thread context before reading account data', async () => {
  const from = jest.fn();
  await expect(continueThreadOnPhoneAgent({
    client: { from, rpc: jest.fn() }, userId: 'user-1', threadId: '',
  })).rejects.toThrow('invalid_phone_continuation');
  expect(from).not.toHaveBeenCalled();
});
