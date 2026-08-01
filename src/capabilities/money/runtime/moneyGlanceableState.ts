import { mergeGlanceableState, type GlanceableMoney } from '../../../services/appleEcosystem/glanceableState';
import type { MoneySnapshot } from '../data/moneySnapshot';
import type { MoneyPlanLimitAnswer } from '../domain/moneyPlanLimitAnswer';
import { loadMoneyPrivacyLockSettings } from './moneyPrivacyLock';

function safePercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(999, Math.round(value)));
}

function categoryStatus(percentUsed: number): GlanceableMoney['categories'][number]['status'] {
  if (percentUsed > 100) return 'over';
  if (percentUsed >= 90) return 'near_limit';
  return 'on_track';
}

export function buildMoneyGlanceableSnapshot(snapshot: MoneySnapshot, now = new Date()): GlanceableMoney {
  const percentUsed = snapshot.totals.plannedCents > 0
    ? safePercent((snapshot.totals.spentCents / snapshot.totals.plannedCents) * 100)
    : 0;
  const periodElapsedPercent = getPeriodElapsedPercent(now);

  return {
    periodLabel: snapshot.periodLabel,
    percentUsed,
    needsReviewCount: Math.max(0, Math.round(snapshot.totals.needsReviewCount)),
    flexibleMoney: projectFlexibleMoney(snapshot.livingLimitAnswer),
    categories: snapshot.categories
      .map((category) => {
        const categoryPercentUsed = safePercent(category.percentUsed);
        return {
          id: category.id,
          name: category.name,
          percentUsed: categoryPercentUsed,
          periodElapsedPercent,
          paceSentiment: categoryPercentUsed <= periodElapsedPercent
            ? 'under' as const
            : categoryPercentUsed < 100
              ? 'on-track' as const
              : 'over' as const,
          status: categoryStatus(categoryPercentUsed),
          plannedCents: safeCents(category.plannedCents),
          spentCents: safeCents(category.spentCents),
          remainingCents: signedCents(category.remainingCents),
          deepLink: `kwilt://money/category/${encodeURIComponent(category.id)}?source=widget`,
        };
      })
      .sort((left, right) => right.percentUsed - left.percentUsed || left.name.localeCompare(right.name))
  };
}

function projectFlexibleMoney(answer: MoneyPlanLimitAnswer | null | undefined): NonNullable<GlanceableMoney['flexibleMoney']> {
  const base = {
    flexibleCapacityCents: optionalCents(answer?.facts.flexibleCapacityCents),
    countedFlexibleSpendCents: optionalCents(answer?.facts.countedFlexibleSpendCents),
    deepLink: 'kwilt://money?source=widget',
  };
  if (!answer) return { ...base, state: 'unavailable', amountCents: null };
  if (answer.state === 'no_flexible_room') return { ...base, state: 'no_room', amountCents: 0 };
  if (answer.state === 'over_limit') return { ...base, state: 'plan_over', amountCents: optionalCents(answer.headlineAmountCents) };
  if (answer.state === 'over_flexible_room') return { ...base, state: 'over', amountCents: optionalCents(answer.headlineAmountCents) };
  if (answer.state === 'missing_income_basis' || answer.state === 'insufficient_meaning' || answer.state === 'needs_one_answer') {
    return { ...base, state: 'unavailable', amountCents: null };
  }
  const roomCents = answer.facts.flexibleRoomCents;
  if (roomCents == null || !Number.isFinite(roomCents)) return { ...base, state: 'unavailable', amountCents: null };
  return roomCents < 0
    ? { ...base, state: 'over', amountCents: Math.abs(Math.round(roomCents)) }
    : { ...base, state: 'left', amountCents: Math.round(roomCents) };
}

function safeCents(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function signedCents(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function optionalCents(value: number | null | undefined): number | null {
  return value == null || !Number.isFinite(value) ? null : Math.max(0, Math.round(value));
}

function getPeriodElapsedPercent(now = new Date()): number {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.round((now.getDate() / daysInMonth) * 100);
}

export async function syncMoneyGlanceableState(snapshot: MoneySnapshot): Promise<void> {
  const privacy = await loadMoneyPrivacyLockSettings();
  await mergeGlanceableState({
    money: privacy.enabled ? null : buildMoneyGlanceableSnapshot(snapshot),
  });
}

export async function clearMoneyGlanceableState(): Promise<void> {
  await mergeGlanceableState({ money: null });
}
