import {
  buildPlanPriorityPresentation,
  formatPlanNeedsTimeReason,
} from './planPriorityPresentation';

describe('Plan priority presentation', () => {
  test('merges scheduled and needs-time items in the authoritative priority order', () => {
    const scheduled = [{ activityId: 'second', priorityPosition: 1 }];
    const needsTime = [{
      activityId: 'first', priorityPosition: 0, reason: 'needs_larger_window' as const,
      durationMinutes: 120, mode: 'personal' as const,
    }];

    expect(buildPlanPriorityPresentation({
      recommendations: scheduled,
      unplacedPriorities: needsTime,
    })).toEqual([
      expect.objectContaining({ kind: 'needs_time', priorityPosition: 0, priority: needsTime[0] }),
      expect.objectContaining({ kind: 'scheduled', priorityPosition: 1, recommendation: scheduled[0] }),
    ]);
  });

  test('uses the same needs-time language as native Plan', () => {
    expect(formatPlanNeedsTimeReason({
      reason: 'needs_larger_window', durationMinutes: 120, mode: 'personal',
    })).toBe('No obvious 2 hrs opening.');
  });
});
