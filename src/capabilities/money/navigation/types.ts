export type MoneyStackParamList = {
  MoneySummary: undefined;
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
  MoneySetup: undefined;
  MoneyAppControl: {
    categoryId: string;
    suggestedPreset?: 'always_review' | 'when_hot' | 'at_95_percent' | 'when_over' | 'needs_review';
    suggestedAppLabels?: string[];
  };
  MoneyLivingPlan: undefined;
  MoneyLivingPlanReceipt: { receiptId: string };
  MoneyTransactionDetail: { transactionId: string; economicRoleReview?: boolean };
};

export type MoneyPlaceRouteName = 'MoneySummary' | 'MoneyTransactions' | 'MoneyAccounts';
