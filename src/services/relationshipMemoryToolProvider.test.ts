import { createRelationshipMemoryToolProvider } from './relationshipMemoryToolProvider';
import { UNIFIED_CHAT_TOOL_CATALOG } from '../features/unifiedChat/toolCatalog';

const tool = (id: string) => {
  const match = UNIFIED_CHAT_TOOL_CATALOG.find((candidate) => candidate.id === id);
  if (!match) throw new Error(`Missing ${id}`);
  return match;
};

describe('createRelationshipMemoryToolProvider', () => {
  it('sends the existing causal run context to the authenticated shared endpoint', async () => {
    const fetchImpl = jest.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      ok: true,
      result: { status: 'completed', output: { people: [] }, receipt: null },
    }), { status: 200 }));
    const provider = createRelationshipMemoryToolProvider({
      context: { threadId: 'thread-1', runId: 'run-1', messageId: 'message-1' },
      dependencies: {
        getAccessToken: async () => 'access-token',
        getUrls: () => ['https://example.test/functions/v1/relationship-memory'],
        getPublishableKey: () => 'publishable-key',
        fetchImpl: fetchImpl as typeof fetch,
      },
    });

    await expect(provider.execute(
      { id: 'read-1', toolId: 'relationships.read', arguments: {} },
      tool('relationships.read'),
    )).resolves.toEqual({ status: 'completed', output: { people: [] }, receipt: null });

    const request = fetchImpl.mock.calls[0]![1]!;
    expect(request.headers).toEqual(expect.objectContaining({
      Authorization: 'Bearer access-token', apikey: 'publishable-key', 'x-kwilt-client': 'kwilt-mobile',
    }));
    expect(JSON.parse(String(request.body))).toEqual({
      call: { id: 'read-1', toolId: 'relationships.read', arguments: {} },
      context: { threadId: 'thread-1', runId: 'run-1', messageId: 'message-1' },
    });
  });

  it('does not send unrelated tools and reports an honest unavailable boundary without auth', async () => {
    const fetchImpl = jest.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response());
    const provider = createRelationshipMemoryToolProvider({
      context: { threadId: 'thread-1', runId: 'run-1', messageId: 'message-1' },
      dependencies: {
        getAccessToken: async () => null,
        getUrls: () => ['https://example.test'],
        getPublishableKey: () => null,
        fetchImpl: fetchImpl as typeof fetch,
      },
    });
    await expect(provider.execute(
      { id: 'goal-read', toolId: 'goals.read', arguments: {} },
      tool('goals.read'),
    )).resolves.toBeNull();
    await expect(provider.execute(
      { id: 'read-1', toolId: 'relationships.read', arguments: {} },
      tool('relationships.read'),
    )).resolves.toEqual({
      status: 'unavailable', reason: 'relationship_memory_authentication_required', retryable: true,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('undoes an exact relationship receipt through the same authenticated endpoint', async () => {
    const fetchImpl = jest.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      ok: true,
      undo: {
        status: 'undone', receiptId: 'receipt-1', proposalId: 'proposal-1',
        undoneAt: '2026-07-23T20:00:00.000Z', replayed: false,
      },
    }), { status: 200 }));
    const provider = createRelationshipMemoryToolProvider({
      context: { threadId: 'thread-1', runId: 'run-1', messageId: 'message-1' },
      dependencies: {
        getAccessToken: async () => 'access-token',
        getUrls: () => ['https://example.test/functions/v1/relationship-memory'],
        getPublishableKey: () => 'publishable-key',
        fetchImpl: fetchImpl as typeof fetch,
      },
    });

    await expect(provider.undoReceipt('receipt-1')).resolves.toEqual({
      receiptId: 'receipt-1', proposalId: 'proposal-1',
      undoneAt: '2026-07-23T20:00:00.000Z', replayed: false,
    });
    expect(JSON.parse(String(fetchImpl.mock.calls[0]![1]!.body))).toEqual({
      undo: { receiptId: 'receipt-1' },
    });
  });
});
