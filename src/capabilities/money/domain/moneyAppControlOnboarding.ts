import type { ScreenTimeAuthorizationStatus } from '../../../services/screenTimeProtection';
import type { MoneyAppControlPolicy } from './moneyAppControl';

export type MoneySummaryEntryIntent = 'app-control-onboarding';

export function isMoneyAppControlOnboardingComplete(
  authorizationStatus: ScreenTimeAuthorizationStatus,
  policy: MoneyAppControlPolicy,
): boolean {
  return (
    authorizationStatus === 'approved' &&
    policy.enabled &&
    policy.selectedApps.length + policy.selectedCategories.length > 0
  );
}

export function getMoneyCategoryDestination({
  categoryId,
  entryIntent,
  monthOffset,
  suggestedAppLabels,
}: {
  categoryId: string;
  entryIntent?: MoneySummaryEntryIntent;
  monthOffset: number;
  suggestedAppLabels?: string[];
}):
  | {
      screen: 'MoneyCategoryDetail';
      params: { categoryId: string; monthOffset: number };
    }
  | {
      screen: 'MoneyAppControl';
      params: {
        categoryId: string;
        source: 'capability-onboarding';
        suggestedAppLabels?: string[];
      };
    } {
  if (entryIntent === 'app-control-onboarding' && monthOffset === 0) {
    return {
      screen: 'MoneyAppControl',
      params: {
        categoryId,
        source: 'capability-onboarding',
        ...(suggestedAppLabels?.length ? { suggestedAppLabels } : {}),
      },
    };
  }
  return {
    screen: 'MoneyCategoryDetail',
    params: { categoryId, monthOffset },
  };
}
