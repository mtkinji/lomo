export type MonthlyCategoryCarryPeriod = {
  periodId: string;
  countedSpendCents: number;
  additionCents?: number;
};

export type MonthlyCategoryCarryResult = {
  periodId: string;
  baseAmountCents: number;
  priorCarryCents: number;
  additionCents: number;
  availableBeforeSpendCents: number;
  recoveryDeficitCents: number;
  countedSpendCents: number;
  endingCarryCents: number;
};

export function projectMonthlyCategoryCarry(input: {
  startPeriodId: string;
  targetPeriodId: string;
  baseAmountCents: number;
  periods: MonthlyCategoryCarryPeriod[];
  resetPeriodIds?: string[];
}): MonthlyCategoryCarryResult {
  assertPeriodId(input.startPeriodId, 'start period');
  assertPeriodId(input.targetPeriodId, 'target period');
  if (input.startPeriodId > input.targetPeriodId) {
    throw new Error('The carry start month must not be after the selected month.');
  }
  const baseAmountCents = requireUnsignedCents(input.baseAmountCents, 'base monthly amount');
  const resetPeriodIds = new Set((input.resetPeriodIds ?? []).map((periodId) => {
    assertPeriodId(periodId, 'reset period');
    return periodId;
  }));
  const periodById = new Map<string, MonthlyCategoryCarryPeriod>();
  input.periods.forEach((period) => {
    assertPeriodId(period.periodId, 'carry period');
    if (periodById.has(period.periodId)) throw new Error(`Carry period ${period.periodId} appears more than once.`);
    periodById.set(period.periodId, period);
  });

  let priorCarryCents = 0;
  let periodId = input.startPeriodId;
  while (periodId <= input.targetPeriodId) {
    const period = periodById.get(periodId);
    if (!period) throw new Error(`Carry history is incomplete for ${periodId}.`);
    if (periodId === input.startPeriodId || resetPeriodIds.has(periodId)) priorCarryCents = 0;
    const countedSpendCents = requireUnsignedCents(period.countedSpendCents, 'counted spending');
    const additionCents = requireUnsignedCents(period.additionCents ?? 0, 'one-time addition');
    const rawAvailableCents = safeSignedCents(priorCarryCents + baseAmountCents + additionCents);
    const result: MonthlyCategoryCarryResult = {
      periodId,
      baseAmountCents,
      priorCarryCents,
      additionCents,
      availableBeforeSpendCents: Math.max(0, rawAvailableCents),
      recoveryDeficitCents: Math.max(0, -rawAvailableCents),
      countedSpendCents,
      endingCarryCents: safeSignedCents(rawAvailableCents - countedSpendCents),
    };
    if (periodId === input.targetPeriodId) return result;
    priorCarryCents = result.endingCarryCents;
    periodId = nextPeriodId(periodId);
  }

  throw new Error('The selected carry month could not be projected.');
}

function requireUnsignedCents(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Enter a valid ${label}.`);
  return value;
}

function safeSignedCents(value: number): number {
  if (!Number.isSafeInteger(value)) throw new Error('The carry amount is outside the supported range.');
  return value;
}

function assertPeriodId(value: string, label: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error(`Enter a valid ${label}.`);
}

function nextPeriodId(periodId: string): string {
  const [year, month] = periodId.split('-').map(Number);
  const next = new Date(Date.UTC(year, month, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
}
