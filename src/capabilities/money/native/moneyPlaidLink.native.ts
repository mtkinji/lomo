import { createPlaidLinkSession, type LinkExit, type LinkSuccess } from 'react-native-plaid-link-sdk';
import { Platform } from 'react-native';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { createMoneyPlaidLinkToken, exchangeMoneyPlaidToken } from '../data/moneyPlaidApi';
import type { MoneyPlaidLinkResult } from './moneyPlaidLinkTypes';

export async function startMoneyPlaidLink(): Promise<MoneyPlaidLinkResult> {
  const client = getSupabaseClient();
  const token = await createMoneyPlaidLinkToken(client, Platform.OS === 'android' ? 'android' : 'ios');

  return new Promise<MoneyPlaidLinkResult>((resolve, reject) => {
    let settled = false;
    const finish = (result: MoneyPlaidLinkResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    void createPlaidLinkSession({
      token: token.link_token,
      onEvent: () => undefined,
      onExit: (exit: LinkExit) => {
        if (exit.error) {
          fail(new Error(exit.error.displayMessage ?? exit.error.errorMessage ?? 'Plaid Link closed with an error.'));
          return;
        }
        finish({ status: 'cancelled' });
      },
      onSuccess: (success: LinkSuccess) => {
        void exchangeMoneyPlaidToken(client, success.publicToken, success.metadata)
          .then((exchange) => finish({ status: 'linked', exchange }))
          .catch(fail);
      },
    }).then((session) => session.open(true)).catch(fail);
  });
}
