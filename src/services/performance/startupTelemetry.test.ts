import { markAppStarted, markFirstSurfaceUsable, markRootNavigationReady, resetStartupTelemetryForTests, wasNavigationRestoredForStartup } from './startupTelemetry';

describe('startupTelemetry', () => {
  it('records monotonic root and first-usable timings once', () => {
    const times = [10, 25, 60];
    resetStartupTelemetryForTests(() => times.shift() ?? 60);
    markAppStarted();
    markAppStarted();
    markRootNavigationReady(true);
    expect(wasNavigationRestoredForStartup()).toBe(true);

    expect(markFirstSurfaceUsable({ capabilityId: 'todos', restored: true, shellVariant: 'option-g' })).toEqual({
      capabilityId: 'todos', restored: true, shellVariant: 'option-g',
      appToRootReadyMs: 15, appToFirstSurfaceUsableMs: 50,
    });
    expect(markFirstSurfaceUsable({ capabilityId: 'todos', restored: true, shellVariant: 'option-g' })).toBeNull();
  });
});
