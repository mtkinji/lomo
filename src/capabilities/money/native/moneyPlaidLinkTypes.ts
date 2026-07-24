import type { MoneyPlaidExchangeResult } from '../data/moneyPlaidApi';

export type MoneyPlaidLinkResult =
  | { status: 'linked'; exchange: MoneyPlaidExchangeResult }
  | { status: 'cancelled' };
