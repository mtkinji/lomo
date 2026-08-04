let mockAppState: Record<string, unknown>;
let mockSelector: ((state: Record<string, unknown>) => unknown) | null = null;
let mockListener: ((next: unknown, previous: unknown) => void) | null = null;
let mockSubscriptionOptions: {
  equalityFn?: (a: unknown, b: unknown) => boolean;
} | null = null;
let mockSelectedSlice: unknown;

function mockEmitAppState(nextState: Record<string, unknown>): void {
  if (!mockSelector || !mockListener) throw new Error('Widget sync subscription is not active');
  const nextSlice = mockSelector(nextState);
  const equalityFn = mockSubscriptionOptions?.equalityFn ?? Object.is;
  if (!equalityFn(mockSelectedSlice, nextSlice)) {
    const previousSlice = mockSelectedSlice;
    mockSelectedSlice = nextSlice;
    mockListener(nextSlice, previousSlice);
  }
  mockAppState = nextState;
}

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('../../store/useAppStore', () => ({
  useAppStore: {
    getState: jest.fn(() => mockAppState),
    subscribe: jest.fn((selector, listener, options) => {
      mockSelector = selector;
      mockListener = listener;
      mockSubscriptionOptions = options;
      mockSelectedSlice = selector(mockAppState);
      if (options?.fireImmediately) listener(mockSelectedSlice, mockSelectedSlice);
      return jest.fn();
    }),
  },
}));

jest.mock('../../store/useEntitlementsStore', () => ({
  useEntitlementsStore: {
    getState: jest.fn(() => ({ isPro: false })),
  },
}));

jest.mock('./glanceableState', () => ({
  buildMomentumSnapshot: jest.fn(() => null),
  buildNextUpSnapshot: jest.fn(() => null),
  buildScheduleSnapshot: jest.fn(() => null),
  buildSuggestedSnapshot: jest.fn(() => null),
  buildTodaySummarySnapshot: jest.fn(() => null),
  mergeGlanceableState: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../features/activities/activityViewWidgetData', () => ({
  buildActivitiesWidgetRows: jest.fn(() => ({ rows: [], totalCount: 0 })),
}));

import { mergeGlanceableState } from './glanceableState';
import { startGlanceableStateSync } from './glanceableStateSync';

const mockMergeGlanceableState = mergeGlanceableState as jest.MockedFunction<
  typeof mergeGlanceableState
>;

describe('glanceableStateSync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-04T12:00:00.000Z'));
    mockAppState = {
      activities: [],
      goals: [],
      arcs: [],
      focusContextGoalId: null,
      currentShowUpStreak: 0,
      activityViews: [],
      devBreadcrumbsEnabled: false,
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('schedules writes only when a selected widget input changes', () => {
    startGlanceableStateSync();
    jest.advanceTimersByTime(1000);
    expect(mockMergeGlanceableState).toHaveBeenCalledTimes(1);

    mockEmitAppState({ ...mockAppState, devBreadcrumbsEnabled: true });
    jest.advanceTimersByTime(10_000);
    expect(mockMergeGlanceableState).toHaveBeenCalledTimes(1);

    mockEmitAppState({ ...mockAppState, currentShowUpStreak: 1 });
    jest.advanceTimersByTime(1000);
    expect(mockMergeGlanceableState).toHaveBeenCalledTimes(2);

    for (const [key, value] of [
      ['activities', [{ id: 'activity-1' }]],
      ['goals', [{ id: 'goal-1' }]],
      ['arcs', [{ id: 'arc-1' }]],
      ['focusContextGoalId', 'goal-1'],
      ['activityViews', [{ id: 'view-1' }]],
    ] as const) {
      mockEmitAppState({ ...mockAppState, [key]: value });
      jest.advanceTimersByTime(10_000);
    }

    expect(mockMergeGlanceableState).toHaveBeenCalledTimes(7);
  });
});
