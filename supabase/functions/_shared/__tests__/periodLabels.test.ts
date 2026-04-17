import { formatHumanPeriodLabel } from '../periodLabels';

describe('formatHumanPeriodLabel', () => {
  it('renders a weekly cadence as "the week of <Mon Day>"', () => {
    const label = formatHumanPeriodLabel({
      cadence: 'weekly',
      // Monday Apr 13 2026 in Pacific time → 07:00 UTC
      startIso: '2026-04-13T07:00:00.000Z',
      endIso: '2026-04-20T07:00:00.000Z',
      timezone: 'America/Los_Angeles',
    });
    expect(label).toBe('the week of Apr 13');
  });

  it('renders a monthly cadence as "<Month> <Year>"', () => {
    const label = formatHumanPeriodLabel({
      cadence: 'monthly',
      startIso: '2026-04-01T07:00:00.000Z',
      endIso: '2026-05-01T07:00:00.000Z',
      timezone: 'America/Los_Angeles',
    });
    expect(label).toBe('April 2026');
  });

  it('renders a yearly cadence as the year number', () => {
    const label = formatHumanPeriodLabel({
      cadence: 'yearly',
      startIso: '2026-01-01T08:00:00.000Z',
      endIso: '2027-01-01T08:00:00.000Z',
      timezone: 'America/Los_Angeles',
    });
    expect(label).toBe('2026');
  });

  it('renders a custom cadence as a date range within the same month', () => {
    const label = formatHumanPeriodLabel({
      cadence: 'custom',
      startIso: '2026-04-13T07:00:00.000Z',
      endIso: '2026-04-21T07:00:00.000Z',
      timezone: 'America/Los_Angeles',
    });
    // "Apr 13–20, 2026" (inclusive end since DB end is exclusive).
    expect(label).toBe('Apr 13\u201320, 2026');
  });

  it('renders a custom cadence spanning two months as "Mon Day – Mon Day, Year"', () => {
    const label = formatHumanPeriodLabel({
      cadence: 'custom',
      startIso: '2026-03-30T07:00:00.000Z',
      endIso: '2026-04-06T07:00:00.000Z',
      timezone: 'America/Los_Angeles',
    });
    expect(label).toBe('Mar 30 \u2013 Apr 5, 2026');
  });

  it('treats "manual" cadence the same as custom for label purposes', () => {
    const label = formatHumanPeriodLabel({
      cadence: 'manual',
      startIso: '2026-04-13T07:00:00.000Z',
      endIso: '2026-04-21T07:00:00.000Z',
      timezone: 'America/Los_Angeles',
    });
    expect(label).toBe('Apr 13\u201320, 2026');
  });

  it('falls back gracefully when the timezone is invalid', () => {
    const label = formatHumanPeriodLabel({
      cadence: 'monthly',
      startIso: '2026-04-01T00:00:00.000Z',
      endIso: '2026-05-01T00:00:00.000Z',
      timezone: 'Not/A_Real_Zone',
    });
    expect(label).toBe('April 2026');
  });

  it('falls back to a generic phrase when timestamps are unparseable', () => {
    const label = formatHumanPeriodLabel({
      cadence: 'weekly',
      startIso: 'not-an-iso',
      endIso: 'also-not',
      timezone: 'America/Los_Angeles',
    });
    expect(label).toBe('this week');
  });

  it('never leaks an ISO-week-style key into the label', () => {
    // Regression guard for the bug fixed by Phase 3.5.2 of email-system-ga-plan.md.
    const label = formatHumanPeriodLabel({
      cadence: 'weekly',
      startIso: '2026-04-13T07:00:00.000Z',
      endIso: '2026-04-20T07:00:00.000Z',
      timezone: 'America/Los_Angeles',
    });
    expect(label).not.toMatch(/\d{4}-W\d{2}/);
  });
});
