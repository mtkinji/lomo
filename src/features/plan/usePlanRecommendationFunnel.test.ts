import { act, renderHook } from '@testing-library/react-native';
import { usePlanRecommendationFunnel } from './usePlanRecommendationFunnel';

const mockCapture = jest.fn();

jest.mock('../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: mockCapture }),
}));

describe('usePlanRecommendationFunnel', () => {
  beforeEach(() => {
    mockCapture.mockClear();
  });

  it('records each visible recommendation and unplaced priority once per day', () => {
    const { rerender } = renderHook<ReturnType<typeof usePlanRecommendationFunnel>, { visible: boolean }>(
      ({ visible }) =>
        usePlanRecommendationFunnel({
          visible,
          dateKey: '2026-07-15',
          recommendations: [{ activityId: 'rec-1', durationMinutes: 30, priorityPosition: 1 }],
          unplacedPriorities: [
            {
              activityId: 'unplaced-1',
              durationMinutes: 150,
              reason: 'needs_larger_window',
              mode: 'personal',
              priorityPosition: 0,
            },
          ],
        }),
      { initialProps: { visible: false } },
    );

    expect(mockCapture).not.toHaveBeenCalled();

    rerender({ visible: true });

    expect(mockCapture).toHaveBeenCalledWith('plan_recommendation_shown', {
      activity_id: 'rec-1',
      date_key: '2026-07-15',
      position: 2,
      duration_minutes: 30,
    });
    expect(mockCapture).toHaveBeenCalledWith('plan_recommendation_unplaced', {
      activity_id: 'unplaced-1',
      date_key: '2026-07-15',
      position: 1,
      duration_minutes: 150,
      reason: 'needs_larger_window',
      mode: 'personal',
    });

    rerender({ visible: true });
    expect(mockCapture).toHaveBeenCalledTimes(2);
  });

  it('records successful commits and user corrections with safe metadata', () => {
    const { result } = renderHook(() =>
      usePlanRecommendationFunnel({
        visible: true,
        dateKey: '2026-07-15',
        recommendations: [{ activityId: 'rec-1', durationMinutes: 30, priorityPosition: 0 }],
        unplacedPriorities: [],
      }),
    );
    mockCapture.mockClear();

    act(() => {
      result.current.recordCommitted('rec-1');
      result.current.recordDismissed('rec-1', 'skip');
    });

    expect(mockCapture).toHaveBeenCalledWith('plan_recommendation_committed', {
      activity_id: 'rec-1',
      date_key: '2026-07-15',
      position: 1,
      duration_minutes: 30,
    });
    expect(mockCapture).toHaveBeenCalledWith('plan_recommendation_dismissed', {
      activity_id: 'rec-1',
      date_key: '2026-07-15',
      position: 1,
      duration_minutes: 30,
      action: 'skip',
    });
  });
});
