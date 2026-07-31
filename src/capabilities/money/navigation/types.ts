export type MoneyStackParamList = {
  MoneySummary: undefined;
  MoneyTransactions: {
    accountId?: string;
    categoryId?: string;
    monthStart?: string;
    monthEnd?: string;
    monthLabel?: string;
    reviewState?: 'needs_review' | 'not_counted';
    reviewTransactionIds?: string[];
  } | undefined;
  MoneyAccounts: undefined;
  MoneyCategoryDetail: { categoryId: string; monthOffset?: number };
  MoneyCategoryCreate: undefined;
  MoneySetup: undefined;
  MoneyAppControl: { categoryId: string };
  MoneyLivingPlan: undefined;
  MoneyLivingPlanReceipt: { receiptId: string };
  MoneyTransactionDetail: { transactionId: string };
};

export type MoneyPlaceRouteName = 'MoneySummary' | 'MoneyTransactions' | 'MoneyAccounts';
