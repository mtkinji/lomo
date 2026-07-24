export type DirectRecurringReminder = {
  title: string;
  reminderLocalTime: string;
  repeatWeekdays: number[];
};

export type DirectScreenTimeControl = {
  childName: string;
  appName: string;
  desiredAccess: 'allow' | 'block';
};

const WEEKDAYS: Readonly<Record<string, number>> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const WEEKDAY_SOURCE = '(sunday|monday|tuesday|wednesday|thursday|friday|saturday)';
const CLOCK_SOURCE = '(\\d{1,2})(?::(\\d{2}))?\\s*(a\\.?m\\.?|p\\.?m\\.?)';

function sentenceCase(value: string): string {
  const trimmed = value.replace(/[.!?]+$/, '').trim();
  return trimmed ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}` : '';
}

function parseClock(hourText: string, minuteText: string | undefined, meridiemText: string): string | null {
  const hour = Number(hourText);
  const minute = minuteText === undefined ? 0 : Number(minuteText);
  if (!Number.isInteger(hour) || hour < 1 || hour > 12 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    return null;
  }
  const meridiem = meridiemText.replace(/\./g, '').toLowerCase();
  const hour24 = hour % 12 + (meridiem === 'pm' ? 12 : 0);
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Resolves only a narrow, fully specified reminder command. Ambiguous language
 * stays on the semantic route or the existing clarification path.
 */
export function directRecurringReminder(prompt: string): DirectRecurringReminder | null {
  const normalized = prompt.trim();
  const weeklyClock = new RegExp(`\\bevery\\s+${WEEKDAY_SOURCE}\\s+at\\s+${CLOCK_SOURCE}\\b`, 'i').exec(normalized);
  if (!weeklyClock) return null;

  const weekday = WEEKDAYS[weeklyClock[1].toLowerCase()];
  const reminderLocalTime = parseClock(weeklyClock[2], weeklyClock[3], weeklyClock[4]);
  if (weekday === undefined || !reminderLocalTime) return null;

  const afterClock = normalized.slice((weeklyClock.index ?? 0) + weeklyClock[0].length);
  const trailingTitle = /^\s+to\s+(.+?)\s*[.!?]*$/i.exec(afterClock)?.[1];
  const leadingReminderTitle = /^(?:please\s+)?remind\s+me\s+to\s+(.+?)\s+every\b/i.exec(normalized)?.[1];
  const createdTodoTitle = /^(?:please\s+)?(?:create|add|make)\s+(?:a\s+)?(?:to[ -]?do|task)\s+(?:called\s+)?(.+?)\s+(?:and\s+)?remind\s+me\b/i.exec(normalized)?.[1];
  const title = sentenceCase(trailingTitle ?? leadingReminderTitle ?? createdTodoTitle ?? '');
  if (!title || title.length > 240) return null;

  return { title, reminderLocalTime, repeatWeekdays: [weekday] };
}

/** Recognizes an explicit child + app allow/block command for native review. */
export function directScreenTimeControl(prompt: string): DirectScreenTimeControl | null {
  const normalized = prompt.trim();
  const allow = /^(?:please\s+)?(?:turn\s+on|enable|allow|unlock)\s+(.+?)\s+for\s+([\p{L}][\p{L}'’-]{0,79})\s*[.!?]*$/iu.exec(normalized);
  const block = /^(?:please\s+)?(?:turn\s+off|disable|block|lock)\s+(.+?)\s+for\s+([\p{L}][\p{L}'’-]{0,79})\s*[.!?]*$/iu.exec(normalized);
  const letUse = /^(?:please\s+)?let\s+([\p{L}][\p{L}'’-]{0,79})\s+use\s+(.+?)(?:\s+now)?\s*[.!?]*$/iu.exec(normalized);
  const possessiveAccess = /^(?:please\s+)?(?:enable|allow|unlock)\s+([\p{L}][\p{L}’-]{0,79})['’]s\s+access\s+to\s+(.+?)\s*[.!?]*$/iu.exec(normalized);
  if (letUse || possessiveAccess) {
    const conversationalAllow = letUse ?? possessiveAccess!;
    const childName = conversationalAllow[1].trim();
    const appName = conversationalAllow[2].trim();
    if (!appName || appName.length > 160) return null;
    return { childName, appName, desiredAccess: 'allow' };
  }
  const match = allow ?? block;
  if (!match) return null;
  const appName = match[1].trim();
  const childName = match[2].trim();
  if (!appName || appName.length > 160) return null;
  return { childName, appName, desiredAccess: allow ? 'allow' : 'block' };
}

/** Adds the missing calendar bound for an otherwise model-interpreted Goal. */
export function inferredGoalTargetDate(prompt: string, now: Date): string | null {
  if (!/\bnext\s+(?:calendar\s+)?week\b/i.test(prompt)) return null;
  const endOfNextWeek = new Date(now);
  const daysUntilEndOfNextWeek = endOfNextWeek.getDay() === 0
    ? 7
    : 14 - endOfNextWeek.getDay();
  endOfNextWeek.setDate(endOfNextWeek.getDate() + daysUntilEndOfNextWeek);
  endOfNextWeek.setHours(23, 59, 59, 999);
  return endOfNextWeek.toISOString();
}
