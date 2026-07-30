import type {
  FamilyScreenTimeDeliveryState,
  FamilyScreenTimeRule,
} from './familyScreenTimeLearning';

export type FamilyScreenTimeLifecycle =
  | 'needs_setup'
  | 'ready'
  | 'applying'
  | 'applied'
  | 'needs_attention'
  | 'releasing';

export type FamilyScreenTimeNextAction =
  | 'continue_setup'
  | 'activate'
  | 'edit'
  | 'recover'
  | 'none';

export type FamilyScreenTimeAgreementSummary = {
  childMembershipId: string;
  childDisplayName: string;
  targetLabel: string;
  scheduleLabel: string;
  limitLabel: string | null;
  responsibilityLabel: string | null;
  childExplanation: string;
  lifecycle: FamilyScreenTimeLifecycle;
  nextAction: FamilyScreenTimeNextAction;
  issue: string | null;
};

type BuildFamilyScreenTimeSummaryInput = {
  childMembershipId: string;
  childDisplayName: string;
  rule: FamilyScreenTimeRule;
  deliveryState: FamilyScreenTimeDeliveryState | 'releasing';
  childExplanation: string;
  issue: string | null;
  responsibilityLabel?: string | null;
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function sameDays(actual: number[], expected: number[]): boolean {
  return actual.length === expected.length && actual.every((day, index) => day === expected[index]);
}

function compactDayLabel(weekdays: number[]): string {
  const days = Array.from(new Set(weekdays)).sort((a, b) => a - b);
  if (sameDays(days, [1, 2, 3, 4, 5])) return 'Weekdays';
  if (sameDays(days, [0, 6])) return 'Weekends';
  if (sameDays(days, [0, 1, 2, 3, 4, 5, 6])) return 'Every day';
  return days.map((day) => DAY_LABELS[day] ?? '').filter(Boolean).join(', ');
}

function clockPart(minute: number): { value: string; meridiem: 'AM' | 'PM' } {
  const hour24 = Math.floor(minute / 60) % 24;
  const minutePart = minute % 60;
  const hour12 = hour24 % 12 || 12;
  return {
    value: minutePart === 0 ? String(hour12) : `${hour12}:${String(minutePart).padStart(2, '0')}`,
    meridiem: hour24 >= 12 ? 'PM' : 'AM',
  };
}

function compactClockRange(startMinute: number, endMinute: number): string {
  const start = clockPart(startMinute);
  const end = clockPart(endMinute);
  return start.meridiem === end.meridiem
    ? `${start.value}–${end.value} ${end.meridiem}`
    : `${start.value} ${start.meridiem}–${end.value} ${end.meridiem}`;
}

function lifecycleFor(
  deliveryState: BuildFamilyScreenTimeSummaryInput['deliveryState'],
  issue: string | null,
): Pick<FamilyScreenTimeAgreementSummary, 'lifecycle' | 'nextAction'> {
  if (issue) return { lifecycle: 'needs_attention', nextAction: 'recover' };
  switch (deliveryState) {
    case 'device_required': return { lifecycle: 'needs_setup', nextAction: 'continue_setup' };
    case 'ready_to_activate': return { lifecycle: 'ready', nextAction: 'activate' };
    case 'applying': return { lifecycle: 'applying', nextAction: 'none' };
    case 'releasing': return { lifecycle: 'releasing', nextAction: 'none' };
    case 'applied':
    default: return { lifecycle: 'applied', nextAction: 'edit' };
  }
}

export function buildFamilyScreenTimeSummary(
  input: BuildFamilyScreenTimeSummaryInput,
): FamilyScreenTimeAgreementSummary {
  return {
    childMembershipId: input.childMembershipId,
    childDisplayName: input.childDisplayName,
    targetLabel: input.rule.targetLabel,
    scheduleLabel: `${compactDayLabel(input.rule.weekdays)}, ${compactClockRange(
      input.rule.startMinute,
      input.rule.endMinute,
    )}`,
    limitLabel: input.rule.dailyLimitMinutes > 0 ? `${input.rule.dailyLimitMinutes} min/day` : null,
    responsibilityLabel: input.responsibilityLabel ?? null,
    childExplanation: input.childExplanation,
    ...lifecycleFor(input.deliveryState, input.issue),
    issue: input.issue,
  };
}

export function compactFamilyScreenTimeCriteria(
  summary: FamilyScreenTimeAgreementSummary,
): string {
  return [summary.scheduleLabel, summary.limitLabel, summary.responsibilityLabel]
    .filter((value): value is string => Boolean(value))
    .join(' · ');
}
