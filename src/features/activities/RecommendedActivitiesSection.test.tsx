import React from 'react';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { Activity } from '../../domain/types';
import { buildPriorityIndicator } from './activityPriorityIndicator';
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
        scoreComponents: {
          urgency: 100,
          importance: 0,
          readiness: 0,
          effortShape: 0,
          contextFit: 0,
          confidence: 0,
        },
        reasonCodes: ['due_today'],
        contextConfidence: 'none',
        contextLabel: null,
      },
    ];

    const { getByLabelText, getByText, getByTestId, queryByText } = renderWithProviders(
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
    expect(getByText('~90 min')).toBeTruthy();
    expect(queryByText(/Family logistics/)).toBeNull();
  });

  it('shows priority position while keeping reason details behind the indicator', () => {
    const recommendations: RankedActivity[] = [
      {
        activity: activity({
          id: 'act-1',
          title: 'Call the school',
        }),
        score: 100,
        scoreComponents: {
          urgency: 0,
          importance: 100,
          readiness: 0,
          effortShape: 0,
          contextFit: 0,
          confidence: 0,
        },
        reasonCodes: ['moved_by_user'],
        contextConfidence: 'none',
        contextLabel: null,
      },
    ];

    const { getByLabelText, getByText, queryByText } = renderWithProviders(
      <RecommendedActivitiesSection
        recommendations={recommendations}
        {...handlers}
        priorityIndicatorByActivityId={
          new Map([
            [
              'act-1',
              {
                label: '#3',
                tone: 'top',
                accessibilityLabel: 'Priority 3 of 42. Show priority reasons.',
                reasons: ['Moved by you'],
              },
            ],
          ])
        }
      />,
    );

    expect(getByText('#3')).toBeTruthy();
    expect(getByLabelText('Priority 3 of 42. Show priority reasons.')).toBeTruthy();
    expect(queryByText('Moved by you')).toBeNull();
  });

  it('tiers priority indicators for top 3, top 10, and the rest', () => {
    expect(buildPriorityIndicator({ position: 3, total: 42, reasons: [] })).toMatchObject({
      label: '#3',
      tone: 'top',
    });
    expect(buildPriorityIndicator({ position: 4, total: 42, reasons: [] })).toMatchObject({
      label: '#4',
      tone: 'high',
    });
    expect(buildPriorityIndicator({ position: 10, total: 42, reasons: [] })).toMatchObject({
      label: '#10',
      tone: 'high',
    });
    expect(buildPriorityIndicator({ position: 11, total: 42, reasons: [] })).toBeNull();
  });
});
