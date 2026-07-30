export type FamilyScreenTimeRule = {
  targetLabel: string;
  weekdays: number[];
  startMinute: number;
  endMinute: number;
  dailyLimitMinutes: number;
};

export type FamilyScreenTimeLearningRecord = {
  schemaVersion: 1;
  deviceMode: 'none' | 'simulated';
  rule: FamilyScreenTimeRule;
  desiredPolicyVersion: number;
  appliedPolicyVersion: number | null;
  activatedAtIso: string | null;
  acknowledgedAtIso: string | null;
};

export type FamilyScreenTimeDeliveryState =
  | 'device_required'
  | 'ready_to_activate'
  | 'applying'
  | 'applied';

const STARTER_RULE: FamilyScreenTimeRule = {
  targetLabel: 'Games',
  weekdays: [1, 2, 3, 4, 5],
  startMinute: 16 * 60,
  endMinute: 19 * 60,
  dailyLimitMinutes: 30,
};

function validIso(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

function normalizeRule(value: unknown): FamilyScreenTimeRule | null {
  if (!value || typeof value !== 'object') return null;
  const rule = value as Partial<FamilyScreenTimeRule>;
  if (typeof rule.targetLabel !== 'string' || !rule.targetLabel.trim()) return null;
  if (!Array.isArray(rule.weekdays) || rule.weekdays.length === 0
    || rule.weekdays.some((day) => !isIntegerInRange(day, 0, 6))) return null;
  if (!isIntegerInRange(rule.startMinute, 0, 1439)
    || !isIntegerInRange(rule.endMinute, 1, 1440)
    || rule.endMinute <= rule.startMinute) return null;
  if (!isIntegerInRange(rule.dailyLimitMinutes, 1, 1440)) return null;
  return {
    targetLabel: rule.targetLabel.trim(),
    weekdays: Array.from(new Set(rule.weekdays)).sort((a, b) => a - b),
    startMinute: rule.startMinute,
    endMinute: rule.endMinute,
    dailyLimitMinutes: rule.dailyLimitMinutes,
  };
}

export function createDefaultFamilyScreenTimeRecord(): FamilyScreenTimeLearningRecord {
  return {
    schemaVersion: 1,
    deviceMode: 'none',
    rule: { ...STARTER_RULE, weekdays: [...STARTER_RULE.weekdays] },
    desiredPolicyVersion: 0,
    appliedPolicyVersion: null,
    activatedAtIso: null,
    acknowledgedAtIso: null,
  };
}

export function normalizeFamilyScreenTimeRecord(value: unknown): FamilyScreenTimeLearningRecord {
  if (!value || typeof value !== 'object') return createDefaultFamilyScreenTimeRecord();
  const record = value as Partial<FamilyScreenTimeLearningRecord>;
  const rule = normalizeRule(record.rule);
  if (record.schemaVersion !== 1 || !rule) return createDefaultFamilyScreenTimeRecord();
  if (record.deviceMode !== 'none' && record.deviceMode !== 'simulated') {
    return createDefaultFamilyScreenTimeRecord();
  }
  if (!isIntegerInRange(record.desiredPolicyVersion, 0, Number.MAX_SAFE_INTEGER)) {
    return createDefaultFamilyScreenTimeRecord();
  }
  const appliedPolicyVersion = record.appliedPolicyVersion;
  if (!(appliedPolicyVersion === null
    || (isIntegerInRange(appliedPolicyVersion, 0, record.desiredPolicyVersion)))) {
    return createDefaultFamilyScreenTimeRecord();
  }
  if (!(record.activatedAtIso === null || validIso(record.activatedAtIso))) {
    return createDefaultFamilyScreenTimeRecord();
  }
  if (!(record.acknowledgedAtIso === null || validIso(record.acknowledgedAtIso))) {
    return createDefaultFamilyScreenTimeRecord();
  }
  return {
    schemaVersion: 1,
    deviceMode: record.deviceMode,
    rule,
    desiredPolicyVersion: record.desiredPolicyVersion,
    appliedPolicyVersion,
    activatedAtIso: record.activatedAtIso,
    acknowledgedAtIso: record.acknowledgedAtIso,
  };
}

export function prepareSimulatedFamilyScreenTimeDevice(
  value: FamilyScreenTimeLearningRecord,
): FamilyScreenTimeLearningRecord {
  const record = normalizeFamilyScreenTimeRecord(value);
  return { ...record, deviceMode: 'simulated' };
}

export function updateFamilyScreenTimeAgreement(
  value: FamilyScreenTimeLearningRecord,
  ruleValue: FamilyScreenTimeRule,
): FamilyScreenTimeLearningRecord {
  const record = normalizeFamilyScreenTimeRecord(value);
  const rule = normalizeRule(ruleValue);
  return rule ? { ...record, rule } : record;
}

export function activateFamilyScreenTimeAgreement(
  value: FamilyScreenTimeLearningRecord,
  activatedAtIso: string,
): FamilyScreenTimeLearningRecord {
  const record = normalizeFamilyScreenTimeRecord(value);
  if (record.deviceMode !== 'simulated' || !validIso(activatedAtIso)) return record;
  return {
    ...record,
    desiredPolicyVersion: record.desiredPolicyVersion + 1,
    activatedAtIso: new Date(activatedAtIso).toISOString(),
  };
}

export function acknowledgeFamilyScreenTimePolicy(
  value: FamilyScreenTimeLearningRecord,
  input: { policyVersion: number; acknowledgedAtIso: string },
): FamilyScreenTimeLearningRecord {
  const record = normalizeFamilyScreenTimeRecord(value);
  if (record.deviceMode !== 'simulated'
    || input.policyVersion !== record.desiredPolicyVersion
    || input.policyVersion <= 0
    || !validIso(input.acknowledgedAtIso)) return record;
  return {
    ...record,
    appliedPolicyVersion: input.policyVersion,
    acknowledgedAtIso: new Date(input.acknowledgedAtIso).toISOString(),
  };
}

export function familyScreenTimeDeliveryState(
  value: FamilyScreenTimeLearningRecord,
): FamilyScreenTimeDeliveryState {
  const record = normalizeFamilyScreenTimeRecord(value);
  if (record.deviceMode === 'none') return 'device_required';
  if (record.desiredPolicyVersion === 0) return 'ready_to_activate';
  if (record.appliedPolicyVersion !== record.desiredPolicyVersion) return 'applying';
  return 'applied';
}

function formatClockMinute(minute: number): { time: string; meridiem: 'AM' | 'PM' } {
  const hour24 = Math.floor(minute / 60) % 24;
  const minutes = minute % 60;
  const hour12 = hour24 % 12 || 12;
  return {
    time: `${hour12}:${String(minutes).padStart(2, '0')}`,
    meridiem: hour24 >= 12 ? 'PM' : 'AM',
  };
}

function formatClockRange(startMinute: number, endMinute: number): string {
  const start = formatClockMinute(startMinute);
  const end = formatClockMinute(endMinute);
  return start.meridiem === end.meridiem
    ? `${start.time}–${end.time} ${end.meridiem}`
    : `${start.time} ${start.meridiem}–${end.time} ${end.meridiem}`;
}

export function formatFamilyScreenTimeAgreement(rule: FamilyScreenTimeRule): string {
  return `${rule.targetLabel} are available on school days from ${formatClockRange(rule.startMinute, rule.endMinute)}, for up to ${rule.dailyLimitMinutes} minutes.`;
}

export function familyScreenTimeChildExplanation(
  value: FamilyScreenTimeLearningRecord,
  now: Date,
  usedMinutes: number,
): string {
  const record = normalizeFamilyScreenTimeRecord(value);
  const { rule } = record;
  if (familyScreenTimeDeliveryState(record) !== 'applied') {
    return `${rule.targetLabel} will follow this agreement after device setup.`;
  }
  if (!rule.weekdays.includes(now.getDay())) {
    return `${rule.targetLabel} follow the school-day agreement Monday.`;
  }
  const minute = now.getHours() * 60 + now.getMinutes();
  if (minute < rule.startMinute) {
    const start = formatClockMinute(rule.startMinute);
    return `${rule.targetLabel} open at ${start.time} ${start.meridiem}.`;
  }
  const remaining = Math.max(0, rule.dailyLimitMinutes - Math.max(0, Math.floor(usedMinutes)));
  if (minute >= rule.endMinute || remaining === 0) {
    return `${rule.targetLabel} are finished for today.`;
  }
  if (remaining === rule.dailyLimitMinutes) {
    return `${rule.targetLabel} are available for ${remaining} minutes.`;
  }
  return `${remaining} minutes left today.`;
}
