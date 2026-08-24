import { connectMoneyAccount } from './connectMoneyAccount';

describe('connectMoneyAccount', () => {
  it('reconciles Money after a successful institution connection', async () => {
    const startLink = jest.fn().mockResolvedValue({
      status: 'linked',
      exchange: { connectionId: 'connection-1', institutionName: 'Chase' },
    });
    const reconcileConnectedActivity = jest.fn().mockResolvedValue({ added: 4 });

    await expect(connectMoneyAccount({ startLink, reconcileConnectedActivity })).resolves.toEqual({
      status: 'connected',
      institutionName: 'Chase',
    });
    expect(reconcileConnectedActivity).toHaveBeenCalledWith({
      trigger: 'account_connected',
      sync: false,
    });
  });

  it('does not reconcile when the connection sheet is cancelled', async () => {
    const reconcileConnectedActivity = jest.fn();

    await expect(connectMoneyAccount({
      startLink: jest.fn().mockResolvedValue({ status: 'cancelled' }),
      reconcileConnectedActivity,
    })).resolves.toEqual({ status: 'cancelled' });
    expect(reconcileConnectedActivity).not.toHaveBeenCalled();
  });

  it('returns safe recovery copy when connection fails', async () => {
    await expect(connectMoneyAccount({
      startLink: jest.fn().mockRejectedValue(new Error('provider internals')),
      reconcileConnectedActivity: jest.fn(),
    })).resolves.toEqual({
      status: 'error',
      message: 'Kwilt could not start the bank connection. Try again.',
    });
  });
});
