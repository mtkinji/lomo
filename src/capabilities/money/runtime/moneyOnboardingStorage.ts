import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeLivingTargetIntent, type LivingTargetIntent } from '../domain/living-target';
import type { MoneyOnboardingCheckpoint, MoneyPlaceRouteName } from '../domain/moneyOnboarding';
import type { MoneyOnboardingCoverageConfidence, MoneyPlanningIntent } from '../domain/moneyOnboardingAssessment';
import type {
  MoneyOnboardingHandoffReceipt,
  MoneyOnboardingHandoffState,
} from '../domain/moneyOnboardingHandoff';

const STORAGE_KEY_PREFIX = 'kwilt:money:onboarding:v2';
const LEGACY_STORAGE_KEY_PREFIX = 'kwilt:money:onboarding:v1';

export type MoneyOnboardingState = {
  schemaVersion: 2;
  introductionSeenAt: string | null;
  checkpoint: MoneyOnboardingCheckpoint | null;
  coverageConfidence: MoneyOnboardingCoverageConfidence | null;
  planningIntent: MoneyPlanningIntent | null;
  completedAt: string | null;
  target: LivingTargetIntent | null;
  skippedAccountConnectionAt: string | null;
  requestedPlace: MoneyPlaceRouteName | null;
  handoff: MoneyOnboardingHandoffState | null;
};

const EMPTY_STATE: MoneyOnboardingState = {
  schemaVersion: 2,
  introductionSeenAt: null,
  checkpoint: null,
  coverageConfidence: null,
  planningIntent: null,
  completedAt: null,
  target: null,
  skippedAccountConnectionAt: null,
  requestedPlace: null,
  handoff: null,
};

export async function loadMoneyOnboardingState(userId: string): Promise<MoneyOnboardingState> {
  const currentRaw = await AsyncStorage.getItem(storageKey(userId));
  if (currentRaw) return normalizeState(currentRaw);
  const raw = await AsyncStorage.getItem(legacyStorageKey(userId));
  if (!raw) return EMPTY_STATE;
  const legacy = normalizeState(raw);
  return {
    ...legacy,
    introductionSeenAt: legacy.completedAt,
  };
}

function normalizeState(raw: string): MoneyOnboardingState {
  try {
    const parsed = JSON.parse(raw) as Partial<MoneyOnboardingState>;
    const completedAt = typeof parsed.completedAt === 'string' ? parsed.completedAt : null;
    return {
      schemaVersion: 2,
      introductionSeenAt: typeof parsed.introductionSeenAt === 'string'
        ? parsed.introductionSeenAt
        : null,
      checkpoint: isCheckpoint(parsed.checkpoint) ? parsed.checkpoint : null,
      coverageConfidence: isCoverageConfidence(parsed.coverageConfidence) ? parsed.coverageConfidence : null,
      planningIntent: isPlanningIntent(parsed.planningIntent) ? parsed.planningIntent : null,
      completedAt,
      target: normalizeLivingTargetIntent(parsed.target, new Date().toISOString()),
      skippedAccountConnectionAt: typeof parsed.skippedAccountConnectionAt === 'string'
        ? parsed.skippedAccountConnectionAt
        : null,
      requestedPlace: isMoneyPlace(parsed.requestedPlace) ? parsed.requestedPlace : null,
      handoff: normalizeHandoff(parsed.handoff),
    };
  } catch {
    return EMPTY_STATE;
  }
}

export async function recordMoneyOnboardingHandoff(
  userId: string,
  receipt: MoneyOnboardingHandoffReceipt,
): Promise<void> {
  const current = await loadMoneyOnboardingState(userId);
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify({
    ...current,
    handoff: {
      ...receipt,
      budgetGuideAcknowledgedAt: null,
      followThroughGuideAcknowledgedAt: null,
    },
  } satisfies MoneyOnboardingState));
}

export async function acknowledgeMoneyOnboardingBudgetGuide(
  userId: string,
  acknowledgedAtIso = new Date().toISOString(),
): Promise<void> {
  await updateHandoff(userId, (handoff) => ({
    ...handoff,
    budgetGuideAcknowledgedAt: acknowledgedAtIso,
  }));
}

export async function acknowledgeMoneyOnboardingFollowThroughGuide(
  userId: string,
  acknowledgedAtIso = new Date().toISOString(),
): Promise<void> {
  await updateHandoff(userId, (handoff) => ({
    ...handoff,
    followThroughGuideAcknowledgedAt: acknowledgedAtIso,
  }));
}

async function updateHandoff(
  userId: string,
  update: (handoff: MoneyOnboardingHandoffState) => MoneyOnboardingHandoffState,
): Promise<void> {
  const current = await loadMoneyOnboardingState(userId);
  if (!current.handoff) return;
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify({
    ...current,
    handoff: update(current.handoff),
  } satisfies MoneyOnboardingState));
}

export async function recordMoneyOnboardingDecision(
  userId: string,
  requestedPlace: MoneyPlaceRouteName,
  decision: {
    coverageConfidence?: MoneyOnboardingCoverageConfidence;
    planningIntent?: MoneyPlanningIntent;
  },
): Promise<void> {
  const current = await loadMoneyOnboardingState(userId);
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify({
    ...current,
    requestedPlace,
    coverageConfidence: decision.coverageConfidence ?? current.coverageConfidence,
    planningIntent: decision.planningIntent ?? current.planningIntent,
  } satisfies MoneyOnboardingState));
}

export async function recordMoneyOnboardingCheckpoint(
  userId: string,
  requestedPlace: MoneyPlaceRouteName,
  checkpoint: MoneyOnboardingCheckpoint | null,
): Promise<void> {
  const current = await loadMoneyOnboardingState(userId);
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify({
    ...current,
    requestedPlace,
    checkpoint,
  } satisfies MoneyOnboardingState));
}

export async function recordMoneyOnboardingIntroduction(
  userId: string,
  requestedPlace: MoneyPlaceRouteName,
  introducedAtIso = new Date().toISOString(),
): Promise<void> {
  const current = await loadMoneyOnboardingState(userId);
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify({
    ...current,
    introductionSeenAt: current.introductionSeenAt ?? introducedAtIso,
    requestedPlace,
  } satisfies MoneyOnboardingState));
}

export async function completeMoneyOnboarding(
  userId: string,
  target: LivingTargetIntent,
  options: { skippedAccountConnection: boolean; completedAtIso?: string },
): Promise<void> {
  const completedAt = options.completedAtIso ?? new Date().toISOString();
  const current = await loadMoneyOnboardingState(userId);
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify({
    ...current,
    schemaVersion: 2,
    introductionSeenAt: current.introductionSeenAt ?? completedAt,
    checkpoint: null,
    completedAt,
    target,
    skippedAccountConnectionAt: options.skippedAccountConnection ? completedAt : null,
  } satisfies MoneyOnboardingState));
}

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

function legacyStorageKey(userId: string): string {
  return `${LEGACY_STORAGE_KEY_PREFIX}:${userId}`;
}

function isMoneyPlace(value: unknown): value is MoneyPlaceRouteName {
  return value === 'MoneySummary' || value === 'MoneyTransactions' || value === 'MoneyAccounts';
}

function isCheckpoint(value: unknown): value is MoneyOnboardingCheckpoint {
  return value === 'account'
    || value === 'coverage'
    || value === 'analyze'
    || value === 'intent'
    || value === 'target'
    || value === 'assessment';
}

function isCoverageConfidence(value: unknown): value is MoneyOnboardingCoverageConfidence {
  return value === 'complete' || value === 'partial';
}

function isPlanningIntent(value: unknown): value is MoneyPlanningIntent {
  return value === 'current' || value === 'reduce' || value === 'recommend';
}

function normalizeHandoff(value: unknown): MoneyOnboardingHandoffState | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<MoneyOnboardingHandoffState>;
  if (
    typeof candidate.createdAtIso !== 'string'
    || !isNonNegativeNumber(candidate.selectedPlanCents)
    || !isNonNegativeNumber(candidate.savingsCents)
    || !isNonNegativeNumber(candidate.todoCount)
  ) return null;
  return {
    createdAtIso: candidate.createdAtIso,
    selectedPlanCents: Math.round(candidate.selectedPlanCents),
    goalId: typeof candidate.goalId === 'string' ? candidate.goalId : null,
    goalTitle: typeof candidate.goalTitle === 'string' ? candidate.goalTitle : null,
    savingsCents: Math.round(candidate.savingsCents),
    todoCount: Math.round(candidate.todoCount),
    budgetGuideAcknowledgedAt: typeof candidate.budgetGuideAcknowledgedAt === 'string'
      ? candidate.budgetGuideAcknowledgedAt
      : null,
    followThroughGuideAcknowledgedAt: typeof candidate.followThroughGuideAcknowledgedAt === 'string'
      ? candidate.followThroughGuideAcknowledgedAt
      : null,
  };
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
