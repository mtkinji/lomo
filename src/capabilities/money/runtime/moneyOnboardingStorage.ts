import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeLivingTargetIntent, type LivingTargetIntent } from '../domain/living-target';

const STORAGE_KEY_PREFIX = 'kwilt:money:onboarding:v1';

export type MoneyOnboardingState = {
  completedAt: string | null;
  target: LivingTargetIntent | null;
  skippedAccountConnectionAt: string | null;
};

const EMPTY_STATE: MoneyOnboardingState = {
  completedAt: null,
  target: null,
  skippedAccountConnectionAt: null,
};

export async function loadMoneyOnboardingState(userId: string): Promise<MoneyOnboardingState> {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) return EMPTY_STATE;
  try {
    const parsed = JSON.parse(raw) as Partial<MoneyOnboardingState>;
    return {
      completedAt: typeof parsed.completedAt === 'string' ? parsed.completedAt : null,
      target: normalizeLivingTargetIntent(parsed.target, new Date().toISOString()),
      skippedAccountConnectionAt: typeof parsed.skippedAccountConnectionAt === 'string'
        ? parsed.skippedAccountConnectionAt
        : null,
    };
  } catch {
    return EMPTY_STATE;
  }
}

export async function completeMoneyOnboarding(
  userId: string,
  target: LivingTargetIntent,
  options: { skippedAccountConnection: boolean; completedAtIso?: string },
): Promise<void> {
  const completedAt = options.completedAtIso ?? new Date().toISOString();
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify({
    completedAt,
    target,
    skippedAccountConnectionAt: options.skippedAccountConnection ? completedAt : null,
  } satisfies MoneyOnboardingState));
}

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}
