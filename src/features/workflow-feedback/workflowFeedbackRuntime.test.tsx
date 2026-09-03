import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { InteractionManager, Pressable } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AnalyticsEvent } from '../../services/analytics/events';
import { Text } from '../../ui/Typography';
import {
  requestWorkflowFeedback,
  useWorkflowFeedbackRuntime,
  WorkflowFeedbackProvider,
} from './workflowFeedbackRuntime';

const mockCapture = jest.fn();
const mockUseFeatureFlag = jest.fn((_key: string, _fallback: boolean): boolean => true);

jest.mock('../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: mockCapture }),
}));

jest.mock('../../services/analytics/useFeatureFlag', () => ({
  useFeatureFlag: (key: string, fallback: boolean) => mockUseFeatureFlag(key, fallback),
}));

jest.mock('../../store/useAppStore', () => ({
  useAppStore: (selector: (state: { authIdentity: { userId: string } }) => unknown) => selector({
    authIdentity: { userId: 'user-1' },
  }),
}));

jest.mock('expo-crypto', () => ({ randomUUID: () => 'feedback-instance-1' }));

function Probe() {
  const runtime = useWorkflowFeedbackRuntime();
  if (!runtime.active) return <Text>No feedback</Text>;
  return (
    <>
      <Text>{runtime.active.prompt.promptId}</Text>
      <Pressable accessibilityRole="button" onPress={() => runtime.submit(2)}><Text>Submit low</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => runtime.submitReason(runtime.active!.prompt.reasons[0].code)}><Text>Submit reason</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={runtime.dismiss}><Text>Dismiss</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={runtime.complete}><Text>Complete</Text></Pressable>
    </>
  );
}

async function requestEligible(promptId: Parameters<typeof requestWorkflowFeedback>[0]['promptId'], sourceKey: string) {
  act(() => {
    requestWorkflowFeedback({ promptId, sourceKey: `${sourceKey}-first`, placement: promptId.startsWith('screen_time') ? 'inline' : 'standalone' });
    requestWorkflowFeedback({ promptId, sourceKey, placement: promptId.startsWith('screen_time') ? 'inline' : 'standalone' });
  });
  await waitFor(() => expect(screen.queryByText(promptId)).not.toBeNull());
}

describe('workflow feedback runtime', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockCapture.mockClear();
    mockUseFeatureFlag.mockImplementation(() => true);
    jest.spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((callback) => {
        if (typeof callback !== 'function') throw new Error('Expected an interaction callback.');
        callback();
        return { cancel: jest.fn() } as unknown as ReturnType<typeof InteractionManager.runAfterInteractions>;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps disabled requests invisible and event-free', async () => {
    mockUseFeatureFlag.mockImplementation(() => false);
    render(<WorkflowFeedbackProvider><Probe /></WorkflowFeedbackProvider>);

    act(() => {
      requestWorkflowFeedback({
        promptId: 'money_rebalance_satisfaction_v1',
        sourceKey: 'disabled-one',
        placement: 'standalone',
      });
      requestWorkflowFeedback({
        promptId: 'money_rebalance_satisfaction_v1',
        sourceKey: 'disabled-two',
        placement: 'standalone',
      });
    });

    await waitFor(() => expect(screen.getByText('No feedback')).toBeTruthy());
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('cancels a pending request before it becomes visible', async () => {
    let interactionCallback: (() => void) | null = null;
    jest.spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((callback) => {
        if (typeof callback !== 'function') throw new Error('Expected an interaction callback.');
        interactionCallback = callback;
        return { cancel: jest.fn() } as unknown as ReturnType<typeof InteractionManager.runAfterInteractions>;
      });
    render(<WorkflowFeedbackProvider><Probe /></WorkflowFeedbackProvider>);

    act(() => {
      requestWorkflowFeedback({ promptId: 'money_rebalance_satisfaction_v1', sourceKey: 'cancel-first', placement: 'standalone' });
    });
    const handle = requestWorkflowFeedback({ promptId: 'money_rebalance_satisfaction_v1', sourceKey: 'cancel-second', placement: 'standalone' });
    handle.cancel();
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    act(() => { interactionCallback?.(); });

    expect(screen.getByText('No feedback')).toBeTruthy();
    expect(mockCapture).not.toHaveBeenCalledWith(AnalyticsEvent.WorkflowFeedbackShown, expect.anything());
  });

  it('emits one shown and one dismissed terminal event', async () => {
    render(<WorkflowFeedbackProvider><Probe /></WorkflowFeedbackProvider>);
    await requestEligible('money_rebalance_satisfaction_v1', 'rebalance-second');

    expect(mockCapture).toHaveBeenCalledWith(AnalyticsEvent.WorkflowFeedbackShown, expect.objectContaining({
      feedback_instance_id: 'feedback-instance-1',
      prompt_id: 'money_rebalance_satisfaction_v1',
    }));
    fireEvent.press(screen.getByText('Dismiss'));
    await waitFor(() => expect(screen.getByText('No feedback')).toBeTruthy());
    expect(mockCapture).toHaveBeenCalledWith(AnalyticsEvent.WorkflowFeedbackDismissed, expect.objectContaining({
      feedback_instance_id: 'feedback-instance-1',
    }));
    expect(mockCapture).not.toHaveBeenCalledWith(AnalyticsEvent.WorkflowFeedbackSubmitted, expect.anything());
  });

  it('keeps a rating terminal while allowing one bounded follow-up', async () => {
    render(<WorkflowFeedbackProvider><Probe /></WorkflowFeedbackProvider>);
    await requestEligible('money_rebalance_satisfaction_v1', 'rebalance-rated');

    fireEvent.press(screen.getByText('Submit low'));
    fireEvent.press(screen.getByText('Submit reason'));
    fireEvent.press(screen.getByText('Complete'));

    await waitFor(() => expect(screen.getByText('No feedback')).toBeTruthy());
    expect(mockCapture).toHaveBeenCalledWith(AnalyticsEvent.WorkflowFeedbackSubmitted, expect.objectContaining({
      response_value: 2,
      response_band: 'negative',
    }));
    expect(mockCapture).toHaveBeenCalledWith(AnalyticsEvent.WorkflowFeedbackFollowupSubmitted, expect.objectContaining({
      reason_code: 'result_unclear',
    }));
    expect(mockCapture).not.toHaveBeenCalledWith(AnalyticsEvent.WorkflowFeedbackDismissed, expect.anything());
  });

  it('does not replace a visible inline question', async () => {
    render(<WorkflowFeedbackProvider><Probe /></WorkflowFeedbackProvider>);
    await requestEligible('screen_time_block_reason_clarity_v1', 'screen-time-episode');

    act(() => {
      requestWorkflowFeedback({
        promptId: 'screen_time_block_clear_ease_v1',
        sourceKey: 'screen-time-episode',
        placement: 'inline',
      });
    });

    expect(screen.getByText('screen_time_block_reason_clarity_v1')).toBeTruthy();
    expect(screen.queryByText('screen_time_block_clear_ease_v1')).toBeNull();
  });

  it('lets clearing Ease claim the inline slot when Clarity never became visible', async () => {
    render(<WorkflowFeedbackProvider><Probe /></WorkflowFeedbackProvider>);
    act(() => {
      requestWorkflowFeedback({
        promptId: 'screen_time_block_reason_clarity_v1',
        sourceKey: 'screen-time-clarity-only-first-encounter',
        placement: 'inline',
      });
      requestWorkflowFeedback({
        promptId: 'screen_time_block_clear_ease_v1',
        sourceKey: 'screen-time-clear-first',
        placement: 'inline',
      });
      requestWorkflowFeedback({
        promptId: 'screen_time_block_clear_ease_v1',
        sourceKey: 'screen-time-clear-second',
        placement: 'inline',
      });
    });

    await waitFor(() => expect(screen.getByText('screen_time_block_clear_ease_v1')).toBeTruthy());
  });
});
