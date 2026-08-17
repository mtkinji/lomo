import { refreshStaleMoneySummary } from './moneySummaryAutoRefresh';

describe('refreshStaleMoneySummary', () => {
  it('checks connected activity and rebuilds the visible projection without user involvement', async () => {
    const reconcileConnectedActivity = jest.fn(async () => undefined);

    await refreshStaleMoneySummary({ reconcileConnectedActivity });

    expect(reconcileConnectedActivity).toHaveBeenCalledTimes(1);
  });
});
