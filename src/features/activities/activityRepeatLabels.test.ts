import type { ActivityRepeatCustom, ActivityRepeatRule } from '../../domain/types';
import { formatActivityRepeatLabel } from './activityRepeatLabels';

function label(rule?: ActivityRepeatRule, repeatCustom?: ActivityRepeatCustom): string {
  return formatActivityRepeatLabel({ repeatRule: rule, repeatCustom });
}

describe('formatActivityRepeatLabel', () => {
  it('formats built-in repeat rules', () => {
    expect(label()).toBe('Off');
    expect(label('daily')).toBe('Daily');
    expect(label('weekly')).toBe('Weekly');
    expect(label('weekdays')).toBe('Weekdays');
    expect(label('monthly')).toBe('Monthly');
    expect(label('yearly')).toBe('Yearly');
  });

  it('formats custom weekly rules with sorted unique weekdays', () => {
    expect(label('custom', { cadence: 'weeks', interval: 1, weekdays: [5, 1, 5, 3] })).toBe(
      'Weekly (Mo We Fr)',
    );
    expect(label('custom', { cadence: 'weeks', interval: 2, weekdays: [0, 6] })).toBe(
      'Every 2 weeks (Su Sa)',
    );
  });

  it('falls back for custom weekly rules without valid weekdays', () => {
    expect(label('custom', { cadence: 'weeks', interval: 1, weekdays: [] })).toBe('Weekly');
    expect(label('custom', { cadence: 'weeks', interval: 3, weekdays: [-1, 7] })).toBe('Every 3 weeks');
  });

  it('formats custom day, month, and year intervals', () => {
    expect(label('custom', { cadence: 'days', interval: 1 })).toBe('Every day');
    expect(label('custom', { cadence: 'days', interval: 4 })).toBe('Every 4 days');
    expect(label('custom', { cadence: 'months', interval: 2 })).toBe('Every 2 months');
    expect(label('custom', { cadence: 'years', interval: 1 })).toBe('Every year');
  });

  it('returns Custom when the custom rule has no custom config', () => {
    expect(label('custom')).toBe('Custom');
  });
});
