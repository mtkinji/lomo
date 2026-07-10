export type ActivityScheduleSlot = {
  startDate: string;
  endDate: string;
};

type ResolveSelectedScheduleSlotInput = {
  manualScheduleSlot: ActivityScheduleSlot | null;
  scheduleSlots: ActivityScheduleSlot[];
  selectedSlotIndex: number;
};

type FormatScheduleSlotTimeRangeOptions = {
  locale?: string;
  separator?: string;
};

export function resolveSelectedScheduleSlot({
  manualScheduleSlot,
  scheduleSlots,
  selectedSlotIndex,
}: ResolveSelectedScheduleSlotInput): ActivityScheduleSlot | null {
  return manualScheduleSlot ?? scheduleSlots[selectedSlotIndex] ?? null;
}

export function formatScheduleSlotTimeRange(
  slot: ActivityScheduleSlot,
  { locale, separator = '-' }: FormatScheduleSlotTimeRangeOptions = {},
): string | null {
  const start = new Date(slot.startDate);
  const end = new Date(slot.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const formatTime = (date: Date) =>
    date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  return `${formatTime(start)}${separator}${formatTime(end)}`;
}
