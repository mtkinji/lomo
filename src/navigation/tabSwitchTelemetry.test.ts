import { startTabSwitchTelemetry } from './tabSwitchTelemetry';
import { AnalyticsEvent } from '../services/analytics/events';

describe('tab switch telemetry', () => {
  let nowMs = 0;
  let frames: FrameRequestCallback[] = [];
  let originalRequestAnimationFrame: typeof globalThis.requestAnimationFrame;
  let originalCancelAnimationFrame: typeof globalThis.cancelAnimationFrame;
  let performanceNowSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    nowMs = 0;
    frames = [];
    originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
    performanceNowSpy = jest.spyOn(globalThis.performance, 'now').mockImplementation(() => nowMs);
    globalThis.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    globalThis.cancelAnimationFrame = jest.fn();
  });

  afterEach(() => {
    performanceNowSpy.mockRestore();
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  it('captures tab switch timings, frame gaps, and safe object counts', () => {
    const capture = jest.fn();
    const probe = startTabSwitchTelemetry({
      capture,
      fromRouteName: 'PlanTab',
      toRouteName: 'MoreTab',
      fromIndex: 2,
      toIndex: 3,
      sampleWindowMs: 100,
      longFrameThresholdMs: 50,
      snapshot: {
        activities_count: 12,
        goals_count: 4,
        arcs_count: 2,
        activity_views_count: 3,
        plan_recommendations_count: 1,
        domain_hydrated: true,
        domain_sync_status: 'idle',
      },
    });

    nowMs = 12;
    probe.markIndicatorScheduled();
    runNextFrame(16);
    nowMs = 80;
    probe.markIndicatorFinished(true);
    runNextFrame(90);
    runNextFrame(120);

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith(AnalyticsEvent.NavigationTabSwitchPerf, {
      from_tab: 'PlanTab',
      to_tab: 'MoreTab',
      tab_distance: 1,
      sample_window_ms: 100,
      first_frame_ms: 16,
      max_frame_gap_ms: 74,
      long_frame_count: 1,
      frame_count: 3,
      indicator_scheduled_ms: 12,
      indicator_finished_ms: 80,
      indicator_finished: true,
      activities_count: 12,
      goals_count: 4,
      arcs_count: 2,
      activity_views_count: 3,
      plan_recommendations_count: 1,
      domain_hydrated: true,
      domain_sync_status: 'idle',
    });
  });

  it('does not capture a cancelled probe', () => {
    const capture = jest.fn();
    const probe = startTabSwitchTelemetry({
      capture,
      fromRouteName: 'GoalsTab',
      toRouteName: 'ActivitiesTab',
      fromIndex: 0,
      toIndex: 1,
      sampleWindowMs: 100,
      snapshot: {
        activities_count: 0,
        goals_count: 0,
        arcs_count: 0,
        activity_views_count: 0,
        plan_recommendations_count: 0,
        domain_hydrated: false,
        domain_sync_status: 'idle',
      },
    });

    probe.cancel();
    runNextFrame(120);

    expect(capture).not.toHaveBeenCalled();
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(1);
  });

  function runNextFrame(timestampMs: number) {
    nowMs = timestampMs;
    const frame = frames.shift();
    if (!frame) throw new Error('Expected queued animation frame');
    frame(timestampMs);
  }
});
