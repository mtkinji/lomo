import { shouldLoadRequestedChatThread } from './requestedChatThreadLoadPolicy';

describe('requested Chat thread load policy', () => {
  it('loads a selected saved chat when the empty Chat route stays mounted', () => {
    expect(shouldLoadRequestedChatThread({
      requestedThreadId: 'thread-1',
      aggregateThreadId: null,
      previousRequestedThreadId: null,
    })).toBe(true);
  });

  it('does not duplicate initial hydration or reload the active thread', () => {
    expect(shouldLoadRequestedChatThread({
      requestedThreadId: 'thread-1',
      aggregateThreadId: null,
      previousRequestedThreadId: 'thread-1',
    })).toBe(false);
    expect(shouldLoadRequestedChatThread({
      requestedThreadId: 'thread-1',
      aggregateThreadId: 'thread-1',
      previousRequestedThreadId: null,
    })).toBe(false);
  });
});
