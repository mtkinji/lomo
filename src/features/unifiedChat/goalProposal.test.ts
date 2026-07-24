import { parseGoalCreateInput } from './goalProposal';

test('keeps a bounded daily Activity suggestion with a seven-day Goal', () => {
  expect(parseGoalCreateInput({
    title: 'Walk every day for the next week',
    targetDate: '2026-07-30T23:59:59.000-06:00',
    followUpActivity: { title: 'Go for a walk', repeatRule: 'daily' },
  })).toEqual({
    title: 'Walk every day for the next week',
    targetDate: '2026-07-30T23:59:59.000-06:00',
    followUpActivity: { title: 'Go for a walk', repeatRule: 'daily' },
  });
});

test('rejects an unsupported follow-up instead of widening Goal ownership', () => {
  expect(parseGoalCreateInput({
    title: 'Walk more',
    followUpActivity: { title: 'Go for a walk', repeatRule: 'weekly', goalId: 'invented' },
  })).toBeNull();
});
