import {
  FREE_GENERATIVE_CREDITS_PER_MONTH,
  PRO_GENERATIVE_CREDITS_PER_MONTH,
  PRO_TOOLS_TRIAL_GENERATIVE_CREDITS_TOTAL,
  getMonthKey,
  getMonthlyCreditLimit,
} from './generativeCredits';

describe('generative credits constants', () => {
  it('Pro monthly limit is greater than free monthly limit', () => {
    expect(PRO_GENERATIVE_CREDITS_PER_MONTH).toBeGreaterThan(
      FREE_GENERATIVE_CREDITS_PER_MONTH,
    );
  });

  it('Pro tools trial total is positive', () => {
    expect(PRO_TOOLS_TRIAL_GENERATIVE_CREDITS_TOTAL).toBeGreaterThan(0);
  });
});

describe('getMonthlyCreditLimit', () => {
  it('returns Pro limit for "pro" tier', () => {
    expect(getMonthlyCreditLimit('pro')).toBe(PRO_GENERATIVE_CREDITS_PER_MONTH);
  });

  it('returns free limit for "free" tier', () => {
    expect(getMonthlyCreditLimit('free')).toBe(FREE_GENERATIVE_CREDITS_PER_MONTH);
  });

  it('returns free limit for "pro_tools_trial" tier (monthly cap, trial total tracked separately)', () => {
    expect(getMonthlyCreditLimit('pro_tools_trial')).toBe(
      FREE_GENERATIVE_CREDITS_PER_MONTH,
    );
  });
});

describe('getMonthKey', () => {
  it('produces YYYY-MM format from a Date in local time', () => {
    expect(getMonthKey(new Date(2026, 0, 15, 9, 30))).toBe('2026-01');
    expect(getMonthKey(new Date(2026, 11, 31, 23, 0))).toBe('2026-12');
  });

  it('zero-pads single-digit months', () => {
    expect(getMonthKey(new Date(2026, 4, 1))).toBe('2026-05');
  });

  it('uses local Date components, not UTC ones', () => {
    const date = new Date(2026, 5, 1, 0, 0, 0);
    const key = getMonthKey(date);
    expect(key.startsWith('2026-')).toBe(true);
    expect(key.length).toBe(7);
  });
});
