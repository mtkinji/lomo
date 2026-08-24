import { createPlaidLinkSession, type LinkExit, type LinkSuccess } from 'react-native-plaid-link-sdk';
import { Platform } from 'react-native';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { createMoneyPlaidLinkToken, exchangeMoneyPlaidToken } from '../data/moneyPlaidApi';
import type {
  MoneyPlaidLinkPhase,
  MoneyPlaidLinkResult,
  MoneyPlaidLinkSession,
} from './moneyPlaidLinkTypes';

function hasPlaidLinkExitError(
  error: LinkExit['error'],
): error is NonNullable<LinkExit['error']> {
  return Boolean(
    error?.errorCode
    || error?.errorType
    || error?.errorMessage
    || error?.displayMessage,
  );
}

export async function prepareMoneyPlaidLink(): Promise<MoneyPlaidLinkSession> {
  const client = getSupabaseClient();
  const token = await createMoneyPlaidLinkToken(client, Platform.OS === 'android' ? 'android' : 'ios');
  let opened = false;
  let settled = false;
  let exchangeStarted = false;
  let onPhaseChange: ((phase: MoneyPlaidLinkPhase) => void) | undefined;
  let finishResult: (result: MoneyPlaidLinkResult) => void = () => undefined;
  let failResult: (error: unknown) => void = () => undefined;
  const resultPromise = new Promise<MoneyPlaidLinkResult>((resolve, reject) => {
    finishResult = resolve;
    failResult = reject;
  });
  const finish = (result: MoneyPlaidLinkResult) => {
    if (settled) return;
    settled = true;
    finishResult(result);
  };
  const fail = (error: unknown) => {
    if (settled) return;
    settled = true;
    failResult(error);
  };
  const nativeSession = await createPlaidLinkSession({
    token: token.link_token,
    onEvent: () => undefined,
    onExit: (exit: LinkExit) => {
      if (exchangeStarted) return;
      if (hasPlaidLinkExitError(exit.error)) {
        fail(new Error(exit.error.displayMessage ?? exit.error.errorMessage ?? 'Plaid Link closed with an error.'));
        return;
      }
      finish({ status: 'cancelled' });
    },
    onSuccess: (success: LinkSuccess) => {
      if (exchangeStarted) return;
      exchangeStarted = true;
      onPhaseChange?.('exchanging');
      void exchangeMoneyPlaidToken(client, success.publicToken, success.metadata)
        .then((exchange) => finish({ status: 'linked', exchange }))
        .catch(fail);
    },
  });

  return {
    open: async (options = {}) => {
      if (opened) throw new Error('This account connection session has already been used.');
      opened = true;
      onPhaseChange = options.onPhaseChange;
      onPhaseChange?.('presented');
      try {
        nativeSession.open(true);
      } catch (error) {
        fail(error);
      }
      return resultPromise;
    },
  };
}

export async function startMoneyPlaidLink(): Promise<MoneyPlaidLinkResult> {
  const session = await prepareMoneyPlaidLink();
  return session.open();
}
