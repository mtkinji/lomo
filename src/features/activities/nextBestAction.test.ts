import { getNextBestActivityAction } from './nextBestAction';
import type { Activity } from '../../domain/types';

const NOW = new Date('2026-06-19T14:00:00.000Z');

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity-1',
    goalId: null,
    title: 'Write the proposal',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: '2026-06-19T13:00:00.000Z',
    updatedAt: '2026-06-19T13:00:00.000Z',
    ...overrides,
  };
}

describe('getNextBestActivityAction', () => {
  it('keeps focus as the one-tap primary action when the activity has no scheduled time', () => {
    expect(getNextBestActivityAction({ activity: activity(), now: NOW }).id).toBe('startFocusSprint');
  });

  it('does not promote sharing when the activity is already done', () => {
    expect(
      getNextBestActivityAction({
        activity: activity({ status: 'done', scheduledAt: '2026-06-19T14:45:00.000Z' }),
        now: NOW,
      }).id,
    ).toBe('startFocusSprint');
  });

  it('does not promote sharing when all steps are complete', () => {
    expect(
      getNextBestActivityAction({
        activity: activity({
          scheduledAt: '2026-06-19T14:45:00.000Z',
          steps: [
            { id: 'step-1', title: 'Draft', completedAt: '2026-06-19T13:30:00.000Z' },
            { id: 'step-2', title: 'Send', completedAt: '2026-06-19T13:40:00.000Z' },
          ],
        }),
        now: NOW,
      }).id,
    ).toBe('startFocusSprint');
  });

  it('keeps focus as the one-tap primary action when scheduled soon', () => {
    expect(
      getNextBestActivityAction({
        activity: activity({
          scheduledAt: '2026-06-19T14:45:00.000Z',
          steps: [{ id: 'step-1', title: 'Draft' }],
        }),
        now: NOW,
      }).id,
    ).toBe('startFocusSprint');
  });

  it('keeps focus as the one-tap primary action for a new empty task', () => {
    expect(getNextBestActivityAction({ activity: activity(), now: NOW }).id).toBe('startFocusSprint');
  });

  it('keeps focus as the one-tap primary action for an unscheduled task that already has steps', () => {
    expect(
      getNextBestActivityAction({
        activity: activity({ steps: [{ id: 'step-1', title: 'Draft' }] }),
        now: NOW,
      }).id,
    ).toBe('startFocusSprint');
  });

  it('keeps focus as the one-tap primary action for a planned task with structure', () => {
    expect(
      getNextBestActivityAction({
        activity: activity({
          scheduledAt: '2026-06-19T20:00:00.000Z',
          steps: [{ id: 'step-1', title: 'Draft' }],
        }),
        now: NOW,
      }).id,
    ).toBe('startFocusSprint');
  });
});
