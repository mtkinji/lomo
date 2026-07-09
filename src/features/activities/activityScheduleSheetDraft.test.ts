import { resolveActivityScheduleSheetDraft } from './activityScheduleSheetDraft';

describe('activityScheduleSheetDraft', () => {
  it('reuses an existing scheduled start when it is reasonably current', () => {
    const now = new Date(2026, 6, 9, 10, 0, 0, 0);
    const scheduledAt = new Date(2026, 6, 9, 9, 59, 30, 0).toISOString();

    const result = resolveActivityScheduleSheetDraft({
      scheduledAt,
      estimateMinutes: 42.4,
      now,
    });

    expect(result).toEqual({
      draftStart: new Date(scheduledAt),
      durationDraft: '42',
      targetDate: new Date(scheduledAt),
    });
  });

  it('rounds a new start up to the next 15-minute boundary when no scheduled start is usable', () => {
    const now = new Date(2026, 6, 9, 10, 7, 10, 0);

    const result = resolveActivityScheduleSheetDraft({
      scheduledAt: null,
      estimateMinutes: undefined,
      now,
    });

    expect(result).toEqual({
      draftStart: new Date(2026, 6, 9, 10, 15, 0, 0),
      durationDraft: '30',
      targetDate: new Date(2026, 6, 9, 10, 15, 0, 0),
    });
  });

  it('does not reuse invalid or stale scheduled starts', () => {
    const now = new Date(2026, 6, 9, 10, 0, 0, 0);

    expect(resolveActivityScheduleSheetDraft({
      scheduledAt: 'not-a-date',
      estimateMinutes: 25,
      now,
    }).draftStart).toEqual(new Date(2026, 6, 9, 10, 0, 0, 0));

    expect(resolveActivityScheduleSheetDraft({
      scheduledAt: new Date(2026, 6, 9, 9, 58, 59, 999).toISOString(),
      estimateMinutes: 25,
      now,
    }).draftStart).toEqual(new Date(2026, 6, 9, 10, 0, 0, 0));
  });

  it('keeps duration text within the existing minimum and default behavior', () => {
    const now = new Date(2026, 6, 9, 10, 0, 0, 0);

    expect(resolveActivityScheduleSheetDraft({
      scheduledAt: null,
      estimateMinutes: 3,
      now,
    }).durationDraft).toBe('5');

    expect(resolveActivityScheduleSheetDraft({
      scheduledAt: null,
      estimateMinutes: null,
      now,
    }).durationDraft).toBe('30');
  });
});
