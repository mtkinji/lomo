import {
  clampSlotDraft,
  dateForTimelineY,
  snapMinutesToStep,
} from './planSlotDraft';

describe('planSlotDraft', () => {
  it('snaps timeline y positions to 15-minute dates', () => {
    const dayStart = new Date('2026-07-08T00:00:00.000-06:00');
    const date = dateForTimelineY({
      y: 96,
      hourHeight: 64,
      dayStart,
      stepMinutes: 15,
    });

    expect(date.getHours()).toBe(1);
    expect(date.getMinutes()).toBe(30);
  });

  it('clamps draft slots to the day and a minimum duration', () => {
    const dayStart = new Date('2026-07-08T00:00:00.000-06:00');
    const start = new Date(dayStart);
    start.setHours(23, 45, 0, 0);
    const end = new Date(dayStart);
    end.setHours(23, 50, 0, 0);

    const slot = clampSlotDraft({
      start,
      end,
      dayStart,
      minDurationMinutes: 15,
      maxDurationMinutes: 240,
    });

    expect(slot.start.getHours()).toBe(23);
    expect(slot.start.getMinutes()).toBe(45);
    expect(slot.end.getHours()).toBe(0);
    expect(slot.end.getMinutes()).toBe(0);
    expect(slot.end.getDate()).toBe(9);
  });

  it('keeps drag direction irrelevant by ordering start and end', () => {
    const dayStart = new Date('2026-07-08T00:00:00.000-06:00');
    const later = new Date(dayStart);
    later.setHours(12, 0, 0, 0);
    const earlier = new Date(dayStart);
    earlier.setHours(11, 15, 0, 0);

    const slot = clampSlotDraft({
      start: later,
      end: earlier,
      dayStart,
      minDurationMinutes: 15,
      maxDurationMinutes: 240,
    });

    expect(slot.start.getHours()).toBe(11);
    expect(slot.start.getMinutes()).toBe(15);
    expect(slot.end.getHours()).toBe(12);
    expect(slot.end.getMinutes()).toBe(0);
  });

  it('snaps raw minute values to the nearest step', () => {
    expect(snapMinutesToStep(22, 15)).toBe(15);
    expect(snapMinutesToStep(23, 15)).toBe(30);
    expect(snapMinutesToStep(Number.NaN, 15)).toBe(0);
  });
});
