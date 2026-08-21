import type { MoneyEntryMode, MoneyEntrySource, MoneyPlaceRouteName } from '../domain/moneyOnboarding';
import type { MoneyOnboardingHandoffReceipt } from '../domain/moneyOnboardingHandoff';

export type MoneyStackParamList = {
  MoneyEntry: {
    requestedPlace: MoneyPlaceRouteName;
    source: MoneyEntrySource;
    mode: MoneyEntryMode;
    demoScenario?: 'connected-household';
  };
  MoneySummary: {
    entryIntent?: 'app-control-onboarding';
    devBudgetState?: 'none' | 'onboarding-sample';
    onboardingHandoff?: MoneyOnboardingHandoffReceipt;
  } | undefined;
  MoneyTransactions: {
    accountId?: string;
    categoryId?: string;
    monthStart?: string;
    monthEnd?: string;
    monthLabel?: string;
    inventoryTitle?: string;
    reviewState?: 'needs_review' | 'not_counted';
    reviewTransactionIds?: string[];
  } | undefined;
  MoneyAccounts: undefined;
  MoneyCategoryDetail: { categoryId: string; monthOffset?: number };
  MoneyCategoryCreate: undefined;
  MoneySetup: { requestedPlace?: MoneyPlaceRouteName; demoScenario?: 'connected-household' } | undefined;
  MoneyAppControl: {
    categoryId: string;
    suggestedPreset?: 'always_review' | 'when_hot' | 'at_95_percent' | 'when_over' | 'needs_review';
    suggestedAppLabels?: string[];
    source?: 'capability-onboarding';
  };
  MoneyLivingPlan: undefined;
  MoneyLivingPlanReceipt: { receiptId: string };
  MoneyTransactionDetail: { transactionId: string; economicRoleReview?: boolean };
};

export type { MoneyPlaceRouteName } from '../domain/moneyOnboarding';
