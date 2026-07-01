import { AnalyticsEvent } from '../services/analytics/events';
import type { AnalyticsEventName } from '../services/analytics/events';
import type { AnalyticsProps } from '../services/analytics/analytics';
import { useAppStore } from '../store/useAppStore';

type CaptureFn = (event: AnalyticsEventName, props?: AnalyticsProps) => void;

type TabSwitchTelemetrySnapshot = {
  activities_count: number;
  goals_count: number;
  arcs_count: number;
  activity_views_count: number;
  plan_recommendations_count: number;
  domain_hydrated: boolean;
  domain_sync_status: string;
};

type StartTabSwitchTelemetryInput = {
  capture: CaptureFn;
  fromRouteName: string;
  toRouteName: string;
  fromIndex: number;
  toIndex: number;
  snapshot?: TabSwitchTelemetrySnapshot;
  sampleWindowMs?: number;
  longFrameThresholdMs?: number;
};

export type TabSwitchTelemetryProbe = {
  markIndicatorScheduled: () => void;
  markIndicatorFinished: (finished: boolean) => void;
  cancel: () => void;
};

const DEFAULT_SAMPLE_WINDOW_MS = 700;
const DEFAULT_LONG_FRAME_THRESHOLD_MS = 50;

export function getTabSwitchTelemetrySnapshot(): TabSwitchTelemetrySnapshot {
  const state = useAppStore.getState();
  return {
    activities_count: state.activities.length,
    goals_count: state.goals.length,
    arcs_count: state.arcs.length,
    activity_views_count: state.activityViews.length,
    plan_recommendations_count: state.planRecommendationsCount,
    domain_hydrated: state.domainHydrated,
    domain_sync_status: state.domainSyncStatus,
  };
}

export function startTabSwitchTelemetry({
  capture,
  fromRouteName,
  toRouteName,
  fromIndex,
  toIndex,
  snapshot = getTabSwitchTelemetrySnapshot(),
  sampleWindowMs = DEFAULT_SAMPLE_WINDOW_MS,
  longFrameThresholdMs = DEFAULT_LONG_FRAME_THRESHOLD_MS,
}: StartTabSwitchTelemetryInput): TabSwitchTelemetryProbe {
  const startedAtMs = nowMs();
  let previousFrameAtMs = startedAtMs;
  let firstFrameMs: number | null = null;
  let maxFrameGapMs = 0;
  let longFrameCount = 0;
  let frameCount = 0;
  let indicatorScheduledMs: number | null = null;
  let indicatorFinishedMs: number | null = null;
  let indicatorFinished = false;
  let cancelled = false;
  let rafId: number | null = null;

  const finish = () => {
    if (cancelled) return;
    capture(AnalyticsEvent.NavigationTabSwitchPerf, {
      from_tab: fromRouteName,
      to_tab: toRouteName,
      tab_distance: Math.abs(toIndex - fromIndex),
      sample_window_ms: sampleWindowMs,
      first_frame_ms: roundMs(firstFrameMs),
      max_frame_gap_ms: roundMs(maxFrameGapMs),
      long_frame_count: longFrameCount,
      frame_count: frameCount,
      indicator_scheduled_ms: roundMs(indicatorScheduledMs),
      indicator_finished_ms: roundMs(indicatorFinishedMs),
      indicator_finished: indicatorFinished,
      ...snapshot,
    });
  };

  const step = () => {
    if (cancelled) return;
    const currentMs = nowMs();
    const elapsedMs = currentMs - startedAtMs;
    const frameGapMs = currentMs - previousFrameAtMs;
    previousFrameAtMs = currentMs;
    frameCount += 1;
    if (firstFrameMs === null) firstFrameMs = elapsedMs;
    if (frameGapMs > maxFrameGapMs) maxFrameGapMs = frameGapMs;
    if (frameGapMs >= longFrameThresholdMs) longFrameCount += 1;

    if (elapsedMs >= sampleWindowMs) {
      finish();
      return;
    }

    rafId = requestAnimationFrame(step);
  };

  rafId = requestAnimationFrame(step);

  return {
    markIndicatorScheduled: () => {
      if (cancelled || indicatorScheduledMs !== null) return;
      indicatorScheduledMs = nowMs() - startedAtMs;
    },
    markIndicatorFinished: (finished: boolean) => {
      if (cancelled || indicatorFinishedMs !== null) return;
      indicatorFinishedMs = nowMs() - startedAtMs;
      indicatorFinished = finished;
    },
    cancel: () => {
      cancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    },
  };
}

function nowMs(): number {
  return typeof globalThis.performance?.now === 'function' ? globalThis.performance.now() : Date.now();
}

function roundMs(value: number | null): number | null {
  return value === null ? null : Math.round(value);
}
