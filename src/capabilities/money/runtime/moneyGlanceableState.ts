import { mergeGlanceableState, type GlanceableMoney } from '../../../services/appleEcosystem/glanceableState';
import type { MoneySnapshot } from '../data/moneySnapshot';
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
          deepLink: `kwilt://money/category/${encodeURIComponent(category.id)}?source=widget`,
        };
      })
      .sort((left, right) => right.percentUsed - left.percentUsed || left.name.localeCompare(right.name))
  };
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
