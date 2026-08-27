import type { MoneyPlaidExchangeResult } from '../data/moneyPlaidApi';

export type MoneyPlaidLinkResult =
  | { status: 'linked'; exchange: MoneyPlaidExchangeResult }
  | { status: 'repaired'; connectionId: string }
  | { status: 'cancelled' };

export type MoneyPlaidLinkPhase = 'presented' | 'exchanging';

export type MoneyPlaidLinkSession = {
  open: (options?: {
    onPhaseChange?: (phase: MoneyPlaidLinkPhase) => void;
  }) => Promise<MoneyPlaidLinkResult>;
};
