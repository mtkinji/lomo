import type { ActivityRepeatCustom, ActivityRepeatRule } from '../../domain/types';

type FormatActivityRepeatLabelParams = {
  repeatRule?: ActivityRepeatRule | null;
  repeatCustom?: ActivityRepeatCustom | null;
};

const WEEKDAY_SHORT_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function normalizeInterval(raw: unknown): number {
  const value = typeof raw === 'number' ? raw : 1;
  return Math.max(1, Math.round(value));
}

function formatCustomWeeklyLabel(config: Extract<ActivityRepeatCustom, { cadence: 'weeks' }>): string {
  const interval = normalizeInterval(config.interval);
  const days: number[] = Array.isArray(config.weekdays) ? config.weekdays : [];
  const picked = Array.from(new Set(days))
    .filter((day) => Number.isFinite(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b);
  const dayLabel = picked
    .map((day) => WEEKDAY_SHORT_NAMES[day] ?? '')
    .filter(Boolean)
    .join(' ');

  if (interval === 1) {
    return dayLabel ? `Weekly (${dayLabel})` : 'Weekly';
  }

  return dayLabel ? `Every ${interval} weeks (${dayLabel})` : `Every ${interval} weeks`;
}

export function formatActivityRepeatLabel({
  repeatRule,
  repeatCustom,
}: FormatActivityRepeatLabelParams): string {
  const rule = repeatRule ?? null;
  if (!rule) return 'Off';
  if (rule === 'weekdays') return 'Weekdays';
  if (rule === 'custom') {
    const config = repeatCustom ?? null;
    if (config && config.cadence === 'weeks') {
      return formatCustomWeeklyLabel(config);
    }
    if (config) {
      const interval = normalizeInterval(config.interval);
      const unit =
        config.cadence === 'days'
          ? 'day'
          : config.cadence === 'months'
            ? 'month'
            : config.cadence === 'years'
              ? 'year'
              : 'week';
      return interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`;
    }
    return 'Custom';
  }

  return rule.charAt(0).toUpperCase() + rule.slice(1);
}
