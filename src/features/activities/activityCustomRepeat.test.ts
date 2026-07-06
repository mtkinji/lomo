import type { ActivityRepeatCustom } from '../../domain/types';
import {
  buildActivityCustomRepeatPayload,
  resolveActivityCustomRepeatDraft,
} from './activityCustomRepeat';

describe('activityCustomRepeat', () => {
  it('normalizes weekly payloads into sorted unique weekdays', () => {
    const result = buildActivityCustomRepeatPayload({
      cadence: 'weeks',
      interval: 2.4,
      weekdays: [5, 1, 5, 9, -1, 2.2],
      fallbackWeekday: 3,
    });

    expect(result).toEqual({
      cadence: 'weeks',
      interval: 2,
      weekdays: [1, 5],
    });
  });

  it('falls back to today when a weekly payload has no usable weekdays', () => {
    const result = buildActivityCustomRepeatPayload({
      cadence: 'weeks',
      interval: 0,
      weekdays: [],
      fallbackWeekday: 4,
    });

    expect(result).toEqual({
      cadence: 'weeks',
      interval: 1,
      weekdays: [4],
    });
  });

  it('omits weekdays for non-weekly payloads', () => {
    const result = buildActivityCustomRepeatPayload({
      cadence: 'months',
      interval: 3.6,
      weekdays: [1, 2],
      fallbackWeekday: 5,
    });

    expect(result).toEqual({
      cadence: 'months',
      interval: 4,
    });
  });

  it('hydrates a weekly draft from existing custom repeat settings', () => {
    const repeatCustom: ActivityRepeatCustom = {
      cadence: 'weeks',
      interval: 1.6,
      weekdays: [6, 2, 2],
    };

    const result = resolveActivityCustomRepeatDraft({
      repeatRule: 'custom',
      repeatCustom,
      fallbackWeekday: 1,
    });

    expect(result).toEqual({
      cadence: 'weeks',
      interval: 2,
      weekdays: [2, 6],
    });
  });

  it('hydrates a default weekly draft when there is no custom repeat config', () => {
    const result = resolveActivityCustomRepeatDraft({
      repeatRule: 'daily',
      repeatCustom: undefined,
      fallbackWeekday: 0,
    });

    expect(result).toEqual({
      cadence: 'weeks',
      interval: 1,
      weekdays: [0],
    });
  });
});
