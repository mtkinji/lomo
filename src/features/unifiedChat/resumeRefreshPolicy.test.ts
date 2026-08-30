import { unifiedChatResumeRefreshReason } from './resumeRefreshPolicy';

const settled = {
  clientActions: [{ status: 'completed' }],
  runs: [{ originChannel: 'mobile', status: 'complete' }],
  proposals: [{ status: 'applied' }],
};

describe('unifiedChatResumeRefreshReason', () => {
  test.each(['pending', 'edited', 'deferred'] as const)(
    'refreshes an actionable %s proposal after returning to the foreground',
    (status) => {
      expect(unifiedChatResumeRefreshReason({ ...settled, proposals: [{ status }] }))
        .toBe('proposal');
    },
  );

  test('keeps existing native-action and active-run refresh behavior', () => {
    expect(unifiedChatResumeRefreshReason({
      ...settled,
      clientActions: [{ status: 'pending_client_action' }],
    })).toBe('client_action');
    expect(unifiedChatResumeRefreshReason({
      ...settled,
      runs: [{ originChannel: 'mobile', status: 'active' }],
    })).toBe('server_run');
  });

  test('does not refresh when every item is settled', () => {
    expect(unifiedChatResumeRefreshReason(settled)).toBeNull();
  });

  test('ignores runs that do not declare a mobile origin channel', () => {
    expect(unifiedChatResumeRefreshReason({
      ...settled,
      runs: [{ status: 'active' }],
    })).toBeNull();
  });
});
