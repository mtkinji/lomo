type MockNative = {
  start: jest.Mock;
  update: jest.Mock;
  sync?: jest.Mock;
  end: jest.Mock;
  getActiveFocusLiveActivities?: jest.Mock;
};

async function loadLiveActivityModule(native: MockNative | undefined, os = 'ios') {
  jest.resetModules();
  jest.doMock('react-native', () => ({
    NativeModules: native ? { KwiltLiveActivity: native } : {},
    Platform: { OS: os },
  }));
  return require('./liveActivity') as typeof import('./liveActivity');
}

describe('liveActivity bridge', () => {
  afterEach(() => {
    jest.dontMock('react-native');
    jest.resetModules();
  });

  it('keeps paused sessions alive when the native reconciler is available', async () => {
    const native: MockNative = {
      start: jest.fn(),
      update: jest.fn(),
      sync: jest.fn(async () => ({
        action: 'updated',
        activeCount: 1,
        staleEndedCount: 0,
        sessionId: 'activity-1-1000',
      })),
      end: jest.fn(),
    };
    const { syncLiveActivity } = await loadLiveActivityModule(native);

    const result = await syncLiveActivity({
      mode: 'paused',
      activityId: 'activity-1',
      title: 'Write proposal',
      sessionId: 'activity-1-1000',
      startedAtMs: 1000,
      remainingMs: 120000,
    });

    expect(native.sync).toHaveBeenCalledWith(
      'activity-1',
      'Write proposal',
      'activity-1-1000',
      'paused',
      1000,
      0,
      120000,
    );
    expect(native.end).not.toHaveBeenCalled();
    expect(result).toEqual({
      action: 'updated',
      activeCount: 1,
      staleEndedCount: 0,
      sessionId: 'activity-1-1000',
    });
  });

  it('falls back to ending non-running sessions on older native builds', async () => {
    const native: MockNative = {
      start: jest.fn(),
      update: jest.fn(),
      end: jest.fn(async () => true),
    };
    const { syncLiveActivity } = await loadLiveActivityModule(native);

    const result = await syncLiveActivity({
      mode: 'paused',
      activityId: 'activity-1',
      title: 'Write proposal',
      startedAtMs: 1000,
      remainingMs: 120000,
    });

    expect(native.end).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      action: 'legacy-ended',
      activeCount: 0,
      staleEndedCount: 1,
      sessionId: 'activity-1-1000',
    });
  });

  it('returns active Focus Live Activity diagnostics when exposed by native', async () => {
    const activities = [
      {
        id: 'live-1',
        activityId: 'activity-1',
        title: 'Write proposal',
        sessionId: 'activity-1-1000',
        mode: 'running',
        startedAtMs: 1000,
        endAtMs: 61000,
      },
    ];
    const native: MockNative = {
      start: jest.fn(),
      update: jest.fn(),
      end: jest.fn(),
      getActiveFocusLiveActivities: jest.fn(async () => activities),
    };
    const { getActiveFocusLiveActivities } = await loadLiveActivityModule(native);

    await expect(getActiveFocusLiveActivities()).resolves.toEqual(activities);
  });
});
