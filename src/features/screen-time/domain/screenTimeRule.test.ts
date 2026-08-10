import {
  DEFAULT_TEMPORARY_OPEN_MINUTES,
  normalizeScreenTimeRule,
  type ScreenTimeRule,
} from './screenTimeRule';

describe('ScreenTimeRule', () => {
  it('normalizes a personal rule with a stable selection and 20-minute temporary opening', () => {
    const rule = normalizeScreenTimeRule({
      id: ' personal-real-step ',
      domain: 'personal',
      subject: { kind: 'self' },
      selectionId: ' personal_real_step ',
      title: ' Do a real step first ',
      trigger: { type: 'real_step_pending', minFocusMinutes: 10 },
      temporaryOpen: { allowed: true, durationMinutes: 15 },
      active: true,
      desiredVersion: 2,
      appliedVersion: 1,
    });

    expect(rule).toEqual({
      id: 'personal-real-step',
      domain: 'personal',
      subject: { kind: 'self' },
      selectionId: 'personal_real_step',
      title: 'Do a real step first',
      trigger: { type: 'real_step_pending', minFocusMinutes: 10 },
      temporaryOpen: { allowed: true, durationMinutes: DEFAULT_TEMPORARY_OPEN_MINUTES },
      active: true,
      desiredVersion: 2,
      appliedVersion: 1,
    });
  });

  it('rejects a family rule without a child subject', () => {
    expect(normalizeScreenTimeRule({
      id: 'family-games',
      domain: 'family',
      subject: { kind: 'self' },
      selectionId: 'family_games',
      title: 'Games after responsibilities',
      trigger: { type: 'family_agreement', agreementId: 'agreement-1' },
      temporaryOpen: { allowed: true, durationMinutes: 20 },
      active: true,
    })).toBeNull();
  });

  it('rejects malformed or mismatched rule triggers', () => {
    const base: Omit<ScreenTimeRule, 'trigger'> = {
      id: 'money-shopping',
      domain: 'money',
      subject: { kind: 'self' },
      selectionId: 'money_shopping',
      title: 'Review Shopping',
      temporaryOpen: { allowed: true, durationMinutes: 20 },
      active: true,
      desiredVersion: 1,
      appliedVersion: null,
    };

    expect(normalizeScreenTimeRule({ ...base, trigger: { type: 'focus_active' } })).toBeNull();
    expect(normalizeScreenTimeRule({ ...base, trigger: { type: 'money_review', categorySourceId: '' } })).toBeNull();
  });
});

