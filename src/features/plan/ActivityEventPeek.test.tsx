import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import {
  activityFixture,
  goalFixture,
  resetAllStores,
  seedDomain,
} from '../../test/storeFixtures';
import { useAppStore } from '../../store/useAppStore';
import { ActivityEventPeek } from './ActivityEventPeek';

const mockCapture = jest.fn();

jest.mock('../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: mockCapture }),
}));

jest.mock('../../services/HapticsService', () => ({
  HapticsService: { trigger: jest.fn(async () => undefined) },
}));

jest.mock('../../services/uiSounds', () => ({
  playActivityDoneSound: jest.fn(async () => undefined),
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
    ActivityPeekSteps: ({ activity }: { activity: { steps?: unknown[] | null } }) =>
      React.createElement(View, null, React.createElement(Text, null, `${activity.steps?.length ?? 0} steps`)),
    ActivityPeekNotes: () => null,
    ActivityPeekTags: () => null,
  };
});

jest.mock('../../ui/BottomDrawer', () => {
  const React = require('react');
  const { ScrollView } = require('react-native');
  return {
    BottomDrawerScrollView: ({ children, ...rest }: { children?: React.ReactNode } & Record<string, unknown>) =>
      React.createElement(ScrollView, rest, children),
  };
});

const baseProps = {
  activityId: 'act-1',
  start: new Date('2026-07-09T06:00:00.000-06:00'),
  end: new Date('2026-07-09T06:30:00.000-06:00'),
  onOpenFocus: jest.fn(),
  onOpenFullActivity: jest.fn(),
  onMoveCommitment: jest.fn(),
  onUnscheduleCommitment: jest.fn(),
  onRequestClose: jest.fn(),
};

describe('ActivityEventPeek completion action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAllStores();
  });

  it('marks a scheduled activity complete without leaving Plan', () => {
    seedDomain({
      goals: [goalFixture()],
      activities: [activityFixture({ id: 'act-1', title: 'Test', status: 'planned' })],
    });

    const { getByText } = renderWithProviders(<ActivityEventPeek {...baseProps} />);

    expect(getByText('Close this block')).toBeTruthy();
    fireEvent.press(getByText('Mark complete'));

    const activity = useAppStore.getState().activities.find((candidate) => candidate.id === 'act-1');
    expect(activity?.status).toBe('done');
    expect(activity?.completedAt).toBeTruthy();
    expect(baseProps.onOpenFullActivity).not.toHaveBeenCalled();
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
  });
});
