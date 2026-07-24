export type MoneyStackParamList = {
  MoneySummary: undefined;
  MoneyTransactions: { accountId?: string; categoryId?: string } | undefined;
  MoneyAccounts: undefined;
  MoneyCategoryDetail: { categoryId: string };
  MoneyCategoryCreate: undefined;
  MoneyAppControl: { categoryId: string };
  MoneyLivingPlan: undefined;
  MoneyLivingPlanReceipt: { receiptId: string };
  MoneyTransactionDetail: { transactionId: string };
};

export type MoneyPlaceRouteName = 'MoneySummary' | 'MoneyTransactions' | 'MoneyAccounts';
