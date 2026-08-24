import { createPlaidLinkSession } from 'react-native-plaid-link-sdk';

import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { createMoneyPlaidLinkToken, exchangeMoneyPlaidToken } from '../data/moneyPlaidApi';
import { prepareMoneyPlaidLink } from './moneyPlaidLink.native';

jest.mock('react-native-plaid-link-sdk', () => ({ createPlaidLinkSession: jest.fn() }));
jest.mock('../../../services/backend/supabaseClient', () => ({ getSupabaseClient: jest.fn() }));
jest.mock('../data/moneyPlaidApi', () => ({
  createMoneyPlaidLinkToken: jest.fn(),
  exchangeMoneyPlaidToken: jest.fn(),
}));

const mockedCreateSession = jest.mocked(createPlaidLinkSession);
const mockedCreateToken = jest.mocked(createMoneyPlaidLinkToken);
const mockedExchangeToken = jest.mocked(exchangeMoneyPlaidToken);
const mockedGetClient = jest.mocked(getSupabaseClient);

describe('prepared Money Plaid Link session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetClient.mockReturnValue({} as ReturnType<typeof getSupabaseClient>);
    mockedCreateToken.mockResolvedValue({ link_token: 'link-token' });
  });

  it('creates the native Link session before the user opens Plaid', async () => {
    const open = jest.fn();
    mockedCreateSession.mockResolvedValue({ open } as never);

    const session = await prepareMoneyPlaidLink();

    expect(mockedCreateToken).toHaveBeenCalledTimes(1);
    expect(mockedCreateSession).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();

    const phases: string[] = [];
    const resultPromise = session.open({ onPhaseChange: (phase) => phases.push(phase) });
    expect(phases).toEqual(['presented']);
    expect(open).toHaveBeenCalledWith(true);

    const callbacks = mockedCreateSession.mock.calls[0][0];
    callbacks.onExit({} as never);
    await expect(resultPromise).resolves.toEqual({ status: 'cancelled' });
  });

  it('treats the native SDK empty error object as a normal cancellation', async () => {
    mockedCreateSession.mockResolvedValue({ open: jest.fn() } as never);
    const session = await prepareMoneyPlaidLink();
    const resultPromise = session.open();
    const callbacks = mockedCreateSession.mock.calls[0][0];

    callbacks.onExit({ error: {}, metadata: { status: '' } } as never);

    await expect(resultPromise).resolves.toEqual({ status: 'cancelled' });
  });

  it('rejects an exit that contains a native Plaid error', async () => {
    mockedCreateSession.mockResolvedValue({ open: jest.fn() } as never);
    const session = await prepareMoneyPlaidLink();
    const resultPromise = session.open();
    const callbacks = mockedCreateSession.mock.calls[0][0];

    callbacks.onExit({
      error: {
        errorCode: 'INSTITUTION_NOT_RESPONDING',
        errorType: 'INSTITUTION_ERROR',
        errorMessage: 'The institution is not responding.',
      },
      metadata: { status: '' },
    } as never);

    await expect(resultPromise).rejects.toThrow('The institution is not responding.');
  });

  it('reports exchange as a return phase and resolves only after durable exchange evidence', async () => {
    mockedCreateSession.mockResolvedValue({ open: jest.fn() } as never);
    mockedExchangeToken.mockResolvedValue({
      connectionId: 'connection-1',
      institutionName: 'Sandbox Bank',
      accountCount: 2,
      sync: { connectionId: 'connection-1', transactionCount: 4, added: 4, modified: 0, removed: 0 },
    });
    const session = await prepareMoneyPlaidLink();
    const phases: string[] = [];
    const resultPromise = session.open({ onPhaseChange: (phase) => phases.push(phase) });

    const callbacks = mockedCreateSession.mock.calls[0][0];
    callbacks.onSuccess({ publicToken: 'public-token', metadata: { institution: { name: 'Sandbox Bank' } } } as never);

    expect(phases).toEqual(['presented', 'exchanging']);
    await expect(resultPromise).resolves.toMatchObject({
      status: 'linked',
      exchange: { connectionId: 'connection-1', institutionName: 'Sandbox Bank' },
    });
  });

  it('does not let an exit race override a successful Plaid return', async () => {
    mockedCreateSession.mockResolvedValue({ open: jest.fn() } as never);
    let finishExchange: ((value: Awaited<ReturnType<typeof exchangeMoneyPlaidToken>>) => void) | undefined;
    mockedExchangeToken.mockReturnValue(new Promise((resolve) => { finishExchange = resolve; }));
    const session = await prepareMoneyPlaidLink();
    const resultPromise = session.open();
    const callbacks = mockedCreateSession.mock.calls[0][0];

    callbacks.onSuccess({ publicToken: 'public-token', metadata: {} } as never);
    callbacks.onExit({} as never);
    finishExchange?.({
      connectionId: 'connection-1',
      institutionName: 'Sandbox Bank',
      accountCount: 1,
      sync: { connectionId: 'connection-1', transactionCount: 1, added: 1, modified: 0, removed: 0 },
    });

    await expect(resultPromise).resolves.toMatchObject({ status: 'linked' });
  });

  it('refuses to present one prepared native session twice', async () => {
    mockedCreateSession.mockResolvedValue({ open: jest.fn() } as never);
    const session = await prepareMoneyPlaidLink();
    void session.open();

    await expect(session.open()).rejects.toThrow('already been used');
  });
});
