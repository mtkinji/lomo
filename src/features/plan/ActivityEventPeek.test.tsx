import * as React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import {
  activityFixture,
  goalFixture,
  resetAllStores,
  seedDomain,
} from '../../test/storeFixtures';
import { useAppStore } from '../../store/useAppStore';
import { recordShowUpWithCelebration } from '../../store/useCelebrationStore';
import { useToastStore } from '../../store/useToastStore';
import { ActivityEventPeek } from './ActivityEventPeek';

const mockCapture = jest.fn();
const mockExpansionFadeProps: Array<Record<string, unknown>> = [];

jest.mock('../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: mockCapture }),
}));

jest.mock('../../services/HapticsService', () => ({
  HapticsService: { trigger: jest.fn(async () => undefined) },
}));

jest.mock('../../store/useCelebrationStore', () => ({
  recordShowUpWithCelebration: jest.fn(),
}));

jest.mock('../../services/screenTimeProtectionRuntime', () => ({
  reconcileScreenTimeRestrictions: jest.fn(async () => undefined),
}));

jest.mock('../activities/ActivityPeekFields', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    ActivityPeekSteps: ({
      activity,
      maxItems,
      incompleteOnly,
    }: {
      activity: { steps?: Array<{ id: string; title: string; completedAt?: string | null }> | null };
      maxItems?: number;
      incompleteOnly?: boolean;
    }) => {
      const steps = (activity.steps ?? [])
        .filter((step) => !incompleteOnly || !step.completedAt)
        .slice(0, maxItems);
      return React.createElement(
        View,
        null,
        ...steps.map((step) => React.createElement(Text, { key: step.id }, step.title)),
      );
    },
    ActivityPeekNotes: () => null,
    ActivityPeekTags: () => null,
  };
});

jest.mock('../../ui/BottomDrawer', () => {
  const React = require('react');
  const { ScrollView, View } = require('react-native');
  return {
    BottomDrawerScrollView: ({ children, ...rest }: { children?: React.ReactNode } & Record<string, unknown>) =>
      React.createElement(ScrollView, rest, children),
    BottomDrawerExpansionFade: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => {
      mockExpansionFadeProps.push(props);
      return React.createElement(View, null, children);
    },
  };
});

const baseProps = {
  activityId: 'act-1',
  sessionId: 'session-1',
  start: new Date('2026-07-09T06:00:00.000-06:00'),
  end: new Date('2026-07-09T06:30:00.000-06:00'),
  onOpenFocus: jest.fn(),
  onOpenFullActivity: jest.fn(),
  onMoveCommitment: jest.fn(),
  onUnscheduleCommitment: jest.fn(),
  onRequestClose: jest.fn(),
};

describe('ActivityEventPeek completion action', () => {
  const recordShowUpWithCelebrationMock = recordShowUpWithCelebration as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExpansionFadeProps.length = 0;
    resetAllStores();
  });

  it('marks a scheduled activity complete without leaving Plan', () => {
    seedDomain({
      goals: [goalFixture()],
      activities: [activityFixture({ id: 'act-1', title: 'Test', status: 'planned' })],
    });

    const { getByText, queryByText, queryByLabelText } = renderWithProviders(<ActivityEventPeek {...baseProps} />);

    expect(queryByText('Scheduled')).toBeNull();
    expect(queryByLabelText('Close')).toBeNull();

    expect(getByText('Close this block')).toBeTruthy();
    fireEvent.press(getByText('Mark complete'));

    const activity = useAppStore.getState().activities.find((candidate) => candidate.id === 'act-1');
    expect(activity?.status).toBe('done');
    expect(activity?.completedAt).toBeTruthy();
    expect(recordShowUpWithCelebrationMock).toHaveBeenCalledWith({
      baseSound: 'activity',
      allScheduledActivitiesDone: false,
    });
    expect(useToastStore.getState()).toMatchObject({
      message: 'To-do complete',
      actionLabel: 'Undo',
      durationMs: 5000,
    });

    act(() => {
      useToastStore.getState().actionOnPress?.();
    });

    const restored = useAppStore.getState().activities.find((candidate) => candidate.id === 'act-1');
    expect(restored?.status).toBe('planned');
    expect(restored?.completedAt).toBeNull();
    expect(baseProps.onOpenFullActivity).not.toHaveBeenCalled();
  });

  it('removes duplicated identity and move chrome when embedded below the session peek', () => {
    seedDomain({
      goals: [goalFixture()],
      activities: [activityFixture({ id: 'act-1', title: 'Test', status: 'planned' })],
    });

    const { queryByText, getByText } = renderWithProviders(
      <ActivityEventPeek {...baseProps} embedded />,
    );

    expect(queryByText('Test')).toBeNull();
    expect(queryByText('6:00 AM - 6:30 AM')).toBeNull();
    expect(queryByText('Move')).toBeNull();
    expect(getByText('Start Focus')).toBeTruthy();
  });

  it('renders one continuous embedded drawer with focus before management actions', () => {
    seedDomain({
      goals: [goalFixture()],
      activities: [activityFixture({ id: 'act-1', title: 'Test', status: 'planned' })],
    });

    const { getByText } = renderWithProviders(
      <ActivityEventPeek {...baseProps} embedded />,
    );

    expect(getByText('Open')).toBeTruthy();
    expect(getByText('Mark complete')).toBeTruthy();
    expect(getByText('Unschedule')).toBeTruthy();
    expect(mockExpansionFadeProps.at(-1)).toMatchObject({
      from: 0.17,
      to: 0.34,
      minimumOpacity: 0.1,
    });
  });

  it('finishes remaining steps from the scheduled activity drawer', () => {
    seedDomain({
      goals: [goalFixture()],
      activities: [
        activityFixture({
          id: 'act-1',
          title: 'Test',
          status: 'in_progress',
          steps: [
            { id: 'step-1', title: 'One', completedAt: '2026-07-09T11:00:00.000Z' },
            { id: 'step-2', title: 'Two', completedAt: null },
          ],
        }),
      ],
    });

    const { getByText } = renderWithProviders(<ActivityEventPeek {...baseProps} />);

    expect(getByText('1/2 steps checked')).toBeTruthy();
    fireEvent.press(getByText('Finish remaining'));

    const activity = useAppStore.getState().activities.find((candidate) => candidate.id === 'act-1');
    expect(activity?.status).toBe('done');
    expect(activity?.steps?.every((step) => Boolean(step.completedAt))).toBe(true);

    act(() => {
      useToastStore.getState().actionOnPress?.();
    });

    const restored = useAppStore.getState().activities.find((candidate) => candidate.id === 'act-1');
    expect(restored?.status).toBe('in_progress');
    expect(restored?.steps?.[0]?.completedAt).toBe('2026-07-09T11:00:00.000Z');
    expect(restored?.steps?.[1]?.completedAt).toBeNull();
  });
});
