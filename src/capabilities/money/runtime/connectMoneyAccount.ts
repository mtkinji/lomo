import { isMoneyPlaidError } from '../data/moneyPlaidErrors';
import type { MoneyPlaidLinkResult } from '../native/moneyPlaidLinkTypes';

type ReconcileConnectedActivity = (input: {
  trigger: 'account_connected';
  sync: false;
}) => Promise<unknown>;

export type ConnectMoneyAccountResult =
  | { status: 'connected'; institutionName: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

export async function connectMoneyAccount({
  startLink,
  reconcileConnectedActivity,
}: {
  startLink: () => Promise<MoneyPlaidLinkResult>;
  reconcileConnectedActivity: ReconcileConnectedActivity;
}): Promise<ConnectMoneyAccountResult> {
  try {
    const result = await startLink();
    if (result.status === 'cancelled') return { status: 'cancelled' };

    await reconcileConnectedActivity({ trigger: 'account_connected', sync: false });
    return {
      status: 'connected',
      institutionName: result.exchange.institutionName,
    };
  } catch (error) {
    return {
      status: 'error',
      message: isMoneyPlaidError(error)
        ? error.message
        : 'Kwilt could not start the bank connection. Try again.',
    };
  }
}
