import {
  createWeeklyMoneySavedCheck,
  normalizeMoneySavedCheck,
  updateMoneySavedCheck,
} from './moneySavedCheck';

describe('MoneySavedCheck', () => {
  it('creates one private Friday morning check without storing an answer', () => {
    const check = createWeeklyMoneySavedCheck({
      nowIso: '2026-07-31T12:00:00.000Z', timezone: 'America/Denver',
    });
    expect(check).toEqual({
      id: 'money-limit', kind: 'current_plan_within_income_limit',
      cadence: { kind: 'weekly', weekday: 5, hour: 9, minute: 0, timezone: 'America/Denver' },
      disclosure: 'private_prompt_only', active: true, notificationId: null, lastRun: null,
      createdAtIso: '2026-07-31T12:00:00.000Z', updatedAtIso: '2026-07-31T12:00:00.000Z',
    });
    expect(JSON.stringify(check)).not.toMatch(/cents|amount|percent|answer/i);
  });

  it.each([
    [{ kind: 'arbitrary_question' }],
    [{ cadence: { kind: 'weekly', weekday: 7, hour: 9, minute: 0, timezone: 'America/Denver' } }],
    [{ cadence: { kind: 'weekly', weekday: 5, hour: 24, minute: 0, timezone: 'America/Denver' } }],
    [{ cadence: { kind: 'weekly', weekday: 5, hour: 9, minute: 0, timezone: '' } }],
    [{ disclosure: 'lock_screen_answer' }],
  ])('rejects an unsupported or unsafe saved check: %j', (override) => {
    const valid = createWeeklyMoneySavedCheck({ nowIso: '2026-07-31T12:00:00.000Z', timezone: 'America/Denver' });
    expect(normalizeMoneySavedCheck({ ...valid, ...override })).toBeNull();
  });

  it('preserves cadence while pausing and recording an opened notification', () => {
    const check = createWeeklyMoneySavedCheck({ nowIso: '2026-07-31T12:00:00.000Z', timezone: 'America/Denver' });
    const updated = updateMoneySavedCheck(check, {
      active: false, notificationId: null,
      lastRun: { status: 'opened', atIso: '2026-08-07T15:00:00.000Z' },
      updatedAtIso: '2026-08-07T15:00:00.000Z',
    });
    expect(updated.cadence).toEqual(check.cadence);
    expect(updated).toMatchObject({ active: false, notificationId: null, lastRun: { status: 'opened' } });
  });
});
