import type { ScreenTimeAuthorizationStatus, ScreenTimeToken } from '../../../services/screenTimeProtection';
import {
  DEFAULT_TEMPORARY_OPEN_MINUTES,
} from '../../../features/screen-time/domain/screenTimeRule';
import type { MoneySnapshot } from '../data/moneySnapshot';

export type MoneyAppControlPreset =
  | 'always_review'
  | 'when_hot'
  | 'at_95_percent'
  | 'when_over'
  | 'needs_review';

export type MoneyAppControlPolicy = {
  enabled: boolean;
  preset: MoneyAppControlPreset;
  unlockWindowMinutes: number;
  selectedApps: ScreenTimeToken[];
  selectedCategories: ScreenTimeToken[];
  lastReview?: { outcome: 'opened_for_now' | 'left_blocked'; reviewedAtIso: string } | null;
};

export type MoneyAppControlSettings = {
  authorizationStatus: ScreenTimeAuthorizationStatus;
  policies: Record<string, MoneyAppControlPolicy>;
  lastUpdated: string | null;
};

export const DEFAULT_MONEY_APP_CONTROL_SETTINGS: MoneyAppControlSettings = {
  authorizationStatus: 'notDetermined',
  policies: {},
  lastUpdated: null,
};

function normalizeStatus(value: unknown): ScreenTimeAuthorizationStatus {
  return value === 'approved' || value === 'denied' || value === 'revoked' || value === 'unavailable' || value === 'notDetermined'
    ? value
    : 'notDetermined';
}

function normalizeTokens(value: unknown): ScreenTimeToken[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const token = typeof (item as any).token === 'string' ? (item as any).token.trim() : '';
    if (!token || seen.has(token)) return [];
    seen.add(token);
    const label = typeof (item as any).label === 'string' ? (item as any).label.trim() : '';
    return [{ token, ...(label ? { label } : {}) }];
  });
}

function normalizePreset(value: unknown): MoneyAppControlPreset {
  return value === 'always_review' || value === 'when_hot' || value === 'at_95_percent' || value === 'when_over' || value === 'needs_review'
    ? value
    : 'always_review';
}

function normalizeReview(value: unknown): MoneyAppControlPolicy['lastReview'] {
  if (!value || typeof value !== 'object') return null;
  const outcome = (value as any).outcome;
  const reviewedAtMs = Date.parse((value as any).reviewedAtIso);
  if ((outcome !== 'opened_for_now' && outcome !== 'left_blocked') || !Number.isFinite(reviewedAtMs)) return null;
  return { outcome, reviewedAtIso: new Date(reviewedAtMs).toISOString() };
}

export function normalizeMoneyAppControlSettings(value: unknown): MoneyAppControlSettings {
  const raw = value && typeof value === 'object' ? value as any : {};
  const policies: Record<string, MoneyAppControlPolicy> = {};
  if (raw.policies && typeof raw.policies === 'object') {
    Object.entries(raw.policies as Record<string, unknown>).forEach(([categoryId, policyValue]) => {
      if (!categoryId.trim() || !policyValue || typeof policyValue !== 'object') return;
      const policy = policyValue as any;
      policies[categoryId] = {
        enabled: policy.enabled === true,
        preset: normalizePreset(policy.preset),
        unlockWindowMinutes: DEFAULT_TEMPORARY_OPEN_MINUTES,
        selectedApps: normalizeTokens(policy.selectedApps),
        selectedCategories: normalizeTokens(policy.selectedCategories),
        lastReview: normalizeReview(policy.lastReview),
      };
    });
  }
  const lastUpdatedMs = Date.parse(raw.lastUpdated);
  return {
    authorizationStatus: normalizeStatus(raw.authorizationStatus),
    policies,
    lastUpdated: Number.isFinite(lastUpdatedMs) ? new Date(lastUpdatedMs).toISOString() : null,
  };
}

export function moneyAppControlSelectionId(categorySourceId: string): string {
  const safe = categorySourceId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 54);
  return `money_${safe || 'category'}`;
}

export function evaluateMoneyBudgetCondition(params: {
  snapshot: MoneySnapshot;
  categorySourceId: string;
  preset: MoneyAppControlPreset;
  now: Date;
}): boolean | null {
  const category = params.snapshot.categories.find((candidate) => candidate.sourceId === params.categorySourceId);
  if (!category) return null;
  if (params.preset === 'always_review') return true;
  if (params.preset === 'at_95_percent') return category.percentUsed >= 95;
  if (params.preset === 'when_over') return category.percentUsed >= 100;
  if (params.preset === 'needs_review') return params.snapshot.totals.needsReviewCount > 0;
  const daysInMonth = new Date(params.now.getFullYear(), params.now.getMonth() + 1, 0).getDate();
  const elapsedPercent = (params.now.getDate() / daysInMonth) * 100;
  return category.percentUsed > elapsedPercent + 10;
}

export function getMoneyAppControlPresetCopy(preset: MoneyAppControlPreset): { title: string; detail: string } {
  if (preset === 'when_hot') return {
    title: 'When spending is 10 points ahead of the month',
    detail: 'Pause when the share of this budget used exceeds the share of the month elapsed by 10 percentage points.',
  };
  if (preset === 'at_95_percent') return {
    title: 'When 95% of this budget is used',
    detail: 'Pause before the budget is completely used.',
  };
  if (preset === 'when_over') return {
    title: 'When this budget is fully used',
    detail: 'Pause when spending reaches or exceeds the budget.',
  };
  if (preset === 'needs_review') return {
    title: 'While any transaction needs review',
    detail: 'Pause while Money has a transaction that still needs review.',
  };
  return {
    title: 'Every time, until I review this budget',
    detail: 'Pause every attempt until this budget is reviewed in Kwilt.',
  };
}
