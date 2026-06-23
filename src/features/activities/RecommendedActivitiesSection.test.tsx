import React from 'react';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { Activity } from '../../domain/types';
import { RecommendedActivitiesSection } from './RecommendedActivitiesSection';
import type { RankedActivity } from './activityPriority';

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    goalId: null,
    title: 'Call the school',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
    reminderAt: null,
    repeatRule: undefined,
    repeatCustom: undefined,
    scheduledDate: null,
    scheduledAt: null,
    ...overrides,
  } as Activity;
}

const handlers = {
  goalTitleById: {},
  isMetaLoading: () => false,
  onPressActivity: jest.fn(),
  onToggleComplete: jest.fn(),
  onTogglePriority: jest.fn(),
};

describe('RecommendedActivitiesSection', () => {
  it('renders nothing when there are no recommendations', () => {
    const { queryByTestId } = renderWithProviders(
      <RecommendedActivitiesSection recommendations={[]} {...handlers} />,
    );

    expect(queryByTestId('activities.recommendedSection')).toBeNull();
  });

  it('renders recommended activities with normal list metadata', () => {
    const recommendations: RankedActivity[] = [
      {
        activity: activity({
          id: 'act-1',
          goalId: 'goal-1',
          title: 'Call the school',
          estimateMinutes: 90,
        }),
        score: 100,
        reasonCodes: ['due_today'],
      },
    ];

    const { getByLabelText, getByText, getByTestId } = renderWithProviders(
      <RecommendedActivitiesSection
        recommendations={recommendations}
        {...handlers}
        goalTitleById={{ 'goal-1': 'Family logistics' }}
      />,
    );

    expect(getByTestId('activities.recommendedSection')).toBeTruthy();
    expect(getByText('RECOMMENDED')).toBeTruthy();
    expect(getByLabelText('Why these to-dos are recommended')).toBeTruthy();
    expect(getByText('Call the school')).toBeTruthy();
    expect(getByText(/1 hr 30 min/)).toBeTruthy();
    expect(getByText(/Family logistics/)).toBeTruthy();
  });
});
