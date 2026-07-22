import {
  adjustSlotDraft,
  clampSlotDraft,
  createDefaultSlotDraft,
  dateForTimelineY,
  getTimelineScrollOffsetToFocusSlot,
  getTimelineScrollOffsetForSlot,
  getTimelineScrollOffsetToRevealSlot,
  minutesForTimelineTranslation,
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

    expect(date.getTime() - dayStart.getTime()).toBe(90 * 60_000);
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

  it('creates a one-hour selected block from a tapped calendar time', () => {
    const dayStart = new Date('2026-07-08T00:00:00.000-06:00');
    const tappedAt = new Date(dayStart);
    tappedAt.setHours(10, 0, 0, 0);

    const slot = createDefaultSlotDraft({ tappedAt, dayStart });

    expect(slot.start.getHours()).toBe(10);
    expect(slot.start.getMinutes()).toBe(0);
    expect(slot.end.getHours()).toBe(11);
    expect(slot.end.getMinutes()).toBe(0);
  });

  it('moves a selected block in 15-minute steps without changing its duration', () => {
    const dayStart = new Date('2026-07-08T00:00:00.000-06:00');
    const start = new Date(dayStart);
    start.setHours(10, 0, 0, 0);
    const end = new Date(dayStart);
    end.setHours(11, 0, 0, 0);

    const slot = adjustSlotDraft({
      slot: { start, end },
      edge: 'move',
      deltaMinutes: 45,
      dayStart,
    });

    expect(slot.start.getHours()).toBe(10);
    expect(slot.start.getMinutes()).toBe(45);
    expect(slot.end.getHours()).toBe(11);
    expect(slot.end.getMinutes()).toBe(45);
  });

  it('resizes either edge while preserving the minimum duration', () => {
    const dayStart = new Date('2026-07-08T00:00:00.000-06:00');
    const start = new Date(dayStart);
    start.setHours(10, 0, 0, 0);
    const end = new Date(dayStart);
    end.setHours(11, 0, 0, 0);

    const resizedStart = adjustSlotDraft({
      slot: { start, end },
      edge: 'start',
      deltaMinutes: 30,
      dayStart,
    });
    const resizedEnd = adjustSlotDraft({
      slot: { start, end },
      edge: 'end',
      deltaMinutes: -90,
      dayStart,
    });

    expect(resizedStart.start.getHours()).toBe(10);
    expect(resizedStart.start.getMinutes()).toBe(30);
    expect(resizedStart.end.getHours()).toBe(11);
    expect(resizedEnd.start.getHours()).toBe(10);
    expect(resizedEnd.end.getHours()).toBe(10);
    expect(resizedEnd.end.getMinutes()).toBe(15);
  });

  it('converts drag distance into snapped timeline minutes', () => {
    expect(minutesForTimelineTranslation({ translationY: 48, hourHeight: 64 })).toBe(45);
    expect(minutesForTimelineTranslation({ translationY: -20, hourHeight: 64 })).toBe(-15);
  });

  it('scrolls a lower slot above a compact editor overlay', () => {
    expect(
      getTimelineScrollOffsetToRevealSlot({
        slotTop: 700,
        slotHeight: 64,
        currentOffset: 200,
        viewportHeight: 700,
        bottomOverlayInset: 250,
        margin: 24,
      }),
    ).toBe(338);
  });

  it('focuses a selected slot near the top of the timeline', () => {
    expect(
      getTimelineScrollOffsetToFocusSlot({
        slotTop: 336,
        topMargin: 16,
      }),
    ).toBe(320);

    expect(
      getTimelineScrollOffsetToFocusSlot({
        slotTop: 8,
        topMargin: 16,
      }),
    ).toBe(0);
  });

  it('does not auto-scroll while the user is moving or resizing the slot', () => {
    expect(
      getTimelineScrollOffsetForSlot({
        adjustmentActive: true,
        shouldFocusSlot: false,
        slotTop: 700,
        slotHeight: 64,
        currentOffset: 200,
        viewportHeight: 700,
        bottomOverlayInset: 392,
        margin: 24,
      }),
    ).toBeNull();
  });

  it('does not move the timeline when the slot is already uncovered', () => {
    expect(
      getTimelineScrollOffsetToRevealSlot({
        slotTop: 400,
        slotHeight: 64,
        currentOffset: 200,
        viewportHeight: 700,
        bottomOverlayInset: 250,
        margin: 24,
      }),
    ).toBe(200);
  });
});
