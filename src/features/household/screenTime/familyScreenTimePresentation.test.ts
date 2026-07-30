import { createDefaultFamilyScreenTimeRecord } from './familyScreenTimeLearning';
import {
  buildFamilyScreenTimeSummary,
  compactFamilyScreenTimeCriteria,
} from './familyScreenTimePresentation';

const rule = createDefaultFamilyScreenTimeRecord().rule;

function summaryFor(
  deliveryState: 'device_required' | 'ready_to_activate' | 'applying' | 'applied' | 'releasing',
  issue: string | null = null,
) {
  return buildFamilyScreenTimeSummary({
    childMembershipId: 'child-1',
    childDisplayName: 'Charlie',
    rule,
    deliveryState,
    childExplanation: 'Games open at 4:00 PM.',
    issue,
  });
}

describe('familyScreenTimePresentation', () => {
  it('builds the compact applied agreement without internal delivery language', () => {
    const summary = summaryFor('applied');

    expect(summary).toEqual({
      childMembershipId: 'child-1',
      childDisplayName: 'Charlie',
      targetLabel: 'Games',
      scheduleLabel: 'Weekdays, 4–7 PM',
      limitLabel: '30 min/day',
      responsibilityLabel: null,
      childExplanation: 'Games open at 4:00 PM.',
      lifecycle: 'applied',
      nextAction: 'edit',
      issue: null,
    });
    expect(compactFamilyScreenTimeCriteria(summary)).toBe('Weekdays, 4–7 PM · 30 min/day');
    expect(JSON.stringify(summary)).not.toMatch(/desired version|receipt|Apple authorization/i);
  });

  it.each([
    ['device_required', null, 'needs_setup', 'continue_setup'],
    ['ready_to_activate', null, 'ready', 'activate'],
    ['applying', null, 'applying', 'none'],
    ['applied', null, 'applied', 'edit'],
    ['applied', 'Charlie’s iPhone has not checked in.', 'needs_attention', 'recover'],
    ['releasing', null, 'releasing', 'none'],
  ] as const)(
    'maps %s with issue %s to %s and %s',
    (deliveryState, issue, lifecycle, nextAction) => {
      expect(summaryFor(deliveryState, issue)).toEqual(expect.objectContaining({
        lifecycle,
        nextAction,
        issue,
      }));
    },
  );
});
