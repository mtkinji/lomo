import { logMoneyPlaidDiagnostic } from './moneyPlaidDiagnostics';
import { createPlaidLinkSession, type LinkExit, type LinkSuccess } from 'react-native-plaid-link-sdk';
import { Alert, Platform } from 'react-native';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { createMoneyPlaidLinkToken, exchangeMoneyPlaidToken, completeMoneyPlaidRepair } from '../data/moneyPlaidApi';
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

export async function prepareMoneyPlaidLink(options: { connectionId?: string } = {}): Promise<MoneyPlaidLinkSession> {
  const client = getSupabaseClient();
  const token = await createMoneyPlaidLinkToken(
    client, Platform.OS === 'android' ? 'android' : 'ios', options.connectionId,
  );
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
    onEvent: (event) => logMoneyPlaidDiagnostic(event.eventName, event.metadata),
    onExit: (exit: LinkExit) => {
      logMoneyPlaidDiagnostic('EXIT', { linkSessionId: exit.metadata?.linkSessionId, errorCode: exit.error?.errorCode });
      if (exchangeStarted) return;
      if (hasPlaidLinkExitError(exit.error)) {
        fail(new Error(exit.error.displayMessage ?? exit.error.errorMessage ?? 'Plaid Link closed with an error.'));
        return;
      }
      finish({ status: 'cancelled' });
    },
    onSuccess: (success: LinkSuccess) => {
      logMoneyPlaidDiagnostic('SUCCESS', { linkSessionId: success.metadata?.linkSessionId });
      if (exchangeStarted) return;
      exchangeStarted = true;
      if (options.connectionId) {
        const connectionId = options.connectionId;
        void completeMoneyPlaidRepair(client, connectionId).then(() => finish({ status: 'repaired', connectionId })).catch(fail);
        return;
      }
      onPhaseChange?.('exchanging');
      void exchangeMoneyPlaidToken(client, success.publicToken, success.metadata)
        .catch(async (error: unknown) => {
          if ((error as { diagnosticCode?: string })?.diagnosticCode !== 'POSSIBLE_DUPLICATE_ITEM') throw error;
          const proceed = await new Promise<boolean>((resolve) => Alert.alert(
            'This bank may already be connected',
            'Connecting it again could show the same transactions twice. Connect a separate account at this bank?',
            [{ text: 'Cancel', style: 'cancel', onPress: () => resolve(false) }, { text: 'Connect separate account', onPress: () => resolve(true) }],
            { cancelable: false },
          ));
          if (!proceed) { finish({ status: 'cancelled' }); return null; }
          return exchangeMoneyPlaidToken(client, success.publicToken, success.metadata, true);
        })
        .then((exchange) => { if (exchange) finish({ status: 'linked', exchange }); })
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

export async function startMoneyPlaidRepair(connectionId: string): Promise<MoneyPlaidLinkResult> {
  const session = await prepareMoneyPlaidLink({ connectionId });
  return session.open();
}
